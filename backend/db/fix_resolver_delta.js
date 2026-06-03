const pool = require('./postgres')

async function fix() {
  console.log('Adding missing delta columns to resolver_stats...')

  try {
    await pool.query(`
      ALTER TABLE resolver_stats
      ADD COLUMN IF NOT EXISTS nxdomain_delta INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS servfail_delta INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS timeouts_delta INT DEFAULT 0
    `)

    console.log('✓ Delta columns added successfully')
  } catch (err) {
    console.error('Fix failed:', err)
    process.exit(1)
  }

  await pool.end()
}

fix()
