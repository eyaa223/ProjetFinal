import express from 'express';
import { verifyToken } from '../middleware/auth.js';

import {
  getAllAssociations,
  getPublicAssociations,
  downloadAssociationDocument,
  getMyBeneficiaires,
  updatePourcentage,
  getMyDonneurs,
  getPublicAssociationById,

  // ✅ Mon compte
  getMyAssociationProfile,
  updateMyAssociationProfile,
  changeAssociationPassword,
} from '../controllers/associationController.js';

const router = express.Router();

/* ================= ADMIN ================= */

router.get('/', verifyToken, (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Accès refusé : Admin uniquement' });
  next();
}, getAllAssociations);

router.get('/download/:id/:doc', verifyToken, (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Accès refusé : Admin uniquement' });
  next();
}, downloadAssociationDocument);

/* ================= PUBLIC ================= */

router.get('/public', getPublicAssociations);
router.get('/public/:id', getPublicAssociationById);

/* ================= ASSOCIATION ================= */

const onlyAssociation = (req, res, next) => {
  if (!req.user || req.user.role !== 'association') {
    return res.status(403).json({ message: 'Accès refusé : Association uniquement' });
  }
  next();
};

router.get('/me', verifyToken, onlyAssociation, getMyAssociationProfile);
router.put('/me', verifyToken, onlyAssociation, updateMyAssociationProfile);

router.get('/beneficiaires', verifyToken, onlyAssociation, getMyBeneficiaires);
router.put('/beneficiaire/:id/pourcentage', verifyToken, onlyAssociation, updatePourcentage);
router.get('/donneurs', verifyToken, onlyAssociation, getMyDonneurs);
router.put(
  '/me/password',
  verifyToken,
  onlyAssociation,
  changeAssociationPassword
);

export default router;