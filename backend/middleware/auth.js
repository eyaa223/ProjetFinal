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