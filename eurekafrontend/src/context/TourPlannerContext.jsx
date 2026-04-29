// src/context/TourPlannerContext.jsx
import React, { createContext, useCallback, useContext, useMemo, useReducer } from "react";
import toursApi from "../services/toursApi";

/**
 * TourPlannerContext
 * - Gestisce stato e azioni per "Percorso a tappe" all'interno di un Environment.
 * - Dipendenze minime: React + toursApi (axios).
 *
 * Provider props:
 *  - environmentId: number (ID dell'ambiente corrente)
 *  - origin: { lat: number, lng: number }  // origine per coordinate relative
 */
const TourPlannerContext = createContext(null);

export const useTourPlanner = () => {
  const ctx = useContext(TourPlannerContext);
  if (!ctx) throw new Error("useTourPlanner must be used within <TourPlannerProvider>");
  return ctx;
};

const initialState = {
  editing: false,            // modalità percorso ON/OFF
  currentRoute: null,        // { id, environment_id, label, description, ... } oppure null
  stops: [],                 // [{ id, label, description, lat, lng, rel_x, rel_y, rel_z, extra_media_url, position }]
  selectedStopId: null,
  unsavedChanges: false,     // flag utile se in futuro vorrai batch/save
  saving: false,
  error: null,
  mapCenter: null,           // opzionale: per hint aggiunta test
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_EDITING":
      return { ...state, editing: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_SAVING":
      return { ...state, saving: action.payload };
    case "SET_CURRENT_ROUTE":
      return { ...state, currentRoute: action.payload };
    case "SET_STOPS":
      return { ...state, stops: action.payload ?? [] };
    case "ADD_STOP":
      return { ...state, stops: [...state.stops, action.payload], unsavedChanges: true };
    case "UPDATE_STOP": {
      const stops = state.stops.map(s => (s.id === action.payload.id ? { ...s, ...action.payload } : s));
      return { ...state, stops, unsavedChanges: true };
    }
    case "DELETE_STOP": {
      const stops = state.stops.filter(s => s.id !== action.payload);
      return { ...state, stops, unsavedChanges: true };
    }
    case "REORDER_STOPS":
      return { ...state, stops: action.payload, unsavedChanges: true };
    case "SET_SELECTED_STOP":
      return { ...state, selectedStopId: action.payload };
    case "SET_MAP_CENTER":
      return { ...state, mapCenter: action.payload };
    case "CLEAR_LOCAL":
      return { ...state, stops: [], currentRoute: null, unsavedChanges: false, error: null, editing: false };
    default:
      return state;
  }
}

/** Utilità: conversione coordinate relative rispetto all'origine dell'ambiente
 * NOTA: rel_y nel DB = altezza verticale (non distanza Nord-Sud!)
 * Il backend exportbytotem calcola X e Z dalle coordinate GPS,
 * mentre rel_y viene usato per l'altezza (y = rel_y - TOTEM_HEIGHT)
 */
function toRelativeMeters(origin, lat, lng) {
  if (!origin) return { rel_x: null, rel_y: 0, rel_z: null };
  const { lat: lat0, lng: lng0 } = origin;
  const dx = (lng - lng0) * Math.cos((lat0 * Math.PI) / 180) * 111_320; // metri Est-Ovest
  const dz = (lat - lat0) * 110_540; // metri Nord-Sud
  return { rel_x: dx, rel_y: 0, rel_z: dz }; // rel_y = 0 per altezza default (diventa -1 nell'export)
}

