const express = require('express');
const { db, encryptField, decryptField } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function toPublic(row) {
  return {
    id: row.id,
    location_id: row.location_id,
    name: decryptField(row.name_enc),
    comment: decryptField(row.comment_enc),
    created_at: row.created_at,
  };
}

// GET /api/locations/:id/comments — public
router.get('/locations/:id/comments', (req, res) => {
  const location = db.prepare('SELECT id FROM locations WHERE id = ?').get(req.params.id);
  if (!location) return res.status(404).json({ error: 'Location not found.' });

  const rows = db.prepare('SELECT * FROM comments WHERE location_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json(rows.map(toPublic));
});

// POST /api/locations/:id/comments — public: anyone can leave a comment
router.post('/locations/:id/comments', (req, res) => {
  const location = db.prepare('SELECT id FROM locations WHERE id = ?').get(req.params.id);
  if (!location) return res.status(404).json({ error: 'Location not found.' });

  const { name, comment } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Your name is required.' });
  if (name.trim().length > 60) return res.status(400).json({ error: 'Name must be 60 characters or fewer.' });
  if (!comment || !comment.trim()) return res.status(400).json({ error: 'Comment text is required.' });
  if (comment.trim().length > 500) return res.status(400).json({ error: 'Comment must be 500 characters or fewer.' });

  const info = db.prepare(`
    INSERT INTO comments (location_id, name_enc, comment_enc)
    VALUES (?, ?, ?)
  `).run(req.params.id, encryptField(name.trim()), encryptField(comment.trim()));

  const created = db.prepare('SELECT * FROM comments WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(toPublic(created));
});

// DELETE /api/comments/:id — admin only (moderation)
router.delete('/comments/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Comment not found.' });

  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
