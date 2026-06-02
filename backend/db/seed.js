const pool = require('./postgres')
const bcrypt = require('bcryptjs')

async function seed() {
  console.log('Seeding database...')

  try {
    // Create default admin user
    const passwordHash = await bcrypt.hash('admin123', 10)
    
    await pool.query(`
      INSERT INTO users (username, password_hash, role)
      VALUES ('admin', $1, 'admin')
      ON CONFLICT (username) DO NOTHING
    `, [passwordHash])

    console.log('Created default admin user (username: admin, password: admin123)')
    console.log('⚠️  No servers seeded. Add servers via Settings > Server Management after login.')
    console.log('Database seeding completed successfully')
  } catch (err) {
    console.error('Seeding failed:', err)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  seed().then(() => process.exit(0))
}

module.exports = { seed }
