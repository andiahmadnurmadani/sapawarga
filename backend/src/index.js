const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');

// Fail-fast: pastikan JWT_SECRET terisi
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('❌ FATAL: JWT_SECRET belum diset atau terlalu pendek (min 16 karakter). Server tidak bisa jalan.');
  process.exit(1);
}

const app = express();

// Security headers — konfigurasi agar tidak memblokir gambar cross-origin
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false, // Jangan blokir resource dari origin lain (gambar CDN)
}));

// Disable X-Powered-By (sudah di-handle helmet, tapi double-safe)
app.disable('x-powered-by');

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

// ── CORS ──────────────────────────────────────────────────────────────────────
// Development : izinkan semua origin localhost
// Production  : hanya izinkan domain frontend yang terdaftar
const allowedOrigins = isProd
  ? [
      process.env.FRONTEND_URL || 'https://hallowarga.com',
      // Otomatis izinkan versi www jika FRONTEND_URL tanpa www
      ...(process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes('www.')
        ? [process.env.FRONTEND_URL.replace('https://', 'https://www.')]
        : []),
    ]
  : [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:4173', // vite preview
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Izinkan request tanpa origin (health check, server-to-server, mobile app)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Log tapi jangan crash — tetap kirim CORS error yang proper
    console.warn(`[CORS] Origin ditolak: ${origin}`);
    callback(new Error(`CORS: origin '${origin}' tidak diizinkan`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Serve static uploads (hanya file, tanpa directory listing)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  dotfiles: 'deny',
  index: false
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/surat', require('./routes/surat'));
app.use('/api/info', require('./routes/info'));
app.use('/api/cms', require('./routes/cms'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/config', require('./routes/config'));
app.use('/api/image-proxy', require('./routes/imageProxy'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/iuran', require('./routes/iuran'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} tidak ditemukan` });
});

// Error handler — jangan bocorkan detail error ke client
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack || err.message || err);
  // Di production, jangan kirim detail error
  const message = isProd ? 'Internal Server Error' : (err.message || 'Internal Server Error');
  res.status(err.status || 500).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Sapa Warga Backend berjalan di http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 CORS allowed origins:`, allowedOrigins);
  console.log(`🔒 Environment: ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}\n`);
});
