import apiClient, { API } from "./axiosInstance";

/**
 * API per la gestione degli oggetti 3D dell'ambiente (env_objects)
 */
const envObjectsApi = {
  /**
   * Crea un nuovo oggetto 3D disponibile
   * @param {Object} envObjectData - Dati dell'oggetto
   * @param {string} envObjectData.name - Nome dell'oggetto
   * @param {string} envObjectData.file_url - URL del file (opzionale)
   * @param {string} envObjectData.environment_id - ID dell'ambiente
   * @returns {Promise<Object>} Oggetto creato con ID
   */
  async createEnvObject(envObjectData) {
    try {
      const response = await apiClient.post(
        `${API}/api/env_objects`,
        envObjectData      );
      return response.data;
    } catch (error) {
      console.error("Errore nella creazione dell'env_object:", error);
      throw new Error(
        error.response?.data?.message || "Errore nella creazione dell'oggetto 3D"
      );
    }
  },

  /**
   * Aggiorna un oggetto 3D esistente
   * @param {string} envObjectId - ID dell'oggetto
   * @param {Object} envObjectData - Dati da aggiornare
   * @returns {Promise<Object>} Oggetto aggiornato
   */
  async updateEnvObject(envObjectId, envObjectData) {
    try {
      const response = await apiClient.put(
        `${API}/api/env_objects/${envObjectId}`,
        envObjectData      );
      return response.data;
    } catch (error) {
      console.error("Errore nell'aggiornamento dell'env_object:", error);
      throw new Error(
        error.response?.data?.message || "Errore nell'aggiornamento dell'oggetto 3D"
      );
    }
  },

  /**
   * Recupera la lista degli oggetti 3D
   * @param {string} environmentId - ID dell'ambiente (opzionale per filtrare)
   * @returns {Promise<Array>} Lista degli oggetti 3D
   */
  async listEnvObjects(environmentId = null) {
    try {
      const response = await apiClient.get(
        `${API}/api/env_objects`      );
      
      // Filtra per environment_id se specificato
      if (environmentId) {
        return response.data.filter(obj => obj.environment_id == environmentId);
      }
      
      return response.data;
    } catch (error) {
      console.error("Errore nel recupero degli env_objects:", error);
      throw new Error(
        error.response?.data?.message || "Errore nel recupero degli oggetti 3D"
      );
    }
  },

  /**
   * Elimina un oggetto 3D
   * @param {string} envObjectId - ID dell'oggetto
   * @returns {Promise<void>}
   */
  async deleteEnvObject(envObjectId) {
    try {
      await apiClient.delete(
        `${API}/api/env_objects/${envObjectId}`      );
    } catch (error) {
      console.error("Errore nell'eliminazione dell'env_object:", error);
      throw new Error(
        error.response?.data?.message || "Errore nell'eliminazione dell'oggetto 3D"
      );
    }
  },

  /**
   * Carica un file 3D per un oggetto esistente
   * @param {string} envObjectId - ID dell'oggetto
   * @param {File} file - File da caricare
   * @returns {Promise<Object>} Risposta del server
   */
  async uploadFile(envObjectId, file) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await apiClient.post(
        `${API}/api/env_objects/upload/${envObjectId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error("Errore nel caricamento del file:", error);
      throw new Error(
        error.response?.data?.message || "Errore nel caricamento del file 3D"
      );
    }
  },

  /**
   * Scarica un file 3D
   * @param {string} envObjectId - ID dell'oggetto
   * @returns {Promise<Blob>} File blob per la visualizzazione
   */
  async downloadFile(envObjectId) {
    try {
      const response = await apiClient.get(
        `${API}/api/env_objects/download/${envObjectId}`,
        {
          responseType: "blob"
        }
      );
      return response.data;
    } catch (error) {
      console.error("Errore nel download del file:", error);
      throw new Error(
        error.response?.data?.message || "Errore nel download del file 3D"
      );
    }
  },

  /**
   * Ottiene l'URL di download per un oggetto 3D
   * @param {string} envObjectId - ID dell'oggetto
   * @returns {string} URL di download
   */
  getDownloadUrl(envObjectId) {
    return `${API}/api/env_objects/download/${envObjectId}`;
  },

  /**
   * Crea un URL blob temporaneo per la preview del modello
   * @param {string} envObjectId - ID dell'oggetto
   * @returns {Promise<string>} URL blob temporaneo
   */
  async createPreviewUrl(envObjectId) {
    try {
      const blob = await this.downloadFile(envObjectId);
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error("Errore nella creazione dell'URL di preview:", error);
      return null;
    }
  },

  // ===================================================================
  // METODI PER OGGETTI POSIZIONATI SULLA MAPPA (objects table)
  // ===================================================================

  /**
   * Recupera la lista degli oggetti 3D posizionati su una mappa
   * @param {string} environmentId - ID dell'ambiente
   * @returns {Promise<Array>} Lista degli oggetti posizionati sulla mappa
   */
  async listMapObjects(environmentId) {
    try {
      const response = await apiClient.get(
        `${API}/api/objects/environment/${environmentId}`      );
      return response.data;
    } catch (error) {
      console.error("Errore nel recupero degli oggetti posizionati:", error);
      throw new Error(
        error.response?.data?.message || "Errore nel recupero degli oggetti posizionati sulla mappa"
      );
    }
  },

  /**
   * Aggiunge un oggetto 3D sulla mappa (objects table)
   * @param {Object} objectData - Dati dell'oggetto sulla mappa
   * @param {string} objectData.name - Nome dell'oggetto
   * @param {string} objectData.environment_id - ID dell'ambiente
   * @param {string} objectData.env_object_id - ID dell'env_object di riferimento
   * @param {number} objectData.pos_x - Posizione X (longitudine)
   * @param {number} objectData.pos_y - Posizione Y (latitudine)
   * @param {number} objectData.pos_z - Posizione Z (altezza)
   * @param {number} objectData.rotation_x - Rotazione X
   * @param {number} objectData.rotation_y - Rotazione Y
   * @param {number} objectData.rotation_z - Rotazione Z
   * @param {number} objectData.scale_x - Scala X
   * @param {number} objectData.scale_y - Scala Y
   * @param {number} objectData.scale_z - Scala Z
   * @returns {Promise<Object>} Oggetto creato sulla mappa
   */
  async addObjectToMap(objectData) {
    try {
      const response = await apiClient.post(
        `${API}/api/objects/add`,
        {
          name: objectData.name,
          file_url: "", // Gestito tramite env_object_id
          environment_id: objectData.environment_id,
          env_object_id: objectData.env_object_id,
          pos_x: objectData.pos_x,
          pos_y: objectData.pos_y,
          pos_z: objectData.pos_z,
          rotation_x: objectData.rotation_x,
          rotation_y: objectData.rotation_y,
          rotation_z: objectData.rotation_z,
          scale_x: objectData.scale_x,
          scale_y: objectData.scale_y,
          scale_z: objectData.scale_z
        }      );
      return response.data;
    } catch (error) {
      console.error("Errore nell'aggiunta dell'oggetto sulla mappa:", error);
      throw new Error(
        error.response?.data?.message || "Errore nell'aggiunta dell'oggetto sulla mappa"
      );
    }
  },

  /**
   * Aggiorna un oggetto sulla mappa
   * @param {string} objectId - ID dell'oggetto sulla mappa
   * @param {Object} objectData - Dati da aggiornare
   * @returns {Promise<Object>} Oggetto aggiornato
   */
  async updateMapObject(objectId, objectData) {
    try {
      const response = await apiClient.put(
        `${API}/api/objects/update/${objectId}`,
        objectData      );
      return response.data;
    } catch (error) {
      console.error("Errore nell'aggiornamento dell'oggetto sulla mappa:", error);
      throw new Error(
        error.response?.data?.message || "Errore nell'aggiornamento dell'oggetto sulla mappa"
      );
    }
  },

  /**
   * Elimina un oggetto dalla mappa
   * @param {string} objectId - ID dell'oggetto sulla mappa
   * @returns {Promise<void>}
   */
  async removeObjectFromMap(objectId) {
    try {
      await apiClient.delete(
        `${API}/api/objects/delete/${objectId}`      );
    } catch (error) {
      console.error("Errore nella rimozione dell'oggetto dalla mappa:", error);
      throw new Error(
        error.response?.data?.message || "Errore nella rimozione dell'oggetto dalla mappa"
      );
    }
  },

  /**
   * Valida i dati di un env_object
   * @param {Object} envObjectData - Dati da validare
   * @returns {Object} Risultato validazione {isValid, errors}
   */
  validateEnvObjectData(envObjectData) {
    const errors = [];
    
    if (!envObjectData.name || envObjectData.name.trim().length === 0) {
      errors.push("Il nome dell'oggetto 3D è obbligatorio");
    }
    
    if (!envObjectData.environment_id) {
      errors.push("L'ID dell'ambiente è obbligatorio");
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Valida i dati di un oggetto sulla mappa
   * @param {Object} objectData - Dati da validare
   * @returns {Object} Risultato validazione {isValid, errors}
   */
  validateMapObjectData(objectData) {
    const errors = [];
    
    if (!objectData.name || objectData.name.trim().length === 0) {
      errors.push("Il nome dell'oggetto è obbligatorio");
    }
    
    if (!objectData.environment_id) {
      errors.push("L'ID dell'ambiente è obbligatorio");
    }
    
    if (!objectData.env_object_id) {
      errors.push("Seleziona un oggetto 3D disponibile");
    }
    
    // Validazione coordinate
    const numericFields = ['pos_x', 'pos_y', 'pos_z', 'rotation_x', 'rotation_y', 'rotation_z', 'scale_x', 'scale_y', 'scale_z'];
    for (const field of numericFields) {
      if (objectData[field] !== 0 && (!objectData[field] || !isFinite(Number(objectData[field])))) {
        errors.push(`Il campo ${field} deve essere un numero valido`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Verifica se un file è un modello 3D supportato
   * @param {File} file - File da verificare
   * @returns {Object} Risultato verifica {isValid, message}
   */
  validateModelFile(file) {
    if (!file) {
      return { isValid: false, message: "Nessun file selezionato" };
    }
    
    const supportedExtensions = ['.glb', '.gltf', '.obj', '.fbx'];
    const fileName = file.name.toLowerCase();
    const isSupported = supportedExtensions.some(ext => fileName.endsWith(ext));
    
    if (!isSupported) {
      return {
        isValid: false,
        message: `Formato file non supportato. Formati supportati: ${supportedExtensions.join(', ')}`
      };
    }
    
    // Limite dimensione file (es. 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      return {
        isValid: false,
        message: "Il file è troppo grande. Dimensione massima: 50MB"
      };
    }
    
    return { isValid: true, message: "File valido" };
  }
};

export default envObjectsApi;