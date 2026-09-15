const express = require('express');
const { db, encryptField, decryptField } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function toPublic(row) {
  return {
    id: row.id,
    label: decryptField(row.label_enc),
    icon: row.icon,
    color: row.color,
    sort_order: row.sort_order,
  };
}

function slugify(label) {
  return String(label)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

// GET /api/categories — public, with a live count of locations in each
router.get('/', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, created_at ASC').all();
  const counts = db.prepare('SELECT category_id, COUNT(*) AS c FROM locations GROUP BY category_id').all();
  const countMap = Object.fromEntries(counts.map(c => [c.category_id, c.c]));

  const result = categories.map(cat => ({
    ...toPublic(cat),
    count: countMap[cat.id] || 0,
  }));
  res.json(result);
});

const ICON_KEYS = ['ball', 'droplet', 'image', 'music', 'food', 'pin', 'star', 'tree', 'building', 'camera'];

// POST /api/categories — admin only
router.post('/', requireAdmin, (req, res) => {
  const { label, icon, color } = req.body;
  if (!label || !label.trim()) return res.status(400).json({ error: 'Category label is required.' });
  if (!icon || !ICON_KEYS.includes(icon)) return res.status(400).json({ error: `Icon must be one of: ${ICON_KEYS.join(', ')}.` });
  if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) return res.status(400).json({ error: 'Category color must be a hex value like #3B82F6.' });

  const id = slugify(label);
  if (!id) return res.status(400).json({ error: 'Could not derive a valid id from that label.' });

  const existing = db.prepare('SELECT id FROM categories WHERE id = ?').get(id);
  if (existing) return res.status(409).json({ error: 'A category with a matching id already exists.' });

  const maxOrder = db.prepare('SELECT MAX(sort_order) AS m FROM categories').get().m || 0;

  db.prepare(`
    INSERT INTO categories (id, label_enc, icon, color, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, encryptField(label.trim()), icon, color, maxOrder + 1);

  const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  res.status(201).json({ ...toPublic(created), count: 0 });
});

// DELETE /api/categories/:id — admin only. Locations already using this
// category are moved to "others" (created by default and treated as the
// fallback bucket) rather than deleted.
router.delete('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  if (id === 'others') return res.status(400).json({ error: 'The "Others" category cannot be deleted.' });

  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Category not found.' });

  db.prepare('UPDATE locations SET category_id = ? WHERE category_id = ?').run('others', id);
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  res.json({ success: true });
});

module.exports = router;
