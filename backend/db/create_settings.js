const { Client } = require('pg')

async function migrateSettings() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'dashdns',
    port: 5432
  })
  await client.connect()

  await client.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(50) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await client.query(`
    INSERT INTO settings (key, value) VALUES
      ('dnsdist_ssh_host', ''),
      ('dnsdist_ssh_port', '22'),
      ('dnsdist_ssh_user', 'root'),
      ('dnsdist_ssh_key_path', '')
    ON CONFLICT (key) DO NOTHING
  `)

  console.log('Settings table created and seeded successfully')
  await client.end()
}

migrateSettings().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1) })
