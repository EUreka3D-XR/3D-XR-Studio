import apiClient, { API } from "./axiosInstance";

/**
 * API per la gestione dei Punti di Interesse (POI)
 */
const poisApi = {
  /**
   * Crea un nuovo POI
   * @param {Object} poiData - Dati del POI
   * @param {string} poiData.environment_id - ID dell'ambiente
   * @param {string} poiData.label - Nome del POI
   * @param {number} poiData.latitude - Latitudine
   * @param {number} poiData.longitude - Longitudine
   * @param {number} poiData.rel_x - Posizione relativa X in metri
   * @param {number} poiData.rel_y - Posizione relativa Y in metri
   * @param {string} poiData.description - Descrizione (opzionale)
   * @param {string} poiData.extra_media_url - URL media aggiuntivo (opzionale)
   * @returns {Promise<Object>} POI creato
   */
  async createPoi(poiData) {
    try {
      const response = await apiClient.post(
        `${API}/api/env_pois`,
        {
          environmentId: poiData.environment_id,
          label: poiData.label,
          latitude: poiData.latitude,
          longitude: poiData.longitude,
          rel_x: poiData.rel_x,
          rel_y: poiData.rel_y,
          description: poiData.description || null,
          extra_media_url: poiData.extra_media_url || null
        }      );
      return response.data;
    } catch (error) {
      console.error("Errore nella creazione del POI:", error);
      throw new Error(
        error.response?.data?.message || "Errore nella creazione del POI"
      );
    }
  },

  /**
   * Recupera la lista dei POI per un ambiente
   * @param {string} environmentId - ID dell'ambiente
   * @returns {Promise<Array>} Lista dei POI
   */
  async listPois(environmentId) {
    try {
      const response = await apiClient.get(
        `${API}/api/env_pois`,
        {
          params: { environment_id: environmentId }
        }
      );
      return response.data;
    } catch (error) {
      console.error("Errore nel recupero dei POI:", error);
      throw new Error(
        error.response?.data?.message || "Errore nel recupero dei POI"
      );
    }
  },

  /**
   * Recupera la lista dei POI con il conteggio dei media associati
   * @param {string} environmentId - ID dell'ambiente
   * @returns {Promise<Array>} Lista dei POI con media_count
   */
  async listPoisWithMediaCount(environmentId) {
    try {
      const response = await apiClient.get(
        `${API}/api/env_pois/with-media-count`,
        {
          params: { environment_id: environmentId }
        }
      );
      return response.data;
    } catch (error) {
      console.error("Errore nel recupero dei POI con conteggio media:", error);
      // Fallback: usa listPois normale e aggiungi media_count = 0
      try {
        const pois = await this.listPois(environmentId);
        return pois.map(poi => ({ ...poi, media_count: 0 }));
      } catch (fallbackError) {
        throw new Error(
          error.response?.data?.message || "Errore nel recupero dei POI"
        );
      }
    }
  },

  /**
   * Recupera i dettagli di un POI con i media associati
   * @param {string} poiId - ID del POI
   * @returns {Promise<Object>} Dettagli del POI con media
   */
  async getPoiDetails(poiId) {
    try {
      const response = await apiClient.get(
        `${API}/api/env_pois/${poiId}`      );
      return response.data;
    } catch (error) {
      console.error("Errore nel recupero dei dettagli del POI:", error);
      throw new Error(
        error.response?.data?.message || "Errore nel recupero dei dettagli del POI"
      );
    }
  },

  /**
   * Aggiorna un POI
   * @param {string} poiId - ID del POI
   * @param {Object} poiData - Dati da aggiornare
   * @returns {Promise<Object>} POI aggiornato
   */
  async updatePoi(poiId, poiData) {
    try {
      const response = await apiClient.put(
        `${API}/api/env_pois/${poiId}`,
        poiData      );
      return response.data;
    } catch (error) {
      console.error("Errore nell'aggiornamento del POI:", error);
      throw new Error(
        error.response?.data?.message || "Errore nell'aggiornamento del POI"
      );
    }
  },

  /**
   * Elimina un POI
   * @param {string} poiId - ID del POI
   * @returns {Promise<void>}
   */
  async deletePoi(poiId) {
    try {
      await apiClient.delete(
        `${API}/api/env_pois/${poiId}`      );
    } catch (error) {
      console.error("Errore nell'eliminazione del POI:", error);
      throw new Error(
        error.response?.data?.message || "Errore nell'eliminazione del POI"
      );
    }
  },

  // ================================
  // GESTIONE MEDIA POI
  // ================================

  /**
   * Recupera la lista dei media di un POI
   * @param {string} poiId - ID del POI
   * @returns {Promise<Array>} Lista dei media del POI
   */
  async listPoiMedia(poiId) {
    try {
      const response = await apiClient.get(
        `${API}/api/env_pois/${poiId}/media`      );
      return response.data;
    } catch (error) {
      console.error("Errore nel recupero dei media del POI:", error);
      throw new Error(
        error.response?.data?.message || "Errore nel recupero dei media del POI"
      );
    }
  },

/**
 * Aggiunge un media a un POI
 * @param {string} poiId - ID del POI
 * @param {Object} mediaData - Dati del media
 * @param {string} mediaData.type - Tipo media (image, video, url, other, audio)
 * @param {string} mediaData.title - Titolo del media (opzionale)
 * @param {string} mediaData.url - URL del media (opzionale, obbligatorio se non c'è file)
 * @param {string} mediaData.lang - Codice lingua (opzionale, max 5 caratteri)
 * @param {string} mediaData.content - Contenuto testuale (opzionale)
 * @param {File} file - File da caricare (opzionale, solo per type='image' o 'audio')
 * @returns {Promise<Object>} Media creato
 */
async createPoiMedia(poiId, mediaData, file = null, onUploadProgress = null) {
  try {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', mediaData.type);
      if (mediaData.title) formData.append('title', mediaData.title);
      if (mediaData.url) formData.append('url', mediaData.url);
      if (mediaData.lang) formData.append('lang', mediaData.lang);
      if (mediaData.content) formData.append('content', mediaData.content);

      const response = await apiClient.post(
        `${API}/api/env_pois/${poiId}/media`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: onUploadProgress ? (progressEvent) => {
            const percentCompleted = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            onUploadProgress(percentCompleted, progressEvent);
          } : undefined
        }
      );
      return response.data;
    } else {
      // Altrimenti usa JSON normale
      const response = await apiClient.post(
        `${API}/api/env_pois/${poiId}/media`,
        {
          type: mediaData.type,
          title: mediaData.title || null,
          url: mediaData.url || null,
          lang: mediaData.lang || null,
          content: mediaData.content || null
        }      );
      return response.data;
    }
  } catch (error) {
    console.error("Errore nell'aggiunta del media al POI:", error);
    throw new Error(
      error.response?.data?.message || "Errore nell'aggiunta del media al POI"
    );
  }
},

