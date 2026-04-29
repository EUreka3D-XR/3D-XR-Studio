import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Container } from "@mui/material";
import { Box, Stack } from "@mui/material";
import maplibregl from "maplibre-gl";
import { useTranslation } from 'react-i18next';
import Navbar from "../components/Navbar";
import EnvironmentBasicForm from "../components/EnvironmentBasicForm";
import ModeControls from "../components/ModeControls";
import MapComponent from "../components/MapComponent";
import EnvObjectsManager from "../components/EnvObjectsManager";
import MapObjectManager from "../components/MapObjectManager";
import RouteManager from "../components/RouteManager";
import POIManager from "../components/POIManager";
import TotemManager from "../components/TotemManager";
import routesApi from "../services/routesApi";
import poisApi from "../services/poisApi";
import envObjectsApi from "../services/envObjectsApi";
import { apiLoadingState } from "../services/axiosInstance";
import piccioneUrl from "../assets/piccione.png";

const __S = Object.freeze({
  a: "route-path-line",
  b: "route-path-layer",
});

const EnvironmentForm = () => {
  const { t } = useTranslation('translation');
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isCreating = location.pathname === "/create-environment";

  // Refs per componenti
  const mapRef = useRef(null);
  const routeManagerRef = useRef(null);
  const poiManagerRef = useRef(null);
  const mapObjectManagerRef = useRef(null);
  const totemManagerRef = useRef(null);
  const hasInitiallyFitted = useRef(false); // AGGIUNTO: Traccia primo caricamento
  const surfaceAreaHandlerRef = useRef(null); // Memorizza la funzione handler di EnvironmentBasicForm

  // Stati principali ambiente
  const [environmentData, setEnvironmentData] = useState({
    name: "",
    latitude: "",
    longitude: "",
    surface_area: {
      topLeft: { lat: "", lng: "" },
      topRight: { lat: "", lng: "" },
      bottomLeft: { lat: "", lng: "" },
      bottomRight: { lat: "", lng: "" },
    }
  });

  const [enableMapClick, setEnableMapClick] = useState(false);
  const [routeMode, setRouteMode] = useState(false);
  const [poiMode, setPoiMode] = useState(false);
  const [objectMode, setObjectMode] = useState(false);
  const [totemMode, setTotemMode] = useState(false);
  const [mapViewMode, setMapViewMode] = useState("3d");

const [surfaceAreaClickMode, setSurfaceAreaClickMode] = useState(false);
const [selectedSurfaceVertex, setSelectedSurfaceVertex] = useState(null);

  // Stati dati
  const [envObjects, setEnvObjects] = useState([]);
  const [mapObjects, setMapObjects] = useState([]);
  const [routeId, setRouteId] = useState(null);
  const [stops, setStops] = useState([]);
  const [pois, setPois] = useState([]);
  const [totems, setTotems] = useState([]);

  // Stati loading
  const [routeLoading, setRouteLoading] = useState(false);
  const [poisLoading, setPoisLoading] = useState(false);
  const [totemsLoading, setTotemsLoading] = useState(false);

  // Markers per mappa
  const routeMarkersRef = useRef([]);
  const poiMarkersRef = useRef([]);
  const totemMarkersRef = useRef([]);

  const stopsRef = useRef([]);
  useEffect(() => { stopsRef.current = stops; }, [stops]);

  const clearModes = useCallback((except = "") => {
    if (except !== "m") setEnableMapClick(false);
    if (except !== "r") setRouteMode(false);
    if (except !== "p") setPoiMode(false);
    if (except !== "o") setObjectMode(false);
    if (except !== "t") setTotemMode(false);
  }, []);

  // Avviso beforeunload se ci sono richieste in corso
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const { loading } = apiLoadingState.getState();
      if (loading) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Callback handlers per form ambiente
  const handleEnvironmentSave = useCallback((data) => {
    navigate("/home");
  }, [navigate]);

  const handleEnvironmentCancel = useCallback(() => {
    navigate("/home");
  }, [navigate]);

  const handleEnvironmentDataChange = useCallback((data) => {
    setEnvironmentData(data);
  }, []);

  const handleEnableMapClickChange = useCallback((enabled) => {
    setEnableMapClick(enabled);
    if (enabled) {
      clearModes("m");
    }
  }, [clearModes]);

  const handleRouteModeChange = useCallback(async (enabled) => {
    setRouteLoading(true);
    try {
      setRouteMode(enabled);
      if (enabled) {
        clearModes("r");

        // Assicura che esista un percorso
        if (!routeId && id) {
          const route = await routesApi.ensureRouteExists(id);
          setRouteId(route.id);
        }
      }
    } catch (error) {
      console.error(t('environmentForm.errors.routeModeActivation'), error);
    } finally {
      setRouteLoading(false);
    }
  }, [clearModes, routeId, id, t]);

  const handlePoiModeChange = useCallback((enabled) => {
    setPoiMode(enabled);
    if (enabled) {
      clearModes("p");
    }
  }, [clearModes]);

  const handleObjectModeChange = useCallback((enabled) => {
    setObjectMode(enabled);
    if (enabled) {
      clearModes("o");
    }
  }, [clearModes]);

  const handleTotemModeChange = useCallback((enabled) => {
    setTotemMode(enabled);
    if (enabled) {
      clearModes("t");
    }
  }, [clearModes]);

  // Handler per registrare la funzione che riceve coordinate dalla mappa
const handleRegisterMapCoordinateHandler = useCallback((handler) => {
  surfaceAreaHandlerRef.current = handler;
}, []);

const handleSurfaceAreaModeChange = useCallback((enabled, vertex) => {
  setSurfaceAreaClickMode(enabled);
  setSelectedSurfaceVertex(vertex);

  if (enabled) {
    clearModes();
  }
}, [clearModes]);

const handleSurfaceAreaMapClick = useCallback((lat, lng) => {
  if (surfaceAreaHandlerRef.current) {
    surfaceAreaHandlerRef.current(lat, lng);
  }
}, []);

  // Map click handlers
  const handleMapClick = useCallback((e) => {
    if (enableMapClick) {
      alert(t('environmentForm.alert.coords', { lng: e.lngLat.lng, lat: e.lngLat.lat }));
    }
  }, [enableMapClick, t]);

  const handleMapRightClick = useCallback((lngLat) => {
    if (enableMapClick) {
      console.log("Right click per oggetto 3D:", lngLat);
    }
  }, [enableMapClick]);

  const handleObjectRightClick = useCallback((lng, lat) => {
    if (!objectMode || !mapObjectManagerRef.current) return;
    
    if (mapObjectManagerRef.current.openPositionModalAtCoords) {
      mapObjectManagerRef.current.openPositionModalAtCoords(lng, lat);
    }
  }, [objectMode]);

  const handlePoiAdd = useCallback(async (lat, lng) => {
    if (!poiMode) return;

    try {
      const poiName = prompt(t('environmentForm.prompt.poiName'));
      if (!poiName?.trim()) return;

      if (poiManagerRef.current?.createPoi) {
        await poiManagerRef.current.createPoi(lat, lng, poiName.trim());
      }
    } catch (error) {
      console.error(t('environmentForm.errors.poiCreate'), error);
    }
  }, [poiMode, t]);

  const handleTotemAdd = useCallback((lat, lng) => {
    if (!totemMode) return;

    // Chiama il metodo esposto dal TotemManager via ref
    if (totemManagerRef.current?.positionTotemAtCoords) {
      totemManagerRef.current.positionTotemAtCoords(lat, lng);
    }
  }, [totemMode]);

  // 1. PRIMA: toRelativeMeters
  const toRelativeMeters = useMemo(() => {
    return (lat, lng) => {
      const lat0 = Number(environmentData.latitude);
      const lng0 = Number(environmentData.longitude);
      if (!isFinite(lat0) || !isFinite(lng0)) return { rel_x: null, rel_y: null };
      const dLat = (lat - lat0) * (Math.PI / 180);
      const dLng = (lng - lng0) * (Math.PI / 180);
      const R = 6371000;
      const meanLat = ((lat + lat0) / 2) * (Math.PI / 180);
      const rel_x = R * dLng * Math.cos(meanLat);
      const rel_y = R * dLat;
      return { rel_x, rel_y };
    };
  }, [environmentData.latitude, environmentData.longitude]);

  // 2. SECONDA: updateRouteLine
  // SECONDA: updateRouteLine
// SECONDA: updateRouteLine
const updateRouteLine = useCallback((orderedStops) => {
  const map = mapRef.current?.getMap();
  if (!map || !orderedStops?.length) return;

  if (!map.isStyleLoaded()) {
    map.once('idle', () => updateRouteLine(orderedStops));
    return;
  }  

  // Preferisci le posizioni LIVE dei marker (post-drag).
  const markerDict = routeMarkersRef.current;
  const hasMarkerDict = markerDict && !Array.isArray(markerDict) && Object.keys(markerDict).length > 0;

  let coords;
  if (hasMarkerDict) {
    // Costruisci la linea nell'ordine di orderedStops ma
    coords = [];
    for (const s of orderedStops) {
      const mk = markerDict[String(s.id)];
      if (mk && typeof mk.getLngLat === "function") {
        const { lng, lat } = mk.getLngLat();
        coords.push([lng, lat]);
      }
    }
    // Se per qualsiasi motivo non abbiamo ricavato almeno 2 punti, fallback ai dati delle tappe
    if (coords.length < 2) {
      coords = orderedStops.map(s => [s.longitude, s.latitude]);
    }
  } else {
    // Primo render: non ci sono ancora marker -> usa le coordinate delle tappe
    coords = orderedStops.map(s => [s.longitude, s.latitude]);
  }

  const data = {
    type: "Feature",
    geometry: { type: "LineString", coordinates: coords },
    properties: {},
  };

  const route_source = __S.a;
  const route_layer = __S.b;

  if (map.getSource(route_source)) {
    map.getSource(route_source).setData(data);
  } else {
    map.addSource(route_source, { type: "geojson", data });
    if (!map.getLayer(route_layer)) {
      map.addLayer({
        id: route_layer,
        type: "line",
        source: route_source,
        paint: {
          "line-color": "#ea580c",
          "line-width": 4,
          "line-opacity": 0.9,
        },
      });
    }
  }
}, []);



  const addSingleRouteMarker = useCallback((stop, index) => {
    if (!mapRef.current?.getMap()) return;
    
    const map = mapRef.current.getMap();
    
    const el = document.createElement("div");
    el.style.width = "28px";
    el.style.height = "28px";
    el.style.borderRadius = "50%";
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.fontWeight = "700";
    el.style.fontSize = "13px";
    el.style.background = "#ea580c";
    el.style.color = "#fff";
    el.style.border = "2px solid #fff";
    el.style.boxShadow = "0 2px 6px rgba(0,0,0,.25)";
    el.textContent = String(index);
    el.setAttribute('data-stop-id', stop.id);

    const marker = new maplibregl.Marker({ element: el, draggable: true })
      .setLngLat([stop.longitude, stop.latitude])
      .addTo(map);

    // Drag handler che NON ridisegna tutto
    marker.on("dragend", async () => {
  const lngLat = marker.getLngLat();
  try {
    const { rel_x, rel_y } = toRelativeMeters(lngLat.lat, lngLat.lng);
    await routesApi.updateStop(routeId, stop.id, {
      latitude: lngLat.lat,
      longitude: lngLat.lng,
      rel_x,
      rel_y,
    });

    // Calcola i dati aggiornati PRIMA di chiamare setStops
    const updatedStops = stopsRef.current.map(s =>
      s.id === stop.id
        ? { ...s, latitude: lngLat.lat, longitude: lngLat.lng, rel_x, rel_y }
        : s
    );

    // Aggiorna la linea IMMEDIATAMENTE con i dati corretti
    updateRouteLine(updatedStops);

    // Poi aggiorna lo stato React
    setStops(updatedStops);
    stopsRef.current = updatedStops;
    
  } catch (error) {
    console.error(t('environmentForm.errors.stopUpdatePosition'), error);
    marker.setLngLat([stop.longitude, stop.latitude]);
  }
});

    marker.getElement().addEventListener("click", () => {
      map.easeTo({
        center: [stop.longitude, stop.latitude],
        zoom: Math.max(map.getZoom(), 17),
      });
    });

    //routeMarkersRef.current.push(marker);
    routeMarkersRef.current[stop.id] = marker;
  }, [routeId, toRelativeMeters, stops, updateRouteLine, t]);

  // 3. TERZA: renderRouteMarkersAndLine
  const renderRouteMarkersAndLine = useCallback((orderedStops) => {
  const mapInstance = mapRef.current?.getMap();
  if (!mapInstance) return;

  // if (!mapInstance.isStyleLoaded()) {
  //   mapInstance.once('styledata', () => renderRouteMarkersAndLine(orderedStops));
  //   return;
  // }
  if (!mapInstance.isStyleLoaded()) {
    mapInstance.once('idle', () => renderRouteMarkersAndLine(orderedStops));
    return;
  }

  // Assicurati che la ref sia un dizionario { [stopId]: Marker }
  if (!routeMarkersRef.current || Array.isArray(routeMarkersRef.current)) {
    routeMarkersRef.current = {};
  }

  const currentMarkers = routeMarkersRef.current; // alias
  const nextIds = new Set(orderedStops.map(s => String(s.id)));

  for (const id of Object.keys(currentMarkers)) {
    if (!nextIds.has(String(id))) {
      try {
        currentMarkers[id].remove?.();
      } catch (_) {}
      delete currentMarkers[id];
    }
  }

  // 2) Aggiungi i marker mancanti e NON spostare quelli esistenti
  orderedStops.forEach((stop, idx) => {
    const id = String(stop.id);
    const existing = currentMarkers[id];

    if (!existing) {
      // - salvare il marker in routeMarkersRef.current[id]
      // - impostare drag & listeners
      // - posizionarlo alle coordinate della tappa
      addSingleRouteMarker(stop, idx + 1);
    } else {
      // Se il tuo addSingleRouteMarker inserisce una classe dedicata al numero,
      // la aggiorniamo in modo difensivo.
      const el = typeof existing.getElement === 'function' ? existing.getElement() : null;
      if (el) {
        const label = el.querySelector?.('.route-marker-index');
        if (label && label.textContent !== String(idx + 1)) {
          label.textContent = String(idx + 1);
        }
      }
      // In alternativa, se hai esposto un API tipo existing.setIndex?.(idx+1), chiamala qui.
    }
  });

  updateRouteLine(orderedStops);
}, [addSingleRouteMarker, updateRouteLine]);


  // 4. QUARTA: handleRouteStopAdd
  const handleRouteStopAdd = useCallback(async (lat, lng) => {
    if (!routeMode || !routeId) return;

    try {
      const { rel_x, rel_y } = toRelativeMeters(lat, lng);
      
      const newStop = await routesApi.createStop(routeId, {
        label: t('environmentForm.route.stopLabel', { n: stops.length + 1 }),
        description: null,
        latitude: lat,
        longitude: lng,
        rel_x,
        rel_y,
        rel_z: null,
        extra_media_url: null,
      });

      // Aggiorna lo stato locale
      const updatedStops = [...stops, newStop];
      setStops(updatedStops);

      // Aggiorna anche lo stato interno di RouteManager (tabella)
      if (routeManagerRef.current?.addStopExternally) {
        routeManagerRef.current.addStopExternally(newStop);
      }

      // INCREMENTALE: Aggiungi solo il nuovo marker
      addSingleRouteMarker(newStop, updatedStops.length);

      // Aggiorna solo la linea
      updateRouteLine(updatedStops);
      
    } catch (error) {
      console.error("Errore creazione tappa:", error);
    }
  }, [routeMode, routeId, stops, toRelativeMeters, addSingleRouteMarker, updateRouteLine, t]);

  // Funzioni di rendering incrementale per POI
  const renderSinglePoiMarker = useCallback((poi) => {
    if (!mapRef.current?.getMap()) return;
    
    const map = mapRef.current.getMap();
    
    const el = document.createElement("div");
    el.style.width = "50px";
    el.style.height = "50px";
    el.style.backgroundImage = `url(${piccioneUrl})`;
    el.style.backgroundSize = "cover";
    el.style.backgroundRepeat = "no-repeat";
    el.style.backgroundPosition = "center";
    el.style.cursor = "pointer";
    el.style.border = "2px solid #fff";
    el.style.borderRadius = "50%";
    el.style.boxShadow = "0 2px 6px rgba(0,0,0,.25)";
    el.setAttribute('data-poi-id', poi.id);

    const popup = new maplibregl.Popup({
      offset: 28,
      anchor: "bottom",
      closeButton: false,
      closeOnClick: false,
    }).setHTML(
      `<div style="font-weight:600;font-size:12px;line-height:1.2">${poi.label ?? ""}</div>`
    );

    const marker = new maplibregl.Marker({ element: el, draggable: true })
      .setLngLat([poi.longitude, poi.latitude])
      .setPopup(popup)
      .addTo(map);

    const markerEl = marker.getElement();

    // Gestione hover popup
    markerEl.addEventListener("mouseenter", () => {
      if (!popup.isOpen()) popup.addTo(map);
    });

    popup.on("open", () => {
      const popupEl = popup.getElement();
      if (!popupEl) return;
      popupEl.addEventListener("mouseleave", () => {
        if (!markerEl.matches(":hover")) popup.remove();
      });
    });

    markerEl.addEventListener("mouseleave", (e) => {
      const popupEl = popup.getElement();
      if (popupEl && e.relatedTarget && popupEl.contains(e.relatedTarget)) return;
      popup.remove();
    });

    // Drag handler
    marker.on("dragstart", () => popup.remove());
    marker.on("dragend", async () => {
      const lngLat = marker.getLngLat();
      if (poiManagerRef.current?.updatePoiPosition) {
        try {
          await poiManagerRef.current.updatePoiPosition(poi.id, lngLat.lat, lngLat.lng);
          // NON chiamare updateSinglePoiMarker
        } catch (error) {
          console.error(t('environmentForm.errors.poiUpdatePosition'), error);
          marker.setLngLat([poi.longitude, poi.latitude]); // Solo in caso di errore
          alert("Errore nell'aggiornamento della posizione del POI");
        }
      }
    });

    // Click per centrare
    markerEl.addEventListener("click", () => {
      map.easeTo({
        center: [poi.longitude, poi.latitude],
        zoom: Math.max(map.getZoom(), 17),
      });
    });

    poiMarkersRef.current.push(marker);
  }, [t]);

  const updateSinglePoiMarker = useCallback((poi) => {
    if (!mapRef.current?.getMap()) return;
    
    // Trova il marker esistente
    const existingMarkerIndex = poiMarkersRef.current.findIndex(marker => {
      const el = marker.getElement();
      return el && el.getAttribute('data-poi-id') === poi.id.toString();
    });
    
    if (existingMarkerIndex !== -1) {
      // Rimuovi il marker esistente
      poiMarkersRef.current[existingMarkerIndex].remove();
      poiMarkersRef.current.splice(existingMarkerIndex, 1);
    }
    
    // Aggiungi il nuovo marker
    renderSinglePoiMarker(poi);
  }, [renderSinglePoiMarker]);

  const removeSinglePoiMarker = useCallback((poiId) => {
    const markerIndex = poiMarkersRef.current.findIndex(marker => {
      const el = marker.getElement();
      return el && el.getAttribute('data-poi-id') === poiId.toString();
    });
    
    if (markerIndex !== -1) {
      poiMarkersRef.current[markerIndex].remove();
      poiMarkersRef.current.splice(markerIndex, 1);
    }
  }, []);

  // AGGIUNTO: Funzioni helper per fitBounds
  const fitToSurfaceArea = useCallback((area) => {
    const vertices = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
    const coordinates = [];
    
    for (const vertex of vertices) {
      if (!area[vertex] || !area[vertex].lng || !area[vertex].lat) return;
      coordinates.push([Number(area[vertex].lng), Number(area[vertex].lat)]);
    }
    
    const lats = coordinates.map(coord => coord[1]);
    const lngs = coordinates.map(coord => coord[0]);
    const bounds = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)]
    ];
    mapRef.current.fitBounds(bounds, { padding: 20 });
  }, []);

  const hasValidSurfaceArea = useCallback((area) => {
    if (!area) return false;
    const vertices = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
    return vertices.every(vertex => 
      area[vertex] && area[vertex].lng && area[vertex].lat
    );
  }, []);

  // Funzioni di rendering incrementale per Route
  const removeSingleStopMarker = useCallback((stopId) => {
    const marker = routeMarkersRef.current[stopId];
    
    if (marker) {
      marker.remove();
      delete routeMarkersRef.current[stopId];
      
      // Ridisegna la linea del percorso
      updateRouteLine(stopsRef.current.filter(s => s.id !== stopId));
    }
  }, [updateRouteLine]);

  // Handler granulari per POI
  const handleSinglePoiAdd = useCallback((poi) => {
    if (mapRef.current?.getMap()?.isStyleLoaded()) {
      renderSinglePoiMarker(poi);
    }
  }, [renderSinglePoiMarker]);

  const handleSinglePoiUpdate = useCallback((poi) => {
    // if (mapRef.current?.getMap()?.isStyleLoaded()) {
    //   updateSinglePoiMarker(poi);
    // }
  }, []);

  const handleSinglePoiRemove = useCallback((poiId) => {
    removeSinglePoiMarker(poiId);
  }, [removeSinglePoiMarker]);

  // Funzioni di rendering per Totem markers
  const renderSingleTotemMarker = useCallback((totem) => {
    if (!mapRef.current?.getMap()) return;

    const map = mapRef.current.getMap();

    const el = document.createElement("div");
    el.style.width = "32px";
    el.style.height = "32px";
    el.style.borderRadius = "6px";
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.fontWeight = "700";
    el.style.fontSize = "11px";
    el.style.background = "#000000";
    el.style.color = "#fff";
    el.style.border = "2px solid #fff";
    el.style.boxShadow = "0 2px 6px rgba(0,0,0,.25)";
    el.style.cursor = "pointer";
    el.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2v8h8V3h-8zm6 6h-4V5h4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm8 6h8v-8h-8v8zm2-6h4v4h-4v-4z"/></svg>`;
    el.setAttribute('data-totem-id', totem.id);

    const popup = new maplibregl.Popup({
      offset: 20,
      anchor: "bottom",
      closeButton: false,
      closeOnClick: false,
    }).setHTML(
      `<div style="font-weight:600;font-size:12px;line-height:1.2">${totem.label || totem.serial_code}</div>
       <div style="font-size:10px;color:#666;font-family:monospace">${totem.serial_code}</div>`
    );

    const marker = new maplibregl.Marker({ element: el, draggable: true })
      .setLngLat([totem.longitude, totem.latitude])
      .setPopup(popup)
      .addTo(map);

    const markerEl = marker.getElement();

    // Gestione hover popup
    markerEl.addEventListener("mouseenter", () => {
      if (!popup.isOpen()) popup.addTo(map);
    });

    popup.on("open", () => {
      const popupEl = popup.getElement();
      if (!popupEl) return;
      popupEl.addEventListener("mouseleave", () => {
        if (!markerEl.matches(":hover")) popup.remove();
      });
    });

    markerEl.addEventListener("mouseleave", (e) => {
      const popupEl = popup.getElement();
      if (popupEl && e.relatedTarget && popupEl.contains(e.relatedTarget)) return;
      popup.remove();
    });

    // Drag handler
    marker.on("dragstart", () => popup.remove());
    marker.on("dragend", async () => {
      const lngLat = marker.getLngLat();
      if (totemManagerRef.current?.updateTotemPosition) {
        try {
          await totemManagerRef.current.updateTotemPosition(totem.id, lngLat.lat, lngLat.lng);
        } catch (error) {
          console.error("Errore aggiornamento posizione totem:", error);
          marker.setLngLat([totem.longitude, totem.latitude]); // Rollback
        }
      }
    });

    // Click per centrare
    markerEl.addEventListener("click", () => {
      map.easeTo({
        center: [totem.longitude, totem.latitude],
        zoom: Math.max(map.getZoom(), 17),
      });
    });

    totemMarkersRef.current.push(marker);
  }, []);

  const removeSingleTotemMarker = useCallback((totemId) => {
    const markerIndex = totemMarkersRef.current.findIndex(marker => {
      const el = marker.getElement();
      return el && el.getAttribute('data-totem-id') === totemId.toString();
    });

    if (markerIndex !== -1) {
      totemMarkersRef.current[markerIndex].remove();
      totemMarkersRef.current.splice(markerIndex, 1);
    }
  }, []);

  const renderTotemMarkers = useCallback((totemsToRender) => {
    if (!mapRef.current?.getMap()) return;

    const map = mapRef.current.getMap();

    if (!map.isStyleLoaded()) return;

    // Assicurati che sia sempre un array
    if (!Array.isArray(totemMarkersRef.current)) {
      totemMarkersRef.current = [];
    }

    // Pulisci markers esistenti
    totemMarkersRef.current.forEach(m => m.remove());
    totemMarkersRef.current = [];

    totemsToRender.forEach((totem) => {
      renderSingleTotemMarker(totem);
    });
  }, [renderSingleTotemMarker]);

  // Handler granulari per Totem
  const handleSingleTotemAdd = useCallback((totem) => {
    if (mapRef.current?.getMap()?.isStyleLoaded()) {
      renderSingleTotemMarker(totem);
    }
  }, [renderSingleTotemMarker]);

  const handleSingleTotemUpdate = useCallback((totem) => {
    // Non serve ricreare il marker - aggiorniamo solo lo stato
  }, []);

  const handleSingleTotemRemove = useCallback((totemId) => {
    removeSingleTotemMarker(totemId);
  }, [removeSingleTotemMarker]);

  const handleTotemsChange = useCallback((newTotems) => {
    setTotems(newTotems);

    if (mapRef.current?.getMap()?.isStyleLoaded()) {
      renderTotemMarkers(newTotems);
      return;
    }

    // Non avviare retry per array vuoto: evita race condition
    // dove il retry di [] cancella i marker renderizzati dal retry con dati
    if (newTotems.length === 0) return;

    // Retry solo per array con dati reali
    const tryRenderTotems = () => {
      let attempts = 0;
      const maxAttempts = 50;

      const checkAndRender = () => {
        const map = mapRef.current?.getMap();
        if (map?.isStyleLoaded()) {
          renderTotemMarkers(newTotems);
          return;
        }
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkAndRender, 100);
        }
      };

      checkAndRender();
    };

    tryRenderTotems();
  }, [renderTotemMarkers]);

  // Handler granulari per Route
 const handleSingleStopRemove = useCallback((stopId) => {
   // togli il marker
   removeSingleStopMarker(stopId);
   // allinea lo stato + linea
   setStops(prev => {
     const updated = prev.filter(s => s.id !== stopId);
     updateRouteLine(updated);
     return updated;
   });
 }, [removeSingleStopMarker, updateRouteLine]);

 const handleRouteLineUpdate = useCallback((updatedStops) => {
   // allinea lo stato centrale
   setStops(updatedStops);
   updateRouteLine(updatedStops);
 }, [updateRouteLine]);

  // Gestione markers POI
  const renderPoiMarkers = useCallback((pois) => {
  if (!mapRef.current?.getMap()) return;
  
  const map = mapRef.current.getMap();

  if (!map.isStyleLoaded()) {
    map.once('load', () => {
      renderPoiMarkers(pois);
    });
    return;
  }
  
  // Assicurati che sia sempre un array
  if (!Array.isArray(poiMarkersRef.current)) {
    poiMarkersRef.current = [];
  }
  
  // Pulisci markers esistenti
  poiMarkersRef.current.forEach(m => m.remove());
  poiMarkersRef.current = [];

  pois.forEach((poi) => {
    renderSinglePoiMarker(poi);
  });
}, [renderSinglePoiMarker]);

  const tryRenderMarkers = useCallback((stops, pois) => {
    let attempts = 0;
    const maxAttempts = 50;

    const checkAndRender = () => {
      const map = mapRef.current?.getMap();
      if (map?.isStyleLoaded()) {
        if (stops && stops.length > 0) renderRouteMarkersAndLine(stops);
        if (pois && pois.length > 0) renderPoiMarkers(pois);
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkAndRender, 100);
      }
    };

    checkAndRender();
  }, [renderRouteMarkersAndLine, renderPoiMarkers]);

  // Callback handlers per componenti figli
  const handleObjectsChange = useCallback((objects) => {
    setEnvObjects(objects);
  }, []);

  // Handler granulari per oggetti 3D
  const handleSingleMapObjectAdd = useCallback((mapObject) => {
    setMapObjects(prev => [...prev, mapObject]);
    
    // Verifica che la mappa sia pronta prima di aggiungere oggetti 3D
    if (mapRef.current?.addSingle3DObject && mapRef.current?.getMap()?.isStyleLoaded()) {
      mapRef.current.addSingle3DObject(mapObject);
    } else {
      // Aspetta che la mappa sia pronta
      const checkAndAdd = () => {
        if (mapRef.current?.getMap()?.isStyleLoaded() && mapRef.current?.addSingle3DObject) {
          mapRef.current.addSingle3DObject(mapObject);
        } else {
          setTimeout(checkAndAdd, 100);
        }
      };
      checkAndAdd();
    }
  }, []);

  const handleSingleMapObjectUpdate = useCallback((updatedObject) => {
    setMapObjects(prev => prev.map(obj => 
      obj.id === updatedObject.id ? updatedObject : obj
    ));
    
    // Aggiorna direttamente nella mappa
    if (mapRef.current?.updateSingle3DObject) {
      mapRef.current.updateSingle3DObject(updatedObject);
    }
  }, []);

  const handleSingleMapObjectRemove = useCallback((objectId) => {
    setMapObjects(prev => prev.filter(obj => obj.id !== objectId));
    
    // Rimuovi direttamente dalla mappa
    if (mapRef.current?.removeSingle3DObject) {
      mapRef.current.removeSingle3DObject(objectId);
    }
  }, []);

  const handleMapObjectsChange = useCallback((objects) => {
    console.warn('Using legacy handleMapObjectsChange - consider using granular handlers');
    setMapObjects(objects);
  }, []);

  const handleRouteIdChange = useCallback((newRouteId) => {
    setRouteId(newRouteId);
  }, []);

  // Helpers leggeri
