import db from '../config/db.js';
import bcrypt from 'bcrypt';
import PDFDocument from "pdfkit";
import path from "path";
import { fileURLToPath } from "url";
import axios from 'axios';
// 🔹 Liste toutes les associations (donneur uniquement)
export const listAssociations = async (req, res) => {

  if (req.user.role !== 'donneur') {
    return res.status(403).json({
      message: 'Accès refusé'
    });
  }

  try {

    // =========================
    // 1️⃣ GET IA DATA
    // =========================
    let iaData = [];

    try {

      console.log("🤖 Calling Flask IA...");

      const response = await axios.get(
        'http://127.0.0.1:5001/classify',
        {
          timeout: 10000,
        }
      );

      iaData = Array.isArray(response.data)
        ? response.data
        : [];

      console.log(
        "✅ IA DATA RECEIVED:",
        iaData.length
      );

    } catch (err) {

      console.error(
        "❌ IA ERROR:",
        err.message
      );

      iaData = [];
    }

    // =========================
    // 2️⃣ CREATE IA MAP
    // =========================
    const iaMap = new Map();

    iaData.forEach((item) => {
      iaMap.set(
        Number(item.association_id),
        item
      );
    });

    // =========================
    // 3️⃣ GET ASSOCIATIONS
    // =========================
    const [associations] = await db.execute(`
      SELECT
        a.*,

        (
          SELECT COUNT(*)
          FROM beneficiaires b
          WHERE b.association_id = a.id
        ) AS beneficiaries_count

      FROM associations a
      WHERE a.blocked = 0
    `);

    // =========================
    // 4️⃣ MERGE DB + IA
    // =========================
    const merged = associations.map(
      (association) => {

        const ia =
          iaMap.get(Number(association.id))
          || null;

        return {

          ...association,

          // 🤖 IA
          score_impact:
            ia?.score_impact || 0,

          categorie_ia:
            ia?.categorie || "Non évalué",

          rang:
            ia?.rang || null,

          // 📊 IA STATS
          nb_beneficiaires:
            ia?.nb_beneficiaires || 0,

          nb_dons:
            ia?.nb_dons || 0,

          montant_total_collecte:
            ia?.montant_total_collecte || 0,
        };
      }
    );

    // =========================
    // 5️⃣ SORT BY IA RANK
    // =========================
    merged.sort((a, b) => {

      if (a.rang === null) return 1;
      if (b.rang === null) return -1;

      return a.rang - b.rang;
    });

    return res.status(200).json(merged);

  } catch (err) {

    console.error(
      '[listAssociations] erreur',
      err
    );

    return res.status(500).json({
      message: 'Erreur serveur'
    });
  }
};

