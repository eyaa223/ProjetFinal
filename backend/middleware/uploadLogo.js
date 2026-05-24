import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(path.resolve(), 'upload');

// ✅ créer le dossier upload si absent
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext || '.png';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Format invalide. Utilise PNG/JPG/WEBP.'), false);
};

export const uploadLogo = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
});