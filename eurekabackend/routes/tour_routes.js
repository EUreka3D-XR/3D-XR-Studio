// routes/tour_routes.js
const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const jwt = require("jsonwebtoken");
require("dotenv").config();

//const { pool } = require('../config/db'); 
const pool = require('../config/db');

const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).json({ error: "AccessDenied" });
  
  try {
    const verified = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: "InvalidToken" });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "InsufficientPermissions" });
    }
    next();
  };
};

const isValidYouTubeUrl = (url) => {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  return youtubeRegex.test(url);
};

/* Helpers */
function vld(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'ValidationError', details: errors.array() });
  }
}

/* =========================
   PERCORSI (/api/routes)
   ========================= */

/**
 * Crea percorso
 * POST /api/routes
 * body: { environment_id, label, description? }
 */
router.post(
  '/',
  authenticateToken,  // ✅ AGGIUNTO: Middleware autenticazione
  authorizeRoles("admin", "editor"),  // ✅ AGGIUNTO: Solo admin ed editor possono creare
  body('environment_id').isInt({ gt: 0 }),
  body('label').isString().trim().isLength({ min: 1, max: 255 }),
  body('description').optional({ nullable: true }).isString().trim().isLength({ max: 65535 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;
    const { environment_id, label, description = null } = req.body;
    const created_by = req.user.id; // ✅ AGGIUNTO: Prendi user ID dal token
    const userRole = req.user.role; // ✅ AGGIUNTO: Prendi ruolo utente

    try {
      const [envCheck] = await pool.query(
        `SELECT id, created_by FROM environments WHERE id=? AND deleted=0`,
        [environment_id]
      );
      
      if (!envCheck.length) {
        return res.status(404).json({ error: 'EnvironmentNotFound' });
      }

      if (userRole === 'editor' && envCheck[0].created_by !== created_by) {
        return res.status(403).json({ error: 'Forbidden - Can only create routes in own environments' });
      }

      const [r] = await pool.query(
        `INSERT INTO routes (environment_id, label, description, created_by, created_at, deleted)
         VALUES (?, ?, ?, ?, NOW(), 0)`,
        [environment_id, label, description, created_by]
      );
      const [row] = await pool.query(`SELECT * FROM routes WHERE id=?`, [r.insertId]);
      return res.status(201).json(row[0]);
    } catch (e) {
      console.error('POST /routes', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);

/**
 * Lista percorsi per environment
 * GET /api/routes?environment_id=123
 */
router.get(
  '/',
  authenticateToken,  // ✅ AGGIUNTO: Middleware autenticazione
  query('environment_id').isInt({ gt: 0 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;
    const environmentId = parseInt(req.query.environment_id, 10);
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
      let query, params;
      
      if (userRole === "admin") {
        // Admin vede tutti i percorsi
        query = `SELECT * FROM routes WHERE environment_id=? AND deleted=0 ORDER BY id DESC`;
        params = [environmentId];
      } else if (userRole === "editor") {
        query = `
          SELECT r.* FROM routes r
          JOIN environments e ON r.environment_id = e.id
          WHERE r.environment_id=? AND r.deleted=0 AND e.created_by=?
          ORDER BY r.id DESC
        `;
        params = [environmentId, userId];
      } else {
        return res.status(403).json({ error: 'InsufficientPermissions' });
      }
      
      const [rows] = await pool.query(query, params);
      return res.json(rows);
    } catch (e) {
      console.error('GET /routes', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);

/**
 * Dettaglio percorso (senza tappe)
 * GET /api/routes/:id
 */
router.get(
  '/:id',
  authenticateToken,  // ✅ AGGIUNTO: Middleware autenticazione
  param('id').isInt({ gt: 0 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    try {
      let query, params;
      
      if (userRole === "admin") {
        query = `SELECT * FROM routes WHERE id=? AND deleted=0`;
        params = [req.params.id];
      } else if (userRole === "editor") {
        query = `
          SELECT r.* FROM routes r
          JOIN environments e ON r.environment_id = e.id
          WHERE r.id=? AND r.deleted=0 AND e.created_by=?
        `;
        params = [req.params.id, userId];
      } else {
        return res.status(403).json({ error: 'InsufficientPermissions' });
      }
      
      const [rows] = await pool.query(query, params);
      if (!rows.length) return res.status(404).json({ error: 'NotFound' });
      return res.json(rows[0]);
    } catch (e) {
      console.error('GET /routes/:id', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);



/**
 * Aggiorna percorso
 * PUT /api/routes/:id
 * body: { label?, description? }
 */

// router.put(
//   '/:id',
//   authenticateToken,  // ✅ AGGIUNTO: Middleware autenticazione
//   authorizeRoles("admin", "editor"),  // ✅ AGGIUNTO: Solo admin ed editor
//   param('id').isInt({ gt: 0 }),
//   body('label').optional().isString().trim().isLength({ min: 1, max: 255 }),
//   body('description').optional({ nullable: true }).isString().trim().isLength({ max: 65535 }),
//   async (req, res) => {
//     const vr = vld(req, res); if (vr) return;
//     const { label, description } = req.body;
//     const userId = req.user.id;
//     const userRole = req.user.role;

//     const sets = [];
//     const params = [];
//     if (label !== undefined) { sets.push('label=?'); params.push(label); }
//     if (description !== undefined) { sets.push('description=?'); params.push(description); }

//     if (!sets.length) return res.status(400).json({ error: 'NothingToUpdate' });

//     params.push(req.params.id);

//     try {
//       let updateQuery;
      
//       if (userRole === "admin") {
//         updateQuery = `UPDATE routes SET ${sets.join(', ')} WHERE id=? AND deleted=0`;
//       } else if (userRole === "editor") {
//         updateQuery = `
//           UPDATE routes r
//           JOIN environments e ON r.environment_id = e.id
//           SET ${sets.join(', ')}
//           WHERE r.id=? AND r.deleted=0 AND e.created_by=?
//         `;
//         params.push(userId);
//       }
      
//       const [r] = await pool.query(updateQuery, params);
//       if (r.affectedRows === 0) return res.status(404).json({ error: 'NotFound' });

//       const [row] = await pool.query(`SELECT * FROM routes WHERE id=?`, [req.params.id]);
//       return res.json(row[0]);
//     } catch (e) {
//       console.error('PUT /routes/:id', e);
//       return res.status(500).json({ error: 'ServerError' });
//     }
//   }
// );

router.put(
  '/:routeId/stops/:stopId',
  authenticateToken,
  authorizeRoles("admin", "editor"),
  param('routeId').isInt({ gt: 0 }),
  param('stopId').isInt({ gt: 0 }),
  body('label').optional().isString().trim().isLength({ min: 1, max: 255 }),
  body('description').optional({ nullable: true }).isString().trim().isLength({ max: 65535 }),
  body('latitude').optional().isFloat({ min: -90, max: 90 }),
  body('longitude').optional().isFloat({ min: -180, max: 180 }),
  body('rel_x').optional({ nullable: true }).isFloat(),
  body('rel_y').optional({ nullable: true }).isFloat(),
  body('rel_z').optional({ nullable: true }).isFloat(),
  body('extra_media_url').optional({ nullable: true }).isString().trim().isLength({ max: 512 }),
  body('position').optional().isInt({ gt: 0 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;
    
    const updatable = ['label','description','latitude','longitude','rel_x','rel_y','rel_z','extra_media_url','position'];
    
    const sets = [];
    const params = [];
    const userId = req.user.id;
    const userRole = req.user.role;

    updatable.forEach(k => {
      if (req.body[k] !== undefined) {
        sets.push(`${k} = ?`);
        params.push(req.body[k]);
      }
    });

    if (!sets.length) return res.status(400).json({ error: 'NothingToUpdate' });

    try {
      // ... resto del codice rimane uguale
      let permissionQuery, permissionParams;
      
      if (userRole === "admin") {
        permissionQuery = `
          SELECT rs.id FROM route_stops rs
          JOIN routes r ON rs.route_id = r.id
          WHERE rs.route_id=? AND rs.id=? AND rs.deleted=0 AND r.deleted=0
        `;
        permissionParams = [req.params.routeId, req.params.stopId];
      } else if (userRole === "editor") {
        permissionQuery = `
          SELECT rs.id FROM route_stops rs
          JOIN routes r ON rs.route_id = r.id
          JOIN environments e ON r.environment_id = e.id
          WHERE rs.route_id=? AND rs.id=? AND rs.deleted=0 AND r.deleted=0 AND e.created_by=?
        `;
        permissionParams = [req.params.routeId, req.params.stopId, userId];
      }
      
      const [permissionCheck] = await pool.query(permissionQuery, permissionParams);
      if (!permissionCheck.length) {
        return res.status(404).json({ error: 'StopNotFoundOrForbidden' });
      }
      
      params.push(req.params.routeId, req.params.stopId);
      
      const [r] = await pool.query(
        `UPDATE route_stops SET ${sets.join(', ')}
         WHERE route_id=? AND id=? AND deleted=0`,
        params
      );
      if (r.affectedRows === 0) return res.status(404).json({ error: 'NotFound' });

      const [row] = await pool.query(`SELECT * FROM route_stops WHERE id=?`, [req.params.stopId]);
      return res.json(row[0]);
    } catch (e) {
      console.error('PUT /routes/:routeId/stops/:stopId', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);

/**
 * Soft delete percorso
 * DELETE /api/routes/:id
 */
router.delete(
  '/:id',
  authenticateToken,  // ✅ AGGIUNTO: Middleware autenticazione
  authorizeRoles("admin", "editor"),  // ✅ AGGIUNTO: Solo admin ed editor
  param('id').isInt({ gt: 0 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    try {
      let deleteQuery, params;
      
      if (userRole === "admin") {
        deleteQuery = `UPDATE routes SET deleted=1 WHERE id=? AND deleted=0`;
        params = [req.params.id];
      } else if (userRole === "editor") {
        deleteQuery = `
          UPDATE routes r
          JOIN environments e ON r.environment_id = e.id
          SET r.deleted=1
          WHERE r.id=? AND r.deleted=0 AND e.created_by=?
        `;
        params = [req.params.id, userId];
      }
      
      const [r] = await pool.query(deleteQuery, params);
      if (r.affectedRows === 0) return res.status(404).json({ error: 'NotFound' });
      return res.status(204).send();
    } catch (e) {
      console.error('DELETE /routes/:id', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);

/* =========================
   TAPPE (/api/routes/:routeId/stops)
   ========================= */

/**
 * Crea tappa
 * POST /api/routes/:routeId/stops
 * body: { label, description?, latitude, longitude, rel_x?, rel_y?, rel_z?, extra_media_url? }
 */
router.post(
  '/:routeId/stops',
  authenticateToken,  // ✅ AGGIUNTO: Middleware autenticazione
  authorizeRoles("admin", "editor"),  // ✅ AGGIUNTO: Solo admin ed editor
  param('routeId').isInt({ gt: 0 }),
  body('label').isString().trim().isLength({ min: 1, max: 255 }),
  body('description').optional({ nullable: true }).isString().trim().isLength({ max: 65535 }),
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  body('rel_x').optional({ nullable: true }).isFloat(),
  body('rel_y').optional({ nullable: true }).isFloat(),
  body('rel_z').optional({ nullable: true }).isFloat(),
  body('extra_media_url').optional({ nullable: true }).isString().trim().isLength({ max: 512 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;
    const routeId = parseInt(req.params.routeId, 10);
    const { label, description = null, latitude, longitude, rel_x = null, rel_y = null, rel_z = null, extra_media_url = null } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      let routeQuery, routeParams;
      
      if (userRole === "admin") {
        routeQuery = `SELECT id FROM routes WHERE id=? AND deleted=0`;
        routeParams = [routeId];
      } else if (userRole === "editor") {
        routeQuery = `
          SELECT r.id FROM routes r
          JOIN environments e ON r.environment_id = e.id
          WHERE r.id=? AND r.deleted=0 AND e.created_by=?
        `;
        routeParams = [routeId, userId];
      }
      
      const [rts] = await conn.query(routeQuery, routeParams);
      if (!rts.length) {
        await conn.rollback(); conn.release();
        return res.status(404).json({ error: 'RouteNotFoundOrForbidden' });
      }

      // Calcola position = max+1
      const [mx] = await conn.query(
        `SELECT COALESCE(MAX(position), 0) AS max_pos FROM route_stops WHERE route_id=? AND deleted=0`,
        [routeId]
      );
      const nextPos = (mx[0].max_pos || 0) + 1;

      const [ins] = await conn.query(
        `INSERT INTO route_stops
         (route_id, position, label, description, latitude, longitude, rel_x, rel_y, rel_z, extra_media_url, created_at, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
        [routeId, nextPos, label, description, latitude, longitude, rel_x, rel_y, rel_z, extra_media_url]
      );

      await conn.commit();
      const [row] = await pool.query(`SELECT * FROM route_stops WHERE id=?`, [ins.insertId]);
      return res.status(201).json(row[0]);
    } catch (e) {
      await conn.rollback();
      console.error('POST /routes/:routeId/stops', e);
      return res.status(500).json({ error: 'ServerError' });
    } finally {
      conn.release();
    }
  }
);

/**
 * Lista tappe con count media
 * GET /api/routes/:routeId/stops
 */
router.get(
  '/:routeId/stops',
  authenticateToken,  // ✅ AGGIUNTO: Middleware autenticazione
  param('routeId').isInt({ gt: 0 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    try {
      let routeQuery, routeParams;
      
      if (userRole === "admin") {
        routeQuery = `SELECT id FROM routes WHERE id=? AND deleted=0`;
        routeParams = [req.params.routeId];
      } else if (userRole === "editor") {
        routeQuery = `
          SELECT r.id FROM routes r
          JOIN environments e ON r.environment_id = e.id
          WHERE r.id=? AND r.deleted=0 AND e.created_by=?
        `;
        routeParams = [req.params.routeId, userId];
      } else {
        return res.status(403).json({ error: 'InsufficientPermissions' });
      }
      
      const [routeCheck] = await pool.query(routeQuery, routeParams);
      if (!routeCheck.length) {
        return res.status(404).json({ error: 'RouteNotFoundOrForbidden' });
      }
      
      const [rows] = await pool.query(
        `SELECT rs.*, 
         COALESCE(media_count.count, 0) as media_count
         FROM route_stops rs
         LEFT JOIN (
           SELECT stop_id, COUNT(*) as count 
           FROM route_stop_media 
           WHERE deleted=0 
           GROUP BY stop_id
         ) media_count ON rs.id = media_count.stop_id
         WHERE rs.route_id=? AND rs.deleted=0
         ORDER BY rs.position ASC, rs.id ASC`,
        [req.params.routeId]
      );
      return res.json(rows);
    } catch (e) {
      console.error('GET /routes/:routeId/stops', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);

/**
 * Dettaglio tappa con media inclusi
 * GET /api/routes/:routeId/stops/:stopId
 */
router.get(
  '/:routeId/stops/:stopId',
  authenticateToken,
  param('routeId').isInt({ gt: 0 }),
  param('stopId').isInt({ gt: 0 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    try {
      let permissionQuery, permissionParams;
      
      if (userRole === "admin") {
        permissionQuery = `
          SELECT rs.* FROM route_stops rs
          JOIN routes r ON rs.route_id = r.id
          WHERE rs.route_id=? AND rs.id=? AND rs.deleted=0 AND r.deleted=0
        `;
        permissionParams = [req.params.routeId, req.params.stopId];
      } else if (userRole === "editor") {
        permissionQuery = `
          SELECT rs.* FROM route_stops rs
          JOIN routes r ON rs.route_id = r.id
          JOIN environments e ON r.environment_id = e.id
          WHERE rs.route_id=? AND rs.id=? AND rs.deleted=0 AND r.deleted=0 AND e.created_by=?
        `;
        permissionParams = [req.params.routeId, req.params.stopId, userId];
      } else {
        return res.status(403).json({ error: 'InsufficientPermissions' });
      }
      
      const [stopRows] = await pool.query(permissionQuery, permissionParams);
      if (!stopRows.length) {
        return res.status(404).json({ error: 'StopNotFoundOrForbidden' });
      }
      
      // Carica media associati
      const [mediaRows] = await pool.query(
        `SELECT * FROM route_stop_media 
         WHERE stop_id=? AND deleted=0 
         ORDER BY id ASC`,
        [req.params.stopId]
      );
      
      const stop = stopRows[0];
      stop.media = mediaRows;
      
      return res.json(stop);
    } catch (e) {
      console.error('GET /routes/:routeId/stops/:stopId', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);

/**
 * Aggiorna tappa
 * PUT /api/routes/:routeId/stops/:stopId
 */
router.put(
  '/:routeId/stops/:stopId',
  authenticateToken,  // ✅ AGGIUNTO: Middleware autenticazione
  authorizeRoles("admin", "editor"),  // ✅ AGGIUNTO: Solo admin ed editor
  param('routeId').isInt({ gt: 0 }),
  param('stopId').isInt({ gt: 0 }),
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
    const updatable = ['label','description','latitude','longitude','rel_x','rel_y','rel_z','extra_media_url'];
    const sets = [];
    const params = [];
    const userId = req.user.id;
    const userRole = req.user.role;

    updatable.forEach(k => {
      if (req.body[k] !== undefined) {
        sets.push(`${k} = ?`);
        params.push(req.body[k]);
      }
    });

    if (!sets.length) return res.status(400).json({ error: 'NothingToUpdate' });

    try {
      let permissionQuery, permissionParams;
      
      if (userRole === "admin") {
        permissionQuery = `
          SELECT rs.id FROM route_stops rs
          JOIN routes r ON rs.route_id = r.id
          WHERE rs.route_id=? AND rs.id=? AND rs.deleted=0 AND r.deleted=0
        `;
        permissionParams = [req.params.routeId, req.params.stopId];
      } else if (userRole === "editor") {
        permissionQuery = `
          SELECT rs.id FROM route_stops rs
          JOIN routes r ON rs.route_id = r.id
          JOIN environments e ON r.environment_id = e.id
          WHERE rs.route_id=? AND rs.id=? AND rs.deleted=0 AND r.deleted=0 AND e.created_by=?
        `;
        permissionParams = [req.params.routeId, req.params.stopId, userId];
      }
      
      const [permissionCheck] = await pool.query(permissionQuery, permissionParams);
      if (!permissionCheck.length) {
        return res.status(404).json({ error: 'StopNotFoundOrForbidden' });
      }
      
      params.push(req.params.routeId, req.params.stopId);
      
      const [r] = await pool.query(
        `UPDATE route_stops SET ${sets.join(', ')}
         WHERE route_id=? AND id=? AND deleted=0`,
        params
      );
      if (r.affectedRows === 0) return res.status(404).json({ error: 'NotFound' });

      const [row] = await pool.query(`SELECT * FROM route_stops WHERE id=?`, [req.params.stopId]);
      return res.json(row[0]);
    } catch (e) {
      console.error('PUT /routes/:routeId/stops/:stopId', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);

/**
 * Reorder tappe
 * PATCH /api/routes/:routeId/stops/reorder
 * body: { order: [stopId1, stopId2, ...] }  // 1..N nell'ordine desiderato
 */
router.patch(
  '/:routeId/stops/reorder',
  authenticateToken,  // ✅ AGGIUNTO: Middleware autenticazione
  authorizeRoles("admin", "editor"),  // ✅ AGGIUNTO: Solo admin ed editor
  param('routeId').isInt({ gt: 0 }),
  body('order').isArray({ min: 1 }),
  body('order.*').isInt({ gt: 0 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;
    const routeId = parseInt(req.params.routeId, 10);
    const order = req.body.order.map(Number);
    const userId = req.user.id;
    const userRole = req.user.role;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      let permissionQuery, permissionParams;
      
      if (userRole === "admin") {
        permissionQuery = `SELECT id FROM routes WHERE id=? AND deleted=0`;
        permissionParams = [routeId];
      } else if (userRole === "editor") {
        permissionQuery = `
          SELECT r.id FROM routes r
          JOIN environments e ON r.environment_id = e.id
          WHERE r.id=? AND r.deleted=0 AND e.created_by=?
        `;
        permissionParams = [routeId, userId];
      }
      
      const [permissionCheck] = await conn.query(permissionQuery, permissionParams);
      if (!permissionCheck.length) {
        await conn.rollback(); conn.release();
        return res.status(404).json({ error: 'RouteNotFoundOrForbidden' });
      }

      const [existing] = await conn.query(
        `SELECT id FROM route_stops WHERE route_id=? AND deleted=0 ORDER BY position ASC, id ASC`,
        [routeId]
      );
      const existingIds = existing.map(r => r.id);

      // L'array deve contenere lo stesso set di ID
      const sameSize = existingIds.length === order.length;
      const sameSet = sameSize && existingIds.every(id => order.includes(id));
      if (!sameSet) {
        await conn.rollback(); conn.release();
        return res.status(400).json({ error: 'InvalidOrderPayload' });
      }

      // Aggiorna le posizioni (1..N)
      for (let i = 0; i < order.length; i++) {
        await conn.query(
          `UPDATE route_stops SET position=? WHERE id=? AND route_id=?`,
          [i + 1, order[i], routeId]
        );
      }

      await conn.commit();

      const [rows] = await pool.query(
        `SELECT * FROM route_stops WHERE route_id=? AND deleted=0 ORDER BY position ASC, id ASC`,
        [routeId]
      );
      return res.json(rows);
    } catch (e) {
      await conn.rollback();
      console.error('PATCH /routes/:routeId/stops/reorder', e);
      return res.status(500).json({ error: 'ServerError' });
    } finally {
      conn.release();
    }
  }
);

/**
 * Soft delete tappa + ricompatta posizioni + elimina media associati
 * DELETE /api/routes/:routeId/stops/:stopId
 */
router.delete(
  '/:routeId/stops/:stopId',
  authenticateToken,  // ✅ AGGIUNTO: Middleware autenticazione
  authorizeRoles("admin", "editor"),  // ✅ AGGIUNTO: Solo admin ed editor
  param('routeId').isInt({ gt: 0 }),
  param('stopId').isInt({ gt: 0 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;
    const routeId = parseInt(req.params.routeId, 10);
    const stopId = parseInt(req.params.stopId, 10);
    const userId = req.user.id;
    const userRole = req.user.role;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      let permissionQuery, permissionParams;
      
      if (userRole === "admin") {
        permissionQuery = `
          SELECT rs.position FROM route_stops rs
          JOIN routes r ON rs.route_id = r.id
          WHERE rs.id=? AND rs.route_id=? AND rs.deleted=0 AND r.deleted=0
        `;
        permissionParams = [stopId, routeId];
      } else if (userRole === "editor") {
        permissionQuery = `
          SELECT rs.position FROM route_stops rs
          JOIN routes r ON rs.route_id = r.id
          JOIN environments e ON r.environment_id = e.id
          WHERE rs.id=? AND rs.route_id=? AND rs.deleted=0 AND r.deleted=0 AND e.created_by=?
        `;
        permissionParams = [stopId, routeId, userId];
      }
      
      const [cur] = await conn.query(permissionQuery, permissionParams);
      if (!cur.length) {
        await conn.rollback(); conn.release();
        return res.status(404).json({ error: 'StopNotFoundOrForbidden' });
      }
      const removedPos = cur[0].position;

      // ✅ AGGIUNTO: Elimina media associati (soft delete)
      await conn.query(
        `UPDATE route_stop_media SET deleted=1 WHERE stop_id=? AND deleted=0`,
        [stopId]
      );

      await conn.query(
        `UPDATE route_stops SET deleted=1 WHERE id=? AND route_id=? AND deleted=0`,
        [stopId, routeId]
      );

      await conn.query(
        `UPDATE route_stops SET position = position - 1
         WHERE route_id=? AND deleted=0 AND position > ?`,
        [routeId, removedPos]
      );

      await conn.commit();
      return res.status(204).send();
    } catch (e) {
      await conn.rollback();
      console.error('DELETE /routes/:routeId/stops/:stopId', e);
      return res.status(500).json({ error: 'ServerError' });
    } finally {
      conn.release();
    }
  }
);

/* =====================================
   MEDIA TAPPE (/api/routes/:routeId/stops/:stopId/media)
   ===================================== */

/**
 * Lista media per tappa
 * GET /api/routes/:routeId/stops/:stopId/media
 */
router.get(
  '/:routeId/stops/:stopId/media',
  authenticateToken,
  param('routeId').isInt({ gt: 0 }),
  param('stopId').isInt({ gt: 0 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    try {
      let permissionQuery, permissionParams;
      
      if (userRole === "admin") {
        permissionQuery = `
          SELECT rs.id FROM route_stops rs
          JOIN routes r ON rs.route_id = r.id
          WHERE rs.route_id=? AND rs.id=? AND rs.deleted=0 AND r.deleted=0
        `;
        permissionParams = [req.params.routeId, req.params.stopId];
      } else if (userRole === "editor") {
        permissionQuery = `
          SELECT rs.id FROM route_stops rs
          JOIN routes r ON rs.route_id = r.id
          JOIN environments e ON r.environment_id = e.id
          WHERE rs.route_id=? AND rs.id=? AND rs.deleted=0 AND r.deleted=0 AND e.created_by=?
        `;
        permissionParams = [req.params.routeId, req.params.stopId, userId];
      } else {
        return res.status(403).json({ error: 'InsufficientPermissions' });
      }
      
      const [stopCheck] = await pool.query(permissionQuery, permissionParams);
      if (!stopCheck.length) {
        return res.status(404).json({ error: 'StopNotFoundOrForbidden' });
      }
      
      // Carica media
      const [media] = await pool.query(
        `SELECT * FROM route_stop_media 
         WHERE stop_id=? AND deleted=0 
         ORDER BY id ASC`,
        [req.params.stopId]
      );
      
      return res.json(media);
    } catch (e) {
      console.error('GET /routes/:routeId/stops/:stopId/media', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);

/**
 * Aggiungi media a tappa
 * POST /api/routes/:routeId/stops/:stopId/media
 * body: { type, title?, url }
 */
router.post(
  '/:routeId/stops/:stopId/media',
  authenticateToken,
  authorizeRoles("admin", "editor"),
  param('routeId').isInt({ gt: 0 }),
  param('stopId').isInt({ gt: 0 }),
  body('type').isIn(['image', 'video', 'url', 'other']),
  body('title').optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
  body('url').isString().trim().isLength({ min: 1, max: 512 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;
    const { type, title = null, url } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const stopId = parseInt(req.params.stopId, 10);
    
    try {
      if (type === 'video' && !isValidYouTubeUrl(url)) {
        return res.status(400).json({ error: 'InvalidYouTubeUrl', message: 'Solo URL YouTube sono supportati per i video' });
      }
      
      let permissionQuery, permissionParams;
      
      if (userRole === "admin") {
        permissionQuery = `
          SELECT rs.id FROM route_stops rs
          JOIN routes r ON rs.route_id = r.id
          WHERE rs.route_id=? AND rs.id=? AND rs.deleted=0 AND r.deleted=0
        `;
        permissionParams = [req.params.routeId, req.params.stopId];
      } else if (userRole === "editor") {
        permissionQuery = `
          SELECT rs.id FROM route_stops rs
          JOIN routes r ON rs.route_id = r.id
          JOIN environments e ON r.environment_id = e.id
          WHERE rs.route_id=? AND rs.id=? AND rs.deleted=0 AND r.deleted=0 AND e.created_by=?
        `;
        permissionParams = [req.params.routeId, req.params.stopId, userId];
      }
      
      const [stopCheck] = await pool.query(permissionQuery, permissionParams);
      if (!stopCheck.length) {
        return res.status(404).json({ error: 'StopNotFoundOrForbidden' });
      }
      
      const [countCheck] = await pool.query(
        `SELECT COUNT(*) as count FROM route_stop_media WHERE stop_id=? AND deleted=0`,
        [stopId]
      );
      
      if (countCheck[0].count >= 5) {
        return res.status(400).json({ error: 'MediaLimitExceeded', message: 'Massimo 5 media per tappa' });
      }
      
      // Inserisci media
      const [result] = await pool.query(
        `INSERT INTO route_stop_media (stop_id, type, title, url, created_at, deleted)
         VALUES (?, ?, ?, ?, NOW(), 0)`,
        [stopId, type, title, url]
      );
      
      const [newMedia] = await pool.query(
        `SELECT * FROM route_stop_media WHERE id=?`,
        [result.insertId]
      );
      
      return res.status(201).json(newMedia[0]);
    } catch (e) {
      console.error('POST /routes/:routeId/stops/:stopId/media', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);

/**
 * Aggiorna media
 * PUT /api/routes/:routeId/stops/:stopId/media/:mediaId
 * body: { type?, title?, url? }
 */
router.put(
  '/:routeId/stops/:stopId/media/:mediaId',
  authenticateToken,
  authorizeRoles("admin", "editor"),
  param('routeId').isInt({ gt: 0 }),
  param('stopId').isInt({ gt: 0 }),
  param('mediaId').isInt({ gt: 0 }),
  body('type').optional().isIn(['image', 'video', 'url', 'other']),
  body('title').optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
  body('url').optional().isString().trim().isLength({ min: 1, max: 512 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;
    const { type, title, url } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Costruisci update dinamico
    const sets = [];
    const params = [];
    if (type !== undefined) { sets.push('type = ?'); params.push(type); }
    if (title !== undefined) { sets.push('title = ?'); params.push(title); }
    if (url !== undefined) { sets.push('url = ?'); params.push(url); }
    
    if (!sets.length) return res.status(400).json({ error: 'NothingToUpdate' });
    
    try {
      // Validazione URL YouTube se si sta aggiornando il tipo o l'URL
      if ((type === 'video' || url !== undefined) && url) {
        let currentType = type;
        if (!currentType) {
          const [mediaCheck] = await pool.query(
            `SELECT type FROM route_stop_media WHERE id=? AND deleted=0`,
            [req.params.mediaId]
          );
          currentType = mediaCheck.length ? mediaCheck[0].type : null;
        }
        
        if (currentType === 'video' && !isValidYouTubeUrl(url)) {
          return res.status(400).json({ error: 'InvalidYouTubeUrl', message: 'Solo URL YouTube sono supportati per i video' });
        }
      }
      
      let permissionQuery, permissionParams;
      
      if (userRole === "admin") {
        permissionQuery = `
          SELECT rsm.id FROM route_stop_media rsm
          JOIN route_stops rs ON rsm.stop_id = rs.id
          JOIN routes r ON rs.route_id = r.id
          WHERE r.id=? AND rs.id=? AND rsm.id=? AND rsm.deleted=0 AND rs.deleted=0 AND r.deleted=0
        `;
        permissionParams = [req.params.routeId, req.params.stopId, req.params.mediaId];
      } else if (userRole === "editor") {
        permissionQuery = `
          SELECT rsm.id FROM route_stop_media rsm
          JOIN route_stops rs ON rsm.stop_id = rs.id
          JOIN routes r ON rs.route_id = r.id
          JOIN environments e ON r.environment_id = e.id
          WHERE r.id=? AND rs.id=? AND rsm.id=? AND rsm.deleted=0 AND rs.deleted=0 AND r.deleted=0 AND e.created_by=?
        `;
        permissionParams = [req.params.routeId, req.params.stopId, req.params.mediaId, userId];
      }
      
      const [permissionCheck] = await pool.query(permissionQuery, permissionParams);
      if (!permissionCheck.length) {
        return res.status(404).json({ error: 'MediaNotFoundOrForbidden' });
      }
      
      params.push(req.params.mediaId);
      
      const [result] = await pool.query(
        `UPDATE route_stop_media SET ${sets.join(', ')} WHERE id=? AND deleted=0`,
        params
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'MediaNotFound' });
      }
      
      const [updatedMedia] = await pool.query(
        `SELECT * FROM route_stop_media WHERE id=?`,
        [req.params.mediaId]
      );
      
      return res.json(updatedMedia[0]);
    } catch (e) {
      console.error('PUT /routes/:routeId/stops/:stopId/media/:mediaId', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);

/**
 * Elimina media
 * DELETE /api/routes/:routeId/stops/:stopId/media/:mediaId
 */
router.delete(
  '/:routeId/stops/:stopId/media/:mediaId',
  authenticateToken,
  authorizeRoles("admin", "editor"),
  param('routeId').isInt({ gt: 0 }),
  param('stopId').isInt({ gt: 0 }),
  param('mediaId').isInt({ gt: 0 }),
  async (req, res) => {
    const vr = vld(req, res); if (vr) return;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    try {
      let permissionQuery, permissionParams;
      
      if (userRole === "admin") {
        permissionQuery = `
          SELECT rsm.id FROM route_stop_media rsm
          JOIN route_stops rs ON rsm.stop_id = rs.id
          JOIN routes r ON rs.route_id = r.id
          WHERE r.id=? AND rs.id=? AND rsm.id=? AND rsm.deleted=0 AND rs.deleted=0 AND r.deleted=0
        `;
        permissionParams = [req.params.routeId, req.params.stopId, req.params.mediaId];
      } else if (userRole === "editor") {
        permissionQuery = `
          SELECT rsm.id FROM route_stop_media rsm
          JOIN route_stops rs ON rsm.stop_id = rs.id
          JOIN routes r ON rs.route_id = r.id
          JOIN environments e ON r.environment_id = e.id
          WHERE r.id=? AND rs.id=? AND rsm.id=? AND rsm.deleted=0 AND rs.deleted=0 AND r.deleted=0 AND e.created_by=?
        `;
        permissionParams = [req.params.routeId, req.params.stopId, req.params.mediaId, userId];
      }
      
      const [permissionCheck] = await pool.query(permissionQuery, permissionParams);
      if (!permissionCheck.length) {
        return res.status(404).json({ error: 'MediaNotFoundOrForbidden' });
      }
      
      // Soft delete
      const [result] = await pool.query(
        `UPDATE route_stop_media SET deleted=1 WHERE id=? AND deleted=0`,
        [req.params.mediaId]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'MediaNotFound' });
      }
      
      return res.status(204).send();
    } catch (e) {
      console.error('DELETE /routes/:routeId/stops/:stopId/media/:mediaId', e);
      return res.status(500).json({ error: 'ServerError' });
    }
  }
);

module.exports = router;