
const { Pool } = require('pg');

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// Test database connection
pool.on('connect', () => {
  console.log('PostgreSQL client connected');
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL error:', error.message);
});

// Initialize database and migrations
async function initializeDatabase() {
  const client = await pool.connect();

  try {
    console.log('Initializing SpendSmart database...');

    await client.query('BEGIN');

    // --------------------------------
    // 1. USERS TABLE
    // --------------------------------
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password TEXT NOT NULL,
        country VARCHAR(2) DEFAULT 'IN',
        currency VARCHAR(3) DEFAULT 'INR',
        locale VARCHAR(20) DEFAULT 'en-IN',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add missing user columns
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS country VARCHAR(2) DEFAULT 'IN',
      ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'INR',
      ADD COLUMN IF NOT EXISTS locale VARCHAR(20) DEFAULT 'en-IN',
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ
        DEFAULT CURRENT_TIMESTAMP;
    `);

    // Ensure missing values are populated
    await client.query(`
      UPDATE users
      SET
        country = COALESCE(NULLIF(country, ''), 'IN'),
        currency = COALESCE(NULLIF(currency, ''), 'INR'),
        locale = COALESCE(NULLIF(locale, ''), 'en-IN')
      WHERE country IS NULL
         OR country = ''
         OR currency IS NULL
         OR currency = ''
         OR locale IS NULL
         OR locale = '';
    `);

    // --------------------------------
    // 2. TRANSACTIONS TABLE
    // --------------------------------
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL
          REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(10) NOT NULL
          CHECK (type IN ('income', 'expense')),
        amount NUMERIC(15, 2) NOT NULL
          CHECK (amount > 0),
        category VARCHAR(100) NOT NULL,
        description TEXT DEFAULT '',
        date DATE NOT NULL,
        notes TEXT DEFAULT '',
        currency VARCHAR(3) DEFAULT 'INR',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add missing transaction columns
    await client.query(`
      ALTER TABLE transactions
      ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS currency VARCHAR(3),
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ
        DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ
        DEFAULT CURRENT_TIMESTAMP;
    `);

    // Backfill old transactions using their user's currency.
    // Existing non-null transaction currencies are never overwritten.
    await client.query(`
      UPDATE transactions t
      SET currency = COALESCE(u.currency, 'INR')
      FROM users u
      WHERE t.user_id = u.id
        AND t.currency IS NULL;
    `);

    await client.query(`
      UPDATE transactions
      SET currency = 'INR'
      WHERE currency IS NULL OR currency = '';
    `);

    // --------------------------------
    // 3. BUDGETS TABLE
    // --------------------------------
    await client.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL
          REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(100) NOT NULL,
        amount NUMERIC(15, 2) NOT NULL
          CHECK (amount >= 0),
        month INTEGER NOT NULL
          CHECK (month BETWEEN 1 AND 12),
        year INTEGER NOT NULL
          CHECK (year BETWEEN 2000 AND 2100),
        notes TEXT DEFAULT '',
        currency VARCHAR(3) DEFAULT 'INR',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add missing budget columns
    await client.query(`
      ALTER TABLE budgets
      ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS currency VARCHAR(3),
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ
        DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ
        DEFAULT CURRENT_TIMESTAMP;
    `);

    // Preserve existing budget currency.
    // For old budgets without currency, use the owner's currency.
    await client.query(`
      UPDATE budgets b
      SET currency = COALESCE(u.currency, 'INR')
      FROM users u
      WHERE b.user_id = u.id
        AND b.currency IS NULL;
    `);

    await client.query(`
      UPDATE budgets
      SET currency = 'INR'
      WHERE currency IS NULL OR currency = '';
    `);

    // Ensure currency cannot be null
    await client.query(`
      ALTER TABLE budgets
      ALTER COLUMN currency SET DEFAULT 'INR';
    `);

    await client.query(`
      ALTER TABLE budgets
      ALTER COLUMN currency SET NOT NULL;
    `);

    // --------------------------------
    // 4. BUDGET UNIQUE CONSTRAINT
    // --------------------------------

    // Remove the old unique constraint if it exists.
    // The new unique index includes currency.
    await client.query(`
      ALTER TABLE budgets
      DROP CONSTRAINT IF EXISTS budgets_user_id_category_month_year_key;
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
      budgets_user_category_month_year_currency_key
      ON budgets (user_id, category, month, year, currency);
    `);

    // --------------------------------
    // 5. INDEXES
    // --------------------------------

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user
      ON transactions(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_date
      ON transactions(user_id, date DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_category
      ON transactions(user_id, category);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_type
      ON transactions(user_id, type);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_currency
      ON transactions(user_id, currency);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_date_currency
      ON transactions(user_id, date DESC, currency);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_budgets_user_period
      ON budgets(user_id, year, month);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_budgets_user_currency
      ON budgets(user_id, currency);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email
      ON users(email);
    `);

    // --------------------------------
    // 6. COMPLETE MIGRATION
    // --------------------------------

    await client.query('COMMIT');

    console.log('SpendSmart database initialized successfully');
    console.log('Users, transactions, budgets and indexes are ready');
    console.log('Multi-currency database support is enabled');

  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Database initialization failed:', error);

    throw error;
  } finally {
    client.release();
  }
}

// Export database functions
module.exports = {
  pool,
  initializeDatabase
};
