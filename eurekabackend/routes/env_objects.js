const express = require("express");
const pool = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const router = express.Router();
require("dotenv").config();

const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).json({ message: "Accesso negato" });
  try {
    const verified = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ message: "Token non valido" });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Permessi insufficienti" });
    }
    next();
  };
};

// GET /env_objects - Ottiene tutti gli env_objects accessibili
router.get("/", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  try {
    let query, params;
    if (userRole === "admin") {
      query = "SELECT * FROM env_objects WHERE deleted = 0";
      params = [];
    } else if (userRole === "editor") {
      query = `
        SELECT eo.*
        FROM env_objects eo
        JOIN environments e ON eo.environment_id = e.id
        WHERE eo.deleted = 0 AND e.created_by = ?
      `;
      params = [userId];
    } else {
      return res.status(403).json({ message: "Non hai i permessi per accedere a questa risorsa" });
    }
    const [results] = await pool.query(query, params);
    res.json(results);
  } catch (error) {
    console.error("Errore nel recupero degli env_objects:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

// GET /env_objects/:id - Recupera i dettagli di un env_object specifico
router.get("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [results] = await pool.query(
      "SELECT * FROM env_objects WHERE id = ? AND deleted = 0",
      [id]
    );
    if (results.length === 0) {
      return res.status(404).json({ message: "Env object non trovato" });
    }
    res.json(results[0]);
  } catch (error) {
    console.error("Errore nel recupero dell'env_object:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

router.post("/", authenticateToken, authorizeRoles("admin", "editor"), async (req, res) => {
  const { name, file_url, environment_id } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;
  try {
    if (userRole === "editor") {
      const [envs] = await pool.query(
        "SELECT * FROM environments WHERE id = ? AND created_by = ? AND deleted = 0",
        [environment_id, userId]
      );
      if (envs.length === 0) {
        return res.status(403).json({ message: "Non hai i permessi per aggiungere un env_object in questo ambiente" });
      }
    }
    else if(userRole != "admin")
    {
        return res.status(403).json({ message: "Non hai i permessi per modificare questo env_object" });
    }

    const result = await pool.query(
      "INSERT INTO env_objects (name, file_url, environment_id) VALUES (?, ?, ?)",
      [name, file_url, environment_id]
    );
    res.status(201).json({ message: "Env object creato con successo", envObjectId: result[0].insertId });
  } catch (error) {
    console.error("Errore nella creazione dell'env_object:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

// PUT /env_objects/:id - Aggiorna un env_object
router.put("/:id", authenticateToken, authorizeRoles("admin", "editor"), async (req, res) => {
  const { id } = req.params;
  const { name, file_url, environment_id } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;
  try {
    if (userRole === "editor") {
      const [envs] = await pool.query(
        "SELECT * FROM environments WHERE id = ? AND created_by = ? AND deleted = 0",
        [environment_id, userId]
      );
      if (envs.length === 0) {
        return res.status(403).json({ message: "Non hai i permessi per modificare questo env_object" });
      }
    }
    else if(userRole != "admin")
    {
        return res.status(403).json({ message: "Non hai i permessi per modificare questo env_object" });
    }
    const [existing] = await pool.query("SELECT * FROM env_objects WHERE id = ? AND deleted = 0", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "Env object non trovato o già eliminato" });
    }
    await pool.query(
      "UPDATE env_objects SET name = ?, file_url = ?, environment_id = ? WHERE id = ?",
      [name, file_url, environment_id, id]
    );
    res.json({ message: "Env object aggiornato con successo" });
  } catch (error) {
    console.error("Errore nell'aggiornamento dell'env_object:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

// DELETE /env_objects/:id - Soft delete di un env_object
router.delete("/:id", authenticateToken, authorizeRoles("admin", "editor"), async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;
  try {
    const [existing] = await pool.query("SELECT * FROM env_objects WHERE id = ? AND deleted = 0", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "Env object non trovato o già eliminato" });
    }
    if (userRole === "editor") {
      const env_object = existing[0];
      const [envs] = await pool.query(
        "SELECT * FROM environments WHERE id = ? AND created_by = ? AND deleted = 0",
        [env_object.environment_id, userId]
      );
      if (envs.length === 0) {
        return res.status(403).json({ message: "Non hai i permessi per eliminare questo env_object" });
      }
    }
    await pool.query("UPDATE env_objects SET deleted = 1 WHERE id = ?", [id]);
    res.json({ message: "Env object eliminato con successo (soft delete)" });
  } catch (error) {
    console.error("Errore nell'eliminazione dell'env_object:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Nome univoco
  },
});

const upload = multer({ storage: storage });

router.post(
  "/upload/:id",
  authenticateToken,
  authorizeRoles("admin", "editor"),
  upload.single("file"),
  async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const filePath = req.file ? `/uploads/${req.file.filename}` : null;

    try {
      const [existing] = await pool.query(
        "SELECT * FROM env_objects WHERE id = ? AND deleted = 0",
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({ message: "Oggetto non trovato o già eliminato" });
      }

      const object = existing[0];

      const [envCheck] = await pool.query(
        "SELECT * FROM environments WHERE id = ?",
        [object.environment_id]
      );

      if (envCheck.length === 0) {
        return res.status(404).json({ message: "Ambiente non trovato" });
      }

      if (userRole === "editor" && envCheck[0].created_by !== userId) {
        return res.status(403).json({ message: "Non hai i permessi per caricare un file per questo oggetto" });
      }

      // Aggiorna il file_url dell'oggetto nel database
      await pool.query("UPDATE env_objects SET file_url = ? WHERE id = ?", [filePath, id]);

      res.json({
        message: "File caricato con successo",
        file_url: filePath,
      });
    } catch (error) {
      console.error("Errore durante l'upload del file:", error.message);
      res.status(500).json({ message: "Errore interno del server" });
    }
  }
);

//router.get("/download/:id", authenticateToken, async (req, res) => {
router.get("/download/:id",  async (req, res) => {
  const { id } = req.params;
  //const userId = req.user.id;
  //const userRole = req.user.role;

  try {
    // Recupera l'env_object dal database
    const [results] = await pool.query("SELECT * FROM env_objects WHERE id = ? AND deleted = 0", [id]);
    if (!results || results.length === 0) {
      return res.status(404).json({ message: "Env object non trovato" });
    }
    const envObject = results[0];

    /*
    if (userRole === "editor") {
      const [envs] = await pool.query(
        "SELECT * FROM environments WHERE id = ? AND created_by = ? AND deleted = 0",
        [envObject.environment_id, userId]
      );
      if (!envs || envs.length === 0) {
        return res.status(403).json({ message: "Non hai i permessi per scaricare questo file" });
      }
    }
    */
    if (!envObject.file_url) {
      return res.status(404).json({ message: "File non disponibile" });
    }

    const filePath = path.join(process.cwd(), envObject.file_url);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File non trovato sul server" });
    }

    res.download(filePath, err => {
      if (err) {
        console.error("Errore nel download del file:", err);
        res.status(500).json({ message: "Errore nel download del file" });
      }
    });
  } catch (error) {
    console.error("Errore nel processo di download:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

module.exports = router;
