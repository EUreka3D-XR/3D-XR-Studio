import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Grid
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddLocationIcon from "@mui/icons-material/AddLocation";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import envObjectsApi from "../services/envObjectsApi";
import { useTranslation } from 'react-i18next';

const MapObjectManager = forwardRef(({
  environmentId,
  isCreating = false,
  envObjects = [],
  onObjectsChange, // Mantieni per compatibilitÃ 
  // AGGIUNGI queste nuove props granulari
  onSingleObjectAdd,
  onSingleObjectUpdate, 
  onSingleObjectRemove,
  onOpenPositionModal
}, ref) => {
  const { t } = useTranslation('translation');
  const [mapObjects, setMapObjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Modal di posizionamento oggetto
  const [openPositionModal, setOpenPositionModal] = useState(false);
  const [positionData, setPositionData] = useState({
    name: "",
    env_object_id: "",
    pos_x: 0,
    pos_y: 0,
    pos_z: 0,
    rotation_x: 0,
    rotation_y: 0,
    rotation_z: 0,
    scale_x: 1,
    scale_y: 1,
    scale_z: 1,
  });

  // Modal di modifica oggetto esistente
  const [editModal, setEditModal] = useState(false);
  const [selectedObjectForEdit, setSelectedObjectForEdit] = useState(null);

  // Carica oggetti posizionati all'avvio
  useEffect(() => {
    if (!isCreating && environmentId) {
      loadMapObjects();
    }
  }, [environmentId, isCreating]);

  // Notifica cambiamenti al parent
  useEffect(() => {
    if (onObjectsChange) {
      onObjectsChange(mapObjects);
    }
  }, [mapObjects, onObjectsChange]);

  // Metodi pubblici esposti tramite ref
  useImperativeHandle(ref, () => ({
  openPositionModalAtCoords: (lng, lat) => {
    setPositionData(prev => ({
      ...prev,
      pos_x: lng,
      pos_y: lat,
      pos_z: 0,
      rotation_x: 0,
      rotation_y: 0,
      rotation_z: 0,
      scale_x: 1,
      scale_y: 1,
      scale_z: 1,
      name: "",
      env_object_id: ""
    }));
    setOpenPositionModal(true);
  },
  loadMapObjects,
  // NUOVO: Metodo per caricamento granulare iniziale
  loadAndRenderInitialObjects: async () => {
    const objects = await envObjectsApi.listMapObjects(environmentId);
    setMapObjects(objects);
    
    // Carica oggetti uno per uno per rendering ottimizzato
    if (onSingleObjectAdd && objects.length > 0) {
      objects.forEach(obj => {
        setTimeout(() => onSingleObjectAdd(obj), 0); // Async per evitare blocchi
      });
    }
    
    return objects;
  }
}), [environmentId, onSingleObjectAdd, onObjectsChange]);

  const loadMapObjects = async () => {
  try {
    setLoading(true);
    setError("");
    const objects = await envObjectsApi.listMapObjects(environmentId);
    setMapObjects(objects);
    
    // RIMOSSO: Non chiamare direttamente gli handler qui
    if (onObjectsChange) {
      onObjectsChange(objects);
    }
    
  } catch (error) {
    console.error("Errore nel caricamento degli oggetti posizionati:", error);
    setError(t("mapObjectManager.errors.load"));
    setMapObjects([]);
  } finally {
    setLoading(false);
  }
};

const handlePositionObject = async () => {
  try {
    setError("");
    
    const validation = envObjectsApi.validateMapObjectData({
      ...positionData,
      environment_id: environmentId
    });
    
    if (!validation.isValid) {
      setError(validation.errors.join(", "));
      return;
    }

    setLoading(true);
    
    const apiResponse = await envObjectsApi.addObjectToMap({
      ...positionData,
      environment_id: environmentId
    });

    console.log('API addObjectToMap response:', apiResponse);

    // 🔧 FIX: L'API restituisce solo {message, objectId}, dobbiamo ricostruire l'oggetto completo
    if (!apiResponse || !apiResponse.objectId) {
      console.error('API returned invalid response:', apiResponse);
      setError("Errore: L'API non ha ritornato un ID valido");
      return;
    }

    // Ricostruisci l'oggetto completo combinando la risposta API con i dati inviati
    const envFileUrl = positionData._envObjFileUrl || envObjects.find(eo => String(eo.id) === String(positionData.env_object_id))?.file_url || '';
    console.log('[MapObjectManager] original_file_url resolved to:', envFileUrl);
    const newObject = {
      id: apiResponse.objectId, // L'API restituisce objectId, ma noi vogliamo id
      name: positionData.name,
      env_object_id: positionData.env_object_id,
      environment_id: environmentId,
      pos_x: positionData.pos_x,
      pos_y: positionData.pos_y,
      pos_z: positionData.pos_z,
      rotation_x: positionData.rotation_x,
      rotation_y: positionData.rotation_y,
      rotation_z: positionData.rotation_z,
      scale_x: positionData.scale_x,
      scale_y: positionData.scale_y,
      scale_z: positionData.scale_z,
      original_file_url: envFileUrl
    };

    console.log('Reconstructed complete object:', newObject);

    // Aggiorna stato locale
    setMapObjects(prev => [...prev, newObject]);
    
    // Notifica il parent con evento granulare
    if (onSingleObjectAdd) {
      onSingleObjectAdd(newObject);
    } else if (onObjectsChange) {
      onObjectsChange([...mapObjects, newObject]);
    }
    
    setOpenPositionModal(false);
    
  } catch (error) {
    console.error("Errore nel posizionamento dell'oggetto:", error);
    setError(error.message || t("mapObjectManager.errors.save"));
  } finally {
    setLoading(false);
  }
};
//-------------------------------------------------------

  const openEditModal = (mapObject) => {
    setSelectedObjectForEdit(mapObject);
    setPositionData({
      name: mapObject.name,
      env_object_id: mapObject.env_object_id,
      pos_x: mapObject.pos_x || 0,
      pos_y: mapObject.pos_y || 0,
      pos_z: mapObject.pos_z || 0,
      rotation_x: mapObject.rotation_x || 0,
      rotation_y: mapObject.rotation_y || 0,
      rotation_z: mapObject.rotation_z || 0,
      scale_x: mapObject.scale_x || 1,
      scale_y: mapObject.scale_y || 1,
      scale_z: mapObject.scale_z || 1,
    });
    setEditModal(true);
  };

const handleUpdateObject = async () => {
  if (!selectedObjectForEdit) return;

  try {
    setError("");
    setLoading(true);
    
    const apiResponse = await envObjectsApi.updateMapObject(selectedObjectForEdit.id, {
      ...positionData,
      environment_id: environmentId,
      file_url: selectedObjectForEdit.file_url || ""
    });

    console.log('API updateMapObject response:', apiResponse);

    // Se l'API di update restituisce lo stesso formato di create, gestiscilo
    let updatedObject;
    
    if (apiResponse && typeof apiResponse === 'object') {
      const updEnvFileUrl = positionData._envObjFileUrl || envObjects.find(eo => String(eo.id) === String(positionData.env_object_id))?.file_url || '';
      if (apiResponse.objectId) {
        // Stesso formato della create - ricostruisci l'oggetto
        updatedObject = {
          id: selectedObjectForEdit.id, // Mantieni l'ID originale per l'update
          name: positionData.name,
          env_object_id: positionData.env_object_id,
          environment_id: environmentId,
          pos_x: positionData.pos_x,
          pos_y: positionData.pos_y,
          pos_z: positionData.pos_z,
          rotation_x: positionData.rotation_x,
          rotation_y: positionData.rotation_y,
          rotation_z: positionData.rotation_z,
          scale_x: positionData.scale_x,
          scale_y: positionData.scale_y,
          scale_z: positionData.scale_z,
          original_file_url: updEnvFileUrl
        };
      } else if (apiResponse.id || Object.keys(apiResponse).length > 2) {
        // L'API ha restituito l'oggetto completo
        updatedObject = { ...apiResponse, original_file_url: apiResponse.original_file_url || updEnvFileUrl };
      } else {
        // Fallback - ricostruisci comunque
        updatedObject = {
          id: selectedObjectForEdit.id,
          name: positionData.name,
          env_object_id: positionData.env_object_id,
          environment_id: environmentId,
          pos_x: positionData.pos_x,
          pos_y: positionData.pos_y,
          pos_z: positionData.pos_z,
          rotation_x: positionData.rotation_x,
          rotation_y: positionData.rotation_y,
          rotation_z: positionData.rotation_z,
          scale_x: positionData.scale_x,
          scale_y: positionData.scale_y,
          scale_z: positionData.scale_z,
          original_file_url: updEnvFileUrl
        };
      }
    } else {
      throw new Error('API returned invalid response format');
    }

    console.log('Reconstructed updated object:', updatedObject);

    // Aggiorna stato locale
    setMapObjects(prev => prev.map(obj => 
      obj.id === selectedObjectForEdit.id ? updatedObject : obj
    ));
    
    // Notifica il parent con evento granulare
    if (onSingleObjectUpdate) {
      onSingleObjectUpdate(updatedObject);
    } else if (onObjectsChange) {
      const updatedObjects = mapObjects.map(obj => 
        obj.id === selectedObjectForEdit.id ? updatedObject : obj
      );
      onObjectsChange(updatedObjects);
    }
    
    setEditModal(false);
    setSelectedObjectForEdit(null);
    
  } catch (error) {
    console.error("Errore nell'aggiornamento dell'oggetto:", error);
    setError(error.message || t("mapObjectManager.errors.update"));
  } finally {
    setLoading(false);
  }
};
// -------------------------------------------------------

  const handleDeleteObject = async (objectId) => {
  if (!window.confirm(t("mapObjectManager.confirm.deleteObject"))) return;

  try {
    setLoading(true);
    await envObjectsApi.removeObjectFromMap(objectId);
    
    // NUOVO: Aggiorna stato locale
    setMapObjects(prev => prev.filter(obj => obj.id !== objectId));
    
    // Notifica il parent con evento granulare
    if (onSingleObjectRemove) {
      onSingleObjectRemove(objectId);
    } else if (onObjectsChange) {
      const filteredObjects = mapObjects.filter(obj => obj.id !== objectId);
      onObjectsChange(filteredObjects);
    }
    
  } catch (error) {
    console.error("Errore nella rimozione dell'oggetto:", error);
    setError(error.message || t("mapObjectManager.errors.delete"));
  } finally {
    setLoading(false);
  }
};

  const closeModals = () => {
    setOpenPositionModal(false);
    setEditModal(false);
    setSelectedObjectForEdit(null);
    setPositionData({
      name: "",
      env_object_id: "",
      pos_x: 0,
      pos_y: 0,
      pos_z: 0,
      rotation_x: 0,
      rotation_y: 0,
      rotation_z: 0,
      scale_x: 1,
      scale_y: 1,
      scale_z: 1,
    });
    setError("");
  };

  if (isCreating) {
    return null;
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AddLocationIcon />
            {t('mapObjectManager.title')}
            {mapObjects.length > 0 && (
              <Chip label={mapObjects.length} size="small" color="secondary" />
            )}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('mapObjectManager.table.name')}</TableCell>
                    <TableCell>{t('mapObjectManager.table.position')}</TableCell>
                    <TableCell>{t('mapObjectManager.table.rotation')}</TableCell>
                    <TableCell>{t('mapObjectManager.table.scale')}</TableCell>
                    <TableCell align="center">{t('mapObjectManager.table.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mapObjects.map((obj) => (
                    <TableRow key={obj.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {obj.name}
                        </Typography>
                        <Chip
                          label={envObjects.find(eo => eo.id === obj.env_object_id)?.name || "N/A"}
                          size="small"
                          variant="outlined"
                          color="primary"
                          sx={{ mt: 0.5 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {Number(obj.pos_x).toFixed(3)}, {Number(obj.pos_y).toFixed(3)}, {Number(obj.pos_z).toFixed(1)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {Number(obj.rotation_x || 0).toFixed(1)}°, {Number(obj.rotation_y || 0).toFixed(1)}°, {Number(obj.rotation_z || 0).toFixed(1)}°
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {Number(obj.scale_x || 1).toFixed(2)}, {Number(obj.scale_y || 1).toFixed(2)}, {Number(obj.scale_z || 1).toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton 
                          color="primary" 
                          onClick={() => openEditModal(obj)}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          color="error" 
                          onClick={() => handleDeleteObject(obj.id)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {mapObjects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3, color: "text.secondary" }}>
                        {t('mapObjectManager.empty')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Dialog Posizionamento/Modifica Oggetto 3D */}
      <Dialog 
        open={openPositionModal || editModal} 
        onClose={closeModals} 
        fullWidth 
        maxWidth="md"
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ViewInArIcon />
            {editModal ? t('mapObjectManager.dialog.editTitle') : t('mapObjectManager.dialog.placeTitle')}
          </Box>
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Selezione Modello 3D */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>{t('mapObjectManager.dialog.fields.model')}</InputLabel>
                <Select
                  value={positionData.env_object_id}
                  label={t('mapObjectManager.dialog.fields.model')}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const selectedObj = envObjects.find(obj => obj.id === selectedId);
                    setPositionData(prev => ({
                      ...prev,
                      env_object_id: selectedId,
                      name: selectedObj ? selectedObj.name : "",
                      _envObjFileUrl: selectedObj?.file_url || ""
                    }));
                  }}
                >
                  <MenuItem value="">
                    <em>{t('mapObjectManager.dialog.fields.modelSelect')}</em>
                  </MenuItem>
                  {envObjects.map(obj => (
                    <MenuItem key={obj.id} value={obj.id}>
                      {obj.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Nome Oggetto */}
            <Grid item xs={12} md={6}>
              <TextField
                label={t('mapObjectManager.dialog.fields.name')}
                fullWidth
                sx={{ mb: 2 }}
                value={positionData.name}
                onChange={(e) => setPositionData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('mapObjectManager.dialog.fields.namePlaceholder')}
              />
            </Grid>

            {/* Posizione */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 1 }}>{t('mapObjectManager.dialog.fields.position')}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label={t('mapObjectManager.dialog.fields.posX')}
                type="number"
                fullWidth
                value={positionData.pos_x}
                onChange={(e) => setPositionData(prev => ({ ...prev, pos_x: Number(e.target.value) }))}
                inputProps={{ step: "0.000001" }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label={t('mapObjectManager.dialog.fields.posY')}
                type="number"
                fullWidth
                value={positionData.pos_y}
                onChange={(e) => setPositionData(prev => ({ ...prev, pos_y: Number(e.target.value) }))}
                inputProps={{ step: "0.000001" }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label={t('mapObjectManager.dialog.fields.posZ')}
                type="number"
                fullWidth
                value={positionData.pos_z}
                onChange={(e) => setPositionData(prev => ({ ...prev, pos_z: Number(e.target.value) }))}
                inputProps={{ step: "0.1" }}
              />
            </Grid>

            {/* Rotazione */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>{t('mapObjectManager.dialog.fields.rotationSection')}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label={t('mapObjectManager.dialog.fields.rotationX')}
                type="number"
                fullWidth
                value={positionData.rotation_x}
                onChange={(e) => setPositionData(prev => ({ ...prev, rotation_x: Number(e.target.value) }))}
                inputProps={{ step: "1" }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label={t('mapObjectManager.dialog.fields.rotationY')}
                type="number"
                fullWidth
                value={positionData.rotation_y}
                onChange={(e) => setPositionData(prev => ({ ...prev, rotation_y: Number(e.target.value) }))}
                inputProps={{ step: "1" }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label={t('mapObjectManager.dialog.fields.rotationZ')}
                type="number"
                fullWidth
                value={positionData.rotation_z}
                onChange={(e) => setPositionData(prev => ({ ...prev, rotation_z: Number(e.target.value) }))}
                inputProps={{ step: "1" }}
              />
            </Grid>

            {/* Scala */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>{t('mapObjectManager.dialog.fields.scaleSection')}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label={t('mapObjectManager.dialog.fields.scaleX')}
                type="number"
                fullWidth
                value={positionData.scale_x}
                onChange={(e) => setPositionData(prev => ({ ...prev, scale_x: Number(e.target.value) }))}
                inputProps={{ step: "0.1", min: "0.1" }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label={t('mapObjectManager.dialog.fields.scaleY')}
                type="number"
                fullWidth
                value={positionData.scale_y}
                onChange={(e) => setPositionData(prev => ({ ...prev, scale_y: Number(e.target.value) }))}
                inputProps={{ step: "0.1", min: "0.1" }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label={t('mapObjectManager.dialog.fields.scaleZ')}
                type="number"
                fullWidth
                value={positionData.scale_z}
                onChange={(e) => setPositionData(prev => ({ ...prev, scale_z: Number(e.target.value) }))}
                inputProps={{ step: "0.1", min: "0.1" }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={closeModals} disabled={loading}>
            {t('mapObjectManager.buttons.cancel')}
          </Button>
          <Button 
            variant="contained" 
            onClick={editModal ? handleUpdateObject : handlePositionObject} 
            disabled={loading || !positionData.env_object_id || !positionData.name.trim()}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                {editModal ? t('mapObjectManager.buttons.updating') : t('mapObjectManager.buttons.placing')}
              </>
            ) : (
              editModal ? t('mapObjectManager.buttons.update') : t('mapObjectManager.buttons.place')
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

MapObjectManager.displayName = "MapObjectManager";

export default MapObjectManager;