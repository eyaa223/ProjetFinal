// controllers/feedback.controller.js
import db       from '../config/db.js';
import { spawn } from 'child_process';
import path      from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Chemin vers le script Python IA ──────────────────────────────────────────
const AI_SCRIPT = path.join(__dirname, '..', 'ia_service', 'ai.py');

// ─── Appel du script Python (avec fallback python3) ───────────────────────────
const callPythonAI = (payload) => {
  return new Promise((resolve, reject) => {

    const trySpawn = (cmd) =>
      new Promise((res, rej) => {
        const py = spawn(cmd, [AI_SCRIPT]);
        let stdout = '';
        let stderr = '';

        py.stdout.on('data', (d) => { stdout += d.toString(); });
        py.stderr.on('data', (d) => { stderr += d.toString(); });

        py.on('close', (code) => {
          if (stderr) console.warn(`⚠️  [${cmd}] stderr:`, stderr.trim());
          try {
            const result = JSON.parse(stdout.trim());
            if (!result.success) rej(new Error(result.error || 'Erreur script Python'));
            else res(result);
          } catch {
            rej(new Error(`Réponse invalide du script Python (code ${code}): ${stdout.slice(0, 300)}`));
          }
        });

        py.on('error', (err) => rej(err));
        py.stdin.write(JSON.stringify(payload));
        py.stdin.end();
      });

    // Essayer python puis python3
    trySpawn('python')
      .then(resolve)
      .catch((err) => {
        if (err.code === 'ENOENT') {
          return trySpawn('python3').then(resolve).catch(reject);
        }
        reject(err);
      });
  });
};

// ─── Mapping user_type frontend → rôle Python ─────────────────────────────────
// ✅ Utilise les valeurs avec majuscule (cohérent avec la base de données)
const ROLE_MAP = {
  Donneur:      'donor',
  Beneficiaire: 'beneficiary',
  Association:  'association',
  Visiteur:     'visitor',
};

// ─── Helper : Normaliser user_type ─────────────────────────────────────────────
// ✅ Accepte "donneur", "Donneur", "DONNEUR" → retourne "Donneur"
const normalizeUserType = (type) => {
  if (!type) return null;
  const lower = type.toLowerCase();
  const map = {
    'donneur':      'Donneur',
    'beneficiaire': 'Beneficiaire',
    'association':  'Association',
    'visiteur':     'Visiteur',
  };
  return map[lower] || null;
};

