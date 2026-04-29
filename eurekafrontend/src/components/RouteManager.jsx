import React, { useState, useEffect } from "react";
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
  TextField,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardActions,
  Divider
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import AddIcon from "@mui/icons-material/Add";
import PhotoIcon from "@mui/icons-material/Photo";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import LinkIcon from "@mui/icons-material/Link";
import RouteIcon from "@mui/icons-material/Route";
import routesApi from "../services/routesApi";
import { useTranslation } from 'react-i18next';

const RouteManager = React.forwardRef(({ 
  environmentId, 
  isCreating = false, 
  onRouteIdChange,
  onStopsChange,
  onDataLoaded,
  routeLoading = false,
  onSingleStopAdd,
  onSingleStopUpdate,
  onSingleStopRemove,
  onRouteLineUpdate
}, ref) => {
  const { t } = useTranslation('translation');
  const [routeId, setRouteId] = useState(null);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Edit Stop Modal
  const [editStopModal, setEditStopModal] = useState(false);
  const [selectedStopForEdit, setSelectedStopForEdit] = useState(null);
  const [editStopData, setEditStopData] = useState({ label: "", description: "" });
  const [stopMedia, setStopMedia] = useState([]);
  const [mediaForm, setMediaForm] = useState({ type: "image", title: "", url: "" });
  const [editingMedia, setEditingMedia] = useState(null);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState("");

  // Carica percorso e tappe all'avvio
  useEffect(() => {
    if (!isCreating && environmentId) {
      ensureRouteAndStops();
    }
  }, [environmentId, isCreating]);

  // Notifica cambiamenti al parent
  useEffect(() => {
    if (onRouteIdChange) {
      onRouteIdChange(routeId);
    }
  }, [routeId, onRouteIdChange]);

  useEffect(() => {
    if (onStopsChange) {
      onStopsChange(stops);
    }
  }, [stops, onStopsChange]);

  const ensureRouteAndStops = async () => {
    try {
      setLoading(true);
      setError("");
      
      const route = await routesApi.ensureRouteExists(environmentId);
      setRouteId(route.id);
      
      const loadedStops = await routesApi.getStops(route.id);
      setStops(loadedStops);

      if (onDataLoaded) {
        onDataLoaded(loadedStops);
      }
      
    } catch (error) {
      console.error("Errore nell'assicurare il percorso:", error);
      setError(t("routeManager.alerts.loadError"));
    } finally {
      setLoading(false);
    }
  };

  React.useImperativeHandle(ref, () => ({
    ensureRouteAndStops: ensureRouteAndStops,
    addStopExternally: (newStop) => {
      setStops(prev => [...prev, newStop]);
    }
  }));

  const updateStopLabel = async (stopId, newLabel) => {
    if (!routeId) return;
    
    try {
      await routesApi.updateStop(routeId, stopId, { label: newLabel });
      const updatedStops = stops.map(s =>
        s.id === stopId ? { ...s, label: newLabel } : s
      );
      setStops(updatedStops);
    } catch (error) {
      console.error("Errore aggiornamento label:", error);
      setError(t("routeManager.alerts.updateError"));
    }
  };

  const reorderStop = async (direction, stopId) => {
  if (!routeId) return;
  
  const idx = stops.findIndex(s => s.id === stopId);
  if (idx < 0) return;
  
  let newStops = [...stops];
  if (direction === "up" && idx > 0) {
    [newStops[idx - 1], newStops[idx]] = [newStops[idx], newStops[idx - 1]];
  } else if (direction === "down" && idx < newStops.length - 1) {
    [newStops[idx + 1], newStops[idx]] = [newStops[idx], newStops[idx + 1]];
  } else {
    return;
  }

  try {
    await routesApi.reorderStops(routeId, newStops);
    
    // Aggiorna stato locale
    setStops(newStops);
    
    // Notifica granulare al parent - solo ridisegna linea percorso
    if (onRouteLineUpdate) {
      onRouteLineUpdate(newStops);
    } else if (onStopsChange) {
      onStopsChange(newStops);
    }
  } catch (error) {
    console.error("Errore riordino:", error);
    setError("Errore nel riordino delle tappe");
  }
};

 const deleteStop = async (stopId) => {
  if (!window.confirm(t("routeManager.confirm.deleteStop")) || !routeId) return;
  
  try {
    await routesApi.deleteStop(routeId, stopId);
    
    // Aggiorna stato locale
    const updatedStops = stops.filter(s => s.id !== stopId);
    setStops(updatedStops);
    
    // Notifica granulare al parent
    if (onSingleStopRemove) {
      onSingleStopRemove(stopId);
    }
    if (onRouteLineUpdate) {
      onRouteLineUpdate(updatedStops);
    } else if (onStopsChange) {
      onStopsChange(updatedStops);
    }
  } catch (error) {
    console.error("Errore eliminazione tappa:", error);
    setError(t("routeManager.alerts.deleteError"));
  }
};

  // =======================================
  // GESTIONE EDIT TAPPA E MEDIA
  // =======================================

  const openEditStopModal = async (stop) => {
    if (!routeId) return;
    
    setSelectedStopForEdit(stop);
    setEditStopData({
      label: stop.label || "",
      description: stop.description || ""
    });
    setLoadingMedia(true);
    setEditStopModal(true);
    
    try {
      const stopDetails = await routesApi.getStopDetails(routeId, stop.id);
      setStopMedia(stopDetails.media || []);
    } catch (error) {
      console.error("Errore caricamento dettagli tappa:", error);
      setStopMedia([]);
    } finally {
      setLoadingMedia(false);
    }
  };

  const closeEditStopModal = () => {
    setEditStopModal(false);
    setSelectedStopForEdit(null);
    setStopMedia([]);
    setMediaForm({ type: "image", title: "", url: "" });
    setEditingMedia(null);
    setMediaError("");
  };

  const handleUpdateStopDescription = async () => {
    if (!selectedStopForEdit || !routeId) return;
    
    try {
      await routesApi.updateStop(routeId, selectedStopForEdit.id, {
        label: editStopData.label,
        description: editStopData.description
      });
      
      const updatedStops = stops.map(s =>
        s.id === selectedStopForEdit.id 
          ? { ...s, label: editStopData.label, description: editStopData.description }
          : s
      );
      setStops(updatedStops);
      
      alert(t("routeManager.alerts.updateSuccess"));
    } catch (error) {
      console.error("Errore aggiornamento tappa:", error);
      alert(t("routeManager.alerts.updateFail"));
    }
  };

  const handleAddMedia = async () => {
    if (!selectedStopForEdit || !routeId) return;
    
    setMediaError("");
    
    // Validazioni
    const validation = routesApi.validateMediaData(mediaForm);
    if (!validation.isValid) {
      setMediaError(validation.errors.join(", "));
      return;
    }
    
    if (stopMedia.length >= 5) {
      setMediaError(t("routeManager.errors.maxMedia"));
      return;
    }
    
    try {
      const newMedia = await routesApi.addStopMedia(routeId, selectedStopForEdit.id, mediaForm);
      setStopMedia([...stopMedia, newMedia]);
      setMediaForm({ type: "image", title: "", url: "" });
      
      // Aggiorna conteggio media nella cache locale
      const updatedStops = stops.map(s =>
        s.id === selectedStopForEdit.id 
          ? { ...s, media_count: (s.media_count || 0) + 1 }
          : s
      );
      setStops(updatedStops);
      
    } catch (error) {
      console.error("Errore aggiunta media:", error);
      setMediaError(error.message || "Errore nell'aggiunta del media");
    }
  };

  const handleEditMedia = (media) => {
    setEditingMedia(media);
    setMediaForm({
      type: media.type,
      title: media.title || "",
      url: media.url
    });
  };

  const handleUpdateMedia = async () => {
    if (!editingMedia || !selectedStopForEdit || !routeId) return;
    
    setMediaError("");
    
    const validation = routesApi.validateMediaData(mediaForm);
    if (!validation.isValid) {
      setMediaError(validation.errors.join(", "));
      return;
    }
    
    try {
      const updatedMedia = await routesApi.updateStopMedia(
        routeId, 
        selectedStopForEdit.id, 
        editingMedia.id, 
        mediaForm
      );
      
      const newStopMedia = stopMedia.map(m => m.id === editingMedia.id ? updatedMedia : m);
      setStopMedia(newStopMedia);
      setEditingMedia(null);
      setMediaForm({ type: "image", title: "", url: "" });
      
    } catch (error) {
      console.error("Errore aggiornamento media:", error);
      setMediaError(error.message || "Errore nell'aggiornamento del media");
    }
  };

  const handleDeleteMedia = async (mediaId) => {
    if (!window.confirm(t("routeManager.confirm.deleteMedia")) || !selectedStopForEdit || !routeId) return;
    
    try {
      await routesApi.deleteStopMedia(routeId, selectedStopForEdit.id, mediaId);
      setStopMedia(stopMedia.filter(m => m.id !== mediaId));
      
      // Aggiorna conteggio media nella cache locale
      const updatedStops = stops.map(s =>
        s.id === selectedStopForEdit.id 
          ? { ...s, media_count: Math.max((s.media_count || 1) - 1, 0) }
          : s
      );
      setStops(updatedStops);
      
    } catch (error) {
      console.error("Errore eliminazione media:", error);
      alert(t("routeManager.errors.deleteMedia"));
    }
  };

  const cancelEditMedia = () => {
    setEditingMedia(null);
    setMediaForm({ type: "image", title: "", url: "" });
    setMediaError("");
  };

  // Utility per icone media
  const getMediaIcon = (type) => {
    switch (type) {
      case "image": return <PhotoIcon />;
      case "video": return <VideoLibraryIcon />;
      default: return <LinkIcon />;
    }
  };

  // Utility per preview media
  const renderMediaPreview = (media) => {
    if (media.type === "video") {
      const videoId = routesApi.extractYouTubeVideoId(media.url);
      if (videoId) {
        return (
          <Box sx={{ width: "100%", height: 200, overflow: "hidden", borderRadius: 1 }}>
            <iframe
              width="100%"
              height="200"
              src={`https://www.youtube.com/embed/${videoId}`}
              title={media.title || "Video"}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </Box>
        );
      }
    } else if (media.type === "image") {
      return (
        <Box sx={{ width: "100%", height: 200, overflow: "hidden", borderRadius: 1 }}>
          <img
            src={media.url}
            alt={media.title || "Immagine"}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/300x200?text=Immagine+non+disponibile";
            }}
          />
        </Box>
      );
    }
    
    return (
      <Box sx={{ 
        width: "100%", 
        height: 200, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        bgcolor: "grey.100",
        borderRadius: 1
      }}>
        <LinkIcon sx={{ fontSize: 40, color: "grey.500" }} />
      </Box>
    );
  };

  if (isCreating) {
    return null;
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <RouteIcon />
            {t('routeManager.title')}
            {stops.length > 0 && (
              <Chip label={`${stops.length} ${t('routeManager.routeStops')}`} size="small" color="primary" />
            )}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {(loading || routeLoading) ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>{t('routeManager.table.lat')}</TableCell>
                    <TableCell>{t('routeManager.table.lng')}</TableCell>
                    <TableCell align="center">{t('routeManager.table.order')}</TableCell>
                    <TableCell align="center">{t('routeManager.table.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stops.map((stop, idx) => (
                    <TableRow key={stop.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{Number(stop.latitude).toFixed(6)}</TableCell>
                      <TableCell>{Number(stop.longitude).toFixed(6)}</TableCell>
                      <TableCell align="center">
                        <IconButton 
                          size="small" 
                          onClick={() => reorderStop("up", stop.id)} 
                          disabled={idx === 0}
                        >
                          <ArrowUpwardIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => reorderStop("down", stop.id)} 
                          disabled={idx === stops.length - 1}
                        >
                          <ArrowDownwardIcon />
                        </IconButton>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton 
                          color="error" 
                          onClick={() => deleteStop(stop.id)} 
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {stops.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3, color: "text.secondary" }}>
                        {t('routeManager.empty')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Dialog Edit Tappa con gestione Media */}
      <Dialog open={editStopModal} onClose={closeEditStopModal} fullWidth maxWidth="md">
        <DialogTitle>
          {t('routeManager.dialog.editTitle', { n: selectedStopForEdit && stops.findIndex(s => s.id === selectedStopForEdit.id) + 1 })}
        </DialogTitle>
        <DialogContent>
          {selectedStopForEdit && (
            <Box>
              {/* Informazioni Base Tappa */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>{t('routeManager.dialog.info')}</Typography>
                <TextField
                  label={t('routeManager.dialog.name')}
                  fullWidth
                  sx={{ mb: 2 }}
                  value={editStopData.label}
                  onChange={(e) => setEditStopData(prev => ({ ...prev, label: e.target.value }))}
                />
                <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                  <TextField
                    label={t('routeManager.table.lat')}
                    value={Number(selectedStopForEdit.latitude).toFixed(6)}
                    disabled
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label={t('routeManager.table.lng')}
                    value={Number(selectedStopForEdit.longitude).toFixed(6)}
                    disabled
                    sx={{ flex: 1 }}
                  />
                </Box>
                <TextField
                  label={t('routeManager.dialog.description')}
                  multiline
                  rows={3}
                  fullWidth
                  sx={{ mb: 2 }}
                  value={editStopData.description}
                  onChange={(e) => setEditStopData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('routeManager.dialog.descriptionPlaceholder')}
                />
                <Button variant="outlined" onClick={handleUpdateStopDescription}>
                  {t('routeManager.dialog.saveInfo')}
                </Button>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Gestione Media */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {t('routeManager.dialog.media.sectionTitle', { count: stopMedia.length })}
                </Typography>

                {mediaError && (
                  <Alert severity="error" sx={{ mb: 2 }}>{mediaError}</Alert>
                )}

                {/* Form Aggiungi/Modifica Media */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 2 }}>
                      {editingMedia ? t('routeManager.dialog.media.edit') : t('routeManager.dialog.media.new')}
                    </Typography>
                    
                    <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                      <FormControl sx={{ minWidth: 120 }}>
                        <InputLabel>Tipo</InputLabel>
                        <Select
                          value={mediaForm.type}
                          label="Tipo"
                          onChange={(e) => setMediaForm(prev => ({ ...prev, type: e.target.value }))}
                        >
                          <MenuItem value="image">Immagine</MenuItem>
                          <MenuItem value="video">Video (YouTube)</MenuItem>
                          <MenuItem value="url">Link</MenuItem>
                          <MenuItem value="other">Altro</MenuItem>
                        </Select>
                      </FormControl>
                      
                      <TextField
                        label={t('routeManager.dialog.media.title')}
                        sx={{ flex: 1 }}
                        value={mediaForm.title}
                        onChange={(e) => setMediaForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder={t('routeManager.dialog.media.titlePlaceholder')}
                      />
                    </Box>
                    
                    <TextField
                      label={t('routeManager.dialog.media.url')}
                      fullWidth
                      sx={{ mb: 2 }}
                      value={mediaForm.url}
                      onChange={(e) => setMediaForm(prev => ({ ...prev, url: e.target.value }))}
                      placeholder={mediaForm.type === "video" ? t('routeManager.dialog.media.youtubePlaceholder') : t('routeManager.dialog.media.urlPlaceholder')}
                      helperText={mediaForm.type === "video" ? t('routeManager.dialog.media.youtubeHelper') : ""}
                    />
                    
                    <Box sx={{ display: "flex", gap: 2 }}>
                      {editingMedia ? (
                        <>
                          <Button variant="contained" onClick={handleUpdateMedia}>
                            {t('routeManager.dialog.media.update')}
                          </Button>
                          <Button variant="outlined" onClick={cancelEditMedia}>
                            {t('routeManager.dialog.media.cancel')}
                          </Button>
                        </>
                      ) : (
                        <Button 
                          variant="contained" 
                          onClick={handleAddMedia}
                          disabled={stopMedia.length >= 5}
                          startIcon={<AddIcon />}
                        >
                          {t('routeManager.dialog.media.add')}
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>

                {/* Lista Media Esistenti */}
                {loadingMedia ? (
                  <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {stopMedia.map((media, index) => (
                      <Card key={media.id} variant="outlined">
                        <CardContent>
                          <Box sx={{ display: "flex", gap: 2 }}>
                            <Box sx={{ minWidth: 200 }}>
                              {renderMediaPreview(media)}
                            </Box>
                            
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                                {getMediaIcon(media.type)}
                                <Typography variant="h6">
                                  {media.title || `${media.type.charAt(0).toUpperCase() + media.type.slice(1)} ${index + 1}`}
                                </Typography>
                                <Chip label={media.type} size="small" />
                              </Box>
                              
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {media.url}
                              </Typography>
                              
                              <Box sx={{ display: "flex", gap: 1 }}>
                                <Button
                                  size="small"
                                  startIcon={<EditIcon />}
                                  onClick={() => handleEditMedia(media)}
                                >
                                  {t('routeManager.buttons.edit')}
                                </Button>
                                <Button
                                  size="small"
                                  color="error"
                                  startIcon={<DeleteIcon />}
                                  onClick={() => handleDeleteMedia(media.id)}
                                >
                                  {t('routeManager.buttons.delete')}
                                </Button>
                                {media.type !== "other" && (
                                  <Button
                                    size="small"
                                    href={media.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {t('routeManager.buttons.open')}
                                  </Button>
                                )}
                              </Box>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {stopMedia.length === 0 && (
                      <Box sx={{ 
                        textAlign: "center", 
                        py: 4, 
                        color: "text.secondary",
                        border: "2px dashed",
                        borderColor: "grey.300",
                        borderRadius: 1
                      }}>
                        <Typography variant="body1">
                          {t('routeManager.dialog.media.noneTitle')}
                        </Typography>
                        <Typography variant="body2">
                          {t('routeManager.dialog.media.noneSubtitle')}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditStopModal}>{t('routeManager.buttons.close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

export default RouteManager;