const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db/database');
const { requireAdmin, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/admin/login — body: { code }
// Matches the original app's single "Admin Code" field rather than a
// username+password pair.
router.post('/login', (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Admin code is required.' });

  const admins = db.prepare('SELECT * FROM admins').all();
  const match = admins.find(a => bcrypt.compareSync(code, a.code_hash));

  if (!match) return res.status(401).json({ error: 'Invalid admin code.' });

  const token = jwt.sign({ id: match.id }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// GET /api/admin/me — verify a token is still valid
router.get('/me', requireAdmin, (req, res) => {
  res.json({ ok: true });
});

// POST /api/admin/change-code — change the admin code
router.post('/change-code', requireAdmin, (req, res) => {
  const { currentCode, newCode } = req.body;
  if (!currentCode || !newCode) return res.status(400).json({ error: 'Current and new code are required.' });
  if (newCode.length < 6) return res.status(400).json({ error: 'New code must be at least 6 characters.' });

  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.admin.id);
  if (!bcrypt.compareSync(currentCode, admin.code_hash)) {
    return res.status(401).json({ error: 'Current code is incorrect.' });
  }

  const newHash = bcrypt.hashSync(newCode, 10);
  db.prepare('UPDATE admins SET code_hash = ? WHERE id = ?').run(newHash, admin.id);
  res.json({ success: true });
});

module.exports = router;
