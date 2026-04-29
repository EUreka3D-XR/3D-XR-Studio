const express = require("express");
const db = require("../config/db");
const jwt = require("jsonwebtoken");
const router = express.Router();
require("dotenv").config();

const {
  pingTrellis,
  interruptTrellis,
  downloadPreview,
  downloadModel,
  saveJobImage,
  cleanupJobImage,
  recalcQueuePositions,
  getQueuePosition,
} = require("../services/trellisQueue");

// --- Auth middleware (same as environments.js, with query token support for downloads) ---
const authenticateToken = (req, res, next) => {
  let rawToken = null;

  // 1. Try Authorization header
  const authHeader = req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    rawToken = authHeader.split(" ")[1];
  }

  // 2. Fallback to query parameter (for direct URL access: video src, model-viewer)
  if (!rawToken && req.query.token) {
    rawToken = req.query.token;
  }

  if (!rawToken) return res.status(401).json({ message: "Accesso negato" });

  try {
    const verified = jwt.verify(rawToken, process.env.JWT_SECRET);
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

// Verify job ownership (or admin)
const authorizeJobAccess = async (req, res, next) => {
  try {
    const [rows] = await db.query("SELECT user_id FROM generations WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Job non trovato" });
    if (req.user.role !== "admin" && rows[0].user_id !== req.user.id) {
      return res.status(403).json({ message: "Accesso non autorizzato a questo job" });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: "Errore verifica accesso job" });
  }
};

// --- Routes ---

// Health check TRELLIS
router.get("/ping", authenticateToken, authorizeRoles("admin", "editor"), async (req, res) => {
  try {
    const data = await pingTrellis();
    res.json(data);
  } catch (err) {
    res.status(502).json({ message: "TRELLIS non raggiungibile", error: err.message });
  }
});

// Queue single-image generation
router.post("/generate", authenticateToken, authorizeRoles("admin", "editor"), async (req, res) => {
  try {
    const {
      image_base64,
      preview = 1,
      seed,
      ss_guidance_strength,
      ss_sampling_steps,
      slat_guidance_strength,
      slat_sampling_steps,
      mesh_simplify_ratio = 0.95,
      texture_size = 1024,
      output_format = "glb",
    } = req.body;

    if (!image_base64) {
      return res.status(400).json({ message: "image_base64 richiesto" });
    }

    const [result] = await db.query(
      `INSERT INTO generations (user_id, username, mode, preview, seed, ss_guidance_strength, ss_sampling_steps, slat_guidance_strength, slat_sampling_steps, mesh_simplify_ratio, texture_size, output_format, status)
       VALUES (?, ?, 'single', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued')`,
      [
        req.user.id, req.user.username, preview ? 1 : 0,
        seed || null, ss_guidance_strength || null, ss_sampling_steps || null,
        slat_guidance_strength || null, slat_sampling_steps || null,
        mesh_simplify_ratio, texture_size, output_format,
      ]
    );

    const jobId = result.insertId;

    // Save image to disk
    saveJobImage(jobId, image_base64);

    // Calculate queue position
    await recalcQueuePositions();
    const position = await getQueuePosition(jobId);

    res.status(201).json({
      job_id: jobId,
      status: "queued",
      queue_position: position,
    });
  } catch (err) {
    console.error("[trellis/generate]", err);
    res.status(500).json({ message: "Errore creazione job", error: err.message });
  }
});

// Queue multi-image generation
router.post("/generate-multi", authenticateToken, authorizeRoles("admin", "editor"), async (req, res) => {
  try {
    const {
      image_list_base64,
      preview = 1,
      seed,
      ss_guidance_strength,
      ss_sampling_steps,
      slat_guidance_strength,
      slat_sampling_steps,
      mesh_simplify_ratio = 0.95,
      texture_size = 1024,
      output_format = "glb",
      multiimage_algo,
    } = req.body;

    if (!image_list_base64 || !Array.isArray(image_list_base64) || image_list_base64.length < 2) {
      return res.status(400).json({ message: "image_list_base64 deve contenere almeno 2 immagini" });
    }

    const [result] = await db.query(
      `INSERT INTO generations (user_id, username, mode, preview, seed, ss_guidance_strength, ss_sampling_steps, slat_guidance_strength, slat_sampling_steps, mesh_simplify_ratio, texture_size, output_format, multiimage_algo, status)
       VALUES (?, ?, 'multi', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued')`,
      [
        req.user.id, req.user.username, preview ? 1 : 0,
        seed || null, ss_guidance_strength || null, ss_sampling_steps || null,
        slat_guidance_strength || null, slat_sampling_steps || null,
        mesh_simplify_ratio, texture_size, output_format, multiimage_algo || null,
      ]
    );

    const jobId = result.insertId;

    // Save image list to disk as JSON
    saveJobImage(jobId, JSON.stringify(image_list_base64));

    await recalcQueuePositions();
    const position = await getQueuePosition(jobId);

    res.status(201).json({
      job_id: jobId,
      status: "queued",
      queue_position: position,
    });
  } catch (err) {
    console.error("[trellis/generate-multi]", err);
    res.status(500).json({ message: "Errore creazione job multi", error: err.message });
  }
});

