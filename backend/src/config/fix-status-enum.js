/**
 * Script satu kali — memperluas ENUM status di tabel warga_reports
 * Jalankan: node backend/src/config/fix-status-enum.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const mysql = require('mysql2/promise');

async function fix() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sapa_warga',
  });

  try {
    console.log('🔧 Memperluas ENUM status warga_reports...');
    
    // Step 1: Ubah kolom ke VARCHAR sementara agar bisa update bebas
    await connection.query(`ALTER TABLE warga_reports MODIFY COLUMN status VARCHAR(50) DEFAULT 'BELUM_DITANGANI'`);
    console.log('  ✅ Kolom diubah ke VARCHAR sementara');

    // Step 2: Migrasi semua nilai lama ke nilai baru
    await connection.query(`UPDATE warga_reports SET status = 'BELUM_DITANGANI' WHERE status IN ('PROSES', 'PENDING', '') OR status IS NULL`);
    await connection.query(`UPDATE warga_reports SET status = 'SELESAI_DITANGANI' WHERE status IN ('SELESAI', 'DITANGANI', 'DITOLAK')`);
    console.log('  ✅ Data lama dimigrasi ke nilai baru');

    // Step 3: Ubah ke ENUM yang benar
    await connection.query(`ALTER TABLE warga_reports MODIFY COLUMN status ENUM('BELUM_DITANGANI', 'SELESAI_DITANGANI') DEFAULT 'BELUM_DITANGANI'`);
    console.log('✅ Berhasil! ENUM status sekarang: BELUM_DITANGANI, SELESAI_DITANGANI');
  } catch (err) {
    console.error('❌ Gagal:', err.message);
  } finally {
    await connection.end();
  }
}

fix();
