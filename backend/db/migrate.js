const pool = require('./postgres')

async function migrate() {
  console.log('Running database migration...')

  try {
    // Drop existing tables (in production, use proper migration tools)
    await pool.query(`
      DROP TABLE IF EXISTS dnsdist_stats CASCADE;
      DROP TABLE IF EXISTS resolver_stats CASCADE;
      DROP TABLE IF EXISTS servers CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS acl_entries CASCADE;
      DROP TABLE IF EXISTS resolvers CASCADE;
    `)

    // Create servers table
    await pool.query(`
      CREATE TABLE servers (
        id SERIAL PRIMARY KEY,
        hostname VARCHAR(100) NOT NULL,
        ip VARCHAR(45) NOT NULL,
        api_port INT NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('dnsdist', 'resolver')),
        api_key VARCHAR(255),
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // Create dnsdist_stats table
    await pool.query(`
      CREATE TABLE dnsdist_stats (
        id SERIAL PRIMARY KEY,
        server_id INT REFERENCES servers(id) ON DELETE CASCADE,
        ts TIMESTAMP DEFAULT NOW(),
        queries BIGINT DEFAULT 0,
        queries_delta INT DEFAULT 0,
        nxdomain BIGINT DEFAULT 0,
        nxdomain_delta INT DEFAULT 0,
        servfail BIGINT DEFAULT 0,
        servfail_delta INT DEFAULT 0,
        downstreams_timeout BIGINT DEFAULT 0,
        downstreams_timeout_delta INT DEFAULT 0,
        acl_drops BIGINT DEFAULT 0,
        acl_drops_delta INT DEFAULT 0,
        cache_hits BIGINT DEFAULT 0,
        cache_misses BIGINT DEFAULT 0,
        cache_hit_ratio FLOAT DEFAULT 0,
        latency_avg FLOAT DEFAULT 0,
        latency_tcp FLOAT DEFAULT 0,
        latency_udp FLOAT DEFAULT 0,
        real_memory_usage BIGINT DEFAULT 0,
        cpu_user FLOAT DEFAULT 0,
        cpu_system FLOAT DEFAULT 0,
        frontend_nhqueries BIGINT DEFAULT 0,
        rule_drop BIGINT DEFAULT 0,
        rule_nxdomain BIGINT DEFAULT 0
      )
    `)

    // Create resolver_stats table
    await pool.query(`
      CREATE TABLE resolver_stats (
        id SERIAL PRIMARY KEY,
        server_id INT REFERENCES servers(id) ON DELETE CASCADE,
        ts TIMESTAMP DEFAULT NOW(),
        is_up BOOLEAN DEFAULT false,
        response_time FLOAT DEFAULT 0,
        queries BIGINT DEFAULT 0,
        queries_delta INT DEFAULT 0,
        cache_hits BIGINT DEFAULT 0,
        cache_misses BIGINT DEFAULT 0,
        cache_hit_ratio FLOAT DEFAULT 0,
        cache_size INT DEFAULT 0,
        cache_entries INT DEFAULT 0,
        packet_cache_hits BIGINT DEFAULT 0,
        packet_cache_misses BIGINT DEFAULT 0,
        packet_cache_size INT DEFAULT 0,
        nxdomain BIGINT DEFAULT 0,
        nxdomain_delta INT DEFAULT 0,
        servfail BIGINT DEFAULT 0,
        servfail_delta INT DEFAULT 0,
        timeouts BIGINT DEFAULT 0,
        timeouts_delta INT DEFAULT 0,
        throttle BIGINT DEFAULT 0,
        latency_avg FLOAT DEFAULT 0,
        memory_usage BIGINT DEFAULT 0,
        cpu_user FLOAT DEFAULT 0,
        cpu_system FLOAT DEFAULT 0,
        concurrent_queries INT DEFAULT 0,
        outgoing_timeouts BIGINT DEFAULT 0,
        dnssec_validations BIGINT DEFAULT 0,
        dnssec_bogus BIGINT DEFAULT 0
      )
    `)

    // Create users table
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'viewer',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // Create indexes
    await pool.query(`
      CREATE INDEX idx_dnsdist_stats_server_ts ON dnsdist_stats(server_id, ts DESC);
      CREATE INDEX idx_resolver_stats_server_ts ON resolver_stats(server_id, ts DESC);
    `)

    // Create acl_entries table
    await pool.query(`
      CREATE TABLE acl_entries (
        id SERIAL PRIMARY KEY,
        ip_or_subnet VARCHAR(45) NOT NULL,
        description VARCHAR(255),
        type VARCHAR(10) NOT NULL DEFAULT 'whitelist' CHECK (type IN ('whitelist', 'blacklist')),
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // Create domain_whitelist table
    await pool.query(`
      CREATE TABLE domain_whitelist (
        id SERIAL PRIMARY KEY,
        domain VARCHAR(255) NOT NULL,
        description VARCHAR(255),
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // Create settings table
    await pool.query(`
      CREATE TABLE settings (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // Seed default settings
    await pool.query(`
      INSERT INTO settings (key, value) VALUES
        ('dnsdist_ssh_host', ''),
        ('dnsdist_ssh_port', '22'),
        ('dnsdist_ssh_user', 'root'),
        ('dnsdist_ssh_key_path', '')
      ON CONFLICT (key) DO NOTHING
    `)

    console.log('Database migration completed successfully')
  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  migrate().then(() => process.exit(0))
}

module.exports = { migrate }
