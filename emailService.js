const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    // Only create transporter if SMTP is configured
    if (!host || !user || !pass || user === 'your-email@gmail.com') {
        console.log('⚠️  Email not configured. Skipping email functionality.');
        return null;
    }

    transporter = nodemailer.createTransport({
        host: host,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: { user, pass }
    });

    return transporter;
}

/**
 * Send registration confirmation email with QR code
 */
async function sendRegistrationConfirmation(userEmail, userName, eventTitle, eventDate, qrCodeBase64) {
    const transport = getTransporter();
    if (!transport) {
        console.log('📧 Email skipped (SMTP not configured) - Registration confirmation for', userName);
        return false;
    }

    try {
        // Extract base64 data from data URL
        const base64Data = qrCodeBase64.replace(/^data:image\/png;base64,/, '');

        await transport.sendMail({
            from: `"ColEvent" <${process.env.SMTP_USER}>`,
            to: userEmail,
            subject: `🎟️ Registration Confirmed - ${eventTitle}`,
            html: `
                <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
                    <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Registration Confirmed!</h1>
                    </div>
                    <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <p style="color: #374151; font-size: 16px;">Hi <strong>${userName}</strong>,</p>
                        <p style="color: #6b7280;">You've successfully registered for:</p>
                        <div style="background: #f0f0ff; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #6366f1;">
                            <h2 style="color: #4f46e5; margin: 0 0 8px 0;">${eventTitle}</h2>
                            <p style="color: #6b7280; margin: 0;">📅 ${new Date(eventDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div style="text-align: center; margin: 30px 0;">
                            <p style="color: #374151; font-weight: 600; margin-bottom: 15px;">Your Event Ticket QR Code:</p>
                            <img src="cid:qrcode" alt="QR Code Ticket" style="width: 250px; height: 250px; border: 2px solid #e5e7eb; border-radius: 12px;" />
                        </div>
                        <p style="color: #9ca3af; font-size: 13px; text-align: center;">Present this QR code at the event entrance for check-in. This is a one-time use ticket.</p>
                    </div>
                </div>
            `,
            attachments: [{
                filename: 'ticket-qr.png',
                content: base64Data,
                encoding: 'base64',
                cid: 'qrcode'
            }]
        });

        console.log('📧 Email sent to', userEmail);
        return true;
    } catch (error) {
        console.error('📧 Email failed:', error.message);
        return false;
    }
}

/**
 * Send event reminder email
 */
async function sendEventReminder(userEmail, userName, eventTitle, eventDate) {
    const transport = getTransporter();
    if (!transport) return false;

    try {
        await transport.sendMail({
            from: `"ColEvent" <${process.env.SMTP_USER}>`,
            to: userEmail,
            subject: `⏰ Reminder: ${eventTitle} is coming up!`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2>Hi ${userName}! 👋</h2>
                    <p>Just a reminder that <strong>${eventTitle}</strong> is happening soon!</p>
                    <p>📅 <strong>${new Date(eventDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></p>
                    <p>Don't forget to bring your QR code ticket for check-in.</p>
                    <p>See you there! 🎉</p>
                </div>
            `
        });
        return true;
    } catch (error) {
        console.error('📧 Reminder email failed:', error.message);
        return false;
    }
}

module.exports = { sendRegistrationConfirmation, sendEventReminder };
