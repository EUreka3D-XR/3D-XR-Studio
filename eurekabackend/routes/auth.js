const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const axios = require("axios");
const crypto = require("crypto");
const pool = require("../config/db");
require("dotenv").config();

const router = express.Router();

// Configurazione EGI Check-in (Demo Environment)
const EGI_CONFIG = {
  clientId: process.env.EGI_CLIENT_ID,
  clientSecret: process.env.EGI_CLIENT_SECRET,
  redirectUri: process.env.EGI_REDIRECT_URI || 'http://localhost:5173/',
  authUrl: 'https://aai-demo.egi.eu/auth/realms/egi/protocol/openid-connect/auth',
  tokenUrl: 'https://aai-demo.egi.eu/auth/realms/egi/protocol/openid-connect/token',
  userInfoUrl: 'https://aai-demo.egi.eu/auth/realms/egi/protocol/openid-connect/userinfo'
};

const EGI_EDITOR_ENTITLEMENT = 'urn:mace:egi.eu:group:culturalheritage.vo.egi.eu:Tools:3D_XR_studio:role=editor#aai.egi.eu';

const pendingStates = new Map();

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(codeVerifier) {
  return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
}

// Login tradizionale (mantieni esistente)
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await pool.query("SELECT * FROM utenti WHERE username = ? AND deleted = 0", [
      username,
    ]);

    if (rows.length === 0) {
      return res.status(401).json({ message: "Credenziali non valide" });
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Credenziali non valide" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({ token, role: user.role });
  } catch (error) {
    console.error("Errore durante il login:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

// Inizia il flusso EGI Check-in
router.get("/egi-login", (req, res) => {
  const state = crypto.randomBytes(32).toString('hex');
  
  // Genera PKCE parameters
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  
  // Salva lo state e il code verifier temporaneamente (scade dopo 10 minuti)
  pendingStates.set(state, { 
    timestamp: Date.now(),
    codeVerifier: codeVerifier 
  });
  
  const authUrl = new URL(EGI_CONFIG.authUrl);
  authUrl.searchParams.append('client_id', EGI_CONFIG.clientId);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', 'openid voperson_id email profile entitlements');
  authUrl.searchParams.append('redirect_uri', EGI_CONFIG.redirectUri);
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');
  
  console.log('EGI Authorization URL:', authUrl.toString());
  res.redirect(authUrl.toString());
});

router.post("/egi-callback", async (req, res) => {
  const { code, state } = req.body;

  try {
    const stateData = pendingStates.get(state);
    if (!stateData) {
      return res.status(400).json({ message: "State non valido o scaduto" });
    }
    
    // Ottieni il code verifier
    const { codeVerifier } = stateData;
    
    pendingStates.delete(state);

    const tokenResponse = await axios.post(EGI_CONFIG.tokenUrl, new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: EGI_CONFIG.redirectUri,
      client_id: EGI_CONFIG.clientId,
      client_secret: EGI_CONFIG.clientSecret,
      code_verifier: codeVerifier
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token } = tokenResponse.data;

    // Ottieni le informazioni dell'utente
    const userResponse = await axios.get(EGI_CONFIG.userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    const userData = userResponse.data;
    console.log('User data from EGI:', userData);

    const { voperson_id, email, name, preferred_username, eduperson_entitlement } = userData;

    const entitlements = eduperson_entitlement || [];
    const hasEditorRole = entitlements.includes(EGI_EDITOR_ENTITLEMENT);

    if (!hasEditorRole) {
      console.warn('Utente EGI senza entitlement editor:', voperson_id, entitlements);
      return res.status(403).json({
        message: "Accesso negato: l'utente non dispone del ruolo editor nella VO EGI. Contattare l'amministratore per richiedere l'accesso."
      });
    }

    let user = await findOrCreateEGIUser(voperson_id, email, name, preferred_username);

    // Genera il token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        authMethod: 'egi'
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({ token, role: user.role });

  } catch (error) {
    console.error("Errore durante il callback EGI:", error.response?.data || error.message);
    res.status(500).json({ message: "Errore durante l'autenticazione EGI" });
  }
});

async function findOrCreateEGIUser(voPersonId, email, name, preferredUsername) {
  try {
    // Cerca utente esistente tramite voperson_id
    let [rows] = await pool.query(
      "SELECT * FROM utenti WHERE egi_voperson_id = ? AND deleted = 0",
      [voPersonId]
    );

    if (rows.length > 0) {
      return rows[0];
    }

    if (email) {
      [rows] = await pool.query(
        "SELECT * FROM utenti WHERE email = ? AND deleted = 0",
        [email]
      );

      if (rows.length > 0) {
        await pool.query(
          "UPDATE utenti SET egi_voperson_id = ?, egi_preferred_username = ?, email = ? WHERE id = ?",
          [voPersonId, preferredUsername, email, rows[0].id]
        );
        return { ...rows[0], egi_voperson_id: voPersonId };
      }
    }

    const nameParts = (name || '').split(' ');
    const firstname = nameParts[0] || '';
    const lastname = nameParts.slice(1).join(' ') || '';
    const username = preferredUsername || `egi_${voPersonId.substring(0, 8)}`;
    const defaultRole = 'editor'; // ruolo di default per utenti EGI

    const [result] = await pool.query(
      `INSERT INTO utenti (username, firstname, lastname, email, role, egi_voperson_id, egi_preferred_username, password_hash) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, firstname, lastname, email, defaultRole, voPersonId, preferredUsername, '']
    );

    return {
      id: result.insertId,
      username: username,
      firstname: firstname,
      lastname: lastname,
      email: email,
      role: defaultRole,
      egi_voperson_id: voPersonId
    };

  } catch (error) {
    console.error("Errore gestione utente EGI:", error);
    throw error;
  }
}

// Registrazione tradizionale (mantieni esistente)
router.post("/register", async (req, res) => {
  const { username, password, role } = req.body;

  try {
    const [existingUser] = await pool.query(
      "SELECT * FROM utenti WHERE username = ?",
      [username]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ message: "Username già in uso" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO utenti (username, password_hash, role) VALUES (?, ?, ?)",
      [username, hashedPassword, role]
    );

    res.status(201).json({ message: "Utente registrato con successo" });
  } catch (error) {
    console.error("Errore durante la registrazione:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

function cleanupExpiredStates() {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;
  
  for (const [state, data] of pendingStates.entries()) {
    if (now - data.timestamp > tenMinutes) {
      pendingStates.delete(state);
    }
  }
}

// Esegui pulizia ogni 5 minuti
setInterval(cleanupExpiredStates, 5 * 60 * 1000);

module.exports = router;