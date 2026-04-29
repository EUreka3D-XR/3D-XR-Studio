import React, { useRef, useEffect, forwardRef, useImperativeHandle, useCallback, useMemo,useState  } from "react";
import { Box, Alert, ToggleButton, ToggleButtonGroup, Typography, CircularProgress } from "@mui/material";
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import SatelliteIcon from '@mui/icons-material/Satellite';
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import * as THREE from 'three';
import { loadModelFromUrl, getFileExtension } from '../utils/modelLoaderUtils.js';
import { useTranslation } from 'react-i18next';

const MAPTILER_KEY = "YOUR_MAPTILER_API_KEY";
const API = (__API_BASE_URL__ || "https://YOUR_BACKEND_API_URL").replace(/\/+$/, "");

const MapComponent = forwardRef(({
  // Dati ambiente
  latitude,
  longitude,
  surfaceArea,

  enableMapClick = false,
  routeMode = false,
  poiMode = false,
  objectMode = false,
  totemMode = false,
  surfaceAreaClickMode = false,
  selectedSurfaceVertex = null,

  // Oggetti 3D da renderizzare
  objects = [],
  mapObjects = [],

  // Callbacks per le interazioni
  onMapClick,
  onMapRightClick,
  onRouteStopAdd,
  onPoiAdd,
  onTotemAdd,
  onObjectRightClick,
  onSurfaceAreaClick,

  // Vista mappa
  mapViewMode = "3d",
  onMapViewModeChange,
  onMapReady,

  // Stile mappa
  mapStyle = "streets-v2",
  initialZoom = 16,
  initialPitch = 45,
  //initialBearing = -17.6,
  initialBearing = 0,

  // Errori
  error = ""
}, ref) => {
  const { t } = useTranslation('translation');
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  // 🔥 NUOVO: Ref per callbacks per evitare re-registrazione listener
  const callbacksRef = useRef({
    onSurfaceAreaClick: null,
    onRouteStopAdd: null,
    onPoiAdd: null,
    onTotemAdd: null,
    onObjectRightClick: null,
    onMapClick: null,
    onMapRightClick: null
  });
  
  //NUOVO: Tracciamento granulare degli oggetti 3D
  const mapObjectsRegistry = useRef(new Map()); // objectId -> { layerId, loaded, model }
  const previousMapObjects = useRef(new Map()); // Per diff comparison

  //NUOVO: Cache dei modelli Three.js caricati
  const modelCache = useRef(new Map()); // objectId -> THREE.Group
  // NUOVO: Stato per coordinate cursore del mouse
  const [cursorCoords, setCursorCoords] = useState({ lat: null, lng: null, x: 0, y: 0 });
  // Contatore modelli 3D in fase di caricamento
  const [modelsLoading, setModelsLoading] = useState(0);

  // 🔥 NUOVO: Aggiorna le callbacks nel ref quando cambiano le props
  useEffect(() => {
    callbacksRef.current = {
      onSurfaceAreaClick,
      onRouteStopAdd,
      onPoiAdd,
      onTotemAdd,
      onObjectRightClick,
      onMapClick,
      onMapRightClick
    };
  }, [onSurfaceAreaClick, onRouteStopAdd, onPoiAdd, onTotemAdd, onObjectRightClick, onMapClick, onMapRightClick]);

  // Esponi metodi al componente parent tramite ref
  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current,
    updatePolygon: (area) => updatePolygon(area),
    fitBounds: (bounds, options = {}) => {
      if (mapRef.current) {
        mapRef.current.fitBounds(bounds, { padding: 20, ...options });
      }
    },
    easeTo: (options) => {
      if (mapRef.current) {
        mapRef.current.easeTo(options);
      }
    },
    addSource: (id, source) => {
      if (mapRef.current && !mapRef.current.getSource(id)) {
        mapRef.current.addSource(id, source);
      }
    },
    addLayer: (layer, before) => {
      if (mapRef.current && !mapRef.current.getLayer(layer.id)) {
        mapRef.current.addLayer(layer, before);
      }
    },
    removeLayer: (layerId) => {
      if (mapRef.current && mapRef.current.getLayer(layerId)) {
        mapRef.current.removeLayer(layerId);
      }
    },
    removeSource: (sourceId) => {
      if (mapRef.current && mapRef.current.getSource(sourceId)) {
        mapRef.current.removeSource(sourceId);
      }
    },
    addSingle3DObject: (mapObject) => addSingle3DObject(mapObject),
    updateSingle3DObject: (mapObject) => updateSingle3DObject(mapObject),
    removeSingle3DObject: (objectId) => removeSingle3DObject(objectId)
  }));

  // Inizializza la mappa
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const centerLat = Number(latitude) || 41.9028;
    const centerLng = Number(longitude) || 12.4964;

    mapRef.current = new maplibregl.Map({
      container: mapContainerRef.current,
      style: `https://api.maptiler.com/maps/${mapStyle}/style.json?key=${MAPTILER_KEY}`,
      center: [centerLng, centerLat],
      zoom: initialZoom,
      pitch: initialPitch,
      bearing: initialBearing,
      antialias: true,
    });

    // Gestione immagini mancanti
    mapRef.current.on('styleimagemissing', (e) => {
      const id = e.id;
      if (!mapRef.current.hasImage(id)) {
        const pixel = new Uint8Array([0, 0, 0, 0]);
        mapRef.current.addImage(id, { width: 1, height: 1, data: pixel });
      }
    });

    mapRef.current.on("load", () => {
      setupMap();
      if (typeof onMapReady === "function") {
        onMapReady(mapRef.current);
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Aggiorna centro mappa quando cambiano le coordinate
  useEffect(() => {
    if (mapRef.current && latitude && longitude) {
      const centerLat = Number(latitude);
      const centerLng = Number(longitude);
      
      if (isFinite(centerLat) && isFinite(centerLng)) {
        mapRef.current.setCenter([centerLng, centerLat]);
      }
    }
  }, [latitude, longitude]);

  // Aggiorna poligono superficie quando cambia
  useEffect(() => {
    if (mapRef.current && surfaceArea) {
       if (!mapRef.current.isStyleLoaded()) {
          mapRef.current.once("load", () => updatePolygon(surfaceArea));
      } else {
        updatePolygon(surfaceArea);
      }      
    }
  }, [surfaceArea]);

  useEffect(() => {
    if (!mapRef.current || !objects.length) return;

    if (!mapRef.current.isStyleLoaded()) {
      mapRef.current.once("load", () => addCustomLayers());
    } else {
      addCustomLayers();
    }
  }, [objects]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Aspetta che lo style sia caricato
    if (!mapRef.current.isStyleLoaded()) {
      mapRef.current.once("load", () => processMapObjectsChanges());
    } else {
      processMapObjectsChanges();
    }
  }, [mapObjects]);

  // 🎯 NUOVO: Listener per tracciare coordinate cursore del mouse
useEffect(() => {
  const map = mapRef.current;
  if (!map) return;

  const isAnyModeActive = objectMode || routeMode || poiMode || totemMode;

  if (!isAnyModeActive) {
    setCursorCoords({ lat: null, lng: null, x: 0, y: 0 });
    return;
  }

  const handleMouseMove = (e) => {
    const { lngLat, point } = e;
    setCursorCoords({
      lat: lngLat.lat,
      lng: lngLat.lng,
      x: point.x,
      y: point.y
    });
  };

  const handleMouseLeave = () => {
    setCursorCoords({ lat: null, lng: null, x: 0, y: 0 });
  };

  map.on('mousemove', handleMouseMove);
  map.on('mouseleave', handleMouseLeave);

  return () => {
    map.off('mousemove', handleMouseMove);
    map.off('mouseleave', handleMouseLeave);
  };
}, [objectMode, routeMode, poiMode, totemMode]);

// 🎯 MODIFICATO: Gestione click con callbacks da ref
useEffect(() => {
  const map = mapRef.current;
  if (!map) return;

  const handleMapClick = (e) => {
    const { lngLat } = e;

    console.log('🔵 MapComponent: handleMapClick chiamato', {
    poiMode,
    totemMode,
    callback: callbacksRef.current.onPoiAdd ? 'presente' : 'assente'
  });

    if (surfaceAreaClickMode && selectedSurfaceVertex && callbacksRef.current.onSurfaceAreaClick) {
      callbacksRef.current.onSurfaceAreaClick(lngLat.lat, lngLat.lng);
      return;
    }

    // Totem mode
    if (totemMode && callbacksRef.current.onTotemAdd) {
      callbacksRef.current.onTotemAdd(lngLat.lat, lngLat.lng);
      return;
    }

    // Route mode
    if (routeMode && callbacksRef.current.onRouteStopAdd) {
      callbacksRef.current.onRouteStopAdd(lngLat.lat, lngLat.lng);
      return;
    }

    // POI mode
    if (poiMode && callbacksRef.current.onPoiAdd) {
      callbacksRef.current.onPoiAdd(lngLat.lat, lngLat.lng);
      return;
    }

    // Object mode (right click)
    // Gestito separatamente con contextmenu event

    // Default map click
    if (enableMapClick && callbacksRef.current.onMapClick) {
      callbacksRef.current.onMapClick(e);
    }
  };

  const handleRightClick = (e) => {
    e.preventDefault();
    const { lngLat } = e;
    
    if (objectMode && callbacksRef.current.onObjectRightClick) {
      callbacksRef.current.onObjectRightClick(lngLat.lng, lngLat.lat);
      return;
    }
    
    if (callbacksRef.current.onMapRightClick) {
      callbacksRef.current.onMapRightClick(lngLat);
    }
  };

  map.on('click', handleMapClick);
  map.on('contextmenu', handleRightClick);

  return () => {
    map.off('click', handleMapClick);
    map.off('contextmenu', handleRightClick);
  };
}, [surfaceAreaClickMode, selectedSurfaceVertex, routeMode, poiMode, totemMode, objectMode, enableMapClick]);
// 🔥 MODIFICATO: Rimosse le callback dall'array di dipendenze
//--------------------------------------------------------------------------------------------------
  const processMapObjectsChanges = useCallback(() => {
    if (!mapRef.current) return;

    console.log('ðŸ"„ Processing map objects changes...');
    
    // Crea mappa corrente degli oggetti
    const currentObjects = new Map();
    mapObjects.forEach(obj => {
      currentObjects.set(obj.id, obj);
    });

    // Identifica oggetti rimossi
    for (const [objId] of previousMapObjects.current) {
      if (!currentObjects.has(objId)) {
        console.log('âŒ Removing 3D object:', objId);
        removeSingle3DObject(objId);
      }
    }

    // Identifica oggetti aggiunti o modificati
    for (const [objId, obj] of currentObjects) {
      const previous = previousMapObjects.current.get(objId);
      
      if (!previous) {
        // Oggetto nuovo
        console.log('âœ… Adding new 3D object:', objId);
        addSingle3DObject(obj);
      } else if (hasObjectChanged(previous, obj)) {
        // Oggetto modificato
        console.log('ðŸ"„ Updating 3D object:', objId);
        updateSingle3DObject(obj);
      }
    }

    // Aggiorna cache precedente
    previousMapObjects.current = new Map(currentObjects);
  }, [mapObjects]);

  const hasObjectChanged = useCallback((previous, current) => {
    const keys = ['pos_x', 'pos_y', 'pos_z', 'rotation_x', 'rotation_y', 'rotation_z', 'scale_x', 'scale_y', 'scale_z', 'name'];
    return keys.some(key => previous[key] !== current[key]);
  }, []);

  const addSingle3DObject = useCallback((mapObject) => {
    if (!mapRef.current) return;

    const layerId = `map-object-${mapObject.id}`;
    
    // Evita duplicati
    if (mapObjectsRegistry.current.has(mapObject.id)) {
      console.warn(`Object ${mapObject.id} already exists, skipping...`);
      return;
    }

    const lng = Number(mapObject.pos_x) || 0;
    const lat = Number(mapObject.pos_y) || 0;
    const alt = Number(mapObject.pos_z) || 0;

    const mercatorCoord = maplibregl.MercatorCoordinate.fromLngLat({ lng, lat }, alt);
    const objectTransform = createObjectTransform(mapObject, mercatorCoord);

    const customLayer = {
      id: layerId,
      type: 'custom',
      renderingMode: '3d',
      onAdd: function (map, gl) {
        this.camera = new THREE.Camera();
        this.scene = new THREE.Scene();

        // Illuminazione ottimizzata
        setupLighting(this.scene);

        // Carica modello con cache
        loadModel(mapObject, objectTransform, this.scene);

        this.map = map;
        this.renderer = new THREE.WebGLRenderer({
          canvas: map.getCanvas(),
          context: gl,
          antialias: true,
        });
        this.renderer.autoClear = false;
      },
      render: function (gl, args) {
        const m = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
        const l = createTransformMatrix(objectTransform);

        this.camera.projectionMatrix = m.multiply(l);
        this.renderer.resetState();
        this.renderer.render(this.scene, this.camera);
        this.map.triggerRepaint();
      },
    };

    mapRef.current.addLayer(customLayer);
    
    // Registra l'oggetto
    mapObjectsRegistry.current.set(mapObject.id, {
      layerId,
      loaded: false,
      mapObject: mapObject
    });

    console.log(`âœ… Added 3D object ${mapObject.id} with layer ${layerId}`);
  }, []);

  const updateSingle3DObject = useCallback((mapObject) => {
    console.log(`ðŸ"„ Updating 3D object ${mapObject.id}`);
    
    // Per aggiornamenti di posizione/rotazione/scala, rimuovi e ricrea
    // (ottimizzazione futura: aggiornare solo le matrici di trasformazione)
    removeSingle3DObject(mapObject.id);
    addSingle3DObject(mapObject);
  }, []);

  const removeSingle3DObject = useCallback((objectId) => {
    const registry = mapObjectsRegistry.current.get(objectId);
    if (!registry) return;

    try {
      if (mapRef.current && mapRef.current.getLayer(registry.layerId)) {
        mapRef.current.removeLayer(registry.layerId);
      }
      if (mapRef.current && mapRef.current.getSource(registry.layerId)) {
        mapRef.current.removeSource(registry.layerId);
      }
      
      // Rimuovi dalla cache
      modelCache.current.delete(objectId);
      mapObjectsRegistry.current.delete(objectId);
      
      console.log(`âŒ Removed 3D object ${objectId}`);
    } catch (error) {
      console.warn(`Error removing 3D object ${objectId}:`, error);
    }
  }, []);

  const createObjectTransform = useCallback((mapObject, mercatorCoord) => ({
    translateX: mercatorCoord.x,
    translateY: mercatorCoord.y,
    translateZ: mercatorCoord.z,
    rotateX: (Number(mapObject.rotation_x) || 0) * (Math.PI / 180),
    rotateY: (Number(mapObject.rotation_y) || 0) * (Math.PI / 180),
    rotateZ: (Number(mapObject.rotation_z) || 0) * (Math.PI / 180),
    scaleX: Number(mapObject.scale_x) || 1,
    scaleY: Number(mapObject.scale_y) || 1,
    scaleZ: Number(mapObject.scale_z) || 1,
    scale: mercatorCoord.meterInMercatorCoordinateUnits()
  }), []);

  const setupLighting = useCallback((scene) => {
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(0, -70, 100).normalize();
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight2.position.set(0, 70, 100).normalize();
    scene.add(directionalLight2);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
  }, []);

  const loadModel = useCallback((mapObject, objectTransform, scene) => {
    // Verifica cache
    const cachedModel = modelCache.current.get(mapObject.id);
    if (cachedModel) {
      console.log(`ðŸŽ¯ Using cached model for object ${mapObject.id}`);
      const model = cachedModel.clone();
      applyTransformToModel(model, objectTransform);
      scene.add(model);
      return;
    }

    // Traccia inizio caricamento modello
    setModelsLoading(prev => prev + 1);

    const modelUrl = `${API}/api/objects/download/${mapObject.id}`;
    const ext = getFileExtension(mapObject.original_file_url) || 'glb';
    console.log(`Loading 3D model: id=${mapObject.id}, original_file_url=${mapObject.original_file_url}, ext=${ext}, url=${modelUrl}`);

    loadModelFromUrl(modelUrl, ext)
      .then((model) => {
        // Debug: bounding box del modello prima del transform
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        console.log(`Model ${mapObject.id} (${ext}) bounding box size:`, { x: size.x, y: size.y, z: size.z }, 'children:', model.children.length);

        applyTransformToModel(model, objectTransform);
        scene.add(model);

        // Salva in cache
        modelCache.current.set(mapObject.id, model.clone());
        console.log(`Cached model for object ${mapObject.id} (format: ${ext})`);

        // Aggiorna registro
        const registry = mapObjectsRegistry.current.get(mapObject.id);
        if (registry) {
          registry.loaded = true;
        }

        setModelsLoading(prev => prev - 1);
      })
      .catch((error) => {
        console.error(`Error loading 3D model for object ${mapObject.name} (format: ${ext}):`, error);
        setModelsLoading(prev => prev - 1);
      });
  }, []);

  const applyTransformToModel = useCallback((model, transform) => {
    model.scale.set(transform.scaleX, transform.scaleY, transform.scaleZ);
    // Rotazione gestita solo in createTransformMatrix per evitare doppia applicazione
    model.position.set(0, 0, 0);
  }, []);

  const createTransformMatrix = useCallback((objectTransform) => {
    return new THREE.Matrix4()
      .makeTranslation(
        objectTransform.translateX,
        objectTransform.translateY,
        objectTransform.translateZ
      )
      .scale(new THREE.Vector3(
        objectTransform.scale * objectTransform.scaleX,
        -objectTransform.scale * objectTransform.scaleY,
        objectTransform.scale * objectTransform.scaleZ
      ))
      .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
      .multiply(new THREE.Matrix4().makeRotationX(objectTransform.rotateX))
      .multiply(new THREE.Matrix4().makeRotationY(objectTransform.rotateY))
      .multiply(new THREE.Matrix4().makeRotationZ(objectTransform.rotateZ));
  }, []);

  // useEffect(() => {
  //   if (!mapRef.current) return;

  //   const handleClick = (e) => {
  //     if (routeMode && onRouteStopAdd) {
  //       onRouteStopAdd(e.lngLat.lat, e.lngLat.lng);
  //     } else if (poiMode && onPoiAdd) {
  //       onPoiAdd(e.lngLat.lat, e.lngLat.lng);
  //     } else if (enableMapClick && onMapClick) {
  //       onMapClick(e);
  //     }
  //   };

  //   const handleRightClick = (e) => {
  //     e.preventDefault();
  //     const canvas = mapRef.current.getCanvas();
  //     const rect = canvas.getBoundingClientRect();
  //     const point = {
  //       x: e.clientX - rect.left,
  //       y: e.clientY - rect.top,
  //     };
  //     const lngLat = mapRef.current.unproject(point);
      
  //     if (objectMode && onObjectRightClick) {
  //       onObjectRightClick(lngLat.lng, lngLat.lat);
  //     } else if (enableMapClick && onMapRightClick) {
  //       onMapRightClick(lngLat);
  //     }
  //   };

  //   if (enableMapClick || routeMode || poiMode) {
  //     mapRef.current.on("click", handleClick);
  //     mapRef.current.getCanvas().style.cursor = "crosshair";
  //   } else {
  //     mapRef.current.off("click", handleClick);
  //     mapRef.current.getCanvas().style.cursor = "";
  //   }

  //   if (enableMapClick || objectMode) {
  //     const canvas = mapRef.current.getCanvas();
  //     canvas.addEventListener("contextmenu", handleRightClick);
  //     return () => {
  //       canvas.removeEventListener("contextmenu", handleRightClick);
  //     };
  //   }

  //   return () => {
  //     if (mapRef.current) {
  //       mapRef.current.off("click", handleClick);
  //     }
  //   };
  // }, [enableMapClick, routeMode, poiMode, objectMode, onMapClick, onMapRightClick, onRouteStopAdd, onPoiAdd, onObjectRightClick]);

  useEffect(() => {
    if (!mapRef.current) return;

    const newStyle = mapViewMode === "satellite" 
      ? `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY}`
      : `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

    mapRef.current.setStyle(newStyle);

    mapRef.current.once('styledata', () => {
      if (mapViewMode === "3d") {
        setupMap();
      }
      
      if (mapObjects.length > 0) {
        for (const mapObject of mapObjects) {
          addSingle3DObject(mapObject);
        }
      }
      
      if (surfaceArea) {
        updatePolygon(surfaceArea);
      }

      if (typeof onMapReady === "function") {
        onMapReady(mapRef.current);
      }
    });
  }, [mapViewMode]);

  const setupMap = () => {
  if (!mapRef.current) return;

  if (!mapRef.current.getSource("openmaptiles")) {
    mapRef.current.addSource("openmaptiles", {
      url: `https://api.maptiler.com/tiles/v3/tiles.json?key=${MAPTILER_KEY}`,
      type: "vector",
    });
  }

  const layers = mapRef.current.getStyle().layers;
  let labelLayerId;
  for (let i = 0; i < layers.length; i++) {
    if (layers[i].type === "symbol" && layers[i].layout["text-field"]) {
      labelLayerId = layers[i].id;
      break;
    }
  }

  if (!mapRef.current.getLayer("3d-buildings")) {
    mapRef.current.addLayer(
      {
        id: "3d-buildings",
        source: "openmaptiles",
        "source-layer": "building",
        type: "fill-extrusion",
        minzoom: 15,
        filter: ["!=", ["get", "hide_3d"], true],
        paint: {
          "fill-extrusion-color": [
            "interpolate",
            ["linear"],
            ["get", "render_height"],
            0,
            "lightgray",
            200,
            "royalblue",
            400,
            "lightblue",
          ],
          "fill-extrusion-height": [
            "interpolate",
            ["linear"],
            ["zoom"],
            15,
            0,
            16,
            ["get", "render_height"],
          ],
          "fill-extrusion-base": [
            "case",
            [">=", ["get", "zoom"], 16],
            ["get", "render_min_height"],
            0,
          ],
        },
      },
      labelLayerId
    );
  }
};

  const updatePolygon = (area) => {
  if (!mapRef.current || !area) return;

  const vertices = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
  const coordinates = [];
  
  for (const vertex of vertices) {
    if (!area[vertex] || !area[vertex].lng || !area[vertex].lat) {
      return;
    }
    coordinates.push([Number(area[vertex].lng), Number(area[vertex].lat)]);
  }
  
  coordinates.push(coordinates[0]);

  const polygonData = {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [coordinates] },
  };

  // USA SOURCE DEDICATO PER PERIMETRO
  const perimeter_source = "environment-perimeter";
  const perimeter_layer = "environment-perimeter-line";

  if (mapRef.current.getSource(perimeter_source)) {
    mapRef.current.getSource(perimeter_source).setData(polygonData);
  } else {
    mapRef.current.addSource(perimeter_source, {
      type: "geojson",
      data: polygonData,
    });
    
    if (!mapRef.current.getLayer(perimeter_layer)) {
      mapRef.current.addLayer({
        id: perimeter_layer,
        type: "line",
        source: perimeter_source,
        paint: { "line-color": "blue", "line-width": 3 },
      });
    }
  }

  // RIMUOVI questa parte che causa conflitti
  // const lats = coordinates.map(coord => coord[1]);
  // const lngs = coordinates.map(coord => coord[0]);
  // const bounds = [
  //   [Math.min(...lngs), Math.min(...lats)],
  //   [Math.max(...lngs), Math.max(...lats)]
  // ];
  // mapRef.current.fitBounds(bounds, { padding: 20 });
};

  const addCustomLayers = () => {
    if (!mapRef.current || !objects.length) return;

    objects.forEach((object) => {
      const layerId = `3d-object-${object.name}-${object.url}`;
      
      if (mapRef.current.getLayer(layerId)) {
        mapRef.current.removeLayer(layerId);
        mapRef.current.removeSource(layerId);
      }

      const mercatorCoord = maplibregl.MercatorCoordinate.fromLngLat(
        { lng: object.position.x, lat: object.position.y },
        object.position.z
      );

      const objectTransform = {
        translateX: mercatorCoord.x,
        translateY: mercatorCoord.y,
        translateZ: mercatorCoord.z,
        rotateX: Math.PI / 2,
        rotateY: object.rotation.y,
        rotateZ: object.rotation.z,
        scale: mercatorCoord.meterInMercatorCoordinateUnits() * object.scale.x,
      };

      const customLayer = {
        id: layerId,
        type: 'custom',
        renderingMode: '3d',
        onAdd: function (map, gl) {
          this.camera = new THREE.Camera();
          this.scene = new THREE.Scene();

          const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
          directionalLight.position.set(0, -70, 100).normalize();
          this.scene.add(directionalLight);

          const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
          directionalLight2.position.set(0, 70, 100).normalize();
          this.scene.add(directionalLight2);

          const legacyExt = getFileExtension(object.url) || 'glb';
          loadModelFromUrl(object.url, legacyExt)
            .then((model) => {
              model.scale.set(object.scale.x, object.scale.y, object.scale.z);
              model.position.set(0, 0, 0);
              this.scene.add(model);
            })
            .catch((error) => {
              console.error("Errore nel caricamento del modello 3D:", error);
            });

          this.map = map;
          this.renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialias: true,
          });
          this.renderer.autoClear = false;
        },
        render: function (gl, args) {
          const m = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
          const l = new THREE.Matrix4()
            .makeTranslation(
              objectTransform.translateX,
              objectTransform.translateY,
              objectTransform.translateZ
            )
            .scale(new THREE.Vector3(objectTransform.scale, -objectTransform.scale, objectTransform.scale))
            .multiply(new THREE.Matrix4().makeRotationX(objectTransform.rotateX))
            .multiply(new THREE.Matrix4().makeRotationY(objectTransform.rotateY))
            .multiply(new THREE.Matrix4().makeRotationZ(objectTransform.rotateZ));

          this.camera.projectionMatrix = m.multiply(l);
          this.renderer.resetState();
          this.renderer.render(this.scene, this.camera);
          this.map.triggerRepaint();
        },
      };

      mapRef.current.addLayer(customLayer);
    });
  };

  return (
    <Box sx={{ position: "relative" }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box 
        sx={{ 
          width: "100%", 
          height: "850px", 
          borderRadius: 2, 
          overflow: "hidden",
          border: "1px solid",
          borderColor: "grey.300"
        }}
      >
        <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
      </Box>
      {/* Overlay caricamento modelli 3D */}
      {modelsLoading > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0, 0, 0, 0.45)',
            zIndex: 999,
            borderRadius: 2,
            pointerEvents: 'none',
            gap: 1.5
          }}
        >
          <CircularProgress sx={{ color: '#fff' }} size={44} />
          <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>
            {t('mapComponent.loadingModels', 'Caricamento modelli 3D...')}
          </Typography>
        </Box>
      )}
      {/* 🎯 NUOVO: Tooltip coordinate cursore */}
{cursorCoords.lat !== null && cursorCoords.lng !== null && (
  <Box
    sx={{
      position: 'absolute',
      left: cursorCoords.x + 15,
      top: cursorCoords.y + 15,
      bgcolor: 'rgba(0, 0, 0, 0.85)',
      color: 'white',
      px: 1.5,
      py: 1,
      borderRadius: 1,
      fontSize: '0.75rem',
      fontFamily: 'monospace',
      pointerEvents: 'none',
      zIndex: 1001,
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      whiteSpace: 'nowrap'
    }}
  >
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      <Box>
        <strong>Lat:</strong> {cursorCoords.lat.toFixed(6)}
      </Box>
      <Box>
        <strong>Lng:</strong> {cursorCoords.lng.toFixed(6)}
      </Box>
    </Box>
  </Box>
)}
      <Box 
        sx={{ 
          position: "absolute", 
          top: 8, 
          left: 8, 
          zIndex: 1000
        }}
      >
        <ToggleButtonGroup
          value={mapViewMode}
          exclusive
          onChange={(e, newMode) => {
            if (newMode !== null && onMapViewModeChange) {
              onMapViewModeChange(newMode);
            }
          }}
          size="small"
          sx={{
            bgcolor: "rgba(255,255,255,0.9)",
            "& .MuiToggleButton-root": {
              border: "1px solid rgba(0,0,0,0.12)",
              "&.Mui-selected": {
                bgcolor: "primary.main",
                color: "white"
              }
            }
          }}
        >
          <ToggleButton value="3d" aria-label={t('mapComponent.viewModes.view3D')}>
            <ViewInArIcon sx={{ mr: 1 }} />
            <Typography variant="body2">{t('mapComponent.viewModes.3d')}</Typography>
          </ToggleButton>
          <ToggleButton value="satellite" aria-label={t('mapComponent.viewModes.viewSatellite')}>
            <SatelliteIcon sx={{ mr: 1 }} />
            <Typography variant="body2">{t('mapComponent.viewModes.satellite')}</Typography>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      {(enableMapClick || routeMode || poiMode || totemMode || objectMode || surfaceAreaClickMode) && (
        <Box
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            bgcolor: "rgba(0,0,0,0.7)",
            color: "white",
            px: 2,
            py: 1,
            borderRadius: 1,
            fontSize: "0.875rem"
          }}
        >
          {enableMapClick && t('mapComponent.modes.objectModeLegacy')}
          {objectMode && t('mapComponent.modes.objectMode')}
          {routeMode && t('mapComponent.modes.routeMode')}
          {poiMode && t('mapComponent.modes.poiMode')}
          {totemMode && t('mapComponent.modes.totemMode')}
          {surfaceAreaClickMode && (
            <Box>
              Definizione Surface Area
              {selectedSurfaceVertex && ` - ${selectedSurfaceVertex}`}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
});

MapComponent.displayName = "MapComponent";

export default MapComponent;
