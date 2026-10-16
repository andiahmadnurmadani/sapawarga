const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { sendError } = require('../middleware/errorHelper');
const router = express.Router();

// ===== IURAN CONFIG =====

// GET config — public (warga butuh untuk lihat info pembayaran)
router.get('/config', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM iuran_config WHERE id = 1');
    if (rows.length === 0) {
      return res.json({
        amountPerMonth: 0,
        bankName: '',
        bankAccountNumber: '',
        bankAccountHolder: '',
        qrisImageUrl: '',
        notes: '',
      });
    }
    const r = rows[0];
    res.json({
      amountPerMonth: parseFloat(r.amount_per_month) || 0,
      bankName: r.bank_name || '',
      bankAccountNumber: r.bank_account_number || '',
      bankAccountHolder: r.bank_account_holder || '',
      qrisImageUrl: r.qris_image_url || '',
      notes: r.notes || '',
      updatedAt: r.updated_at,
    });
  } catch (err) { sendError(res, err); }
});

// PUT config (admin only)
router.put('/config', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { amountPerMonth, bankName, bankAccountNumber, bankAccountHolder, qrisImageUrl, notes } = req.body;
    const amount = parseFloat(amountPerMonth) || 0;
    if (amount < 0) return res.status(400).json({ error: 'Nominal tidak boleh negatif' });
    await db.query(
      `INSERT INTO iuran_config (id, amount_per_month, bank_name, bank_account_number, bank_account_holder, qris_image_url, notes)
       VALUES (1, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       amount_per_month=?, bank_name=?, bank_account_number=?, bank_account_holder=?, qris_image_url=?, notes=?`,
      [amount, bankName || null, bankAccountNumber || null, bankAccountHolder || null, qrisImageUrl || null, notes || null,
       amount, bankName || null, bankAccountNumber || null, bankAccountHolder || null, qrisImageUrl || null, notes || null]
    );
    res.json({ message: 'Pengaturan iuran berhasil disimpan' });
  } catch (err) { sendError(res, err); }
});

// ===== IURAN PAYMENTS =====

// Helper: build months array dari period
function buildMonthsArray(periodType, startMonth, endMonth) {
  const months = [];
  if (periodType === 'YEAR') {
    for (let m = 1; m <= 12; m++) months.push(m);
  } else if (periodType === 'PERIOD') {
    const start = Math.max(1, Math.min(12, parseInt(startMonth)));
    const end = Math.max(1, Math.min(12, parseInt(endMonth)));
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    for (let m = lo; m <= hi; m++) months.push(m);
  } else {
    months.push(parseInt(startMonth));
  }
  return months;
}

