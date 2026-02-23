const QRCode = require('qrcode');
const path = require('path');

const assetsDir = path.join(__dirname, 'public', 'assets');

// Generate QR code for the website
async function generateQR() {
  const qrPath = path.join(assetsDir, 'qr-code.png');
  await QRCode.toFile(qrPath, 'https://www.maronite-league.org', {
    width: 200,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });
  console.log('QR code saved to:', qrPath);
}

generateQR().catch(console.error);
