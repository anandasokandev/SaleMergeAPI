const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userRepository = require('../users/users.repository');
const sendEmail = require('../../utils/email');
const crypto = require('crypto');

class AuthService {
    async signup(email, password, role) {
        const existingUser = await userRepository.findByEmail(email);
        if (existingUser) {
            throw new Error('User already exists');
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const userId = await userRepository.create(email, passwordHash, role);
        return { userId, email, role };
    }

    async login(email, password) {
        const user = await userRepository.findByEmail(email);
        if (!user) {
            throw new Error('Invalid credentials');
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }

        const token = this.generateToken(user);
        return { user: { id: user.id, email: user.email, role: user.role }, token };
    }

    generateToken(user) {
        return jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );
    }

    async forgotPassword(email) {
        const user = await userRepository.findByEmail(email);
        if (!user) {
            throw new Error('User not found');
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await userRepository.saveResetToken(email, otp, expiresAt);

        await sendEmail(
            email,
            'Password Reset OTP',
            `<p>Your OTP for password reset is: <strong>${otp}</strong></p><p>This OTP is valid for 10 minutes.</p>`
        );

        return { message: 'OTP sent to email' };
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

        return { message: 'Password reset successfully' };
    }
}

module.exports = new AuthService();
