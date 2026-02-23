/* ═══════════════════════════════════════════════════
   CANVAS CARD RENDERER — Canva Template Version
   ═══════════════════════════════════════════════════ */

const FRONT_CONFIG = {
  photo: {
    centerX: 24,
    centerY: 35,
    radius: 23,       // bigger
    ringColor: '#c9a84c',
    ringWidth: 1.5,   // % of card height
  },
  name: {
    x: 50,
    y: 68,
    fontSize: 3.2,
    color: '#c9a84c',
  },
  idNumber: {
    x: 50,
    y: 79,
    fontSize: 3.2,
    color: '#c9a84c',
    letterSpacing: 3,
  }
};

// ─── HELPERS ────────────────────────────────────

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawCircleImage(ctx, img, cx, cy, radius) {
  if (!img) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  const aspect = img.width / img.height;
  let dw, dh, dx, dy;
  if (aspect > 1) {
    dh = radius * 2;
    dw = dh * aspect;
    dx = cx - dw / 2;
    dy = cy - radius;
  } else {
    dw = radius * 2;
    dh = dw / aspect;
    dx = cx - radius;
    dy = cy - dh / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}


// ═══════════════════════════════════════════════════
//  FRONT CARD
// ═══════════════════════════════════════════════════

async function renderFrontCard(canvas, { photoSrc, name, idNumber }) {
  const ctx = canvas.getContext('2d');
  await document.fonts.ready;

  const template = await loadImage('assets/card-front-template.png?' + Date.now());
  if (!template) {
    canvas.width = 680; canvas.height = 428;
    ctx.fillStyle = '#cc0000';
    ctx.font = '20px sans-serif';
    ctx.fillText('Error: card-front-template.png not found', 20, 40);
    return;
  }

  canvas.width = template.width;
  canvas.height = template.height;
  const W = canvas.width;
  const H = canvas.height;

  // 1. Draw Canva template
  ctx.drawImage(template, 0, 0);

  // 2. Member photo with gold ring
  const photo = photoSrc ? await loadImage(photoSrc) : null;
  const p = FRONT_CONFIG.photo;
  const cx = W * p.centerX / 100;
  const cy = H * p.centerY / 100;
  const r = H * p.radius / 100;
  const ringW = H * p.ringWidth / 100;

  if (photo) {
    drawCircleImage(ctx, photo, cx, cy, r);
  }

  // Gold ring around photo
  ctx.beginPath();
  ctx.arc(cx, cy, r + ringW / 2, 0, Math.PI * 2);
  ctx.strokeStyle = p.ringColor;
  ctx.lineWidth = ringW;
  ctx.stroke();

  // 3. Member name — gold, Helvetica bold
  const n = FRONT_CONFIG.name;
  const nameSize = Math.round(H * n.fontSize / 100);
  ctx.font = `bold ${nameSize}px "Helvetica World", Helvetica, Arial, sans-serif`;
  ctx.fillStyle = n.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(name, W * n.x / 100, H * n.y / 100);

  // 4. "ID: 12345" — gold, Helvetica bold, centered between lines
  const id = FRONT_CONFIG.idNumber;
  const idSize = Math.round(H * id.fontSize / 100);
  ctx.font = `bold ${idSize}px "Helvetica World", Helvetica, Arial, sans-serif`;
  ctx.fillStyle = id.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const idText = 'ID: ' + idNumber.toString();

  // Draw with letter-spacing, centered
  let totalW = 0;
  for (const ch of idText) totalW += ctx.measureText(ch).width + id.letterSpacing;
  totalW -= id.letterSpacing;

  let dx = (W * id.x / 100) - totalW / 2;
  const idY = H * id.y / 100;
  for (const ch of idText) {
    ctx.fillText(ch, dx + ctx.measureText(ch).width / 2, idY);
    dx += ctx.measureText(ch).width + id.letterSpacing;
  }

  return canvas;
}


// ═══════════════════════════════════════════════════
//  BACK CARD — template only
// ═══════════════════════════════════════════════════

async function renderBackCard(canvas) {
  const ctx = canvas.getContext('2d');

  const template = await loadImage('assets/card-back-template.png?' + Date.now());
  if (!template) {
    canvas.width = 680; canvas.height = 428;
    ctx.fillStyle = '#cc0000';
    ctx.font = '20px sans-serif';
    ctx.fillText('Error: card-back-template.png not found', 20, 40);
    return;
  }

  canvas.width = template.width;
  canvas.height = template.height;
  ctx.drawImage(template, 0, 0);
  return canvas;
}


// ═══════════════════════════════════════════════════
//  DOWNLOAD
// ═══════════════════════════════════════════════════

function downloadCanvas(canvas, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  link.remove();
}
