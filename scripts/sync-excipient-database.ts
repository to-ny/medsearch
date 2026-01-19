#!/usr/bin/env bun
/**
 * Sync Excipient Database
 *
 * Extracts excipient data from SmPC PDFs and loads into PostgreSQL.
 * Uses staging tables for atomic swap (same pattern as sync-sam-database.ts).
 *
 * Data flow:
 *   1. Get AMP → SmPC URL mappings from SAM export or cached file
 *   2. Download SmPC PDFs and extract Section 6.1 (excipients)
 *   3. Insert into amp_excipient_staging table
 *   4. Atomic swap to production table
 *
 * Usage:
 *   bun run scripts/sync-excipient-database.ts [options]
 *
 * Options:
 *   --dry-run         Validate without writing to database
 *   --resume          Resume from previous progress file
 *   --verbose         Detailed logging
 *   --concurrency=N   Number of parallel workers (default: 8)
 *   --limit=N         Process only first N medications (for testing)
 *   --extract-only    Only extract/fetch URLs, don't process PDFs
 *
 * Requirements:
 *   - DATABASE_URL environment variable
 *   - pdftotext (from poppler-utils) must be installed
 */

import { createReadStream, existsSync, mkdirSync, unlinkSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { createInterface } from 'readline';
import { spawn } from 'child_process';
import { join, dirname } from 'path';

/**
 * Execute a command safely using spawn (no shell interpolation)
 * This prevents command injection attacks
 */
function execCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Check if a command exists in PATH
 */
async function commandExists(command: string): Promise<boolean> {
  try {
    await execCommand('which', [command]);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // Local paths
  ampExportPattern: 'data/sam-export/AMP-*.xml',
  urlMappingFile: 'data/amp-smpc-urls.json',
  progressFile: 'data/excipient-sync-progress.json',
  tempDir: 'data/smpc-temp',

  // Processing settings
  concurrency: 8,
  batchSize: 100,
  retryAttempts: 2,
  requestDelayMs: 100,
  saveInterval: 60000, // Save progress every minute

  // SOAP API config (fallback for URL extraction)
  soapEndpoint: 'https://apps.samdb.ehealth.fgov.be/samv2/dics/v5',
};

// ============================================================================
// Types
// ============================================================================

type Language = 'fr' | 'nl' | 'de' | 'en';

interface AmpSmpcMapping {
  ampCode: string;
  spcUrls: { lang: string; url: string }[];
}

interface ExcipientResult {
  ampCode: string;
  text: Record<string, string>;      // lang -> excipient text
  sourceUrls: Record<string, string>; // lang -> source URL
  parsedAt: string;
}

interface ProgressState {
  phase: 'extract' | 'process' | 'import' | 'swap' | 'done';
  startedAt: string;
  lastUpdated: string;
  processed: string[];  // AMP codes already processed
  failed: string[];     // AMP codes that failed
  recordCount: number;
  errors: string[];
}

// Database connection (lazy loaded)
import type { VercelPoolClient } from '@vercel/postgres';
let dbClient: VercelPoolClient | null = null;

// ============================================================================
// Database helpers
// ============================================================================

async function getDbClient(): Promise<VercelPoolClient> {
  if (!dbClient) {
    const { db } = await import('@vercel/postgres');
    dbClient = await db.connect();
  }
  return dbClient;
}

async function query(text: string, params?: unknown[]) {
  const client = await getDbClient();
  return client.query(text, params);
}

async function executeInTransaction(callback: () => Promise<void>) {
  const client = await getDbClient();
  try {
    await client.query('BEGIN');
    await callback();
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

// ============================================================================
// Progress tracking
// ============================================================================

function loadProgress(): ProgressState | null {
  if (!existsSync(CONFIG.progressFile)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(CONFIG.progressFile, 'utf-8'));
  } catch {
    return null;
  }
}

function saveProgress(state: ProgressState): void {
  state.lastUpdated = new Date().toISOString();
  const dir = dirname(CONFIG.progressFile);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(CONFIG.progressFile, JSON.stringify(state, null, 2));
}

function initProgress(): ProgressState {
  return {
    phase: 'extract',
    startedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    processed: [],
    failed: [],
    recordCount: 0,
    errors: [],
  };
}

// ============================================================================
// URL Extraction (from SAM export or SOAP API)
// ============================================================================

function findAmpExportFile(): string | null {
  const dir = dirname(CONFIG.ampExportPattern);
  if (!existsSync(dir)) return null;

  const files = readdirSync(dir)
    .filter(f => f.startsWith('AMP-') && f.endsWith('.xml'))
    .sort()
    .reverse();

  return files.length > 0 ? join(dir, files[0]) : null;
}

async function extractUrlMappingsFromFile(ampFile: string, verbose: boolean): Promise<AmpSmpcMapping[]> {
  if (verbose) console.log(`   Extracting SmPC URLs from ${ampFile}...`);

  const mappings: AmpSmpcMapping[] = [];
  const fileStream = createReadStream(ampFile);
  const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

  let currentAmpCode: string | null = null;
  let currentUrls: { lang: string; url: string }[] = [];
  let inSpcLink = false;
  let currentLang = '';

  for await (const line of rl) {
    const ampMatch = line.match(/<ns4:Amp[^>]*code="([^"]+)"/);
    if (ampMatch) {
      if (currentAmpCode && currentUrls.length > 0) {
        mappings.push({ ampCode: currentAmpCode, spcUrls: [...currentUrls] });
      }
      currentAmpCode = ampMatch[1];
      currentUrls = [];
    }

    if (line.includes('<SpcLink>')) inSpcLink = true;
    if (line.includes('</SpcLink>')) inSpcLink = false;

    if (inSpcLink) {
      const langMatch = line.match(/<ns2:(Fr|Nl|De|En)>/i);
      if (langMatch) currentLang = langMatch[1].toLowerCase();

      const urlMatch = line.match(/(https:\/\/app\.fagg-afmps\.be\/pharma-status\/api\/files\/[a-f0-9]+)/);
      if (urlMatch && currentLang) {
        const url = urlMatch[1];
        if (!currentUrls.some(u => u.url === url)) {
          currentUrls.push({ lang: currentLang, url });
        }
      }
    }
  }

  if (currentAmpCode && currentUrls.length > 0) {
    mappings.push({ ampCode: currentAmpCode, spcUrls: [...currentUrls] });
  }

  if (verbose) console.log(`   Found ${mappings.length} AMPs with SmPC URLs`);
  return mappings;
}

async function soapRequest(body: string): Promise<string> {
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="urn:be:fgov:ehealth:dics:protocol:v5">
  <soap:Header/>
  <soap:Body>
${body}
  </soap:Body>
</soap:Envelope>`;

  const response = await fetch(CONFIG.soapEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '' },
    body: envelope,
  });

  if (!response.ok) throw new Error(`SOAP request failed: ${response.status}`);
  return response.text();
}

async function fetchAllCompanies(verbose: boolean): Promise<string[]> {
  if (verbose) console.log('   Fetching company list from API...');

  const actorNrs = new Set<string>();
  const searchPatterns = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');

  for (const pattern of searchPatterns) {
    const body = `    <ns:FindCompanyRequest IssueInstant="${new Date().toISOString()}">
      <AnyNamePart>${pattern}</AnyNamePart>
    </ns:FindCompanyRequest>`;

    try {
      const response = await soapRequest(body);
      const matches = response.matchAll(/ActorNr="(\d+)"/g);
      for (const match of matches) {
        actorNrs.add(match[1].padStart(5, '0'));
      }
    } catch {
      if (verbose) console.warn(`   Warning: Failed to fetch companies for "${pattern}"`);
    }
    await new Promise(r => setTimeout(r, 50));
  }

  if (verbose) console.log(`   Found ${actorNrs.size} unique companies`);
  return Array.from(actorNrs);
}

async function fetchCompanyAmps(actorNr: string): Promise<AmpSmpcMapping[]> {
  const body = `    <ns:FindAmpRequest IssueInstant="${new Date().toISOString()}">
      <FindByCompany>
        <CompanyActorNr>${actorNr}</CompanyActorNr>
      </FindByCompany>
    </ns:FindAmpRequest>`;

  const response = await soapRequest(body);
  const mappings: AmpSmpcMapping[] = [];

  const ampMatches = response.matchAll(/<Amp\s+Code="([^"]+)"[^>]*>([\s\S]*?)<\/Amp>/gi);
  for (const ampMatch of ampMatches) {
    const ampCode = ampMatch[1];
    const ampContent = ampMatch[2];
    const urls: { lang: string; url: string }[] = [];

    const textMatches = ampContent.matchAll(/<Text\s+xml:lang="([^"]+)">(https:\/\/app\.fagg-afmps\.be\/pharma-status\/api\/files\/[a-f0-9]+)<\/Text>/gi);
    for (const textMatch of textMatches) {
      const lang = textMatch[1].toLowerCase();
      const url = textMatch[2].trim();
      if (!urls.some(u => u.url === url)) {
        urls.push({ lang, url });
      }
    }

    if (urls.length > 0) {
      mappings.push({ ampCode, spcUrls: urls });
    }
  }

  return mappings;
}

async function fetchUrlMappingsFromApi(verbose: boolean): Promise<AmpSmpcMapping[]> {
  console.log('   Fetching SmPC URLs from SAM API (this may take several minutes)...\n');

  const companies = await fetchAllCompanies(verbose);
  const allMappings: AmpSmpcMapping[] = [];
  const seenAmpCodes = new Set<string>();

  for (let i = 0; i < companies.length; i++) {
    const actorNr = companies[i];
    if (verbose) {
      const pct = ((i / companies.length) * 100).toFixed(1);
      process.stdout.write(`\r   [${i + 1}/${companies.length}] ${pct}% | Fetching company ${actorNr}...          `);
    }

    try {
      const mappings = await fetchCompanyAmps(actorNr);
      for (const m of mappings) {
        if (!seenAmpCodes.has(m.ampCode)) {
          seenAmpCodes.add(m.ampCode);
          allMappings.push(m);
        }
      }
    } catch { /* Skip failed companies */ }

    await new Promise(r => setTimeout(r, 100));
  }

  if (verbose) console.log(`\n   Found ${allMappings.length} AMPs with SmPC URLs`);
  return allMappings;
}

async function getUrlMappings(verbose: boolean): Promise<AmpSmpcMapping[]> {
  // Priority: 1) Cached mappings, 2) SAM export file, 3) SOAP API
  if (existsSync(CONFIG.urlMappingFile)) {
    if (verbose) console.log('   Loading cached URL mappings...');
    const mappings = JSON.parse(readFileSync(CONFIG.urlMappingFile, 'utf-8'));
    if (verbose) console.log(`   Loaded ${mappings.length} AMP-SmPC mappings`);
    return mappings;
  }

  const ampFile = findAmpExportFile();
  let mappings: AmpSmpcMapping[];

  if (ampFile) {
    mappings = await extractUrlMappingsFromFile(ampFile, verbose);
  } else {
    if (verbose) console.log('   No cached mappings or SAM export found, fetching from API...');
    mappings = await fetchUrlMappingsFromApi(verbose);
  }

  // Cache for future use
  const dir = dirname(CONFIG.urlMappingFile);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(CONFIG.urlMappingFile, JSON.stringify(mappings, null, 2));
  if (verbose) console.log(`   Cached URL mappings to ${CONFIG.urlMappingFile}`);

  return mappings;
}

// ============================================================================
// PDF Processing
// ============================================================================

async function downloadPdf(url: string, destPath: string): Promise<boolean> {
  try {
    // Use spawn with array args to prevent command injection
    await execCommand('curl', ['-sL', '-o', destPath, url, '--max-time', '30', '--retry', '2']);
    const { stdout } = await execCommand('file', [destPath]);
    return stdout.includes('PDF');
  } catch {
    return false;
  }
}

function extractSection61(text: string): { rawText: string; language: Language } | null {
  const lines = text.split('\n');
  let inSection = false;
  const sectionLines: string[] = [];
  let foundSection6 = false;
  let detectedLang: Language = 'fr';

  // Detect language
  if (text.includes('Résumé des Caractéristiques') || text.includes('DONNÉES PHARMACEUTIQUES')) {
    detectedLang = 'fr';
  } else if (text.includes('Samenvatting van de Productkenmerken') || text.includes('FARMACEUTISCHE GEGEVENS')) {
    detectedLang = 'nl';
  } else if (text.includes('Zusammenfassung der Merkmale') || text.includes('PHARMAZEUTISCHE ANGABEN')) {
    detectedLang = 'de';
  } else if (text.includes('Summary of Product Characteristics') || text.includes('PHARMACEUTICAL PARTICULARS')) {
    detectedLang = 'en';
  }

  const section6Markers = [
    'DONNEES PHARMACEUTIQUES', 'DONNÉES PHARMACEUTIQUES',
    'FARMACEUTISCHE GEGEVENS', 'PHARMACEUTICAL PARTICULARS', 'PHARMAZEUTISCHE ANGABEN',
  ];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const upper = trimmed.toUpperCase();

    if (!foundSection6 && section6Markers.some(m => upper.includes(m))) {
      foundSection6 = true;
      continue;
    }

    if (!foundSection6) continue;

    if (!inSection && /^6\.1\.?\s*(Liste|List|Lijst|Sonstige)?/i.test(trimmed)) {
      inSection = true;
      continue;
    }

    if (inSection && /^6\.2/.test(trimmed)) break;

    if (inSection) {
      if (/^(Liste des excipients|List of excipients|Lijst van hulpstoffen|Sonstige Bestandteile)/i.test(trimmed)) {
        continue;
      }
      if (/^\d+$/.test(trimmed) || /^\d+\/\d+$/.test(trimmed) || /^Page \d+/i.test(trimmed)) {
        continue;
      }
      sectionLines.push(trimmed);
    }
  }

  while (sectionLines.length > 0 && sectionLines[0] === '') sectionLines.shift();
  while (sectionLines.length > 0 && sectionLines[sectionLines.length - 1] === '') sectionLines.pop();

  if (sectionLines.length === 0) return null;

  const rawText = sectionLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (rawText.length < 10) return null;

  return { rawText, language: detectedLang };
}

async function processSmpc(url: string, expectedLang: string): Promise<{ rawText: string; language: Language } | null> {
  const tempFile = join(CONFIG.tempDir, `smpc-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);

  try {
    const isValidPdf = await downloadPdf(url, tempFile);
    if (!isValidPdf) return null;

    // Use spawn with array args to prevent command injection
    const { stdout: text } = await execCommand('pdftotext', [tempFile, '-']);
    const result = extractSection61(text);

    if (result && !['fr', 'nl', 'de', 'en'].includes(result.language)) {
      result.language = expectedLang as Language;
    }
    return result;
  } catch {
    return null;
  } finally {
    if (existsSync(tempFile)) {
      try { unlinkSync(tempFile); } catch { /* ignore */ }
    }
  }
}

// ============================================================================
// Batch Processing
// ============================================================================

async function processWithConcurrency(
  mappings: AmpSmpcMapping[],
  concurrency: number,
  progress: ProgressState,
  dryRun: boolean,
  verbose: boolean,
  onProgress: (processed: number, total: number, current: string) => void
): Promise<ExcipientResult[]> {
  const results: ExcipientResult[] = [];
  const queue = [...mappings];
  let processed = 0;
  const total = mappings.length;

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      const texts: Record<string, string> = {};
      const sourceUrls: Record<string, string> = {};

      for (const { lang, url } of item.spcUrls) {
        if (dryRun) {
          // In dry-run, just simulate processing
          texts[lang] = `[DRY RUN] Would extract from ${url}`;
          sourceUrls[lang] = url;
        } else {
          const result = await processSmpc(url, lang);
          if (result && result.rawText.length > 10) {
            texts[result.language] = result.rawText;
            sourceUrls[result.language] = url;
          }
        }
        await new Promise(r => setTimeout(r, CONFIG.requestDelayMs));
      }

      if (Object.keys(texts).length > 0) {
        results.push({
          ampCode: item.ampCode,
          text: texts,
          sourceUrls,
          parsedAt: new Date().toISOString(),
        });
      }

      processed++;
      progress.processed.push(item.ampCode);
      onProgress(processed, total, item.ampCode);
    }
  }

  const workers = Array(concurrency).fill(null).map(() => worker());
  await Promise.all(workers);

  return results;
}

