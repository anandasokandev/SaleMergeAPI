const nodemailer = require('nodemailer');
const { log, error } = require('./logger');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT, // 587 or 465
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const sendEmail = async (to, subject, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"Video SaaS" <${process.env.SMTP_USER}>`, // sender address
            to,
            subject,
            html,
        });
        log(`Email sent: ${info.messageId}`);
        return true;
    } catch (err) {
        error('Error sending email', err);
        return false;
    }
};

module.exports = { sendEmail };
