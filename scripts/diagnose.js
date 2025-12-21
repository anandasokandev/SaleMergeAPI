const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const nodemailer = require('nodemailer');
const mysql = require('mysql2/promise');

async function run() {
    console.log('[DEBUG] Starting System Check...');
    console.log('[DEBUG] CWD:', process.cwd());
    console.log('[DEBUG] Env Check:', {
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_USER: process.env.SMTP_USER,
        DB_USER: process.env.DB_USER
    });

    // 1. Test SMTP
    console.log('\n[DEBUG] Testing SMTP Connection...');
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT, // Should be 587
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    try {
        await transporter.verify();
        console.log('[PASS] SMTP Connection Verified Successfully');
    } catch (err) {
        console.error('[FAIL] SMTP Connection Error:', err.message);
    }

    // 2. Test DB and Last Jobs
    console.log('\n[DEBUG] Checking Database for recent jobs...');
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        const [jobs] = await connection.query('SELECT * FROM job_queue ORDER BY id DESC LIMIT 5');
        console.log(`[DEBUG] Found ${jobs.length} recent jobs.`);

        jobs.forEach(j => {
            let payloadStr = j.payload;
            if (typeof j.payload === 'object') {
                payloadStr = JSON.stringify(j.payload);
            }
            console.log(` - Job ID: ${j.id} | Status: ${j.status} | Created: ${j.created_at}`);
            console.log(`   Payload: ${payloadStr}`);
        });

        await connection.end();
    } catch (err) {
        console.error('[FAIL] DB Connection Error:', err.message);
    }
}

run();
