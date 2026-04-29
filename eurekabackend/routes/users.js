const express = require("express");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
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

// GET /users - Elenco di tutti gli utenti (non eliminati)
router.get("/", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT id, username, firstname, lastname, role, created FROM utenti WHERE deleted = 0"
    );
    res.json(users);
  } catch (error) {
    console.error("Errore nel recupero degli utenti:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

// GET /users/profile - Recupera i dettagli del profilo dell'utente loggato
router.get("/profile", authenticateToken, async (req, res) => {
  const username = req.user.username; // Recupera lo username dal token
  try {
    const [users] = await pool.query(
      "SELECT id, username, firstname, lastname, role, created FROM utenti WHERE username = ? AND deleted = 0",
      [username]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: "Utente non trovato" });
    }
    res.json(users[0]);
  } catch (error) {
    console.error("Errore nel recupero del profilo:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

// PUT /users/profile - Aggiorna i dettagli del profilo dell'utente loggato
router.put("/profile", authenticateToken, async (req, res) => {
  const username = req.user.username; // Recupera lo username dal token
  const { firstname, lastname, currentPassword, newPassword } = req.body;
  
  try {
    const [users] = await pool.query(
      "SELECT * FROM utenti WHERE username = ? AND deleted = 0",
      [username]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: "Utente non trovato" });
    }
    const user = users[0];

    if (newPassword) {
      // Se si vuole aggiornare la password, deve essere fornita anche la password attuale
      if (!currentPassword) {
        return res.status(400).json({ message: "La password attuale è richiesta per aggiornare la password." });
      }
      const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!passwordMatch) {
        return res.status(400).json({ message: "La password attuale non è corretta." });
      }
      // Crittografa la nuova password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      // Aggiorna firstname, lastname e la password
      await pool.query(
        "UPDATE utenti SET firstname = ?, lastname = ?, password_hash = ? WHERE username = ? AND deleted = 0",
        [firstname, lastname, hashedPassword, username]
      );
    } else {
      // Aggiorna solo firstname e lastname
      await pool.query(
        "UPDATE utenti SET firstname = ?, lastname = ? WHERE username = ? AND deleted = 0",
        [firstname, lastname, username]
      );
    }
    res.json({ message: "Profilo aggiornato con successo" });
  } catch (error) {
    console.error("Errore nell'aggiornamento del profilo:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

// GET /users/:id - Recupera i dettagli di un utente specifico
router.get("/:id", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  const { id } = req.params;
  try {
    const [users] = await pool.query(
      "SELECT id, username, firstname, lastname, role FROM utenti WHERE id = ? AND deleted = 0",
      [id]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: "Utente non trovato" });
    }
    res.json(users[0]);
  } catch (error) {
    console.error("Errore nel recupero dell'utente:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});


// POST /users - Inserimento di un nuovo utente
router.post("/", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  const { username, firstname, lastname, password, role } = req.body;
  try {
    const [existing] = await pool.query("SELECT * FROM utenti WHERE username = ?", [username]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Username già in uso" });
    }

    // Crittografa la password
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO utenti (username, firstname, lastname, password_hash, role) VALUES (?, ?, ?, ?, ?)",
      [username, firstname, lastname, hashedPassword, role]
    );
    res.status(201).json({ message: "Utente creato con successo", userId: result[0].insertId });
  } catch (error) {
    console.error("Errore nella creazione dell'utente:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

// PUT /users/:id - Modifica dei dati di un utente
router.put("/:id", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  const { id } = req.params;
  const { username, firstname, lastname, password, role } = req.body;
  try {
    if (username) {
      const [existing] = await pool.query("SELECT * FROM utenti WHERE username = ? AND id != ?", [username, id]);
      if (existing.length > 0) {
        return res.status(400).json({ message: "Username già in uso" });
      }
    }

    if (password) {
      // Aggiorna anche la password se fornita
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        "UPDATE utenti SET username = ?, firstname = ?, lastname = ?, password_hash = ?, role = ? WHERE id = ? AND deleted = 0",
        [username, firstname, lastname, hashedPassword, role, id]
      );
    } else {
      await pool.query(
        "UPDATE utenti SET username = ?, firstname = ?, lastname = ?, role = ? WHERE id = ? AND deleted = 0",
        [username, firstname, lastname, role, id]
      );
    }
    res.json({ message: "Utente aggiornato con successo" });
  } catch (error) {
    console.error("Errore nell'aggiornamento dell'utente:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

// DELETE /users/:id - Eliminazione logica di un utente
router.delete("/:id", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  const { id } = req.params;
  try {
    const [existing] = await pool.query("SELECT * FROM utenti WHERE id = ? AND deleted = 0", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "Utente non trovato o già eliminato" });
    }
    await pool.query("UPDATE utenti SET deleted = 1 WHERE id = ?", [id]);
    res.json({ message: "Utente eliminato con successo (soft delete)" });
  } catch (error) {
    console.error("Errore nella cancellazione dell'utente:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});




module.exports = router;
