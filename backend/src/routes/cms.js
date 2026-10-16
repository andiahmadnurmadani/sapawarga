const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { sendError } = require('../middleware/errorHelper');
const router = express.Router();

// ===== CMS Hero =====
router.get('/hero', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM cms_hero WHERE id = 1');
    if (rows.length === 0) return res.json(null);
    const r = rows[0];
    res.json({ title: r.title, subtitle: r.subtitle, imageUrl: r.image_url, updatedAt: r.updated_at });
  } catch (err) { sendError(res, err); }
});

router.put('/hero', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { title, subtitle, imageUrl } = req.body;
    await db.query('INSERT INTO cms_hero (id, title, subtitle, image_url) VALUES (1, ?, ?, ?) ON DUPLICATE KEY UPDATE title=?, subtitle=?, image_url=?',
      [title, subtitle, imageUrl, title, subtitle, imageUrl]);
    res.json({ message: 'Hero berhasil diupdate' });
  } catch (err) { sendError(res, err); }
});

// ===== CMS Vision =====
router.get('/vision', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM cms_vision WHERE id = 1');
    if (rows.length === 0) return res.json(null);
    const r = rows[0];
    res.json({ title: r.title, subtitle: r.subtitle, description: r.description, imageUrl: r.image_url, updatedAt: r.updated_at });
  } catch (err) { sendError(res, err); }
});

router.put('/vision', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { title, subtitle, description, imageUrl } = req.body;
    await db.query('INSERT INTO cms_vision (id, title, subtitle, description, image_url) VALUES (1, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=?, subtitle=?, description=?, image_url=?',
      [title, subtitle, description, imageUrl, title, subtitle, description, imageUrl]);
    res.json({ message: 'Vision berhasil diupdate' });
  } catch (err) { sendError(res, err); }
});

// ===== Gallery =====
router.get('/gallery', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM gallery ORDER BY `order` ASC');
    res.json(rows.map(r => ({ id: r.id, url: r.url, title: r.title, desc: r.desc, order: r.order, createdAt: r.created_at })));
  } catch (err) { sendError(res, err); }
});

router.post('/gallery', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { url, title, desc, order } = req.body;
    const id = uuidv4();
    await db.query('INSERT INTO gallery (id, url, title, `desc`, `order`) VALUES (?, ?, ?, ?, ?)', [id, url, title, desc, order || 0]);
    res.status(201).json({ id });
  } catch (err) { sendError(res, err); }
});

router.put('/gallery/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { url, title, desc, order } = req.body;
    await db.query(
      'UPDATE gallery SET url=?, title=?, `desc`=?, `order`=? WHERE id=?',
      [url, title, desc, order || 0, req.params.id]
    );
    res.json({ message: 'Berhasil diupdate' });
  } catch (err) { sendError(res, err); }
});

router.delete('/gallery/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM gallery WHERE id=?', [req.params.id]);
    res.json({ message: 'Berhasil dihapus' });
  } catch (err) { sendError(res, err); }
});

// ===== Testimonials =====
router.get('/testimonials', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM testimonials ORDER BY `order` ASC');
    res.json(rows.map(r => ({ id: r.id, name: r.name, role: r.role, quote: r.quote, avatarUrl: r.avatar_url, order: r.order, createdAt: r.created_at })));
  } catch (err) { sendError(res, err); }
});

router.post('/testimonials', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, role, quote, avatarUrl, order } = req.body;
    const id = uuidv4();
    await db.query('INSERT INTO testimonials (id, name, role, quote, avatar_url, `order`) VALUES (?, ?, ?, ?, ?, ?)', [id, name, role, quote, avatarUrl, order || 0]);
    res.status(201).json({ id });
  } catch (err) { sendError(res, err); }
});

router.delete('/testimonials/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM testimonials WHERE id=?', [req.params.id]);
    res.json({ message: 'Berhasil dihapus' });
  } catch (err) { sendError(res, err); }
});

// ===== CMS Content (stats, features, steps, cta, problem_solution) =====
router.get('/content/:section', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT data FROM cms_content WHERE section_key = ?', [req.params.section]);
    if (rows.length === 0) return res.json(null);
    res.json(rows[0].data);
  } catch (err) { sendError(res, err); }
});

router.get('/content', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT section_key, data FROM cms_content');
    const result = {};
    rows.forEach(r => { result[r.section_key] = r.data; });
    res.json(result);
  } catch (err) { sendError(res, err); }
});

router.put('/content/:section', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { data } = req.body;
    await db.query(
      'INSERT INTO cms_content (section_key, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data=?',
      [req.params.section, JSON.stringify(data), JSON.stringify(data)]
    );
    res.json({ message: 'Konten berhasil diupdate' });
  } catch (err) { sendError(res, err); }
});

module.exports = router;

