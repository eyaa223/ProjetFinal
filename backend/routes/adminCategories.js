import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import db from "../config/db.js"; // ⚠️ adapte si ton fichier DB est ailleurs

const router = express.Router();

// Dossier upload (même dossier que tes logos)
const uploadDir = path.join(path.resolve(), "upload");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ok = ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.mimetype);
  cb(ok ? null : new Error("Only images allowed"), ok);
};

const upload = multer({ storage, fileFilter });

/** GET all categories (admin) */
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, value, label, icon FROM categories ORDER BY id ASC");
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

/** ✅ CREATE (avec gestion duplicate value) */
router.post("/", async (req, res) => {
  const { value, label } = req.body;
  if (!value || !label) return res.status(400).json({ message: "value et label requis" });

  try {
    const [r] = await db.query(
      "INSERT INTO categories (value, label) VALUES (?, ?)",
      [String(value).trim(), String(label).trim()]
    );
    res.status(201).json({ id: r.insertId, value, label, icon: null });
  } catch (e) {
    console.error(e);

    // ✅ cas doublon
    if (e?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: `La catégorie "${value}" existe déjà. Choisis une autre value (ex: food-2) ou modifie la catégorie existante.`,
      });
    }

    res.status(500).json({ message: "Erreur serveur" });
  }
});

/** UPDATE category */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { value, label } = req.body;
  if (!value || !label) return res.status(400).json({ message: "value et label requis" });

  try {
    await db.query(
      "UPDATE categories SET value=?, label=? WHERE id=?",
      [String(value).trim(), String(label).trim(), Number(id)]
    );
    res.json({ id: Number(id), value, label });
  } catch (e) {
    console.error(e);

    if (e?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: `La value "${value}" est déjà utilisée par une autre catégorie.`,
      });
    }

    res.status(500).json({ message: "Erreur serveur" });
  }
});

/** DELETE category */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query("SELECT icon FROM categories WHERE id=?", [Number(id)]);
    const icon = rows?.[0]?.icon;

    await db.query("DELETE FROM categories WHERE id=?", [Number(id)]);

    // supprimer l'image associée si existe
    if (icon) {
      const p = path.join(uploadDir, icon);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

/** UPLOAD category icon */
router.post("/:id/icon", upload.single("icon"), async (req, res) => {
  const { id } = req.params;
  if (!req.file?.filename) return res.status(400).json({ message: "icon requis" });

  try {
    // (optionnel) supprimer ancienne image
    const [rows] = await db.query("SELECT icon FROM categories WHERE id=?", [Number(id)]);
    const oldIcon = rows?.[0]?.icon;

    await db.query("UPDATE categories SET icon=? WHERE id=?", [req.file.filename, Number(id)]);

    if (oldIcon) {
      const oldPath = path.join(uploadDir, oldIcon);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    res.json({ id: Number(id), icon: req.file.filename });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;