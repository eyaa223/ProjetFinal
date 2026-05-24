import express from 'express';
import { setPassword } from '../controllers/userController.js';

const router = express.Router();

// Route pour définir le mot de passe via token
router.put('/set-password/:token', setPassword);

export default router;