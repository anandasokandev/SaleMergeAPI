const authService = require('./auth.service');
const { sendResponse, sendError } = require('../../utils/response');
const Joi = require('joi');

const signupSchema = Joi.object({
    name: Joi.string().min(2).optional(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8)
        .pattern(new RegExp('^[a-zA-Z0-9]{3,30}$')) // Example: Alphanumeric only, just for demo of pattern. Real world needs more complex one.
        // Better pattern for: min 8, 1 up, 1 low, 1 num, 1 special
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])(?=.{8,})'))
        .message('Password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one special character.')
        .required(),
    role: Joi.string().valid('USER', 'ADMIN').required()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required()
});

const resetPasswordSchema = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).required(),
    newPassword: Joi.string().min(6).required()
});

class AuthController {
    async signup(req, res) {
        try {
            console.log('Signup Request Body:', req.body);
            const { error, value } = signupSchema.validate(req.body);
            console.log('Validation Result:', { error, value });

            if (error) return sendError(res, 400, error.details[0].message);

            if (!value) {
                return sendError(res, 400, 'Invalid request data');
            }

            const result = await authService.signup(value.email, value.password, value.role, value.name);
            return sendResponse(res, 201, true, 'User created successfully', result);
        } catch (err) {
            console.error('Signup Error:', err);
            return sendError(res, 400, err.message);
        }
    }

    async login(req, res) {
        try {
            const { error, value } = loginSchema.validate(req.body);
            if (error) return sendError(res, 400, error.details[0].message);

            const result = await authService.login(value.email, value.password);

            // Set HttpOnly cookie
            res.cookie('token', result.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // true in production
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000 // 1 day
            });

            return sendResponse(res, 200, true, 'Login successful', result);
        } catch (err) {
            if (err.message === 'Invalid credentials') {
                return sendError(res, 401, err.message);
            }
            if (err.message === 'Account is disabled. Please contact support.') {
                return sendError(res, 403, err.message);
            }
            return sendError(res, 500, err.message);
        }
    }

    async forgotPassword(req, res) {
        try {
            const { error, value } = forgotPasswordSchema.validate(req.body);
            if (error) return sendError(res, 400, error.details[0].message);

            const result = await authService.forgotPassword(value.email);
            return sendResponse(res, 200, true, result.message);
        } catch (err) {
            if (err.message === 'User not found') {
                // Determine if we should reveal user existence. For security, usually returns success anyway or specific error.
                // Here proceeding with error for simplicity as per common dev practices, or could return 200 to avoid enumeration.
                // Let's return 404 for now for easier debugging by user.
                return sendError(res, 404, err.message);
            }
            return sendError(res, 500, err.message);
        }
    }

    async resetPassword(req, res) {
        try {
            const { error, value } = resetPasswordSchema.validate(req.body);
            if (error) return sendError(res, 400, error.details[0].message);

            const result = await authService.resetPassword(value.email, value.otp, value.newPassword);
            return sendResponse(res, 200, true, result.message);
        } catch (err) {
            if (err.message === 'Invalid OTP' || err.message === 'OTP expired') {
                return sendError(res, 400, err.message);
            }
            if (err.message === 'User not found') {
                return sendError(res, 404, err.message);
            }
            return sendError(res, 500, err.message);
        }
    }
}

module.exports = new AuthController();
