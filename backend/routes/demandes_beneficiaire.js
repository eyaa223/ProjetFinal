import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { createDemande, getAllDemandes, getDemandeById, updateStatutDemande, downloadFile } from '../controllers/demandesBeneficiaireController.js';

const router = express.Router();

router.post('/', createDemande);
router.get('/', verifyToken, getAllDemandes);
router.get('/download/:id/:field', verifyToken, downloadFile);
router.get('/:id', verifyToken, getDemandeById);
router.put('/:id/statut', verifyToken, updateStatutDemande);


export default router;
