/* ═══════════════════════════════════════════════════
   MARONITE LEAGUE ID CARD GENERATOR — FRONTEND
   ═══════════════════════════════════════════════════ */

// ─── STATE ──────────────────────────────────────
let authToken = null;
let currentRole = null;
let currentPhotoData = null;

// ─── DOM ELEMENTS ───────────────────────────────
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('login-form');
const passwordInput = document.getElementById('password-input');
const loginError = document.getElementById('login-error');
const roleBadge = document.getElementById('role-badge');
const logoutBtn = document.getElementById('logout-btn');
const adminTab = document.getElementById('admin-tab');
const tabsNav = document.getElementById('tabs-nav');

const idForm = document.getElementById('id-form');
const firstNameInput = document.getElementById('first-name');
const lastNameInput = document.getElementById('last-name');
const photoUpload = document.getElementById('photo-upload');
const photoUploadArea = document.getElementById('photo-upload-area');
const photoPreview = document.getElementById('photo-preview');
const photoPlaceholder = document.getElementById('photo-placeholder');
const cardPreviewArea = document.getElementById('card-preview-area');
const frontCanvas = document.getElementById('front-card-canvas');
const backCanvas = document.getElementById('back-card-canvas');
const newCardBtn = document.getElementById('new-card-btn');
const downloadBtn = document.getElementById('download-btn');

const exportBtn = document.getElementById('export-btn');
const membersTbody = document.getElementById('members-tbody');
const noMembers = document.getElementById('no-members');

// ─── AUTH ───────────────────────────────────────
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');

  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: passwordInput.value })
    });

    if (!res.ok) {
      loginError.classList.remove('hidden');
      return;
    }

    const data = await res.json();
    authToken = data.token;
    currentRole = data.role;

    // Store in sessionStorage for page refreshes
    sessionStorage.setItem('authToken', authToken);
    sessionStorage.setItem('currentRole', currentRole);

    showApp();
  } catch (err) {
    loginError.classList.remove('hidden');
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await fetch('/api/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
  } catch (e) { /* ignore */ }

  authToken = null;
  currentRole = null;
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('currentRole');

  appScreen.classList.remove('active');
  loginScreen.classList.add('active');
  passwordInput.value = '';
  resetForm();
});

function showApp() {
  loginScreen.classList.remove('active');
  appScreen.classList.add('active');

  // Set role badge
  if (currentRole === 'admin') {
    roleBadge.textContent = 'Admin';
    roleBadge.className = 'badge badge-admin';
    adminTab.style.display = 'flex';
  } else {
    roleBadge.textContent = 'Generator';
    roleBadge.className = 'badge badge-generator';
    adminTab.style.display = 'none';
  }

  // Show generator tab by default
  switchTab('generator');
}

// Check for existing session on load
(function checkSession() {
  const savedToken = sessionStorage.getItem('authToken');
  const savedRole = sessionStorage.getItem('currentRole');
  if (savedToken && savedRole) {
    authToken = savedToken;
    currentRole = savedRole;
    showApp();
  }
})();

// ─── TABS ───────────────────────────────────────
tabsNav.addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  switchTab(tab.dataset.tab);
});

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');

  // Update panels
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`${tabName}-panel`).classList.add('active');

  // Load admin data when switching to admin tab
  if (tabName === 'admin') {
    loadMembers();
  }
}

// ─── PHOTO UPLOAD ───────────────────────────────
photoUploadArea.addEventListener('click', () => {
  photoUpload.click();
});

photoUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    currentPhotoData = event.target.result;
    photoPreview.src = currentPhotoData;
    photoPreview.classList.remove('hidden');
    photoPlaceholder.classList.add('hidden');
  };
  reader.readAsDataURL(file);
});

// ─── CARD GENERATION ────────────────────────────
idForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();

  if (!firstName || !lastName) {
    alert('Please enter both first and last name.');
    return;
  }

  if (!currentPhotoData) {
    alert('Please upload a photo.');
    return;
  }

  const generateBtn = document.getElementById('generate-btn');
  generateBtn.disabled = true;
  generateBtn.querySelector('span').textContent = 'Generating...';

  try {
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        photo_data: currentPhotoData
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to generate card');
    }

    const member = await res.json();

    // Draw both cards on canvas (crisp image rendering)
    await renderFrontCard(frontCanvas, {
      photoSrc: currentPhotoData,
      name: `${member.first_name} ${member.last_name}`,
      idNumber: member.id_number
    });
    await renderBackCard(backCanvas);

    // Show card preview
    cardPreviewArea.classList.remove('hidden');
    cardPreviewArea.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    alert(err.message);
  } finally {
    generateBtn.disabled = false;
    generateBtn.querySelector('span').textContent = 'Generate ID Card';
  }
});

// ─── NEW CARD ───────────────────────────────────
newCardBtn.addEventListener('click', () => {
  resetForm();
});

function resetForm() {
  idForm.reset();
  currentPhotoData = null;
  photoPreview.src = '';
  photoPreview.classList.add('hidden');
  photoPlaceholder.classList.remove('hidden');
  cardPreviewArea.classList.add('hidden');
}

