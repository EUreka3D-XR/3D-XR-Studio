const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const pool = require('../config/db');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

/* Helpers */
function vld(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'ValidationError', details: errors.array() });
  }
}

/* =======================================================
   CREATE - Crea un POI (in coda o a una certa posizione)
   POST /api/env_pois
   body: {
     environment_id, label, latitude, longitude,
     description?, rel_x?, rel_y?, rel_z?, extra_media_url?,
     position?  // se fornita, inserisce e shifta i successivi
   }
   ======================================================= */
router.post(
  '/',
  body('environment_id').isInt({ gt: 0 }),
  body('label').isString().trim().isLength({ min: 1, max: 255 }),
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  body('description').optional({ nullable: true }).isString().trim().isLength({ max: 65535 }),
  body('rel_x').optional({ nullable: true }).isFloat(),
  body('rel_y').optional({ nullable: true }).isFloat(),
  body('rel_z').optional({ nullable: true }).isFloat(),
  body('extra_media_url').optional({ nullable: true }).isString().trim().isLength({ max: 512 }),
  body('position').optional().isInt({ min: 1 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;

    const {
      environment_id, label, latitude, longitude,
      description = null, rel_x = null, rel_y = null, rel_z = null,
      extra_media_url = null, position
    } = req.body;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [env] = await conn.query(`SELECT id FROM environments WHERE id=? AND deleted=0`, [environment_id]);
      if (!env.length) {
        await conn.rollback(); conn.release();
        return res.status(404).json({ error: 'EnvironmentNotFound' });
      }

      // Calcolo posizione
      let finalPos;
      if (position && position > 0) {
        await conn.query(
          `UPDATE env_pois
             SET position = position + 1
           WHERE environment_id = ? AND deleted = 0 AND position >= ?`,
          [environment_id, position]
        );
        finalPos = position;
      } else {
        // Inserisci in coda
        const [mx] = await conn.query(
          `SELECT COALESCE(MAX(position), 0) AS max_pos
             FROM env_pois
            WHERE environment_id = ? AND deleted = 0`,
          [environment_id]
        );
        finalPos = (mx[0].max_pos || 0) + 1;
      }

      // Inserisci POI
      const [ins] = await conn.query(
        `INSERT INTO env_pois
           (environment_id, position, label, description,
            latitude, longitude, rel_x, rel_y, rel_z,
            extra_media_url, created_at, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
        [environment_id, finalPos, label, description,
         latitude, longitude, rel_x, rel_y, rel_z,
         extra_media_url]
      );

      await conn.commit();

      const [row] = await pool.query(`SELECT * FROM env_pois WHERE id = ?`, [ins.insertId]);
      return res.status(201).json(row[0]);
    } catch (e) {
      await conn.rollback();
      console.error('POST /env_pois', e);
      return res.status(500).json({ error: 'ServerError' });
    } finally {
      conn.release();
    }
  }
);

/* =======================================================
   LIST - Lista POI per environment_id
   GET /api/env_pois?environment_id=123
   ======================================================= */
router.get(
  '/',
  query('environment_id').isInt({ gt: 0 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;
    const environmentId = parseInt(req.query.environment_id, 10);

    try {
      const [rows] = await pool.query(
        `SELECT * FROM env_pois
          WHERE environment_id = ? AND deleted = 0
       ORDER BY position ASC, id ASC`,
        [environmentId]
      );
      return res.json(rows);
    } catch (e) {
      console.error('GET /env_pois', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);

/* =======================================================
   READ - Dettaglio POI
   GET /api/env_pois/:id
   ======================================================= */
router.get(
  '/:id',
  param('id').isInt({ gt: 0 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;

    try {
      const [rows] = await pool.query(
        `SELECT * FROM env_pois WHERE id = ? AND deleted = 0`,
        [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'NotFound' });
      return res.json(rows[0]);
    } catch (e) {
      console.error('GET /env_pois/:id', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);

/* =======================================================
   UPDATE - Aggiorna POI
   PUT /api/env_pois/:id
   body: { label?, description?, latitude?, longitude?, rel_x?, rel_y?, rel_z?, extra_media_url? }
   (NB: per spostare il POI in un'altra posizione usa PATCH /reorder)
   ======================================================= */
router.put(
  '/:id',
  param('id').isInt({ gt: 0 }),
  body('label').optional().isString().trim().isLength({ min: 1, max: 255 }),
  body('description').optional({ nullable: true }).isString().trim().isLength({ max: 65535 }),
  body('latitude').optional().isFloat({ min: -90, max: 90 }),
  body('longitude').optional().isFloat({ min: -180, max: 180 }),
  body('rel_x').optional({ nullable: true }).isFloat(),
  body('rel_y').optional({ nullable: true }).isFloat(),
  body('rel_z').optional({ nullable: true }).isFloat(),
  body('extra_media_url').optional({ nullable: true }).isString().trim().isLength({ max: 512 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;

    const fields = [];
    const params = [];
    const updatable = ['label','description','latitude','longitude','rel_x','rel_y','rel_z','extra_media_url'];
    updatable.forEach(k => {
      if (req.body[k] !== undefined) {
        fields.push(`${k} = ?`);
        params.push(req.body[k]);
      }
    });

    if (!fields.length) return res.status(400).json({ error: 'NothingToUpdate' });

    params.push(req.params.id);

    try {
      const [r] = await pool.query(
        `UPDATE env_pois
            SET ${fields.join(', ')}
          WHERE id = ? AND deleted = 0`,
        params
      );
      if (r.affectedRows === 0) return res.status(404).json({ error: 'NotFound' });

      const [row] = await pool.query(`SELECT * FROM env_pois WHERE id = ?`, [req.params.id]);
      return res.json(row[0]);
    } catch (e) {
      console.error('PUT /env_pois/:id', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);

/* =======================================================
   REORDER - Riordina POI di un ambiente
   PATCH /api/env_pois/reorder
   body: { environment_id, order: [poiId1, poiId2, ...] } // ordine target 1..N
   ======================================================= */
router.patch(
  '/reorder',
  body('environment_id').isInt({ gt: 0 }),
  body('order').isArray({ min: 1 }),
  body('order.*').isInt({ gt: 0 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;
    const environmentId = parseInt(req.body.environment_id, 10);
    const order = req.body.order.map(Number);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existing] = await conn.query(
        `SELECT id FROM env_pois
          WHERE environment_id = ? AND deleted = 0
       ORDER BY position ASC, id ASC`,
        [environmentId]
      );
      const existingIds = existing.map(r => r.id);

      // Deve essere lo stesso set
      const sameSize = existingIds.length === order.length;
      const sameSet = sameSize && existingIds.every(id => order.includes(id));
      if (!sameSet) {
        await conn.rollback(); conn.release();
        return res.status(400).json({ error: 'InvalidOrderPayload' });
      }

      // Aggiorna posizioni 1..N
      for (let i = 0; i < order.length; i++) {
        await conn.query(
          `UPDATE env_pois
              SET position = ?
            WHERE id = ? AND environment_id = ?`,
          [i + 1, order[i], environmentId]
        );
      }

      await conn.commit();

      const [rows] = await pool.query(
        `SELECT * FROM env_pois
          WHERE environment_id = ? AND deleted = 0
       ORDER BY position ASC, id ASC`,
        [environmentId]
      );
      return res.json(rows);
    } catch (e) {
      await conn.rollback();
      console.error('PATCH /env_pois/reorder', e);
      return res.status(500).json({ error: 'ServerError' });
    } finally {
      conn.release();
    }
  }
);

/* =======================================================
   DELETE - Soft delete POI + ricompattazione posizioni
   DELETE /api/env_pois/:id
   ======================================================= */
router.delete(
  '/:id',
  param('id').isInt({ gt: 0 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;
    const poiId = parseInt(req.params.id, 10);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Prendi environment_id e position del POI
      const [cur] = await conn.query(
        `SELECT environment_id, position
           FROM env_pois
          WHERE id = ? AND deleted = 0`,
        [poiId]
      );
      if (!cur.length) {
        await conn.rollback(); conn.release();
        return res.status(404).json({ error: 'NotFound' });
      }
      const environmentId = cur[0].environment_id;
      const removedPos = cur[0].position;

      // Soft delete
      await conn.query(
        `UPDATE env_pois
            SET deleted = 1
          WHERE id = ? AND deleted = 0`,
        [poiId]
      );

      // Ricompatta posizioni successive
      await conn.query(
        `UPDATE env_pois
            SET position = position - 1
          WHERE environment_id = ? AND deleted = 0 AND position > ?`,
        [environmentId, removedPos]
      );

      await conn.commit();
      return res.status(204).send();
    } catch (e) {
      await conn.rollback();
      console.error('DELETE /env_pois/:id', e);
      return res.status(500).json({ error: 'ServerError' });
    } finally {
      conn.release();
    }
  }
);

/* =======================================================
   POI MEDIA MANAGEMENT
   ======================================================= */

/* =======================================================
   CREATE POI MEDIA - Aggiungi media a un POI
   POST /api/env_pois/:id/media
   body: { type, title?, url?, lang?, content? }
   file: file (opzionale, solo per type='image' o 'audio')
   ======================================================= */
router.post(
  '/:id/media',
  upload.single('file'),
  param('id').isInt({ gt: 0 }),
  body('type').isIn(['image', 'video', 'url', 'other', 'audio']),
  body('title').optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
  body('url').optional({ nullable: true }).isString().trim().isLength({ min: 1, max: 512 }),
  body('lang').optional({ nullable: true }).isString().trim().isLength({ max: 5 }),
  body('content').optional({ nullable: true }).isString().trim(),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;

    const poiId = parseInt(req.params.id, 10);
    const { type, title = null, url = null, lang = null, content = null } = req.body;

    try {
      const [poi] = await pool.query(
        `SELECT id, environment_id FROM env_pois WHERE id = ? AND deleted = 0`,
        [poiId]
      );
      if (!poi.length) {
        return res.status(404).json({ error: 'POINotFound' });
      }

      const environmentId = poi[0].environment_id;
      let finalUrl = url;

      if ((type === 'image' || type === 'audio' || type === 'video') && !url && req.file) {
        const uploadDir = path.join(process.cwd(), 'uploads', `env_${environmentId}`);
        
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const originalName = "POI_"+poiId+"_"+req.file.originalname;        
        const finalPath = path.join(uploadDir, originalName);
        
        fs.renameSync(req.file.path, finalPath);

        // Imposta l'URL relativo
        finalUrl = `/uploads/env_${environmentId}/${originalName}`;
      }

      // Inserisci il media
      const [ins] = await pool.query(
        `INSERT INTO env_poi_media (poi_id, type, title, url, content, lang, created_at, deleted)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), 0)`,
        [poiId, type, title, finalUrl, content, lang]
      );

      const [row] = await pool.query(`SELECT * FROM env_poi_media WHERE id = ?`, [ins.insertId]);
      const newMedia = row[0];

      // Trasforma l'URL locale in endpoint di download/stream (come nel GET)
      if (newMedia.url && newMedia.url.startsWith('/uploads/')) {
        const apiBaseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}/api`;
        if (newMedia.type === 'video') {
          newMedia.url = `${apiBaseUrl}/env_pois/media/${newMedia.id}/stream`;
        } else {
          newMedia.url = `${apiBaseUrl}/env_pois/media/${newMedia.id}/download`;
        }
      }

      return res.status(201).json(newMedia);
    } catch (e) {
      console.error('POST /env_pois/:id/media', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);

/* =======================================================
   LIST POI MEDIA - Lista media di un POI
   GET /api/env_pois/:id/media
   ======================================================= */
router.get(
  '/:id/media',
  param('id').isInt({ gt: 0 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;
    const poiId = parseInt(req.params.id, 10);
    const apiBaseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}/api`;

    try {
      const [rows] = await pool.query(
        `SELECT * FROM env_poi_media
          WHERE poi_id = ? AND deleted = 0
       ORDER BY created_at ASC`,
        [poiId]
      );

      // Trasforma gli URL locali in endpoint di download/stream
      const modifiedRows = rows.map(media => {
        if (media.url && media.url.startsWith('/uploads/')) {
          if (media.type === 'video') {
            return {
              ...media,
              url: `${apiBaseUrl}/env_pois/media/${media.id}/stream`
            };
          }
          return {
            ...media,
            url: `${apiBaseUrl}/env_pois/media/${media.id}/download`
          };
        }
        return media;
      });

      return res.json(modifiedRows);
    } catch (e) {
      console.error('GET /env_pois/:id/media', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);

/* =======================================================
   UPDATE POI MEDIA - Aggiorna un media
   PUT /api/env_pois/media/:mediaId
   body: { type?, title?, url?, lang?, content? }
   file: file (opzionale, solo per type='image' o 'audio')
   ======================================================= */
router.put(
  '/media/:mediaId',
  upload.single('file'),
  param('mediaId').isInt({ gt: 0 }),
  body('type').optional().isIn(['image', 'video', 'url', 'other', 'audio']),
  body('title').optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
  body('url').optional({ nullable: true }).isString().trim().isLength({ min: 1, max: 512 }),
  body('lang').optional({ nullable: true }).isString().trim().isLength({ max: 5 }),
  body('content').optional({ nullable: true }).isString().trim(),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;

    const mediaId = parseInt(req.params.mediaId, 10);

    try {
      const [existingMedia] = await pool.query(
        `SELECT * FROM env_poi_media WHERE id = ? AND deleted = 0`,
        [mediaId]
      );
      
      if (!existingMedia.length) {
        return res.status(404).json({ error: 'MediaNotFound' });
      }

      const currentMedia = existingMedia[0];
      const currentType = req.body.type || currentMedia.type;

      // Recupera l'environment_id dal POI
      const [poi] = await pool.query(
        `SELECT environment_id FROM env_pois WHERE id = ? AND deleted = 0`,
        [currentMedia.poi_id]
      );
      
      if (!poi.length) {
        return res.status(404).json({ error: 'POINotFound' });
      }

      const environmentId = poi[0].environment_id;

      const fields = [];
      const params = [];
      const updatable = ['type', 'title', 'url', 'lang', 'content'];
      
      updatable.forEach(k => {
        if (req.body[k] !== undefined) {
          fields.push(`${k} = ?`);
          params.push(req.body[k]);
        }
      });

      if ((currentType === 'image' || currentType === 'audio' || currentType === 'video') &&
          !req.body.url &&
          req.file) {
        
        const uploadDir = path.join(process.cwd(), 'uploads', `env_${environmentId}`);
        
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const originalName = "POI_"+currentMedia.poi_id+"_"+req.file.originalname;
        const finalPath = path.join(uploadDir, originalName);
        
        fs.renameSync(req.file.path, finalPath);

        // Imposta l'URL relativo
        const finalUrl = `/uploads/env_${environmentId}/${originalName}`;
        
        fields.push(`url = ?`);
        params.push(finalUrl);
      }

      if (!fields.length) return res.status(400).json({ error: 'NothingToUpdate' });

      params.push(mediaId);

      const [r] = await pool.query(
        `UPDATE env_poi_media
            SET ${fields.join(', ')}
          WHERE id = ? AND deleted = 0`,
        params
      );
      if (r.affectedRows === 0) return res.status(404).json({ error: 'NotFound' });

      const [row] = await pool.query(`SELECT * FROM env_poi_media WHERE id = ?`, [mediaId]);
      const updatedMedia = row[0];

      // Trasforma l'URL locale in endpoint di download/stream (come nel GET)
      if (updatedMedia.url && updatedMedia.url.startsWith('/uploads/')) {
        const apiBaseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}/api`;
        if (updatedMedia.type === 'video') {
          updatedMedia.url = `${apiBaseUrl}/env_pois/media/${updatedMedia.id}/stream`;
        } else {
          updatedMedia.url = `${apiBaseUrl}/env_pois/media/${updatedMedia.id}/download`;
        }
      }

      return res.json(updatedMedia);
    } catch (e) {
      console.error('PUT /env_pois/media/:mediaId', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);

/* =======================================================
   DELETE POI MEDIA - Elimina un media
   DELETE /api/env_pois/media/:mediaId
   ======================================================= */
router.delete(
  '/media/:mediaId',
  param('mediaId').isInt({ gt: 0 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;

    try {
      const [r] = await pool.query(
        `UPDATE env_poi_media
            SET deleted = 1
          WHERE id = ? AND deleted = 0`,
        [req.params.mediaId]
      );
      if (r.affectedRows === 0) return res.status(404).json({ error: 'NotFound' });

      return res.status(204).send();
    } catch (e) {
      console.error('DELETE /env_pois/media/:mediaId', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);

/* =======================================================
   DOWNLOAD POI MEDIA FILE - Scarica il file di un media
   GET /api/env_pois/media/:mediaId/download
   ======================================================= */
router.get(
  '/media/:mediaId/download',
  param('mediaId').isInt({ gt: 0 }),
  async (req, res) => {
    const mediaId = parseInt(req.params.mediaId, 10);

    try {
      // Recupera il media dal database
      const [results] = await pool.query(
        `SELECT * FROM env_poi_media WHERE id = ? AND deleted = 0`,
        [mediaId]
      );
      
      if (!results || results.length === 0) {
        return res.status(404).json({ message: "Media non trovato" });
      }

      const media = results[0];

      if (!media.url) {
        return res.status(404).json({ message: "File non disponibile" });
      }

      if (!media.url.startsWith('/uploads/')) {
        return res.status(400).json({ message: "URL non è un file locale" });
      }

      // Costruisci il percorso assoluto del file
      const filePath = path.join(process.cwd(), media.url);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File non trovato sul server" });
      }

      res.download(filePath, (err) => {
        if (err) {
          console.error("Errore nel download del file:", err);
          res.status(500).json({ message: "Errore nel download del file" });
        }
      });
    } catch (error) {
      console.error("Errore nel processo di download:", error.message);
      res.status(500).json({ message: "Errore interno del server" });
    }
  }
);

/* =======================================================
   STREAM POI MEDIA VIDEO - Streaming video con HTTP Range
   GET /api/env_pois/media/:mediaId/stream
   Supporta HTTP Range requests per seeking e streaming
   ======================================================= */
router.get(
  '/media/:mediaId/stream',
  param('mediaId').isInt({ gt: 0 }),
  async (req, res) => {
    const mediaId = parseInt(req.params.mediaId, 10);

    try {
      // Recupera il media dal database
      const [results] = await pool.query(
        `SELECT * FROM env_poi_media WHERE id = ? AND deleted = 0`,
        [mediaId]
      );

      if (!results || results.length === 0) {
        return res.status(404).json({ message: "Media non trovato" });
      }

      const media = results[0];

      if (media.type !== 'video') {
        return res.status(400).json({ message: "Il media non è un video" });
      }

      if (!media.url) {
        return res.status(404).json({ message: "File video non disponibile" });
      }

      if (!media.url.startsWith('/uploads/')) {
        return res.status(400).json({ message: "URL non è un file locale, usa l'URL direttamente" });
      }

      // Costruisci il percorso assoluto del file
      const filePath = path.join(process.cwd(), media.url);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File video non trovato sul server" });
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;

      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.ogg': 'video/ogg',
        '.ogv': 'video/ogg',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.mkv': 'video/x-matroska'
      };
      const contentType = mimeTypes[ext] || 'video/mp4';

      const range = req.headers.range;

      if (range) {
        // Parsing del range header
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        // Validazione range
        if (start >= fileSize || end >= fileSize || start > end) {
          res.status(416).set({
            'Content-Range': `bytes */${fileSize}`
          });
          return res.end();
        }

        const chunkSize = (end - start) + 1;

        res.status(206).set({
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': contentType,
          'Cache-Control': 'no-cache'
        });

        // Stream del chunk richiesto
        const stream = fs.createReadStream(filePath, { start, end });

        stream.on('error', (err) => {
          console.error('Errore streaming video:', err);
          if (!res.headersSent) {
            res.status(500).json({ message: "Errore durante lo streaming" });
          }
        });

        stream.pipe(res);

      } else {
        // Nessun range richiesto - invia tutto il file
        res.status(200).set({
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache'
        });

        const stream = fs.createReadStream(filePath);

        stream.on('error', (err) => {
          console.error('Errore streaming video:', err);
          if (!res.headersSent) {
            res.status(500).json({ message: "Errore durante lo streaming" });
          }
        });

        stream.pipe(res);
      }

    } catch (error) {
      console.error("Errore nel processo di streaming:", error.message);
      res.status(500).json({ message: "Errore interno del server" });
    }
  }
);

/* =======================================================
   POI TRANSLATIONS MANAGEMENT
   ======================================================= */

/* =======================================================
   LIST POI TRANSLATIONS - Lista traduzioni di un POI
   GET /api/env_pois/:id/translations
   ======================================================= */
router.get(
  '/:id/translations',
  param('id').isInt({ gt: 0 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;
    const poiId = parseInt(req.params.id, 10);

    try {
      const [rows] = await pool.query(
        `SELECT * FROM env_poi_translations
          WHERE poi_id = ? AND deleted = 0
         ORDER BY lang ASC`,
        [poiId]
      );
      return res.json(rows);
    } catch (e) {
      console.error('GET /env_pois/:id/translations', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);

/* =======================================================
   GET POI TRANSLATION BY LANGUAGE
   GET /api/env_pois/:id/translations/:lang
   ======================================================= */
router.get(
  '/:id/translations/:lang',
  param('id').isInt({ gt: 0 }),
  param('lang').isString().trim().isLength({ min: 2, max: 5 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;
    const poiId = parseInt(req.params.id, 10);
    const lang = req.params.lang;

    try {
      const [rows] = await pool.query(
        `SELECT * FROM env_poi_translations
          WHERE poi_id = ? AND lang = ? AND deleted = 0`,
        [poiId, lang]
      );
      if (!rows.length) return res.status(404).json({ error: 'TranslationNotFound' });
      return res.json(rows[0]);
    } catch (e) {
      console.error('GET /env_pois/:id/translations/:lang', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);

/* =======================================================
   UPSERT POI TRANSLATION - Crea o aggiorna traduzione
   PUT /api/env_pois/:id/translations/:lang
   body: { label?, description? }
   ======================================================= */
router.put(
  '/:id/translations/:lang',
  param('id').isInt({ gt: 0 }),
  param('lang').isString().trim().isLength({ min: 2, max: 5 }),
  body('label').optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
  body('description').optional({ nullable: true }).isString().trim().isLength({ max: 65535 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;

    const poiId = parseInt(req.params.id, 10);
    const lang = req.params.lang;
    const { label = null, description = null } = req.body;

    try {
      const [poi] = await pool.query(
        `SELECT id FROM env_pois WHERE id = ? AND deleted = 0`,
        [poiId]
      );
      if (!poi.length) {
        return res.status(404).json({ error: 'POINotFound' });
      }

      const [existing] = await pool.query(
        `SELECT id FROM env_poi_translations
          WHERE poi_id = ? AND lang = ? AND deleted = 0`,
        [poiId, lang]
      );

      let translationId;

      if (existing.length > 0) {
        // UPDATE esistente
        translationId = existing[0].id;
        await pool.query(
          `UPDATE env_poi_translations
              SET label = ?, description = ?
            WHERE id = ?`,
          [label, description, translationId]
        );
      } else {
        // INSERT nuova
        const [ins] = await pool.query(
          `INSERT INTO env_poi_translations (poi_id, lang, label, description, created_at, deleted)
           VALUES (?, ?, ?, ?, datetime('now'), 0)`,
          [poiId, lang, label, description]
        );
        translationId = ins.insertId;
      }

      if (lang === 'en') {
        await pool.query(
          `UPDATE env_pois SET label = ?, description = ? WHERE id = ?`,
          [label, description, poiId]
        );
      }

      const [row] = await pool.query(
        `SELECT * FROM env_poi_translations WHERE id = ?`,
        [translationId]
      );
      return res.json(row[0]);
    } catch (e) {
      console.error('PUT /env_pois/:id/translations/:lang', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);

/* =======================================================
   DELETE POI TRANSLATION - Elimina una traduzione
   DELETE /api/env_pois/translations/:translationId
   ======================================================= */
router.delete(
  '/translations/:translationId',
  param('translationId').isInt({ gt: 0 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;

    try {
      const [r] = await pool.query(
        `UPDATE env_poi_translations
            SET deleted = 1
          WHERE id = ? AND deleted = 0`,
        [req.params.translationId]
      );
      if (r.affectedRows === 0) return res.status(404).json({ error: 'NotFound' });

      return res.status(204).send();
    } catch (e) {
      console.error('DELETE /env_pois/translations/:translationId', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);

module.exports = router;