# LABORA — Discover Amazing Places

An interactive map application for discovering and sharing locations across
the Saxony–Czech border region, with a real Node.js backend, an
admin-only editing/deletion system, custom categories, dark/light mode, and
encrypted data at rest.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/YOUR-USERNAME/labora-web)

**Replace `YOUR-USERNAME` in the button link above** (in this file) with your
actual GitHub username once you've pushed the repo, so the button points at
your copy. See "Deploying" below for what happens when you click it.

## What's inside

- **Frontend**: plain HTML, CSS, and JavaScript (no framework, no build step),
  using [Leaflet.js](https://leafletjs.com/) + OpenStreetMap tiles for a real
  map centered on the Saxony–Czech border region.
- **Backend**: Node.js + Express REST API.
- **Database**: SQLite via Node's built-in `node:sqlite` module — no native
  compilation, no build tools, works the same on Windows/Mac/Linux/hosting.
  Requires **Node.js 22.13+**.
- **Auth**: a single admin code (bcrypt-hashed), matching the original app's
  "Admin Access" flow, with JWT sessions.
- **Encryption**: location data is encrypted at rest — see "Encryption" below.

## Features

- **View mode** — browse pins on a real map, grouped into expandable
  categories with live counts, and a search box that filters locations
  within each category as you type.
- **Add mode** — anyone can click the map to drop a new pin. Name and
  location are required; description, a 1–5 star rating, a terrain
  difficulty level, and a photo are all optional and can be set by whoever
  creates the pin.
- **Location Details panel** — clicking any pin opens a slide-over panel
  with the photo (if any), category, coordinates, "Navigate Here" / "View
  in Maps" links (open Google Maps in a new tab), the rating and difficulty
  (only shown if set), the description, when it was added, and a public
  comments section anyone can post to.
- **Admin mode** — unlocked with an admin code. From here you can:
  - Expand any category (same as View mode) to see and manage the
    locations inside it directly, or delete the category itself
  - Click a location (from the sidebar or the map) to open the same
    Location Details panel with Edit and Delete buttons — editing turns
    the panel into a form in place, so you can change just one field
    without deleting and recreating the pin
  - Add new categories — this control only exists in Admin mode, never in
    the public View/Add sidebars
  - Delete spam comments from any location's details panel
  - Deleting a category with locations in it moves them to "Others"
    instead of deleting them
- **Dark / light mode** — a small slider switch in the header; remembered
  per device.
- **Language switcher** — English, Čeština, Deutsch (core navigation and
  sidebar text; the newer Location Details panel and comments are
  currently English-only).
- **No emoji** — icons throughout are simple single-color line icons
  rather than colorful emoji glyphs.
- **Responsive layout** — the sidebar collapses behind a toggle on narrow
  screens, the header wraps, and the details panel goes full-width on
  mobile.

## Encryption

Every location's **name, description, latitude, and longitude** are encrypted
with **AES-256-GCM** before being written to the database, and only decrypted
in memory when the server builds an API response. If you open the raw
`db/labora.db` file directly, that data is unreadable ciphertext.

The admin code is **hashed** with bcrypt, not encrypted. This is intentional
and is the correct approach: hashing is one-way, so not even the server
itself can recover the original code — encrypting it (reversibly) would
actually be *less* secure. Category icon/color/id are stored in plain text
since they're non-sensitive display metadata, but category labels are
encrypted along with everything else.

**Important:** the encryption key (`ENCRYPTION_KEY` in `.env`) must stay the
same for the life of your database. If you lose it or change it, existing
encrypted rows can no longer be decrypted. Back it up somewhere safe (a
password manager, for instance) — not just in `.env` on one machine.

## Getting started (local)

```bash
npm install
cp .env.example .env
```

Open `.env` and fill in three things before your first run:

```
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
ENCRYPTION_KEY=<run the same command again — needs its own 64-character value>
ADMIN_CODE=<a code of your choosing, 6+ characters>
```

Then:

```bash
npm start
```

Open **http://localhost:3000**. The console will print your seeded admin
code once, on the very first run only — after that, the database remembers
it, so changing `.env` later won't change an already-created admin code
(change it from inside the Admin panel instead, or delete `db/labora.db` to
start fresh).

## Project structure

```
labora-web/
├── server.js                 # Express app entry point
├── render.yaml                # One-click Render deploy config
├── db/
│   ├── database.js           # SQLite schema, seeding
│   └── crypto.js             # AES-256-GCM field encryption
├── middleware/
│   └── auth.js                # JWT verification middleware
├── routes/
│   ├── locations.js           # GET/POST public, PUT/DELETE admin-only
│   ├── categories.js          # GET public, POST/DELETE admin-only
│   └── admin.js                # login, session check, change code
└── public/                    # static frontend
    ├── index.html
    ├── css/styles.css
    └── js/app.js
```

## API reference

| Method | Endpoint | Auth | Description |
|--------|----------|:--:|-------------|
| GET | `/api/locations` | No | List all locations (decrypted) |
| GET | `/api/locations/:id` | No | Get one location |
| POST | `/api/locations` | No | Create a location. `description`, `rating` (1-5), `difficulty`, `photo` (data URL) are all optional |
| PUT | `/api/locations/:id` | **Admin** | Edit a location (partial updates supported) |
| DELETE | `/api/locations/:id` | **Admin** | Delete a location and its comments |
| GET | `/api/categories` | No | List categories with live counts |
| POST | `/api/categories` | **Admin** | Create a category `{label, icon, color}` — `icon` must be one of the preset keys (ball, droplet, image, music, food, pin, star, tree, building, camera) |
| DELETE | `/api/categories/:id` | **Admin** | Delete a category (reassigns its locations to "others") |
| GET | `/api/locations/:id/comments` | No | List comments on a location |
| POST | `/api/locations/:id/comments` | No | Add a comment `{name, comment}` (comment max 500 chars) |
| DELETE | `/api/comments/:id` | **Admin** | Delete a comment (moderation) |
| POST | `/api/admin/login` | No | `{code}` → returns a JWT |
| GET | `/api/admin/me` | **Admin** | Verify current session |
| POST | `/api/admin/change-code` | **Admin** | `{currentCode, newCode}` |

Admin-only endpoints expect `Authorization: Bearer <token>` from `/api/admin/login`.

## Deploying

**A GitHub repository link by itself cannot run a server** — GitHub only
hosts your code. To make the app live at a URL anyone can open, the code
needs to run on a host that executes Node.js. This project is set up for
**Render**, which is close to one-click from GitHub:

1. Push this repo to GitHub (see below).
2. In `README.md`, replace `YOUR-USERNAME` in the Deploy button link with
   your GitHub username, commit, and push that change.
3. Click the **Deploy to Render** button (or go to Render → New → Blueprint
   → pick your repo). Render reads `render.yaml` automatically and sets up:
   - A free Node web service
   - A **persistent disk** mounted at the database's folder, so your data
     survives restarts and redeploys (plain free-tier web services usually
     wipe the filesystem on every deploy — this disk avoids that)
   - `JWT_SECRET` generated automatically
4. Render will prompt you to fill in `ENCRYPTION_KEY` and `ADMIN_CODE` during
   setup (they're marked `sync: false` in `render.yaml` specifically so
   Render asks you for them rather than guessing). Generate the encryption
   key the same way as local setup.
5. Deploy. You'll get a URL like `https://labora-web.onrender.com` — that's
   the link you can share with everyone.

Free hosting tiers change their terms fairly often, so double-check Render's
current free-tier limits (things like sleep-after-inactivity) before relying
on this for anything important.

## Pushing to GitHub

```bash
git init
git add .
git commit -m "Initial commit: LABORA"
git remote add origin https://github.com/YOUR-USERNAME/labora-web.git
git branch -M main
git push -u origin main
```

Your `.gitignore` already excludes `node_modules/`, `.env`, and the database
file — you don't want your `ENCRYPTION_KEY`, `JWT_SECRET`, admin code, or
actual (even encrypted) data committed to a public repo.

## Notes on matching the original app's look

This was rebuilt to match the screenshots of the original app as closely as
possible: dark theme by default, the same header layout (brand + language
selector + View/Add/Admin toggle + quick-add + location count), the same
sidebar structure per mode, the same category list with icons and counts,
and the same "Admin Access" modal with a single code field. The exact
partner-logo images in the footer are replaced with text badges, since the
originals are third-party trademarked assets.
