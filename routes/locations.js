const express = require('express');
const { db, encryptField, decryptField } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const DIFFICULTIES = ['very_easy', 'easy', 'moderate', 'hard', 'very_hard'];
const MAX_PHOTO_CHARS = 900000; // ~650KB decoded — client compresses before upload, this is a safety net

function toPublic(row) {
  return {
    id: row.id,
    name: decryptField(row.name_enc),
    description: row.description_enc ? decryptField(row.description_enc) : '',
    lat: parseFloat(decryptField(row.lat_enc)),
    lng: parseFloat(decryptField(row.lng_enc)),
    category: row.category_id,
    rating: row.rating_enc ? parseInt(decryptField(row.rating_enc), 10) : null,
    difficulty: row.difficulty_enc ? decryptField(row.difficulty_enc) : null,
    photo: row.photo_enc ? decryptField(row.photo_enc) : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function categoryExists(id) {
  return !!db.prepare('SELECT id FROM categories WHERE id = ?').get(id);
}

function validateInput(body, { partial = false } = {}) {
  const errors = [];
  if (!partial || body.name !== undefined) {
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) errors.push('Name is required.');
  }
  if (!partial || body.lat !== undefined) {
    if (typeof body.lat !== 'number' || body.lat < -90 || body.lat > 90) errors.push('lat must be a number between -90 and 90.');
  }
  if (!partial || body.lng !== undefined) {
    if (typeof body.lng !== 'number' || body.lng < -180 || body.lng > 180) errors.push('lng must be a number between -180 and 180.');
  }
  if (body.category !== undefined && !categoryExists(body.category)) {
    errors.push(`Unknown category "${body.category}".`);
  }
  if (body.rating !== undefined && body.rating !== null) {
    if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
      errors.push('rating must be a whole number between 1 and 5, or null.');
    }
  }
  if (body.difficulty !== undefined && body.difficulty !== null) {
    if (!DIFFICULTIES.includes(body.difficulty)) {
      errors.push(`difficulty must be one of: ${DIFFICULTIES.join(', ')}, or null.`);
    }
  }
  if (body.photo !== undefined && body.photo !== null) {
    if (typeof body.photo !== 'string' || !body.photo.startsWith('data:image/')) {
      errors.push('photo must be a data:image/... URL, or null.');
    } else if (body.photo.length > MAX_PHOTO_CHARS) {
      errors.push('photo is too large — please use a smaller image.');
    }
  }
  return errors;
}

// GET /api/locations — public
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM locations ORDER BY created_at DESC').all();
  res.json(rows.map(toPublic));
});

// GET /api/locations/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Location not found.' });
  res.json(toPublic(row));
});

// POST /api/locations — public: anyone can contribute a pin. rating,
// difficulty, and photo are all optional and can be set by the creator.
router.post('/', (req, res) => {
  const errors = validateInput(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  const { name, description = '', category = 'others', lat, lng, rating = null, difficulty = null, photo = null } = req.body;

  const info = db.prepare(`
    INSERT INTO locations (name_enc, description_enc, lat_enc, lng_enc, category_id, rating_enc, difficulty_enc, photo_enc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    encryptField(name.trim()),
    description.trim() ? encryptField(description.trim()) : null,
    encryptField(lat),
    encryptField(lng),
    category,
    rating !== null ? encryptField(rating) : null,
    difficulty !== null ? encryptField(difficulty) : null,
    photo !== null ? encryptField(photo) : null
  );

  const created = db.prepare('SELECT * FROM locations WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(toPublic(created));
});

// PUT /api/locations/:id — admin only. Supports partial updates so a single
// field can be changed without resending the whole location.
router.put('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Location not found.' });

  const errors = validateInput(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  const current = toPublic(existing);
  const merged = {
    name: req.body.name !== undefined ? req.body.name.trim() : current.name,
    description: req.body.description !== undefined ? req.body.description.trim() : current.description,
    category: req.body.category !== undefined ? req.body.category : current.category,
    lat: req.body.lat !== undefined ? req.body.lat : current.lat,
    lng: req.body.lng !== undefined ? req.body.lng : current.lng,
    rating: req.body.rating !== undefined ? req.body.rating : current.rating,
    difficulty: req.body.difficulty !== undefined ? req.body.difficulty : current.difficulty,
    photo: req.body.photo !== undefined ? req.body.photo : current.photo,
  };

  db.prepare(`
    UPDATE locations
    SET name_enc = ?, description_enc = ?, lat_enc = ?, lng_enc = ?, category_id = ?,
        rating_enc = ?, difficulty_enc = ?, photo_enc = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    encryptField(merged.name),
    merged.description ? encryptField(merged.description) : null,
    encryptField(merged.lat),
    encryptField(merged.lng),
    merged.category,
    merged.rating !== null && merged.rating !== undefined ? encryptField(merged.rating) : null,
    merged.difficulty ? encryptField(merged.difficulty) : null,
    merged.photo ? encryptField(merged.photo) : null,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
  res.json(toPublic(updated));
});

// DELETE /api/locations/:id — admin only
router.delete('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Location not found.' });

  db.prepare('DELETE FROM comments WHERE location_id = ?').run(req.params.id);
  db.prepare('DELETE FROM locations WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
