const express = require("express");
const pool = require("../config/db");
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Genera un serial code di 10 caratteri alfanumerici (A-Z, 0-9)
 */
function generateSerialCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Verifica che il serial_code sia unico nel database
 * @param {string} serialCode - Il codice da verificare
 * @param {number|null} excludeId - ID da escludere (per update)
 * @returns {Promise<boolean>} - true se unico, false altrimenti
 */
async function isSerialCodeUnique(serialCode, excludeId = null) {
  let query = "SELECT id FROM totems WHERE serial_code = ? AND deleted = 0";
  const params = [serialCode];

  if (excludeId) {
    query += " AND id != ?";
    params.push(excludeId);
  }

  const [rows] = await pool.query(query, params);
  return rows.length === 0;
}

/**
 * Valida il formato del serial_code (10 caratteri, A-Z e 0-9)
 */
function isValidSerialCodeFormat(serialCode) {
  return /^[A-Z0-9]{10}$/.test(serialCode);
}

// ============================================================================
// ENDPOINT ADMIN CRUD
// ============================================================================

// GET /api/totems - Lista tutti i totem
router.get("/", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { assigned_to, environment_id, unassigned, unpositioned } = req.query;

    let query = `
      SELECT
        t.*,
        u.username AS assigned_username,
        e.name AS environment_name
      FROM totems t
      LEFT JOIN utenti u ON t.assigned_to = u.id AND u.deleted = 0
      LEFT JOIN environments e ON t.environment_id = e.id AND e.deleted = 0
      WHERE t.deleted = 0
    `;
    const params = [];

    if (assigned_to) {
      query += " AND t.assigned_to = ?";
      params.push(assigned_to);
    }

    if (environment_id) {
      query += " AND t.environment_id = ?";
      params.push(environment_id);
    }

    if (unassigned === "true") {
      query += " AND t.assigned_to IS NULL";
    }

    if (unpositioned === "true") {
      query += " AND t.environment_id IS NULL";
    }

    query += " ORDER BY t.created_at DESC";

    const [totems] = await pool.query(query, params);
    res.json(totems);
  } catch (error) {
    console.error("Errore nel recupero dei totem:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

// ============================================================================
// ENDPOINT EDITOR
// ============================================================================

// NOTA: Deve essere definito PRIMA di /:id
router.get("/my", authenticateToken, authorizeRoles("admin", "editor"), async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    let query = `
      SELECT
        t.*,
        e.name AS environment_name
      FROM totems t
      LEFT JOIN environments e ON t.environment_id = e.id AND e.deleted = 0
      WHERE t.deleted = 0
    `;
    const params = [];

    if (!isAdmin) {
      query += " AND t.assigned_to = ?";
      params.push(userId);
    }

    query += " ORDER BY t.created_at DESC";

    const [totems] = await pool.query(query, params);
    res.json(totems);
  } catch (error) {
    console.error("Errore nel recupero dei totem:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

router.get("/available/:environment_id", authenticateToken, authorizeRoles("admin", "editor"), async (req, res) => {
  try {
    const { environment_id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    const [envRows] = await pool.query(
      "SELECT id, name, created_by FROM environments WHERE id = ? AND deleted = 0",
      [environment_id]
    );

    if (envRows.length === 0) {
      return res.status(404).json({ message: "Ambiente non trovato" });
    }

    const environment = envRows[0];

    if (!isAdmin && environment.created_by !== userId) {
      return res.status(403).json({ message: "Non hai i permessi per questo ambiente" });
    }

    const [totems] = await pool.query(`
      SELECT t.*
      FROM totems t
      WHERE t.assigned_to = ?
        AND t.environment_id IS NULL
        AND t.deleted = 0
      ORDER BY t.created_at DESC
    `, [environment.created_by]);

    res.json({
      environment_id: environment.id,
      environment_name: environment.name,
      owner_id: environment.created_by,
      available_totems: totems
    });
  } catch (error) {
    console.error("Errore nel recupero dei totem disponibili:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

// GET /api/totems/:id - Dettaglio singolo totem
router.get("/:id", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;

    const [totems] = await pool.query(`
      SELECT
        t.*,
        u.username AS assigned_username,
        e.name AS environment_name
      FROM totems t
      LEFT JOIN utenti u ON t.assigned_to = u.id AND u.deleted = 0
      LEFT JOIN environments e ON t.environment_id = e.id AND e.deleted = 0
      WHERE t.id = ? AND t.deleted = 0
    `, [id]);

    if (totems.length === 0) {
      return res.status(404).json({ message: "Totem non trovato" });
    }

    res.json(totems[0]);
  } catch (error) {
    console.error("Errore nel recupero del totem:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

router.post("/", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  try {
    let { label, serial_code } = req.body;

    if (!serial_code) {
      let attempts = 0;
      const maxAttempts = 5;

      do {
        serial_code = generateSerialCode();
        attempts++;
      } while (!(await isSerialCodeUnique(serial_code)) && attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        return res.status(500).json({ message: "Impossibile generare un serial code unico" });
      }
    } else {
      // Valida formato serial_code fornito
      serial_code = serial_code.toUpperCase();

      if (!isValidSerialCodeFormat(serial_code)) {
        return res.status(400).json({
          message: "Formato serial code non valido. Deve essere di 10 caratteri alfanumerici (A-Z, 0-9)"
        });
      }

      if (!(await isSerialCodeUnique(serial_code))) {
        return res.status(400).json({ message: "Serial code già esistente" });
      }
    }

    const result = await pool.query(
      "INSERT INTO totems (serial_code, label) VALUES (?, ?)",
      [serial_code, label || null]
    );

    // Recupera il totem appena creato
    const [newTotem] = await pool.query(
      "SELECT * FROM totems WHERE id = ?",
      [result[0].insertId]
    );

    res.status(201).json({
      message: "Totem creato con successo",
      totem: newTotem[0]
    });
  } catch (error) {
    console.error("Errore nella creazione del totem:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

// PUT /api/totems/:id - Modifica totem
router.put("/:id", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    let { label, serial_code } = req.body;

    const [existing] = await pool.query(
      "SELECT * FROM totems WHERE id = ? AND deleted = 0",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: "Totem non trovato" });
    }

    const currentTotem = existing[0];

    if (serial_code && serial_code !== currentTotem.serial_code) {
      serial_code = serial_code.toUpperCase();

      if (!isValidSerialCodeFormat(serial_code)) {
        return res.status(400).json({
          message: "Formato serial code non valido. Deve essere di 10 caratteri alfanumerici (A-Z, 0-9)"
        });
      }

      if (!(await isSerialCodeUnique(serial_code, id))) {
        return res.status(400).json({ message: "Serial code già esistente" });
      }
    } else {
      serial_code = currentTotem.serial_code;
    }

    // Aggiorna il totem
    await pool.query(
      "UPDATE totems SET label = ?, serial_code = ? WHERE id = ? AND deleted = 0",
      [label !== undefined ? label : currentTotem.label, serial_code, id]
    );

    // Recupera il totem aggiornato
    const [updatedTotem] = await pool.query(
      "SELECT * FROM totems WHERE id = ?",
      [id]
    );

    res.json({
      message: "Totem aggiornato con successo",
      totem: updatedTotem[0]
    });
  } catch (error) {
    console.error("Errore nell'aggiornamento del totem:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

// DELETE /api/totems/:id - Elimina totem (soft delete)
router.delete("/:id", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query(
      "SELECT * FROM totems WHERE id = ? AND deleted = 0",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: "Totem non trovato o già eliminato" });
    }

    await pool.query("UPDATE totems SET deleted = 1 WHERE id = ?", [id]);

    res.json({ message: "Totem eliminato con successo" });
  } catch (error) {
    console.error("Errore nella cancellazione del totem:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

// PATCH /api/totems/:id/assign - Assegna/revoca editor
router.patch("/:id/assign", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    const [totemRows] = await pool.query(
      "SELECT * FROM totems WHERE id = ? AND deleted = 0",
      [id]
    );

    if (totemRows.length === 0) {
      return res.status(404).json({ message: "Totem non trovato" });
    }

    if (user_id !== null && user_id !== undefined) {
      const [userRows] = await pool.query(
        "SELECT * FROM utenti WHERE id = ? AND deleted = 0",
        [user_id]
      );

      if (userRows.length === 0) {
        return res.status(404).json({ message: "Utente non trovato" });
      }

      const user = userRows[0];
      if (user.role !== "editor" && user.role !== "admin") {
        return res.status(400).json({ message: "L'utente non è un editor" });
      }

      // Assegna il totem
      await pool.query(
        "UPDATE totems SET assigned_to = ? WHERE id = ?",
        [user_id, id]
      );

      res.json({
        message: "Totem assegnato con successo",
        assigned_to: user_id,
        assigned_username: user.username
      });
    } else {
      // Revoca assegnazione: resetta anche posizionamento
      await pool.query(
        "UPDATE totems SET assigned_to = NULL, environment_id = NULL, latitude = NULL, longitude = NULL WHERE id = ?",
        [id]
      );

      res.json({
        message: "Assegnazione revocata con successo. Posizionamento resettato.",
        assigned_to: null
      });
    }
  } catch (error) {
    console.error("Errore nell'assegnazione del totem:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

// PATCH /api/totems/:id/position - Posiziona totem in un ambiente
router.patch("/:id/position", authenticateToken, authorizeRoles("admin", "editor"), async (req, res) => {
  try {
    const { id } = req.params;
    const { environment_id, latitude, longitude } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    const [totemRows] = await pool.query(
      "SELECT * FROM totems WHERE id = ? AND deleted = 0",
      [id]
    );

    if (totemRows.length === 0) {
      return res.status(404).json({ message: "Totem non trovato" });
    }

    const totem = totemRows[0];

    if (!isAdmin && totem.assigned_to !== userId) {
      return res.status(403).json({ message: "Totem non assegnato a te" });
    }

    const [envRows] = await pool.query(
      "SELECT * FROM environments WHERE id = ? AND deleted = 0",
      [environment_id]
    );

    if (envRows.length === 0) {
      return res.status(404).json({ message: "Ambiente non trovato" });
    }

    const environment = envRows[0];

    if (!isAdmin && environment.created_by !== userId) {
      return res.status(403).json({ message: "Ambiente non di tua proprietà" });
    }

    // Valida coordinate
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: "Coordinate mancanti" });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ message: "Latitudine non valida (deve essere tra -90 e +90)" });
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ message: "Longitudine non valida (deve essere tra -180 e +180)" });
    }

    // Aggiorna posizionamento
    await pool.query(
      "UPDATE totems SET environment_id = ?, latitude = ?, longitude = ? WHERE id = ?",
      [environment_id, lat, lng, id]
    );

    res.json({
      message: "Totem posizionato con successo",
      environment_id,
      environment_name: environment.name,
      latitude: lat,
      longitude: lng
    });
  } catch (error) {
    console.error("Errore nel posizionamento del totem:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

// PATCH /api/totems/:id/unposition - Rimuovi posizionamento totem
router.patch("/:id/unposition", authenticateToken, authorizeRoles("admin", "editor"), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    const [totemRows] = await pool.query(
      "SELECT * FROM totems WHERE id = ? AND deleted = 0",
      [id]
    );

    if (totemRows.length === 0) {
      return res.status(404).json({ message: "Totem non trovato" });
    }

    const totem = totemRows[0];

    if (!isAdmin && totem.assigned_to !== userId) {
      return res.status(403).json({ message: "Totem non assegnato a te" });
    }

    // Rimuovi posizionamento
    await pool.query(
      "UPDATE totems SET environment_id = NULL, latitude = NULL, longitude = NULL WHERE id = ?",
      [id]
    );

    res.json({ message: "Posizionamento rimosso con successo" });
  } catch (error) {
    console.error("Errore nella rimozione del posizionamento:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

module.exports = router;
