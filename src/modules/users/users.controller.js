const userRepository = require('./users.repository');
const { sendResponse, sendError } = require('../../utils/response');
const Joi = require('joi');
const bcrypt = require('bcrypt');

const updateProfileSchema = Joi.object({
    name: Joi.string().min(2).optional(),
    email: Joi.string().email().optional(),
    old_password: Joi.string().optional(),
    new_password: Joi.string().min(6).optional()
});

class UserController {
    async getProfile(req, res) {
        try {
            const user = await userRepository.findById(req.user.userId);
            if (!user) return sendError(res, 404, 'User not found');
            return sendResponse(res, 200, 'User profile', user);
        } catch (err) {
            return sendError(res, 500, err.message);
        }
    }

    async updateProfile(req, res) {
        try {
            const { error, value } = updateProfileSchema.validate(req.body);
            if (error) return sendError(res, 400, error.details[0].message);

            const updateData = {};
            if (value.name) updateData.name = value.name;

            if (value.email) {
                const existingUser = await userRepository.findByEmail(value.email);
                if (existingUser && existingUser.id !== req.user.userId) {
                    return sendError(res, 409, 'Email is already in use');
                }
                updateData.email = value.email;
            }

            if (value.new_password) {
                if (!value.old_password) {
                    return sendError(res, 400, 'Old password is required to set a new password');
                }

                const currentPasswordHash = await userRepository.findPasswordById(req.user.userId);
                if (!currentPasswordHash) return sendError(res, 404, 'User record corrupted or missing');

                const isMatch = await bcrypt.compare(value.old_password, currentPasswordHash);
                if (!isMatch) {
                    return sendError(res, 401, 'Incorrect old password');
                }

                const salt = await bcrypt.genSalt(10);
                updateData.password_hash = await bcrypt.hash(value.new_password, salt);
            }

            if (Object.keys(updateData).length === 0) {
                return sendError(res, 400, 'No valid fields provided to update');
            }

            await userRepository.update(req.user.userId, updateData);

            const updatedUser = await userRepository.findById(req.user.userId);
            return sendResponse(res, 200, 'Profile updated successfully', updatedUser);
        } catch (err) {
            return sendError(res, 500, err.message);
        }
    }
}

module.exports = new UserController();
