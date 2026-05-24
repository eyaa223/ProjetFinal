import express    from 'express';
import bcrypt     from 'bcryptjs';
import crypto     from 'crypto';
import nodemailer from 'nodemailer';
import db         from '../config/db.js';
const router = express.Router();
// ── Config ──────────────────────────────────────────────────
const TOKEN_EXPIRY_MIN = parseInt(process.env.TOKEN_EXPIRY_MINUTES || '60', 10);
const FRONTEND_URL     = process.env.FRONTEND_URL || 'http://localhost:3000';
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// ── Mapping : rôle ENUM → table MySQL → colonne password → filtre rôle ──
const ROLE_CONFIG = {
  association:  { 
    table: 'associations', 
    passwordColumn: 'password',
    roleFilter: null  // Pas de filtre supplémentaire
  },
  beneficiaire: { 
    table: 'beneficiaires', 
    passwordColumn: 'password',
    roleFilter: null 
  },
  donneur:      { 
    table: 'utilisateurs', 
    passwordColumn: 'mot_de_passe',
    roleFilter: 'donneur'  // Filtre WHERE role = 'donneur'
  },
  avocat:       { 
    table: 'utilisateurs', 
    passwordColumn: 'mot_de_passe',
    roleFilter: 'avocat'   // Filtre WHERE role = 'avocat'
  },
};

// ── Recherche acteur dans les tables réelles ─────────
async function findActorByEmail(email) {
  console.log('\n🔍 [findActorByEmail] Recherche pour:', email);

  for (const [role, config] of Object.entries(ROLE_CONFIG)) {
    // Construire la requête avec filtre rôle si nécessaire
    let query = `SELECT id, email FROM \`${config.table}\` WHERE email = ?`;
    const params = [email];
    
    if (config.roleFilter) {
      query += ` AND role = ?`;
      params.push(config.roleFilter);
    }
    query += ` LIMIT 1`;
    
    const [rows] = await db.execute(query, params);
    
    console.log(`  → ${config.table}${config.roleFilter ? ` (role='${config.roleFilter}')` : ''}: ${rows.length} résultat(s)`);
    
    if (rows.length > 0) {
      console.log(`  ✅ Trouvé : role='${role}', table='${config.table}'`);
      return {
        email: rows[0].email,
        role: role,              // 'association', 'beneficiaire', 'donneur', 'avocat' → pour l'ENUM
        table: config.table,     // 'associations', 'beneficiaires', 'utilisateurs' → pour SQL
        passwordColumn: config.passwordColumn,
        roleFilter: config.roleFilter,  // null ou 'donneur'/'avocat' pour l'UPDATE
      };
    }
  }

  console.log('  ❌ Email non trouvé dans aucune table');
  return null;
}

// ── Helpers ─────────────────────────────────────────────────
function generateSecureToken() {
  return crypto.randomBytes(64).toString('hex'); // 128 chars hex
}

function expiresAt() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + TOKEN_EXPIRY_MIN);
  return d;
}

