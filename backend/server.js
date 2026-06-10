import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import adminRoutes from './routes/admin.js';
import demandesRoutes from './routes/demandes.js';
import associationsRoutes from './routes/associations.js';
import dashboardRoutes from './routes/dashboard.js';
import publicRoutes from './routes/public.js';
import notificationRoutes from './routes/notification.js';
import authRoutes from './routes/auth.js';
import demandesBeneficiaireRoutes from './routes/demandes_beneficiaire.js';
import beneficiaireAuthRoutes from './routes/beneficiaireAuth.js';
import beneficiaireRoutes from './routes/beneficiaires.js';
import donneurRoutes from './routes/donneur.js';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import categoriesRoutes from './routes/categories.js';
import adminCategoriesRoutes from './routes/adminCategories.js';
import iaRoutes from './routes/ia.js';
import authPasswordReset from './routes/authPasswordReset.js';
import feedbackRoutes from './routes/feedback.routes.js';
dotenv.config();
const app = express();
// Parser JSON & form-data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
/**
 * ✅ CORS
 * Autorise localhost + l’IP de ton téléphone (change si ton IP change)
 */

app.use(cors({
  origin: function (origin, callback) {
    callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use('/auth', authPasswordReset);
app.use('/auth', authRoutes);

// Dossier uploads
app.use('/upload', express.static(path.join(path.resolve(), 'upload')));


app.use('/admin', adminRoutes);
app.use('/demandes', demandesRoutes);
app.use('/associations', associationsRoutes);
app.use('/association', dashboardRoutes);
app.use('/public', publicRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/demandes_beneficiaire', demandesBeneficiaireRoutes);

// ✅ Beneficiaire
app.use('/beneficiaire', beneficiaireAuthRoutes);
app.use('/beneficiaire', beneficiaireRoutes);

// ✅ Autres
app.use('/api', donneurRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chatbot', chatRoutes);
app.use('/categories', categoriesRoutes);
app.use('/admin/categories', adminCategoriesRoutes);
app.use('/api/ia', iaRoutes);
app.use('/api/feedback', feedbackRoutes);

// Test serveur
app.get('/', (req, res) => {
  res.send('✅ Backend association sécurisé OK');
});
app.get('/beneficiaire/_ping', (req, res) => res.json({ ok: true }));

// Lancer serveur
const PORT = process.env.PORT || 5000;

// ✅ écoute sur 0.0.0.0 pour accès réseau local
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});