/* ═══════════════════════════════════════════════════
   MARONITE LEAGUE ID CARD GENERATOR — FRONTEND
   ═══════════════════════════════════════════════════ */

// ─── STATE ──────────────────────────────────────
let authToken = null;
let currentRole = null;
let currentPhotoData = null;

// ─── TOAST NOTIFICATIONS ────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;

  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };

  toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3500);
}

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

  if (currentRole === 'admin') {
    roleBadge.textContent = 'Admin';
    roleBadge.className = 'badge badge-admin';
    // Admin: hide tabs, go straight to admin panel
    tabsNav.style.display = 'none';
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('admin-panel').classList.add('active');
    loadMembers();
  } else {
    roleBadge.textContent = 'Generator';
    roleBadge.className = 'badge badge-generator';
    tabsNav.style.display = 'flex';
    adminTab.style.display = 'none';
    switchTab('generator');
  }
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
    showToast('Please enter both first and last name.', 'error');
    return;
  }

  if (!currentPhotoData) {
    showToast('Please upload a photo.', 'error');
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
    showToast(err.message, 'error');
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
      const photoCell = member.photo_data
        ? `<img src="${member.photo_data}" class="photo-thumb" alt="Photo">`
        : '<svg class="photo-missing" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d00" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${escapeHtml(member.first_name)}</td>
        <td>${escapeHtml(member.last_name)}</td>
        <td><strong>NB: ${escapeHtml(member.id_number)}</strong></td>
        <td>${photoCell}</td>
        <td>${date}</td>
        <td>
          <div class="actions-cell">
            <button class="action-btn btn-upload-photo" data-id="${member.id}" data-tooltip="Upload photo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </button>
            <button class="action-btn btn-download-card" data-id="${member.id}" data-tooltip="Download card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <button class="action-btn action-btn--danger btn-delete" data-id="${member.id}" data-tooltip="Delete member">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
            <input type="file" class="photo-file-input" data-id="${member.id}" accept="image/*" hidden>
          </div>
        </td>
      `;
      membersTbody.appendChild(tr);
    });

    // Attach upload photo handlers
    document.querySelectorAll('.btn-upload-photo').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        document.querySelector(`.photo-file-input[data-id="${id}"]`).click();
      });
    });

    document.querySelectorAll('.photo-file-input').forEach(input => {
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const id = e.target.dataset.id;

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const res = await fetch(`/api/members/${id}/photo`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
              },
              body: JSON.stringify({ photo_data: event.target.result })
            });
            if (!res.ok) throw new Error('Upload failed');
            showToast('Photo uploaded successfully!', 'success');
            loadMembers();
          } catch (err) {
            showToast('Failed to upload photo: ' + err.message, 'error');
          }
        };
        reader.readAsDataURL(file);
      });
    });

    // Attach download card handlers
    document.querySelectorAll('.btn-download-card').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        btn.disabled = true;
        btn.style.opacity = '0.5';

        try {
          const res = await fetch(`/api/members/${id}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          if (!res.ok) throw new Error('Failed to load member');
          const member = await res.json();

          const frontC = document.createElement('canvas');
          const backC = document.createElement('canvas');

          await renderFrontCard(frontC, {
            photoSrc: member.photo_data || null,
            name: `${member.first_name} ${member.last_name}`,
            idNumber: member.id_number
          });
          await renderBackCard(backC);

          const filename = `${member.first_name}-${member.last_name}`.toLowerCase();
          downloadCombinedCard(frontC, backC, `${filename}-card.png`);
        } catch (err) {
          showToast('Failed to download card: ' + err.message, 'error');
        } finally {
          btn.disabled = false;
          btn.style.opacity = '';
        }
      });
    });

    // Attach delete handlers
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const name = btn.closest('tr').children[1].textContent + ' ' + btn.closest('tr').children[2].textContent;
        if (!confirm(`Remove ${name} from the list?`)) return;
        try {
          const res = await fetch(`/api/members/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          if (!res.ok) throw new Error('Delete failed');
          showToast(`${name} removed`, 'success');
          loadMembers();
        } catch (err) {
          showToast('Failed to remove member: ' + err.message, 'error');
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
    showToast('Failed to export data: ' + err.message, 'error');
  } finally {
    exportBtn.disabled = false;
    const svg = exportBtn.querySelector('svg');
    if (svg) svg.style.display = '';
  }
});

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
      importResults.textContent = `${data.imported} imported, ${data.skipped} skipped (duplicate IDs).`;
      showToast(`Imported ${data.imported} members successfully!`, 'success');

      // Reset file input
      importFile.value = '';
      importFilename.textContent = 'No file selected';

      // Refresh member list
      loadMembers();
    } catch (err) {
      importResults.textContent = '';
      showToast('Import failed: ' + err.message, 'error');
    } finally {
      importBtn.disabled = false;
      importBtn.textContent = 'Import Excel';
    }
  });
}

// ─── ADMIN: ADD MEMBER ──────────────────────────
const addMemberSection = document.getElementById('add-member-section');
const showAddMemberBtn = document.getElementById('show-add-member-btn');
const cancelAddMember = document.getElementById('cancel-add-member');
const addMemberForm = document.getElementById('add-member-form');
const addMemberPhoto = document.getElementById('add-member-photo');
const addMemberPhotoName = document.getElementById('add-member-photo-name');
let addMemberPhotoData = null;

if (showAddMemberBtn) {
  showAddMemberBtn.addEventListener('click', () => {
    addMemberSection.style.display = 'block';
    showAddMemberBtn.style.display = 'none';
  });
}

if (cancelAddMember) {
  cancelAddMember.addEventListener('click', () => {
    addMemberSection.style.display = 'none';
    showAddMemberBtn.style.display = '';
    addMemberForm.reset();
    addMemberPhotoData = null;
    addMemberPhotoName.textContent = 'No photo selected';
  });
}

if (addMemberPhoto) {
  addMemberPhoto.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      addMemberPhotoName.textContent = file.name;
      const reader = new FileReader();
      reader.onload = (event) => { addMemberPhotoData = event.target.result; };
      reader.readAsDataURL(file);
    } else {
      addMemberPhotoName.textContent = 'No photo selected';
      addMemberPhotoData = null;
    }
  });
}

if (addMemberForm) {
  addMemberForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = document.getElementById('add-first-name').value.trim();
    const lastName = document.getElementById('add-last-name').value.trim();

    if (!firstName || !lastName) {
      showToast('Please enter both first and last name.', 'error');
      return;
    }

    const btn = document.getElementById('add-member-btn');
    btn.disabled = true;

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
          photo_data: addMemberPhotoData
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add member');
      }

      showToast(`${firstName} ${lastName} added successfully!`, 'success');
      addMemberForm.reset();
      addMemberPhotoData = null;
      addMemberPhotoName.textContent = 'No photo selected';
      addMemberSection.style.display = 'none';
      showAddMemberBtn.style.display = '';
      loadMembers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });
}

// ─── DOWNLOAD CARDS AS IMAGES ───────────────────
function downloadCombinedCard(frontC, backC, filename) {
  const gap = 20;
  const combined = document.createElement('canvas');
  combined.width = frontC.width + gap + backC.width;
  combined.height = Math.max(frontC.height, backC.height);
  const ctx = combined.getContext('2d');
  ctx.drawImage(frontC, 0, 0);
  ctx.drawImage(backC, frontC.width + gap, 0);
  downloadCanvas(combined, filename);
}

downloadBtn.addEventListener('click', () => {
  downloadCombinedCard(frontCanvas, backCanvas, 'id-card.png');
});

// ─── UTILITIES ──────────────────────────────────
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
