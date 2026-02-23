# Maronite League ID Card Generator — Project Knowledge

## Overview

A web application for generating and managing membership ID cards for **الرابطة المارونية (Maronite League)**. Members get a front-and-back ID card with their photo, name, unique 5-digit ID number, and organization branding. Admins can manage members and export data to Excel.

---

## Developer Context

- **Skill level:** Beginner (first coding project)
- **Preference:** Simple, beginner-friendly explanations — avoid jargon or explain it in plain English

---

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Backend     | Node.js + Express 5                 |
| Database    | SQLite via `better-sqlite3`         |
| Frontend    | Vanilla HTML / CSS / JS (single-page app) |
| File Upload | `multer` (photos & assets)          |
| Excel Export| `exceljs`                           |
| QR Code     | `qrcode` (generates QR PNG)         |
| Image Processing | `canvas` (Node), Pillow/PIL (Python, for logo background removal) |
| Environment | `dotenv` for secrets                |

---

## Project Structure

```
maronite-id-app/
├── server.js            # Express server — all API routes
├── database.js          # SQLite setup + member CRUD functions
├── .env                 # Passwords and port (DO NOT commit)
├── package.json         # Dependencies & scripts
├── generate-assets.js   # Utility: generates QR code PNG
├── process-logo.py      # Utility: removes white background from logo
├── maronite.db          # SQLite database file (auto-created)
├── CLAUDE.md            # Instructions for AI assistants
├── KNOWLEDGE.md         # This file
└── public/              # Static frontend (served by Express)
    ├── index.html       # Single-page app — login, generator, admin
    ├── script.js        # All frontend logic
    ├── styles.css       # All styles (including ID card design + print)
    └── assets/
        ├── logo.png     # Organization logo
        └── qr-code.png  # QR code linking to maronite-league.org
```

---

## How to Run

```bash
npm install       # Install dependencies (first time only)
npm start         # Starts server at http://localhost:3000
```

The server prints the passwords to the console on startup.

---

## Authentication

Token-based auth stored in memory (resets on server restart).

| Role       | Password (from .env) | Can Do                                      |
|------------|----------------------|----------------------------------------------|
| Generator  | `GENERATOR_PASSWORD` | Create members + generate ID cards            |
| Admin      | `ADMIN_PASSWORD`     | Everything generator can do + view all members, delete members, export Excel, upload assets |

Tokens are created on login, stored in a `Map()`, and sent as `Authorization: Bearer <token>` headers.

---

## Database Schema

**Table: `members`**

| Column       | Type     | Notes                          |
|-------------|----------|--------------------------------|
| id          | INTEGER  | Auto-increment primary key     |
| first_name  | TEXT     | Required                       |
| last_name   | TEXT     | Required                       |
| id_number   | TEXT     | Unique random 5-digit number   |
| photo_data  | TEXT     | Base64-encoded photo (data URI)|
| created_at  | DATETIME | Auto-set on creation           |

- WAL mode enabled for better performance
- ID numbers are random 5-digit strings (10000–99999), guaranteed unique

---

## API Endpoints

| Method | Endpoint               | Auth        | Description                       |
|--------|------------------------|-------------|-----------------------------------|
| POST   | `/api/auth`            | None        | Login — returns `{ role, token }` |
| POST   | `/api/logout`          | Any         | Invalidates token                 |
| POST   | `/api/members`         | Generator+  | Create member, returns member data|
| GET    | `/api/members`         | Admin       | List all members                  |
| DELETE | `/api/members/:id`     | Admin       | Delete a member                   |
| GET    | `/api/export`          | Admin       | Download members as .xlsx         |
| POST   | `/api/upload/:type`    | Admin       | Upload logo or qr-code PNG        |

**Upload types:** `logo` or `qr-code` — files are saved to `public/assets/` as `logo.png` or `qr-code.png`. Logo uploads automatically attempt white-background removal via `process-logo.py`.

---

## Frontend Architecture

The app is a **single-page app** with three views, all in `index.html`:

1. **Login Screen** (`#login-screen`) — password entry
2. **Generator Tab** (`#generator-panel`) — form for name + photo → generates and displays front/back ID card
3. **Admin Tab** (`#admin-panel`) — members table, Excel export, asset uploads (only visible to admin role)

### ID Card Design

- **Front:** Navy blue background with gold accents — shows org name (Arabic + English), member photo (circular frame), name, role ("عضو" = member), and 5-digit ID number. Logo watermark on right side.
- **Back:** White background — shows Instagram handle, website, Facebook page, QR code, and app download badges (iOS/Android).
- **Card dimensions:** 340×214px on screen, 85.6×53.98mm when printed (standard credit card size).

### Key Frontend Behaviors

- Photos are base64-encoded client-side and sent in the POST body
- Session persists via `sessionStorage` (survives page refresh, not tab close)
- Print stylesheet hides everything except the ID cards
- Asset uploads (logo/QR) refresh all image references with cache-busting `?t=timestamp`

---

## Design System

### Colors
- **Navy:** `#0a1a3a` (primary dark)
- **Gold:** `#c9a84c` (accent, borders, highlights)
- **Gold light:** `#e0c975` / **Gold dark:** `#a88a30`

### Fonts
- **Arabic text:** Amiri (serif)
- **Display/headings:** Playfair Display (serif)
- **Body/UI:** Inter (sans-serif)

### Card Visual Elements
- Gold gradient borders with ornate corner decorations
- Circular photo frame with gold ring and shadow
- Diamond divider ornament between header and body
- Subtle diagonal crosshatch pattern on front card background

---

## Utility Scripts

### `generate-assets.js`
Generates a QR code PNG pointing to `https://www.maronite-league.org`. Run with:
```bash
node generate-assets.js
```

### `process-logo.py`
Removes white background from a circular logo image. Requires Python 3 + Pillow:
```bash
pip3 install Pillow
python3 process-logo.py input.png output.png
```
Called automatically by the server when a logo is uploaded via the admin panel.

---

## Known Limitations & Notes

- Auth tokens are **in-memory only** — all sessions are lost when the server restarts
- Photos are stored as **base64 in the database** — large photos will bloat the DB
- No input validation for photo size on the backend (frontend accepts any image)
- No HTTPS — intended for local/internal use
- No pagination on the members table
- The app assumes `python3` and `Pillow` are installed for logo processing (fails gracefully if not)
- Express 5 is used (not the more common Express 4)

---

## Common Tasks

### Add a new field to member records
1. Add column in `database.js` (`db.exec` migration)
2. Update `createMember()` and query functions in `database.js`
3. Update `POST /api/members` in `server.js` to accept the new field
4. Update the form in `index.html`
5. Update `script.js` to send the new field
6. Update the card HTML/CSS if it should appear on the card
7. Update the Excel export columns in `server.js`

### Change card design
- Card HTML structure is in `index.html` (look for `front-card` and `back-card` divs)
- Card styles are in `styles.css` (look for the "ID CARD DESIGN" section)
- Print styles are at the bottom of `styles.css` under `@media print`

### Change passwords
- Edit `.env` file — change `GENERATOR_PASSWORD` and/or `ADMIN_PASSWORD`
- Restart the server

### Reset the database
- Delete `maronite.db`, `maronite.db-shm`, and `maronite.db-wal`
- Restart the server (tables are auto-created)
