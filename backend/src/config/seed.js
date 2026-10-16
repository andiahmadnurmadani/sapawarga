const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sapa_warga',
    charset: 'utf8mb4'
  });

  try {
    console.log('🌱 Memulai seeding data...');

    // Admin user
    const adminId = uuidv4();
    const adminHash = await bcrypt.hash('admin123', 10);
    await conn.query(`INSERT IGNORE INTO users (id, email, password, name, role, nik, alamat, no_hp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [adminId, 'admin@sapawarga.com', adminHash, 'Admin RT 10', 'ADMIN', '3201010101010001', 'Jl. Ketua RT No. 1', '081234567890']);
    console.log('  ✅ Admin user: admin@sapawarga.com / admin123');

    // Warga user
    const wargaId = uuidv4();
    const wargaHash = await bcrypt.hash('warga123', 10);
    await conn.query(`INSERT IGNORE INTO users (id, email, password, name, role, nik, no_kk, alamat, no_hp, tempat_lahir, tgl_lahir, jenis_kelamin, agama, status_pernikahan, pekerjaan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [wargaId, 'budi@example.com', wargaHash, 'Budi Santoso', 'WARGA', '3201010201010001', '3201010000000001', 'Jl. Mawar No. 5 RT 10 RW 04', '082345678901', 'Jakarta', '1990-05-15', 'Laki-laki', 'Islam', 'Menikah', 'Karyawan Swasta']);
    console.log('  ✅ Warga user: budi@example.com / warga123');

    // App Config
    await conn.query(`INSERT IGNORE INTO app_config (id, village_name, district_name, city_name, rt_number, rw_number, rt_leader_name, rw_leader_name, secretary_address) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Kelurahan Sukamaju', 'Kecamatan Cimanggis', 'Kota Depok', '10', '04', 'Bpk. Ahmad Fauzi', 'Bpk. Hendra Wijaya', 'Jl. Lingkungan RT 10 RW 04, Kelurahan Sukamaju']);
    console.log('  ✅ App config awal');

    // CMS Hero
    await conn.query(`INSERT IGNORE INTO cms_hero (id, title, subtitle, image_url) VALUES (1, ?, ?, ?)`,
      ['Urus Surat RT Jadi Lebih Mudah & Cepat dari Rumah.', 'Aplikasi Sapa Warga membantu warga RT 10 RW 04 mengurus pengajuan surat, mendapatkan informasi terbaru, dan mengelola data kependudukan secara digital.', 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=800']);
    console.log('  ✅ CMS Hero');

    // CMS Vision
    await conn.query(`INSERT IGNORE INTO cms_vision (id, title, subtitle, description, image_url) VALUES (1, ?, ?, ?, ?)`,
      ['Satu Visi,', 'Satu Aksi', 'Kami percaya bahwa kerukunan dimulai dari komunikasi yang baik dan kemudahan dalam berbagi kebahagiaan antar sesama warga RT 10.', 'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?auto=format&fit=crop&q=80&w=1200']);
    console.log('  ✅ CMS Vision');

    // Info RT
    const infos = [
      [uuidv4(), 'Kerja Bakti Minggu Ceria', 'Dihimbau kepada seluruh warga untuk mengikuti kegiatan kerja bakti pada hari Minggu, 4 Mei 2026 pukul 07:00 WIB.', new Date('2026-04-25'), 'https://images.unsplash.com/photo-1591115765373-520b7a217631?auto=format&fit=crop&q=80&w=800', 'KEGIATAN'],
      [uuidv4(), 'Pembayaran Iuran Bulanan', 'Informasi mengenai penagihan iuran keamanan dan kebersihan bulan Mei dapat dilakukan melalui Koordinator masing-masing gang.', new Date('2026-04-20'), null, 'PENGUMUMAN'],
      [uuidv4(), 'Laporan Keuangan RT Q1 2026', 'Laporan keuangan RT untuk periode Januari - Maret 2026 telah tersedia dan dapat dilihat di papan pengumuman atau melalui akun warga.', new Date('2026-04-15'), null, 'BERITA'],
    ];
    for (const info of infos) {
      await conn.query(`INSERT IGNORE INTO info_rt (id, title, content, date, image_url, type) VALUES (?, ?, ?, ?, ?, ?)`, info);
    }
    console.log('  ✅ Info RT (3 item)');

    // Gallery
    const galleries = [
      [uuidv4(), 'https://images.unsplash.com/photo-1543733330-466d809f4851?auto=format&fit=crop&q=80&w=1200', 'Kerja Bakti Minggu Pagi', 'Warga bahu membahu membersihkan lingkungan sekitar taman RT.', 1],
      [uuidv4(), 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&q=80&w=1200', 'Rapat Rutin Pengurus & Warga', 'Diskusi santai namun serius membahas pengembangan fasilitas balai warga.', 2],
      [uuidv4(), 'https://images.unsplash.com/photo-1621213076116-2f0857398dbd?auto=format&fit=crop&q=80&w=1200', 'Suasana Asri Lingkungan RT 10', 'Keasrian tetap terjaga berkat kepedulian seluruh warga akan kebersihan.', 3],
    ];
    for (const g of galleries) {
      await conn.query(`INSERT IGNORE INTO gallery (id, url, title, \`desc\`, \`order\`) VALUES (?, ?, ?, ?, ?)`, g);
    }
    console.log('  ✅ Gallery (3 item)');

    // Testimonials
    const testimonials = [
      [uuidv4(), 'Ibu Sari', 'Warga RT 10', 'Surat domisili bisa diurus dari rumah, prosesnya cepat dan mudah. Terima kasih Sapa Warga!', '', 1],
      [uuidv4(), 'Pak Hendra', 'Warga RT 10', 'Pengumuman kerja bakti jadi lebih mudah dipantau. Tidak perlu khawatir ketinggalan info lagi.', '', 2],
    ];
    for (const t of testimonials) {
      await conn.query(`INSERT IGNORE INTO testimonials (id, name, role, quote, avatar_url, \`order\`) VALUES (?, ?, ?, ?, ?, ?)`, t);
    }
    console.log('  ✅ Testimonials (2 item)');

    // Surat Types (dari constants.ts)
    const suratTypes = [
      { id: 'pengantar-nik', name: 'Surat Pengantar Pembuatan NIK Baru', description: 'Surat pengantar untuk pengajuan NIK baru bagi penduduk dewasa yang baru terdaftar.', template: 'SURAT PENGANTAR NIK' },
      { id: 'pengantar-akta-lahir', name: 'Surat Pengantar Akta Kelahiran', description: 'Surat pengantar untuk pengurusan akta kelahiran.', template: 'SURAT PENGANTAR AKTA LAHIR' },
      { id: 'pengantar-kematian', name: 'Surat Pengantar Akta Kematian', description: 'Surat pengantar untuk pengurusan akta kematian.', template: 'SURAT PENGANTAR AKTA KEMATIAN' },
      { id: 'pengantar-skck', name: 'Surat Pengantar SKCK', description: 'Surat pengantar sebagai langkah awal verifikasi lingkungan untuk pengurusan SKCK.', template: 'SURAT PENGANTAR SKCK' },
      { id: 'pengantar-kk', name: 'Pengantar Perubahan Kartu Keluarga (KK)', description: 'Surat pengantar untuk penambahan atau pengurangan anggota keluarga di KK.', template: 'SURAT PENGANTAR KK' },
      { id: 'pengantar-nikah', name: 'Surat Pengantar Nikah', description: 'Surat pengantar untuk pengurusan administrasi pernikahan (N1-N4).', template: 'SURAT PENGANTAR NIKAH' },
      { id: 'ijin-keramaian', name: 'Surat Izin Keramaian', description: 'Surat pengantar untuk penyelenggaraan hajatan atau acara warga.', template: 'SURAT IZIN KERAMAIAN' },
      { id: 'ket-domisili', name: 'Surat Keterangan Domisili', description: 'Surat keterangan tempat tinggal warga.', template: 'SURAT KETERANGAN DOMISILI' },
      { id: 'ket-sktm', name: 'Surat Keterangan Tidak Mampu (SKTM)', description: 'Surat keterangan untuk warga yang membutuhkan bantuan sosial.', template: 'SURAT KETERANGAN TIDAK MAMPU' },
      { id: 'ket-usaha', name: 'Surat Keterangan Izin Usaha', description: 'Surat keterangan bagi warga yang ingin membuka usaha kecil.', template: 'SURAT KETERANGAN USAHA' },
      { id: 'pengantar-pindah', name: 'Surat Pengantar Pindah Domisili', description: 'Surat pengantar untuk mutasi atau pindah domisili warga.', template: 'SURAT PENGANTAR PINDAH' },
      { id: 'pengantar-umum', name: 'Surat Pengantar RT/RW Umum', description: 'Surat pengantar umum untuk berbagai keperluan warga ke Kelurahan.', template: 'SURAT PENGANTAR' },
      { id: 'ket-kehilangan', name: 'Surat Keterangan Kehilangan', description: 'Surat pengantar untuk laporan kehilangan di Kepolisian.', template: 'SURAT KETERANGAN KEHILANGAN' },
    ];
    for (const s of suratTypes) {
      await conn.query(`INSERT IGNORE INTO surat_types (id, name, description, template) VALUES (?, ?, ?, ?)`,
        [s.id, s.name, s.description, s.template]);
    }
    console.log(`  ✅ Surat types (${suratTypes.length} jenis)`);

    // Inventory
    const inventories = [
      [uuidv4(), 'Kursi Lipat', 50, 'BAIK', 'Kas RT', new Date('2024-01-15'), 'Digunakan untuk acara warga'],
      [uuidv4(), 'Meja Lipat', 10, 'BAIK', 'Donasi Warga', new Date('2023-06-10'), null],
      [uuidv4(), 'Sound System', 1, 'RUSAK_RINGAN', 'Kas RT', new Date('2022-08-20'), 'Perlu perbaikan speaker'],
      [uuidv4(), 'Tenda 3x6m', 3, 'BAIK', 'Bantuan Kelurahan', new Date('2025-01-01'), null],
    ];
    for (const inv of inventories) {
      await conn.query(`INSERT IGNORE INTO inventory (id, name, quantity, \`condition\`, source, date_in, remarks) VALUES (?, ?, ?, ?, ?, ?, ?)`, inv);
    }
    console.log('  ✅ Inventory (4 item)');

    console.log('\n✅ Seeding selesai!');
  } catch (err) {
    console.error('❌ Seeding gagal:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

seed();
