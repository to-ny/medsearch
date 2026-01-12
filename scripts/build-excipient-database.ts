#!/usr/bin/env bun
/**
 * Build Excipient Database
 *
 * Extracts excipient data from SmPC PDFs and creates a JSON database.
 *
 * Data sources (in priority order):
 *   1. Cached URL mappings (data/amp-smpc-urls.json) - fastest
 *   2. SAM XML export file (data/sam-export/AMP-*.xml) - if available
 *   3. SAM SOAP API - fetches from live API (slowest, but works without local files)
 *
 * Usage:
 *   bun run scripts/build-excipient-database.ts [options]
 *
 * Options:
 *   --concurrency=N   Number of parallel workers (default: 8)
 *   --limit=N         Process only first N medications (for testing)
 *   --resume          Resume from previous progress file
 *   --extract-only    Only extract/fetch URLs, don't process PDFs
 *
 * Requirements:
 *   - pdftotext (from poppler-utils) must be installed
 */

import { createReadStream, existsSync, mkdirSync, unlinkSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { createInterface } from 'readline';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join, dirname } from 'path';

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  ampExportPattern: 'data/sam-export/AMP-*.xml',     // Pattern to find SAM export
  outputFile: 'data/excipient-database.json',        // Full version (gitignored)
  productionFile: 'src/data/excipients.json',        // Lean version for app
  progressFile: 'data/excipient-progress.json',
  urlMappingFile: 'data/amp-smpc-urls.json',
  tempDir: 'data/smpc-temp',
  concurrency: 8,
  retryAttempts: 2,
  requestDelayMs: 100,
  // SOAP API config
  soapEndpoint: 'https://apps.samdb.ehealth.fgov.be/samv2/dics/v5',
};

// Types
type Language = 'fr' | 'nl' | 'de' | 'en';

interface AmpSmpcMapping {
  ampCode: string;
  spcUrls: { lang: string; url: string }[];
}

interface ExcipientText {
  text: string;
  source: string;
  parsedAt: string;
}

interface ExcipientEntry {
  ampCode: string;
  /** Excipient text per language */
  texts: Partial<Record<Language, ExcipientText>>;
}

interface ProgressState {
  processed: string[];
  failed: string[];
  startedAt: string;
  lastUpdated: string;
}

interface ExcipientDatabase {
  version: string;
  generatedAt: string;
  totalMedications: number;
  medicationsWithExcipients: number;
  entries: Record<string, ExcipientEntry>;
}

// Lean format for production
interface LeanExcipientDatabase {
  version: string;
  generatedAt: string;
  totalMedications: number;
  medicationsWithExcipients: number;
  /** ampCode -> { lang: text } */
  data: Record<string, Partial<Record<Language, string>>>;
}

// ============================================================================
// Step 1: Extract AMP to SmPC URL mappings from SAM export or API
// ============================================================================

/**
 * Find the SAM export file (pattern: AMP-*.xml)
 */
function findAmpExportFile(): string | null {
  const dir = dirname(CONFIG.ampExportPattern);

  if (!existsSync(dir)) return null;

  const files = readdirSync(dir)
    .filter(f => f.startsWith('AMP-') && f.endsWith('.xml'))
    .sort()
    .reverse(); // Latest first

  return files.length > 0 ? join(dir, files[0]) : null;
}

/**
 * Make a SOAP request to the SAM API
 */
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
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': '',
    },
    body: envelope,
  });

  if (!response.ok) {
    throw new Error(`SOAP request failed: ${response.status}`);
  }

  return response.text();
}

/**
 * Fetch all companies from the API
 */
async function fetchAllCompanies(): Promise<string[]> {
  console.log('   Fetching company list from API...');

  // Search with common letter patterns to get all companies
  const actorNrs = new Set<string>();
  const searchPatterns = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');

  for (const pattern of searchPatterns) {
    const body = `    <ns:FindCompanyRequest IssueInstant="${new Date().toISOString()}">
      <AnyNamePart>${pattern}</AnyNamePart>
    </ns:FindCompanyRequest>`;

    try {
      const response = await soapRequest(body);
      // Extract ActorNr values
      const matches = response.matchAll(/ActorNr="(\d+)"/g);
      for (const match of matches) {
        actorNrs.add(match[1].padStart(5, '0'));
      }
    } catch {
      console.warn(`   Warning: Failed to fetch companies for pattern "${pattern}"`);
    }

    // Small delay between requests
    await new Promise(r => setTimeout(r, 50));
  }

  console.log(`   Found ${actorNrs.size} unique companies`);
  return Array.from(actorNrs);
}

