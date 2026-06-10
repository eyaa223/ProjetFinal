import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[verifyToken] missing Authorization header');
    return res.status(401).json({ message: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role }
    return next();
  } catch (err) {
    console.log('[verifyToken] error=', err?.name, err?.message);
    // ✅ 401 est plus correct pour token invalide/expiré
    return res.status(401).json({ message: 'Token invalide ou expiré' });
  }
}





/** hnee
 * ============================================
 * Middleware d'authentification OPTIONNEL
 * Ne bloque pas si pas de token
 * Utilisé pour la soumission de feedback
 * (connecté ou anonyme)
 * ============================================
 */
export function verifyTokenOptional(req, res, next) {
  const authHeader = req.headers.authorization;

  // Pas de token → continuer sans user (anonyme)
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[verifyTokenOptional] pas de token, on continue en anonyme');
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, ... }
    console.log('[verifyTokenOptional] utilisateur connecté:', decoded.id, decoded.role);
    return next();
  } catch (err) {
    // Token invalide → on continue quand même en anonyme (pas d'erreur)
    console.log('[verifyTokenOptional] token invalide, on continue en anonyme:', err?.message);
    req.user = null;
    return next();
  }
}

/**
 * ============================================
 * Middleware pour vérifier le rôle admin
 * À utiliser APRÈS verifyToken
 * ============================================
 */
export function verifyAdmin(req, res, next) {
  if (!req.user) {
    console.log('[verifyAdmin] pas d\'utilisateur dans req.user');
    return res.status(401).json({ message: 'Authentification requise' });
  }

  if (req.user.role !== 'admin') {
    console.log('[verifyAdmin] accès refusé pour le rôle:', req.user.role);
    return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
  }

  console.log('[verifyAdmin] accès admin OK pour user:', req.user.id);
  return next();
}

/**
 * ============================================
 * Middleware pour vérifier le rôle donneur
 * ============================================
 */
export function verifyDonneur(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentification requise' });
  }

  if (req.user.role !== 'donneur' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès réservé aux donneurs' });
  }

  return next();
}

/**
 * ============================================
 * Middleware pour vérifier le rôle association
 * ============================================
 */
export function verifyAssociation(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentification requise' });
  }

  if (req.user.role !== 'association' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès réservé aux associations' });
  }

  return next();
}

/**
 * ============================================
 * Middleware pour vérifier le rôle bénéficiaire
 * ============================================
 */
export function verifyBeneficiaire(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentification requise' });
  }

  if (req.user.role !== 'beneficiaire' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès réservé aux bénéficiaires' });
  }

  return next();
}