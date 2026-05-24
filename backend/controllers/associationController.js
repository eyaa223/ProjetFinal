// controllers/associationController.js
import db from '../config/db.js';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import bcrypt from 'bcrypt';

/* ================= ADMIN ================= */

// 🔹 Get all associations (admin)
export const getAllAssociations = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé : Admin uniquement' });
    }

    const [associations] = await db.execute(
      `SELECT id, nom, email, telephone, adresse, responsable, categorie, logo, description, blocked, created_at 
       FROM associations 
       ORDER BY created_at DESC`,
    );

    res.json(associations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/* ================= PUBLIC ================= */

// 🔹 Public list (avec filtres + IA + bénéficiaires count)
export const getPublicAssociations = async (req, res) => {
  try {
    console.log("🚀 API /public called");

    const { categories } = req.query;

    // =========================
    // 1️⃣ GET IA DATA (SAFE)
    // =========================
    let iaData = [];

    try {
      console.log("🤖 Calling Flask IA...");

      const response = await axios.get('http://127.0.0.1:5001/classify', {
        timeout: 10000,
      });

      iaData = response.data || [];

      console.log("✅ IA DATA RECEIVED:", iaData.length);

    } catch (err) {
      console.error("❌ IA ERROR:", err.message);
      iaData = [];
    }

    // =========================
    // 2️⃣ BUILD SQL WITH FILTER + BENEFICIARIES COUNT
    // =========================
    let sql = `
      SELECT
        a.id,
        a.nom,
        a.email,
        a.telephone,
        a.adresse,
        a.categorie,
        a.logo,
        a.description,
        a.created_at,
        -- ✅ AJOUT : Compter les bénéficiaires par association
        (SELECT COUNT(*) FROM beneficiaires b WHERE b.association_id = a.id) AS beneficiaries_count
      FROM associations a
      WHERE a.blocked = 0
    `;

    const params = [];

    // 🔥 FILTER CATEGORIES
    if (categories) {
      const list = categories.split(',');
      sql += ` AND a.categorie IN (${list.map(() => '?').join(',')})`;
      params.push(...list);
    }

    const [rows] = await db.execute(sql, params);

    console.log("📦 MYSQL ASSOCIATIONS:", rows.length);

    // =========================
    // 3️⃣ MERGE IA + DB
    // =========================
    const merged = rows.map((a) => {
      const ia = iaData.find(
        (x) => Number(x.association_id) === Number(a.id)
      );

      return {
        ...a,
        // 🔥 IA FIELDS
        score_impact: ia ? ia.score_impact : 0,
        categorie_ia: ia ? ia.categorie : "Non évalué",
        rang: ia ? ia.rang : null,
        // 📊 fallback stats
        nb_beneficiaires: ia ? ia.nb_beneficiaires : 0,
        nb_dons: ia ? ia.nb_dons : 0,
        montant_total_collecte: ia ? ia.montant_total_collecte : 0,
        // ✅ beneficiaries_count est déjà dans 'a' grâce au SELECT
      };
    });

    console.log("🔥 FINAL MERGED RESULT READY");

    return res.json(merged);

  } catch (err) {
    console.error("💥 getPublicAssociations ERROR:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};
// 🔹 Public get by ID — ✅ CORRECTION COMPLÈTE
export const getPublicAssociationById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(
      `SELECT 
        a.id,
        a.nom,
        a.email,
        a.telephone,
        a.adresse,
        a.categorie,
        a.logo,
        a.description,
        a.created_at,

        -- ✅ Nombre de bénéficiaires
        (SELECT COUNT(*) 
         FROM beneficiaires b 
         WHERE b.association_id = a.id) AS beneficiaries_count,

        -- ✅ NOMBRE DE DONS
        (SELECT COUNT(DISTINCT d.id)
         FROM donations d
         JOIN beneficiaires b ON d.beneficiaire_id = b.id
         WHERE b.association_id = a.id) AS don_count,

        -- ✅ MONTANT TOTAL DES DONS
        (SELECT COALESCE(SUM(d.montant), 0)
         FROM donations d
         JOIN beneficiaires b ON d.beneficiaire_id = b.id
         WHERE b.association_id = a.id) AS montant_total_dons,

        -- ✅ NOMBRE DE COTISATIONS (membres à jour)
        -- Si vous avez une table 'cotisations', utilisez-la
        -- Sinon, on considère que les dons = cotisations
        (SELECT COUNT(DISTINCT d.id)
         FROM donations d
         JOIN beneficiaires b ON d.beneficiaire_id = b.id
         WHERE b.association_id = a.id) AS nb_cotisations,

        -- Target amount
        (SELECT COALESCE(SUM(dbf.montant_a_collecter),0)
         FROM demandes_beneficiaire dbf
         WHERE dbf.association_id = a.id) AS target_amount
         
      FROM associations a
      WHERE a.blocked = 0 AND a.id = ?`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Association introuvable' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur getPublicAssociationById:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/* ================= ADMIN DOWNLOAD ================= */

// 🔹 Download documents (depuis demandes_association)
export const downloadAssociationDocument = async (req, res) => {
  const { id, doc } = req.params;
  const allowedFields = ['doc_statut', 'doc_autorisation', 'doc_registre', 'doc_cin', 'logo'];

  if (!allowedFields.includes(doc)) {
    return res.status(400).json({ message: 'Champ invalide' });
  }

  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const [rows] = await db.execute(`SELECT ${doc} FROM demandes_association WHERE id = ?`, [id]);
    if (!rows.length) return res.status(404).json({ message: 'Association introuvable' });

    const filename = rows[0][doc];
    if (!filename) return res.status(404).json({ message: 'Fichier introuvable' });

    const filePath = path.join('./upload', filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Fichier introuvable' });

    res.download(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/* ================= ASSOCIATION ================= */

// 🔹 Récupérer tous les bénéficiaires de l'association connectée
export const getMyBeneficiaires = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'association') {
      return res.status(403).json({ message: 'Accès refusé : Association uniquement' });
    }

    const assocId = req.user.id;

    const [beneficiaires] = await db.execute(
      `SELECT 
        id,
        nom,
        prenom,
        email,
        telephone,
        adresse,
        description,
        cin,
        date_naissance,
        genre,
        situation_familiale,
        montant_a_collecter,
        montant_restant,
        COALESCE(pourcentage, 0) AS pourcentage,
        created_at,
        updated_at
       FROM beneficiaires
       WHERE association_id = ?
       ORDER BY created_at DESC`,
      [assocId],
    );

    res.status(200).json(beneficiaires);
  } catch (err) {
    console.error('Erreur getMyBeneficiaires:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// 🔹 Modifier le pourcentage d'un bénéficiaire (association uniquement)
export const updatePourcentage = async (req, res) => {
  const { id } = req.params;
  let { pourcentage } = req.body;

  const association_id = req.user.id;

  try {
    if (req.user.role !== 'association') {
      return res.status(403).json({ message: 'Accès refusé : Association uniquement' });
    }

    pourcentage = Number(pourcentage);

    if (isNaN(pourcentage)) return res.status(400).json({ message: 'Le pourcentage doit être un nombre' });
    if (pourcentage < 0 || pourcentage > 100) return res.status(400).json({ message: 'Le pourcentage doit être entre 0 et 100' });

    const [benef] = await db.execute(`SELECT id FROM beneficiaires WHERE id = ? AND association_id = ?`, [id, association_id]);
    if (benef.length === 0) return res.status(403).json({ message: 'Vous ne pouvez modifier que vos bénéficiaires' });

    await db.execute(`UPDATE beneficiaires SET pourcentage = ? WHERE id = ?`, [pourcentage, id]);

    res.status(200).json({ message: 'Pourcentage mis à jour avec succès', pourcentage });
  } catch (err) {
    console.error('Erreur updatePourcentage:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
// 🔹 Donneurs de mon association
export const getMyDonneurs = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'association') {
      return res.status(403).json({ message: 'Accès refusé : Association uniquement' });
    }

    const associationId = req.user.id;

    const [beneficiaires] = await db.execute('SELECT id, nom, prenom FROM beneficiaires WHERE association_id = ?', [associationId]);
    if (!beneficiaires.length) return res.json([]);

    const beneficiaireIds = beneficiaires.map((b) => b.id);

    const [donneurs] = await db.execute(
      `SELECT DISTINCT 
          u.id AS donneur_id, 
          u.nom AS donneur_nom, 
          u.email AS donneur_email,
          d.montant, 
          d.created_at AS date_don,
          b.nom AS beneficiaire_nom, 
          b.prenom AS beneficiaire_prenom
       FROM utilisateurs u
       JOIN donations d ON d.donneur_id = u.id
       JOIN beneficiaires b ON b.id = d.beneficiaire_id
       WHERE u.role='donneur'
       AND d.beneficiaire_id IN (${beneficiaireIds.map(() => '?').join(',')})`,
      beneficiaireIds,
    );
    res.status(200).json(donneurs);
  } catch (err) {
    console.error('Erreur getMyDonneurs:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ✅ GET /associations/me : retourne les champs nécessaires
export const getMyAssociationProfile = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'association') {
      return res.status(403).json({ message: 'Accès refusé : Association uniquement' });
    }
    const assocId = req.user.id;
    
    // 1️⃣ GET BASE PROFILE
    const [rows] = await db.execute(
      `SELECT 
        id, 
        nom, 
        email, 
        telephone, 
        adresse, 
        description, 
        logo, 
        categorie
       FROM associations
       WHERE id = ?
       LIMIT 1`,
      [assocId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Association introuvable' });
    }
    const profile = rows[0];
        let iaData = null;
    try {
      const response = await axios.get('http://127.0.0.1:5001/classify', {
        timeout: 8000,
      });
      iaData = response.data?.find(
        (x) => Number(x.association_id) === Number(assocId)
      );
    } catch (err) {
      console.error("IA error:", err.message);
    }
        const enrichedProfile = {
      ...profile,
      // 🔥 SCORE IA
      score_impact: iaData ? iaData.score_impact : 0,
      // 🏆 RANG IA
      rang: iaData ? iaData.rang : null,
      // 📊 CATEGORY IA
      categorie_ia: iaData ? iaData.categorie : "Non évalué",
      // 👥 stats (optionnel)
      nb_beneficiaires: iaData ? iaData.nb_beneficiaires : 0,
      nb_dons: iaData ? iaData.nb_dons : 0,
      montant_total_collecte: iaData ? iaData.montant_total_collecte : 0,
    };
    return res.json(enrichedProfile);
  } catch (err) {
    console.error('Erreur getMyAssociationProfile:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ✅ PUT /associations/me : modifier nom + description + categorie + telephone + adresse
export const updateMyAssociationProfile = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'association') {
      return res.status(403).json({ message: 'Accès refusé : Association uniquement' });
    }
    const assocId = req.user.id;
    const { nom, description, categorie, telephone, adresse } = req.body;
    
    if (!nom || !nom.trim()) {
      return res.status(400).json({ message: 'Le nom est obligatoire' });
    }
    
    await db.execute(
      `UPDATE associations
       SET nom = ?, description = ?, categorie = ?, telephone = ?, adresse = ?
       WHERE id = ?`,
      [nom.trim(), description ?? null, categorie ?? null, telephone ?? null, adresse ?? null, assocId],
    );
    
    return res.json({ message: 'Profil mis à jour' });
  } catch (err) {
    console.error('Erreur updateMyAssociationProfile:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ✅ PUT /associations/me/logo : upload image et update DB.logo
export const updateMyAssociationLogo = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'association') {
      return res.status(403).json({ message: 'Accès refusé : Association uniquement' });
    }
    const assocId = req.user.id;
    
    if (!req.file?.filename) {
      return res.status(400).json({ message: 'Aucun fichier reçu (champ: logo)' });
    }
    
    const [rows] = await db.execute(`SELECT logo FROM associations WHERE id = ? LIMIT 1`, [assocId]);
    const oldLogo = rows?.[0]?.logo;
    
    await db.execute(`UPDATE associations SET logo = ? WHERE id = ?`, [req.file.filename, assocId]);
    
    if (oldLogo) {
      const oldPath = path.join(path.resolve(), 'upload', oldLogo);
      fs.unlink(oldPath, () => {});
    }
    
    return res.json({ message: 'Logo mis à jour', logo: req.file.filename });
  } catch (err) {
    console.error('Erreur updateMyAssociationLogo:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// 🔐 CHANGE PASSWORD ASSOCIATION
export const changeAssociationPassword = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'association') {
      return res.status(403).json({ message: 'Accès refusé : Association uniquement' });
    }
    const associationId = req.user.id;
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Ancien et nouveau mot de passe requis' });
    }
    
    // 🔍 get current password
    const [rows] = await db.execute(
      'SELECT password FROM associations WHERE id = ?',
      [associationId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Association introuvable' });
    }
    
    const isMatch = await bcrypt.compare(oldPassword, rows[0].password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Ancien mot de passe incorrect' });
    }
    
    // 🔒 hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.execute(
      'UPDATE associations SET password = ? WHERE id = ?',
      [hashedPassword, associationId]
    );
    
    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    console.error('changeAssociationPassword error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};