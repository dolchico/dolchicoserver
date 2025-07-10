// routes/userRoute.js
import express from 'express';
import { loginUser, registerUser } from '../controllers/userController.js';
import { validateRegister, validateLogin } from '../validators/userValidator.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

router.post('/login',validateLogin, loginUser);
router.post('/register', authLimiter,validateRegister, registerUser);

export default router;
