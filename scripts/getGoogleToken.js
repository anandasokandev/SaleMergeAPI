const { google } = require('googleapis');
const readline = require('readline');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Instructions:
// 1. Go to Google Cloud Console -> APIs & Services -> Credentials.
// 2. Create OAuth 2.0 Client ID (Web Application or Desktop).
// 3. Set Redirect URI to https://developers.google.com/oauthplayground (easiest) or http://localhost:3000/oauth2callback
// 4. Run this script with CLIENT_ID and CLIENT_SECRET set in env or hardcoded temporarily.

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment variables.');
    process.exit(1);
}

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Crucial for getting a refresh token
    scope: SCOPES,
});

console.log('Authorize this app by visiting this url:', authUrl);

rl.question('Enter the code from that page here: ', async (code) => {
    try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log('\nSuccessfully retrieved tokens!');
        console.log('\nAdd these to your .env file:');
        console.log('GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
        // console.log('Access Token:', tokens.access_token);
    } catch (err) {
        console.error('Error retrieving access token', err);
    } finally {
        rl.close();
    }
});
