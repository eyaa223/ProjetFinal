import express from 'express';
import { askChatbot } from '../controllers/chatController.js';

const router = express.Router();

// POST /api/chatbot/ask
router.post('/ask', askChatbot);

export default router;