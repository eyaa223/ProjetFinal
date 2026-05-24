import db from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { sendEmail } from './emailController.js'; // pour l’envoi email

/* ===========================
   🔹 LOGIN
=========================== */
export const login = async (req, res) => {
  const { email, mot_de_passe } = req.body;

  if (!email || !mot_de_passe) return res.status(400).json({ message: 'Email et mot de passe requis' });

  try {
    // 🔹 Table utilisateurs
    const [users] = await db.execute('SELECT * FROM utilisateurs WHERE email = ?', [email]);

    if (users.length > 0) {
      const user = users[0];

      const match = await bcrypt.compare(mot_de_passe.trim(), user.mot_de_passe);

      if (!match) return res.status(401).json({ message: 'Mot de passe incorrect' });

      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

      return res.json({
        message: 'Connexion réussie',
        token,
        role: user.role,
        email: user.email,
      });
    }

    // 🔹 Table associations
    const [assoc] = await db.execute('SELECT * FROM associations WHERE email = ?', [email]);

    if (assoc.length > 0) {
      const association = assoc[0];

      if (association.blocked === 1)
        return res.status(403).json({
          message: "Vous êtes bloqué. Contactez l'admin.",
        });

      const match = await bcrypt.compare(mot_de_passe.trim(), association.password);

      if (!match) return res.status(401).json({ message: 'Mot de passe incorrect' });

      const token = jwt.sign({ id: association.id, role: 'association' }, process.env.JWT_SECRET, { expiresIn: '1h' });

      return res.json({
        message: 'Connexion réussie',
        token,
        role: 'association',
        association: {
          id: association.id,
          nom: association.nom,
          email: association.email,
        },
      });
    }

    return res.status(401).json({ message: 'Utilisateur non trouvé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/* ===========================
   🔹 GET Associations
=========================== */
export const getAssociations = async (req, res) => {
  const search = req.query.search || '';
  const likeSearch = `%${search}%`;

  try {
    const [associations] = await db.execute(
      `SELECT *
       FROM associations
       WHERE nom LIKE ? OR email LIKE ? OR telephone LIKE ?
       ORDER BY created_at DESC`,
      [likeSearch, likeSearch, likeSearch],
    );

    res.json(associations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/* ===========================
   🔹 Block / Unblock
=========================== */
 /* ===========================
   🔹 Block / Unblock (ADMIN ONLY)
=========================== */
export const blockAssociation = async (req, res) => {
  const { id } = req.params;
  let { blocked } = req.body;

  try {
    // 🔐 1. vérifier rôle admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Accès refusé : admin uniquement'
      });
    }

    // 🔄 conversion robuste (0/1, true/false, "0"/"1")
    const value =
      blocked === true ||
      blocked === 1 ||
      blocked === "1" ||
      blocked === "true"
        ? 1
        : 0;

    // 🔥 update DB
    await db.execute(
      'UPDATE associations SET blocked = ? WHERE id = ?',
      [value, id]
    );

    return res.json({
      message: value === 1
        ? 'Association bloquée avec succès'
        : 'Association débloquée avec succès',
      blocked: value,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

/* 
   🔹 GET Donneurs  ✅ (avec montant_total) */
export const getDonneurs = async (req, res) => {
  try {
    const [donneurs] = await db.execute(
      `SELECT 
          u.id,
          u.nom,
          u.email,
          u.date_creation,
          COALESCE(SUM(d.montant), 0) AS montant_total
       FROM utilisateurs u
       LEFT JOIN donations d
         ON d.donneur_id = u.id
       WHERE u.role = 'donneur'
       GROUP BY u.id, u.nom, u.email, u.date_creation
       ORDER BY u.date_creation DESC`,
    );

    res.json(donneurs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/* ===========================
   🔹 GET Beneficiaires
=========================== */
export const getBeneficiaires = async (req, res) => {
  try {
    const [beneficiaires] = await db.execute(
      `SELECT 
          b.id,
          b.nom,
          b.prenom,
          b.email,
          b.password,
          b.telephone,
          b.adresse,
          b.description,
          b.cin,
          b.date_naissance,
          b.genre,
          b.situation_familiale,
          b.montant_a_collecter,
          b.montant_restant,
          b.association_id,
          b.created_at,
          b.updated_at,
          a.nom AS association_nom
       FROM beneficiaires b
       LEFT JOIN associations a ON b.association_id = a.id
       ORDER BY a.nom, b.nom`,
    );

    res.json(beneficiaires);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const createAvocat = async (req, res) => {
  try {
    const { nom, email } = req.body;

    if (req.user.role !== 'admin')
      return res.status(403).json({ message: 'Accès interdit' });

    // Vérifier email unique
    const [exist] = await db.execute(
      'SELECT id FROM utilisateurs WHERE email = ?',
      [email]
    );
    if (exist.length > 0)
      return res.status(400).json({ message: 'Email déjà utilisé' });

    // Générer mot de passe aléatoire
    const motDePasse = crypto.randomBytes(5).toString('hex'); // ex: "a3f9c12e4b"
    const hashedPassword = await bcrypt.hash(motDePasse, 10);

    // Insérer l'avocat avec le mot de passe hashé
    await db.execute(
      `INSERT INTO utilisateurs (nom, email, mot_de_passe, role, date_creation)
       VALUES (?, ?, ?, 'avocat', NOW())`,
      [nom, email, hashedPassword]
    );

    // Envoyer email de bienvenue
    await sendEmail(
      email,
      "Bienvenue sur la plateforme Don'Act",
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;
                  padding: 30px; border: 1px solid #e0e0e0; border-radius: 10px;">

        <h2 style="color: #2c3e50; text-align: center;">
          Bienvenue sur la plateforme Don'Act 🎉
        </h2>

        <p>Bonjour <strong>${nom}</strong>,</p>
        <p>
          Votre compte avocat a été créé avec succès par l'administrateur.
          Voici vos identifiants de connexion :
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 12px; background: #f4f4f4; font-weight: bold; width: 35%;
                       border: 1px solid #ddd;">
              📧 Email
            </td>
            <td style="padding: 12px; background: #fafafa; border: 1px solid #ddd;">
              ${email}
            </td>
          </tr>
          <tr>
            <td style="padding: 12px; background: #f4f4f4; font-weight: bold;
                       border: 1px solid #ddd;">
              🔑 Mot de passe
            </td>
            <td style="padding: 12px; background: #fafafa; border: 1px solid #ddd;
                       font-size: 18px; letter-spacing: 3px;">
              <strong>${motDePasse}</strong>
            </td>
          </tr>
        </table>

        <p style="color: #e74c3c; font-size: 13px;">
          ⚠️ Pour des raisons de sécurité, veuillez changer votre mot de passe
          dès votre première connexion.
        </p>

        <div style="text-align: center; margin-top: 24px;">
          <a href="http://localhost:3000/login"
             style="padding: 12px 28px; background-color: #27ae60; color: white;
                    text-decoration: none; border-radius: 6px; font-size: 15px;">
            Se connecter
          </a>
        </div>

        <p style="margin-top: 30px; font-size: 11px; color: #aaa; text-align: center;">
          Cet email a été envoyé automatiquement — merci de ne pas y répondre.
        </p>
      </div>
      `
    );

    res.status(201).json({ message: "Avocat créé et email de bienvenue envoyé." });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
export const changePasswordAvocat = async (req, res) => {
  try {
    const userId = req.user.id; // depuis token JWT
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Champs requis' });
    }

    // 🔹 récupérer utilisateur
    const [rows] = await db.execute(
      'SELECT * FROM utilisateurs WHERE id = ? AND role = "avocat"',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const user = rows[0];

    // 🔹 vérifier ancien mot de passe
    const match = await bcrypt.compare(oldPassword, user.mot_de_passe);
    if (!match) {
      return res.status(401).json({ message: 'Ancien mot de passe incorrect' });
    }

    // 🔹 hasher nouveau mot de passe
    const hashed = await bcrypt.hash(newPassword, 10);

    // 🔹 update
    await db.execute(
      'UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?',
      [hashed, userId]
    );

    res.json({ message: 'Mot de passe changé avec succès' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
export const getNotificationsAdmin = async (req, res) => {
  try {
    // On exclut les notifications des demandes bénéficiaires
    const [rows] = await db.query(
      `SELECT * FROM notification WHERE type != 'nouvelle_demande' ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('[getNotificationsAdmin] erreur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};