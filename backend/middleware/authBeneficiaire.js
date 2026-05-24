import jwt from 'jsonwebtoken';

export const verifyBeneficiaireToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Token manquant" });

  const token = authHeader.split(' ')[1]; // "Bearer <token>"
  if (!token) return res.status(401).json({ message: "Token invalide" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'beneficiaire') return res.status(403).json({ message: "Accès refusé" });

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
};