/**
 * Fetch AMPs for a company and extract SmPC URLs
 */
async function fetchCompanyAmps(actorNr: string): Promise<AmpSmpcMapping[]> {
  const body = `    <ns:FindAmpRequest IssueInstant="${new Date().toISOString()}">
      <FindByCompany>
        <CompanyActorNr>${actorNr}</CompanyActorNr>
      </FindByCompany>
    </ns:FindAmpRequest>`;

  const response = await soapRequest(body);
  const mappings: AmpSmpcMapping[] = [];

  // Parse AMP codes and their SpcUrls
  // Response format: <Amp Code="SAM...">...<SpcUrl xml:lang="fr">https://...</SpcUrl>...</Amp>
  const ampMatches = response.matchAll(/<Amp\s+Code="([^"]+)"[^>]*>([\s\S]*?)<\/Amp>/gi);

  for (const ampMatch of ampMatches) {
    const ampCode = ampMatch[1];
    const ampContent = ampMatch[2];
    const urls: { lang: string; url: string }[] = [];

    // Find SpcUrl entries - format: <SpcUrl><Text xml:lang="fr">https://...</Text></SpcUrl>
    // Extract Text elements with pharma-status URLs
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

/**
 * Fetch URL mappings from the SOAP API (fallback when no local data)
 */
async function fetchUrlMappingsFromApi(): Promise<AmpSmpcMapping[]> {
  console.log('🌐 Fetching SmPC URLs from SAM API...');
  console.log('   This may take several minutes...\n');

  const companies = await fetchAllCompanies();
  const allMappings: AmpSmpcMapping[] = [];
  const seenAmpCodes = new Set<string>();

  for (let i = 0; i < companies.length; i++) {
    const actorNr = companies[i];
    const pct = ((i / companies.length) * 100).toFixed(1);
    process.stdout.write(`\r   [${i + 1}/${companies.length}] ${pct}% | Fetching company ${actorNr}...          `);

    try {
      const mappings = await fetchCompanyAmps(actorNr);
      for (const m of mappings) {
        if (!seenAmpCodes.has(m.ampCode)) {
          seenAmpCodes.add(m.ampCode);
          allMappings.push(m);
        }
      }
    } catch {
      // Skip failed companies
    }

    // Small delay between requests
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n   Found ${allMappings.length} AMPs with SmPC URLs`);

  // Save mappings for future use
  if (!existsSync(dirname(CONFIG.urlMappingFile))) {
    mkdirSync(dirname(CONFIG.urlMappingFile), { recursive: true });
  }
  writeFileSync(CONFIG.urlMappingFile, JSON.stringify(allMappings, null, 2));
  console.log(`   Saved URL mappings to ${CONFIG.urlMappingFile}`);

  return allMappings;
}

/**
 * Extract URL mappings from local SAM export file
 */
async function extractUrlMappingsFromFile(ampFile: string): Promise<AmpSmpcMapping[]> {
  console.log(`📦 Extracting SmPC URLs from ${ampFile}...`);

  const mappings: AmpSmpcMapping[] = [];
  const fileStream = createReadStream(ampFile);
  const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

  let currentAmpCode: string | null = null;
  let currentUrls: { lang: string; url: string }[] = [];
  let inSpcLink = false;
  let currentLang = '';

  for await (const line of rl) {
    // Start of new AMP
    const ampMatch = line.match(/<ns4:Amp[^>]*code="([^"]+)"/);
    if (ampMatch) {
      // Save previous AMP if it had URLs
      if (currentAmpCode && currentUrls.length > 0) {
        mappings.push({ ampCode: currentAmpCode, spcUrls: [...currentUrls] });
      }
      currentAmpCode = ampMatch[1];
      currentUrls = [];
    }

    // Track SpcLink sections
    if (line.includes('<SpcLink>')) {
      inSpcLink = true;
    }
    if (line.includes('</SpcLink>')) {
      inSpcLink = false;
    }

    // Extract language-specific URLs
    if (inSpcLink) {
      const langMatch = line.match(/<ns2:(Fr|Nl|De|En)>/i);
      if (langMatch) {
        currentLang = langMatch[1].toLowerCase();
      }

      // Extract pharma-status API URLs (the PDF format we can parse)
      const urlMatch = line.match(/(https:\/\/app\.fagg-afmps\.be\/pharma-status\/api\/files\/[a-f0-9]+)/);
      if (urlMatch && currentLang) {
        const url = urlMatch[1];
        // Avoid duplicates
        if (!currentUrls.some(u => u.url === url)) {
          currentUrls.push({ lang: currentLang, url });
        }
      }
    }
  }

  // Don't forget the last AMP
  if (currentAmpCode && currentUrls.length > 0) {
    mappings.push({ ampCode: currentAmpCode, spcUrls: [...currentUrls] });
  }

  console.log(`   Found ${mappings.length} AMPs with SmPC URLs`);

  // Save mappings for reference
  writeFileSync(CONFIG.urlMappingFile, JSON.stringify(mappings, null, 2));
  console.log(`   Saved URL mappings to ${CONFIG.urlMappingFile}`);

  return mappings;
}

// ============================================================================
// Step 2: PDF parsing functions
// ============================================================================

async function downloadPdf(url: string, destPath: string): Promise<boolean> {
  try {
    await execAsync(`curl -sL -o "${destPath}" "${url}" --max-time 30 --retry 2`);

    // Verify it's actually a PDF
    const { stdout } = await execAsync(`file "${destPath}"`);
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
  let detectedLang: Language = 'fr'; // Default

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
    'DONNEES PHARMACEUTIQUES',
    'DONNÉES PHARMACEUTIQUES',
    'FARMACEUTISCHE GEGEVENS',
    'PHARMACEUTICAL PARTICULARS',
    'PHARMAZEUTISCHE ANGABEN',
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

    if (inSection && /^6\.2/.test(trimmed)) {
      break;
    }

    if (inSection) {
      // Skip section header lines
      if (/^(Liste des excipients|List of excipients|Lijst van hulpstoffen|Sonstige Bestandteile)/i.test(trimmed)) {
        continue;
      }
      // Skip page numbers
      if (/^\d+$/.test(trimmed) || /^\d+\/\d+$/.test(trimmed) || /^Page \d+/i.test(trimmed)) {
        continue;
      }
      // Keep the line (even empty ones to preserve structure)
      sectionLines.push(trimmed);
    }
  }

  // Clean up: remove leading/trailing empty lines, collapse multiple empty lines
  while (sectionLines.length > 0 && sectionLines[0] === '') {
    sectionLines.shift();
  }
  while (sectionLines.length > 0 && sectionLines[sectionLines.length - 1] === '') {
    sectionLines.pop();
  }

  if (sectionLines.length === 0) {
    return null;
  }

  // Join lines into text, preserving paragraph structure
  const rawText = sectionLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
    .trim();

  if (rawText.length < 10) {
    return null;
  }

  return { rawText, language: detectedLang };
}

async function processSmpc(url: string, expectedLang: string): Promise<{ rawText: string; language: Language } | null> {
  const tempFile = join(CONFIG.tempDir, `smpc-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);

  try {
    // Download PDF
    const isValidPdf = await downloadPdf(url, tempFile);
    if (!isValidPdf) {
      return null;
    }

    // Extract text
    const { stdout: text } = await execAsync(`pdftotext "${tempFile}" -`);

    // Parse Section 6.1
    const result = extractSection61(text);
    if (result) {
      // Use expected language if detection failed or is unknown
      if (!['fr', 'nl', 'de', 'en'].includes(result.language)) {
        result.language = expectedLang as Language;
      }
    }
    return result;
  } catch {
    return null;
  } finally {
    if (existsSync(tempFile)) {
      try {
        unlinkSync(tempFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

// ============================================================================
// Step 3: Batch processing with concurrency control
// ============================================================================

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processWithConcurrency(
  mappings: AmpSmpcMapping[],
  concurrency: number,
  onProgress: (processed: number, total: number, current: string) => void
): Promise<Map<string, ExcipientEntry>> {
  const results = new Map<string, ExcipientEntry>();
  const queue = [...mappings];
  let processed = 0;
  const total = mappings.length;

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      const entry: ExcipientEntry = {
        ampCode: item.ampCode,
        texts: {},
      };

      // Process ALL available languages for this AMP
      for (const { lang, url } of item.spcUrls) {
        const result = await processSmpc(url, lang);
        if (result && result.rawText.length > 10) {
          entry.texts[result.language] = {
            text: result.rawText,
            source: url,
            parsedAt: new Date().toISOString(),
          };
        }
        // Small delay between requests
        await sleep(CONFIG.requestDelayMs);
      }

      // Only save if we got at least one language
      if (Object.keys(entry.texts).length > 0) {
        results.set(item.ampCode, entry);
      }

      processed++;
      onProgress(processed, total, item.ampCode);
    }
  }

  // Start workers
  const workers = Array(concurrency).fill(null).map(() => worker());
  await Promise.all(workers);

  return results;
}

// ============================================================================
// Step 4: Progress tracking and resume
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
  writeFileSync(CONFIG.progressFile, JSON.stringify(state, null, 2));
}

function loadPartialResults(): Map<string, ExcipientEntry> {
  if (!existsSync(CONFIG.outputFile)) {
    return new Map();
  }

  try {
    const db: ExcipientDatabase = JSON.parse(readFileSync(CONFIG.outputFile, 'utf-8'));
    return new Map(Object.entries(db.entries));
  } catch {
    return new Map();
  }
}

function saveDatabase(results: Map<string, ExcipientEntry>, totalMedications: number): void {
  const generatedAt = new Date().toISOString();

  // Full version with all metadata (for debugging, gitignored)
  const fullDb: ExcipientDatabase = {
    version: '2.0.0',
    generatedAt,
    totalMedications,
    medicationsWithExcipients: results.size,
    entries: Object.fromEntries(results),
  };
  writeFileSync(CONFIG.outputFile, JSON.stringify(fullDb, null, 2));

  // Lean version for production (just ampCode -> { lang: text })
  const leanDb: LeanExcipientDatabase = {
    version: '2.0.0',
    generatedAt,
    totalMedications,
    medicationsWithExcipients: results.size,
    data: {},
  };

  for (const [ampCode, entry] of results) {
    const texts: Partial<Record<Language, string>> = {};
    for (const [lang, data] of Object.entries(entry.texts)) {
      texts[lang as Language] = data.text;
    }
    leanDb.data[ampCode] = texts;
  }

  // Ensure production directory exists
  const prodDir = CONFIG.productionFile.substring(0, CONFIG.productionFile.lastIndexOf('/'));
  if (!existsSync(prodDir)) {
    mkdirSync(prodDir, { recursive: true });
  }

  // Write minified JSON (no pretty printing)
  writeFileSync(CONFIG.productionFile, JSON.stringify(leanDb));
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

  const concurrency = parseInt(getArg('concurrency') || String(CONFIG.concurrency));
  const limit = getArg('limit') ? parseInt(getArg('limit')!) : undefined;
  const resume = hasFlag('resume');
  const extractOnly = hasFlag('extract-only');

  console.log('🔬 Excipient Database Builder v2\n');
  console.log(`   Concurrency: ${concurrency}`);
  if (limit) console.log(`   Limit: ${limit} medications`);
  if (resume) console.log(`   Resuming from previous progress`);

  // Ensure temp directory exists
  if (!existsSync(CONFIG.tempDir)) {
    mkdirSync(CONFIG.tempDir, { recursive: true });
  }

  // Step 1: Extract or load URL mappings
  // Priority: 1) Cached mappings, 2) SAM export file, 3) SOAP API
  let mappings: AmpSmpcMapping[];

  if (existsSync(CONFIG.urlMappingFile) && !extractOnly) {
    console.log('\n📂 Loading cached URL mappings...');
    mappings = JSON.parse(readFileSync(CONFIG.urlMappingFile, 'utf-8'));
    console.log(`   Loaded ${mappings.length} AMP-SmPC mappings`);
  } else {
    // Try to find a SAM export file
    const ampFile = findAmpExportFile();
    if (ampFile) {
      mappings = await extractUrlMappingsFromFile(ampFile);
    } else {
      // Fall back to fetching from API
      console.log('\n⚠️  No cached mappings or SAM export found.');
      console.log('   Will fetch SmPC URLs directly from SAM API.\n');
      mappings = await fetchUrlMappingsFromApi();
    }
  }

  if (extractOnly) {
    console.log('\n✅ URL extraction complete. Use --resume to continue with processing.');
    return;
  }

  // Apply limit if specified
  if (limit) {
    mappings = mappings.slice(0, limit);
    console.log(`\n⚠️  Limited to ${limit} medications for testing`);
  }

  // Step 2: Load previous progress if resuming
  let results: Map<string, ExcipientEntry>;
  let processedCodes: Set<string>;

  if (resume) {
    const progress = loadProgress();
    results = loadPartialResults();
    processedCodes = new Set(progress?.processed || []);

    if (processedCodes.size > 0) {
      console.log(`\n🔄 Resuming: ${processedCodes.size} already processed, ${results.size} with excipients`);
      mappings = mappings.filter(m => !processedCodes.has(m.ampCode));
    }
  } else {
    results = new Map();
    processedCodes = new Set();
  }

  if (mappings.length === 0) {
    console.log('\n✅ All medications already processed!');
    return;
  }

  // Step 3: Process SmPCs
  console.log(`\n🚀 Processing ${mappings.length} medications (all languages) with ${concurrency} workers...`);
  console.log('   This will take longer as we now fetch ALL available languages.\n');

  const startTime = Date.now();
  let lastSave = startTime;
  const saveInterval = 60000; // Save every minute

  const progress: ProgressState = {
    processed: Array.from(processedCodes),
    failed: [],
    startedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };

  const newResults = await processWithConcurrency(
    mappings,
    concurrency,
    (processed, total, current) => {
      processedCodes.add(current);
      progress.processed = Array.from(processedCodes);

      // Progress bar
      const pct = ((processed / total) * 100).toFixed(1);
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = processed / elapsed;
      const remaining = (total - processed) / rate;

      process.stdout.write(
        `\r   [${processed}/${total}] ${pct}% | ${rate.toFixed(1)}/s | ETA: ${formatTime(remaining)} | ${current}          `
      );

      // Periodic save
      if (Date.now() - lastSave > saveInterval) {
        saveProgress(progress);
        saveDatabase(results, mappings.length);
        lastSave = Date.now();
      }
    }
  );

  // Merge new results into existing results
  for (const [ampCode, entry] of newResults) {
    results.set(ampCode, entry);
  }

  console.log('\n\n');

  // Step 4: Save final results
  const totalMedications = (limit || mappings.length) + (resume ? processedCodes.size - mappings.length : 0);
  saveDatabase(results, totalMedications);
  saveProgress(progress);

  // Count language coverage
  const langCounts: Record<string, number> = { fr: 0, nl: 0, de: 0, en: 0 };
  for (const entry of results.values()) {
    for (const lang of Object.keys(entry.texts)) {
      langCounts[lang] = (langCounts[lang] || 0) + 1;
    }
  }

  // Summary
  const elapsed = (Date.now() - startTime) / 1000;
  console.log('✅ Processing complete!\n');
  console.log(`   Total medications: ${totalMedications}`);
  console.log(`   With excipient data: ${results.size} (${((results.size / totalMedications) * 100).toFixed(1)}%)`);
  console.log(`   Language coverage:`);
  console.log(`      FR: ${langCounts.fr} | NL: ${langCounts.nl} | DE: ${langCounts.de} | EN: ${langCounts.en}`);
  console.log(`   Processing time: ${formatTime(elapsed)}`);
  console.log(`   Full output: ${CONFIG.outputFile}`);
  console.log(`   Production output: ${CONFIG.productionFile}`);

  // Cleanup progress file on success
  if (!limit && existsSync(CONFIG.progressFile)) {
    unlinkSync(CONFIG.progressFile);
  }
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
