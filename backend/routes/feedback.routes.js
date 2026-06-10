// routes/feedback.routes.js
import express from 'express';
import {
  verifyToken,
  verifyTokenOptional,
  verifyAdmin,
} from '../middleware/auth.js';
import * as feedbackController from '../controllers/feedback.controller.js';

const router = express.Router();

// ─── ROUTES PUBLIQUES (sans auth) ─────────────────────────────────────────────

// GET  /api/feedback/public          → liste feedbacks publics approuvés
router.get('/public', feedbackController.getPublic);

// POST /api/feedback/improve         → amélioration IA (pas besoin d'auth)
router.post('/improve', feedbackController.improveWithAI);

// GET  /api/feedback/test-ai         → test du service Gemini
router.get('/test-ai', feedbackController.testAI);

// ─── SOUMISSION (auth optionnelle : connecté ou anonyme) ──────────────────────

// POST /api/feedback                 → soumettre un feedback
router.post('/', verifyTokenOptional, feedbackController.submit);

// ─── ROUTES UTILISATEUR CONNECTÉ ──────────────────────────────────────────────

// GET  /api/feedback/user/:userId    → feedbacks d'un utilisateur
router.get('/user/:userId', verifyToken, feedbackController.getUserFeedbacks);

// ─── ROUTES ADMIN ─────────────────────────────────────────────────────────────

// GET    /api/feedback/admin/all             → tous les feedbacks (paginés)
router.get('/admin/all', verifyToken, verifyAdmin, feedbackController.getAllForAdmin);

// GET    /api/feedback/admin/stats           → statistiques globales
router.get('/admin/stats', verifyToken, verifyAdmin, feedbackController.getStats);

// PATCH  /api/feedback/admin/:id/status      → changer le statut
router.patch('/admin/:id/status', verifyToken, verifyAdmin, feedbackController.updateStatus);

// DELETE /api/feedback/admin/:id             → supprimer un feedback
router.delete('/admin/:id', verifyToken, verifyAdmin, feedbackController.deleteFeedback);

export default router;