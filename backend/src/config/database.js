const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sapa_warga',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+07:00',
  charset: 'utf8mb4'
});

// Test koneksi database
pool.getConnection()
  .then(conn => {
    console.log('✅ Database MySQL terhubung!');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Gagal koneksi ke database:', err.message);
  });

module.exports = pool;
