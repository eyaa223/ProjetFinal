import db from '../config/db.js';
import bcrypt from 'bcrypt';

export const setPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) return res.status(400).json({ message: "Mot de passe requis" });

  try {
    // Vérifier si le token existe et n'est pas expiré
    const [users] = await db.execute(
      `SELECT id, reset_token_expiration FROM utilisateurs 
       WHERE reset_token = ? AND role = 'avocat'`,
      [token]
    );

    if (users.length === 0)
      return res.status(400).json({ message: "Token invalide ou expiré" });

    const user = users[0];

    if (new Date(user.reset_token_expiration) < new Date())
      return res.status(400).json({ message: "Token expiré" });

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Mettre à jour le mot de passe et supprimer le token
    await db.execute(
      `UPDATE utilisateurs 
       SET mot_de_passe = ?, reset_token = NULL, reset_token_expiration = NULL
       WHERE id = ?`,
      [hashedPassword, user.id]
    );

    res.json({ message: "Mot de passe défini avec succès !" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};