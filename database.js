const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'maronite.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Create members table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    id_number TEXT UNIQUE NOT NULL,
    photo_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

/**
 * Generate a unique random 5-digit ID number
 */
function generateUniqueId() {
  const existing = new Set(
    db.prepare('SELECT id_number FROM members').all().map(r => r.id_number)
  );
  let id;
  do {
    id = String(Math.floor(10000 + Math.random() * 90000));
  } while (existing.has(id));
  return id;
}

/**
 * Create a new member and return the created record
 */
function createMember(firstName, lastName, photoData) {
  const idNumber = generateUniqueId();
  const stmt = db.prepare(`
    INSERT INTO members (first_name, last_name, id_number, photo_data)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(firstName, lastName, idNumber, photoData);
  return {
    id: result.lastInsertRowid,
    first_name: firstName,
    last_name: lastName,
    id_number: idNumber,
    photo_data: photoData,
    created_at: new Date().toISOString()
  };
}

/**
 * Get all members (for admin view)
 */
function getAllMembers() {
  return db.prepare('SELECT id, first_name, last_name, id_number, created_at FROM members ORDER BY created_at DESC').all();
}

/**
 * Get all members with photo data (for export)
 */
function getAllMembersForExport() {
  return db.prepare('SELECT first_name, last_name, id_number, created_at FROM members ORDER BY created_at DESC').all();
}

/**
 * Create a member with a specific ID number (for Excel import)
 * Throws an error if the ID number already exists
 */
function createMemberWithId(firstName, lastName, idNumber, photoData) {
  const existing = db.prepare('SELECT id FROM members WHERE id_number = ?').get(idNumber);
  if (existing) {
    throw new Error(`ID number ${idNumber} already exists`);
  }
  const stmt = db.prepare(`
    INSERT INTO members (first_name, last_name, id_number, photo_data)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(firstName, lastName, idNumber, photoData || null);
}

/**
 * Delete a member by ID
 */
function deleteMember(id) {
  return db.prepare('DELETE FROM members WHERE id = ?').run(id);
}

module.exports = {
  createMember,
  createMemberWithId,
  getAllMembers,
  getAllMembersForExport,
  deleteMember,
  generateUniqueId
};