// ============================================================================
// Database Import
// ============================================================================

async function createStagingTable(dryRun: boolean, verbose: boolean): Promise<void> {
  if (dryRun) {
    if (verbose) console.log('   [DRY RUN] Would create amp_excipient_staging table');
    return;
  }

  await query('DROP TABLE IF EXISTS amp_excipient_staging CASCADE');
  await query(`
    CREATE TABLE amp_excipient_staging (
      amp_code VARCHAR(50) PRIMARY KEY,
      text JSONB NOT NULL,
      source_urls JSONB,
      parsed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  if (verbose) console.log('   [OK] Created amp_excipient_staging table');
}

async function importResults(
  results: ExcipientResult[],
  dryRun: boolean,
  verbose: boolean
): Promise<number> {
  if (dryRun) {
    if (verbose) console.log(`   [DRY RUN] Would import ${results.length} excipient records`);
    return results.length;
  }

  let imported = 0;

  for (let i = 0; i < results.length; i += CONFIG.batchSize) {
    const batch = results.slice(i, i + CONFIG.batchSize);

    const placeholders = batch
      .map((_, idx) => `($${idx * 4 + 1}, $${idx * 4 + 2}, $${idx * 4 + 3}, $${idx * 4 + 4})`)
      .join(', ');

    const values = batch.flatMap(r => [
      r.ampCode,
      JSON.stringify(r.text),
      JSON.stringify(r.sourceUrls),
      r.parsedAt,
    ]);

    try {
      const result = await query(
        `INSERT INTO amp_excipient_staging (amp_code, text, source_urls, parsed_at)
         VALUES ${placeholders}
         ON CONFLICT (amp_code) DO UPDATE SET
           text = EXCLUDED.text,
           source_urls = EXCLUDED.source_urls,
           parsed_at = EXCLUDED.parsed_at`,
        values
      );
      imported += result.rowCount || batch.length;
    } catch (error) {
      if (verbose) console.error(`   [ERROR] Batch import failed: ${error}`);
    }
  }

  return imported;
}

async function swapTables(dryRun: boolean, verbose: boolean): Promise<void> {
  if (dryRun) {
    if (verbose) console.log('   [DRY RUN] Would swap staging table to production');
    return;
  }

  await executeInTransaction(async () => {
    // Check staging has data
    const countResult = await query('SELECT COUNT(*) as count FROM amp_excipient_staging');
    const count = parseInt(countResult.rows[0].count);

    if (count === 0) {
      throw new Error('Staging table is empty - aborting swap');
    }

    if (verbose) console.log(`   Staging table has ${count} records`);

    // Atomic swap
    await query('ALTER TABLE IF EXISTS amp_excipient RENAME TO amp_excipient_old');
    await query('ALTER TABLE amp_excipient_staging RENAME TO amp_excipient');

    // Delete orphan records (excipients without matching AMPs) before adding FK constraint
    const deleteResult = await query(`
      DELETE FROM amp_excipient
      WHERE amp_code NOT IN (SELECT code FROM amp)
    `);
    const orphanCount = deleteResult.rowCount || 0;
    if (orphanCount > 0 && verbose) {
      console.log(`   [INFO] Removed ${orphanCount} orphan records (AMPs no longer exist)`);
    }

    // Add FK constraint (should succeed now that orphans are removed)
    await query(`
      ALTER TABLE amp_excipient
      ADD CONSTRAINT amp_excipient_amp_code_fkey
      FOREIGN KEY (amp_code) REFERENCES amp(code) ON DELETE CASCADE
    `);

    // Create index
    await query('CREATE INDEX IF NOT EXISTS idx_amp_excipient_text ON amp_excipient USING GIN (text)');

    // Drop old table
    await query('DROP TABLE IF EXISTS amp_excipient_old CASCADE');
  });

  if (verbose) console.log('   [OK] Swapped staging table to production');
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const getArg = (name: string): string | undefined => {
    const arg = args.find(a => a.startsWith(`--${name}=`));
    return arg?.split('=')[1];
  };
  const hasFlag = (name: string): boolean => args.includes(`--${name}`);

  const dryRun = hasFlag('dry-run');
  const resume = hasFlag('resume');
  const verbose = hasFlag('verbose');
  const extractOnly = hasFlag('extract-only');
  const concurrency = parseInt(getArg('concurrency') || String(CONFIG.concurrency));
  const limit = getArg('limit') ? parseInt(getArg('limit')!) : undefined;

  console.log('\n======================================');
  console.log('   Excipient Database Sync');
  console.log('======================================\n');

  if (dryRun) console.log('   Mode: DRY RUN (no database changes)');
  if (resume) console.log('   Mode: RESUME (continuing previous sync)');
  if (verbose) console.log('   Mode: VERBOSE');
  console.log(`   Concurrency: ${concurrency}`);
  if (limit) console.log(`   Limit: ${limit} medications`);

  // Check prerequisites
  if (!process.env.DATABASE_URL && !dryRun) {
    console.error('\n   ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  // Check if pdftotext is available using safe command execution
  const hasPdftotext = await commandExists('pdftotext');
  if (!hasPdftotext) {
    console.error('\n   ERROR: pdftotext not found. Install poppler-utils:');
    console.error('   Ubuntu/Debian: sudo apt install poppler-utils');
    console.error('   macOS: brew install poppler');
    process.exit(1);
  }

  // Ensure temp directory exists
  if (!existsSync(CONFIG.tempDir)) {
    mkdirSync(CONFIG.tempDir, { recursive: true });
  }

  // Load or init progress
  let progress = resume ? loadProgress() : null;
  if (!progress) progress = initProgress();

  const startTime = Date.now();

  try {
    // Phase 1: Extract URL mappings
    console.log('\n1. Getting AMP → SmPC URL mappings...\n');
    let mappings = await getUrlMappings(verbose);

    if (extractOnly) {
      console.log('\n   URL extraction complete. Use --resume to continue with processing.');
      return;
    }

    // Apply limit
    if (limit) {
      mappings = mappings.slice(0, limit);
      console.log(`\n   Limited to ${limit} medications for testing`);
    }

    // Filter already processed if resuming
    if (resume && progress.processed.length > 0) {
      const processedSet = new Set(progress.processed);
      mappings = mappings.filter(m => !processedSet.has(m.ampCode));
      console.log(`\n   Resuming: ${progress.processed.length} already processed, ${mappings.length} remaining`);
    }

    if (mappings.length === 0) {
      console.log('\n   All medications already processed!');
      return;
    }

    // Phase 2: Create staging table
    console.log('\n2. Creating staging table...\n');
    await createStagingTable(dryRun, verbose);
    progress.phase = 'process';
    saveProgress(progress);

    // Phase 3: Process PDFs
    console.log(`\n3. Processing ${mappings.length} SmPC PDFs with ${concurrency} workers...\n`);
    console.log('   This may take a while (hours for full dataset)...\n');

    let lastSave = Date.now();

    const results = await processWithConcurrency(
      mappings,
      concurrency,
      progress,
      dryRun,
      verbose,
      (processed, total, current) => {
        const pct = ((processed / total) * 100).toFixed(1);
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = processed / elapsed;
        const remaining = (total - processed) / rate;

        process.stdout.write(
          `\r   [${processed}/${total}] ${pct}% | ${rate.toFixed(1)}/s | ETA: ${formatTime(remaining)} | ${current}          `
        );

        if (Date.now() - lastSave > CONFIG.saveInterval) {
          saveProgress(progress!);
          lastSave = Date.now();
        }
      }
    );

    console.log('\n');
    progress.phase = 'import';
    saveProgress(progress);

    // Phase 4: Import to staging
    console.log('\n4. Importing results to staging table...\n');
    const imported = await importResults(results, dryRun, verbose);
    console.log(`   Imported ${imported} excipient records`);
    progress.recordCount = imported;
    progress.phase = 'swap';
    saveProgress(progress);

    // Phase 5: Swap tables
    console.log('\n5. Swapping staging table to production...\n');
    await swapTables(dryRun, verbose);
    progress.phase = 'done';
    saveProgress(progress);

    // Summary
    const elapsed = (Date.now() - startTime) / 1000;
    console.log('\n======================================');
    console.log('   Sync Complete!');
    console.log('======================================\n');
    console.log(`   Duration: ${formatTime(elapsed)}`);
    console.log(`   Total AMPs processed: ${progress.processed.length}`);
    console.log(`   AMPs with excipients: ${imported}`);
    console.log(`   Success rate: ${((imported / progress.processed.length) * 100).toFixed(1)}%`);

    // Cleanup progress file on success
    if (!dryRun && existsSync(CONFIG.progressFile)) {
      unlinkSync(CONFIG.progressFile);
    }

  } catch (error) {
    console.error('\n   ERROR:', error);
    progress.errors.push(String(error));
    saveProgress(progress);
    process.exit(1);
  } finally {
    if (dbClient) {
      dbClient.release();
    }
  }
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

main().catch(err => {
  console.error('\n   Fatal error:', err.message);
  process.exit(1);
});