export function TourPlannerProvider({ environmentId, origin, children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  /** Carica (o crea) il percorso per l'ambiente */
  const ensureRoute = useCallback(async () => {
    if (!environmentId) return null;
    try {
      // Prova a recuperare un percorso esistente
      const routes = await toursApi.listRoutes({ environmentId });
      let route = routes?.[0] || null;
      if (!route) {
        // Crea un nuovo percorso "di default"
        route = await toursApi.createRoute({
          environment_id: environmentId,
          label: "Percorso",
          description: null,
        });
      }
      dispatch({ type: "SET_CURRENT_ROUTE", payload: route });
      return route;
    } catch (e) {
      dispatch({ type: "SET_ERROR", payload: e.message || "Impossibile caricare/creare il percorso" });
      return null;
    }
  }, [environmentId]);

  /** Carica le tappe del percorso corrente */
  const loadStops = useCallback(async (routeId) => {
    if (!routeId) return;
    try {
      const stops = await toursApi.listStops(routeId);
      // Assicura ordinamento per position crescente
      const ordered = [...stops].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      dispatch({ type: "SET_STOPS", payload: ordered });
    } catch (e) {
      dispatch({ type: "SET_ERROR", payload: e.message || "Impossibile caricare le tappe" });
    }
  }, []);

  /** Carica route+stops esistenti (entry point tipico) */
  const loadExisting = useCallback(async () => {
    const route = await ensureRoute();
    if (route?.id) await loadStops(route.id);
  }, [ensureRoute, loadStops]);

  /** Attiva/disattiva modalità percorso */
  const setEditing = useCallback((on) => {
    dispatch({ type: "SET_EDITING", payload: !!on });
  }, []);

  /** Aggiunge una tappa da click mappa (lat,lng) */
  const addStop = useCallback(
    async ({ lat, lng, label = "", description = "", media_url = "" }) => {
      const route = state.currentRoute || (await ensureRoute());
      if (!route?.id) return;

      // rel_x/rel_z calcolati per riferimento, rel_y = 0 (altezza default)
      const { rel_x, rel_y, rel_z } = toRelativeMeters(origin, lat, lng);

      try {
        const created = await toursApi.createStop(route.id, {
          label: label || `Tappa ${state.stops.length + 1}`,
          description: description || null,
          latitude: lat,
          longitude: lng,
          rel_x,
          rel_y,
          rel_z,
          extra_media_url: media_url || null,
        });
        dispatch({ type: "ADD_STOP", payload: created });
      } catch (e) {
        dispatch({ type: "SET_ERROR", payload: e.message || "Errore creazione tappa" });
      }
    },
    [ensureRoute, origin, state.currentRoute, state.stops.length]
  );

  /** Aggiorna i campi di una tappa */
  const updateStop = useCallback(
    async (stopId, patch) => {
      try {
        // Se cambiano GPS, ricalcola relative
        const nextPatch = { ...patch };
        if (typeof patch.latitude === "number" && typeof patch.longitude === "number") {
          const rel = toRelativeMeters(origin, patch.latitude, patch.longitude);
          nextPatch.rel_x = rel.rel_x;
          nextPatch.rel_y = rel.rel_y;
        }
        const updated = await toursApi.updateStop(stopId, nextPatch);
        dispatch({ type: "UPDATE_STOP", payload: updated });
      } catch (e) {
        dispatch({ type: "SET_ERROR", payload: e.message || "Errore aggiornamento tappa" });
      }
    },
    [origin]
  );

  /** Elimina una tappa (soft-delete lato BE, ricompattazione posizioni) */
  const deleteStop = useCallback(async (stopId) => {
    try {
      await toursApi.deleteStop(stopId);
      dispatch({ type: "DELETE_STOP", payload: stopId });
      // Ricarica per assicurare posizioni coerenti
      if (state.currentRoute?.id) await loadStops(state.currentRoute.id);
    } catch (e) {
      dispatch({ type: "SET_ERROR", payload: e.message || "Errore eliminazione tappa" });
    }
  }, [loadStops, state.currentRoute?.id]);

  /** Reorder helper: sposta su/giù una tappa */
  const reorderAndPersist = useCallback(
    async (newStops) => {
      dispatch({ type: "REORDER_STOPS", payload: newStops });
      if (!state.currentRoute?.id) return;
      try {
        const orderedIds = newStops.map((s) => s.id);
        // BE attende: { route_id, order: [ids...] }
        await toursApi.reorderStops(state.currentRoute.id, orderedIds);
        // ricarica da BE per avere positions aggiornate
        await loadStops(state.currentRoute.id);
      } catch (e) {
        dispatch({ type: "SET_ERROR", payload: e.message || "Errore riordino tappe" });
      }
    },
    [loadStops, state.currentRoute?.id]
  );

  const moveStopUp = useCallback(
    async (stopId) => {
      const idx = state.stops.findIndex((s) => s.id === stopId);
      if (idx <= 0) return;
      const newStops = [...state.stops];
      [newStops[idx - 1], newStops[idx]] = [newStops[idx], newStops[idx - 1]];
      await reorderAndPersist(newStops);
    },
    [state.stops, reorderAndPersist]
  );

  const moveStopDown = useCallback(
    async (stopId) => {
      const idx = state.stops.findIndex((s) => s.id === stopId);
      if (idx < 0 || idx >= state.stops.length - 1) return;
      const newStops = [...state.stops];
      [newStops[idx + 1], newStops[idx]] = [newStops[idx], newStops[idx + 1]];
      await reorderAndPersist(newStops);
    },
    [state.stops, reorderAndPersist]
  );

  /** Persist "globale" (oggi quasi no-op perché salviamo live) */
  const persist = useCallback(async () => {
    // Manteniamo il metodo per futura estensione (batch save).
    // Qui potresti aggiungere salvataggi di label/description del route, ecc.
    return true;
  }, []);

  /** Utility: selezione tappa e centro mappa */
  const setSelectedStop = useCallback((stopId) => {
    dispatch({ type: "SET_SELECTED_STOP", payload: stopId });
  }, []);

  const setMapCenter = useCallback((center) => {
    dispatch({ type: "SET_MAP_CENTER", payload: center });
  }, []);

  /** Pulisce la bozza locale (non cancella su BE) */
  const clearLocal = useCallback(() => {
    dispatch({ type: "CLEAR_LOCAL" });
  }, []);

  const value = useMemo(
    () => ({
      state,
      // load
      loadExisting,
      // editing mode
      setEditing,
      // stops ops
      addStop,
      updateStop,
      deleteStop,
      moveStopUp,
      moveStopDown,
      reorderAndPersist,
      // selection/map
      setSelectedStop,
      setMapCenter,
      // route/save
      ensureRoute,
      persist,
      clearLocal,
    }),
    [
      state,
      loadExisting,
      setEditing,
      addStop,
      updateStop,
      deleteStop,
      moveStopUp,
      moveStopDown,
      reorderAndPersist,
      setSelectedStop,
      setMapCenter,
      ensureRoute,
      persist,
      clearLocal,
    ]
  );

  return <TourPlannerContext.Provider value={value}>{children}</TourPlannerContext.Provider>;
}
