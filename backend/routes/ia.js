import express from 'express';
import { getClassementIA } from '../controllers/iaController.js';

const router = express.Router();

router.get('/classement', getClassementIA);

export default router;