async function sendResetEmail(toEmail, resetLink) {
  await transporter.sendMail({
from: `"DON'ACT" <${process.env.EMAIL}>`,
    to: toEmail,
    subject: "Réinitialisation de votre mot de passe — DON'ACT",
    text: `Bonjour,\n\nCliquez sur ce lien pour réinitialiser votre mot de passe (valable ${TOKEN_EXPIRY_MIN} min) :\n${resetLink}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n\nL'équipe DON'ACT`,
    html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><meta name="referrer" content="no-referrer"/></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.07);">
        <tr>
          <td style="padding:36px 40px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:28px;letter-spacing:2px;font-weight:800;">DON<span style="color:#fbbf24;">'</span>ACT</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Portail sécurisé d'action solidaire</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#f1f5f9;font-size:20px;margin:0 0 16px;">Réinitialisation de mot de passe</h2>
            <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 24px;">
              Vous avez demandé la réinitialisation de votre mot de passe.<br/>
              Cliquez sur le bouton ci-dessous pour en définir un nouveau.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;">
                Réinitialiser mon mot de passe →
              </a>
            </div>
            <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 8px;">
              ⏱ Ce lien est valable <strong style="color:#94a3b8;">${TOKEN_EXPIRY_MIN} minutes</strong>.
            </p>
            <p style="color:#64748b;font-size:13px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
            <p style="color:#334155;font-size:12px;margin:0;">© ${new Date().getFullYear()} DON'ACT — Tous droits réservés</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

// ════════════════════════════════════════════════════════════
//  POST /auth/forgot-password
// ════════════════════════════════════════════════════════════
router.post('/forgot-password', async (req, res) => {
  console.log('\n📨 [forgot-password] Body reçu:', req.body);
  try {
    const email = (req.body.email || '').trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Adresse email invalide.' });
    }

    const actor = await findActorByEmail(email);
    console.log('📦 actor trouvé:', actor ? { email: actor.email, role: actor.role, table: actor.table } : 'null');

    // Réponse générique pour éviter l'énumération d'emails
    if (!actor) {
      return res.status(200).json({ message: 'Si cet email existe, un lien vous a été envoyé.' });
    }

    // Invalider les anciens tokens non utilisés
    await db.execute(
      `UPDATE password_reset_tokens SET used = 1 WHERE actor_email = ? AND used = 0`,
      [email]
    );

    // Créer le nouveau token
    const token = generateSecureToken();
    const expiresOn = expiresAt();

    console.log('💾 INSERT token:', {
      actor_email: email,
      actor_table: actor.role,  // ENUM value: 'association', 'beneficiaire', 'donneur', 'avocat'
      table_sql: actor.table,   // Real table: 'associations', 'beneficiaires', 'utilisateurs'
      roleFilter: actor.roleFilter,
      passwordColumn: actor.passwordColumn
    });

    await db.execute(
      `INSERT INTO password_reset_tokens (token, actor_email, actor_table, expires_at, used)
       VALUES (?, ?, ?, ?, 0)`,
      [token, email, actor.role, expiresOn]  // actor.role = valeur ENUM valide
    );

    // Vérification immédiate
    const [check] = await db.execute(
      `SELECT actor_table FROM password_reset_tokens WHERE token = ? LIMIT 1`,
      [token]
    );
    console.log('✅ Vérification INSERT actor_table:', check[0]?.actor_table);

    // Envoyer l'email (sans bloquer la réponse)
    const resetLink = `${FRONTEND_URL}/reset-password/${token}`;
    sendResetEmail(email, resetLink).catch(err => 
      console.error('[sendResetEmail]', err)
    );

    return res.status(200).json({ message: 'Si cet email existe, un lien vous a été envoyé.' });

  } catch (err) {
    console.error('[forgot-password] ERREUR:', err);
    return res.status(500).json({ message: 'Erreur serveur. Veuillez réessayer.' });
  }
});

// ════════════════════════════════════════════════════════════
//  GET /auth/verify-reset-token/:token
// ════════════════════════════════════════════════════════════
router.get('/verify-reset-token/:token', async (req, res) => {
  console.log('\n🔐 [verify-reset-token] token reçu (10 premiers chars):', req.params.token?.slice(0, 10));
  try {
    const { token } = req.params;

    if (!token || token.length !== 128) {
      console.log('❌ Token longueur invalide:', token?.length);
      return res.status(400).json({ message: 'Token invalide.' });
    }

    const [rows] = await db.execute(
      `SELECT id, actor_table FROM password_reset_tokens
       WHERE token = ? AND used = 0 AND expires_at > NOW()
       LIMIT 1`,
      [token]
    );

    console.log('🔍 verify résultat:', rows.length, 'ligne(s)', rows[0] ? `actor_table: ${rows[0].actor_table}` : '');

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Token invalide ou expiré.' });
    }

    return res.status(200).json({ valid: true });

  } catch (err) {
    console.error('[verify-reset-token] ERREUR:', err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ════════════════════════════════════════════════════════════
//  POST /auth/reset-password
// ════════════════════════════════════════════════════════════
router.post('/reset-password', async (req, res) => {
  console.log('\n🔑 [reset-password] Body reçu, token (10 chars):', req.body?.token?.slice(0, 10));
  try {
    const { token, newPassword } = req.body;

    if (!token || token.length !== 128) {
      console.log('❌ Token longueur invalide:', token?.length);
      return res.status(400).json({ message: 'Token invalide.' });
    }

    // Validation mot de passe
    if (
      !newPassword ||
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      return res.status(400).json({
        message: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial.',
      });
    }
    // Récupérer le token valide
    const [rows] = await db.execute(
      `SELECT id, actor_email, actor_table
       FROM password_reset_tokens
       WHERE token = ? AND used = 0 AND expires_at > NOW()
       LIMIT 1`,
      [token]
    );
    console.log('🔍 reset token lookup:', rows.length, 'ligne(s)');
    if (rows.length > 0) {
      console.log('  actor_email:', rows[0].actor_email);
      console.log('  actor_table (ENUM):', rows[0].actor_table);
    }
    if (rows.length === 0) {
      return res.status(400).json({ message: 'Token invalide ou expiré.' });
    }
    const { id: tokenId, actor_email, actor_table: role } = rows[0];
    // Récupérer la config pour ce rôle
    const config = ROLE_CONFIG[role];
    console.log('🔑 Config pour role', role, ':', config);
    if (!config) {
      console.log('❌ Rôle non configuré:', role, '| Roles valides:', Object.keys(ROLE_CONFIG));
      return res.status(403).json({ message: 'Action non autorisée.' });
    }
    // Hacher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    // Transaction pour mettre à jour le mot de passe + invalider le token
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      // Construire la requête UPDATE avec filtre rôle si nécessaire
      let updateSql = `UPDATE \`${config.table}\` SET \`${config.passwordColumn}\` = ? WHERE email = ?`;
      const updateParams = [hashedPassword, actor_email];
      if (config.roleFilter) {
        updateSql += ` AND role = ?`;
        updateParams.push(config.roleFilter);
      }
      console.log('📝 SQL UPDATE:', updateSql, '| Params:', updateParams);
      await conn.execute(updateSql, updateParams);
      console.log('✅ Mot de passe mis à jour dans la table', config.table);
      await conn.execute(
        `UPDATE password_reset_tokens SET used = 1 WHERE id = ?`,
        [tokenId]
      );
      console.log('✅ Token marqué comme utilisé');
      await conn.commit();
      console.log('✅ Transaction commitée avec succès');
    } catch (txErr) {
      await conn.rollback();
      console.error('❌ Transaction rollback:', txErr);
      throw txErr;
    } finally {
      conn.release();
    }
    return res.status(200).json({ message: 'Mot de passe mis à jour avec succès.' });
  } catch (err) {
    console.error('[reset-password] ERREUR:', err);
    return res.status(500).json({ message: 'Erreur serveur. Veuillez réessayer.' });
  }
});
export default router;