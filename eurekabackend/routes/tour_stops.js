// routes/tour_stops.js
const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');

const pool = require('../config/db');

/* Helpers */
function vld(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'ValidationError', details: errors.array() });
  }
}

/* =======================================================
   CREATE - Crea una tappa (in coda o a una certa posizione)
   POST /api/route_stops
   body: {
     route_id, label, latitude, longitude,
     description?, rel_x?, rel_y?, rel_z?, extra_media_url?,
     position?  // se fornita, inserisce e shifta le successive
   }
   ======================================================= */
router.post(
  '/',
  body('route_id').isInt({ gt: 0 }),
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
      route_id, label, latitude, longitude,
      description = null, rel_x = null, rel_y = null, rel_z = null,
      extra_media_url = null, position
    } = req.body;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rt] = await conn.query(`SELECT id FROM routes WHERE id=? AND deleted=0`, [route_id]);
      if (!rt.length) {
        await conn.rollback(); conn.release();
        return res.status(404).json({ error: 'RouteNotFound' });
      }

      // Calcolo posizione
      let finalPos;
      if (position && position > 0) {
        await conn.query(
          `UPDATE route_stops
             SET position = position + 1
           WHERE route_id = ? AND deleted = 0 AND position >= ?`,
          [route_id, position]
        );
        finalPos = position;
      } else {
        // Inserisci in coda
        const [mx] = await conn.query(
          `SELECT COALESCE(MAX(position), 0) AS max_pos
             FROM route_stops
            WHERE route_id = ? AND deleted = 0`,
          [route_id]
        );
        finalPos = (mx[0].max_pos || 0) + 1;
      }

      // Inserisci tappa
      const [ins] = await conn.query(
        `INSERT INTO route_stops
           (route_id, position, label, description,
            latitude, longitude, rel_x, rel_y, rel_z,
            extra_media_url, created_at, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
        [route_id, finalPos, label, description,
         latitude, longitude, rel_x, rel_y, rel_z,
         extra_media_url]
      );

      await conn.commit();

      const [row] = await pool.query(`SELECT * FROM route_stops WHERE id = ?`, [ins.insertId]);
      return res.status(201).json(row[0]);
    } catch (e) {
      await conn.rollback();
      console.error('POST /route_stops', e);
      return res.status(500).json({ error: 'ServerError' });
    } finally {
      conn.release();
    }
  }
);

/* =======================================================
   LIST - Lista tappe per route_id
   GET /api/route_stops?route_id=123
   ======================================================= */
router.get(
  '/',
  query('route_id').isInt({ gt: 0 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;
    const routeId = parseInt(req.query.route_id, 10);

    try {
      const [rows] = await pool.query(
        `SELECT * FROM route_stops
          WHERE route_id = ? AND deleted = 0
       ORDER BY position ASC, id ASC`,
        [routeId]
      );
      return res.json(rows);
    } catch (e) {
      console.error('GET /route_stops', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);

/* =======================================================
   READ - Dettaglio tappa
   GET /api/route_stops/:id
   ======================================================= */
router.get(
  '/:id',
  param('id').isInt({ gt: 0 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;

    try {
      const [rows] = await pool.query(
        `SELECT * FROM route_stops WHERE id = ? AND deleted = 0`,
        [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'NotFound' });
      return res.json(rows[0]);
    } catch (e) {
      console.error('GET /route_stops/:id', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);

/* =======================================================
   UPDATE - Aggiorna tappa
   PUT /api/route_stops/:id
   body: { label?, description?, latitude?, longitude?, rel_x?, rel_y?, rel_z?, extra_media_url? }
   (NB: per spostare la tappa in un'altra posizione usa PATCH /reorder)
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
        `UPDATE route_stops
            SET ${fields.join(', ')}
          WHERE id = ? AND deleted = 0`,
        params
      );
      if (r.affectedRows === 0) return res.status(404).json({ error: 'NotFound' });

      const [row] = await pool.query(`SELECT * FROM route_stops WHERE id = ?`, [req.params.id]);
      return res.json(row[0]);
    } catch (e) {
      console.error('PUT /route_stops/:id', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);

/* =======================================================
   REORDER - Riordina tappe di un percorso
   PATCH /api/route_stops/reorder
   body: { route_id, order: [stopId1, stopId2, ...] } // ordine target 1..N
   ======================================================= */
router.patch(
  '/reorder',
  body('route_id').isInt({ gt: 0 }),
  body('order').isArray({ min: 1 }),
  body('order.*').isInt({ gt: 0 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;
    const routeId = parseInt(req.body.route_id, 10);
    const order = req.body.order.map(Number);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existing] = await conn.query(
        `SELECT id FROM route_stops
          WHERE route_id = ? AND deleted = 0
       ORDER BY position ASC, id ASC`,
        [routeId]
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
          `UPDATE route_stops
              SET position = ?
            WHERE id = ? AND route_id = ?`,
          [i + 1, order[i], routeId]
        );
      }

      await conn.commit();

      const [rows] = await pool.query(
        `SELECT * FROM route_stops
          WHERE route_id = ? AND deleted = 0
       ORDER BY position ASC, id ASC`,
        [routeId]
      );
      return res.json(rows);
    } catch (e) {
      await conn.rollback();
      console.error('PATCH /route_stops/reorder', e);
      return res.status(500).json({ error: 'ServerError' });
    } finally {
      conn.release();
    }
  }
);

/* =======================================================
   DELETE - Soft delete tappa + ricompattazione posizioni
   DELETE /api/route_stops/:id
   ======================================================= */
router.delete(
  '/:id',
  param('id').isInt({ gt: 0 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;
    const stopId = parseInt(req.params.id, 10);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [cur] = await conn.query(
        `SELECT route_id, position
           FROM route_stops
          WHERE id = ? AND deleted = 0`,
        [stopId]
      );
      if (!cur.length) {
        await conn.rollback(); conn.release();
        return res.status(404).json({ error: 'NotFound' });
      }
      const routeId = cur[0].route_id;
      const removedPos = cur[0].position;

      // Soft delete
      await conn.query(
        `UPDATE route_stops
            SET deleted = 1
          WHERE id = ? AND deleted = 0`,
        [stopId]
      );

      // Ricompatta posizioni successive
      await conn.query(
        `UPDATE route_stops
            SET position = position - 1
          WHERE route_id = ? AND deleted = 0 AND position > ?`,
        [routeId, removedPos]
      );

      await conn.commit();
      return res.status(204).send();
    } catch (e) {
      await conn.rollback();
      console.error('DELETE /route_stops/:id', e);
      return res.status(500).json({ error: 'ServerError' });
    } finally {
      conn.release();
    }
  }
);

module.exports = router;