const sameStopsOrder = (a, b) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i].id !== b[i].id) return false;
  return true;
};

const sameStopsSetAndPositions = (a, b) => {
  if (a.length !== b.length) return false;
  const mapA = new Map(a.map(s => [s.id, s]));
  for (const t of b) {
    const s = mapA.get(t.id);
    if (!s) return false;
    // confronta coordinate (puoi arrotondare per sicurezza se vuoi)
    if (s.latitude !== t.latitude || s.longitude !== t.longitude) return false;
  }
  return true;
};

// Sostituisci la tua handleStopsChange con questa
const handleStopsChange = useCallback((incomingStops) => {
  const prev = stopsRef.current || [];

  // Merge difensivo: non perdere tappe locali non ancora "note" al figlio
  const incomingIds = new Set(incomingStops.map(s => s.id));
  const extras = prev.filter(s => !incomingIds.has(s.id));
  const merged = [...incomingStops, ...extras];

  const sameSetAndPos = sameStopsSetAndPositions(prev, merged);
  const sameOrder = sameStopsOrder(prev, merged);

  if (sameSetAndPos) {
    // Niente cambi reali di posizione: evita setState (rompe il loop)
    if (!sameOrder) {
      const mapReady = mapRef.current?.getMap()?.isStyleLoaded();
      if (mapReady) renderRouteMarkersAndLine(merged);
      else tryRenderMarkers(merged, null);
    }
    return; // stop: nessun setStops
  }

  // Qui ci sono cambi reali (nuove/rimosse tappe o posizioni diverse)
  stopsRef.current = merged;
  setStops(merged);

  const mapReady = mapRef.current?.getMap()?.isStyleLoaded();
  if (mapReady) renderRouteMarkersAndLine(merged);
  else tryRenderMarkers(merged, null);
}, [renderRouteMarkersAndLine, tryRenderMarkers]);


  const handlePoisChange = useCallback((newPois) => {
    setPois(newPois);
    
    if (mapRef.current?.getMap()?.isStyleLoaded()) {
      renderPoiMarkers(newPois);
    } else {
      tryRenderMarkers(null, newPois);
    }
  }, [renderPoiMarkers, tryRenderMarkers]);

  
  //  useEffect per surfaceArea con fitBounds solo iniziale
