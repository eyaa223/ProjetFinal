import express from 'express';
import { verifyToken } from '../middleware/auth.js';

import {
  listAssociations,
  listBeneficiaires,
  createDonation,
  listMesDons,
  getMyDonneurProfile,
  updateMyDonneurProfile,
  updateMyDonneurBankNumber,

  // messages
  getMyMessages,
  updateDonationMessage,
  deleteDonationMessage,

  // top donneurs
  getTopDonneursPublic,
  isTopDonor,

  // 🔐 password
  changeDonneurPassword,
  generateMyCertificate,
} from '../controllers/donneurController.js';

const router = express.Router();

// ============================================================================
// 🔹 Associations
// ============================================================================
router.get('/associations', verifyToken, listAssociations);
router.get('/associations/:id/beneficiaires', verifyToken, listBeneficiaires);

// ============================================================================
// 🔹 Donations
// ============================================================================
router.post('/donations', verifyToken, createDonation);
router.get('/mine', verifyToken, listMesDons);

// ============================================================================
// 🔹 Profil donneur
// ============================================================================
router.get('/me', verifyToken, getMyDonneurProfile);
router.put('/me', verifyToken, updateMyDonneurProfile);
router.put('/me/bank', verifyToken, updateMyDonneurBankNumber);

// ============================================================================
// 🔐 PASSWORD (DONNEUR UNIQUEMENT VIA CONTROLLER)
// ============================================================================
router.put('/me/password', verifyToken, changeDonneurPassword);

// ============================================================================
// 🔹 Messages
// ============================================================================
router.get('/mes-messages', verifyToken, getMyMessages);
router.put('/donations/:id/message', verifyToken, updateDonationMessage);
router.delete('/donations/:id/message', verifyToken, deleteDonationMessage);

// ============================================================================
// 🔹 TOP DONNEURS
// ============================================================================
router.get("/top-month", getTopDonneursPublic);
router.get("/is-top-donor/:id", verifyToken, isTopDonor);
// 🏆 CERTIFICAT DONNEUR
// ============================================================================
router.get('/me/certificate', verifyToken, generateMyCertificate);
export default router;