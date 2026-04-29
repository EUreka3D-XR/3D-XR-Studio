const express = require("express");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
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
        "SELECT * FROM objects WHERE id = ? AND deleted = 0",
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
      await pool.query("UPDATE objects SET file_url = ? WHERE id = ?", [filePath, id]);

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

router.post(
  "/add",
  authenticateToken,
  authorizeRoles("admin", "editor"),
  async (req, res) => {
    const {
      name,
      file_url,
      environment_id,
      env_object_id, // nuovo campo per il riferimento all'oggetto disponibile (env_objects)
      pos_x,
      pos_y,
      pos_z,
      scale_x,
      scale_y,
      scale_z,
      rotation_x,
      rotation_y,
      rotation_z,
    } = req.body;
    const userId = req.user.id;      // Aggiunto
    const userRole = req.user.role;  // Aggiunto
    try {
      if (userRole === "editor") {
        const [env] = await pool.query(
          "SELECT * FROM environments WHERE id = ? AND created_by = ? AND deleted = 0",
          [environment_id, userId]
        );
        if (env.length === 0) {
          return res.status(403).json({ message: "Non hai i permessi per aggiungere un oggetto in questo ambiente" });
        }
      }

    
      const result = await pool.query(
        "INSERT INTO objects (name, file_url, environment_id, env_object_id, pos_x, pos_y, pos_z, scale_x, scale_y, scale_z, rotation_x, rotation_y, rotation_z) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          name,
          file_url,
          environment_id,
          env_object_id,
          pos_x,
          pos_y,
          pos_z,
          scale_x,
          scale_y,
          scale_z,
          rotation_x,
          rotation_y,
          rotation_z,
        ]
      );

      res.status(201).json({
        message: "Oggetto 3D importato con successo",
        objectId: result[0].insertId,
      });
    } catch (error) {
      console.error("Errore importazione oggetto:", error.message);
      res.status(500).json({ message: "Errore interno del server" });
    }
  }
);

router.delete(
  "/delete/:id",
  authenticateToken,
  authorizeRoles("admin", "editor"),
  async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
      const [existing] = await pool.query(
        "SELECT * FROM objects WHERE id = ? AND deleted = 0",
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
        return res.status(403).json({ message: "Non hai i permessi per eliminare questo oggetto" });
      }

      // Imposta deleted = 1 invece di eliminare la riga
      await pool.query("UPDATE objects SET deleted = 1 WHERE id = ?", [id]);

      res.json({ message: "Oggetto eliminato con successo (soft delete)" });
    } catch (error) {
      console.error("Errore eliminazione oggetto:", error.message);
      res.status(500).json({ message: "Errore interno del server" });
    }
  }
);

router.put(
  "/update/:id",
  authenticateToken,
  authorizeRoles("admin", "editor"),
  async (req, res) => {
    const { id } = req.params;
    const {
      name,
      file_url,
      environment_id,
      env_object_id,
      pos_x,
      pos_y,
      pos_z,
      scale_x,
      scale_y,
      scale_z,
      rotation_x,
      rotation_y,
      rotation_z,
    } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
      const [existing] = await pool.query(
        "SELECT * FROM objects WHERE id = ? AND deleted = 0",
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({ message: "Oggetto non trovato o già eliminato" });
      }

      const object = existing[0];
      const targetEnvId = environment_id !== undefined ? environment_id : object.environment_id;

      if (userRole === "editor") {
        const [env] = await pool.query(
          "SELECT * FROM environments WHERE id = ? AND created_by = ? AND deleted = 0",
          [targetEnvId, userId]
        );
        if (env.length === 0) {
          return res.status(403).json({ message: "Non hai i permessi per modificare un oggetto in questo ambiente" });
        }
      }

      const fields = [];
      const params = [];

      if (name !== undefined) { fields.push("name = ?"); params.push(name); }
      if (file_url !== undefined && file_url !== "") { fields.push("file_url = ?"); params.push(file_url); }
      if (environment_id !== undefined) { fields.push("environment_id = ?"); params.push(environment_id); }
      if (env_object_id !== undefined) { fields.push("env_object_id = ?"); params.push(env_object_id); }
      if (pos_x !== undefined) { fields.push("pos_x = ?"); params.push(pos_x); }
      if (pos_y !== undefined) { fields.push("pos_y = ?"); params.push(pos_y); }
      if (pos_z !== undefined) { fields.push("pos_z = ?"); params.push(pos_z); }
      if (scale_x !== undefined) { fields.push("scale_x = ?"); params.push(scale_x); }
      if (scale_y !== undefined) { fields.push("scale_y = ?"); params.push(scale_y); }
      if (scale_z !== undefined) { fields.push("scale_z = ?"); params.push(scale_z); }
      if (rotation_x !== undefined) { fields.push("rotation_x = ?"); params.push(rotation_x); }
      if (rotation_y !== undefined) { fields.push("rotation_y = ?"); params.push(rotation_y); }
      if (rotation_z !== undefined) { fields.push("rotation_z = ?"); params.push(rotation_z); }

      if (fields.length === 0) {
        return res.status(400).json({ message: "Nessun campo da aggiornare" });
      }

      params.push(id);

      await pool.query(
        `UPDATE objects SET ${fields.join(", ")} WHERE id = ?`,
        params
      );

      res.json({ message: "Oggetto 3D aggiornato con successo" });
    } catch (error) {
      console.error("Errore aggiornamento oggetto:", error.message);
      res.status(500).json({ message: "Errore interno del server" });
    }
  }
);




