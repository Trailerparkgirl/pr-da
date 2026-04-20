require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE ---
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve index.html, style.css, script.js

// --- EMAIL TRANSPORTER (Gmail) ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,   // Your Gmail address
        pass: process.env.EMAIL_PASS    // Your Gmail App Password (not your real password!)
    }
});

// --- SUBMIT ENDPOINT ---
app.post('/api/submit', async (req, res) => {
    const { date_proposed, food_preferences, other_food } = req.body;

    // Basic validation
    if (!date_proposed) {
        return res.status(400).json({ error: 'Missing date information.' });
    }

    const foodSummary = [
        food_preferences && `Picked: ${food_preferences}`,
        other_food && `Other:  ${other_food}`
    ].filter(Boolean).join('\n');

    const mailOptions = {
        from: `"Date Proposal App 💌" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_TO,   // Where you want to receive the notification
        subject: '🎉 She said YES! Date details inside...',
        html: `
            <div style="font-family: 'Segoe UI', sans-serif; max-width: 500px; margin: auto; background: #fff0f5; border-radius: 16px; padding: 32px; border: 2px solid #ffb6c1;">
                <h2 style="color: #ff4b72; margin-bottom: 8px;">💖 She said YES!</h2>
                <p style="color: #555; font-size: 1rem;">Here are the details she filled in:</p>
                <hr style="border:none; border-top: 1px solid #ffb6c1; margin: 16px 0;">

                <table style="width:100%; font-size: 1rem; color: #333;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: 600; width: 40%;">📅 Proposed Date:</td>
                        <td style="padding: 8px 0;">${date_proposed}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: 600; vertical-align: top;">🍽️ Food Preferences:</td>
                        <td style="padding: 8px 0; white-space: pre-line;">${foodSummary || 'Not specified'}</td>
                    </tr>
                </table>

                <hr style="border:none; border-top: 1px solid #ffb6c1; margin: 16px 0;">
                <p style="color: #ff4b72; font-weight: 700; font-size: 1.2rem; text-align:center;">Now go make it a perfect date! ✨</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[${new Date().toISOString()}] ✅ Email sent to ${process.env.EMAIL_TO}`);
        res.status(200).json({ message: 'Email sent successfully!' });
    } catch (err) {
        console.error(`[${new Date().toISOString()}] ❌ Email failed:`, err.message);
        res.status(500).json({ error: 'Failed to send email.', detail: err.message });
    }
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`\n💖 Date Proposal App running at http://localhost:${PORT}\n`);
});
