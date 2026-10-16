const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    charset: 'utf8mb4'
  });

  try {
    console.log('🚀 Memulai migrasi database...');

    // Buat database jika belum ada
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'sapa_warga'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`USE \`${process.env.DB_NAME || 'sapa_warga'}\``);

    // ==================== TABEL USERS ====================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role ENUM('WARGA', 'ADMIN') DEFAULT 'WARGA',
        nik VARCHAR(16) UNIQUE,
        no_kk VARCHAR(16),
        alamat TEXT,
        no_hp VARCHAR(20),
        tempat_lahir VARCHAR(100),
        tgl_lahir DATE,
        jenis_kelamin ENUM('Laki-laki', 'Perempuan'),
        agama VARCHAR(50),
        status_pernikahan VARCHAR(50),
        pekerjaan VARCHAR(100),
        avatar LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ Tabel users dibuat');

    // ==================== TABEL SURAT_TYPES ====================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS surat_types (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        template VARCHAR(255),
        blocks JSON,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ Tabel surat_types dibuat');

    // ==================== TABEL PENGAJUAN_SURAT ====================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pengajuan_surat (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        user_name VARCHAR(255),
        user_nik VARCHAR(16),
        type_id VARCHAR(100) NOT NULL,
        type_name VARCHAR(255),
        status ENUM('PENDING', 'DIPROSES', 'DISETUJUI', 'DITOLAK') DEFAULT 'PENDING',
        keterangan TEXT,
        data JSON,
        rejection_reason TEXT,
        surat_content LONGTEXT,
        pdf_url LONGTEXT,
        blocks JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_type_id (type_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ Tabel pengajuan_surat dibuat');

    // ==================== TABEL INFO_RT ====================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS info_rt (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        image_url LONGTEXT,
        type ENUM('PENGUMUMAN', 'BERITA', 'KEGIATAN', 'HIMBAUAN', 'EMERGENCY') DEFAULT 'PENGUMUMAN',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_type (type),
        INDEX idx_date (date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ Tabel info_rt dibuat');

    // Pastikan ENUM info_rt mencakup semua tipe (ALTER aman jika sudah ada)
    await connection.query(`
      ALTER TABLE info_rt MODIFY COLUMN type ENUM('PENGUMUMAN', 'BERITA', 'KEGIATAN', 'HIMBAUAN', 'EMERGENCY') DEFAULT 'PENGUMUMAN'
    `).catch(() => {}); // ignore jika tabel belum ada (akan dibuat di atas)

    // ==================== TABEL INVENTORY ====================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        quantity INT DEFAULT 0,
        \`condition\` ENUM('BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT') DEFAULT 'BAIK',
        source VARCHAR(255),
        date_in DATE,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ Tabel inventory dibuat');

    // ==================== TABEL INCIDENT_LOG ====================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS incident_log (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        location VARCHAR(255),
        reporter VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ Tabel incident_log dibuat');

    // ==================== TABEL WARGA_REPORTS ====================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS warga_reports (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        user_name VARCHAR(255),
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        type ENUM('SARAN', 'KELUHAN', 'LAPORAN') DEFAULT 'LAPORAN',
        is_public BOOLEAN DEFAULT FALSE,
        status ENUM('BELUM_DITANGANI', 'SELESAI_DITANGANI') DEFAULT 'BELUM_DITANGANI',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ Tabel warga_reports dibuat');

    // Pastikan ENUM status warga_reports pakai nilai baru
    await connection.query(`
      ALTER TABLE warga_reports MODIFY COLUMN status ENUM('BELUM_DITANGANI', 'SELESAI_DITANGANI') DEFAULT 'BELUM_DITANGANI'
    `).catch(() => {});
    // ==================== TABEL TEMP_RESIDENTS ====================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS temp_residents (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        nik VARCHAR(16) UNIQUE NOT NULL,
        origin VARCHAR(255),
        purpose TEXT,
        start_date DATE,
        end_date DATE,
        address TEXT,
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_nik (nik)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ Tabel temp_residents dibuat');

    // ==================== TABEL APP_CONFIG ====================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS app_config (
        id INT PRIMARY KEY DEFAULT 1,
        village_name VARCHAR(255) DEFAULT 'Nama Kelurahan',
        district_name VARCHAR(255) DEFAULT 'Nama Kecamatan',
        city_name VARCHAR(255) DEFAULT 'Nama Kota',
        rt_number VARCHAR(10) DEFAULT '10',
        rw_number VARCHAR(10) DEFAULT '04',
        rt_leader_name VARCHAR(255) DEFAULT 'Nama Ketua RT',
        rw_leader_name VARCHAR(255) DEFAULT 'Nama Ketua RW',
        secretary_address TEXT,
        logo_url LONGTEXT,
        logo_x FLOAT DEFAULT 0,
        logo_y FLOAT DEFAULT 0,
        signature_url LONGTEXT,
        rw_signature_url LONGTEXT,
        social_media JSON,
        footer_settings JSON,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ Tabel app_config dibuat');

    // ==================== TABEL CMS_HERO ====================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cms_hero (
        id INT PRIMARY KEY DEFAULT 1,
        title TEXT,
        subtitle TEXT,
        image_url LONGTEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ Tabel cms_hero dibuat');

    // ==================== TABEL CMS_VISION ====================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cms_vision (
        id INT PRIMARY KEY DEFAULT 1,
        title VARCHAR(255),
        subtitle VARCHAR(255),
        description TEXT,
        image_url LONGTEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ Tabel cms_vision dibuat');

    // ==================== TABEL GALLERY ====================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS gallery (
        id VARCHAR(36) PRIMARY KEY,
        url LONGTEXT NOT NULL,
        title VARCHAR(255),
        \`desc\` TEXT,
        \`order\` INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_order (\`order\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ Tabel gallery dibuat');

    // ==================== TABEL TESTIMONIALS ====================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS testimonials (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(255),
        quote TEXT NOT NULL,
        avatar_url LONGTEXT,
        \`order\` INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_order (\`order\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ Tabel testimonials dibuat');

    // ==================== TABEL NOTIFICATIONS ====================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        type ENUM('INFO', 'SURAT', 'LAPORAN', 'SYSTEM') DEFAULT 'INFO',
        is_read BOOLEAN DEFAULT FALSE,
        related_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_is_read (is_read)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ Tabel notifications dibuat');

    // ==================== TABEL IURAN_CONFIG ====================
    // Setting iuran (besaran per bulan, rekening, QRIS) — single row
    await connection.query(`
      CREATE TABLE IF NOT EXISTS iuran_config (
        id INT PRIMARY KEY DEFAULT 1,
        amount_per_month DECIMAL(15,2) DEFAULT 0,
        bank_name VARCHAR(100),
        bank_account_number VARCHAR(50),
        bank_account_holder VARCHAR(100),
        qris_image_url LONGTEXT,
        notes TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    // Insert default row jika kosong
    await connection.query(`
      INSERT IGNORE INTO iuran_config (id, amount_per_month) VALUES (1, 0)
    `);
    console.log('  ✅ Tabel iuran_config dibuat');

    // ==================== TABEL IURAN_PAYMENTS ====================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS iuran_payments (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        user_name VARCHAR(255),
        period_type ENUM('MONTH', 'PERIOD', 'YEAR') NOT NULL,
        year INT NOT NULL,
        start_month INT NOT NULL,
        end_month INT NOT NULL,
        months_json JSON,
        amount_per_month DECIMAL(15,2) NOT NULL,
        total_amount DECIMAL(15,2) NOT NULL,
        proof_url LONGTEXT,
        notes TEXT,
        status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
        rejection_reason TEXT,
        approved_by VARCHAR(36),
        approved_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_year (year)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ Tabel iuran_payments dibuat');

    console.log('\n✅ Semua migrasi berhasil!');
  } catch (error) {
    console.error('❌ Migrasi gagal:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
