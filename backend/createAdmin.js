import connectDB from './config/db.js'
import bcrypt from 'bcrypt';

async function createAdmin() {
  try {
    const nom = 'Admin Principal';
    const email = 'admin@plateforme.com';
    const motDePasse = '12345';

    // Hash du mot de passe
    const hash = await bcrypt.hash(motDePasse, 10);

    // Vérifier si l'admin existe déjà
    const [rows] = await db.execute("SELECT * FROM utilisateurs WHERE role = 'admin'");
    if (rows.length > 0) {
      console.log('Admin déjà créé !');
      return;
    }

    // Insertion de l'admin
    await db.execute(
      "INSERT INTO utilisateurs (nom, email, mot_de_passe, role) VALUES (?, ?, ?, 'admin')",
      [nom, email, hash]
    );

    console.log('Admin créé avec succès !');
  } catch (err) {
    console.error('Erreur création admin :', err);
  }
}

export default createAdmin;
