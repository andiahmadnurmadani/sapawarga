const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { sendError } = require('../middleware/errorHelper');
const router = express.Router();

// ===== Inventory =====
router.get('/inventory', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM inventory ORDER BY created_at DESC');
    res.json(rows.map(r => ({ id: r.id, name: r.name, quantity: r.quantity, condition: r.condition, source: r.source, dateIn: r.date_in, remarks: r.remarks })));
  } catch (err) { sendError(res, err); }
});

router.post('/inventory', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, quantity, condition, source, dateIn, remarks } = req.body;
    const id = uuidv4();
    const formattedDate = dateIn ? new Date(dateIn).toISOString().split('T')[0] : null;
    await db.query('INSERT INTO inventory (id, name, quantity, `condition`, source, date_in, remarks) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, name, quantity, condition, source, formattedDate, remarks]);
    res.status(201).json({ id });
  } catch (err) { sendError(res, err); }
});

router.put('/inventory/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, quantity, condition, source, dateIn, remarks } = req.body;
    const formattedDate = dateIn ? new Date(dateIn).toISOString().split('T')[0] : null;
    await db.query('UPDATE inventory SET name=?, quantity=?, `condition`=?, source=?, date_in=?, remarks=? WHERE id=?', [name, quantity, condition, source, formattedDate, remarks, req.params.id]);
    res.json({ message: 'Berhasil diupdate' });
  } catch (err) { sendError(res, err); }
});

router.delete('/inventory/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM inventory WHERE id=?', [req.params.id]);
    res.json({ message: 'Berhasil dihapus' });
  } catch (err) { sendError(res, err); }
});

// ===== Incident Log =====
router.get('/incidents', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM incident_log ORDER BY date DESC');
    res.json(rows.map(r => ({ id: r.id, title: r.title, description: r.description, date: r.date, location: r.location, reporter: r.reporter, imageUrl: r.image_url })));
  } catch (err) { sendError(res, err); }
});

router.post('/incidents', authMiddleware, async (req, res) => {
  try {
    const { title, description, location, reporter, imageUrl } = req.body;
    const id = uuidv4();
    await db.query('INSERT INTO incident_log (id, title, description, location, reporter, image_url) VALUES (?, ?, ?, ?, ?, ?)', [id, title, description, location, reporter, imageUrl || null]);
    res.status(201).json({ id });
  } catch (err) { sendError(res, err); }
});

router.put('/incidents/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { title, description, location, imageUrl } = req.body;
    await db.query('UPDATE incident_log SET title=?, description=?, location=?, image_url=? WHERE id=?', [title, description, location, imageUrl || null, req.params.id]);
    res.json({ message: 'Berhasil diupdate' });
  } catch (err) { sendError(res, err); }
});

router.delete('/incidents/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM incident_log WHERE id=?', [req.params.id]);
    res.json({ message: 'Berhasil dihapus' });
  } catch (err) { sendError(res, err); }
});

// ===== Warga Reports =====
router.get('/reports', authMiddleware, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'ADMIN') {
      [rows] = await db.query(`
        SELECT wr.*, u.avatar AS user_avatar
        FROM warga_reports wr
        LEFT JOIN users u ON wr.user_id = u.id
        ORDER BY wr.created_at DESC
      `);
    } else {
      [rows] = await db.query(`
        SELECT wr.*, u.avatar AS user_avatar
        FROM warga_reports wr
        LEFT JOIN users u ON wr.user_id = u.id
        WHERE wr.user_id=? OR wr.is_public=TRUE
        ORDER BY wr.created_at DESC
      `, [req.user.id]);
    }
    res.json(rows.map(r => ({ id: r.id, userId: r.user_id, userName: r.user_name, userAvatar: r.user_avatar || null, title: r.title, content: r.content, type: r.type, isPublic: !!r.is_public, status: r.status, createdAt: r.created_at, imageUrl: r.image_url })));
  } catch (err) { sendError(res, err); }
});

