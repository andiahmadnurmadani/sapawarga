const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { sendError } = require('../middleware/errorHelper');
const router = express.Router();

// GET semua info (public)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM info_rt ORDER BY date DESC');
    res.json(rows.map(r => ({ id: r.id, title: r.title, content: r.content, date: r.date, imageUrl: r.image_url, type: r.type })));
  } catch (err) {
    sendError(res, err);
  }
});

// POST buat info baru (admin)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { title, content, type, imageUrl } = req.body;
    const id = uuidv4();
    await db.query('INSERT INTO info_rt (id, title, content, type, image_url) VALUES (?, ?, ?, ?, ?)', [id, title, content, type, imageUrl || null]);
    res.status(201).json({ id, message: 'Info berhasil dibuat' });
  } catch (err) {
    sendError(res, err);
  }
});

// PUT update info (admin)
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { title, content, type, imageUrl } = req.body;
    await db.query('UPDATE info_rt SET title=?, content=?, type=?, image_url=? WHERE id=?', [title, content, type, imageUrl || null, req.params.id]);
    res.json({ message: 'Info berhasil diupdate' });
  } catch (err) {
    sendError(res, err);
  }
});

// DELETE info (admin)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM info_rt WHERE id=?', [req.params.id]);
    res.json({ message: 'Info berhasil dihapus' });
  } catch (err) {
    sendError(res, err);
  }
});

module.exports = router;
