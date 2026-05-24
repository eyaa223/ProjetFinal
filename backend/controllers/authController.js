import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

/* ===========================
   🔹 Register Donneur
=========================== */
export const registerDonneur = async (req, res) => {
  try {
    const { nom, email, mot_de_passe } = req.body;

    // 1. Validation
    if (!nom || !email || !mot_de_passe) {
      return res.status(400).json({ message: 'Tous les champs sont requis' });
    }

    // 2. Vérifier email existant
    const [rows] = await db.query(
      'SELECT id FROM utilisateurs WHERE email = ?',
      [email]
    );

    if (rows.length > 0) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

    // 4. Médaille par défaut
    const medaille = 'débutante';

    // 5. Insert donneur
    await db.query(
      `INSERT INTO utilisateurs 
      (nom, email, mot_de_passe, role, medaille) 
      VALUES (?, ?, ?, ?, ?)`,
      [
        nom,
        email,
        hashedPassword,
        'donneur',
        medaille
      ]
    );

    return res.status(201).json({
      message: 'Compte donneur créé avec succès',
      medaille
    });

  } catch (err) {
    console.error('[registerDonneur] error:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

/* ===========================
   🔹 Login Utilisateur (utilisateurs only)
   POST /auth/login
   Body: { email, mot_de_passe }
=========================== */
export const loginUser = async (req, res) => {
  try {
    const email = req.body?.email;
    const mot_de_passe = req.body?.mot_de_passe ?? req.body?.password;

    if (!email || !mot_de_passe) return res.status(400).json({ message: 'Tous les champs sont requis' });

    const [rows] = await db.query('SELECT * FROM utilisateurs WHERE email = ? LIMIT 1', [email]);
    if (rows.length === 0) return res.status(400).json({ message: 'Email ou mot de passe incorrect' });

    const user = rows[0];
    const isMatch = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!isMatch) return res.status(400).json({ message: 'Email ou mot de passe incorrect' });

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      message: 'Connexion réussie',
      token,
      role: user.role,
      user: { id: user.id, nom: user.nom, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('[loginUser] error:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

/* ===========================
   ✅ Login ALL (utilisateurs + associations + beneficiaires)
   POST /auth/login-all
   Body: { email, mot_de_passe }  (also accepts { password })
=========================== */
export const loginAll = async (req, res) => {
  try {
    const email = req.body?.email;
    const mot_de_passe = req.body?.mot_de_passe ?? req.body?.password;

    if (!email || !mot_de_passe) return res.status(400).json({ message: 'Tous les champs sont requis' });

    // 1) ✅ utilisateurs (admin/avocat/donneur)
    const [uRows] = await db.query(
      'SELECT id, nom, email, mot_de_passe, role FROM utilisateurs WHERE email = ? LIMIT 1',
      [email],
    );

    if (uRows.length > 0) {
      const u = uRows[0];
      const ok = await bcrypt.compare(mot_de_passe, u.mot_de_passe);
      if (!ok) return res.status(400).json({ message: 'Email ou mot de passe incorrect' });

      const token = jwt.sign({ id: u.id, role: u.role, email: u.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

      return res.json({
        message: 'Connexion réussie',
        token,
        role: u.role,
        user: { id: u.id, nom: u.nom, email: u.email, role: u.role },
      });
    }

        // 2) ✅ associations (role association)
    const [aRows] = await db.query(
      'SELECT id, nom, email, password, telephone, categorie, adresse, description, blocked FROM associations WHERE email = ? LIMIT 1',
      [email],
    );

    if (aRows.length > 0) {
      const a = aRows[0];

      // 🔥 AJOUT IMPORTANT : compte bloqué
      if (a.blocked === 1) {
        return res.status(403).json({
          message: "Compte bloqué. Connexion refusée."
        });
      }

      const ok = await bcrypt.compare(mot_de_passe, a.password);
      if (!ok) return res.status(400).json({ message: 'Email ou mot de passe incorrect' });

      const token = jwt.sign(
        { id: a.id, role: 'association', email: a.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        message: 'Connexion réussie',
        token,
        role: 'association',
        association: {
          id: a.id,
          nom: a.nom,
          email: a.email,
          telephone: a.telephone,
          categorie: a.categorie,
          adresse: a.adresse,
          description: a.description,
        },
      });
    }

    // 3) ✅ beneficiaires (role beneficiaire) - table beneficiaires, colonne password
    const [bRows] = await db.query(
      'SELECT id, nom, prenom, email, password, telephone FROM beneficiaires WHERE email = ? LIMIT 1',
      [email],
    );

    if (bRows.length === 0) return res.status(400).json({ message: 'Email ou mot de passe incorrect' });

    const b = bRows[0];
    const ok = await bcrypt.compare(mot_de_passe, b.password);
    if (!ok) return res.status(400).json({ message: 'Email ou mot de passe incorrect' });

    const token = jwt.sign({ id: b.id, role: 'beneficiaire', email: b.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      message: 'Connexion réussie',
      token,
      role: 'beneficiaire',
      user: {
        id: b.id,
        nom: b.nom,
        prenom: b.prenom,
        email: b.email,
        telephone: b.telephone,
      },
    });
  } catch (err) {
    console.error('[loginAll] error:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};


/* ===========================
   🔹 Set password (reset token)
   POST /auth/set-password
=========================== */
export const setPassword = async (req, res) => {
  try {
    const { token, mot_de_passe } = req.body;

    const [users] = await db.execute(
      'SELECT id FROM utilisateurs WHERE reset_token = ? AND reset_token_expiration > NOW()',
      [token],
    );

    if (users.length === 0) return res.status(400).json({ message: 'Token invalide ou expiré' });

    const hashed = await bcrypt.hash(mot_de_passe, 12);

    await db.execute(
      `UPDATE utilisateurs
       SET mot_de_passe = ?, reset_token = NULL, reset_token_expiration = NULL
       WHERE id = ?`,
      [hashed, users[0].id],
    );

    return res.json({ message: 'Mot de passe défini avec succès' });
  } catch (err) {
    console.error('[setPassword] error:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};