// POST — warga submit pembayaran
router.post('/payments', authMiddleware, async (req, res) => {
  try {
    const { periodType, year, startMonth, endMonth, months: monthsInput, proofUrl, notes } = req.body;

    if (!['MONTH', 'PERIOD', 'YEAR'].includes(periodType)) {
      return res.status(400).json({ error: 'Tipe periode tidak valid' });
    }
    const yr = parseInt(year);
    if (!yr || yr < 2000 || yr > 2100) {
      return res.status(400).json({ error: 'Tahun tidak valid' });
    }
    if (!proofUrl) {
      return res.status(400).json({ error: 'Bukti pembayaran wajib diupload' });
    }

    // Pakai months eksplisit kalau diberikan, kalau tidak generate dari range
    let months;
    if (Array.isArray(monthsInput) && monthsInput.length > 0) {
      months = [...new Set(monthsInput.map(m => parseInt(m)).filter(m => m >= 1 && m <= 12))].sort((a, b) => a - b);
    } else {
      months = buildMonthsArray(periodType, startMonth, endMonth);
    }
    if (months.length === 0) return res.status(400).json({ error: 'Minimal 1 bulan harus dipilih' });
    if (months.some(m => m < 1 || m > 12)) return res.status(400).json({ error: 'Bulan tidak valid' });

    const sMonth = months[0];
    const eMonth = months[months.length - 1];

    // Cek duplikasi: bulan yg sudah PENDING/APPROVED tidak bisa diajukan ulang
    const [existing] = await db.query(
      `SELECT id, months_json, status FROM iuran_payments
       WHERE user_id=? AND year=? AND status IN ('PENDING','APPROVED')`,
      [req.user.id, yr]
    );
    const lockedMonths = new Set();
    for (const row of existing) {
      try {
        const mArr = typeof row.months_json === 'string' ? JSON.parse(row.months_json) : row.months_json;
        if (Array.isArray(mArr)) mArr.forEach(m => lockedMonths.add(m));
      } catch {}
    }
    const overlap = months.filter(m => lockedMonths.has(m));
    if (overlap.length > 0) {
      return res.status(409).json({ error: `Bulan ${overlap.join(', ')} sudah pernah diajukan / disetujui untuk tahun ${yr}` });
    }

    // Ambil nominal per bulan dari config
    const [cfgRows] = await db.query('SELECT amount_per_month FROM iuran_config WHERE id = 1');
    const amount = cfgRows.length > 0 ? parseFloat(cfgRows[0].amount_per_month) || 0 : 0;
    if (amount <= 0) return res.status(400).json({ error: 'Admin belum mengatur nominal iuran' });

    const total = amount * months.length;
    const id = uuidv4();
    const [userRows] = await db.query('SELECT name FROM users WHERE id=?', [req.user.id]);
    const userName = userRows[0]?.name || '';

    await db.query(
      `INSERT INTO iuran_payments (id, user_id, user_name, period_type, year, start_month, end_month, months_json, amount_per_month, total_amount, proof_url, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [id, req.user.id, userName, periodType, yr, sMonth, eMonth, JSON.stringify(months), amount, total, proofUrl, notes || null]
    );

    // Notif ke semua admin
    const [admins] = await db.query('SELECT id FROM users WHERE role = "ADMIN"');
    for (const admin of admins) {
      await db.query(
        `INSERT INTO notifications (id, user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, 'SYSTEM', ?)`,
        [uuidv4(), admin.id, 'Pembayaran Iuran Baru', `${userName} mengajukan pembayaran iuran (Rp ${total.toLocaleString('id-ID')})`, id]
      );
    }

    res.status(201).json({ id, total, months, message: 'Pembayaran berhasil diajukan' });
  } catch (err) { sendError(res, err); }
});

// GET — admin lihat semua pembayaran, warga lihat miliknya
router.get('/payments', authMiddleware, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'ADMIN') {
      [rows] = await db.query(
        `SELECT p.*, u.avatar AS user_avatar FROM iuran_payments p
         LEFT JOIN users u ON p.user_id = u.id
         ORDER BY p.created_at DESC`
      );
    } else {
      [rows] = await db.query(
        `SELECT p.*, u.avatar AS user_avatar FROM iuran_payments p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.user_id = ?
         ORDER BY p.created_at DESC`,
        [req.user.id]
      );
    }
    res.json(rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      userAvatar: r.user_avatar || null,
      periodType: r.period_type,
      year: r.year,
      startMonth: r.start_month,
      endMonth: r.end_month,
      months: typeof r.months_json === 'string' ? JSON.parse(r.months_json) : r.months_json,
      amountPerMonth: parseFloat(r.amount_per_month),
      totalAmount: parseFloat(r.total_amount),
      proofUrl: r.proof_url,
      notes: r.notes,
      status: r.status,
      rejectionReason: r.rejection_reason,
      approvedBy: r.approved_by,
      approvedAt: r.approved_at,
      createdAt: r.created_at,
    })));
  } catch (err) { sendError(res, err); }
});

// PUT — approve / reject (admin only)
router.put('/payments/:id/status', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return res.status(400).json({ error: 'Status tidak valid' });
    }
    const [rows] = await db.query('SELECT user_id, total_amount FROM iuran_payments WHERE id=?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Pembayaran tidak ditemukan' });

    if (status === 'APPROVED') {
      await db.query(
        'UPDATE iuran_payments SET status=?, rejection_reason=NULL, approved_by=?, approved_at=NOW() WHERE id=?',
        [status, req.user.id, req.params.id]
      );
    } else if (status === 'REJECTED') {
      await db.query(
        'UPDATE iuran_payments SET status=?, rejection_reason=? WHERE id=?',
        [status, rejectionReason || null, req.params.id]
      );
    } else {
      await db.query(
        'UPDATE iuran_payments SET status=?, rejection_reason=NULL, approved_by=NULL, approved_at=NULL WHERE id=?',
        [status, req.params.id]
      );
    }

    // Notif ke warga
    const label = status === 'APPROVED' ? 'disetujui' : status === 'REJECTED' ? 'ditolak' : 'menunggu';
    await db.query(
      `INSERT INTO notifications (id, user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, 'SYSTEM', ?)`,
      [uuidv4(), rows[0].user_id, 'Status Pembayaran Iuran', `Pembayaran iuran Anda ${label}`, req.params.id]
    );

    res.json({ message: 'Status berhasil diupdate' });
  } catch (err) { sendError(res, err); }
});

// DELETE — admin atau pemilik (kalau masih PENDING)
router.delete('/payments/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT user_id, status FROM iuran_payments WHERE id=?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Tidak ditemukan' });
    if (req.user.role !== 'ADMIN') {
      if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Tidak berwenang' });
      if (rows[0].status !== 'PENDING') return res.status(400).json({ error: 'Hanya pembayaran pending yang bisa dibatalkan' });
    }
    await db.query('DELETE FROM iuran_payments WHERE id=?', [req.params.id]);
    res.json({ message: 'Pembayaran berhasil dihapus' });
  } catch (err) { sendError(res, err); }
});

// GET — summary / matrix per tahun (admin only)
// Return: { totalApproved, byUser: [{ userId, userName, paidMonths: [1,2,...], total }] }
router.get('/summary', authMiddleware, adminOnly, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const [users] = await db.query(
      `SELECT id, name, avatar FROM users WHERE role='WARGA' ORDER BY name ASC`
    );
    const [payments] = await db.query(
      `SELECT user_id, months_json, total_amount, status FROM iuran_payments WHERE year=? AND status='APPROVED'`,
      [year]
    );
    const userMap = {};
    users.forEach(u => {
      userMap[u.id] = {
        userId: u.id, userName: u.name, userAvatar: u.avatar,
        paidMonths: [], total: 0,
      };
    });
    let totalApproved = 0;
    payments.forEach(p => {
      let months = [];
      try {
        months = typeof p.months_json === 'string' ? JSON.parse(p.months_json) : p.months_json;
      } catch {}
      const u = userMap[p.user_id];
      if (u && Array.isArray(months)) {
        months.forEach(m => { if (!u.paidMonths.includes(m)) u.paidMonths.push(m); });
        u.total += parseFloat(p.total_amount) || 0;
      }
      totalApproved += parseFloat(p.total_amount) || 0;
    });
    Object.values(userMap).forEach(u => u.paidMonths.sort((a, b) => a - b));
    res.json({
      year,
      totalApproved,
      byUser: Object.values(userMap),
    });
  } catch (err) { sendError(res, err); }
});

module.exports = router;
