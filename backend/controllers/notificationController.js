import db from '../config/db.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import { upload } from '../config/upload.js';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});


export const createDemande = [
  upload.fields([
    { name: 'doc_identite', maxCount: 1 },
    { name: 'doc_autre', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        nom,
        prenom,
        email,
        telephone,
        description,
        association_id,
        cin,
        date_naissance,
        adresse,
        genre,
        situation_familiale,
        montant_a_collecter,
      } = req.body;

      const files = req.files || {};

      // Vérifier que l'association existe
      const [assoc] = await db.query('SELECT * FROM associations WHERE id = ? AND blocked = 0', [
        association_id,
      ]);
      if (assoc.length === 0) {
        return res.status(404).json({ message: 'Association non trouvée ou bloquée' });
      }

      // Vérifier si la demande existe déjà
      const [existing] = await db.query('SELECT * FROM demandes_beneficiaire WHERE cin = ? OR email = ?', [
        cin,
        email,
      ]);
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Vous avez déjà envoyé une demande' });
      }

      // Fichiers uploadés
      const doc_identite = files['doc_identite']?.[0]?.filename || null;
      const doc_autre = files['doc_autre']?.[0]?.filename || null;

      // Créer la demande
      const [result] = await db.query(
        `INSERT INTO demandes_beneficiaire
        (nom, prenom, email, telephone, description, association_id, cin, date_naissance, adresse, genre, situation_familiale,
         montant_a_collecter, montant_restant, statut, doc_identite, doc_autre, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW(), NOW())`,
        [
          nom,
          prenom,
          email,
          telephone,
          description,
          association_id,
          cin,
          date_naissance,
          adresse,
          genre,
          situation_familiale,
          montant_a_collecter,
          montant_a_collecter,
          doc_identite,
          doc_autre,
        ],
      );

      const demandeId = result.insertId;

      // Notification pour l'association
      const notifMessage = `Nouvelle demande de bénéficiaire : ${nom} ${prenom}`;

await db.execute(
  `INSERT INTO notification
  (demande_beneficiaire_id, association_id, type, message, is_read, created_at, reference_type)
  VALUES (?, ?, ?, ?, 0, NOW(), ?)`,
  [
    demandeId,
    association_id,
    'nouvelle_demande',
    notifMessage,
    'beneficiaire',
  ],
);

      return res.status(201).json({
        message: 'Demande envoyée avec succès et notification créée',
        demandeId,
      });
    } catch (err) {
      console.error('Erreur createDemande:', err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  },
];

// 🔹 Récupérer toutes les notifications visibles pour l'utilisateur
export const getNotifications = async (req, res) => {
  try {
    let query = `
      SELECT 
        n.id, 
        n.demande_beneficiaire_id,
        n.association_id,
        n.donneur_id,
        n.donation_id,
        n.type, 
        n.message, 
        n.is_read, 
        n.created_at,
        n.reference_type,
        b.nom AS beneficiaire_nom,
        b.prenom AS beneficiaire_prenom,
        b.montant_a_collecter,
        a.nom AS nom_association
      FROM notification n
      LEFT JOIN demandes_beneficiaire b 
        ON n.demande_beneficiaire_id = b.id
      LEFT JOIN associations a 
        ON n.association_id = a.id
      WHERE 1=1
    `;

    const params = [];

    // ADMIN : ne voit jamais les notifications de demande bénéficiaire
    if (req.user.role === 'admin') {
      query += ` AND n.type <> 'nouvelle_demande'`;
    }
    // ASSOCIATION : ne voit que ses propres notifications de demande bénéficiaire
    else if (req.user.role === 'association') {
      query += ` AND n.association_id = ? AND n.type = 'nouvelle_demande'`;
      params.push(req.user.id);
    }
    // AVOCAT : notifications spécifiques
    else if (req.user.role === 'avocat') {
      query += `
        AND n.type IN (
          'demande_ajoute_avocat',
          
          'beneficiaire_modifie',
          'beneficiaire_ajoute_avocat'
        )
      `;
    }
    // DONNEUR : notifications qui le concernent
    else if (req.user.role === 'donneur') {
      query += ` AND n.donneur_id = ?`;
      params.push(req.user.id);
    }
    // BÉNÉFICIAIRE : notifications qui le concernent (optionnel)
    else if (req.user.role === 'beneficiaire') {
      query += ` AND n.demande_beneficiaire_id = (SELECT id FROM demandes_beneficiaire WHERE email = ?)`;
      params.push(req.user.email);
    }
    else {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    query += ` ORDER BY n.created_at DESC LIMIT 50`;

    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error('[getNotifications] erreur', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
export const markAsRead = async (req, res) => {
  try {
    const id = req.params.id;

    await db.execute(
      "UPDATE notification SET is_read = 1 WHERE id = ?",
      [id]
    );

    res.json({ message: "Notification marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// 🔹 Récupérer toutes les demandes
export const getAllDemandes = async (req, res) => {
  try {
    let query = `
      SELECT d.*, a.nom AS association_nom
      FROM demandes_beneficiaire d
      LEFT JOIN associations a ON d.association_id = a.id
    `;
    const params = [];

    if (req.user.role === 'association') {
      query += ` WHERE d.association_id = ? `;
      params.push(req.user.id);
    }

    query += ` ORDER BY d.created_at DESC`;
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// 🔹 Récupérer une demande par ID
export const getDemandeById = async (req, res) => {
  try {
    const demandeId = req.params.id;
    const [rows] = await db.query(
      `SELECT d.*, a.nom AS association_nom
       FROM demandes_beneficiaire d
       LEFT JOIN associations a ON d.association_id = a.id
       WHERE d.id = ?`,
      [demandeId],
    );

    if (rows.length === 0) return res.status(404).json({ message: 'Demande introuvable' });

    if (req.user.role === 'association' && rows[0].association_id !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé : demande pour une autre association' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// 🔹 Changer le statut d'une demande
export const updateStatutDemande = async (req, res) => {
  try {
    const demandeId = req.params.id;
    const { statut } = req.body;

    if (req.user.role !== 'association') {
      return res.status(403).json({ message: 'Accès refusé : seulement pour les associations' });
    }
    if (!['accepted', 'rejected'].includes(statut)) {
      return res.status(400).json({ message: "Le statut doit être 'accepted' ou 'rejected'" });
    }

    const [rows] = await db.query(
      'SELECT * FROM demandes_beneficiaire WHERE id = ? AND association_id = ?',
      [demandeId, req.user.id],
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Demande introuvable ou non autorisée' });

    const demande = rows[0];

    // Mettre à jour le statut
    await db.query('UPDATE demandes_beneficiaire SET statut = ?, updated_at = NOW() WHERE id = ?', [
      statut,
      demandeId,
    ]);

    // Créer compte bénéficiaire et envoyer mail si accepté
    if (statut === 'accepted') {
      const [exist] = await db.query('SELECT * FROM beneficiaires WHERE email = ?', [demande.email]);
      if (exist.length === 0) {
        const generatedPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);

        // ✅ PARTIE 2: on enregistre le lien vers la demande
        await db.query(
          `INSERT INTO beneficiaires
          (nom, prenom, email, password, telephone, description, cin, date_naissance, adresse, genre, situation_familiale,
           montant_a_collecter, montant_restant, association_id, demande_beneficiaire_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            demande.nom,
            demande.prenom,
            demande.email,
            hashedPassword,
            demande.telephone,
            demande.description,
            demande.cin,
            demande.date_naissance,
            demande.adresse,
            demande.genre,
            demande.situation_familiale,
            demande.montant_a_collecter,
            demande.montant_a_collecter,
            demande.association_id,
            demande.id, // ✅ lien demande
          ],
        );

        await transporter.sendMail({
          from: process.env.EMAIL,
          to: demande.email,
          subject: 'Demande acceptée ✅',
          text: `Bonjour ${demande.prenom} ${demande.nom},\n\nVotre demande a été acceptée.\nEmail: ${demande.email}\nMot de passe: ${generatedPassword}`,
        });
      }
    }

    res.json({ message: `Statut de la demande mis à jour : ${statut} et compte bénéficiaire créé si accepté` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /demandes_beneficiaire/download/:id/:field
export const downloadFile = async (req, res) => {
  const { id, field } = req.params;

  // ✅ Seuls ces champs sont autorisés
  if (!['doc_identite', 'doc_autre'].includes(field)) {
    return res.status(400).json({ message: 'Champ invalide' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM demandes_beneficiaire WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Demande introuvable' });

    const demande = rows[0];

    // 🔹 Vérifier que l’utilisateur est l’association liée à la demande
    if (req.user.role !== 'association' || req.user.id !== demande.association_id) {
      return res.status(403).json({ message: 'Accès refusé : cette demande ne vous appartient pas' });
    }

    const fileName = demande[field];
    if (!fileName) return res.status(404).json({ message: 'Fichier introuvable' });

    const filePath = path.join('./upload', fileName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Fichier introuvable sur le serveur' });

    res.download(filePath, fileName);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};