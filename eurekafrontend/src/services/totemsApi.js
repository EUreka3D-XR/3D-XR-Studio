import apiClient, { API } from "./axiosInstance";

/**
 * API per la gestione dei Totem
 */
const totemsApi = {
  // ================================
  // ENDPOINT EDITOR
  // ================================

  /**
   * Lista i totem assegnati all'utente corrente
   * @returns {Promise<Array>} Lista totem
   */
  async listMyTotems() {
    try {
      const response = await apiClient.get(
        `${API}/api/totems/my`      );
      return response.data;
    } catch (error) {
      console.error("Errore nel recupero dei totem:", error);
      throw new Error(
        error.response?.data?.message || "Errore nel recupero dei totem"
      );
    }
  },

  /**
   * Lista i totem disponibili per un ambiente specifico
   * (assegnati all'owner dell'ambiente, non ancora posizionati)
   * @param {number} environmentId - ID dell'ambiente
   * @returns {Promise<Object>} { environment_id, environment_name, owner_id, available_totems: [...] }
   */
  async listAvailableTotems(environmentId) {
    try {
      const response = await apiClient.get(
        `${API}/api/totems/available/${environmentId}`      );
      return response.data;
    } catch (error) {
      console.error("Errore nel recupero dei totem disponibili:", error);
      throw new Error(
        error.response?.data?.message || "Errore nel recupero dei totem disponibili"
      );
    }
  },

  /**
   * Lista i totem gia' posizionati in un ambiente
   * @param {number} environmentId - ID dell'ambiente
   * @returns {Promise<Array>} Lista totem posizionati
   */
  async listPositionedTotems(environmentId) {
    try {
      const myTotems = await this.listMyTotems();
      return myTotems.filter(t => t.environment_id === Number(environmentId));
    } catch (error) {
      console.error("Errore nel recupero dei totem posizionati:", error);
      throw new Error(
        error.response?.data?.message || "Errore nel recupero dei totem posizionati"
      );
    }
  },

  /**
   * Posiziona un totem in un ambiente
   * @param {number} totemId - ID del totem
   * @param {Object} data - { environment_id, latitude, longitude }
   * @returns {Promise<Object>} Risultato
   */
  async positionTotem(totemId, data) {
    try {
      const response = await apiClient.patch(
        `${API}/api/totems/${totemId}/position`,
        data      );
      return response.data;
    } catch (error) {
      console.error("Errore nel posizionamento del totem:", error);
      throw new Error(
        error.response?.data?.message || "Errore nel posizionamento del totem"
      );
    }
  },

  /**
   * Rimuove il posizionamento di un totem
   * @param {number} totemId - ID del totem
   * @returns {Promise<Object>} Risultato
   */
  async unpositionTotem(totemId) {
    try {
      const response = await apiClient.patch(
        `${API}/api/totems/${totemId}/unposition`,
        {}      );
      return response.data;
    } catch (error) {
      console.error("Errore nella rimozione del posizionamento:", error);
      throw new Error(
        error.response?.data?.message || "Errore nella rimozione del posizionamento"
      );
    }
  },

  // ================================
  // ENDPOINT ADMIN
  // ================================

  /**
   * Lista tutti i totem (solo admin)
   * @param {Object} filters - Filtri opzionali { assigned_to, environment_id, unassigned, unpositioned }
   * @returns {Promise<Array>} Lista totem
   */
  async listAllTotems(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.assigned_to) params.append("assigned_to", filters.assigned_to);
      if (filters.environment_id) params.append("environment_id", filters.environment_id);
      if (filters.unassigned) params.append("unassigned", "true");
      if (filters.unpositioned) params.append("unpositioned", "true");

      const url = params.toString() ? `${API}/api/totems?${params}` : `${API}/api/totems`;

      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error("Errore nel recupero di tutti i totem:", error);
      throw new Error(
        error.response?.data?.message || "Errore nel recupero dei totem"
      );
    }
  },

  /**
   * Recupera dettagli di un singolo totem
   * @param {number} totemId - ID del totem
   * @returns {Promise<Object>} Dettagli totem
   */
  async getTotem(totemId) {
    try {
      const response = await apiClient.get(
        `${API}/api/totems/${totemId}`      );
      return response.data;
    } catch (error) {
      console.error("Errore nel recupero del totem:", error);
      throw new Error(
        error.response?.data?.message || "Errore nel recupero del totem"
      );
    }
  },

  /**
   * Crea un nuovo totem (solo admin)
   * @param {Object} data - { label?, serial_code? }
   * @returns {Promise<Object>} Totem creato
   */
  async createTotem(data) {
    try {
      const response = await apiClient.post(
        `${API}/api/totems`,
        data      );
      return response.data;
    } catch (error) {
      console.error("Errore nella creazione del totem:", error);
      throw new Error(
        error.response?.data?.message || "Errore nella creazione del totem"
      );
    }
  },

  /**
   * Aggiorna un totem (solo admin)
   * @param {number} totemId - ID del totem
   * @param {Object} data - { label?, serial_code? }
   * @returns {Promise<Object>} Totem aggiornato
   */
  async updateTotem(totemId, data) {
    try {
      const response = await apiClient.put(
        `${API}/api/totems/${totemId}`,
        data      );
      return response.data;
    } catch (error) {
      console.error("Errore nell'aggiornamento del totem:", error);
      throw new Error(
        error.response?.data?.message || "Errore nell'aggiornamento del totem"
      );
    }
  },

  /**
   * Elimina un totem (solo admin, soft delete)
   * @param {number} totemId - ID del totem
   * @returns {Promise<void>}
   */
  async deleteTotem(totemId) {
    try {
      await apiClient.delete(
        `${API}/api/totems/${totemId}`      );
    } catch (error) {
      console.error("Errore nell'eliminazione del totem:", error);
      throw new Error(
        error.response?.data?.message || "Errore nell'eliminazione del totem"
      );
    }
  },

  /**
   * Assegna un totem a un editor (solo admin)
   * @param {number} totemId - ID del totem
   * @param {number|null} userId - ID dell'editor (null per revocare)
   * @returns {Promise<Object>} Risultato
   */
  async assignTotem(totemId, userId) {
    try {
      const response = await apiClient.patch(
        `${API}/api/totems/${totemId}/assign`,
        { user_id: userId }      );
      return response.data;
    } catch (error) {
      console.error("Errore nell'assegnazione del totem:", error);
      throw new Error(
        error.response?.data?.message || "Errore nell'assegnazione del totem"
      );
    }
  },

  // ================================
  // UTILITY E VALIDAZIONE
  // ================================

  /**
   * Valida le coordinate
   * @param {number} latitude - Latitudine
   * @param {number} longitude - Longitudine
   * @returns {Object} { isValid, errors }
   */
  validateCoordinates(latitude, longitude) {
    const errors = [];

    if (latitude === undefined || latitude === null || latitude === "") {
      errors.push("Latitudine obbligatoria");
    } else if (!isFinite(Number(latitude))) {
      errors.push("Latitudine non valida");
    } else if (Number(latitude) < -90 || Number(latitude) > 90) {
      errors.push("Latitudine deve essere tra -90 e +90");
    }

    if (longitude === undefined || longitude === null || longitude === "") {
      errors.push("Longitudine obbligatoria");
    } else if (!isFinite(Number(longitude))) {
      errors.push("Longitudine non valida");
    } else if (Number(longitude) < -180 || Number(longitude) > 180) {
      errors.push("Longitudine deve essere tra -180 e +180");
    }

    return { isValid: errors.length === 0, errors };
  },

  /**
   * Valida il codice seriale
   * @param {string} serialCode - Codice seriale
   * @returns {Object} { isValid, errors }
   */
  validateSerialCode(serialCode) {
    const errors = [];

    if (serialCode) {
      if (serialCode.length !== 10) {
        errors.push("Il codice seriale deve essere di 10 caratteri");
      }
      if (!/^[A-Z0-9]+$/.test(serialCode)) {
        errors.push("Il codice seriale deve contenere solo lettere maiuscole (A-Z) e numeri (0-9)");
      }
    }

    return { isValid: errors.length === 0, errors };
  },

  /**
   * Calcola coordinate relative in metri rispetto a un punto di riferimento
   * @param {number} lat - Latitudine del totem
   * @param {number} lng - Longitudine del totem
   * @param {number} refLat - Latitudine di riferimento
   * @param {number} refLng - Longitudine di riferimento
   * @returns {Object} Coordinate relative {rel_x, rel_y}
   */
  calculateRelativePosition(lat, lng, refLat, refLng) {
    const lat0 = Number(refLat);
    const lng0 = Number(refLng);

    if (!isFinite(lat0) || !isFinite(lng0)) {
      return { rel_x: null, rel_y: null };
    }

    const dLat = (lat - lat0) * (Math.PI / 180);
    const dLng = (lng - lng0) * (Math.PI / 180);
    const R = 6371000; // Raggio Terra in metri
    const meanLat = ((lat + lat0) / 2) * (Math.PI / 180);
    const rel_x = R * dLng * Math.cos(meanLat);
    const rel_y = R * dLat;

    return { rel_x, rel_y };
  }
};

export default totemsApi;
