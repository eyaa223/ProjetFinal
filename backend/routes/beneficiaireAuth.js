import express from 'express';
import { verifyBeneficiaireToken } from '../middleware/authBeneficiaire.js';
import { loginBeneficiaire, getBeneficiaireProfile } from '../controllers/beneficiaireController.js';

const router = express.Router();

// 🔹 Routes publiques
router.post('/login', loginBeneficiaire);

// 🔹 Routes protégées
router.get('/profile', verifyBeneficiaireToken, getBeneficiaireProfile);

export default router;
