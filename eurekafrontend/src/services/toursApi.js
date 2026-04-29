// src/services/toursApi.js
// Wrapper axios per le API dei Percorsi (tour_routes) e delle Tappe (tour_stops)

import apiClient, { API } from "./axiosInstance";

// Helper per uniformare gli errori
function unwrap(promise) {
  return promise
    .then((res) => res.data)
    .catch((err) => {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Request failed";
      const e = new Error(message);
      e.status = err?.response?.status;
      e.data = err?.response?.data;
      throw e;
    });
}

/* =========================
 * ROUTE (percorsi) -> /api/tour_routes
 * ========================= */

/**
 * Lista percorsi di un ambiente
 * @param {{ environmentId?: number|string }} params
 */
function listRoutes({ environmentId } = {}) {
  const params = {};
  if (environmentId != null) params.environment_id = environmentId;
  return unwrap(apiClient.get(`${API}/api/tour_routes`, { params }));
}

/**
 * Dettaglio di una rotta
 * @param {number|string} routeId
 */
function getRoute(routeId) {
  return unwrap(apiClient.get(`${API}/api/tour_routes/${routeId}`));
}

/**
 * Crea una rotta
 * payload: { environment_id, name, description?, is_active? }
 */
function createRoute(payload) {
  return unwrap(apiClient.post(`${API}/api/tour_routes`, payload));
}

/**
 * Aggiorna una rotta
 * payload: { name?, description?, is_active? }
 */
function updateRoute(routeId, payload) {
  return unwrap(apiClient.put(`${API}/api/tour-routes/${routeId}`, payload));
}

/**
 * Elimina (soft-delete) una rotta
 */
function deleteRoute(routeId) {
  return unwrap(apiClient.delete(`${API}/api/tour_routes/${routeId}`));
}

/* =========================
 * STOPS (tappe) -> /api/tour_stops
 * ========================= */

/**
 * Lista tappe di una rotta (ordinate)
 * @param {number|string} routeId
 */
function listStops(routeId) {
  return unwrap(apiClient.get(`${API}/api/tour_stops`, { params: { route_id: routeId } }));
}

/**
 * Crea una tappa
 * stop: {
 *   label, latitude, longitude,
 *   description?, rel_x?, rel_y?, rel_z?, extra_media_url?,
 *   position? (alias: order_index?)
 * }
 */
function createStop(routeId, stop) {
  const payload = {
    ...stop,
    route_id: routeId,
  };
  // compat: se arriva order_index convertirlo in position
  if (payload.order_index != null && payload.position == null) {
    payload.position = payload.order_index;
    delete payload.order_index;
  }
  return unwrap(apiClient.post(`${API}/api/tour_stops`, payload));
}

/**
 * Aggiorna una tappa (anche il riordino tramite 'position')
 * updates parziale: stessi campi di createStop senza route_id
 */
function updateStop(stopId, updates) {
  const payload = { ...updates };
  if (payload.order_index != null && payload.position == null) {
    payload.position = payload.order_index;
    delete payload.order_index;
  }
  return unwrap(apiClient.put(`${API}/api/tour_stops/${stopId}`, payload));
}

/**
 * Elimina una tappa
 */
function deleteStop(stopId) {
  return unwrap(apiClient.delete(`${API}/api/tour_stops/${stopId}`));
}

export const toursApi = {
  // routes
  listRoutes,
  getRoute,
  createRoute,
  updateRoute,
  deleteRoute,

  // stops
  listStops,
  createStop,
  updateStop,
  deleteStop,
};

export default toursApi;
