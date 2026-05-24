// routes/dashboard.js
import express from 'express';
import db from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// 🔹 Dashboard association
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    // Vérifier que c'est bien une association
    if (req.user.role !== 'association') {
      return res.status(403).json({ message: "Accès refusé" });
    }

    // Récupérer les infos de l'association connectée
    const [rows] = await db.execute(
      "SELECT id, nom, email, telephone, adresse, responsable, created_at FROM associations WHERE id = ?",
      [req.user.id]
    );

    if (rows.length === 0) return res.status(404).json({ message: "Association non trouvée" });

    res.json(rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// 🔹 Liste des dons pour l'association connectée
router.get('/dons', verifyToken, async (req, res) => {
  try {
    console.log('📊 [GET /association/dons] Demande reçue');
    console.log('👤 User:', req.user);

    // Vérifier que c'est bien une association
    if (req.user.role !== 'association') {
      console.log('❌ Accès refusé - rôle:', req.user.role);
      return res.status(403).json({ message: "Accès refusé" });
    }

    console.log('🔍 Recherche des dons pour association_id:', req.user.id);

    // Récupérer tous les dons liés aux bénéficiaires de cette association
    const [rows] = await db.execute(`
      SELECT 
        d.id,
        d.montant,
        d.numero_banque,
        d.date_don,
        u.nom AS donneur_nom,
        u.email AS donneur_email,
        b.nom AS beneficiaire_nom,
        b.prenom AS beneficiaire_prenom
      FROM dons d
      JOIN utilisateurs u ON d.donneur_id = u.id
      JOIN beneficiaires b ON d.beneficiaire_id = b.id
      WHERE b.association_id = ?
      ORDER BY d.date_don DESC
    `, [req.user.id]);

    console.log(`✅ ${rows.length} don(s) trouvé(s)`);
    console.log('Dons:', rows);

    res.json(rows);

  } catch (err) {
    console.error('❌ [GET /association/dons] erreur', err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;