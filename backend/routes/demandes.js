import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { createDemande, getAllDemandes, updateStatut, downloadFile, upload } from '../controllers/demandeController.js';

const router = express.Router();

router.post(
  '/',
  upload.fields([
    { name: 'doc_statut', maxCount: 1 },
    { name: 'doc_autorisation', maxCount: 1 },
    { name: 'doc_registre', maxCount: 1 },
    { name: 'doc_cin', maxCount: 1 },
    { name: 'logo', maxCount: 1 }, // ✅ NEW (optionnel)
  ]),
  createDemande
);

router.get('/', verifyToken, getAllDemandes);
router.put('/status/:id', verifyToken, updateStatut);
router.get('/download/:id/:field', verifyToken, downloadFile);

export default router;