router.get("/environment/:environment_id", authenticateToken, async (req, res) => {
  const { environment_id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;
  const apiBaseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}/api`;
  try {
    let query;
    let params = [];
    if (userRole === "admin") {
      query = `
        SELECT o.*, eo.file_url AS original_file_url
        FROM objects o
        LEFT JOIN env_objects eo ON o.env_object_id = eo.id
        WHERE o.environment_id = ? AND o.deleted = 0 AND (o.object_type != 'wall' OR o.object_type IS NULL)
      `;
      params = [environment_id];
    } else if (userRole === "editor") {
      query = `
        SELECT o.*, eo.file_url AS original_file_url
        FROM objects o
        JOIN environments e ON o.environment_id = e.id
        LEFT JOIN env_objects eo ON o.env_object_id = eo.id
        WHERE o.environment_id = ? AND o.deleted = 0 AND (o.object_type != 'wall' OR o.object_type IS NULL) AND e.created_by = ?
      `;
      params = [environment_id, userId];
    } else {
      return res.status(403).json({ message: "Non hai i permessi per accedere a questa risorsa" });
    }
    const [objects] = await pool.query(query, params);
    const modifiedObjects = objects.map(obj => {
      if (obj.env_object_id) {
        return { ...obj, file_url: `${apiBaseUrl}/objects/download/${obj.id}`, original_file_url: obj.original_file_url || obj.file_url };
      }
      return { ...obj, original_file_url: obj.original_file_url || obj.file_url };
    });
    res.json(modifiedObjects);
  } catch (error) {
    console.error("Errore nel recupero degli oggetti:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});


router.get("/download/:id",  async (req, res) => {
  const { id } = req.params;
  //const userId = req.user.id;
  //const userRole = req.user.role;
  try {
    const [results] = await pool.query("SELECT * FROM objects WHERE id = ? AND deleted = 0", [id]);
    if (!results || results.length === 0) {
      console.error(`[objects/download/${id}] Oggetto non trovato nella tabella objects`);
      return res.status(404).json({ message: "Oggetto non trovato", details: `Object ID ${id} not found in objects table` });
    }
    let object = results[0];
    console.log(`[objects/download/${id}] Object trovato:`, { id: object.id, name: object.name, env_object_id: object.env_object_id, file_url: object.file_url });

    let fileUrlToServe = object.file_url;
    if (object.env_object_id) {
      const [envResults] = await pool.query("SELECT * FROM env_objects WHERE id = ? AND deleted = 0", [object.env_object_id]);
      if (envResults && envResults.length > 0) {
        fileUrlToServe = envResults[0].file_url;
        console.log(`[objects/download/${id}] Env object trovato (ID: ${object.env_object_id}):`, { file_url: fileUrlToServe });
      } else {
        console.error(`[objects/download/${id}] Env object ID ${object.env_object_id} non trovato o deleted`);
        return res.status(404).json({ message: "Env object non trovato", details: `env_object_id ${object.env_object_id} not found or deleted` });
      }
    }

    if (!fileUrlToServe) {
      console.error(`[objects/download/${id}] file_url è null o vuoto`);
      return res.status(404).json({ message: "File non disponibile", details: "file_url is null or empty" });
    }

    const filePath = path.join(process.cwd(), fileUrlToServe);
    console.log(`[objects/download/${id}] Tentativo download da: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      console.error(`[objects/download/${id}] File non esiste sul filesystem: ${filePath}`);
      return res.status(404).json({ message: "File non trovato sul server", details: `File not found: ${fileUrlToServe}` });
    }

    res.download(filePath, err => {
      if (err) {
        console.error("Errore nel download del file:", err);
        return res.status(500).json({ message: "Errore nel download del file" });
      }
    });
  } catch (error) {
    console.error("Errore nel processo di download:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});


router.get("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;
  const apiBaseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}/api`;
  try {
    const [results] = await pool.query(
      `SELECT o.*, eo.file_url AS original_file_url
       FROM objects o
       LEFT JOIN env_objects eo ON o.env_object_id = eo.id
       WHERE o.id = ? AND o.deleted = 0`,
      [id]
    );
    if (!results || results.length === 0) {
      return res.status(404).json({ message: "Oggetto non trovato" });
    }
    let object = results[0];
    object.original_file_url = object.original_file_url || object.file_url;
    // Se l'oggetto ha un env_object_id, impostiamo file_url come l'URL di download
    if (object.env_object_id) {
      object.file_url = `${apiBaseUrl}/objects/download/${object.id}`;
    }
    res.json(object);
  } catch (error) {
    console.error("Errore nel recupero dell'oggetto:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});


module.exports = router;
