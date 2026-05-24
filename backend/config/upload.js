import multer from 'multer';
import path from 'path';
import fs from 'fs';

export const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './upload';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({ storage });