// controllers/demandes_beneficiaire.js
import db from '../config/db.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import { upload } from '../config/upload.js';
import dotenv from 'dotenv';

dotenv.config();

// Configuration de l'envoi d'emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// ============================================================================
// 🔹 CREATE — Soumettre une nouvelle demande bénéficiaire
// ============================================================================
export const createDemande = [
  upload.fields([
    { name: 'doc_identite', maxCount: 1 },
    { name: 'doc_autre', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        nom, prenom, email, telephone, description, association_id,
        cin, date_naissance, adresse, genre, situation_familiale, montant_a_collecter,
      } = req.body;

      const files = req.files || {};

      // 1️⃣ Vérifier que l'association existe et n'est pas bloquée
      const [assoc] = await db.query(
        'SELECT id, nom FROM associations WHERE id = ? AND blocked = 0',
        [association_id]
      );
      if (assoc.length === 0) {
        return res.status(404).json({ message: 'Association non trouvée ou bloquée' });
      }

      // 2️⃣ Vérifier si une demande existe déjà (seulement pending ou accepted)
      const [existing] = await db.query(
        `SELECT id, statut FROM demandes_beneficiaire 
         WHERE (cin = ? OR email = ?) AND statut IN ('pending', 'accepted')
         ORDER BY created_at DESC LIMIT 1`,
        [cin, email]
      );
      
      if (existing.length > 0) {
        const status = existing[0].statut;
        if (status === 'accepted') {
          return res.status(400).json({ 
            message: 'Un compte bénéficiaire existe déjà avec cet email. Veuillez vous connecter.' 
          });
        }
        return res.status(400).json({ 
          message: 'Une demande est déjà en cours de traitement. Veuillez attendre la réponse.' 
        });
      }

      // 3️⃣ Fichiers uploadés
      const doc_identite = files['doc_identite']?.[0]?.filename || null;
      const doc_autre = files['doc_autre']?.[0]?.filename || null;

      // 4️⃣ Créer la demande
      const [result] = await db.query(
        `INSERT INTO demandes_beneficiaire
        (nom, prenom, email, telephone, description, association_id, cin, date_naissance, adresse, genre, situation_familiale,
         montant_a_collecter, montant_restant, statut, doc_identite, doc_autre, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW(), NOW())`,
        [
          nom, prenom, email, telephone, description, association_id,
          cin, date_naissance, adresse, genre, situation_familiale,
          montant_a_collecter, montant_a_collecter,
          doc_identite, doc_autre,
        ]
      );

      const demandeId = result.insertId;

      // 5️⃣ Notification pour l'association
      const notifMessage = `Nouvelle demande de bénéficiaire : ${nom} ${prenom}`;
      await db.execute(
        `INSERT INTO notification
        (demande_beneficiaire_id, association_id, type, message, is_read, created_at, reference_type)
        VALUES (?, ?, ?, ?, 0, NOW(), ?)`,
        [demandeId, association_id, 'nouvelle_demande', notifMessage, 'beneficiaire']
      );

      return res.status(201).json({
        message: 'Demande envoyée avec succès',
        demandeId,
      });

    } catch (err) {
      console.error('❌ Erreur createDemande:', err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  },
];

// ============================================================================
// 🔹 READ — Récupérer toutes les demandes
// ============================================================================
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

// ============================================================================
// 🔹 READ — Récupérer une demande par ID
// ============================================================================
export const getDemandeById = async (req, res) => {
  try {
    const demandeId = req.params.id;
    const [rows] = await db.query(
      `SELECT d.*, a.nom AS association_nom
       FROM demandes_beneficiaire d
       LEFT JOIN associations a ON d.association_id = a.id
       WHERE d.id = ?`,
      [demandeId]
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

// ============================================================================
// 🔹 UPDATE — Changer le statut d'une demande (ACCEPTED / REJECTED)
// ✅ Emails améliorés + gestion d'erreur sécurisée
// ============================================================================
export const updateStatutDemande = async (req, res) => {
  try {
    const demandeId = req.params.id;
    const { statut, reason } = req.body; // ✅ reason optionnel pour le refus

    // Vérifications de sécurité
    if (req.user.role !== 'association') {
      return res.status(403).json({ message: 'Accès refusé : seulement pour les associations' });
    }
    if (!['accepted', 'rejected'].includes(statut)) {
      return res.status(400).json({ message: "Le statut doit être 'accepted' ou 'rejected'" });
    }

    // Récupérer la demande
    const [rows] = await db.query(
      'SELECT * FROM demandes_beneficiaire WHERE id = ? AND association_id = ?',
      [demandeId, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Demande introuvable ou non autorisée' });
    }

    const demande = rows[0];

    // Mettre à jour le statut dans la BDD
    await db.query(
      'UPDATE demandes_beneficiaire SET statut = ?, updated_at = NOW() WHERE id = ?',
      [statut, demandeId]
    );

    // =========================================================================
    // ✅ CAS 1 : DEMANDE ACCEPTÉE → Créer compte + email professionnel
    // =========================================================================
    if (statut === 'accepted') {
      const [exist] = await db.query('SELECT id FROM beneficiaires WHERE email = ?', [demande.email]);
      
      if (exist.length === 0) {
        // Générer un mot de passe temporaire sécurisé
        const temporaryPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

        // Créer le compte bénéficiaire
        await db.query(
          `INSERT INTO beneficiaires
          (nom, prenom, email, password, telephone, description, cin, date_naissance, adresse, genre, 
           situation_familiale, montant_a_collecter, montant_restant, association_id, demande_beneficiaire_id, 
           created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            demande.nom, demande.prenom, demande.email, hashedPassword, demande.telephone,
            demande.description, demande.cin, demande.date_naissance, demande.adresse,
            demande.genre, demande.situation_familiale, demande.montant_a_collecter,
            demande.montant_a_collecter, demande.association_id, demande.id,
          ]
        );

        // 📧 Email d'acceptation (dans try/catch pour ne pas bloquer)
        try {
          await transporter.sendMail({
            from: `"DON'ACT" <${process.env.EMAIL}>`,
            to: demande.email,
            subject: '✅ Votre demande a été acceptée — DON\'ACT',
            text: `
🎉 Félicitations ${demande.prenom} !

Votre demande d'aide a été acceptée par l'association.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔐 VOS IDENTIFIANTS DE CONNEXION

   Email        : ${demande.email}
   Mot de passe : ${temporaryPassword}

   🔗 Lien de connexion :
   ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ CONSEIL DE SÉCURITÉ
Pour protéger votre compte, nous vous recommandons de modifier 
votre mot de passe dès votre première connexion.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💙 Bienvenue parmi nous !
N'hésitez pas à nous contacter si vous avez la moindre question.

Cordialement,
L'équipe DON'ACT
Plateforme d'action solidaire

📧 ${process.env.EMAIL}
🌐 ${process.env.FRONTEND_URL || 'http://localhost:3000'}
`.trim()
          });
          console.log('✅ Email acceptation envoyé à', demande.email);
        } catch (emailErr) {
          console.error('❌ Erreur envoi email acceptation:', emailErr.message);
          // ✅ Ne pas bloquer : le statut et le compte sont déjà créés
        }
      }
    }

    // =========================================================================
    // ❌ CAS 2 : DEMANDE REFUSÉE → Email professionnel avec motif
    // =========================================================================
    else if (statut === 'rejected') {
      // 📧 Email de refus (dans try/catch pour ne pas bloquer)
      try {
        await transporter.sendMail({
          from: `"DON'ACT" <${process.env.EMAIL}>`,
          to: demande.email,
          subject: '📋 Résultat de votre demande — DON\'ACT',
          text: `
📋 Résultat de votre demande

Bonjour ${demande.prenom} ${demande.nom},

Après examen attentif de votre dossier, nous sommes au regret de vous informer 
que votre demande n'a pas pu être acceptée pour le moment.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${reason ? `📌 MOTIF DU REFUS :

${reason}

` : ''}🔄 VOUS POUVEZ SOUMETTRE UNE NOUVELLE DEMANDE

Votre adresse email reste disponible pour une nouvelle soumission. 
Nous vous invitons à :

   • Vérifier que tous les documents sont lisibles et complets
   • Corriger les informations si nécessaire
   • Resoumettre votre demande via le formulaire

   🔗 Nouvelle demande :
   ${process.env.FRONTEND_URL || 'http://localhost:3000'}/demande-beneficiaire

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💙 Merci pour votre compréhension.
N'hésitez pas à nous recontacter si vous avez des questions.

Cordialement,
L'équipe Donneur du bonheur
Plateforme d'action solidaire

📧 ${process.env.EMAIL}
🌐 ${process.env.FRONTEND_URL || 'http://localhost:3000'}
`.trim()
        });
        console.log('✅ Email refus envoyé à', demande.email);
      } catch (emailErr) {
        console.error('❌ Erreur envoi email refus:', emailErr.message);
        // ✅ Ne pas bloquer : le statut est déjà mis à jour
      }
    }

    // Réponse finale
    res.json({ 
      message: statut === 'accepted' 
        ? 'Demande acceptée : compte bénéficiaire créé et email envoyé' 
        : 'Demande refusée : email de notification envoyé',
      statut,
      demandeId
    });

  } catch (err) {
    console.error('❌ Erreur updateStatutDemande:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================================
// 🔹 DOWNLOAD — Télécharger un fichier joint à une demande
// ============================================================================
export const downloadFile = async (req, res) => {
  const { id, field } = req.params;

  // ✅ Seuls ces champs sont autorisés au téléchargement
  if (!['doc_identite', 'doc_autre'].includes(field)) {
    return res.status(400).json({ message: 'Champ invalide' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM demandes_beneficiaire WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Demande introuvable' });

    const demande = rows[0];

    // 🔹 Vérifier que l'utilisateur est l'association liée à la demande
    if (req.user.role !== 'association' || req.user.id !== demande.association_id) {
      return res.status(403).json({ message: 'Accès refusé : cette demande ne vous appartient pas' });
    }

    const fileName = demande[field];
    if (!fileName) return res.status(404).json({ message: 'Fichier introuvable' });

    const filePath = path.join('./upload', fileName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Fichier introuvable sur le serveur' });

    res.download(filePath, fileName);
  } catch (err) {
    console.error('❌ Erreur downloadFile:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};