import apiClient, { API } from "./axiosInstance";

/**
 * API per la gestione dei percorsi turistici e delle tappe
 */
const routesApi = {
  /**
   * Crea un nuovo percorso per un ambiente
   * @param {Object} routeData - Dati del percorso
   * @param {string} routeData.environment_id - ID dell'ambiente
   * @param {string} routeData.name - Nome del percorso (opzionale)
   * @param {string} routeData.description - Descrizione del percorso (opzionale)
   * @returns {Promise<Object>} Percorso creato
   */
  async createRoute(routeData) {
    try {
      const response = await apiClient.post(
        `${API}/api/tour_routes`,
        {
          environment_id: routeData.environment_id,
          name: routeData.name || `Percorso ${new Date().toLocaleDateString()}`,
          description: routeData.description || null
        }      );
      return response.data;
    } catch (error) {
      console.error("Errore nella creazione del percorso:", error);
      throw new Error(
        error.response?.data?.message || "Errore nella creazione del percorso"
      );
    }
  },

  /**
   * Recupera i percorsi per un ambiente
   * @param {string} environmentId - ID dell'ambiente
   * @returns {Promise<Array>} Lista dei percorsi
   */
  async getRoutesByEnvironment(environmentId) {
    try {
      const response = await apiClient.get(
        `${API}/api/tour_routes`,
        {
          params: { environment_id: environmentId }
        }
      );
      return response.data;
    } catch (error) {
      console.error("Errore nel recupero dei percorsi:", error);
      throw new Error(
        error.response?.data?.message || "Errore nel recupero dei percorsi"
      );
    }
  },

  /**
   * Aggiorna un percorso
   * @param {string} routeId - ID del percorso
   * @param {Object} routeData - Dati da aggiornare
   * @returns {Promise<Object>} Percorso aggiornato
   */
  async updateRoute(routeId, routeData) {
    try {
      const response = await apiClient.put(
        `${API}/api/tour_routes/${routeId}`,
        routeData      );
      return response.data;
    } catch (error) {
      console.error("Errore nell'aggiornamento del percorso:", error);
      throw new Error(
        error.response?.data?.message || "Errore nell'aggiornamento del percorso"
      );
    }
  },

  /**
   * Elimina un percorso
   * @param {string} routeId - ID del percorso
   * @returns {Promise<void>}
   */
  async deleteRoute(routeId) {
    try {
      await apiClient.delete(
        `${API}/api/tour_routes/${routeId}`      );
    } catch (error) {
      console.error("Errore nell'eliminazione del percorso:", error);
      throw new Error(
        error.response?.data?.message || "Errore nell'eliminazione del percorso"
      );
    }
  },

  /**
   * Assicura che esista un percorso per l'ambiente, creandolo se necessario
   * @param {string} environmentId - ID dell'ambiente
   * @returns {Promise<Object>} Percorso esistente o creato
   */
  async ensureRouteExists(environmentId) {
    try {
      const routes = await this.getRoutesByEnvironment(environmentId);
      
      if (routes && routes.length > 0) {
        return routes[0];
      }
      
      // Crea un nuovo percorso se non esiste
      return await this.createRoute({
        environment_id: environmentId,
        name: "Percorso Principale",
        description: "Percorso generato automaticamente"
      });
    } catch (error) {
      console.error("Errore nell'assicurare l'esistenza del percorso:", error);
      throw error;
    }
  },

  // ================================
  // GESTIONE TAPPE
  // ================================

  /**
   * Crea una nuova tappa
   * @param {string} routeId - ID del percorso
   * @param {Object} stopData - Dati della tappa
   * @param {string} stopData.label - Nome della tappa
   * @param {string} stopData.description - Descrizione (opzionale)
   * @param {number} stopData.latitude - Latitudine
   * @param {number} stopData.longitude - Longitudine
   * @param {number} stopData.rel_x - Posizione relativa X in metri
   * @param {number} stopData.rel_y - Posizione relativa Y in metri
   * @param {number} stopData.rel_z - Posizione relativa Z in metri (opzionale)
   * @param {string} stopData.extra_media_url - URL media aggiuntivo (opzionale)
   * @returns {Promise<Object>} Tappa creata
   */
  async createStop(routeId, stopData) {
    try {
      const response = await apiClient.post(
        `${API}/api/tour_routes/${routeId}/stops`,
        {
          label: stopData.label,
          description: stopData.description || null,
          latitude: stopData.latitude,
          longitude: stopData.longitude,
          rel_x: stopData.rel_x,
          rel_y: stopData.rel_y,
          rel_z: stopData.rel_z || null,
          extra_media_url: stopData.extra_media_url || null
        }      );
      return response.data;
    } catch (error) {
      console.error("Errore nella creazione della tappa:", error);
      throw new Error(
        error.response?.data?.message || "Errore nella creazione della tappa"
      );
    }
  },

  /**
   * Recupera le tappe di un percorso
   * @param {string} routeId - ID del percorso
   * @returns {Promise<Array>} Lista delle tappe ordinate per posizione
   */
  async getStops(routeId) {
    try {
      const response = await apiClient.get(
        `${API}/api/tour_routes/${routeId}/stops`      );
      
      // Ordina per posizione
      return response.data.sort((a, b) => (a.position || 0) - (b.position || 0));
    } catch (error) {
      console.error("Errore nel recupero delle tappe:", error);
      throw new Error(
        error.response?.data?.message || "Errore nel recupero delle tappe"
      );
    }
  },

  /**
   * Recupera i dettagli di una tappa con i media associati
   * @param {string} routeId - ID del percorso
   * @param {string} stopId - ID della tappa
   * @returns {Promise<Object>} Dettagli della tappa con media
   */
  async getStopDetails(routeId, stopId) {
    try {
      const response = await apiClient.get(
        `${API}/api/tour_routes/${routeId}/stops/${stopId}`      );
      return response.data;
    } catch (error) {
      console.error("Errore nel recupero dei dettagli della tappa:", error);
      throw new Error(
        error.response?.data?.message || "Errore nel recupero dei dettagli della tappa"
      );
    }
  },

  /**
   * Aggiorna una tappa
   * @param {string} routeId - ID del percorso
   * @param {string} stopId - ID della tappa
   * @param {Object} stopData - Dati da aggiornare
   * @returns {Promise<Object>} Tappa aggiornata
   */
  async updateStop(routeId, stopId, stopData) {
    try {
      const response = await apiClient.put(
        `${API}/api/tour_routes/${routeId}/stops/${stopId}`,
        stopData      );
      return response.data;
    } catch (error) {
      console.error("Errore nell'aggiornamento della tappa:", error);
      throw new Error(
        error.response?.data?.message || "Errore nell'aggiornamento della tappa"
      );
    }
  },

  /**
   * Elimina una tappa
   * @param {string} routeId - ID del percorso
   * @param {string} stopId - ID della tappa
   * @returns {Promise<void>}
   */
  async deleteStop(routeId, stopId) {
    try {
      await apiClient.delete(
        `${API}/api/tour_routes/${routeId}/stops/${stopId}`      );
    } catch (error) {
      console.error("Errore nell'eliminazione della tappa:", error);
      throw new Error(
        error.response?.data?.message || "Errore nell'eliminazione della tappa"
      );
    }
  },

  /**
   * Riordina le tappe aggiornando le posizioni
   * @param {string} routeId - ID del percorso
   * @param {Array} orderedStops - Array di tappe nell'ordine desiderato
   * @returns {Promise<void>}
   */
  async reorderStops(routeId, orderedStops) {
    try {
      const updatePromises = orderedStops.map((stop, index) =>
        this.updateStop(routeId, stop.id, { position: index + 1 })
      );
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error("Errore nel riordino delle tappe:", error);
      throw new Error(
        error.response?.data?.message || "Errore nel riordino delle tappe"
      );
    }
  },

  // ================================
  // GESTIONE MEDIA TAPPE
  // ================================

  /**
   * Aggiunge un media a una tappa
   * @param {string} routeId - ID del percorso
   * @param {string} stopId - ID della tappa
   * @param {Object} mediaData - Dati del media
   * @param {string} mediaData.type - Tipo media (image, video, url, other)
   * @param {string} mediaData.title - Titolo del media (opzionale)
   * @param {string} mediaData.url - URL del media
   * @returns {Promise<Object>} Media creato
   */
  async addStopMedia(routeId, stopId, mediaData) {
    try {
      const response = await apiClient.post(
        `${API}/api/tour_routes/${routeId}/stops/${stopId}/media`,
        {
          type: mediaData.type,
          title: mediaData.title || null,
          url: mediaData.url
        }      );
      return response.data;
    } catch (error) {
      console.error("Errore nell'aggiunta del media alla tappa:", error);
      throw new Error(
        error.response?.data?.message || "Errore nell'aggiunta del media"
      );
    }
  },

  /**
   * Aggiorna un media di una tappa
   * @param {string} routeId - ID del percorso
   * @param {string} stopId - ID della tappa
   * @param {string} mediaId - ID del media
   * @param {Object} mediaData - Dati da aggiornare
   * @returns {Promise<Object>} Media aggiornato
   */
  async updateStopMedia(routeId, stopId, mediaId, mediaData) {
    try {
      const response = await apiClient.put(
        `${API}/api/tour_routes/${routeId}/stops/${stopId}/media/${mediaId}`,
        mediaData      );
      return response.data;
    } catch (error) {
      console.error("Errore nell'aggiornamento del media:", error);
      throw new Error(
        error.response?.data?.message || "Errore nell'aggiornamento del media"
      );
    }
  },

  /**
   * Elimina un media di una tappa
   * @param {string} routeId - ID del percorso
   * @param {string} stopId - ID della tappa
   * @param {string} mediaId - ID del media
   * @returns {Promise<void>}
   */
  async deleteStopMedia(routeId, stopId, mediaId) {
    try {
      await apiClient.delete(
        `${API}/api/tour_routes/${routeId}/stops/${stopId}/media/${mediaId}`      );
    } catch (error) {
      console.error("Errore nell'eliminazione del media:", error);
      throw new Error(
        error.response?.data?.message || "Errore nell'eliminazione del media"
      );
    }
  },

  // ================================
  // UTILITY E VALIDAZIONE
  // ================================

  /**
   * Valida i dati di una tappa
   * @param {Object} stopData - Dati da validare
   * @returns {Object} Risultato validazione {isValid, errors}
   */
  validateStopData(stopData) {
    const errors = [];
    
    if (!stopData.label || stopData.label.trim().length === 0) {
      errors.push("Il nome della tappa è obbligatorio");
    }
    
    if (!stopData.latitude || !isFinite(Number(stopData.latitude))) {
      errors.push("Latitudine non valida");
    }
    
    if (!stopData.longitude || !isFinite(Number(stopData.longitude))) {
      errors.push("Longitudine non valida");
    }
    
    if (stopData.rel_x !== null && !isFinite(Number(stopData.rel_x))) {
      errors.push("Posizione relativa X non valida");
    }
    
    if (stopData.rel_y !== null && !isFinite(Number(stopData.rel_y))) {
      errors.push("Posizione relativa Y non valida");
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Valida i dati di un media
   * @param {Object} mediaData - Dati da validare
   * @returns {Object} Risultato validazione {isValid, errors}
   */
  validateMediaData(mediaData) {
    const errors = [];
    const validTypes = ['image', 'video', 'url', 'other'];
    
    if (!mediaData.type || !validTypes.includes(mediaData.type)) {
      errors.push("Tipo di media non valido");
    }
    
    if (!mediaData.url || mediaData.url.trim().length === 0) {
      errors.push("URL del media è obbligatorio");
    }
    
    // Validazione specifica per video YouTube
    if (mediaData.type === 'video') {
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
      if (!youtubeRegex.test(mediaData.url)) {
        errors.push("Per i video sono supportati solo URL YouTube");
      }
    }
    
    // Validazione URL generale
    try {
      new URL(mediaData.url);
    } catch {
      errors.push("URL non valido");
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Estrae l'ID di un video YouTube dall'URL
   * @param {string} url - URL YouTube
   * @returns {string|null} ID del video o null se non valido
   */
  extractYouTubeVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  },

  /**
   * Verifica se un URL è di YouTube
   * @param {string} url - URL da verificare
   * @returns {boolean} True se è un URL YouTube valido
   */
  isValidYouTubeUrl(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  }
};

export default routesApi;