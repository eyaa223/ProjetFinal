import express from 'express';
import { registerDonneur, loginUser, setPassword, loginAll } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', registerDonneur);
router.post('/login', loginUser);
router.post('/login-all', loginAll); // ✅ NEW
router.post('/set-password', setPassword);

export default router;