// controllers/demandes_association.js
import db from '../config/db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';

// Config Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASSWORD },
});

// Config Multer
export const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './upload';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
export const upload = multer({ storage });

// ============================================================================
// 🔹 CREATE — Créer une demande d'association
// ============================================================================
export const createDemande = async (req, res) => {
  const { nom_association, email, telephone, adresse, responsable, categorie, description } = req.body;
  const files = req.files || {};

  const logo = files['logo']?.[0]?.filename || null;

  if (
    !nom_association ||
    !email ||
    !telephone ||
    !adresse ||
    !responsable ||
    !categorie ||
    !description ||
    !files['doc_statut'] ||
    !files['doc_autorisation'] ||
    !files['doc_registre'] ||
    !files['doc_cin']
  ) {
    return res.status(400).json({
      message: "Tous les champs et documents sont obligatoires (catégorie + description incluses)",
    });
  }

  try {
    const [exist] = await db.execute('SELECT id FROM demandes_association WHERE email = ?', [email]);
    if (exist.length > 0) {
      return res.status(400).json({ message: 'Cette association a déjà envoyé une demande' });
    }

    const [result] = await db.execute(
      `INSERT INTO demandes_association 
      (nom_association,email,telephone,adresse,responsable,categorie,description,logo,doc_statut,doc_autorisation,doc_registre,doc_cin,statut_admin,statut_avocat)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'en attente','en attente')`,
      [
        nom_association,
        email,
        telephone,
        adresse,
        responsable,
        categorie,
        description,
        logo,
        files['doc_statut'][0].filename,
        files['doc_autorisation'][0].filename,
        files['doc_registre'][0].filename,
        files['doc_cin'][0].filename,
      ]
    );

    const demandeId = result.insertId;

    // ✅ CORRECTION : backticks autour du template string
    const notifMsg = `Nouvelle demande reçue de l'association "${nom_association}"`;
    await db.execute('INSERT INTO notification (demande_id, type, message) VALUES (?, ?, ?)', [
      demandeId,
      'demande_ajoute_admin',
      notifMsg,
    ]);
    await db.execute('INSERT INTO notification (demande_id, type, message) VALUES (?, ?, ?)', [
      demandeId,
      'demande_ajoute_avocat',
      notifMsg,
    ]);

    res.status(201).json({ message: 'Demande envoyée avec succès', demandeId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================================
// 🔹 READ — Voir toutes les demandes
// ============================================================================
export const getAllDemandes = async (req, res) => {
  if (!['avocat', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Accès refusé' });
  }

  try {
    const [rows] = await db.execute('SELECT * FROM demandes_association ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================================
// 🔹 UPDATE — Modifier statut (admin/avocat) + Emails
// ============================================================================
export const updateStatut = async (req, res) => {
  const { statut_avocat, statut_admin, reason } = req.body;
  const id = req.params.id;

  try {
    // -------------------------------------------------------------------------
    // 🔹 Statut avocat
    // -------------------------------------------------------------------------
    if (req.user.role === 'avocat' && statut_avocat) {
      await db.execute('UPDATE demandes_association SET statut_avocat = ? WHERE id = ?', [statut_avocat, id]);

      const [demande] = await db.execute('SELECT nom_association FROM demandes_association WHERE id = ?', [id]);
      // ✅ CORRECTION : backticks autour du template string
      const message = `Avocat a changé le statut de "${demande?.[0]?.nom_association}" en ${statut_avocat}`;
      await db.execute('INSERT INTO notification (demande_id, type, message) VALUES (?, ?, ?)', [
        id,
        'statut_avocat',
        message,
      ]);

      return res.json({ message: 'Statut avocat mis à jour et notification créée' });
    }

    // -------------------------------------------------------------------------
    // 🔹 Statut admin
    // -------------------------------------------------------------------------
    if (req.user.role === 'admin' && statut_admin) {
      await db.execute('UPDATE demandes_association SET statut_admin = ? WHERE id = ?', [statut_admin, id]);

      // Récupérer la demande une seule fois pour les deux cas
      const [rows] = await db.execute('SELECT * FROM demandes_association WHERE id = ?', [id]);
      const demande = rows[0];
      if (!demande) return res.status(404).json({ message: 'Demande non trouvée' });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      // =======================================================================
      // ✅ CAS : DEMANDE ACCEPTÉE
      // =======================================================================
      if (statut_admin === 'acceptee') {
        const [exist] = await db.execute('SELECT id FROM associations WHERE email = ?', [demande.email]);

        if (exist.length === 0) {
          const temporaryPassword = Math.random().toString(36).slice(-8);
          const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

          await db.execute(
            `INSERT INTO associations (nom, email, password, telephone, adresse, responsable, categorie, logo, description)
             VALUES (?,?,?,?,?,?,?,?,?)`,
            [
              demande.nom_association,
              demande.email,
              hashedPassword,
              demande.telephone,
              demande.adresse,
              demande.responsable,
              demande.categorie || 'other',
              demande.logo || null,
              demande.description || null,
            ]
          );

          // ✅ Email d'acceptation
          try {
            await transporter.sendMail({
              // ✅ CORRECTION : backticks + guillemets pour le format "Nom" <email>
              from: `"DON'ACT" <${process.env.EMAIL}>`,
              to: demande.email,
              subject: "✅ Votre demande a été acceptée — DON'ACT",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 10px;">
                  <h2 style="color: #4CAF50; margin-bottom: 5px;">🎉 Félicitations !</h2>
                  <p style="font-size: 16px;">Bonjour <strong>${demande.nom_association}</strong>,</p>
                  <p>Nous avons le plaisir de vous informer que votre demande d'inscription sur la plateforme <strong>DON'ACT</strong> a été <span style="color: #4CAF50;"><strong>acceptée</strong></span>.</p>

                  <div style="background: #f9f9f9; border-left: 4px solid #4CAF50; padding: 15px 20px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0 0 8px 0;"><strong>🔐 Vos identifiants de connexion :</strong></p>
                    <p style="margin: 0;">📧 Email : <strong>${demande.email}</strong></p>
                    <p style="margin: 0;">🔑 Mot de passe temporaire : <strong>${temporaryPassword}</strong></p>
                  </div>

                  <p>Veuillez vous connecter et changer votre mot de passe dès que possible.</p>

                  <div style="text-align: center; margin: 25px 0;">
                    <a href="${frontendUrl}/login"
                       style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 15px;">
                      Se connecter
                    </a>
                  </div>

                  <p style="color: #888; font-size: 13px; margin-top: 30px;">Cordialement,<br/>L'équipe <strong>DON'ACT</strong></p>
                </div>
              `,
            });
            console.log('✅ Email acceptation envoyé à', demande.email);
          } catch (emailErr) {
            console.error('❌ Erreur email acceptation:', emailErr.message);
          }
        }

        return res.json({ message: 'Statut admin mis à jour et compte créé' });
      }

      // =======================================================================
      // ❌ CAS : DEMANDE REJETÉE
      // =======================================================================
      if (statut_admin === 'rejete') {
        try {
          await transporter.sendMail({
            // ✅ CORRECTION : backticks + guillemets pour le format "Nom" <email>
            from: `"DON'ACT" <${process.env.EMAIL}>`,
            to: demande.email,
            subject: "❌ Résultat de votre demande — DON'ACT",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px;">
                <h2 style="color: #e53935;">📋 Demande refusée</h2>
                <p>Bonjour <strong>${demande.nom_association}</strong>,</p>

                <p>Votre demande d'inscription a été <strong style="color:#e53935;">refusée</strong>.</p>

                ${reason ? `
                  <div style="background:#fff3f3;padding:10px;border-left:4px solid #e53935;">
                    <strong>Motif :</strong> ${reason}
                  </div>
                ` : ''}

                <p>Vous pouvez soumettre une nouvelle demande à tout moment.</p>
              </div>
            `,
          });

          console.log('✅ Email rejet envoyé à', demande.email);
        } catch (emailErr) {
          console.error('❌ Erreur email rejet:', emailErr.message);
        }

        return res.json({ message: 'Statut admin mis à jour — demande rejetée' });
      }

      // Statut invalide
      return res.status(400).json({ message: 'Statut invalide' });
    }

    return res.status(403).json({ message: 'Accès refusé' });

  } catch (err) {
    console.error('❌ Erreur updateStatut:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================================
// 🔹 DOWNLOAD — Télécharger un fichier joint à une demande
// ============================================================================
export const downloadFile = async (req, res) => {
  const { id, field } = req.params;

  if (!['doc_statut', 'doc_autorisation', 'doc_registre', 'doc_cin', 'logo'].includes(field)) {
    return res.status(400).json({ message: 'Champ invalide' });
  }

  try {
    const [rows] = await db.execute('SELECT * FROM demandes_association WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Demande non trouvée' });
    if (!['avocat', 'admin'].includes(req.user.role)) return res.status(403).json({ message: 'Accès refusé' });

    const fileName = rows[0][field];
    if (!fileName) return res.status(404).json({ message: 'Fichier introuvable' });

    const filePath = path.join('./upload', fileName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Fichier introuvable' });

    res.download(filePath, fileName);
  } catch (err) {
    console.error('❌ Erreur downloadFile:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};