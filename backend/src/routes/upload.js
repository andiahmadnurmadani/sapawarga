const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const FormData = require('form-data');
const { authMiddleware } = require('../middleware/auth');

// Pastikan folder uploads ada
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Validasi tipe file yang diizinkan
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = uuidv4();
    cb(null, 'upload_' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipe file tidak diizinkan. Hanya gambar (JPG, PNG, WebP, GIF) dan PDF.'));
    }
  }
});

router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah' });
  }

  const filePath = req.file.path;
  const cdnApiKey = process.env.CDN_API_KEY;

  if (cdnApiKey) {
    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(filePath));
      form.append('projectName', 'SapaWarga');

      console.log(`[Upload] Meneruskan file ${req.file.filename} ke CDN Kroombox...`);

      const response = await axios.post('https://api-cdn.kroombox.com/api/bridge/upload', form, {
        headers: {
          ...form.getHeaders(),
          'x-api-key': cdnApiKey
        }
      });

      const data = response.data;
      const fileId = data.fileId || data.id || (data.data && (data.data.fileId || data.data.id));

      if (fileId) {
        // Hapus file lokal setelah berhasil dikirim ke CDN
        try { fs.unlinkSync(filePath); } catch (e) {}

        console.log(`[Upload] Berhasil ke CDN! ID: ${fileId}`);

        return res.json({
          success: true,
          fileId: fileId,
          url: `https://api-cdn.kroombox.com/api/bridge/view/${fileId}`,
          message: 'Upload berhasil ke CDN'
        });
      }
    } catch (error) {
      console.error('[Upload] Gagal upload ke CDN:', error.message);
    }
  }

  // Fallback: Gunakan URL backend lokal jika CDN gagal atau API Key tidak ada
  const backendUrl = process.env.VITE_CDN_BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  const fileUrl = `${backendUrl}/uploads/${req.file.filename}`;

  console.log(`[Upload] Menggunakan penyimpanan lokal (Fallback): ${fileUrl}`);

  res.json({
    success: true,
    fileId: req.file.filename,
    url: fileUrl,
    message: 'Upload menggunakan server lokal (Fallback)'
  });
});

module.exports = router;
