const express = require("express");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const router = express.Router();
require("dotenv").config();

const TOTEM_HEIGHT = 0.0;

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

router.get("/", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    let query;
    let params = [];

    if (userRole === "admin") {
      query = `
        SELECT e.*, u.username AS owner_username 
        FROM environments e 
        JOIN utenti u ON e.created_by = u.id 
        WHERE e.deleted = 0
      `;
    } else if (userRole === "editor") {
      query = `
        SELECT e.*, u.username AS owner_username 
        FROM environments e 
        JOIN utenti u ON e.created_by = u.id 
        WHERE e.deleted = 0 AND e.created_by = ?
      `;
      params = [userId];
    } else {
      return res.status(403).json({ message: "Non hai i permessi per accedere a questa risorsa" });
    }

    const [environments] = await pool.query(query, params);
    res.json(environments);
  } catch (error) {
    console.error("Errore nel recupero degli ambienti:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});


router.post(
    "/create",
    authenticateToken,
    authorizeRoles("admin", "editor"), // Entrambi possono creare
    async (req, res) => {
      const { name, latitude, longitude, surface_area } = req.body;
      const created_by = req.user.id; // ID dell'utente loggato
  
      try {
        const result = await pool.query(
          "INSERT INTO environments (name, latitude, longitude, surface_area, created_by) VALUES (?, ?, ?, ?, ?)",
          [name, latitude, longitude, JSON.stringify(surface_area), created_by]
        );
  
        res.status(201).json({
          message: "Ambiente creato con successo",
          environmentId: result[0].insertId,
          created_by: created_by, // Mostriamo chi lo ha creato
        });
      } catch (error) {
        console.error("Errore creazione ambiente:", error.message);
        res.status(500).json({ message: "Errore interno del server" });
      }
    }
  );
  

router.put(
    "/update/:id",
    authenticateToken,
    authorizeRoles("admin", "editor"), // Entrambi possono modificare
    async (req, res) => {
      const { id } = req.params;
      const { name, latitude, longitude, surface_area } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;
  
      try {
        const [existing] = await pool.query(
          "SELECT * FROM environments WHERE id = ? AND deleted = 0",
          [id]
        );
  
        if (existing.length === 0) {
          return res.status(404).json({ message: "Ambiente non trovato o già eliminato" });
        }
  
        const environment = existing[0];
  
        if (userRole === "editor" && environment.created_by !== userId) {
          return res.status(403).json({ message: "Non hai i permessi per modificare questo ambiente" });
        }
  
        // Aggiorna l'ambiente
        await pool.query(
          "UPDATE environments SET name = ?, latitude = ?, longitude = ?, surface_area = ? WHERE id = ?",
          [name, latitude, longitude, JSON.stringify(surface_area), id]
        );
  
        res.json({ message: "Ambiente aggiornato con successo" });
      } catch (error) {
        console.error("Errore aggiornamento ambiente:", error.message);
        res.status(500).json({ message: "Errore interno del server" });
      }
    }
  );
  

router.delete(
    "/delete/:id",
    authenticateToken,
    authorizeRoles("admin", "editor"), // Entrambi possono eliminare
    async (req, res) => {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;
  
      try {
        const [existing] = await pool.query(
          "SELECT * FROM environments WHERE id = ? AND deleted = 0",
          [id]
        );
  
        if (existing.length === 0) {
          return res.status(404).json({ message: "Ambiente non trovato o già eliminato" });
        }
  
        const environment = existing[0];
  
        if (userRole === "editor" && environment.created_by !== userId) {
          return res.status(403).json({ message: "Non hai i permessi per eliminare questo ambiente" });
        }
  
        // Imposta deleted = 1 invece di eliminare la riga
        await pool.query("UPDATE environments SET deleted = 1 WHERE id = ?", [id]);
  
        res.json({ message: "Ambiente eliminato con successo (soft delete)" });
      } catch (error) {
        console.error("Errore eliminazione ambiente:", error.message);
        res.status(500).json({ message: "Errore interno del server" });
      }
    }
  );

  router.get("/detail/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const apiBaseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}/api`;

    try {
      // Recuperiamo l'ambiente richiesto
      const [environment] = await pool.query(
        "SELECT name, latitude, longitude, surface_area FROM environments WHERE id = ? AND deleted = 0",
        [id]
      );
  
      if (environment.length === 0) {
        return res.status(404).json({ message: "Ambiente non trovato o già eliminato" });
      }
  
      const envData = environment[0];
  
      let queryObjects;
      let paramsObjects = [id];
  
      if (userRole === "admin") {
        queryObjects = "SELECT * FROM objects WHERE environment_id = ? AND deleted = 0 AND (object_type != 'wall' OR object_type IS NULL)";
      } else if (userRole === "editor") {
        queryObjects = `
          SELECT o.* FROM objects o
          JOIN environments e ON o.environment_id = e.id
          WHERE o.environment_id = ? AND o.deleted = 0 AND (o.object_type != 'wall' OR o.object_type IS NULL) AND e.created_by = ?
        `;
        paramsObjects.push(userId);
      } else {
        return res.status(403).json({ message: "Non hai i permessi per accedere a questa risorsa" });
      }

      const [objects] = await pool.query(queryObjects, paramsObjects);

      let queryEnvObjects;
      let paramsEnvObjects = [id];
      if (userRole === "admin") {
        queryEnvObjects = "SELECT * FROM env_objects WHERE environment_id = ? AND deleted = 0";
      } else if (userRole === "editor") {
        queryEnvObjects = `
          SELECT eo.*
          FROM env_objects eo
          JOIN environments e ON eo.environment_id = e.id
          WHERE eo.environment_id = ? AND eo.deleted = 0 AND e.created_by = ?
        `;
        paramsEnvObjects.push(userId);
      }
      const [envObjects] = await pool.query(queryEnvObjects, paramsEnvObjects);

      // Prepariamo la risposta JSON
      const response = {
        name: envData.name,
        position: {
          lat: envData.latitude,
          long: envData.longitude,
        },
        surface_area: JSON.parse(envData.surface_area),
        objects: objects.map((obj) => ({
          name: obj.name,
          url: `${apiBaseUrl}/objects/download/${obj.id}`,
          prefabType: obj.name, // oppure altra logica per il prefabType
          position: {
            x: obj.pos_x || 0.0,
            y: obj.pos_y || 0.0,
            z: obj.pos_z || 0.0,
          },
          rotation: {
            x: obj.rotation_x || 0.0,
            y: obj.rotation_y || 0.0,
            z: obj.rotation_z || 0.0,
            w: 1.0,
          },
          scale: {
            x: obj.scale_x || 1.0,
            y: obj.scale_y || 1.0,
            z: obj.scale_z || 1.0,
          },
        })),
        env_objects: envObjects,
      };
  
      res.json(response);
    } catch (error) {
      console.error("Errore nel recupero dei dettagli dell'ambiente:", error.message);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  router.get("/export/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const apiBaseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}/api`;

    try {
      // Recuperiamo l'ambiente richiesto
      const [environment] = await pool.query(
        "SELECT id, name, latitude, longitude, surface_area FROM environments WHERE id = ? AND deleted = 0",
        [id]
      );
  
      if (environment.length === 0) {
        return res.status(404).json({ message: "Ambiente non trovato o già eliminato" });
      }
  
      const envData = environment[0];
  
      let queryObjects;
      let paramsObjects = [id];
  
      if (userRole === "admin") {
        queryObjects = "SELECT * FROM objects WHERE environment_id = ? AND deleted = 0 AND (object_type != 'wall' OR object_type IS NULL)";
      } else if (userRole === "editor") {
        queryObjects = `
          SELECT o.* FROM objects o
          JOIN environments e ON o.environment_id = e.id
          WHERE o.environment_id = ? AND o.deleted = 0 AND (o.object_type != 'wall' OR o.object_type IS NULL) AND e.created_by = ?
        `;
        paramsObjects.push(userId);
      } else {
        return res.status(403).json({ message: "Non hai i permessi per accedere a questa risorsa" });
      }

      const [objects] = await pool.query(queryObjects, paramsObjects);

      let queryEnvObjects;
      let paramsEnvObjects = [id];
      if (userRole === "admin") {
        queryEnvObjects = "SELECT * FROM env_objects WHERE environment_id = ? AND deleted = 0";
      } else if (userRole === "editor") {
        queryEnvObjects = `
          SELECT eo.*
          FROM env_objects eo
          JOIN environments e ON eo.environment_id = e.id
          WHERE eo.environment_id = ? AND eo.deleted = 0 AND e.created_by = ?
        `;
        paramsEnvObjects.push(userId);
      }
      const [envObjects] = await pool.query(queryEnvObjects, paramsEnvObjects);

      // Prepariamo la risposta JSON
// Prepariamo la risposta JSON
const response = {
  id: envData.id,
  name: envData.name,
  position: {
    lat: envData.latitude,
    long: envData.longitude,
  },
  surface_area: JSON.parse(envData.surface_area),
  objects: objects.map((obj) => {
    const posX = obj.pos_x || 0.0; // si assume che sia la longitudine
    const posY = obj.pos_y || 0.0; // si assume che sia la latitudine
    // Fattori di conversione
    const metersPerDegreeLat = 111320;
    const metersPerDegreeLong = 111320 * Math.cos(envData.latitude * Math.PI / 180);
    // Troviamo l'env_object associato tramite il campo env_object_id
    const matchingEnvObj = envObjects.find(eo => eo.id === obj.env_object_id);
    // Se presente, estraiamo il file name rimuovendo il path
    const fileName = matchingEnvObj && matchingEnvObj.file_url
      ? matchingEnvObj.file_url.split('/').pop()
      : obj.file_url;
      
    return {
      id: obj.id,
      name: obj.name,
      modelName: fileName, // Il campo file_url ora contiene solo il nome del file
      url: `${apiBaseUrl}/objects/download/${obj.id}`,
      //prefabType: obj.name,
      position_gps: {
        x: posX,
        y: posY,
        z: obj.pos_z || 0.0,
      },
      position: {
        x: (posX - envData.longitude) * metersPerDegreeLong, // asse Ovest-Est
        y: (obj.pos_z) || 1,                                   // asse verticale
        z: (posY - envData.latitude) * metersPerDegreeLat,     // asse Nord-Sud
      },
      rotation: {
        x: obj.rotation_x || 0.0,
        y: obj.rotation_y || 0.0,
        z: obj.rotation_z || 0.0,
      },
      scale: {
        x: obj.scale_x || 1.0,
        y: obj.scale_y || 1.0,
        z: obj.scale_z || 1.0,
      },
    };
  }),
  env_objects: envObjects.map((envObj)=>{
    const modelName = envObj.file_url.split('/').pop();
    envObj.modelName = modelName;
    envObj.url = `${apiBaseUrl}/env_objects/download/${envObj.id}`;
    return envObj;
  }),
};

res.json(response);

    } catch (error) {
      console.error("Errore nel recupero dei dettagli dell'ambiente:", error.message);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  router.get("/export2/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const apiBaseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}/api`;

    try {
      // Recuperiamo l'ambiente richiesto
      const [environment] = await pool.query(
        "SELECT id, name, latitude, longitude, surface_area FROM environments WHERE id = ? AND deleted = 0",
        [id]
      );
  
      if (environment.length === 0) {
        return res.status(404).json({ message: "Ambiente non trovato o già eliminato" });
      }
  
      const envData = environment[0];
  
      let queryObjects;
      let paramsObjects = [id];
  
      if (userRole === "admin") {
        queryObjects = "SELECT * FROM objects WHERE environment_id = ? AND deleted = 0 AND (object_type != 'wall' OR object_type IS NULL)";
      } else if (userRole === "editor") {
        queryObjects = `
          SELECT o.* FROM objects o
          JOIN environments e ON o.environment_id = e.id
          WHERE o.environment_id = ? AND o.deleted = 0 AND (o.object_type != 'wall' OR o.object_type IS NULL) AND e.created_by = ?
        `;
        paramsObjects.push(userId);
      } else {
        return res.status(403).json({ message: "Non hai i permessi per accedere a questa risorsa" });
      }

      const [objects] = await pool.query(queryObjects, paramsObjects);

      let queryEnvObjects;
      let paramsEnvObjects = [id];
      if (userRole === "admin") {
        queryEnvObjects = "SELECT * FROM env_objects WHERE environment_id = ? AND deleted = 0";
      } else if (userRole === "editor") {
        queryEnvObjects = `
          SELECT eo.*
          FROM env_objects eo
          JOIN environments e ON eo.environment_id = e.id
          WHERE eo.environment_id = ? AND eo.deleted = 0 AND e.created_by = ?
        `;
        paramsEnvObjects.push(userId);
      }
      const [envObjects] = await pool.query(queryEnvObjects, paramsEnvObjects);

      let routeData = null;
      let queryRoute;
      let paramsRoute = [id];
      
      if (userRole === "admin") {
        queryRoute = "SELECT * FROM routes WHERE environment_id = ? AND deleted = 0 LIMIT 1";
      } else if (userRole === "editor") {
        queryRoute = `
          SELECT r.* FROM routes r
          JOIN environments e ON r.environment_id = e.id
          WHERE r.environment_id = ? AND r.deleted = 0 AND e.created_by = ? LIMIT 1
        `;
        paramsRoute.push(userId);
      }
      
      const [routes] = await pool.query(queryRoute, paramsRoute);
      
      if (routes.length > 0) {
        const route = routes[0];
        
        let queryStops;
        let paramsStops = [route.id];
        
        if (userRole === "admin") {
          queryStops = "SELECT * FROM route_stops WHERE route_id = ? AND deleted = 0 ORDER BY position ASC";
        } else if (userRole === "editor") {
          queryStops = `
            SELECT rs.* FROM route_stops rs
            JOIN routes r ON rs.route_id = r.id
            JOIN environments e ON r.environment_id = e.id
            WHERE rs.route_id = ? AND rs.deleted = 0 AND e.created_by = ? ORDER BY rs.position ASC
          `;
          paramsStops.push(userId);
        }
        
        const [stops] = await pool.query(queryStops, paramsStops);
        
        // ✅ NUOVO: Se ci sono tappe, recuperiamo i media associati
        let stopsWithMedia = [];
        
        if (stops.length > 0) {
          const stopIds = stops.map(stop => stop.id);
          const placeholders = stopIds.map(() => '?').join(',');
          
          const [allMedia] = await pool.query(
            `SELECT * FROM route_stop_media WHERE stop_id IN (${placeholders}) AND deleted = 0 ORDER BY id ASC`,
            stopIds
          );
          
          const mediaByStopId = {};
          allMedia.forEach(media => {
            if (!mediaByStopId[media.stop_id]) {
              mediaByStopId[media.stop_id] = [];
            }
            mediaByStopId[media.stop_id].push(media);
          });
          
          const metersPerDegreeLat = 111320;
          const metersPerDegreeLong = 111320 * Math.cos(envData.latitude * Math.PI / 180);
          
          stopsWithMedia = stops.map(stop => {
            const stopLat = parseFloat(stop.latitude) || 0.0;
            const stopLng = parseFloat(stop.longitude) || 0.0;
            
            const relativeX = (stopLng - envData.longitude) * metersPerDegreeLong; // Ovest-Est
            const relativeZ = (stopLat - envData.latitude) * metersPerDegreeLat;   // Nord-Sud
            
            return {
              id: stop.id,
              position: stop.position,
              label: stop.label,
              description: stop.description,
              position_gps: {
                latitude: stopLat,
                longitude: stopLng
              },
              position_relative: {
                x: relativeX,  // metri Est dal centro ambiente
                y: parseFloat(stop.rel_z) || 0,  // altezza da terra (metri)
                z: relativeZ   // metri Nord dal centro ambiente
              },
              rel_x: stop.rel_x,
              rel_y: stop.rel_y,
              rel_z: stop.rel_z,
              extra_media_url: stop.extra_media_url,
              media: mediaByStopId[stop.id] || [] // Media associati a questa tappa
            };
          });
        }
        
        routeData = {
          id: route.id,
          label: route.label,
          description: route.description,
          stops: stopsWithMedia
        };
      }
  
      // Prepariamo la risposta JSON (stessa logica di export + route)
      const response = {
        id: envData.id,
        name: envData.name,
        position: {
          lat: envData.latitude,
          long: envData.longitude,
        },
        surface_area: JSON.parse(envData.surface_area),
        objects: objects.map((obj) => {
          const posX = obj.pos_x || 0.0; // si assume che sia la longitudine
          const posY = obj.pos_y || 0.0; // si assume che sia la latitudine
          // Fattori di conversione
          const metersPerDegreeLat = 111320;
          const metersPerDegreeLong = 111320 * Math.cos(envData.latitude * Math.PI / 180);
          // Troviamo l'env_object associato tramite il campo env_object_id
          const matchingEnvObj = envObjects.find(eo => eo.id === obj.env_object_id);
          // Se presente, estraiamo il file name rimuovendo il path
          const fileName = matchingEnvObj && matchingEnvObj.file_url
            ? matchingEnvObj.file_url.split('/').pop()
            : obj.file_url;
            
          return {
            id: obj.id,
            name: obj.name,
            modelName: fileName, // Il campo file_url ora contiene solo il nome del file
            url: `${apiBaseUrl}/objects/download/${obj.id}`,
            position_gps: {
              x: posX,
              y: posY,
              z: obj.pos_z || 0.0,
            },
            position: {
              x: (posX - envData.longitude) * metersPerDegreeLong, // asse Ovest-Est
              y: (obj.pos_z) || 1,                                   // asse verticale
              z: (posY - envData.latitude) * metersPerDegreeLat,     // asse Nord-Sud
            },
            rotation: {
              x: obj.rotation_x || 0.0,
              y: obj.rotation_y || 0.0,
              z: obj.rotation_z || 0.0,
            },
            scale: {
              x: obj.scale_x || 1.0,
              y: obj.scale_y || 1.0,
              z: obj.scale_z || 1.0,
            },
          };
        }),
        env_objects: envObjects.map((envObj) => {
          const modelName = envObj.file_url.split('/').pop();
          envObj.modelName = modelName;
          envObj.url = `${apiBaseUrl}/env_objects/download/${envObj.id}`;
          return envObj;
        }),
        route: routeData
      };
  
      res.json(response);
  
    } catch (error) {
      console.error("Errore nel recupero dei dettagli completi dell'ambiente:", error.message);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // ========================================================================
// NUOVO ENDPOINT: /export3/:id
// Da aggiungere in environments.js PRIMA di "module.exports = router;"
// ========================================================================

  router.get("/export3/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const apiBaseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}/api`;

    try {
      // Recuperiamo l'ambiente richiesto
      const [environment] = await pool.query(
        "SELECT id, name, latitude, longitude, surface_area FROM environments WHERE id = ? AND deleted = 0",
        [id]
      );
  
      if (environment.length === 0) {
        return res.status(404).json({ message: "Ambiente non trovato o già eliminato" });
      }
  
      const envData = environment[0];
      
      // Fattori di conversione GPS -> metri (calcolati una volta sola)
      const metersPerDegreeLat = 111320;
      const metersPerDegreeLong = 111320 * Math.cos(envData.latitude * Math.PI / 180);
  
      // ========== OBJECTS ==========
      let queryObjects;
      let paramsObjects = [id];

      if (userRole === "admin") {
        queryObjects = "SELECT * FROM objects WHERE environment_id = ? AND deleted = 0 AND (object_type != 'wall' OR object_type IS NULL)";
      } else if (userRole === "editor") {
        queryObjects = `
          SELECT o.* FROM objects o
          JOIN environments e ON o.environment_id = e.id
          WHERE o.environment_id = ? AND o.deleted = 0 AND (o.object_type != 'wall' OR o.object_type IS NULL) AND e.created_by = ?
        `;
        paramsObjects.push(userId);
      } else {
        return res.status(403).json({ message: "Non hai i permessi per accedere a questa risorsa" });
      }

      const [objects] = await pool.query(queryObjects, paramsObjects);

      // ========== ENV_OBJECTS ==========
      let queryEnvObjects;
      let paramsEnvObjects = [id];
      if (userRole === "admin") {
        queryEnvObjects = "SELECT * FROM env_objects WHERE environment_id = ? AND deleted = 0";
      } else if (userRole === "editor") {
        queryEnvObjects = `
          SELECT eo.*
          FROM env_objects eo
          JOIN environments e ON eo.environment_id = e.id
          WHERE eo.environment_id = ? AND eo.deleted = 0 AND e.created_by = ?
        `;
        paramsEnvObjects.push(userId);
      }
      const [envObjects] = await pool.query(queryEnvObjects, paramsEnvObjects);
  
      // ========== ROUTE & STOPS ==========
      let routeData = null;
      let queryRoute;
      let paramsRoute = [id];
      
      if (userRole === "admin") {
        queryRoute = "SELECT * FROM routes WHERE environment_id = ? AND deleted = 0 LIMIT 1";
      } else if (userRole === "editor") {
        queryRoute = `
          SELECT r.* FROM routes r
          JOIN environments e ON r.environment_id = e.id
          WHERE r.environment_id = ? AND r.deleted = 0 AND e.created_by = ? LIMIT 1
        `;
        paramsRoute.push(userId);
      }
      
      const [routes] = await pool.query(queryRoute, paramsRoute);
      
      if (routes.length > 0) {
        const route = routes[0];
        
        // Recuperiamo le tappe del percorso
        let queryStops;
        let paramsStops = [route.id];
        
        if (userRole === "admin") {
          queryStops = "SELECT * FROM route_stops WHERE route_id = ? AND deleted = 0 ORDER BY position ASC";
        } else if (userRole === "editor") {
          queryStops = `
            SELECT rs.* FROM route_stops rs
            JOIN routes r ON rs.route_id = r.id
            JOIN environments e ON r.environment_id = e.id
            WHERE rs.route_id = ? AND rs.deleted = 0 AND e.created_by = ? ORDER BY rs.position ASC
          `;
          paramsStops.push(userId);
        }
        
        const [stops] = await pool.query(queryStops, paramsStops);
        
        let stopsWithMedia = [];
        
        if (stops.length > 0) {
          const stopIds = stops.map(stop => stop.id);
          const placeholders = stopIds.map(() => '?').join(',');
          
          const [allMedia] = await pool.query(
            `SELECT * FROM route_stop_media WHERE stop_id IN (${placeholders}) AND deleted = 0 ORDER BY id ASC`,
            stopIds
          );
          
          const mediaByStopId = {};
          allMedia.forEach(media => {
            if (!mediaByStopId[media.stop_id]) {
              mediaByStopId[media.stop_id] = [];
            }
            mediaByStopId[media.stop_id].push(media);
          });
          
          stopsWithMedia = stops.map(stop => {
            const stopLat = parseFloat(stop.latitude) || 0.0;
            const stopLng = parseFloat(stop.longitude) || 0.0;
            
            const relativeX = (stopLng - envData.longitude) * metersPerDegreeLong;
            const relativeZ = (stopLat - envData.latitude) * metersPerDegreeLat;
            
            return {
              id: stop.id,
              position: stop.position,
              label: stop.label,
              description: stop.description,
              position_gps: {
                latitude: stopLat,
                longitude: stopLng
              },
              position_relative: {
                x: relativeX,
                y: parseFloat(stop.rel_z) || 0,  // altezza da terra (metri)
                z: relativeZ
              },
              rel_x: stop.rel_x,
              rel_y: stop.rel_y,
              rel_z: stop.rel_z,
              extra_media_url: stop.extra_media_url,
              media: mediaByStopId[stop.id] || []
            };
          });
        }
        
        routeData = {
          id: route.id,
          label: route.label,
          description: route.description,
          stops: stopsWithMedia
        };
      }

      // ========== ✅ INTEREST POINTS (POI) ==========
      let interestPoints = [];
      let queryPois;
      let paramsPois = [id];

      if (userRole === "admin") {
        queryPois = "SELECT * FROM env_pois WHERE environment_id = ? AND deleted = 0 ORDER BY position ASC";
      } else if (userRole === "editor") {
        queryPois = `
          SELECT ep.* FROM env_pois ep
          JOIN environments e ON ep.environment_id = e.id
          WHERE ep.environment_id = ? AND ep.deleted = 0 AND e.created_by = ?
          ORDER BY ep.position ASC
        `;
        paramsPois.push(userId);
      }

      const [pois] = await pool.query(queryPois, paramsPois);

      if (pois.length > 0) {
        const poiIds = pois.map(poi => poi.id);
        const placeholders = poiIds.map(() => '?').join(',');

        const [allPoiMedia] = await pool.query(
          `SELECT * FROM env_poi_media WHERE poi_id IN (${placeholders}) AND deleted = 0 ORDER BY created_at ASC`,
          poiIds
        );

        const mediaByPoiId = {};
        allPoiMedia.forEach(media => {
          if (!mediaByPoiId[media.poi_id]) {
            mediaByPoiId[media.poi_id] = [];
          }
          
          // ✅ Trasformiamo URL locali in endpoint di download (come in env_pois.js)
          if (media.url && media.url.startsWith('/uploads/')) {
            media.download_url = `${apiBaseUrl}/env_pois/media/${media.id}/download`;
          } else {
            media.download_url = media.url; // URL esterni (YouTube, ecc.)
          }
          
          mediaByPoiId[media.poi_id].push(media);
        });

        interestPoints = pois.map(poi => {
          const poiLat = parseFloat(poi.latitude) || 0.0;
          const poiLng = parseFloat(poi.longitude) || 0.0;

          const relativeX = (poiLng - envData.longitude) * metersPerDegreeLong;
          const relativeZ = (poiLat - envData.latitude) * metersPerDegreeLat;

          const poiMediaList = mediaByPoiId[poi.id] || [];

          const videoUrl = poiMediaList.find(m => m.type === 'video')?.download_url || "";
          const imageUrls = poiMediaList.filter(m => m.type === 'image').map(m => m.download_url);
          const audioUrls = poiMediaList.filter(m => m.type === 'audio').map(m => m.download_url);
          const urlMedia = poiMediaList.find(m => m.type === 'url');
          const textMedia = poiMediaList.find(m => m.type === 'text');

          return {
            interestPoint_Name: `POI_${poi.id}`,
            interestPoint_Title_Text: poi.label || "",
            interestPoint_Description_Text: poi.description || "",
            interestPoint_Video_URL: videoUrl,
            interestPoint_Image_URLs: imageUrls,
            interestPoint_Audio_URLs: audioUrls,
            interestPoint_Text_Content: textMedia?.content || "",
            interestPoint_URL: urlMedia?.download_url || "",
            mascottePosition: {
              x: relativeX,
              y: poi.rel_z || 0,  // altezza da terra (metri)
              z: relativeZ
            },
            id: poi.id,
            position: poi.position,
            position_gps: {
              latitude: poiLat,
              longitude: poiLng
            },
            rel_x: poi.rel_x,
            rel_y: poi.rel_y,
            rel_z: poi.rel_z,
            extra_media_url: poi.extra_media_url,
            media: poiMediaList.map(m => ({
              id: m.id,
              type: m.type,
              lang: m.lang,
              title: m.title,
              url: m.url, // URL originale (path locale o esterno)
              download_url: m.download_url, // URL di download trasformato
              content: m.content,
              created_at: m.created_at
            }))
          };
        });
      }
  
      // ========== RESPONSE FINALE ==========
      const response = {
        id: envData.id,
        name: envData.name,
        position: {
          lat: envData.latitude,
          long: envData.longitude,
        },
        surface_area: JSON.parse(envData.surface_area),
        
        objects: objects.map((obj) => {
          const posX = obj.pos_x || 0.0;
          const posY = obj.pos_y || 0.0;
          const matchingEnvObj = envObjects.find(eo => eo.id === obj.env_object_id);
          const fileName = matchingEnvObj && matchingEnvObj.file_url
            ? matchingEnvObj.file_url.split('/').pop()
            : obj.file_url;
            
          return {
            id: obj.id,
            name: obj.name,
            modelName: fileName,
            url: `${apiBaseUrl}/objects/download/${obj.id}`,
            position_gps: {
              x: posX,
              y: posY,
              z: obj.pos_z || 0.0,
            },
            position: {
              x: (posX - envData.longitude) * metersPerDegreeLong,
              y: (obj.pos_z) || 1,
              z: (posY - envData.latitude) * metersPerDegreeLat,
            },
            rotation: {
              x: obj.rotation_x || 0.0,
              y: obj.rotation_y || 0.0,
              z: obj.rotation_z || 0.0,
              w: 1.0 // ✅ Aggiunto quaternion w per Unity
            },
            scale: {
              x: obj.scale_x || 1.0,
              y: obj.scale_y || 1.0,
              z: obj.scale_z || 1.0,
            },
          };
        }),
        
        env_objects: envObjects.map((envObj) => {
          const modelName = envObj.file_url.split('/').pop();
          envObj.modelName = modelName;
          envObj.url = `${apiBaseUrl}/env_objects/download/${envObj.id}`;
          return envObj;
        }),

        route: routeData,
        path_points: routeData ? routeData.stops.map(stop => ({
          position: {
            x: stop.position_relative.x,
            y: stop.position_relative.y,
            z: stop.position_relative.z
          },
          // Manteniamo anche le info complete
          id: stop.id,
          label: stop.label,
          description: stop.description,
          media: stop.media
        })) : [],
        
        // ✅ NUOVO: Interest Points (POI)
        interest_points: interestPoints
      };
  
      res.json(response);
  
    } catch (error) {
      console.error("Errore nel recupero completo dell'ambiente con POI:", error.message);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // ========================================================================
  // ENDPOINT PUBBLICO: /exportbytotem/:serial_code
  // ========================================================================
  router.get("/exportbytotem/:serial_code", async (req, res) => {
    const { serial_code } = req.params;
    const apiBaseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}/api`;

    try {
      const [totemRows] = await pool.query(
        "SELECT * FROM totems WHERE serial_code = ? AND deleted = 0",
        [serial_code]
      );

      if (totemRows.length === 0) {
        return res.status(404).json({
          error: "TotemNotFound",
          message: "Totem non trovato"
        });
      }

      const totem = totemRows[0];

      if (!totem.environment_id || totem.latitude === null || totem.longitude === null) {
        return res.status(400).json({
          error: "TotemNotPositioned",
          message: "Totem non posizionato in alcun ambiente"
        });
      }

      const totemLat = parseFloat(totem.latitude);
      const totemLng = parseFloat(totem.longitude);

      // 3. Recupera l'ambiente
      const [environment] = await pool.query(
        "SELECT id, name, latitude, longitude, surface_area FROM environments WHERE id = ? AND deleted = 0",
        [totem.environment_id]
      );

      if (environment.length === 0) {
        return res.status(404).json({
          error: "EnvironmentNotFound",
          message: "Ambiente associato al totem non trovato"
        });
      }

      const envData = environment[0];

      // Fattori di conversione GPS -> metri (usando la latitudine del TOTEM come riferimento)
      const metersPerDegreeLat = 111320;
      const metersPerDegreeLong = 111320 * Math.cos(totemLat * Math.PI / 180);

      // ========== OBJECTS ==========
      const [objects] = await pool.query(
        "SELECT * FROM objects WHERE environment_id = ? AND deleted = 0",
        [envData.id]
      );

      // ========== ENV_OBJECTS ==========
      const [envObjects] = await pool.query(
        "SELECT * FROM env_objects WHERE environment_id = ? AND deleted = 0",
        [envData.id]
      );

      // ========== ROUTE & STOPS ==========
      let routeData = null;
      const [routes] = await pool.query(
        "SELECT * FROM routes WHERE environment_id = ? AND deleted = 0 LIMIT 1",
        [envData.id]
      );

      if (routes.length > 0) {
        const route = routes[0];

        const [stops] = await pool.query(
          "SELECT * FROM route_stops WHERE route_id = ? AND deleted = 0 ORDER BY position ASC",
          [route.id]
        );

        let stopsWithMedia = [];

        if (stops.length > 0) {
          const stopIds = stops.map(stop => stop.id);
          const placeholders = stopIds.map(() => '?').join(',');

          const [allMedia] = await pool.query(
            `SELECT * FROM route_stop_media WHERE stop_id IN (${placeholders}) AND deleted = 0 ORDER BY id ASC`,
            stopIds
          );

          const mediaByStopId = {};
          allMedia.forEach(media => {
            if (!mediaByStopId[media.stop_id]) {
              mediaByStopId[media.stop_id] = [];
            }
            mediaByStopId[media.stop_id].push(media);
          });

          stopsWithMedia = stops.map(stop => {
            const stopLat = parseFloat(stop.latitude) || 0.0;
            const stopLng = parseFloat(stop.longitude) || 0.0;

            // Posizione relativa al TOTEM
            const relativeX = (stopLng - totemLng) * metersPerDegreeLong;
            const relativeZ = (stopLat - totemLat) * metersPerDegreeLat;
            const relativeY = (parseFloat(stop.rel_z) || 0) - TOTEM_HEIGHT;

            return {
              id: stop.id,
              position: stop.position,
              label: stop.label,
              description: stop.description,
              position_gps: {
                latitude: stopLat,
                longitude: stopLng
              },
              position_relative: {
                x: relativeX,
                y: relativeY,
                z: relativeZ
              },
              extra_media_url: stop.extra_media_url,
              media: mediaByStopId[stop.id] || []
            };
          });
        }

        routeData = {
          id: route.id,
          label: route.label,
          description: route.description,
          stops: stopsWithMedia
        };
      }

      // ========== INTEREST POINTS (POI) ==========
      let interestPoints = [];
      const [pois] = await pool.query(
        "SELECT * FROM env_pois WHERE environment_id = ? AND deleted = 0 ORDER BY position ASC",
        [envData.id]
      );

      if (pois.length > 0) {
        const poiIds = pois.map(poi => poi.id);
        const placeholders = poiIds.map(() => '?').join(',');

        // Recupera media dei POI
        const [allPoiMedia] = await pool.query(
          `SELECT * FROM env_poi_media WHERE poi_id IN (${placeholders}) AND deleted = 0 ORDER BY created_at ASC`,
          poiIds
        );

        // Recupera traduzioni dei POI
        const [allPoiTranslations] = await pool.query(
          `SELECT * FROM env_poi_translations WHERE poi_id IN (${placeholders}) AND deleted = 0 ORDER BY lang ASC`,
          poiIds
        );

        const mediaByPoiId = {};
        allPoiMedia.forEach(media => {
          if (!mediaByPoiId[media.poi_id]) {
            mediaByPoiId[media.poi_id] = [];
          }

          if (media.url && media.url.startsWith('/uploads/')) {
            media.download_url = `${apiBaseUrl}/env_pois/media/${media.id}/download`;
          } else {
            media.download_url = media.url;
          }

          mediaByPoiId[media.poi_id].push(media);
        });

        const translationsByPoiId = {};
        allPoiTranslations.forEach(trans => {
          if (!translationsByPoiId[trans.poi_id]) {
            translationsByPoiId[trans.poi_id] = { titles: {}, descriptions: {} };
          }
          if (trans.label) {
            translationsByPoiId[trans.poi_id].titles[trans.lang] = trans.label;
          }
          if (trans.description) {
            translationsByPoiId[trans.poi_id].descriptions[trans.lang] = trans.description;
          }
        });

        interestPoints = pois.map(poi => {
          const poiLat = parseFloat(poi.latitude) || 0.0;
          const poiLng = parseFloat(poi.longitude) || 0.0;

          // Posizione relativa al TOTEM
          const relativeX = (poiLng - totemLng) * metersPerDegreeLong;
          const relativeZ = (poiLat - totemLat) * metersPerDegreeLat;

          const poiMediaList = mediaByPoiId[poi.id] || [];

          const videoUrl = poiMediaList.find(m => m.type === 'video')?.download_url || "";
          const imageUrls = poiMediaList.filter(m => m.type === 'image').map(m => m.download_url);
          const audioUrls = poiMediaList.filter(m => m.type === 'audio').map(m => m.download_url);
          const urlMedia = poiMediaList.find(m => m.type === 'url');
          const textMedia = poiMediaList.find(m => m.type === 'text');

          const poiTranslations = translationsByPoiId[poi.id] || { titles: {}, descriptions: {} };

          return {
            interestPoint_Name: `POI_${poi.id}`,
            interestPoint_Title_Text: poiTranslations.titles,
            interestPoint_Description_Text: poiTranslations.descriptions,
            interestPoint_Video_URL: videoUrl,
            interestPoint_Image_URLs: imageUrls,
            interestPoint_Audio_URLs: audioUrls,
            interestPoint_Text_Content: textMedia?.content || "",
            interestPoint_URL: urlMedia?.download_url || "",
            mascottePosition: {
              x: relativeX,
              y: (poi.rel_z || 0) - TOTEM_HEIGHT,  // altezza da terra - altezza totem
              z: relativeZ
            },
            id: poi.id,
            position: poi.position,
            position_gps: {
              latitude: poiLat,
              longitude: poiLng
            },
            media: poiMediaList.map(m => ({
              id: m.id,
              type: m.type,
              lang: m.lang,
              title: m.title,
              url: m.url,
              download_url: m.download_url,
              content: m.content,
              created_at: m.created_at
            }))
          };
        });
      }

      // ========== RESPONSE FINALE ==========
      const response = {
        // Info totem
        totem: {
          serial_code: totem.serial_code,
          label: totem.label,
          position_gps: {
            latitude: totemLat,
            longitude: totemLng
          }
        },

        // Info ambiente
        environment: {
          id: envData.id,
          name: envData.name,
          position: {
            lat: envData.latitude,
            long: envData.longitude
          },
          surface_area: JSON.parse(envData.surface_area)
        },

        objects: objects.map((obj) => {
          const posX = obj.pos_x || 0.0; // longitudine
          const posY = obj.pos_y || 0.0; // latitudine

          let modelName;
          if (obj.object_type === 'wall') {
            modelName = 'Wall';
          } else {
            const matchingEnvObj = envObjects.find(eo => eo.id === obj.env_object_id);
            modelName = matchingEnvObj && matchingEnvObj.file_url
              ? matchingEnvObj.file_url.split('/').pop()
              : obj.file_url;
          }

          return {
            id: obj.id,
            name: obj.name,
            modelName: modelName,
            object_type: obj.object_type || 'glb',
            url: obj.object_type === 'wall' ? null : `${apiBaseUrl}/objects/download/${obj.id}`,
            position_gps: {
              x: posX,
              y: posY,
              z: obj.pos_z || 0.0
            },
            position: {
              x: (posX - totemLng) * metersPerDegreeLong,
              y: (obj.pos_z || 0) - TOTEM_HEIGHT,
              z: (posY - totemLat) * metersPerDegreeLat
            },
            rotation: {
              x: obj.rotation_x || 0.0,
              y: obj.rotation_y || 0.0,
              z: obj.rotation_z || 0.0,
              w: obj.rotation_w !== undefined ? obj.rotation_w : 1.0
            },
            scale: {
              x: obj.scale_x || 1.0,
              y: obj.scale_y || 1.0,
              z: obj.scale_z || 1.0
            }
          };
        }),

        env_objects: envObjects.map((envObj) => {
          const modelName = envObj.file_url ? envObj.file_url.split('/').pop() : null;
          return {
            ...envObj,
            modelName: modelName,
            url: `${apiBaseUrl}/env_objects/download/${envObj.id}`
          };
        }),

        path_points: routeData ? routeData.stops.map(stop => ({
          id: stop.id,
          index: stop.position,
          position: {
            x: stop.position_relative.x,
            y: stop.position_relative.y,
            z: stop.position_relative.z
          },
          label: stop.label,
          description: stop.description,
          media: stop.media
        })) : [],

        interest_points: interestPoints
      };

      res.json(response);

    } catch (error) {
      console.error("Errore nell'export by totem:", error.message);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // ========================================================================
  // ENDPOINT PUBBLICO: POST /exportbytotem/:serial_code
  // ========================================================================
  router.post("/exportbytotem/:serial_code", async (req, res) => {
    const { serial_code } = req.params;
    const { objects, path_points, interest_points } = req.body;

    try {
      const [totemRows] = await pool.query(
        "SELECT * FROM totems WHERE serial_code = ? AND deleted = 0",
        [serial_code]
      );

      if (totemRows.length === 0) {
        return res.status(404).json({
          error: "TotemNotFound",
          message: "Totem non trovato"
        });
      }

      const totem = totemRows[0];

      if (!totem.environment_id || totem.latitude === null || totem.longitude === null) {
        return res.status(400).json({
          error: "TotemNotPositioned",
          message: "Totem non posizionato in alcun ambiente"
        });
      }

      const totemLat = parseFloat(totem.latitude);
      const totemLng = parseFloat(totem.longitude);
      const environmentId = totem.environment_id;

      // Fattori di conversione metri -> GPS (inverso dell'export)
      const metersPerDegreeLat = 111320;
      const metersPerDegreeLong = 111320 * Math.cos(totemLat * Math.PI / 180);

      const [envObjects] = await pool.query(
        "SELECT * FROM env_objects WHERE environment_id = ? AND deleted = 0",
        [environmentId]
      );

      const envObjectsByFileName = {};
      envObjects.forEach(eo => {
        if (eo.file_url) {
          const fileName = eo.file_url.split('/').pop().split('\\').pop();
          envObjectsByFileName[fileName] = eo;
        }
      });

      const results = {
        objects: { created: [], updated: [], errors: [] },
        path_points: { created: [], updated: [], errors: [] },
        interest_points: { created: [], updated: [], errors: [] }
      };

      if (objects && Array.isArray(objects)) {
        const jsonObjects = objects.filter(obj => obj.deleted !== true);

        const jsonByModelName = {};
        for (const obj of jsonObjects) {
          const mn = obj.modelName || 'Unknown';
          if (!jsonByModelName[mn]) jsonByModelName[mn] = [];
          jsonByModelName[mn].push(obj);
        }

        const [dbObjects] = await pool.query(
          "SELECT * FROM objects WHERE environment_id = ? AND deleted = 0",
          [environmentId]
        );

        const envObjectIdToFileName = {};
        envObjects.forEach(eo => {
          if (eo.file_url) {
            const fileName = eo.file_url.split('/').pop().split('\\').pop();
            envObjectIdToFileName[eo.id] = fileName;
          }
        });

        const dbByModelName = {};
        for (const dbObj of dbObjects) {
          let modelName;
          if (dbObj.object_type === 'wall') {
            modelName = 'Wall';
          } else if (dbObj.env_object_id && envObjectIdToFileName[dbObj.env_object_id]) {
            modelName = envObjectIdToFileName[dbObj.env_object_id];
          } else {
            modelName = dbObj.name;
          }
          if (!dbByModelName[modelName]) dbByModelName[modelName] = [];
          dbByModelName[modelName].push(dbObj);
        }

        const buildObjectData = (obj) => {
          const relX = obj.position?.x || 0;
          const relY = obj.position?.y || 0;
          const relZ = obj.position?.z || 0;
          const gpsLongitude = totemLng + (relX / metersPerDegreeLong);
          const gpsLatitude = totemLat + (relZ / metersPerDegreeLat);

          let objectType = 'glb';
          let envObjectId = null;
          let objectName = obj.modelName || 'Unknown';

          if (obj.modelName === 'Wall') {
            objectType = 'wall';
            objectName = 'Wall';
          } else if (obj.modelName && obj.modelName.endsWith('.glb')) {
            const matchingEnvObj = envObjectsByFileName[obj.modelName];
            if (matchingEnvObj) {
              envObjectId = matchingEnvObj.id;
              objectName = matchingEnvObj.name;
            }
          }

          return {
            name: objectName,
            file_url: '',
            environment_id: environmentId,
            pos_x: gpsLongitude,
            pos_y: gpsLatitude,
            pos_z: relY + TOTEM_HEIGHT,
            scale_x: obj.scale?.x || 1,
            scale_y: obj.scale?.y || 1,
            scale_z: obj.scale?.z || 1,
            rotation_x: obj.rotation?.x || 0,
            rotation_y: obj.rotation?.y || 0,
            rotation_z: obj.rotation?.z || 0,
            rotation_w: obj.rotation?.w !== undefined ? obj.rotation.w : 1,
            env_object_id: envObjectId,
            object_type: objectType
          };
        };

        // Raccogli tutti i modelName unici (da JSON e DB)
        const allModelNames = new Set([...Object.keys(jsonByModelName), ...Object.keys(dbByModelName)]);

        results.objects.deleted = [];

        for (const modelName of allModelNames) {
          const jsonGroup = jsonByModelName[modelName] || [];
          const dbGroup = dbByModelName[modelName] || [];
          const updateCount = Math.min(jsonGroup.length, dbGroup.length);

          for (let i = 0; i < updateCount; i++) {
            try {
              const obj = jsonGroup[i];
              const dbObj = dbGroup[i];
              const objectData = buildObjectData(obj);

              const [updateResult] = await pool.query(
                `UPDATE objects SET
                  name = ?, pos_x = ?, pos_y = ?, pos_z = ?,
                  scale_x = ?, scale_y = ?, scale_z = ?,
                  rotation_x = ?, rotation_y = ?, rotation_z = ?, rotation_w = ?,
                  env_object_id = ?, object_type = ?
                WHERE id = ? AND environment_id = ? AND deleted = 0`,
                [
                  objectData.name, objectData.pos_x, objectData.pos_y, objectData.pos_z,
                  objectData.scale_x, objectData.scale_y, objectData.scale_z,
                  objectData.rotation_x, objectData.rotation_y, objectData.rotation_z, objectData.rotation_w,
                  objectData.env_object_id, objectData.object_type,
                  dbObj.id, environmentId
                ]
              );

              if (updateResult.affectedRows > 0) {
                results.objects.updated.push({ id: dbObj.id, modelName: modelName });
              }
            } catch (objError) {
              results.objects.errors.push({ modelName: modelName, error: objError.message });
            }
          }

          for (let i = updateCount; i < jsonGroup.length; i++) {
            try {
              const obj = jsonGroup[i];
              const objectData = buildObjectData(obj);

              const [insertResult] = await pool.query(
                `INSERT INTO objects (name, file_url, environment_id, pos_x, pos_y, pos_z,
                  scale_x, scale_y, scale_z, rotation_x, rotation_y, rotation_z, rotation_w,
                  env_object_id, object_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  objectData.name, objectData.file_url, objectData.environment_id,
                  objectData.pos_x, objectData.pos_y, objectData.pos_z,
                  objectData.scale_x, objectData.scale_y, objectData.scale_z,
                  objectData.rotation_x, objectData.rotation_y, objectData.rotation_z, objectData.rotation_w,
                  objectData.env_object_id, objectData.object_type
                ]
              );

              results.objects.created.push({
                id: insertResult.insertId,
                modelName: modelName,
                object_type: objectData.object_type
              });
            } catch (objError) {
              results.objects.errors.push({ modelName: modelName, error: objError.message });
            }
          }

          for (let i = updateCount; i < dbGroup.length; i++) {
            try {
              await pool.query(
                `UPDATE objects SET deleted = 1 WHERE id = ? AND environment_id = ?`,
                [dbGroup[i].id, environmentId]
              );
              results.objects.deleted.push({ id: dbGroup[i].id, modelName: modelName });
            } catch (objError) {
              results.objects.errors.push({ modelName: modelName, error: objError.message });
            }
          }
        }
      }

      // 5. Processa path_points (route_stops)
      if (path_points && Array.isArray(path_points)) {
        let [routes] = await pool.query(
          "SELECT id FROM routes WHERE environment_id = ? AND deleted = 0 LIMIT 1",
          [environmentId]
        );

        let routeId;
        if (routes.length === 0) {
          const [newRoute] = await pool.query(
            "INSERT INTO routes (environment_id, label) VALUES (?, ?)",
            [environmentId, "Percorso principale"]
          );
          routeId = newRoute.insertId;
        } else {
          routeId = routes[0].id;
        }

        for (const pp of path_points) {
          try {
            // Converti posizione relativa -> GPS
            const relX = pp.position?.x || 0;
            const relY = pp.position?.y || 0;
            const relZ = pp.position?.z || 0;

            const gpsLongitude = totemLng + (relX / metersPerDegreeLong);
            const gpsLatitude = totemLat + (relZ / metersPerDegreeLat);

            if (pp.id && pp.id !== -1) {
              const [updateResult] = await pool.query(
                `UPDATE route_stops SET
                  position = ?, label = ?, description = ?,
                  latitude = ?, longitude = ?,
                  rel_x = ?, rel_y = ?, rel_z = ?
                WHERE id = ? AND route_id IN (
                  SELECT id FROM routes WHERE environment_id = ? AND deleted = 0
                ) AND deleted = 0`,
                [
                  pp.index || 0, pp.label || '', pp.description || '',
                  gpsLatitude, gpsLongitude,
                  relX, relZ, relY + TOTEM_HEIGHT,
                  pp.id, environmentId
                ]
              );

              if (updateResult.affectedRows > 0) {
                results.path_points.updated.push({ id: pp.id, index: pp.index });
              } else {
                results.path_points.errors.push({
                  id: pp.id,
                  error: "Path point non trovato o non appartiene a questo ambiente"
                });
              }
            } else {
              // INSERT: nuovo path point
              const [insertResult] = await pool.query(
                `INSERT INTO route_stops (route_id, position, label, description, latitude, longitude, rel_x, rel_y, rel_z)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  routeId, pp.index || 0, pp.label || '', pp.description || '',
                  gpsLatitude, gpsLongitude,
                  relX, relZ, relY + TOTEM_HEIGHT
                ]
              );

              results.path_points.created.push({
                id: insertResult.insertId,
                index: pp.index
              });
            }
          } catch (ppError) {
            results.path_points.errors.push({
              index: pp.index,
              error: ppError.message
            });
          }
        }
      }

      // 6. Processa interest_points (env_pois)
      if (interest_points && Array.isArray(interest_points)) {
        for (const ip of interest_points) {
          try {
            // Converti posizione relativa -> GPS (mascottePosition)
            const relX = ip.mascottePosition?.x || 0;
            const relY = ip.mascottePosition?.y || 0;
            const relZ = ip.mascottePosition?.z || 0;

            const gpsLongitude = totemLng + (relX / metersPerDegreeLong);
            const gpsLatitude = totemLat + (relZ / metersPerDegreeLat);

            // Estrai l'id dal nome se presente (formato "POI_123" o id numerico)
            let poiId = ip.id;
            // DISABILITATO: estrazione ID dal nome POI_XX - usa solo ip.id esplicito
            // if (!poiId && ip.interestPoint_Name) {
            //   const match = ip.interestPoint_Name.match(/^POI_(\d+)$/);
            //   if (match) {
            //     poiId = parseInt(match[1], 10);
            //   }
            // }

            if (poiId && poiId !== -1) {
              const [updateResult] = await pool.query(
                `UPDATE env_pois SET
                  label = ?, description = ?,
                  latitude = ?, longitude = ?,
                  rel_x = ?, rel_y = ?, rel_z = ?,
                  extra_media_url = ?
                WHERE id = ? AND environment_id = ? AND deleted = 0`,
                [
                  ip.interestPoint_Title_Text || '',
                  ip.interestPoint_Description_Text || '',
                  gpsLatitude, gpsLongitude,
                  relX, relZ, relY + TOTEM_HEIGHT,
                  ip.interestPoint_Video_URL || '',
                  poiId, environmentId
                ]
              );

              if (updateResult.affectedRows > 0) {
                results.interest_points.updated.push({
                  id: poiId,
                  name: ip.interestPoint_Name
                });
              } else {
                results.interest_points.errors.push({
                  id: poiId,
                  name: ip.interestPoint_Name,
                  error: "POI non trovato o non appartiene a questo ambiente"
                });
              }
            } else {
              // INSERT: nuovo POI
              // Trova la prossima posizione disponibile
              const [maxPos] = await pool.query(
                "SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM env_pois WHERE environment_id = ? AND deleted = 0",
                [environmentId]
              );
              const nextPosition = maxPos[0].next_pos;

              const [insertResult] = await pool.query(
                `INSERT INTO env_pois (environment_id, position, label, description, latitude, longitude, rel_x, rel_y, rel_z, extra_media_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  environmentId, nextPosition,
                  ip.interestPoint_Title_Text || '',
                  ip.interestPoint_Description_Text || '',
                  gpsLatitude, gpsLongitude,
                  relX, relZ, relY + TOTEM_HEIGHT,
                  ip.interestPoint_Video_URL || ''
                ]
              );

              results.interest_points.created.push({
                id: insertResult.insertId,
                name: `POI_${insertResult.insertId}`,
                position: nextPosition
              });
            }
          } catch (ipError) {
            results.interest_points.errors.push({
              name: ip.interestPoint_Name,
              error: ipError.message
            });
          }
        }
      }

      res.json({
        message: "Sincronizzazione completata",
        totem: {
          serial_code: totem.serial_code,
          environment_id: environmentId
        },
        results: results
      });

    } catch (error) {
      console.error("Errore nella sincronizzazione by totem:", error.message);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  module.exports = router;
  