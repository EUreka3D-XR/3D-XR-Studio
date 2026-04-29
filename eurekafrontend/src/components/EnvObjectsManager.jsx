import React, { useState, useEffect } from "react";
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Chip
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import '@google/model-viewer';
import envObjectsApi from "../services/envObjectsApi";
import { useTranslation } from 'react-i18next';
import ThreeModelPreview from "./ThreeModelPreview";

const EnvObjectsManager = ({ environmentId, isCreating = false, onObjectsChange }) => {
  const { t } = useTranslation('translation');
  const [envObjects, setEnvObjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Modal states
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" | "edit"
  const [selectedObject, setSelectedObject] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    name: "",
    file_url: ""
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  
  // Preview
  const [modelPreviewUrl, setModelPreviewUrl] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Carica oggetti 3D all'avvio
  useEffect(() => {
    if (!isCreating && environmentId) {
      loadEnvObjects();
    }
  }, [environmentId, isCreating]);

  // Notifica cambiamenti al parent
  useEffect(() => {
    if (onObjectsChange) {
      onObjectsChange(envObjects);
    }
  }, [envObjects, onObjectsChange]);

  const loadEnvObjects = async () => {
    try {
      setLoading(true);
      setError("");
      const objects = await envObjectsApi.listEnvObjects(environmentId);
      setEnvObjects(objects);
    } catch (error) {
      console.error("Errore nel caricamento degli oggetti 3D:", error);
      setError(t("envObjectsManager.errors.load"));
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setModalMode("add");
    setSelectedObject(null);
    setFormData({ name: "", file_url: "" });
    setSelectedFile(null);
    setFileError("");
    setModelPreviewUrl("");
    setOpenModal(true);
  };

  const openEditModal = async (envObject) => {
    setModalMode("edit");
    setSelectedObject(envObject);
    setFormData({
      name: envObject.name,
      file_url: envObject.file_url
    });
    setSelectedFile(null);
    setFileError("");
    setOpenModal(true);
    
    // Carica preview del modello esistente
    if (envObject.id) {
      setLoadingPreview(true);
      try {
        const previewUrl = await envObjectsApi.createPreviewUrl(envObject.id);
        if (previewUrl) {
          setModelPreviewUrl(previewUrl);
        }
      } catch (error) {
        console.error("Errore nel caricamento della preview:", error);
      } finally {
        setLoadingPreview(false);
      }
    }
  };

  const closeModal = () => {
    setOpenModal(false);
    setSelectedObject(null);
    setFormData({ name: "", file_url: "" });
    setSelectedFile(null);
    setFileError("");
    setModelPreviewUrl("");
    setLoadingPreview(false);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setFileError("");
    
    if (file) {
      const validation = envObjectsApi.validateModelFile(file);
      if (!validation.isValid) {
        setFileError(validation.message);
        setSelectedFile(null);
        return;
      }
      
      // Crea preview locale per file appena selezionato
      const url = URL.createObjectURL(file);
      setModelPreviewUrl(url);
    } else {
      setModelPreviewUrl("");
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Validazione form
      const validation = envObjectsApi.validateEnvObjectData({
        name: formData.name,
        environment_id: environmentId
      });
      
      if (!validation.isValid) {
        setError(validation.errors.join(", "));
        return;
      }

      let result;
      
      if (modalMode === "add") {
        // Crea nuovo oggetto
        result = await envObjectsApi.createEnvObject({
          name: formData.name,
          file_url: "",
          environment_id: environmentId
        });
        
        // Upload del file se presente
        if (selectedFile) {
          await envObjectsApi.uploadFile(result.envObjectId || result.id, selectedFile);
        }
      } else {
        // Aggiorna oggetto esistente
        result = await envObjectsApi.updateEnvObject(selectedObject.id, {
          name: formData.name,
          file_url: formData.file_url,
          environment_id: environmentId
        });
        
        // Upload del nuovo file se presente
        if (selectedFile) {
          await envObjectsApi.uploadFile(selectedObject.id, selectedFile);
        }
      }

      // Ricarica la lista
      await loadEnvObjects();
      closeModal();
      
    } catch (error) {
      console.error("Errore nel salvataggio:", error);
      setError(error.message || t("envObjectsManager.errors.save"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (objectId) => {
    if (!window.confirm(t('envObjectsManager.confirm.delete'))) {
      return;
    }

    try {
      setLoading(true);
      await envObjectsApi.deleteEnvObject(objectId);
      await loadEnvObjects();
    } catch (error) {
      console.error("Errore nell'eliminazione:", error);
      setError(error.message || t("envObjectsManager.errors.delete"));
    } finally {
      setLoading(false);
    }
  };

  const getFileExtension = (filename) => {
    return filename ? filename.split('.').pop().toLowerCase() : "";
  };

  const renderPreview = () => {
    if (loadingPreview) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (!modelPreviewUrl) {
      return (
        <Box sx={{ 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          p: 4,
          border: "2px dashed",
          borderColor: "grey.300",
          borderRadius: 1,
          color: "text.secondary"
        }}>
          <ViewInArIcon sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="body2">
            {t('envObjectsManager.dialog.preview.none')}
          </Typography>
        </Box>
      );
    }

    const extension = selectedFile ? 
      getFileExtension(selectedFile.name) : 
      getFileExtension(selectedObject?.file_url || "");

    if (["glb", "gltf"].includes(extension)) {
      return (
        <model-viewer
          src={modelPreviewUrl}
          alt="Anteprima modello 3D"
          auto-rotate
          camera-controls
          style={{ width: "100%", height: "300px" }}
        />
      );
    }

    if (["obj", "fbx"].includes(extension)) {
      return (
        <ThreeModelPreview
          src={modelPreviewUrl}
          extension={extension}
          style={{ height: 300 }}
        />
      );
    }

    return (
      <Box sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        p: 4,
        bgcolor: "grey.100",
        borderRadius: 1
      }}>
        <ViewInArIcon sx={{ fontSize: 48, mb: 1, color: "grey.500" }} />
        <Typography variant="body2" color="text.secondary">
          {t('envObjectsManager.dialog.preview.notAvailable')}
        </Typography>
        <Chip label={extension.toUpperCase()} size="small" sx={{ mt: 1 }} />
      </Box>
    );
  };

  if (isCreating) {
    return null;
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ViewInArIcon />
            {t('envObjectsManager.title')}
            {envObjects.length > 0 && (
              <Chip label={envObjects.length} size="small" color="primary" />
            )}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={openAddModal}
            sx={{ mb: 2 }}
            disabled={loading}
          >
            {t('envObjectsManager.buttons.add')}
          </Button>

          {loading && !openModal ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('envObjectsManager.table.name')}</TableCell>
                    <TableCell>{t('envObjectsManager.table.url')}</TableCell>
                    <TableCell>{t('envObjectsManager.table.format')}</TableCell>
                    <TableCell align="center">{t('envObjectsManager.table.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {envObjects.map((obj) => (
                    <TableRow key={obj.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {obj.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {envObjectsApi.getDownloadUrl(obj.id)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getFileExtension(obj.file_url) || "N/A"} 
                          size="small" 
                          variant="outlined"
                        />
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
                          onClick={() => handleDelete(obj.id)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {envObjects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 3, color: "text.secondary" }}>
                        {t('envObjectsManager.empty')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Dialog Aggiungi/Modifica Oggetto 3D */}
      <Dialog open={openModal} onClose={closeModal} fullWidth maxWidth="md">
        <DialogTitle>
          {modalMode === "add" ? t('envObjectsManager.dialog.addTitle') : t('envObjectsManager.dialog.editTitle')}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label={t('envObjectsManager.dialog.name')}
            variant="outlined"
            fullWidth
            sx={{ mb: 3 }}
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />

          {modalMode === "edit" && selectedObject && (
            <TextField
              label={t('envObjectsManager.dialog.urlDownload')}
              variant="outlined"
              fullWidth
              sx={{ mb: 3 }}
              value={envObjectsApi.getDownloadUrl(selectedObject.id)}
              InputProps={{ readOnly: true }}
              helperText={t('envObjectsManager.dialog.urlDownload')}
            />
          )}

          {/* Upload File */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              {modalMode === "edit" ? t('envObjectsManager.dialog.fileUploadKeep') : t('envObjectsManager.dialog.fileUpload')}
            </Typography>
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUploadIcon />}
              sx={{ mb: 1 }}
            >
              {t('envObjectsManager.dialog.selectFile')}
              <input
                type="file"
                hidden
                accept=".glb,.gltf,.obj,.fbx"
                onChange={handleFileChange}
              />
            </Button>
            
            {selectedFile && (
              <Typography variant="body2" color="primary" sx={{ ml: 2 }}>
                {t('envObjectsManager.dialog.selectedFile', { filename: selectedFile.name })}
              </Typography>
            )}
            
            {fileError && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {fileError}
              </Alert>
            )}
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {t('envObjectsManager.dialog.supportedFormats')}
            </Typography>
          </Box>

          {/* Anteprima */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              {t('envObjectsManager.dialog.preview.title')}
            </Typography>
            {renderPreview()}
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={closeModal} disabled={loading}>
            {t('envObjectsManager.buttons.cancel')}
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit} 
            disabled={loading || !formData.name.trim() || (modalMode === "add" && !selectedFile)}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                {t('envObjectsManager.buttons.saving')}
              </>
            ) : (
              modalMode === "add" ? t('envObjectsManager.buttons.create') : t('envObjectsManager.buttons.save')
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnvObjectsManager;