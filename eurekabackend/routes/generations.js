const express = require("express");
const db = require("../config/db");
const jwt = require("jsonwebtoken");
const router = express.Router();
require("dotenv").config();

const { cleanupJobImage } = require("../services/trellisQueue");

// --- Auth middleware (same as environments.js) ---
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

router.get("/", authenticateToken, authorizeRoles("admin", "editor"), async (req, res) => {
  try {
    let query;
    let params = [];

    if (req.user.role === "admin") {
      query = `SELECT id, user_id, username, created_at, status, mode, preview, progress, output_format, file_size, error_message, started_at, completed_at
               FROM generations
               ORDER BY created_at DESC`;
    } else {
      query = `SELECT id, user_id, username, created_at, status, mode, preview, progress, output_format, file_size, error_message, started_at, completed_at
               FROM generations
               WHERE user_id = ?
               ORDER BY created_at DESC`;
      params = [req.user.id];
    }

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Errore recupero generazioni", error: err.message });
  }
});

// Get single generation detail
router.get("/:id", authenticateToken, authorizeRoles("admin", "editor"), async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM generations WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Generazione non trovata" });

    const gen = rows[0];
    if (req.user.role !== "admin" && gen.user_id !== req.user.id) {
      return res.status(403).json({ message: "Accesso non autorizzato" });
    }

    res.json(gen);
  } catch (err) {
    res.status(500).json({ message: "Errore recupero generazione", error: err.message });
  }
});

// Delete generation
router.delete("/:id", authenticateToken, authorizeRoles("admin", "editor"), async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM generations WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Generazione non trovata" });

    const gen = rows[0];
    if (req.user.role !== "admin" && gen.user_id !== req.user.id) {
      return res.status(403).json({ message: "Accesso non autorizzato" });
    }

    // Clean up any leftover files
    cleanupJobImage(gen.id);

    await db.query("DELETE FROM generations WHERE id = ?", [req.params.id]);
    res.json({ message: "Generazione eliminata" });
  } catch (err) {
    res.status(500).json({ message: "Errore eliminazione generazione", error: err.message });
  }
});

module.exports = router;
