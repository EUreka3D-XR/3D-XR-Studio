const axios = require("axios");
const fs = require("fs");
const path = require("path");
const db = require("../config/db");

const TRELLIS_URL = (process.env.TRELLIS_API_URL || "http://localhost:7960").replace(/\/+$/, "");
const QUEUE_DIR = path.join(__dirname, "..", "data", "queue");
// LAST UPDATE: 2026-04-09 11:15 - fix activeJobId stale release

// Ensure queue directory exists
if (!fs.existsSync(QUEUE_DIR)) {
  fs.mkdirSync(QUEUE_DIR, { recursive: true });
}

let activeJobId = null;
let pollingInterval = null;
let processingLock = false;

/**
 * Check if TRELLIS is available and not busy
 */
async function isTrellisReady() {
  try {
    const res = await axios.get(`${TRELLIS_URL}/ping`, { timeout: 5000 });
    return res.data && res.data.status === "running" && !res.data.busy;
  } catch {
    return false;
  }
}

/**
 * Ping TRELLIS for health check (used by route)
 */
async function pingTrellis() {
  const res = await axios.get(`${TRELLIS_URL}/ping`, { timeout: 5000 });
  return res.data;
}

/**
 * Get current TRELLIS status
 */
async function getTrellisStatus() {
  const res = await axios.get(`${TRELLIS_URL}/status`, { timeout: 5000 });
  return res.data;
}

/**
 * Send a job to TRELLIS
 */