// Get job status
router.get("/job/:id", authenticateToken, authorizeRoles("admin", "editor"), authorizeJobAccess, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, user_id, username, created_at, status, queue_position, mode, preview, progress, trellis_message, error_message, started_at, completed_at, seed, ss_guidance_strength, ss_sampling_steps, slat_guidance_strength, slat_sampling_steps, mesh_simplify_ratio, texture_size, output_format
       FROM generations WHERE id = ?`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ message: "Job non trovato" });

    const job = rows[0];

    // Recalculate live queue position for queued jobs
    if (job.status === "queued") {
      job.queue_position = await getQueuePosition(job.id);
    }

    res.json(job);
  } catch (err) {
    res.status(500).json({ message: "Errore recupero stato job", error: err.message });
  }
});

// Resume from preview (finalize)
router.post("/job/:id/resume", authenticateToken, authorizeRoles("admin", "editor"), authorizeJobAccess, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM generations WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Job non trovato" });

    const job = rows[0];
    if (job.status !== "preview_ready") {
      return res.status(400).json({ message: "Job non in stato preview_ready" });
    }

    const mesh_simplify_ratio = req.body.mesh_simplify_ratio ?? job.mesh_simplify_ratio;
    const texture_size = req.body.texture_size ?? job.texture_size;

    await db.query(
      "UPDATE generations SET status = 'finalizing', mesh_simplify_ratio = ?, texture_size = ? WHERE id = ?",
      [mesh_simplify_ratio, texture_size, req.params.id]
    );

    res.json({ message: "Finalizzazione avviata", status: "finalizing" });
  } catch (err) {
    res.status(500).json({ message: "Errore resume job", error: err.message });
  }
});

// Interrupt / cancel job
router.post("/job/:id/interrupt", authenticateToken, authorizeRoles("admin", "editor"), authorizeJobAccess, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM generations WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Job non trovato" });

    const job = rows[0];

    if (job.status === "queued") {
      // Just remove from queue
      await db.query("UPDATE generations SET status = 'failed', error_message = 'Cancelled by user', completed_at = datetime('now') WHERE id = ?", [job.id]);
      cleanupJobImage(job.id);
      await recalcQueuePositions();
      return res.json({ message: "Job rimosso dalla coda" });
    }

    if (job.status === "generating" || job.status === "preview_ready" || job.status === "finalizing") {
      // Interrupt TRELLIS
      try {
        await interruptTrellis();
      } catch {
        // TRELLIS might not be reachable, still mark as failed
      }
      await db.query("UPDATE generations SET status = 'failed', error_message = 'Interrupted by user', completed_at = datetime('now') WHERE id = ?", [job.id]);
      cleanupJobImage(job.id);
      await recalcQueuePositions();
      return res.json({ message: "Job interrotto" });
    }

    res.status(400).json({ message: "Job non interrompibile (status: " + job.status + ")" });
  } catch (err) {
    res.status(500).json({ message: "Errore interruzione job", error: err.message });
  }
});

// Download preview video
router.get("/job/:id/download/preview/:type", authenticateToken, authorizeRoles("admin", "editor"), authorizeJobAccess, async (req, res) => {
  try {
    const type = req.params.type;
    if (!["gaussian", "mesh"].includes(type)) {
      return res.status(400).json({ message: "Tipo preview non valido (gaussian o mesh)" });
    }

    const [rows] = await db.query("SELECT status FROM generations WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Job non trovato" });
    if (!["preview_ready", "finalizing", "complete"].includes(rows[0].status)) {
      return res.status(400).json({ message: "Preview non disponibile per questo stato" });
    }

    const response = await downloadPreview(type);
    res.set("Content-Type", "video/mp4");
    res.set("Content-Disposition", `inline; filename="preview_${type}_${req.params.id}.mp4"`);
    response.data.pipe(res);
  } catch (err) {
    res.status(502).json({ message: "Errore download preview", error: err.message });
  }
});

// Download final model
router.get("/job/:id/download/model", authenticateToken, authorizeRoles("admin", "editor"), authorizeJobAccess, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT status, output_format FROM generations WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Job non trovato" });
    if (rows[0].status !== "complete") {
      return res.status(400).json({ message: "Modello non ancora pronto" });
    }

    const format = rows[0].output_format || "glb";
    const response = await downloadModel();
    res.set("Content-Type", "model/gltf-binary");
    res.set("Content-Disposition", `attachment; filename="model_${req.params.id}.${format}"`);
    response.data.pipe(res);
  } catch (err) {
    res.status(502).json({ message: "Errore download modello", error: err.message });
  }
});

module.exports = router;
