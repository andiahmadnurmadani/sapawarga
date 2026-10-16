const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { sendError } = require('../middleware/errorHelper');
const router = express.Router();

// GET semua pengajuan (admin) atau milik user
router.get('/', authMiddleware, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'ADMIN') {
      [rows] = await db.query('SELECT * FROM pengajuan_surat ORDER BY created_at DESC');
    } else {
      [rows] = await db.query('SELECT * FROM pengajuan_surat WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    }
    const result = rows.map(r => ({
      id: r.id, userId: r.user_id, userName: r.user_name, userNik: r.user_nik,
      typeId: r.type_id, typeName: r.type_name, status: r.status,
      keterangan: r.keterangan, data: r.data, rejectionReason: r.rejection_reason,
      suratContent: r.surat_content, pdfUrl: r.pdf_url, blocks: r.blocks,
      createdAt: r.created_at, updatedAt: r.updated_at
    }));
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
});

// POST buat pengajuan baru
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { typeId, typeName, keterangan, data, blocks } = req.body;
    const [userRows] = await db.query('SELECT name, nik FROM users WHERE id = ?', [req.user.id]);
    const user = userRows[0];
    const id = uuidv4();
    await db.query(
      `INSERT INTO pengajuan_surat (id, user_id, user_name, user_nik, type_id, type_name, status, keterangan, data, blocks) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
      [id, req.user.id, user?.name, user?.nik, typeId, typeName, keterangan, JSON.stringify(data || {}), JSON.stringify(blocks || [])]
    );
    // Notifikasi admin
    const [admins] = await db.query('SELECT id FROM users WHERE role = "ADMIN"');
    for (const admin of admins) {
      await db.query(
        `INSERT INTO notifications (id, user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, 'SURAT', ?)`,
        [uuidv4(), admin.id, 'Pengajuan Surat Baru', `${user?.name} mengajukan ${typeName}`, id]
      );
    }
    res.status(201).json({ id, message: 'Pengajuan berhasil dibuat' });
  } catch (err) {
    sendError(res, err);
  }
});

// PUT update status (admin only)
router.put('/:id/status', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { status, rejectionReason, suratContent, pdfUrl, blocks } = req.body;
    await db.query(
      `UPDATE pengajuan_surat SET status=?, rejection_reason=?, surat_content=?, pdf_url=?, blocks=? WHERE id=?`,
      [status, rejectionReason || null, suratContent || null, pdfUrl || null, blocks ? JSON.stringify(blocks) : null, req.params.id]
    );
    // Notif ke warga
    const [rows] = await db.query('SELECT user_id, type_name FROM pengajuan_surat WHERE id=?', [req.params.id]);
    if (rows.length > 0) {
      const label = { DISETUJUI: 'disetujui', DITOLAK: 'ditolak', DIPROSES: 'sedang diproses' }[status] || status;
      await db.query(
        `INSERT INTO notifications (id, user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, 'SURAT', ?)`,
        [uuidv4(), rows[0].user_id, 'Update Status Surat', `Pengajuan ${rows[0].type_name} Anda ${label}`, req.params.id]
      );
    }
    res.json({ message: 'Status berhasil diupdate' });
  } catch (err) {
    sendError(res, err);
  }
});

// DELETE pengajuan
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT user_id FROM pengajuan_surat WHERE id=?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Tidak ditemukan' });
    if (req.user.role !== 'ADMIN' && rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Akses ditolak' });
    await db.query('DELETE FROM pengajuan_surat WHERE id=?', [req.params.id]);
    res.json({ message: 'Berhasil dihapus' });
  } catch (err) {
    sendError(res, err);
  }
});

module.exports = router;