// ─── GET PUBLIC FEEDBACKS ──────────────────────────────────────────────────────
export const getPublic = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const [rows] = await db.query(
      `SELECT
         id, user_name, user_type, rating,
         message, ai_improved, created_at
       FROM feedbacks
       WHERE is_public = TRUE AND status = 'approved'
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit]
    );

    const [[stats]] = await db.query(
      `SELECT
         COUNT(*)                                                    AS total,
         ROUND(AVG(rating), 1)                                       AS avg_rating,
         SUM(CASE WHEN ai_improved = 1 THEN 1 ELSE 0 END)           AS ai_improved_count
       FROM feedbacks
       WHERE is_public = TRUE AND status = 'approved'`
    );

    res.json({ success: true, feedbacks: rows, stats });
  } catch (err) {
    console.error('❌ getPublic:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── AI IMPROVE ───────────────────────────────────────────────────────────────
export const improveWithAI = async (req, res) => {
  try {
    const { message, rating, user_type } = req.body;

    // ── Validations ────────────────────────────────────────────────────────────
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message requis' });
    }
    if (message.trim().length < 5) {
      return res.status(400).json({ success: false, error: 'Message trop court (min 5 caractères)' });
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Note invalide (1-5 requis)' });
    }

    // ✅ Normaliser user_type
    const normalizedType = normalizeUserType(user_type);
    const role = ROLE_MAP[normalizedType] || 'visitor';

    console.log(`🤖 improveWithAI → user_type=${user_type} normalized=${normalizedType} role=${role} rating=${rating}`);

    const result = await callPythonAI({
      message: message.trim(),
      rating:  parseInt(rating),
      role,
    });

    console.log(`✅ IA a répondu via ${result.model}`);

    res.json({
      success:          true,
      improved_message: result.message,
      model:            result.model,
      original_length:  result.original_length,
      improved_length:  result.improved_length,
    });

  } catch (err) {
    console.error('❌ improveWithAI:', err.message);

    const msg = err.message || '';
    if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('resource_exhausted')) {
      return res.status(429).json({
        success: false,
        error:   'Quota Gemini dépassé. Créez une nouvelle clé sur aistudio.google.com.',
      });
    }

    res.status(500).json({
      success:  false,
      error:    msg || 'Erreur interne du service IA',
      fallback: req.body?.message || null,
    });
  }
};

// ─── TEST AI ───────────────────────────────────────────────────────────────────
export const testAI = async (req, res) => {
  try {
    const result = await callPythonAI({
      message: 'Plateforme très bien conçue, je suis satisfait.',
      rating:  5,
      role:    'donor',
    });
    res.json({ success: true, message: '✅ Script Python + Gemini fonctionnent !', result });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};

// ─── SUBMIT FEEDBACK (SANS CONNEXION REQUISE) ─────────────────────────────────
export const submit = async (req, res) => {
  try {
    const { 
      user_type, 
      rating, 
      message, 
      original_message, 
      ai_improved,
      guest_name
    } = req.body;

    // ✅ Normaliser user_type pour accepter minuscule/majuscule
    const normalizedUserType = normalizeUserType(user_type);
    
    // ── Validations ────────────────────────────────────────────────────────────
    if (!normalizedUserType) {
      return res.status(400).json({ 
        success: false, 
        error: 'user_type invalide (doit être: Donneur, Beneficiaire, Association ou Visiteur)' 
      });
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Note invalide (1-5)' });
    }
    if (!message || message.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'Message trop court (min 10 caractères)' });
    }

    // ── Déterminer le nom à afficher ───────────────────────────────────────────
    let finalUserName = 'Anonyme';
    
    if (guest_name && guest_name.trim()) {
      finalUserName = guest_name.trim();
    }
    
    // ✅ Si user connecté et pas de guest_name, récupérer depuis la DB
    if (req.user?.id && !guest_name) {
      try {
        // ✅ Utilise normalizedUserType (avec majuscule)
        const TABLE_MAP = {
          'Donneur':      { table: 'utilisateurs',   nameCol: 'full_name' },
          'Beneficiaire': { table: 'beneficiaires',  nameCol: 'nom_complet' },
          'Association':  { table: 'associations',   nameCol: 'nom_association' },
          'Visiteur':     null,
        };

        const cfg = TABLE_MAP[normalizedUserType];
        if (cfg) {
          const [rows] = await db.query(
            `SELECT ${cfg.nameCol} AS name
             FROM ${cfg.table}
             WHERE id = ?
             LIMIT 1`,
            [req.user.id]
          );
          if (rows[0]?.name) {
            finalUserName = rows[0].name;
          }
        }
      } catch (err) {
        console.warn('⚠️  Impossible de récupérer les infos utilisateur:', err.message);
      }
    }

    // ── Insertion ──────────────────────────────────────────────────────────────
    const [result] = await db.query(
      `INSERT INTO feedbacks
         (user_id, user_type, user_name, user_email,
          rating, message, original_message, ai_improved,
          status, is_public)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', 1)`,
      [
        req.user?.id || null,
        normalizedUserType, // ✅ Stocke avec majuscule (Donneur, etc.)
        finalUserName,
        req.user?.email || null,
        parseInt(rating),
        message.trim(),
        (original_message || message).trim(),
        ai_improved ? 1 : 0,
      ]
    );

    console.log(`✅ Feedback #${result.insertId} créé par ${finalUserName} (${normalizedUserType})`);

    res.status(201).json({
      success:   true,
      id:        result.insertId,
      user_name: finalUserName,
      user_type: normalizedUserType,
    });

  } catch (err) {
    console.error('❌ submit:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET USER FEEDBACKS ────────────────────────────────────────────────────────
export const getUserFeedbacks = async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Accès refusé' });
    }

    const [rows] = await db.query(
      `SELECT id, user_type, rating, message, ai_improved, status, created_at
       FROM feedbacks
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ success: true, feedbacks: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── ADMIN — ALL FEEDBACKS ─────────────────────────────────────────────────────
export const getAllForAdmin = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      `SELECT * FROM feedbacks
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM feedbacks`
    );

    res.json({ success: true, feedbacks: rows, total, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── ADMIN STATS ───────────────────────────────────────────────────────────────
export const getStats = async (req, res) => {
  try {
    const [[global]] = await db.query(
      `SELECT
         COUNT(*)                                          AS total,
         ROUND(AVG(rating), 2)                            AS average,
         SUM(CASE WHEN ai_improved = 1 THEN 1 ELSE 0 END) AS ai_count,
         SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END) AS pending,
         SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
         SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
       FROM feedbacks`
    );

    const [byRole] = await db.query(
      `SELECT user_type, COUNT(*) AS count, ROUND(AVG(rating),2) AS avg
       FROM feedbacks
       GROUP BY user_type`
    );

    const [byRating] = await db.query(
      `SELECT rating, COUNT(*) AS count
       FROM feedbacks
       GROUP BY rating
       ORDER BY rating`
    );

    res.json({ success: true, stats: { ...global, by_role: byRole, by_rating: byRating } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── UPDATE STATUS ─────────────────────────────────────────────────────────────
export const updateStatus = async (req, res) => {
  try {
    const { id }     = req.params;
    const { status } = req.body;

    if (!['approved', 'pending', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Statut invalide' });
    }

    const [result] = await db.query(
      `UPDATE feedbacks SET status = ? WHERE id = ?`,
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Feedback non trouvé' });
    }

    res.json({ success: true, message: `Statut mis à jour → ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── DELETE FEEDBACK ───────────────────────────────────────────────────────────
export const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `DELETE FROM feedbacks WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Feedback non trouvé' });
    }

    res.json({ success: true, message: 'Feedback supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};