const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userRepository = require('../users/users.repository');
const sendEmail = require('../../utils/email');
const crypto = require('crypto');

class AuthService {
    async signup(email, password, role, name) {
        const existingUser = await userRepository.findByEmail(email);
        if (existingUser) {
            throw new Error('User already exists');
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const userId = await userRepository.create(email, passwordHash, role, name);
        return await userRepository.findById(userId);
    }

    async login(email, password) {
        const user = await userRepository.findByEmail(email);
        if (!user) {
            throw new Error('Invalid credentials');
        }

        if (!user.is_active) {
            // Send notification email
            await sendEmail(
                user.email,
                'Start a Conversation with Us – Account Support.',
                `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2>Account Access Notice</h2>
                    <p>Dear ${user.name},</p>
                    <p>We noticed an attempt to access your account, but it is currently disabled.</p>
                    <p>If you believe this is an error or need to restore access, please contact our support team immediately:</p>
                    <p><strong>Email:</strong> <a href="mailto:mail.salemerge@gmail.com">mail.salemerge@gmail.com</a></p>
                    <br>
                    <p>Best regards,<br>The SaleMerge Team</p>
                </div>
                `
            ).catch(err => console.error('Failed to send disabled account email:', err));

            throw new Error('Account is disabled. Please contact support.');
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }

        const token = this.generateToken(user);
        return { user: { id: user.id, name: user.name, email: user.email, role: user.role, credits: user.credits, downloads_count: user.downloads_count }, token };
    }

    generateToken(user) {
        return jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h', issuer: 'SaleMergeAPI' }
        );
    }

    async forgotPassword(email) {
        const user = await userRepository.findByEmail(email);
        if (!user) {
            // Security: Prevent User Enumeration - Return success even if email not found
            // Log it internally
            console.log(`[Security] Forgot Password requested for non-existent email: ${email}`);
            return { message: 'If an account exists with this email, an OTP has been sent.' };
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await userRepository.saveResetToken(email, otp, expiresAt);

        await sendEmail(
            email,
            'Password Reset OTP',
            `<p>Your OTP for password reset is: <strong>${otp}</strong></p><p>This OTP is valid for 10 minutes.</p>`
        );

        return { message: 'If an account exists with this email, an OTP has been sent.' };
    }

    async resetPassword(email, otp, newPassword) {
        const user = await userRepository.findByEmail(email);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.reset_token !== otp) {
            throw new Error('Invalid OTP');
        }

        if (new Date() > new Date(user.reset_token_expires)) {
            throw new Error('OTP expired');
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await userRepository.updatePassword(user.id, passwordHash);

        // Notify user of success
        await sendEmail(
            email,
            'Password Changed Successfully',
            `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2>Password Updated</h2>
                <p>Hello ${user.name},</p>
                <p>Your password has been successfully reset.</p>
                <p>If you did not make this change, please contact support immediately.</p>
                <br>
                <p>Best regards,<br>The SaleMerge Team</p>
            </div>
            `
        ).catch(err => console.error('Failed to send password success email:', err));

        return { message: 'Password reset successfully' };
    }
}

module.exports = new AuthService();
