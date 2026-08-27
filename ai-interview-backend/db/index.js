const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_interview',
});

// Initialize database
async function initDb() {
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schemaSql);
    console.log('Database initialized successfully.');

    // Ensure there is at least one user (default mock user)
    const res = await pool.query('SELECT * FROM users LIMIT 1');
    if (res.rows.length === 0) {
      await pool.query(`INSERT INTO users (username, email) VALUES ('Guest User', 'guest@example.com')`);
      console.log('Created default Guest User.');
    }
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  initDb,
};
