const express = require('express');
const db = require('../config/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { sendError } = require('../middleware/errorHelper');
const router = express.Router();

// GET config (public)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM app_config WHERE id = 1');
    if (rows.length === 0) return res.json(null);
    const r = rows[0];
    res.json({
      villageName: r.village_name, districtName: r.district_name, cityName: r.city_name,
      rtNumber: r.rt_number, rwNumber: r.rw_number, rtLeaderName: r.rt_leader_name,
      rwLeaderName: r.rw_leader_name, secretaryAddress: r.secretary_address,
      logoUrl: r.logo_url, logoX: r.logo_x, logoY: r.logo_y,
      signatureUrl: r.signature_url, rwSignatureUrl: r.rw_signature_url,
      socialMedia: r.social_media, footerSettings: r.footer_settings,
      maxUploadSizeMb: r.max_upload_size_mb || 5
    });
  } catch (err) { sendError(res, err); }
});

// PUT update config (admin)
router.put('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { villageName, districtName, cityName, rtNumber, rwNumber, rtLeaderName, rwLeaderName, secretaryAddress, logoUrl, logoX, logoY, signatureUrl, rwSignatureUrl, socialMedia, footerSettings, maxUploadSizeMb } = req.body;
    await db.query(
      `INSERT INTO app_config (id, village_name, district_name, city_name, rt_number, rw_number, rt_leader_name, rw_leader_name, secretary_address, logo_url, logo_x, logo_y, signature_url, rw_signature_url, social_media, footer_settings, max_upload_size_mb)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE village_name=?, district_name=?, city_name=?, rt_number=?, rw_number=?, rt_leader_name=?, rw_leader_name=?, secretary_address=?, logo_url=?, logo_x=?, logo_y=?, signature_url=?, rw_signature_url=?, social_media=?, footer_settings=?, max_upload_size_mb=?`,
      [villageName, districtName, cityName, rtNumber, rwNumber, rtLeaderName, rwLeaderName, secretaryAddress, logoUrl, logoX, logoY, signatureUrl, rwSignatureUrl, JSON.stringify(socialMedia), JSON.stringify(footerSettings), maxUploadSizeMb || 5,
        villageName, districtName, cityName, rtNumber, rwNumber, rtLeaderName, rwLeaderName, secretaryAddress, logoUrl, logoX, logoY, signatureUrl, rwSignatureUrl, JSON.stringify(socialMedia), JSON.stringify(footerSettings), maxUploadSizeMb || 5]
    );
    res.json({ message: 'Config berhasil diupdate' });
  } catch (err) { sendError(res, err); }
});

// GET surat types (public)
router.get('/surat-types', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM surat_types WHERE is_active = TRUE ORDER BY category ASC, name ASC');
    res.json(rows.map(r => ({ id: r.id, name: r.name, category: r.category || 'PENGANTAR', description: r.description, template: r.template, blocks: r.blocks, formFields: r.form_fields })));
  } catch (err) { sendError(res, err); }
});

// POST surat types (admin) - tambah template baru
router.post('/surat-types', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id, name, category, description, template, blocks, formFields } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'id dan name wajib diisi' });
    await db.query(
      `INSERT INTO surat_types (id, name, category, description, template, blocks, form_fields, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [id, name, category || 'PENGANTAR', description || '', template || '', JSON.stringify(blocks || []), JSON.stringify(formFields || [])]
    );
    res.status(201).json({ message: 'Template surat berhasil ditambahkan' });
  } catch (err) { sendError(res, err); }
});

// PUT surat types (admin) - update nama, kategori, deskripsi, blocks
router.put('/surat-types/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, category, description, template, blocks, formFields } = req.body;
    await db.query(
      `UPDATE surat_types SET name=?, category=?, description=?, template=?, blocks=?, form_fields=? WHERE id=?`,
      [name, category || 'PENGANTAR', description || '', template || '', JSON.stringify(blocks || []), JSON.stringify(formFields || []), req.params.id]
    );
    res.json({ message: 'Template surat berhasil diupdate' });
  } catch (err) { sendError(res, err); }
});

// DELETE surat types (admin) - soft delete
router.delete('/surat-types/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.query(`UPDATE surat_types SET is_active=FALSE WHERE id=?`, [req.params.id]);
    res.json({ message: 'Template surat berhasil dihapus' });
  } catch (err) { sendError(res, err); }
});

// GET notifikasi user
router.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    res.json(rows.map(r => ({ id: r.id, userId: r.user_id, title: r.title, message: r.message, type: r.type, isRead: !!r.is_read, relatedId: r.related_id, createdAt: r.created_at })));
  } catch (err) { sendError(res, err); }
});

// PUT tandai notif dibaca
router.put('/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read=TRUE WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    res.json({ message: 'Notifikasi ditandai dibaca' });
  } catch (err) { sendError(res, err); }
});

// PUT tandai semua notif dibaca
router.put('/notifications/read-all', authMiddleware, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read=TRUE WHERE user_id=?', [req.user.id]);
    res.json({ message: 'Semua notifikasi ditandai dibaca' });
  } catch (err) { sendError(res, err); }
});

// GET stats dashboard (admin)
router.get('/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [[{ totalWarga }]] = await db.query('SELECT COUNT(*) as totalWarga FROM users WHERE role="WARGA"');
    const [[{ totalSurat }]] = await db.query('SELECT COUNT(*) as totalSurat FROM pengajuan_surat');
    const [[{ pending }]] = await db.query('SELECT COUNT(*) as pending FROM pengajuan_surat WHERE status="PENDING"');
    const [[{ totalInventory }]] = await db.query('SELECT COUNT(*) as totalInventory FROM inventory');
    const [[{ totalIncidents }]] = await db.query('SELECT COUNT(*) as totalIncidents FROM incident_log');
    const [[{ totalReports }]] = await db.query('SELECT COUNT(*) as totalReports FROM warga_reports');
    res.json({ totalWarga, totalSurat, pending, totalInventory, totalIncidents, totalReports });
  } catch (err) { sendError(res, err); }
});

module.exports = router;
