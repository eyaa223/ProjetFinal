import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  login,
  getAssociations,
  blockAssociation,
  getDonneurs,
  getBeneficiaires,
  createAvocat,
  changePasswordAvocat, // ✅ AJOUT
} from '../controllers/adminController.js';

const router = express.Router();

/* ===========================
   🔹 LOGIN (public)
=========================== */
router.post('/login', login);

/* ===========================
   🔹 ROUTES PROTÉGÉES (tous les utilisateurs)
=========================== */
router.use(verifyToken);

/* ===========================
   🔹 ROUTE AVOCAT / USER
   👉 accessible à avocat (et autres si besoin)
=========================== */
router.put('/utilisateurs/me/password', changePasswordAvocat);

/* ===========================
   🔹 ROUTES ADMIN UNIQUEMENT
=========================== */
router.use((req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé (admin uniquement)' });
  }
  next();
});

/* ===========================
   🔹 ADMIN FEATURES
=========================== */

// 🔹 Associations
router.get('/associations', getAssociations);
router.put('/block/:id', blockAssociation);

// 🔹 Donneurs
router.get('/donneurs', getDonneurs);

// 🔹 Bénéficiaires
router.get('/beneficiaires', getBeneficiaires);

// 🔹 Création avocat
router.post('/create-avocat', createAvocat);

export default router;