router.post('/reports', authMiddleware, async (req, res) => {
  try {
    const { title, content, type, isPublic, imageUrl } = req.body;
    const [userRows] = await db.query('SELECT name FROM users WHERE id=?', [req.user.id]);
    const id = uuidv4();
    await db.query('INSERT INTO warga_reports (id, user_id, user_name, title, content, type, is_public, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, req.user.id, userRows[0]?.name, title, content, type, isPublic ? 1 : 0, imageUrl || null]);
    res.status(201).json({ id });
  } catch (err) { sendError(res, err); }
});

router.put('/reports/:id', authMiddleware, async (req, res) => {
  try {
    const { title, content, type, isPublic, imageUrl, status } = req.body;
    
    // Check ownership if not admin
    if (req.user.role !== 'ADMIN') {
      const [ownerRows] = await db.query('SELECT user_id FROM warga_reports WHERE id=?', [req.params.id]);
      if (ownerRows.length === 0) return res.status(404).json({ error: 'Laporan tidak ditemukan' });
      if (ownerRows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Tidak memiliki akses' });
    }

    const updates = [];
    const params = [];
    
    if (title !== undefined) { updates.push('title=?'); params.push(title); }
    if (content !== undefined) { updates.push('content=?'); params.push(content); }
    if (type !== undefined) { updates.push('type=?'); params.push(type); }
    if (isPublic !== undefined) { updates.push('is_public=?'); params.push(isPublic ? 1 : 0); }
    if (imageUrl !== undefined) { updates.push('image_url=?'); params.push(imageUrl); }
    if (status !== undefined && req.user.role === 'ADMIN') { updates.push('status=?'); params.push(status); }

    if (updates.length === 0) return res.status(400).json({ error: 'Tidak ada field untuk diupdate' });
    
    params.push(req.params.id);
    await db.query(`UPDATE warga_reports SET ${updates.join(', ')} WHERE id=?`, params);
    res.json({ message: 'Berhasil diupdate' });
  } catch (err) { sendError(res, err); }
});

router.delete('/reports/:id', authMiddleware, async (req, res) => {
  try {
    // Check ownership if not admin
    if (req.user.role !== 'ADMIN') {
      const [ownerRows] = await db.query('SELECT user_id FROM warga_reports WHERE id=?', [req.params.id]);
      if (ownerRows.length === 0) return res.status(404).json({ error: 'Laporan tidak ditemukan' });
      if (ownerRows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Tidak memiliki akses' });
    }

    await db.query('DELETE FROM warga_reports WHERE id=?', [req.params.id]);
    res.json({ message: 'Laporan berhasil dihapus' });
  } catch (err) { sendError(res, err); }
});

// GET laporan publik (tanpa auth — untuk forum warga)
router.get('/reports/public', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT wr.*, u.avatar AS user_avatar
      FROM warga_reports wr
      LEFT JOIN users u ON wr.user_id = u.id
      WHERE wr.is_public=TRUE
      ORDER BY wr.created_at DESC
      LIMIT 50
    `);
    res.json(rows.map(r => ({ id: r.id, userId: r.user_id, userName: r.user_name, userAvatar: r.user_avatar || null, title: r.title, content: r.content, type: r.type, isPublic: true, status: r.status, createdAt: r.created_at, imageUrl: r.image_url })));
  } catch (err) { sendError(res, err); }
});

// ===== Temp Residents =====
router.get('/temp-residents', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM temp_residents ORDER BY created_at DESC');
    res.json(rows.map(r => ({ id: r.id, name: r.name, nik: r.nik, origin: r.origin, purpose: r.purpose, startDate: r.start_date, endDate: r.end_date, address: r.address, phone: r.phone })));
  } catch (err) { sendError(res, err); }
});

router.post('/temp-residents', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, nik, origin, purpose, startDate, endDate, address, phone } = req.body;
    const id = uuidv4();
    const formattedStartDate = startDate ? new Date(startDate).toISOString().split('T')[0] : null;
    const formattedEndDate = endDate ? new Date(endDate).toISOString().split('T')[0] : null;
    await db.query('INSERT INTO temp_residents (id, name, nik, origin, purpose, start_date, end_date, address, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, nik, origin, purpose, formattedStartDate, formattedEndDate, address, phone]);
    res.status(201).json({ id });
  } catch (err) { sendError(res, err); }
});

router.put('/temp-residents/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, nik, origin, purpose, startDate, endDate, address, phone } = req.body;
    const formattedStartDate = startDate ? new Date(startDate).toISOString().split('T')[0] : null;
    const formattedEndDate = endDate ? new Date(endDate).toISOString().split('T')[0] : null;
    await db.query('UPDATE temp_residents SET name=?, nik=?, origin=?, purpose=?, start_date=?, end_date=?, address=?, phone=? WHERE id=?',
      [name, nik, origin, purpose, formattedStartDate, formattedEndDate, address, phone, req.params.id]);
    res.json({ message: 'Berhasil diupdate' });
  } catch (err) { sendError(res, err); }
});

router.delete('/temp-residents/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM temp_residents WHERE id=?', [req.params.id]);
    res.json({ message: 'Berhasil dihapus' });
  } catch (err) { sendError(res, err); }
});

module.exports = router;
