import express from 'express';
import db from '../config/db.js';


const router = express.Router();

router.get('/beneficiaires', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT b.id, b.nom, b.prenom, b.description,
             a.nom AS association
      FROM beneficiaires b
      JOIN associations a ON b.association_id = a.id
      WHERE b.avocat_status = 'approved'
        AND b.admin_status = 'approved'
    `);

    res.json(rows);
  } catch (err) {
    console.error('Erreur public beneficiaires:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;