// ─── ADMIN: LOAD MEMBERS ────────────────────────
async function loadMembers() {
  try {
    const res = await fetch('/api/members', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!res.ok) throw new Error('Failed to load');

    const members = await res.json();
    membersTbody.innerHTML = '';

    if (members.length === 0) {
      noMembers.classList.remove('hidden');
      return;
    }

    noMembers.classList.add('hidden');

    members.forEach((member, index) => {
      const tr = document.createElement('tr');
      const date = new Date(member.created_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${escapeHtml(member.first_name)}</td>
        <td>${escapeHtml(member.last_name)}</td>
        <td><strong>NB: ${escapeHtml(member.id_number)}</strong></td>
        <td>${date}</td>
        <td><button class="btn-delete" data-id="${member.id}" title="Remove member">✕</button></td>
      `;
      membersTbody.appendChild(tr);
    });

    // Attach delete handlers
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        const name = e.target.closest('tr').children[1].textContent + ' ' + e.target.closest('tr').children[2].textContent;
        if (!confirm(`Remove ${name} from the list?`)) return;
        try {
          const res = await fetch(`/api/members/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          if (!res.ok) throw new Error('Delete failed');
          loadMembers();
        } catch (err) {
          alert('Failed to remove member: ' + err.message);
        }
      });
    });
  } catch (err) {
    console.error('Error loading members:', err);
  }
}

// ─── ADMIN: EXPORT EXCEL ────────────────────────
exportBtn.addEventListener('click', async () => {
  try {
    exportBtn.disabled = true;
    exportBtn.querySelector('span')?.textContent && (exportBtn.querySelector('svg').style.display = 'none');

    const res = await fetch('/api/export', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!res.ok) throw new Error('Failed to export');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'maronite_members.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert('Failed to export data: ' + err.message);
  } finally {
    exportBtn.disabled = false;
    const svg = exportBtn.querySelector('svg');
    if (svg) svg.style.display = '';
  }
});

// ─── ADMIN: ASSET UPLOAD ────────────────────────
const logoUpload = document.getElementById('logo-upload');
const qrUpload = document.getElementById('qr-upload');

if (logoUpload) {
  logoUpload.addEventListener('change', (e) => uploadAsset(e.target.files[0], 'logo'));
}
if (qrUpload) {
  qrUpload.addEventListener('change', (e) => uploadAsset(e.target.files[0], 'qr-code'));
}

async function uploadAsset(file, type) {
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`/api/upload/${type}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: formData
    });

    if (!res.ok) throw new Error('Upload failed');

    const data = await res.json();
    alert(`${type === 'logo' ? 'Logo' : 'QR Code'} uploaded successfully! Refreshing...`);

    // Update preview images
    const timestamp = Date.now();
    if (type === 'logo') {
      document.getElementById('logo-preview').src = `assets/logo.png?t=${timestamp}`;
      // Update all logo references on page
      document.querySelectorAll('img[src*="logo"]').forEach(img => {
        img.src = `assets/logo.png?t=${timestamp}`;
        img.style.display = '';
      });
    } else {
      document.getElementById('qr-preview').src = `assets/qr-code.png?t=${timestamp}`;
      document.querySelectorAll('img[src*="qr-code"]').forEach(img => {
        img.src = `assets/qr-code.png?t=${timestamp}`;
      });
    }
  } catch (err) {
    alert('Failed to upload: ' + err.message);
  }
}

// ─── ADMIN: IMPORT EXCEL ─────────────────────────
const importFile = document.getElementById('import-file');
const importBtn = document.getElementById('import-btn');
const importFilename = document.getElementById('import-filename');
const importResults = document.getElementById('import-results');

if (importFile) {
  importFile.addEventListener('change', () => {
    if (importFile.files[0]) {
      importFilename.textContent = importFile.files[0].name;
      importBtn.disabled = false;
    } else {
      importFilename.textContent = 'No file selected';
      importBtn.disabled = true;
    }
  });
}

if (importBtn) {
  importBtn.addEventListener('click', async () => {
    const file = importFile.files[0];
    if (!file) return;

    importBtn.disabled = true;
    importBtn.textContent = 'Importing...';
    importResults.textContent = '';

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Import failed');
      }

      const data = await res.json();
      importResults.textContent = `Done! ${data.imported} imported, ${data.skipped} skipped (duplicate IDs).`;
      importResults.style.color = 'var(--success, green)';

      // Reset file input
      importFile.value = '';
      importFilename.textContent = 'No file selected';

      // Refresh member list
      loadMembers();
    } catch (err) {
      importResults.textContent = 'Error: ' + err.message;
      importResults.style.color = 'var(--danger, red)';
    } finally {
      importBtn.disabled = false;
      importBtn.textContent = 'Import Excel';
    }
  });
}

// ─── DOWNLOAD CARDS AS IMAGES ───────────────────
downloadBtn.addEventListener('click', () => {
  downloadCanvas(frontCanvas, 'id-card-front.png');
  setTimeout(() => downloadCanvas(backCanvas, 'id-card-back.png'), 300);
});

// ─── UTILITIES ──────────────────────────────────
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
