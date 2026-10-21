import { Pool, QueryResult, QueryResultRow } from 'pg'

// Global connection pool for PostgreSQL on localhost:5432
const connectionString = process.env.DATABASE_URL || 'postgres://openpg:openpgpwd@localhost:5432/almasar_erp_db'

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined
}

export const pool: Pool =
  global.__pgPool ||
  new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  })

if (process.env.NODE_ENV !== 'production') {
  global.__pgPool = pool
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now()
  try {
    const res = await pool.query<T>(text, params)
    const duration = Date.now() - start
    if (process.env.NODE_ENV === 'development' && duration > 500) {
      console.warn(`[DB Slow Query] ${duration}ms: ${text.slice(0, 80)}`)
    }
    return res
  } catch (error) {
    console.error(`[DB Query Error] ${text.slice(0, 100)}:`, error)
    throw error
  }
}

export async function getClient() {
  return await pool.connect()
}
