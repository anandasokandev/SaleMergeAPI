const userRepository = require('../users/users.repository');
const videoRepository = require('../videos/videos.repository');
const adminRepository = require('./admin.repository');
const { sendResponse, sendError } = require('../../utils/response');
const sendEmail = require('../../utils/email');

class AdminController {
    async getUsers(req, res) {
        try {
            const { limit, offset, search } = req.query;
            const result = await userRepository.findAll(parseInt(limit) || 20, parseInt(offset) || 0, search);
            return sendResponse(res, 200, 'Users list', result);
        } catch (err) {
            return sendError(res, 500, err.message);
        }
    }

    async createUser(req, res) {
        try {
            const { name, email, password, role, credits, is_active } = req.body;

            // Basic validation
            if (!email || !password) {
                return sendError(res, 400, 'Email and password are required');
            }
            if (role && !['USER', 'ADMIN'].includes(role)) {
                return sendError(res, 400, 'Invalid role');
            }

            // Check if user exists
            const existing = await userRepository.findByEmail(email);
            if (existing) {
                return sendError(res, 409, 'User with this email already exists');
            }

            // Use AuthService logic partially or replicate hashing here. Replicating for isolation in admin flow or import bcrypt.
            // Better to use bcrypt directly here to avoid circular dep with AuthService if not careful, or just import bcrypt.
            const bcrypt = require('bcrypt');
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            // Create User
            const userId = await userRepository.create(email, passwordHash, role || 'USER', name);

            // Update additional fields if provided (credits, active status)
            // Since create() defaults credits to 0 (db default) and active to true (usually), updates might be needed.
            // However, our userRepository.create only takes basic params. 
            // We can optionally run an update immediately after create.

            const updateData = {};
            if (credits !== undefined) updateData.credits = credits;
            if (is_active !== undefined) updateData.is_active = is_active;

            if (Object.keys(updateData).length > 0) {
                await userRepository.update(userId, updateData);
            }

            const newUser = await userRepository.findById(userId);

            // Send Welcome Email
            try {
                const appUrl = process.env.APP_URL || 'http://localhost:3000';
                await sendEmail(
                    email,
                    'Welcome to SaleMerge! 🚀',
                    `
                    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
                        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px 20px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Welcome Aboard!</h1>
                            <p style="color: #ecfdf5; margin: 5px 0 0 0; font-size: 14px;">Your account has been created.</p>
                        </div>
                        <div style="padding: 40px 30px;">
                            <h2 style="color: #1f2937; margin-top: 0; font-size: 22px;">Hello ${name || 'User'},</h2>
                            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                                An account has been created for you on <strong>SaleMerge</strong>. You can now login and start generating personalized videos.
                            </p>
                            
                            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
                                <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px; text-transform: uppercase; font-weight: 600;">Your Login Details:</p>
                                <p style="margin: 5px 0; color: #1f2937;"><strong>Email:</strong> ${email}</p>
                                <p style="margin: 5px 0; color: #1f2937;"><strong>Password:</strong> ${password}</p>
                            </div>

                            <p style="color: #6b7280; font-size: 14px; margin-bottom: 30px;">
                                <em>We recommend changing your password after your first login.</em>
                            </p>

                            <div style="text-align: center; margin: 35px 0;">
                                <a href="${appUrl}/login" style="background-color: #10b981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);">
                                    Login to your Account
                                </a>
                            </div>
                        </div>
                        <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af;">
                            <p style="margin: 0;">© ${new Date().getFullYear()} SaleMerge API. All rights reserved.</p>
                        </div>
                    </div>
                    `
                );
                console.log(`[Email] Welcome email sent to ${email}`);
            } catch (emailErr) {
                console.error(`[Email] Failed to send welcome email to ${email}:`, emailErr);
                // Do not fail the request if email fails, just log it.
            }

            return sendResponse(res, 201, 'User created successfully', newUser);

        } catch (err) {
            return sendError(res, 500, err.message);
        }
    }

    async getUserById(req, res) {
        try {
            const { id } = req.params;
            const user = await userRepository.findById(id);
            if (!user) return sendError(res, 404, 'User not found');
            return sendResponse(res, 200, 'User details', user);
        } catch (err) {
            return sendError(res, 500, err.message);
        }
    }

    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { email, role, credits, is_active, name } = req.body;

            const updateData = {};
            if (name) updateData.name = name;
            if (email) updateData.email = email;
            if (role && ['USER', 'ADMIN'].includes(role)) updateData.role = role;
            if (credits !== undefined) updateData.credits = parseInt(credits);
            if (is_active !== undefined) updateData.is_active = is_active;

            if (Object.keys(updateData).length === 0) {
                return sendError(res, 400, 'No valid fields to update');
            }

            // Check if email is taken (if email is being updated)
            if (updateData.email) {
                const existing = await userRepository.findByEmail(updateData.email);
                if (existing && existing.id != id) {
                    return sendError(res, 409, 'Email already in use');
                }
            }

            await userRepository.update(id, updateData);

            // Return updated user
            const updatedUser = await userRepository.findById(id);
            return sendResponse(res, 200, 'User updated successfully', updatedUser);
        } catch (err) {
            return sendError(res, 500, err.message);
        }
    }

    async toggleUserStatus(req, res) {
        try {
            const { id } = req.params;
            const { is_active } = req.body; // Expect boolean
            if (typeof is_active !== 'boolean') return sendError(res, 400, 'is_active must be boolean');

            await userRepository.toggleStatus(id, is_active);
            return sendResponse(res, 200, 'User status updated');
        } catch (err) {
            return sendError(res, 500, err.message);
        }
    }

    async updateUserCredits(req, res) {
        try {
            const { id } = req.params;
            const { credits } = req.body;
            if (typeof credits !== 'number') return sendError(res, 400, 'credits must be number');

            await userRepository.updateCredits(id, credits);
            return sendResponse(res, 200, 'User credits updated');
        } catch (err) {
            return sendError(res, 500, err.message);
        }
    }

    async getVideos(req, res) {
        try {
            const { limit, offset } = req.query;
            const result = await videoRepository.findAll(parseInt(limit) || 20, parseInt(offset) || 0);
            return sendResponse(res, 200, 'All videos', result);
        } catch (err) {
            return sendError(res, 500, err.message);
        }
    }

    async deleteVideo(req, res) {
        try {
            const { id } = req.params;
            // Ideally check if exists first
            await videoRepository.delete(id);
            return sendResponse(res, 200, 'Video deleted (admin)');
        } catch (err) {
            return sendError(res, 500, err.message);
        }
    }

    async getUserVideos(req, res) {
        try {
            const { id } = req.params;
            const { limit, offset } = req.query;
            const result = await videoRepository.findAllByUser(id, parseInt(limit) || 20, parseInt(offset) || 0);
            return sendResponse(res, 200, 'User videos', result);
        } catch (err) {
            return sendError(res, 500, err.message);
        }
    }



    async getStats(req, res) {
        try {
            const stats = await adminRepository.getDashboardStats();
            return sendResponse(res, 200, 'Dashboard stats', stats);
        } catch (err) {
            return sendError(res, 500, err.message);
        }
    }
}

module.exports = new AdminController();
