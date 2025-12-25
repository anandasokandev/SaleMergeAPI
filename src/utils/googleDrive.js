const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleDriveService {
    constructor() {
        this.driveClient = null;
    }

    async getDriveClient() {
        if (this.driveClient) return this.driveClient;

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground';
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

        if (!clientId || !clientSecret || !refreshToken) {
            throw new Error('Missing Google OAuth credentials in .env');
        }

        const oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            redirectUri
        );

        oauth2Client.setCredentials({ refresh_token: refreshToken });

        this.driveClient = google.drive({ version: 'v3', auth: oauth2Client });
        return this.driveClient;
    }

    async uploadFile(filePath, mimeType = 'video/mp4') {
        try {
            const drive = await this.getDriveClient();
            const fileName = path.basename(filePath);

            const fileMetadata = {
                name: fileName,
            };

            const media = {
                mimeType: mimeType,
                body: fs.createReadStream(filePath),
            };

            const response = await drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id, webViewLink, webContentLink',
            });

            // Make the file publicly readable
            await drive.permissions.create({
                fileId: response.data.id,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                },
            });

            return {
                fileId: response.data.id,
                webViewLink: response.data.webViewLink,
                webContentLink: response.data.webContentLink
            };
        } catch (error) {
            console.error('Google Drive Upload Error:', error);
            throw error;
        }
    }
}

module.exports = new GoogleDriveService();