useEffect(() => {
  if (mapRef.current && environmentData.surface_area) {
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (!map.isStyleLoaded()) {
      map.once("load", () => {
        // Usa il metodo esposto da MapComponent
        if (mapRef.current?.updatePolygon) {
          mapRef.current.updatePolygon(environmentData.surface_area);
        }
        
        // FitBounds solo al primo caricamento
        if (!hasInitiallyFitted.current && hasValidSurfaceArea(environmentData.surface_area)) {
          fitToSurfaceArea(environmentData.surface_area);
          hasInitiallyFitted.current = true;
        }
      });
    } else {
      // Usa il metodo esposto da MapComponent
      if (mapRef.current?.updatePolygon) {
        mapRef.current.updatePolygon(environmentData.surface_area);
      }
      
      // FitBounds solo al primo caricamento
      if (!hasInitiallyFitted.current && hasValidSurfaceArea(environmentData.surface_area)) {
        fitToSurfaceArea(environmentData.surface_area);
        hasInitiallyFitted.current = true;
      }
    }      
  }
}, [environmentData.surface_area, hasValidSurfaceArea, fitToSurfaceArea]);

  return (
    <>
      <Navbar />

      {/* Layout a due colonne: sinistra (sidebar) + destra (mappa) */}
      <Box
        sx={{
          height: "calc(100vh - 64px)",
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "660px 1fr",
          },
        }}
      >
        {/* Sidebar sinistra con scroll verticale */}
        <Box
          sx={{
            borderRight: { md: "1px solid", xs: "none" },
            borderColor: "divider",
            overflowY: "auto",
            p: 2,
            bgcolor: "#00507f",
          }}
        >
          <Stack spacing={2}>
            {/* Form principale ambiente */}
            <EnvironmentBasicForm
              environmentId={id}
              isCreating={isCreating}
              onSave={handleEnvironmentSave}
              onCancel={handleEnvironmentCancel}
              onEnvironmentDataChange={handleEnvironmentDataChange}
              onSurfaceAreaModeChange={handleSurfaceAreaModeChange}
              onRequestMapCoordinateHandler={handleRegisterMapCoordinateHandler}
            />

            {/* Controlli modalità */}
            <ModeControls
              enableMapClick={enableMapClick}
              routeMode={routeMode}
              poiMode={poiMode}
              objectMode={objectMode}
              totemMode={totemMode}
              routeLoading={routeLoading}
              poisLoading={poisLoading}
              totemsLoading={totemsLoading}
              onEnableMapClickChange={handleEnableMapClickChange}
              onRouteModeChange={handleRouteModeChange}
              onPoiModeChange={handlePoiModeChange}
              onObjectModeChange={handleObjectModeChange}
              onTotemModeChange={handleTotemModeChange}
              isCreating={isCreating}
            />

            {/* Gestione oggetti 3D disponibili */}
            <EnvObjectsManager
              environmentId={id}
              isCreating={isCreating}
              onObjectsChange={handleObjectsChange}
            />

            {/* Gestione oggetti 3D posizionati sulla mappa */}
            <MapObjectManager
              ref={mapObjectManagerRef}
              environmentId={id}
              isCreating={isCreating}
              envObjects={envObjects}
              onObjectsChange={handleMapObjectsChange}
              onSingleObjectAdd={handleSingleMapObjectAdd}
              onSingleObjectUpdate={handleSingleMapObjectUpdate}
              onSingleObjectRemove={handleSingleMapObjectRemove}
            />

            {/* Gestione percorso */}
            <RouteManager
              ref={routeManagerRef}
              environmentId={id}
              isCreating={isCreating}
              onRouteIdChange={handleRouteIdChange}
              onStopsChange={handleStopsChange}
              onDataLoaded={(loadedStops) => {
                if (mapRef.current?.getMap()?.isStyleLoaded()) {
                  renderRouteMarkersAndLine(loadedStops);
                }
              }}
              onSingleStopRemove={handleSingleStopRemove}
              onRouteLineUpdate={handleRouteLineUpdate}
              routeLoading={routeLoading}
            />

            {/* Gestione POI */}
            <POIManager
              ref={poiManagerRef}
              environmentId={id}
              isCreating={isCreating}
              onPoisChange={handlePoisChange}
              onDataLoaded={(loadedPois) => {
                if (mapRef.current?.getMap()?.isStyleLoaded()) {
                  renderPoiMarkers(loadedPois);
                }
              }}
              onSinglePoiAdd={handleSinglePoiAdd}
              onSinglePoiUpdate={handleSinglePoiUpdate}
              onSinglePoiRemove={handleSinglePoiRemove}
              poisLoading={poisLoading}
              environmentLatitude={environmentData.latitude}
              environmentLongitude={environmentData.longitude}
            />

            {/* Gestione Totem */}
            <TotemManager
              ref={totemManagerRef}
              environmentId={id}
              isCreating={isCreating}
              onTotemsChange={handleTotemsChange}
              onDataLoaded={(loadedTotems) => {
                // Retry rendering se mappa non pronta
                const tryRender = () => {
                  let attempts = 0;
                  const maxAttempts = 50;
                  const checkAndRender = () => {
                    if (mapRef.current?.getMap()?.isStyleLoaded()) {
                      renderTotemMarkers(loadedTotems);
                      return;
                    }
                    attempts++;
                    if (attempts < maxAttempts) {
                      setTimeout(checkAndRender, 100);
                    }
                  };
                  checkAndRender();
                };

                if (mapRef.current?.getMap()?.isStyleLoaded()) {
                  renderTotemMarkers(loadedTotems);
                } else {
                  tryRender();
                }
              }}
              onSingleTotemAdd={handleSingleTotemAdd}
              onSingleTotemUpdate={handleSingleTotemUpdate}
              onSingleTotemRemove={handleSingleTotemRemove}
              totemsLoading={totemsLoading}
            />
          </Stack>
        </Box>

        {/* Colonna destra: mappa a pieno spazio */}
        <Box sx={{ position: "relative", bgcolor: "background.default" }}>
          <Box sx={{ position: "absolute", inset: 0 }}>
            <MapComponent
              ref={mapRef}
              latitude={environmentData.latitude}
              longitude={environmentData.longitude}
              surfaceArea={environmentData.surface_area}
              enableMapClick={enableMapClick}
              routeMode={routeMode}
              poiMode={poiMode}
              objectMode={objectMode}
              totemMode={totemMode}
              surfaceAreaClickMode={surfaceAreaClickMode}
              selectedSurfaceVertex={selectedSurfaceVertex}
              objects={[]}
              mapObjects={mapObjects}
              onMapClick={handleMapClick}
              onMapRightClick={handleMapRightClick}
              onRouteStopAdd={handleRouteStopAdd}
              onPoiAdd={handlePoiAdd}
              onTotemAdd={handleTotemAdd}
              onObjectRightClick={handleObjectRightClick}
              onSurfaceAreaClick={handleSurfaceAreaMapClick}
              mapViewMode={mapViewMode}
              onMapViewModeChange={setMapViewMode}
              onMapReady={(map) => {
                // Carica oggetti 3D iniziali se presenti
                if (mapObjects.length > 0) {
                  console.log('Loading initial 3D objects:', mapObjects.length);
                }

                // Ridisegna percorsi, POI e Totem
                if (stops.length > 0) {
                  renderRouteMarkersAndLine(stopsRef.current);
                }
                if (pois.length > 0) {
                  renderPoiMarkers(pois);
                }
                if (totems.length > 0) {
                  renderTotemMarkers(totems);
                }
              }}
            />
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default EnvironmentForm;
