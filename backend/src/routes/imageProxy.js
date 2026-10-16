const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * Image Proxy - Mengambil gambar dari CDN Kroombox dan mengirimkannya kembali ke client.
 * Ini menghindari masalah CORS dan OpaqueResponseBlocking di browser.
 */
router.get('/:fileId', async (req, res) => {
  const { fileId } = req.params;
  const cdnApiKey = process.env.CDN_API_KEY;

  if (!fileId || fileId === 'null' || fileId === 'undefined') {
    return res.status(400).send('Invalid File ID');
  }

  // Validasi fileId — hanya izinkan alfanumerik, dash, underscore, dot (cegah path traversal)
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(fileId)) {
    return res.status(400).send('Invalid File ID format');
  }

  try {
    console.log(`[Proxy] Mengambil gambar ${fileId} dari CDN...`);

    const response = await axios({
      method: 'get',
      url: `https://api-cdn.kroombox.com/api/bridge/view/${fileId}`,
      headers: {
        'x-api-key': cdnApiKey
      },
      responseType: 'arraybuffer'
    });

    // Set header agar browser mengenalinya sebagai gambar
    res.setHeader('Content-Type', response.headers['content-type'] || 'image/png');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 24 jam (hanya jika sukses)
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // Izinkan di-load dari origin lain

    console.log(`[Proxy] Berhasil mengirim gambar ${fileId}`);
    res.send(Buffer.from(response.data));
  } catch (error) {
    console.error(`[Proxy Error] Gagal mengambil gambar ${fileId}:`, error.message);
    
    // Jika gagal, coba cari di folder uploads lokal sebagai fallback terakhir
    const path = require('path');
    const fs = require('fs');
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
    const localPath = path.resolve(uploadsDir, fileId);
    
    // Pastikan path tidak keluar dari folder uploads (cegah path traversal)
    if (!localPath.startsWith(uploadsDir)) {
      return res.status(400).send('Invalid File ID');
    }
    
    if (fs.existsSync(localPath)) {
      return res.sendFile(localPath);
    }

    res.status(error.response?.status || 500).send('Gagal memuat gambar');
  }
});

module.exports = router;
