const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, nik, noKK, alamat, noHp, tempatLahir, tglLahir, jenisKelamin, agama, statusPernikahan, pekerjaan } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Email, password, dan nama wajib diisi' });

    // Validasi input
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Format email tidak valid' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter' });
    }
    if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100) {
      return res.status(400).json({ error: 'Nama harus 2-100 karakter' });
    }
    if (nik && (typeof nik !== 'string' || !/^\d{16}$/.test(nik))) {
      return res.status(400).json({ error: 'NIK harus 16 digit angka' });
    }
    if (noKK && (typeof noKK !== 'string' || !/^\d{16}$/.test(noKK))) {
      return res.status(400).json({ error: 'Nomor KK harus 16 digit angka' });
    }

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(409).json({ error: 'Email sudah terdaftar' });

    if (nik) {
      const [existingNik] = await db.query('SELECT id FROM users WHERE nik = ?', [nik]);
      if (existingNik.length > 0) return res.status(409).json({ error: 'NIK sudah terdaftar' });
    }

    const hash = await bcrypt.hash(password, 12);
    const id = uuidv4();
    await db.query(
      `INSERT INTO users (id, email, password, name, role, nik, no_kk, alamat, no_hp, tempat_lahir, tgl_lahir, jenis_kelamin, agama, status_pernikahan, pekerjaan) VALUES (?, ?, ?, ?, 'WARGA', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, email.trim().toLowerCase(), hash, name.trim(), nik || null, noKK || null, alamat || null, noHp || null, tempatLahir || null, tglLahir || null, jenisKelamin || null, agama || null, statusPernikahan || null, pekerjaan || null]
    );

    const token = jwt.sign({ id, email: email.trim().toLowerCase(), role: 'WARGA' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    const user = { id, email: email.trim().toLowerCase(), name: name.trim(), role: 'WARGA', nik, noKK, alamat, noHp, tempatLahir, tglLahir, jenisKelamin, agama, statusPernikahan, pekerjaan };
    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' });
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Format input tidak valid' });
    }

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (rows.length === 0) return res.status(401).json({ error: 'Email atau password salah' });

    const u = rows[0];
    const match = await bcrypt.compare(password, u.password);
    if (!match) return res.status(401).json({ error: 'Email atau password salah' });

    const token = jwt.sign({ id: u.id, email: u.email, role: u.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    const user = { id: u.id, email: u.email, name: u.name, role: u.role, nik: u.nik, noKK: u.no_kk, alamat: u.alamat, noHp: u.no_hp, tempatLahir: u.tempat_lahir, tglLahir: u.tgl_lahir, jenisKelamin: u.jenis_kelamin, agama: u.agama, statusPernikahan: u.status_pernikahan, pekerjaan: u.pekerjaan, avatar: u.avatar };
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User tidak ditemukan' });
    const u = rows[0];
    res.json({ id: u.id, email: u.email, name: u.name, role: u.role, nik: u.nik, noKK: u.no_kk, alamat: u.alamat, noHp: u.no_hp, tempatLahir: u.tempat_lahir, tglLahir: u.tgl_lahir, jenisKelamin: u.jenis_kelamin, agama: u.agama, statusPernikahan: u.status_pernikahan, pekerjaan: u.pekerjaan, avatar: u.avatar });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, alamat, noHp, tempatLahir, tglLahir, jenisKelamin, agama, statusPernikahan, pekerjaan, avatar } = req.body;
    await db.query(
      `UPDATE users SET name=?, alamat=?, no_hp=?, tempat_lahir=?, tgl_lahir=?, jenis_kelamin=?, agama=?, status_pernikahan=?, pekerjaan=?, avatar=? WHERE id=?`,
      [name, alamat, noHp, tempatLahir, tglLahir, jenisKelamin, agama, statusPernikahan, pekerjaan, avatar, req.user.id]
    );
    res.json({ message: 'Profil berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
