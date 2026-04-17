const QRCode = require('qrcode');
const { encrypt } = require('./crypto');

/**
 * Generate an encrypted QR code for a registration
 * @param {Object} data - { userId, eventId, registrationId, timestamp }
 * @returns {Object} - { qrCode: base64 PNG, qrData: encrypted string }
 */
async function generateQR(data) {
    // Create the data payload
    const payload = JSON.stringify({
        uid: data.userId,
        eid: data.eventId,
        rid: data.registrationId,
        ts: data.timestamp || Date.now()
    });

    // Encrypt the payload
    const encryptedData = encrypt(payload);

    // Generate QR code as base64 PNG
    const qrCode = await QRCode.toDataURL(encryptedData, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.95,
        margin: 2,
        color: {
            dark: '#1a1a2e',
            light: '#ffffff'
        },
        width: 400
    });

    return {
        qrCode,      // base64 data URL for display
        qrData: encryptedData  // encrypted string stored in DB
    };
}

module.exports = { generateQR };