async function dispatchJob(job) {
  // Read image from disk
  const imagePath = path.join(QUEUE_DIR, `${job.id}_image.txt`);
  if (!fs.existsSync(imagePath)) {
    throw new Error("Image file not found on disk");
  }

  const imageData = fs.readFileSync(imagePath, "utf8");
  const usePreview = job.preview === 1;

  let endpoint;
  // TRELLIS API expects form data (application/x-www-form-urlencoded), not JSON
  const formData = new URLSearchParams();

  if (job.mode === "multi") {
    // Multi-image: imageData is JSON array of base64 strings
    const imageList = JSON.parse(imageData);
    endpoint = usePreview ? "/generate_multi_preview" : "/generate_multi_no_preview";
    imageList.forEach((img) => formData.append("image_list_base64", img));
    if (job.multiimage_algo) formData.append("multiimage_algo", job.multiimage_algo);
  } else {
    // Single-image
    endpoint = usePreview ? "/generate_preview" : "/generate_no_preview";
    formData.append("image_base64", imageData);
  }

  // Add generation parameters
  if (job.seed != null) formData.append("seed", job.seed);
  if (job.ss_guidance_strength != null) formData.append("ss_guidance_strength", job.ss_guidance_strength);
  if (job.ss_sampling_steps != null) formData.append("ss_sampling_steps", job.ss_sampling_steps);
  if (job.slat_guidance_strength != null) formData.append("slat_guidance_strength", job.slat_guidance_strength);
  if (job.slat_sampling_steps != null) formData.append("slat_sampling_steps", job.slat_sampling_steps);
  if (job.mesh_simplify_ratio != null) formData.append("mesh_simplify_ratio", job.mesh_simplify_ratio);
  if (job.texture_size != null) formData.append("texture_size", job.texture_size);
  if (job.output_format) formData.append("output_format", job.output_format);

  const res = await axios.post(`${TRELLIS_URL}${endpoint}`, formData.toString(), {
    timeout: 30000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return res.data;
}

/**
 * Resume from preview to final model
 */
async function resumeFromPreview(job) {
  const queryParams = {};
  if (job.mesh_simplify_ratio != null) queryParams.mesh_simplify_ratio = job.mesh_simplify_ratio;
  if (job.texture_size != null) queryParams.texture_size = job.texture_size;

  console.log(`[TrellisQueue] Calling /resume_from_preview with params:`, JSON.stringify(queryParams));

  // resume_from_preview is synchronous — TRELLIS processes the full model before responding
  // (decimate, rasterize, mincut, rendering, texture baking) — can take several minutes
  const res = await axios.post(`${TRELLIS_URL}/resume_from_preview`, null, {
    timeout: 600000,
    params: queryParams,
  });
  console.log(`[TrellisQueue] Resume response:`, JSON.stringify(res.data));
  return res.data;
}

/**
 * Interrupt current TRELLIS generation
 */
async function interruptTrellis() {
  const res = await axios.post(`${TRELLIS_URL}/interrupt`, {}, { timeout: 10000 });
  return res.data;
}

/**
 * Download preview video from TRELLIS
 */
async function downloadPreview(type) {
  const res = await axios.get(`${TRELLIS_URL}/download/preview/${type}`, {
    responseType: "stream",
    timeout: 60000,
  });
  return res;
}

/**
 * Download final model from TRELLIS
 */
async function downloadModel() {
  const res = await axios.get(`${TRELLIS_URL}/download/model`, {
    responseType: "stream",
    timeout: 120000,
  });
  return res;
}

/**
 * Recalculate queue positions for all queued jobs
 */
async function recalcQueuePositions() {
  const [rows] = await db.query(
    "SELECT id FROM generations WHERE status = 'queued' ORDER BY created_at ASC, id ASC"
  );
  for (let i = 0; i < rows.length; i++) {
    await db.query("UPDATE generations SET queue_position = ? WHERE id = ?", [i + 1, rows[i].id]);
  }
}

/**
 * Get queue position for a specific job
 */
async function getQueuePosition(jobId) {
  const [rows] = await db.query(
    "SELECT id FROM generations WHERE status = 'queued' ORDER BY created_at ASC, id ASC"
  );
  const idx = rows.findIndex((r) => r.id === jobId);
  return idx >= 0 ? idx + 1 : 0;
}

/**
 * Poll TRELLIS status for the active job
 */
async function pollActiveJob() {
  if (!activeJobId) return;

  try {
    const status = await getTrellisStatus();
    // Update job progress (skip redundant updates when preview_ready)
    const [currentJob] = await db.query("SELECT status, progress FROM generations WHERE id = ?", [activeJobId]);
    const dbStatus = currentJob.length ? currentJob[0].status : null;
    const dbProgress = currentJob.length ? currentJob[0].progress : null;

    // If DB job is already failed/complete, stop polling it
    if (dbStatus === "failed" || dbStatus === "complete") {
      console.log(`[TrellisQueue] Stopping poll for job #${activeJobId} (DB status: ${dbStatus})`);
      activeJobId = null;
      return;
    }

    // Only log when status or progress changes
    if (status.progress !== dbProgress || status.status !== (dbStatus || "").toUpperCase()) {
      console.log(`[TrellisQueue] Poll job #${activeJobId}: TRELLIS status=${status.status}, progress=${status.progress}, busy=${status.busy}`);
    }

    // Only update progress if it actually changed
    if (status.progress !== dbProgress) {
      await db.query(
        "UPDATE generations SET progress = ?, trellis_message = ? WHERE id = ?",
        [status.progress || 0, status.message || "", activeJobId]
      );
    }

    if (status.status === "COMPLETE") {
      await db.query(
        "UPDATE generations SET status = 'complete', progress = 100, completed_at = datetime('now') WHERE id = ?",
        [activeJobId]
      );
      // Clean up image from disk
      cleanupJobImage(activeJobId);
      console.log(`[TrellisQueue] Job #${activeJobId} completed`);
      activeJobId = null;
      await recalcQueuePositions();
    } else if (status.status === "PREVIEW_READY") {
      // Check current DB status — don't overwrite if user already clicked Finalize (finalizing)
      const [previewJobs] = await db.query("SELECT status FROM generations WHERE id = ?", [activeJobId]);
      if (previewJobs.length && previewJobs[0].status !== "preview_ready" && previewJobs[0].status !== "finalizing") {
        await db.query(
          "UPDATE generations SET status = 'preview_ready', progress = 100 WHERE id = ?",
          [activeJobId]
        );
        console.log(`[TrellisQueue] Job #${activeJobId} preview ready`);
      }
      // Don't clear activeJobId — TRELLIS is still "holding" the preview
    } else if (status.status === "FAILED") {
      await db.query(
        "UPDATE generations SET status = 'failed', error_message = ?, completed_at = datetime('now') WHERE id = ?",
        [status.message || "TRELLIS generation failed", activeJobId]
      );
      cleanupJobImage(activeJobId);
      console.log(`[TrellisQueue] Job #${activeJobId} failed: ${status.message}`);
      activeJobId = null;
      await recalcQueuePositions();
    } else if (status.status === "IDLE" || (!status.busy && status.status === "IDLE")) {
      // TRELLIS went idle — check what our job was doing
      const [jobs] = await db.query("SELECT status FROM generations WHERE id = ?", [activeJobId]);
      if (jobs.length && jobs[0].status === "generating") {
        // Job was actively generating but TRELLIS went idle — something went wrong
        await db.query(
          "UPDATE generations SET status = 'failed', error_message = 'TRELLIS went idle unexpectedly', completed_at = datetime('now') WHERE id = ?",
          [activeJobId]
        );
        cleanupJobImage(activeJobId);
        console.log(`[TrellisQueue] Job #${activeJobId} failed (was generating): TRELLIS went idle unexpectedly`);
        activeJobId = null;
        await recalcQueuePositions();
      } else if (jobs.length && (jobs[0].status === "preview_ready" || jobs[0].status === "finalizing")) {
        // TRELLIS is idle while preview is ready or user just clicked finalize — this is normal
        // TRELLIS waits idle for resume; processNextJob will send the resume command
        console.log(`[TrellisQueue] TRELLIS idle, job #${activeJobId} is ${jobs[0].status} — waiting for resume`);
      }
    }
    // For GENERATING / FINALIZING states, just keep polling
  } catch (err) {
    console.error(`[TrellisQueue] Error polling status for job #${activeJobId}:`, err.message);
  }
}

/**
 * Process the next queued job
 */
async function processNextJob() {
  if (processingLock) return;
  processingLock = true;
  try {
    await _processNextJob();
  } finally {
    processingLock = false;
  }
}

async function _processNextJob() {
  if (activeJobId) {
    const [activeJobs] = await db.query("SELECT status FROM generations WHERE id = ?", [activeJobId]);
    // If the active job is already failed or complete in DB, release it
    if (!activeJobs.length || activeJobs[0].status === "failed" || activeJobs[0].status === "complete") {
      console.log(`[TrellisQueue] Releasing stale activeJobId #${activeJobId} (status: ${activeJobs.length ? activeJobs[0].status : 'not found'})`);
      activeJobId = null;
      // Fall through to process next job
    } else if (activeJobs[0].status === "preview_ready") {
      // Don't dispatch new job while preview is pending
      return;
    } else if (activeJobs[0].status === "finalizing") {
      // User clicked Finalize — send resume to TRELLIS
      try {
        const [jobData] = await db.query("SELECT * FROM generations WHERE id = ?", [activeJobId]);
        await resumeFromPreview(jobData[0]);
        // Set status to 'generating' so we don't call resume again on next cycle
        await db.query("UPDATE generations SET status = 'generating' WHERE id = ?", [activeJobId]);
        console.log(`[TrellisQueue] Resumed job #${activeJobId} from preview`);
      } catch (err) {
        await db.query(
          "UPDATE generations SET status = 'failed', error_message = ? WHERE id = ?",
          [`Resume failed: ${err.message}`, activeJobId]
        );
        cleanupJobImage(activeJobId);
        console.error(`[TrellisQueue] Resume failed for job #${activeJobId}:`, err.message);
        activeJobId = null;
        await recalcQueuePositions();
      }
      return;
    } else {
      // Still have an active non-preview job, poll it
      await pollActiveJob();
      return;
    }
  }

  // Check for resume jobs first (preview_ready -> finalizing)
  const [resumeJobs] = await db.query(
    "SELECT * FROM generations WHERE status = 'finalizing' ORDER BY id ASC LIMIT 1"
  );
  if (resumeJobs.length) {
    const job = resumeJobs[0];
    activeJobId = job.id;
    try {
      await resumeFromPreview(job);
      console.log(`[TrellisQueue] Resumed job #${job.id} from preview`);
    } catch (err) {
      await db.query(
        "UPDATE generations SET status = 'failed', error_message = ? WHERE id = ?",
        [`Resume failed: ${err.message}`, job.id]
      );
      activeJobId = null;
      console.error(`[TrellisQueue] Resume failed for job #${job.id}:`, err.message);
    }
    return;
  }

  // Check if TRELLIS is ready for new work
  const ready = await isTrellisReady();
  if (!ready) return;

  // Get next queued job
  const [queuedJobs] = await db.query(
    "SELECT * FROM generations WHERE status = 'queued' ORDER BY created_at ASC, id ASC LIMIT 1"
  );
  if (!queuedJobs.length) return;

  const job = queuedJobs[0];
  activeJobId = job.id;

  try {
    await db.query(
      "UPDATE generations SET status = 'generating', started_at = datetime('now'), queue_position = 0 WHERE id = ?",
      [job.id]
    );
    await recalcQueuePositions();

    await dispatchJob(job);
    console.log(`[TrellisQueue] Dispatched job #${job.id} (mode: ${job.mode}, preview: ${job.preview})`);
  } catch (err) {
    await db.query(
      "UPDATE generations SET status = 'failed', error_message = ? WHERE id = ?",
      [`Dispatch failed: ${err.message}`, job.id]
    );
    cleanupJobImage(job.id);
    activeJobId = null;
    console.error(`[TrellisQueue] Dispatch failed for job #${job.id}:`, err.message);
    await recalcQueuePositions();
  }
}

/**
 * Remove temporary image file from disk
 */
function cleanupJobImage(jobId) {
  try {
    const imagePath = path.join(QUEUE_DIR, `${jobId}_image.txt`);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Save image data to disk for a queued job
 */
function saveJobImage(jobId, imageData) {
  const imagePath = path.join(QUEUE_DIR, `${jobId}_image.txt`);
  fs.writeFileSync(imagePath, imageData, "utf8");
}

/**
 * Start the queue processor
 */
function startQueueProcessor() {
  console.log("[TrellisQueue] Queue processor started (interval: 5s, poll: 3s)");

  // Main processor: check for new jobs every 5 seconds
  setInterval(async () => {
    try {
      await processNextJob();
    } catch (err) {
      console.error("[TrellisQueue] Processor error:", err.message);
    }
  }, 5000);

  // Active job poller: poll TRELLIS status every 3 seconds
  setInterval(async () => {
    if (activeJobId) {
      try {
        await pollActiveJob();
      } catch (err) {
        console.error("[TrellisQueue] Poll error:", err.message);
      }
    }
  }, 3000);

  // On startup, reset any jobs stuck in intermediate states back to queued
  (async () => {
    try {
      await db.query(
        "UPDATE generations SET status = 'queued', started_at = NULL WHERE status IN ('generating', 'finalizing', 'preview_ready')"
      );
      await recalcQueuePositions();
    } catch (err) {
      console.error("[TrellisQueue] Startup reset error:", err.message);
    }
  })();
}

module.exports = {
  startQueueProcessor,
  pingTrellis,
  getTrellisStatus,
  interruptTrellis,
  downloadPreview,
  downloadModel,
  saveJobImage,
  cleanupJobImage,
  recalcQueuePositions,
  getQueuePosition,
  TRELLIS_URL,
};
