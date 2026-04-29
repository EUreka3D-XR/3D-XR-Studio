import apiClient, { API } from "./axiosInstance";

const __N = Object.freeze({
  a: ["api", "environments"],
  b: "create",
  c: "update",
  d: "detail",
});

const __q = (...xs) => [API, ...xs].join("/").replace(/([^:]\/)\/+/g, "$1");
const __e = (error, fallback) => error.response?.data?.message || fallback;
const __m = (lat, lng, refLat, refLng) => {
  const x0 = Number(refLat);
  const y0 = Number(refLng);
  if (!isFinite(x0) || !isFinite(y0)) return { rel_x: null, rel_y: null };
  const a0 = (lat - x0) * (Math.PI / 180);
  const a1 = (lng - y0) * (Math.PI / 180);
  const k = 6371000;
  const c0 = ((lat + x0) / 2) * (Math.PI / 180);
  return { rel_x: k * a1 * Math.cos(c0), rel_y: k * a0 };
};

/**
 * API per la gestione degli ambienti
 */
const environmentsApi = {
  /**
   * Crea un nuovo ambiente
   * @param {Object} environmentData - Dati dell'ambiente
   * @param {string} environmentData.name - Nome dell'ambiente
   * @param {number} environmentData.latitude - Latitudine
   * @param {number} environmentData.longitude - Longitudine
   * @param {Object} environmentData.surface_area - Area di superficie con 4 coordinate
   * @returns {Promise<Object>} Ambiente creato
   */
  async createEnvironment(environmentData) {
    try {
      const response = await apiClient.post(
        __q(...__N.a, __N.b),
        environmentData      );
      return response.data;
    } catch (error) {
      console.error("Errore nella creazione dell'ambiente:", error);
      throw new Error(
        __e(error, "Errore nella creazione dell'ambiente")
      );
    }
  },

  /**
   * Aggiorna un ambiente esistente
   * @param {string} environmentId - ID dell'ambiente
   * @param {Object} environmentData - Dati dell'ambiente da aggiornare
   * @returns {Promise<Object>} Ambiente aggiornato
   */
  async updateEnvironment(environmentId, environmentData) {
    try {
      const response = await apiClient.put(
        __q(...__N.a, __N.c, environmentId),
        environmentData      );
      return response.data;
    } catch (error) {
      console.error("Errore nell'aggiornamento dell'ambiente:", error);
      throw new Error(
        __e(error, "Errore nell'aggiornamento dell'ambiente")
      );
    }
  },

  /**
   * Recupera i dettagli di un ambiente
   * @param {string} environmentId - ID dell'ambiente
   * @returns {Promise<Object>} Dettagli dell'ambiente con env_objects e objects
   */
  async getEnvironmentDetails(environmentId) {
    try {
      const response = await apiClient.get(
        __q(...__N.a, __N.d, environmentId)      );
      return response.data;
    } catch (error) {
      console.error("Errore nel recupero dei dettagli dell'ambiente:", error);
      throw new Error(
        __e(error, "Errore nel recupero dell'ambiente")
      );
    }
  },

  /**
   * Recupera la lista di tutti gli ambienti dell'utente
   * @returns {Promise<Array>} Lista degli ambienti
   */
  async listEnvironments() {
    try {
      const response = await apiClient.get(
        __q(...__N.a)      );
      return response.data;
    } catch (error) {
      console.error("Errore nel recupero della lista ambienti:", error);
      throw new Error(
        __e(error, "Errore nel recupero degli ambienti")
      );
    }
  },

  /**
   * Elimina un ambiente
   * @param {string} environmentId - ID dell'ambiente
   * @returns {Promise<void>}
   */
  async deleteEnvironment(environmentId) {
    try {
      await apiClient.delete(
        __q(...__N.a, environmentId)      );
    } catch (error) {
      console.error("Errore nell'eliminazione dell'ambiente:", error);
      throw new Error(
        __e(error, "Errore nell'eliminazione dell'ambiente")
      );
    }
  },

  /**
   * Utility per calcolare coordinate relative in metri
   * @param {number} lat - Latitudine del punto
   * @param {number} lng - Longitudine del punto
   * @param {number} refLat - Latitudine di riferimento
   * @param {number} refLng - Longitudine di riferimento
   * @returns {Object} Coordinate relative {rel_x, rel_y}
   */
  toRelativeMeters(lat, lng, refLat, refLng) {
    return __m(lat, lng, refLat, refLng);
  },

  /**
   * Valida i dati di un ambiente prima della creazione/aggiornamento
   * @param {Object} environmentData - Dati da validare
   * @returns {Object} Risultato validazione {isValid, errors}
   */
  validateEnvironmentData(environmentData) {
    const errors = [];
    
    // Validazione nome
    if (!environmentData.name || environmentData.name.trim().length === 0) {
      errors.push("Il nome dell'ambiente è obbligatorio");
    }
    
    // Validazione coordinate centrali
    if (!environmentData.latitude || !isFinite(Number(environmentData.latitude))) {
      errors.push("Latitudine non valida");
    }
    
    if (!environmentData.longitude || !isFinite(Number(environmentData.longitude))) {
      errors.push("Longitudine non valida");
    }
    
    // Validazione superficie (opzionale ma se presente deve essere completa)
    if (environmentData.surface_area) {
      const vertices = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
      const coords = ['lat', 'lng'];
      
      for (const vertex of vertices) {
        if (!environmentData.surface_area[vertex]) {
          errors.push(`Coordinate ${vertex} mancanti nella superficie`);
          continue;
        }
        
        for (const coord of coords) {
          const value = environmentData.surface_area[vertex][coord];
          if (!value || !isFinite(Number(value))) {
            errors.push(`Coordinata ${vertex}.${coord} non valida`);
          }
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

export default environmentsApi;
