import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { getNotifications, markAsRead } from '../controllers/notificationController.js';

const router = express.Router();

router.get('/', verifyToken, getNotifications);
router.put('/read/:id', verifyToken, markAsRead);

export default router;