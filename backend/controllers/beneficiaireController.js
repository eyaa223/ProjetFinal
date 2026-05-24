import db from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

/* ===========================
   🔹 Login Bénéficiaire
=========================== */
export const loginBeneficiaire = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    const [rows] = await db.query('SELECT * FROM beneficiaires WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Mot de passe incorrect' });

    const token = jwt.sign({ id: user.id, role: 'beneficiaire', email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      message: 'Connexion réussie',
      token,
      role: 'beneficiaire',
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone,
      },
    });
  } catch (err) {
    console.error('Erreur login bénéficiaire', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/* ===========================
   ✅ Profile Bénéficiaire (COMPLET + ASSOCIATION)
   GET /beneficiaire/me
=========================== */
export const getBeneficiaireProfile = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         b.id,
         b.nom,
         b.prenom,
         b.email,
         b.telephone,
         b.adresse,
         b.description,
         b.cin,
         b.date_naissance,
         b.genre,
         b.situation_familiale,

         -- ✅ NEW: association
         b.association_id,
         a.nom AS association_nom
       FROM beneficiaires b
       LEFT JOIN associations a ON a.id = b.association_id
       WHERE b.id = ?
       LIMIT 1`,
      [req.user.id],
    );

    if (rows.length === 0) return res.status(404).json({ message: 'Utilisateur introuvable' });

    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur getBeneficiaireProfile', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/* ===========================
   ✅ Update Profile Bénéficiaire (COMPLET)
   PUT /beneficiaire/me
=========================== */
export const updateBeneficiaireProfile = async (req, res) => {
  try {
    const beneficiaireId = req.user.id;

    const {
      nom,
      prenom,
      telephone,
      adresse,
      description,
      cin,
      date_naissance,
      genre,
      situation_familiale,
    } = req.body;

    if (!nom || !nom.trim() || !prenom || !prenom.trim()) {
      return res.status(400).json({ message: 'Nom et prénom sont obligatoires' });
    }

    // 1) update beneficiaires
    await db.query(
      `UPDATE beneficiaires
       SET
         nom = ?,
         prenom = ?,
         telephone = ?,
         adresse = ?,
         description = ?,
         cin = ?,
         date_naissance = ?,
         genre = ?,
         situation_familiale = ?,
         updated_at = NOW()
       WHERE id = ?`,
      [
        nom.trim(),
        prenom.trim(),
        telephone ?? null,
        adresse ?? null,
        description ?? null,
        cin ?? null,
        date_naissance ?? null,
        genre ?? null,
        situation_familiale ?? null,
        beneficiaireId,
      ],
    );

    // 2) ✅ PARTIE 3: update demandes_beneficiaire liée
    const [bRows] = await db.query(
      `SELECT demande_beneficiaire_id, email
       FROM beneficiaires
       WHERE id = ?
       LIMIT 1`,
      [beneficiaireId],
    );

    const demandeId = bRows?.[0]?.demande_beneficiaire_id || null;
    const email = bRows?.[0]?.email || null;

    if (demandeId) {
      await db.query(
        `UPDATE demandes_beneficiaire
         SET
           nom = ?,
           prenom = ?,
           telephone = ?,
           adresse = ?,
           description = ?,
           cin = ?,
           date_naissance = ?,
           genre = ?,
           situation_familiale = ?,
           updated_at = NOW()
         WHERE id = ?`,
        [
          nom.trim(),
          prenom.trim(),
          telephone ?? null,
          adresse ?? null,
          description ?? null,
          cin ?? null,
          date_naissance ?? null,
          genre ?? null,
          situation_familiale ?? null,
          demandeId,
        ],
      );
    } else if (email) {
      // ✅ fallback (anciens comptes) : update par email si pas de lien
      await db.query(
        `UPDATE demandes_beneficiaire
         SET
           nom = ?,
           prenom = ?,
           telephone = ?,
           adresse = ?,
           description = ?,
           cin = ?,
           date_naissance = ?,
           genre = ?,
           situation_familiale = ?,
           updated_at = NOW()
         WHERE email = ?`,
        [
          nom.trim(),
          prenom.trim(),
          telephone ?? null,
          adresse ?? null,
          description ?? null,
          cin ?? null,
          date_naissance ?? null,
          genre ?? null,
          situation_familiale ?? null,
          email,
        ],
      );
    }

    return res.json({ message: 'Profil mis à jour' });
  } catch (err) {
    console.error('Erreur updateBeneficiaireProfile:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

/* ===========================
   🔹 Notifications
=========================== */
export const getNotifications = async (req, res) => {
  const beneficiaire_id = req.user.id;
  try {
    const [rows] = await db.query(
      'SELECT * FROM notification_beneficiaire WHERE beneficiaire_id = ? ORDER BY created_at DESC',
      [beneficiaire_id],
    );
    res.json(rows);
  } catch (err) {
    console.error('[getNotifications] erreur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const markAsRead = async (req, res) => {
  const beneficiaire_id = req.user.id;
  const notifId = req.params.id;

  try {
    await db.query('UPDATE notification_beneficiaire SET is_read = 1 WHERE id = ? AND beneficiaire_id = ?', [
      notifId,
      beneficiaire_id,
    ]);
    res.json({ message: 'Notification marquée comme lue' });
  } catch (err) {
    console.error('[markAsRead] erreur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/* ===========================
   ✅ Dons reçus (liste donneurs)
=========================== */
export const getDonationsRecues = async (req, res) => {
  const beneficiaire_id = req.user.id;

  try {
    const [donations] = await db.query(
      `SELECT
         d.id,
         d.montant,
         d.message,        -- ✅ NEW
         d.created_at,
         u.id AS donneur_id,
         u.nom AS donneur_nom,
         u.email AS donneur_email
       FROM donations d
       JOIN utilisateurs u ON u.id = d.donneur_id
       WHERE d.beneficiaire_id = ?
       ORDER BY d.created_at DESC`,
      [beneficiaire_id],
    );

    const [bRows] = await db.query(`SELECT montant_restant FROM beneficiaires WHERE id = ?`, [beneficiaire_id]);

    const montant_restant = bRows?.[0]?.montant_restant ?? null;
    const total_collecte = (donations || []).reduce((sum, d) => sum + Number(d?.montant || 0), 0);

    const montant_a_collecter =
      montant_restant === null || montant_restant === undefined
        ? null
        : Number(montant_restant) + Number(total_collecte);

    return res.json({
      donations,
      summary: {
        total_collecte,
        montant_restant,
        montant_a_collecter,
      },
    });
  } catch (err) {
    console.error('[getDonationsRecues] erreur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/* ===========================
   ✅ Upload files (OPTIONNEL)
=========================== */
export const updateBeneficiaireFiles = async (req, res) => {
  try {
    const beneficiaireId = req.user.id;

    const doc_cin = req.files?.doc_cin?.[0]?.filename || null;
    const doc_autre = req.files?.doc_autre?.[0]?.filename || null;

    if (!doc_cin && !doc_autre) {
      return res.status(400).json({ message: 'Aucun fichier reçu' });
    }

    const sets = [];
    const params = [];

    if (doc_cin) {
      sets.push('doc_cin = ?');
      params.push(doc_cin);
    }
    if (doc_autre) {
      sets.push('doc_autre = ?');
      params.push(doc_autre);
    }

    params.push(beneficiaireId);

    await db.query(`UPDATE beneficiaires SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, params);

    return res.json({
      message: 'Fichiers mis à jour',
      doc_cin,
      doc_autre,
    });
  } catch (err) {
    console.error('Erreur updateBeneficiaireFiles:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};
export const changePassword = async (req, res) => {
  try {
    const beneficiaireId = req.user.id;

    const { oldPassword, newPassword } = req.body;

    // 1. récupérer bénéficiaire
    const [rows] = await db.query(
      'SELECT * FROM beneficiaires WHERE id = ?',
      [beneficiaireId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    const user = rows[0];

    // 2. vérifier ancien mot de passe
    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Ancien mot de passe incorrect' });
    }

    // 3. hash nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4. update
    await db.query(
      'UPDATE beneficiaires SET password = ? WHERE id = ?',
      [hashedPassword, beneficiaireId]
    );

    res.json({ message: 'Mot de passe changé avec succès' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};