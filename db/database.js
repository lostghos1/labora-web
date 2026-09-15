const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');
const { encryptField, decryptField } = require('./crypto');

const rawDb = new DatabaseSync(path.join(__dirname, 'labora.db'));
rawDb.exec('PRAGMA journal_mode = WAL;');

// ---------- Schema ----------
// name/description/lat/lng are stored ENCRYPTED (AES-256-GCM) — see db/crypto.js.
// Admin credentials are stored HASHED (bcrypt), not encrypted: hashing is the
// correct, industry-standard approach for passwords because it's one-way —
// even the server itself never needs (or is able) to recover the plaintext.
rawDb.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    label_enc TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_enc TEXT NOT NULL,
    description_enc TEXT,
    lat_enc TEXT NOT NULL,
    lng_enc TEXT NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id),
    rating_enc TEXT,
    difficulty_enc TEXT,
    photo_enc TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name_enc TEXT NOT NULL,
    comment_enc TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

const db = {
  prepare(sql) {
    const stmt = rawDb.prepare(sql);
    return {
      run: (...args) => stmt.run(...args),
      get: (...args) => stmt.get(...args),
      all: (...args) => stmt.all(...args),
    };
  },
  exec(sql) {
    return rawDb.exec(sql);
  },
};

// ---------- Seed default admin code (only if none exists) ----------
const adminCount = db.prepare('SELECT COUNT(*) AS c FROM admins').get().c;
if (adminCount === 0) {
  const defaultCode = process.env.ADMIN_CODE || 'changeme123';
  const hash = bcrypt.hashSync(defaultCode, 10);
  db.prepare('INSERT INTO admins (code_hash) VALUES (?)').run(hash);
  console.log(`Seeded default admin code -> "${defaultCode}"`);
  console.log('IMPORTANT: change this in your .env before first run, or via the admin panel after logging in.');
}

// ---------- Seed default categories (only if table is empty) ----------
const catCount = db.prepare('SELECT COUNT(*) AS c FROM categories').get().c;
if (catCount === 0) {
  const seedCat = db.prepare(`
    INSERT INTO categories (id, label_enc, icon, color, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `);
  const defaults = [
    { id: 'sports', label: 'Sports', icon: 'ball',    color: '#3B82F6', order: 1 },
    { id: 'water',  label: 'Water',  icon: 'droplet', color: '#0EA5E9', order: 2 },
    { id: 'views',  label: 'Views',  icon: 'image',   color: '#22D3EE', order: 3 },
    { id: 'music',  label: 'Music',  icon: 'music',   color: '#8B5CF6', order: 4 },
    { id: 'food',   label: 'Food',   icon: 'food',    color: '#F43F5E', order: 5 },
    { id: 'others', label: 'Others', icon: 'pin',     color: '#EC4899', order: 6 },
  ];
  for (const c of defaults) {
    seedCat.run(c.id, encryptField(c.label), c.icon, c.color, c.order);
  }
}

// ---------- Seed example locations (only if table is empty) ----------
const locCount = db.prepare('SELECT COUNT(*) AS c FROM locations').get().c;
if (locCount === 0) {
  const seedLoc = db.prepare(`
    INSERT INTO locations (name_enc, description_enc, lat_enc, lng_enc, category_id, rating_enc, difficulty_enc)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const examples = [
    { name: 'Dresden Frauenkirche', description: 'Iconic rebuilt baroque church in the heart of Dresden.', category: 'views', lat: 51.0509, lng: 13.7442, rating: 5, difficulty: 'very_easy' },
    { name: 'Bastei Bridge', description: 'Dramatic sandstone rock formations with a stone bridge, Saxon Switzerland.', category: 'water', lat: 50.9721, lng: 14.0973, rating: 4, difficulty: 'moderate' },
    { name: 'Chomutov Castle', description: 'Historic castle grounds on the Czech side of the border.', category: 'others', lat: 50.4606, lng: 13.4178, rating: null, difficulty: null },
    { name: 'Ore Mountains Trail', description: 'Popular hiking and biking route along the border ridge.', category: 'sports', lat: 50.6500, lng: 13.1667, rating: 4, difficulty: 'hard' },
    { name: 'Chomutov Zoo Cafe', description: 'Local snacks and coffee near the zoo entrance.', category: 'food', lat: 50.4550, lng: 13.4100, rating: 3, difficulty: 'very_easy' },
  ];
  for (const r of examples) {
    seedLoc.run(
      encryptField(r.name),
      encryptField(r.description),
      encryptField(r.lat),
      encryptField(r.lng),
      r.category,
      r.rating !== null ? encryptField(r.rating) : null,
      r.difficulty !== null ? encryptField(r.difficulty) : null
    );
  }
}

module.exports = { db, encryptField, decryptField };
