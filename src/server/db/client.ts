/**
 * Database client for PostgreSQL connection
 * Uses @vercel/postgres for Vercel deployment with Neon
 */

import 'server-only';

import { sql as vercelSql, db as vercelDb, VercelPoolClient } from '@vercel/postgres';

// Re-export the sql tagged template function for queries
export const sql = vercelSql;

// Re-export the db pool for transactions
export const db = vercelDb;

/**
 * Check if the database connection is working
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the current database timestamp
 */
export async function getDatabaseTime(): Promise<Date> {
  const result = await sql`SELECT NOW() as now`;
  return result.rows[0].now;
}

/**
 * Execute a query with parameters
 * Helper for dynamic queries where tagged templates aren't suitable
 */
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const client = await db.connect();
  try {
    const result = await client.query(text, params);
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount ?? 0,
    };
  } finally {
    client.release();
  }
}

/**
 * Execute multiple queries in a transaction
 */
export async function transaction<T>(
  callback: (client: VercelPoolClient) => Promise<T>
): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Batch insert helper - inserts multiple rows efficiently
 */
export async function batchInsert(
  tableName: string,
  columns: string[],
  rows: unknown[][],
  chunkSize = 1000
): Promise<number> {
  if (rows.length === 0) return 0;

  let inserted = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);

    // Build parameterized query
    const placeholders = chunk
      .map((_, rowIndex) => {
        const rowPlaceholders = columns.map(
          (_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`
        );
        return `(${rowPlaceholders.join(', ')})`;
      })
      .join(', ');

    const queryText = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders}`;
    const flatValues = chunk.flat();

    const result = await query(queryText, flatValues);
    inserted += result.rowCount;
  }

  return inserted;
}

/**
 * Upsert (insert or update) helper
 */
export async function upsert(
  tableName: string,
  columns: string[],
  values: unknown[],
  conflictColumn: string,
  updateColumns?: string[]
): Promise<void> {
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

  // Determine which columns to update on conflict
  const columnsToUpdate = updateColumns || columns.filter((c) => c !== conflictColumn);
  const updateClause = columnsToUpdate
    .map((col) => `${col} = EXCLUDED.${col}`)
    .join(', ');

  const queryText = `
    INSERT INTO ${tableName} (${columns.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT (${conflictColumn})
    DO UPDATE SET ${updateClause}
  `;

  await query(queryText, values);
}