/**
 * Aggiorna un media di un POI
 * @param {string} mediaId - ID del media
 * @param {Object} mediaData - Dati da aggiornare
 * @param {string} mediaData.type - Tipo media (image, video, url, other, audio) (opzionale)
 * @param {string} mediaData.title - Titolo del media (opzionale)
 * @param {string} mediaData.url - URL del media (opzionale)
 * @param {string} mediaData.lang - Codice lingua (opzionale, max 5 caratteri)
 * @param {string} mediaData.content - Contenuto testuale (opzionale)
 * @param {File} file - File da caricare (opzionale, solo per type='image' o 'audio')
 * @returns {Promise<Object>} Media aggiornato
 */
async updatePoiMedia(mediaId, mediaData, file = null, onUploadProgress = null) {
  try {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      if (mediaData.type) formData.append('type', mediaData.type);
      if (mediaData.title !== undefined) formData.append('title', mediaData.title || '');
      if (mediaData.url) formData.append('url', mediaData.url);
      if (mediaData.lang !== undefined) formData.append('lang', mediaData.lang || '');
      if (mediaData.content !== undefined) formData.append('content', mediaData.content || '');

      const response = await apiClient.put(
        `${API}/api/env_pois/media/${mediaId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: onUploadProgress ? (progressEvent) => {
            const percentCompleted = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            onUploadProgress(percentCompleted, progressEvent);
          } : undefined
        }
      );
      return response.data;
    } else {
      // Altrimenti usa JSON normale (solo campi definiti)
      const updatePayload = {};
      if (mediaData.type !== undefined) updatePayload.type = mediaData.type;
      if (mediaData.title !== undefined) updatePayload.title = mediaData.title || null;
      if (mediaData.url !== undefined) updatePayload.url = mediaData.url || null;
      if (mediaData.lang !== undefined) updatePayload.lang = mediaData.lang || null;
      if (mediaData.content !== undefined) updatePayload.content = mediaData.content || null;

      const response = await apiClient.put(
        `${API}/api/env_pois/media/${mediaId}`,
        updatePayload      );
      return response.data;
    }
  } catch (error) {
    console.error("Errore nell'aggiornamento del media del POI:", error);
    throw new Error(
      error.response?.data?.message || "Errore nell'aggiornamento del media"
    );
  }
},

/**
 * Elimina un media di un POI
 * @param {string} mediaId - ID del media
 * @returns {Promise<void>}
 */
async deletePoiMedia(mediaId) {
  try {
    await apiClient.delete(
      `${API}/api/env_pois/media/${mediaId}`
    );
  } catch (error) {
    console.error("Errore nell'eliminazione del media del POI:", error);
    throw new Error(
      error.response?.data?.message || "Errore nell'eliminazione del media"
    );
  }
},

  // ================================
  // GESTIONE TRADUZIONI POI
  // ================================

  /**
   * Recupera tutte le traduzioni di un POI
   * @param {string} poiId - ID del POI
   * @returns {Promise<Array>} Lista delle traduzioni
   */
  async listPoiTranslations(poiId) {
    try {
      const response = await apiClient.get(
        `${API}/api/env_pois/${poiId}/translations`
      );
      return response.data;
    } catch (error) {
      console.error("Errore nel recupero delle traduzioni del POI:", error);
      throw new Error(
        error.response?.data?.message || "Errore nel recupero delle traduzioni"
      );
    }
  },

  /**
   * Recupera la traduzione di un POI per una lingua specifica
   * @param {string} poiId - ID del POI
   * @param {string} lang - Codice lingua (en, it, es, ca)
   * @returns {Promise<Object|null>} Traduzione o null se non esiste
   */
  async getPoiTranslation(poiId, lang) {
    try {
      const response = await apiClient.get(
        `${API}/api/env_pois/${poiId}/translations/${lang}`
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error("Errore nel recupero della traduzione:", error);
      throw new Error(
        error.response?.data?.message || "Errore nel recupero della traduzione"
      );
    }
  },

  /**
   * Crea o aggiorna una traduzione per un POI (upsert)
   * @param {string} poiId - ID del POI
   * @param {string} lang - Codice lingua
   * @param {Object} translationData - Dati della traduzione
   * @param {string} translationData.label - Nome tradotto
   * @param {string} translationData.description - Descrizione tradotta
   * @returns {Promise<Object>} Traduzione salvata
   */
  async savePoiTranslation(poiId, lang, translationData) {
    try {
      const response = await apiClient.put(
        `${API}/api/env_pois/${poiId}/translations/${lang}`,
        {
          label: translationData.label || null,
          description: translationData.description || null
        }
      );
      return response.data;
    } catch (error) {
      console.error("Errore nel salvataggio della traduzione:", error);
      throw new Error(
        error.response?.data?.message || "Errore nel salvataggio della traduzione"
      );
    }
  },

  /**
   * Elimina una traduzione
   * @param {string} translationId - ID della traduzione
   * @returns {Promise<void>}
   */
  async deletePoiTranslation(translationId) {
    try {
      await apiClient.delete(
        `${API}/api/env_pois/translations/${translationId}`
      );
    } catch (error) {
      console.error("Errore nell'eliminazione della traduzione:", error);
      throw new Error(
        error.response?.data?.message || "Errore nell'eliminazione della traduzione"
      );
    }
  },

  // ================================
  // UTILITY E VALIDAZIONE
  // ================================

  /**
   * Valida i dati di un POI
   * @param {Object} poiData - Dati da validare
   * @returns {Object} Risultato validazione {isValid, errors}
   */
  validatePoiData(poiData) {
    const errors = [];
    
    if (!poiData.environment_id) {
      errors.push("L'ID dell'ambiente è obbligatorio");
    }
    
    if (!poiData.label || poiData.label.trim().length === 0) {
      errors.push("Il nome del POI è obbligatorio");
    }
    
    if (!poiData.latitude || !isFinite(Number(poiData.latitude))) {
      errors.push("Latitudine non valida");
    }
    
    if (!poiData.longitude || !isFinite(Number(poiData.longitude))) {
      errors.push("Longitudine non valida");
    }
    
    if (poiData.rel_x !== null && !isFinite(Number(poiData.rel_x))) {
      errors.push("Posizione relativa X non valida");
    }
    
    if (poiData.rel_y !== null && !isFinite(Number(poiData.rel_y))) {
      errors.push("Posizione relativa Y non valida");
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

 /**
 * Valida i dati di un media POI
 * @param {Object} mediaData - Dati da validare
 * @param {File} file - File opzionale da caricare
 * @returns {Object} Risultato validazione {isValid, errors}
 */
validatePoiMediaData(mediaData, file = null) {
  const errors = [];
  const validTypes = ['image', 'video', 'url', 'text', 'audio'];
  
  // Validazione tipo
  if (!mediaData.type || !validTypes.includes(mediaData.type)) {
    errors.push("Tipo di media non valido");
  }
  
  // Validazione URL o File
  const hasUrl = mediaData.url && mediaData.url.trim().length > 0;
  const hasFile = file !== null && file !== undefined;

  // Per image, audio e video: deve esserci URL o File
  if (mediaData.type === 'image' || mediaData.type === 'audio' || mediaData.type === 'video') {
    if (!hasUrl && !hasFile) {
      errors.push(`Per ${mediaData.type} è necessario fornire un URL o caricare un file`);
    }
  } else if (mediaData.type !== 'text') {
    if (!hasUrl) {
      errors.push("URL del media è obbligatorio");
    }
  }

  // Validazione URL se presente
  if (hasUrl) {
    try {
      new URL(mediaData.url);
    } catch {
      errors.push("URL non valido");
    }
  }
  
  // Validazione campo lang (opzionale)
  if (mediaData.lang !== undefined && mediaData.lang !== null && mediaData.lang !== '') {
    if (typeof mediaData.lang !== 'string') {
      errors.push("Il codice lingua deve essere una stringa");
    } else if (mediaData.lang.trim().length > 5) {
      errors.push("Il codice lingua non può superare i 5 caratteri");
    }
  }
  
  // Validazione campo content (opzionale)
  if (mediaData.content !== undefined && mediaData.content !== null && mediaData.content !== '') {
    if (typeof mediaData.content !== 'string') {
      errors.push("Il contenuto deve essere una stringa");
    } else if (mediaData.content.length > 65535) {
      errors.push("Il contenuto non può superare i 65535 caratteri");
    }
  }
  
  // Validazione file (se presente)
  if (hasFile) {
    if (mediaData.type !== 'video') {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        errors.push("Il file non può superare i 10MB");
      }
    }
    
    // Validazione tipo file per immagini
    if (mediaData.type === 'image') {
      const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validImageTypes.includes(file.type)) {
        errors.push("Formato immagine non supportato (usa JPG, PNG, GIF o WebP)");
      }
    }
    
    // Validazione tipo file per audio
    if (mediaData.type === 'audio') {
      const validAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'];
      if (!validAudioTypes.includes(file.type)) {
        errors.push("Formato audio non supportato (usa MP3, WAV, OGG o WebM)");
      }
    }

    // Validazione tipo file per video
    if (mediaData.type === 'video') {
      const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
      if (!validVideoTypes.includes(file.type)) {
        errors.push("Formato video non supportato (usa MP4, WebM, OGG, MOV, AVI o MKV)");
      }
      // Per i video aumenta il limite a 100MB
      const maxVideoSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxVideoSize) {
        errors.push("Il file video non può superare i 100MB");
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
},

  /**
   * Calcola coordinate relative in metri rispetto a un punto di riferimento
   * @param {number} lat - Latitudine del POI
   * @param {number} lng - Longitudine del POI
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
    const R = 6731000; // Raggio Terra in metri
    const meanLat = ((lat + lat0) / 2) * (Math.PI / 180);
    const rel_x = R * dLng * Math.cos(meanLat);
    const rel_y = R * dLat;
    
    return { rel_x, rel_y };
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
  },

  // E per la funzione listPoisWithMediaCount, dato che l'endpoint non esiste nel backend:
async listPoisWithMediaCount(environmentId) {
  try {
    // Usa l'endpoint esistente con fallback al conteggio manuale
    const pois = await this.listPois(environmentId);
    
    // Per ogni POI, conta i media (se necessario)
    const poisWithCount = await Promise.all(
      pois.map(async (poi) => {
        try {
          const media = await this.listPoiMedia(poi.id);
          return { ...poi, media_count: media.length };
        } catch (error) {
          return { ...poi, media_count: 0 };
        }
      })
    );
    
    return poisWithCount;
  } catch (error) {
    console.error("Errore nel recupero dei POI con conteggio media:", error);
    throw new Error(
      error.response?.data?.message || "Errore nel recupero dei POI"
    );
  }
},

  /**
   * Crea i dati completi per un nuovo POI con coordinate relative calcolate
   * @param {Object} basicData - Dati base del POI
   * @param {string} basicData.environment_id - ID dell'ambiente
   * @param {string} basicData.label - Nome del POI
   * @param {number} basicData.latitude - Latitudine
   * @param {number} basicData.longitude - Longitudine
   * @param {number} refLat - Latitudine di riferimento dell'ambiente
   * @param {number} refLng - Longitudine di riferimento dell'ambiente
   * @param {string} description - Descrizione (opzionale)
   * @returns {Object} Dati POI completi con coordinate relative
   */
  createPoiDataWithRelativeCoords(basicData, refLat, refLng, description = null) {
    const { rel_x, rel_y } = this.calculateRelativePosition(
      basicData.latitude,
      basicData.longitude,
      refLat,
      refLng
    );
    
    return {
      environment_id: basicData.environment_id,
      label: basicData.label,
      latitude: basicData.latitude,
      longitude: basicData.longitude,
      rel_x,
      rel_y,
      description,
      extra_media_url: null
    };
  }
};

export default poisApi;