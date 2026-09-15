# LABORA — Discover Amazing Places

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/lostghos1/labora-web)

An interactive map application for discovering and sharing locations across
the Saxony–Czech border region, with a real Node.js backend, an
admin-only editing/deletion system, custom categories, dark/light mode, and
encrypted data at rest.

## Structure

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


## Encryption

Every location's **name, description, latitude, and longitude** are encrypted
with **AES-256-GCM** before being written to the database, and only decrypted
in memory when the server builds an API response.
The admin code is **hashed** with bcrypt, not encrypted.
