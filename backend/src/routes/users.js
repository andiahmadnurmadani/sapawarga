const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { sendError } = require('../middleware/errorHelper');
const router = express.Router();

// GET semua users (admin)
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, email, name, role, nik, no_kk, alamat, no_hp, tempat_lahir, tgl_lahir, jenis_kelamin, agama, status_pernikahan, pekerjaan, avatar, created_at FROM users ORDER BY created_at DESC');
    res.json(rows.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, nik: u.nik, noKK: u.no_kk, alamat: u.alamat, noHp: u.no_hp, tempatLahir: u.tempat_lahir, tglLahir: u.tgl_lahir, jenisKelamin: u.jenis_kelamin, agama: u.agama, statusPernikahan: u.status_pernikahan, pekerjaan: u.pekerjaan, avatar: u.avatar })));
  } catch (err) { sendError(res, err); }
});

// POST tambah user baru (admin only)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, email, nik, noKK, alamat, noHp, role, password } = req.body;
    if (!name || !nik) return res.status(400).json({ error: 'Nama dan NIK wajib diisi' });

    // Bersihkan & validasi panjang
    const cleanNik = String(nik).replace(/\D/g, '').slice(0, 16);
    const cleanNoKK = noKK ? String(noKK).replace(/\D/g, '').slice(0, 16) : null;
    const cleanNoHp = noHp ? String(noHp).slice(0, 20) : null;

    if (cleanNik.length !== 16) return res.status(400).json({ error: 'NIK harus 16 digit angka' });
    if (cleanNoKK && cleanNoKK.length !== 16) return res.status(400).json({ error: 'Nomor KK harus 16 digit angka' });

    // Cek NIK duplikat
    const [existing] = await db.query('SELECT id FROM users WHERE nik=?', [cleanNik]);
    if (existing.length > 0) return res.status(400).json({ error: 'NIK sudah terdaftar' });

    const id = uuidv4();
    const finalEmail = email || `${cleanNik}@warga.local`;
    const finalRole = role || 'WARGA';
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(password || cleanNik, 10);

    await db.query(
      'INSERT INTO users (id, email, password, name, role, nik, no_kk, alamat, no_hp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, finalEmail, hashed, name, finalRole, cleanNik, cleanNoKK, alamat || null, cleanNoHp]
    );
    res.status(201).json({ id, message: 'Warga berhasil ditambahkan' });
  } catch (err) { sendError(res, err); }
});

// GET satu user
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.id !== req.params.id) return res.status(403).json({ error: 'Akses ditolak' });
    const [rows] = await db.query('SELECT id, email, name, role, nik, no_kk, alamat, no_hp, tempat_lahir, tgl_lahir, jenis_kelamin, agama, status_pernikahan, pekerjaan, avatar FROM users WHERE id=?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User tidak ditemukan' });
    const u = rows[0];
    res.json({ id: u.id, email: u.email, name: u.name, role: u.role, nik: u.nik, noKK: u.no_kk, alamat: u.alamat, noHp: u.no_hp, tempatLahir: u.tempat_lahir, tglLahir: u.tgl_lahir, jenisKelamin: u.jenis_kelamin, agama: u.agama, statusPernikahan: u.status_pernikahan, pekerjaan: u.pekerjaan, avatar: u.avatar });
  } catch (err) { sendError(res, err); }
});

// PUT update user — admin dapat update semua field, user hanya bisa update profil sendiri
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    // Non-admin hanya boleh update profil sendiri
    if (req.user.role !== 'ADMIN' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Akses ditolak' });
    }
    const { name, role, alamat, noHp, nik, noKK, tempatLahir, tglLahir, jenisKelamin, agama, statusPernikahan, pekerjaan, avatar } = req.body;
    // Admin bisa ubah role, warga tidak
    const finalRole = (req.user.role === 'ADMIN' && role) ? role : undefined;
    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name=?'); params.push(name); }
    if (finalRole !== undefined) { updates.push('role=?'); params.push(finalRole); }
    if (alamat !== undefined) { updates.push('alamat=?'); params.push(alamat); }
    if (noHp !== undefined) { updates.push('no_hp=?'); params.push(noHp); }
    if (nik !== undefined) { updates.push('nik=?'); params.push(nik); }
    if (noKK !== undefined) { updates.push('no_kk=?'); params.push(noKK); }
    if (tempatLahir !== undefined) { updates.push('tempat_lahir=?'); params.push(tempatLahir); }
    if (tglLahir !== undefined) {
      // MySQL DATE column hanya menerima format YYYY-MM-DD
      const dateOnly = tglLahir ? tglLahir.split('T')[0] : null;
      updates.push('tgl_lahir=?'); params.push(dateOnly);
    }
    if (jenisKelamin !== undefined) { updates.push('jenis_kelamin=?'); params.push(jenisKelamin); }
    if (agama !== undefined) { updates.push('agama=?'); params.push(agama); }
    if (statusPernikahan !== undefined) { updates.push('status_pernikahan=?'); params.push(statusPernikahan); }
    if (pekerjaan !== undefined) { updates.push('pekerjaan=?'); params.push(pekerjaan); }
    if (avatar !== undefined) { updates.push('avatar=?'); params.push(avatar || null); }
    if (updates.length === 0) return res.status(400).json({ error: 'Tidak ada field untuk diupdate' });
    params.push(req.params.id);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id=?`, params);
    res.json({ message: 'Profil berhasil diperbarui' });
  } catch (err) { sendError(res, err); }
});

// DELETE user (admin)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ message: 'User berhasil dihapus' });
  } catch (err) { sendError(res, err); }
});

// PUT reset password (admin only)
router.put('/:id/reset-password', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter' });
    }
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query('UPDATE users SET password=? WHERE id=?', [hashed, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User tidak ditemukan' });
    res.json({ message: 'Password berhasil direset' });
  } catch (err) { sendError(res, err); }
});

module.exports = router;