// 🔹 Voir tous les bénéficiaires d'une association (donneur uniquement)
export const listBeneficiaires = async (req, res) => {
  if (req.user.role !== 'donneur')
    return res.status(403).json({ message: 'Accès refusé' });

  const assocId = req.params.id;

  try {
    const [beneficiaires] = await db.execute(
      `SELECT * FROM beneficiaires WHERE association_id = ?`,
      [assocId]
    );
    res.json(beneficiaires);
  } catch (err) {
    console.error('[listBeneficiaires] erreur', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ✅ CRÉER UN DON + NOTIFS
export const createDonation = async (req, res) => {
  const { beneficiaire_id, montant, numero_bancaire, message } = req.body;
  const donneur_id = req.user.id;

  if (!beneficiaire_id || !montant || !numero_bancaire) {
    return res.status(400).json({ message: 'Tous les champs sont requis' });
  }

  const cleanMessage =
    typeof message === 'string' && message.trim() ? message.trim().slice(0, 500) : null;

  try {
    const [benef] = await db.execute(
      `SELECT nom, prenom, montant_restant FROM beneficiaires WHERE id = ?`,
      [beneficiaire_id]
    );
    if (benef.length === 0)
      return res.status(404).json({ message: 'Bénéficiaire introuvable' });

    if (Number(benef[0].montant_restant) <= 0)
      return res.status(400).json({ message: 'Montant déjà collecté' });

    const montantDonEffectif = Math.min(Number(montant), Number(benef[0].montant_restant));

    // ✅ INSERT (sans updated_at)
    const [donationResult] = await db.execute(
      `INSERT INTO donations (donneur_id, beneficiaire_id, montant, numero_bancaire, message)
       VALUES (?, ?, ?, ?, ?)`,
      [donneur_id, beneficiaire_id, montantDonEffectif, numero_bancaire, cleanMessage]
    );
    const donationId = donationResult?.insertId;

    const nouveauMontantRestant = Number(benef[0].montant_restant) - montantDonEffectif;
    await db.execute(
      `UPDATE beneficiaires SET montant_restant = ? WHERE id = ?`,
      [nouveauMontantRestant, beneficiaire_id]
    );

    // Notifications beneficiaire uniquement (pas d'admin ou association)
    const notifDonMessage = `Vous avez reçu un don de ${montantDonEffectif} DT ! Montant restant : ${nouveauMontantRestant} DT.`;
    await db.execute(
      `INSERT INTO notification_beneficiaire (beneficiaire_id, type, message, is_read, created_at)
       VALUES (?, 'nouveau_don', ?, 0, NOW())`,
      [beneficiaire_id, notifDonMessage]
    );

    if (cleanMessage) {
      await db.execute(
        `INSERT INTO notification_beneficiaire (beneficiaire_id, type, message, is_read, created_at)
         VALUES (?, 'message_donneur', ?, 0, NOW())`,
        [beneficiaire_id, cleanMessage]
      );
    }
    return res.status(201).json({
      message: 'Don créé avec succès',
      donation_id: donationId,
      montant_restant: nouveauMontantRestant,
    });


  } catch (err) {
    console.error('[createDonation] erreur:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// 🔹 Liste mes dons
export const listMesDons = async (req, res) => {
  const donneur_id = req.user.id;
  try {
    const [rows] = await db.execute(
      `SELECT d.*, b.nom AS beneficiaire_nom, b.prenom AS beneficiaire_prenom, b.montant_restant
       FROM donations d
       JOIN beneficiaires b ON d.beneficiaire_id = b.id
       WHERE d.donneur_id = ?
       ORDER BY d.created_at DESC`,
      [donneur_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[listMesDons] erreur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ✅ Profil du donneur
export const getMyDonneurProfile = async (req, res) => {
  if (req.user.role !== 'donneur') {
    return res.status(403).json({ message: 'Accès refusé' });
  }
  const donneur_id = req.user.id;
  
  try {
    const [uRows] = await db.execute(
      `SELECT id, nom, email, numero_bancaire FROM utilisateurs WHERE id = ? LIMIT 1`,
      [donneur_id]
    );
    if (uRows.length === 0)
      return res.status(404).json({ message: 'Utilisateur introuvable' });

    let numero_bancaire = uRows[0].numero_bancaire || '';
    
    if (!numero_bancaire) {
      const [dRows] = await db.execute(
        `SELECT numero_bancaire FROM donations WHERE donneur_id = ? AND numero_bancaire IS NOT NULL AND numero_bancaire <> '' ORDER BY created_at DESC LIMIT 1`,
        [donneur_id]
      );
      numero_bancaire = dRows?.[0]?.numero_bancaire || '';
    }

    return res.json({ 
      id: uRows[0].id, 
      nom: uRows[0].nom, 
      email: uRows[0].email, 
      numero_bancaire 
    });
  } catch (err) {
    console.error('[getMyDonneurProfile] erreur:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ✅ Mise à jour profil (nom/email) - SANS updated_at
export const updateMyDonneurProfile = async (req, res) => {
  if (req.user.role !== 'donneur') {
    return res.status(403).json({ message: 'Accès refusé' });
  }
  const donneur_id = req.user.id;
  const { nom, email } = req.body;
  
  if (!nom || !nom.trim() || !email || !email.trim()) {
    return res.status(400).json({ message: 'Nom et email sont requis' });
  }
  
  try {
    const [exists] = await db.execute(
      `SELECT id FROM utilisateurs WHERE email = ? AND id <> ? LIMIT 1`,
      [email.trim(), donneur_id]
    );
    if (exists.length > 0)
      return res.status(409).json({ message: 'Cet email est déjà utilisé' });

    // ✅ UPDATE sans updated_at
    await db.execute(
      `UPDATE utilisateurs SET nom = ?, email = ? WHERE id = ?`,
      [nom.trim(), email.trim(), donneur_id]
    );
    return res.json({ message: 'Profil mis à jour' });
  } catch (err) {
    console.error('[updateMyDonneurProfile] erreur:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ✅ Mise à jour numéro bancaire - SANS updated_at
export const updateMyDonneurBankNumber = async (req, res) => {
  if (req.user?.role !== 'donneur') {
    return res.status(403).json({ message: 'Accès refusé' });
  }

  const donneur_id = req.user.id;
  const { numero_bancaire } = req.body;

  if (!numero_bancaire || typeof numero_bancaire !== 'string' || !numero_bancaire.trim()) {
    return res.status(400).json({ message: 'Numéro bancaire requis' });
  }

  const cleanedNumber = numero_bancaire.trim();

  try {
    // ✅ UPDATE utilisateurs (sans updated_at)
    const [userResult] = await db.execute(
      `UPDATE utilisateurs SET numero_bancaire = ? WHERE id = ?`,
      [cleanedNumber, donneur_id]
    );

    if (userResult.affectedRows === 0) {
      return res.json({ 
        message: 'Numéro bancaire déjà à jour', 
        numero_bancaire: '••••' + cleanedNumber.slice(-4) 
      });
    }

    // ✅ (Optionnel) Mettre à jour les dons existants
    await db.execute(
      `UPDATE donations SET numero_bancaire = ? WHERE donneur_id = ?`,
      [cleanedNumber, donneur_id]
    );

    return res.json({ 
      message: 'Numéro bancaire mis à jour avec succès',
      numero_bancaire: '••••' + cleanedNumber.slice(-4)
    });

  } catch (err) {
    console.error('[updateMyDonneurBankNumber] erreur:', {
      message: err.message,
      code: err.code
    });
    
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({ 
        message: 'Erreur de configuration BDD',
        hint: process.env.NODE_ENV === 'development' 
          ? 'Colonne "numero_bancaire" introuvable dans la table' 
          : undefined
      });
    }
    
    return res.status(500).json({ 
      message: 'Erreur serveur',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ============================================================================
// ✅ Gestion des messages / commentaires
// ============================================================================

export const getMyMessages = async (req, res) => {
  if (req.user.role !== 'donneur') {
    return res.status(403).json({ message: 'Accès refusé' });
  }

  try {
    const donneurId = req.user.id;
    const [rows] = await db.execute(
      `SELECT d.id, d.montant, d.message, d.created_at, b.nom as beneficiaire_nom, b.prenom as beneficiaire_prenom
       FROM donations d
       INNER JOIN beneficiaires b ON d.beneficiaire_id = b.id
       WHERE d.donneur_id = ? AND d.message IS NOT NULL AND d.message != ''
       ORDER BY d.created_at DESC`,
      [donneurId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[getMyMessages] erreur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const updateDonationMessage = async (req, res) => {
  if (req.user.role !== 'donneur') {
    return res.status(403).json({ message: 'Accès refusé' });
  }

  try {
    const donationId = req.params.id;
    const { message } = req.body;
    const donneurId = req.user.id;

    const [rows] = await db.execute(
      'SELECT id FROM donations WHERE id = ? AND donneur_id = ?',
      [donationId, donneurId]
    );
    
    if (rows.length === 0) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    await db.execute(
      'UPDATE donations SET message = ? WHERE id = ?',
      [message?.trim() || null, donationId]
    );
    
    res.json({ message: 'Message mis à jour avec succès', donationId });
  } catch (err) {
    console.error('[updateDonationMessage] erreur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const deleteDonationMessage = async (req, res) => {
  if (req.user.role !== 'donneur') {
    return res.status(403).json({ message: 'Accès refusé' });
  }

  try {
    const donationId = req.params.id;
    const donneurId = req.user.id;

    const [rows] = await db.execute(
      'SELECT id FROM donations WHERE id = ? AND donneur_id = ?',
      [donationId, donneurId]
    );
    
    if (rows.length === 0) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    await db.execute(
      'UPDATE donations SET message = NULL WHERE id = ?',
      [donationId]
    );
    
    res.json({ message: 'Message supprimé avec succès', donationId });
  } catch (err) {
    console.error('[deleteDonationMessage] erreur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
export const getTopDonneursPublic = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        u.id,
        u.nom,
        COUNT(d.id) AS nombre_dons
      FROM donations d
      JOIN utilisateurs u ON u.id = d.donneur_id
      WHERE MONTH(d.created_at) = MONTH(CURRENT_DATE())
        AND YEAR(d.created_at)  = YEAR(CURRENT_DATE())
      GROUP BY u.id, u.nom
      ORDER BY nombre_dons DESC
      LIMIT 3
    `);

    const result = rows.map((d, index) => ({
      id:          d.id,
      nom:         d.nom,
      nombre_dons: Number(d.nombre_dons),
      rank:        index + 1,
      badge:
        index === 0 ? "1er Donneur du mois" :
        index === 1 ? "2ème place" : "3ème place",
      medal:
        index === 0 ? "🥇" :
        index === 1 ? "🥈" : "🥉",
    }));

    res.json(result);
  } catch (err) {
    console.error("[topDonneurs] erreur:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const isTopDonor = async (req, res) => {
  try {
    const userId = req.user.id;

    const [top] = await db.query(`
      SELECT 
        d.donneur_id,
        SUM(d.montant) AS total_dons
      FROM donations d
      GROUP BY d.donneur_id
      ORDER BY total_dons DESC
      LIMIT 3
    `);

    const position = top.findIndex(u => u.donneur_id === userId);

    const isTop = position !== -1;

    res.json({
      isTop,
      rank: isTop ? position + 1 : null,
      message:
        position === 0
          ? "🥇 Tu es 1er du mois"
          : position === 1
          ? "🥈 Tu es 2e du mois"
          : position === 2
          ? "🥉 Tu es 3e du mois"
          : "Tu n'es pas dans le top 3"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};


export const changeDonneurPassword = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || !role) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    if (role !== 'donneur') {
      return res.status(403).json({ message: 'Accès refusé : donneur uniquement' });
    }

    const { oldPassword, newPassword } = req.body;

    // ✅ Vérifications basiques uniquement
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Ancien et nouveau mot de passe requis' });
    }

    // 🔥 SUPPRIMÉ : if (newPassword.length < 6) { ... }
    // ✅ Aucune validation de longueur ou complexité

    const [rows] = await db.execute(
      'SELECT mot_de_passe FROM utilisateurs WHERE id = ? AND role = ?',
      [userId, 'donneur']
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(oldPassword, user.mot_de_passe);

    if (!isMatch) {
      return res.status(400).json({ message: 'Ancien mot de passe incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.execute(
      'UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    return res.json({
      success: true,
      message: 'Mot de passe mis à jour avec succès 🔐'
    });

  } catch (err) {
    console.error('[changeDonneurPassword] erreur:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const generateMyCertificate = async (req, res) => {
  try {
    const userId = req.user.id;

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const logoPath = path.join(__dirname, "../upload/hh.png");
    const goldPath = path.join(__dirname, "../upload/gold.png");
    const silverPath = path.join(__dirname, "../upload/silver.png");
    const bronzePath = path.join(__dirname, "../upload/bronze.png");
    const signaturePath = path.join(__dirname, "../upload/signature.png");

    const [rows] = await db.execute(`
      SELECT 
        u.nom,
        u.email,
        SUM(d.montant) AS total_dons,
        COUNT(d.id) AS total_count
      FROM utilisateurs u
      LEFT JOIN donations d ON d.donneur_id = u.id
      WHERE u.id = ?
      GROUP BY u.id
    `, [userId]);

    const user = rows[0];

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    if (!user.total_count || user.total_count === 0) {
      return res.status(403).json({
        message: "Vous devez effectuer au moins un don pour obtenir un certificat"
      });
    }

    const total = Number(user.total_dons || 0);

    const doc = new PDFDocument({ size: "A4", margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=certificat-don.pdf");

    doc.pipe(res);

    // 🎨 cadre
    doc.rect(30, 30, 535, 770).stroke("#1f4e79");

    // 🖼️ logo
    try {
      doc.image(logoPath, 230, 45, { width: 100 });
    } catch {}

    doc.moveDown(7);

    // 🏆 titre
    doc
      .fontSize(26)
      .fillColor("#1f4e79")
      .text("CERTIFICAT OFFICIEL DE DON", { align: "center" });

    doc.moveDown(1);
    
    // Ligne séparatrice
    doc.moveTo(80, doc.y).lineTo(520, doc.y).stroke("#1f4e79");
    doc.moveDown(1.5);

    // 👤 infos
    doc.fontSize(13).fillColor("#333");
    doc.text(`Nom : ${user.nom}`, { align: "center" });
    doc.text(`Email : ${user.email}`, { align: "center" });

    doc.moveDown(1);

    // 💰 total
    doc
      .fontSize(16)
      .fillColor("#0b6623")
      .text(`Montant total : ${total.toFixed(2)} DT`, { align: "center" });

    doc.moveDown(2);

    // 🏅 BADGE
    let badgeText = "Donneur";
    let badgeImage = null;
    let badgeColor = "#6c757d";

    if (total >= 1000) {
      badgeText = "Donneur Or";
      badgeImage = goldPath;
      badgeColor = "#d4af37";
    } else if (total >= 500) {
      badgeText = "Donneur Argent";
      badgeImage = silverPath;
      badgeColor = "#c0c0c0";
    } else if (total >= 100) {
      badgeText = "Donneur Bronze";
      badgeImage = bronzePath;
      badgeColor = "#cd7f32";
    }

    // 📦 Cadre badge plus petit
    const startY = doc.y;
    
    // Remplissage de fond
    doc.rect(120, startY - 5, 360, 90).fill("#fafafa").stroke("#ddd");

    // Badge image à gauche (plus petite)
    try {
      if (badgeImage) {
        doc.image(badgeImage, 145, startY + 5, { width: 60, height: 60 });
      }
    } catch (err) {
      console.log("Badge image introuvable");
    }

    // Texte badge à droite
    doc
      .fontSize(20)
      .fillColor(badgeColor)
      .text(badgeText, 225, startY + 25, { align: "center", width: 230 });

    doc.moveDown(3.5);

    // ❤️ message
    doc
      .fontSize(12)
      .fillColor("#444")
      .text("Merci pour votre générosité et votre engagement envers notre mission.", {
        align: "center"
      });

    doc.moveDown(2);
    doc.moveTo(120, doc.y).lineTo(480, doc.y).stroke("#ddd");
    doc.moveDown(2);

    // 📅 date
    doc
      .fontSize(10)
      .fillColor("gray")
      .text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, { align: "center" });

    doc.moveDown(2);

    // ✍ SIGNATURE DE L'ORGANISME - Version agrandie
    // Ligne de séparation avant signature
    doc.moveTo(350, doc.y).lineTo(550, doc.y).stroke("#1f4e79");
    doc.moveDown(0.5);
    
    // Texte "Signature de l'organisme :"
    doc
      .fontSize(12)
      .fillColor("#1f4e79")
      .font('Helvetica-Bold')
      .text("Signature de l'organisme :", { align: "right" });
    
    doc.moveDown(0.5);
    
    // Ajout de l'image signature agrandie
    try {
      // Position et taille agrandies pour la signature
      // Ajustez ces valeurs selon vos besoins
      const signatureX = 380;     // Position X (gauche vers droite)
      const signatureY = doc.y;    // Position Y actuelle
      const signatureWidth = 160;  // Largeur agrandie
      const signatureHeight = 70;  // Hauteur agrandie
      
      doc.image(signaturePath, signatureX, signatureY, { 
        width: signatureWidth, 
        height: signatureHeight,
        align: 'right'
      });
      
      // Optionnel: Ajouter un cadre autour de la signature
      doc.rect(signatureX - 5, signatureY - 5, signatureWidth + 10, signatureHeight + 10)
         .stroke("#1f4e79");
      
      // Ajouter le nom de l'organisation sous la signature
      doc.moveDown(3.5);
      doc
        .fontSize(10)
        .fillColor("#666")
        .font('Helvetica')
      
    } catch (err) {
      console.log("Signature image introuvable, utilisation du texte par défaut");
      // Fallback au cas où l'image n'existe pas
      doc
        .fontSize(16)
        .fillColor("#1f4e79")
        .font('Helvetica-Bold')
        .text("DON'ACT Organisation", { align: "right" });
      doc
        .fontSize(10)
        .fillColor("#666")
        .font('Helvetica')
        .text("Signature électronique", { align: "right" });
    }

    doc.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};