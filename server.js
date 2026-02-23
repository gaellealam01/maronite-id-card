const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const fs = require('fs');
const ExcelJS = require('exceljs');
const multer = require('multer');
const db = require('./database');

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const assetsDir = path.join(__dirname, 'public', 'assets');
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
    cb(null, assetsDir);
  },
  filename: (req, file, cb) => {
    // Always save as .png to match HTML references
    const type = req.params.type; // 'logo' or 'qr-code'
    cb(null, type + '.png');
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Separate multer for Excel import (stores file in memory, not on disk)
const memoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const app = express();
const PORT = process.env.PORT || 3000;

// Passwords from environment
const GENERATOR_PASSWORD = process.env.GENERATOR_PASSWORD || 'maronite2024';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2024';

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Deterministic token auth (works across serverless instances)
const crypto = require('crypto');

function makeToken(password, role) {
  return crypto.createHash('sha256').update(role + ':' + password).digest('hex').slice(0, 32);
}

// Pre-compute valid tokens so every serverless instance knows them
const ADMIN_TOKEN = makeToken(ADMIN_PASSWORD, 'admin');
const GENERATOR_TOKEN = makeToken(GENERATOR_PASSWORD, 'generator');

function authMiddleware(requiredRole) {
  return (req, res, next) => {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    let role = null;
    if (token === ADMIN_TOKEN) role = 'admin';
    else if (token === GENERATOR_TOKEN) role = 'generator';

    if (!role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (requiredRole && role !== requiredRole && role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    req.role = role;
    next();
  };
}

// ─── AUTH ─────────────────────────────────────────────
app.post('/api/auth', (req, res) => {
  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    return res.json({ role: 'admin', token: ADMIN_TOKEN });
  }

  if (password === GENERATOR_PASSWORD) {
    return res.json({ role: 'generator', token: GENERATOR_TOKEN });
  }

  return res.status(401).json({ error: 'Invalid password' });
});

app.post('/api/logout', (req, res) => {
  res.json({ success: true });
});

// ─── MEMBERS ──────────────────────────────────────────
app.post('/api/members', authMiddleware('generator'), (req, res) => {
  try {
    const { first_name, last_name, photo_data } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    const member = db.createMember(first_name, last_name, photo_data || null);
    res.json(member);
  } catch (err) {
    console.error('Error creating member:', err);
    res.status(500).json({ error: 'Failed to create member' });
  }
});

app.get('/api/members', authMiddleware('admin'), (req, res) => {
  try {
    const members = db.getAllMembers();
    res.json(members);
  } catch (err) {
    console.error('Error fetching members:', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// ─── GET SINGLE MEMBER ───────────────────────────────────
app.get('/api/members/:id', authMiddleware('generator'), (req, res) => {
  try {
    const member = db.getMemberById(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json(member);
  } catch (err) {
    console.error('Error fetching member:', err);
    res.status(500).json({ error: 'Failed to fetch member' });
  }
});

// ─── UPDATE MEMBER PHOTO ─────────────────────────────────
app.put('/api/members/:id/photo', authMiddleware('admin'), (req, res) => {
  try {
    const { photo_data } = req.body;
    if (!photo_data) {
      return res.status(400).json({ error: 'Photo data is required' });
    }
    db.updateMemberPhoto(req.params.id, photo_data);
    const member = db.getMemberById(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json(member);
  } catch (err) {
    console.error('Error updating member photo:', err);
    res.status(500).json({ error: 'Failed to update photo' });
  }
});

// ─── DELETE MEMBER ────────────────────────────────────────
app.delete('/api/members/:id', authMiddleware('admin'), (req, res) => {
  try {
    db.deleteMember(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting member:', err);
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

// ─── EXCEL EXPORT ─────────────────────────────────────
app.get('/api/export', authMiddleware('admin'), async (req, res) => {
  try {
    const members = db.getAllMembersForExport();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Maronite League ID System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Members');

    // Define columns
    worksheet.columns = [
      { header: 'First Name', key: 'first_name', width: 20 },
      { header: 'Last Name', key: 'last_name', width: 20 },
      { header: 'ID Number', key: 'id_number', width: 15 },
      { header: 'Date Created', key: 'created_at', width: 25 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0A1A3A' }
    };
    worksheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };

    // Add data rows
    members.forEach(member => {
      worksheet.addRow({
        first_name: member.first_name,
        last_name: member.last_name,
        id_number: member.id_number,
        created_at: member.created_at
      });
    });

    // Set response headers for download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=maronite_members.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error exporting:', err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// ─── EXCEL IMPORT (admin only) ────────────────────────
app.post('/api/import', authMiddleware('admin'), memoryUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return res.status(400).json({ error: 'No worksheet found in the file' });
    }

    let imported = 0;
    let skipped = 0;
    const errors = [];

    worksheet.eachRow((row, rowNumber) => {
      // Skip header row
      if (rowNumber === 1) return;

      const firstName = String(row.getCell(1).value || '').trim();
      const lastName = String(row.getCell(2).value || '').trim();
      const idNumber = String(row.getCell(3).value || '').trim();

      if (!firstName || !lastName || !idNumber) {
        errors.push(`Row ${rowNumber}: missing data`);
        return;
      }

      try {
        db.createMemberWithId(firstName, lastName, idNumber);
        imported++;
      } catch (err) {
        skipped++;
      }
    });

    res.json({ imported, skipped, errors });
  } catch (err) {
    console.error('Error importing Excel:', err);
    res.status(500).json({ error: 'Failed to import file' });
  }
});

// ─── ASSET UPLOAD (admin only) ────────────────────────
app.post('/api/upload/:type', authMiddleware('admin'), upload.single('file'), async (req, res) => {
  const validTypes = ['logo', 'qr-code'];
  if (!validTypes.includes(req.params.type)) {
    return res.status(400).json({ error: 'Invalid asset type' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // If uploading logo, try to run the background removal script
  if (req.params.type === 'logo') {
    const inputPath = req.file.path;
    const outputPath = path.join(__dirname, 'public', 'assets', 'logo.png');
    try {
      const { execSync } = require('child_process');
      execSync(`python3 "${path.join(__dirname, 'process-logo.py')}" "${inputPath}" "${outputPath}"`, {
        timeout: 15000
      });
      console.log('Logo processed: white background removed');
    } catch (err) {
      console.log('Logo processing skipped (using original):', err.message);
      // File is already saved as logo.png by multer, so nothing else needed
    }
  }

  res.json({ success: true, filename: req.file.filename, path: `/assets/${req.file.filename}` });
});

// ─── START SERVER ─────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Maronite ID Generator running at http://localhost:${PORT}`);
  console.log(`Generator password: ${GENERATOR_PASSWORD}`);
  console.log(`Admin password: ${ADMIN_PASSWORD}`);
});

// Export for Vercel serverless
module.exports = app;
