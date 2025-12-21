const authService = require('./auth.service');
const { sendResponse, sendError } = require('../../utils/response');
const Joi = require('joi');

const signupSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('USER', 'ADMIN').required()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
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

            const result = await authService.signup(value.email, value.password, value.role);
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
            return sendResponse(res, 200, true, 'Login successful', result);
        } catch (err) {
            if (err.message === 'Invalid credentials') {
                return sendError(res, 401, err.message);
            }
            return sendError(res, 500, err.message);
        }
    }
}

module.exports = new AuthController();
