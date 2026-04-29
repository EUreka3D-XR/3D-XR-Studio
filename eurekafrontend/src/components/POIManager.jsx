import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
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
  LinearProgress,
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
  Divider,
  Tabs,
  Tab
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import PhotoIcon from "@mui/icons-material/Photo";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import LinkIcon from "@mui/icons-material/Link";
import PlaceIcon from "@mui/icons-material/Place";
import AudiotrackIcon from "@mui/icons-material/Audiotrack";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import poisApi from "../services/poisApi";
import { useTranslation } from 'react-i18next';

// Configurazione delle lingue supportate (EN prima - lingua di default)
const AVAILABLE_LANGUAGES = [
  {
    code: 'en',
    name: 'English',
    flag: '🇬🇧',
    nativeName: 'English'
  },
  {
    code: 'it',
    name: 'Italiano',
    flag: '🇮🇹',
    nativeName: 'Italiano'
  },
  {
    code: 'es',
    name: 'Español',
    flag: '🇪🇸',
    nativeName: 'Español'
  },
  {
    code: 'ca',
    name: 'Catalan',
    flag: '🇦🇩',
    nativeName: 'Català'
  }
];

const POIManager = forwardRef(({ 
  environmentId, 
  isCreating = false, 
  onPoisChange,
  onDataLoaded,
  poisLoading = false,
  environmentLatitude,
  environmentLongitude,
  // AGGIUNGI queste nuove props per rendering granulare
  onSinglePoiAdd,
  onSinglePoiUpdate,
  onSinglePoiRemove
}, ref) => {
  const { t, i18n } = useTranslation('translation');
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Edit POI Modal
  const [editPoiModal, setEditPoiModal] = useState(false);
  const [selectedPoiForEdit, setSelectedPoiForEdit] = useState(null);
  const [editPoiData, setEditPoiData] = useState({ label: "", description: "" });
  const [poiMedia, setPoiMedia] = useState([]);
  const [poiMediaForm, setPoiMediaForm] = useState({ 
    type: "image", 
    title: "", 
    url: "", 
    lang: i18n.language,
    content: "" // NUOVO campo per tipo "text"
  });
  const [selectedFile, setSelectedFile] = useState(null); // NUOVO stato per file upload
  const [editingPoiMedia, setEditingPoiMedia] = useState(null);
  const [loadingPoiMedia, setLoadingPoiMedia] = useState(false);
  const [poiMediaError, setPoiMediaError] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Translation states
  const [poiTranslations, setPoiTranslations] = useState({});
  const [selectedLang, setSelectedLang] = useState('en');
  const [loadingTranslations, setLoadingTranslations] = useState(false);
  const [translationsDirty, setTranslationsDirty] = useState({});

  // Carica POI all'avvio
  useEffect(() => {
    if (!isCreating && environmentId) {
      loadPois();
    }
  }, [environmentId, isCreating]);

  // Notifica cambiamenti al parent
  useEffect(() => {
    if (onPoisChange) {
      onPoisChange(pois);
    }
  }, [pois, onPoisChange]);

  const loadPois = async () => {
    try {
      setLoading(true);
      setError("");
      const loadedPois = await poisApi.listPoisWithMediaCount(environmentId);
      setPois(loadedPois);

      if (onDataLoaded) {
          onDataLoaded(loadedPois);
      }
    } catch (error) {
      console.error("Errore caricamento POI:", error);
      setError(t("poiManager.alerts.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const updatePoiLabel = async (poiId, newLabel) => {
    try {
      await poisApi.updatePoi(poiId, { label: newLabel });
      const updatedPois = pois.map(p =>
        p.id === poiId ? { ...p, label: newLabel } : p
      );
      setPois(updatedPois);
    } catch (error) {
      console.error("Errore aggiornamento label POI:", error);
      setError(t("poiManager.alerts.updateError"));
    }
  };

  const deletePoi = async (poiId) => {
  if (!window.confirm(t('poiManager.confirm.deletePoi'))) return;
  
  try {
    await poisApi.deletePoi(poiId);
    
    // Aggiorna stato locale
    setPois(prev => prev.filter(p => p.id !== poiId));
    
    // Notifica granulare al parent
    if (onSinglePoiRemove) {
      onSinglePoiRemove(poiId);
    } else if (onPoisChange) {
      const filteredPois = pois.filter(p => p.id !== poiId);
      onPoisChange(filteredPois);
    }
  } catch (error) {
    console.error("Errore eliminazione POI:", error);
    setError(t("poiManager.alerts.deleteError"));
  }
};

  // =======================================
  // GESTIONE EDIT POI E MEDIA
  // =======================================

  const openEditPoiModal = async (poi) => {
    setSelectedPoiForEdit(poi);
    setSelectedLang('en'); // Start with English (default language)
    setEditPoiData({
      label: poi.label || "",
      description: poi.description || ""
    });
    setLoadingPoiMedia(true);
    setLoadingTranslations(true);
    setEditPoiModal(true);

    try {
      // Load media and translations in parallel
      const [media, translations] = await Promise.all([
        poisApi.listPoiMedia(poi.id),
        poisApi.listPoiTranslations(poi.id)
      ]);

      setPoiMedia(media || []);

      // Convert translations array to object keyed by lang
      const translationsMap = {};
      AVAILABLE_LANGUAGES.forEach(lang => {
        const existing = translations.find(t => t.lang === lang.code);
        if (existing) {
          translationsMap[lang.code] = {
            id: existing.id,
            label: existing.label || '',
            description: existing.description || ''
          };
        } else {
          // Pre-populate English with existing POI data for backward compatibility
          translationsMap[lang.code] = {
            label: lang.code === 'en' ? (poi.label || '') : '',
            description: lang.code === 'en' ? (poi.description || '') : ''
          };
        }
      });
      setPoiTranslations(translationsMap);
      setTranslationsDirty({});

    } catch (error) {
      console.error("Errore caricamento dati POI:", error);
      setPoiMedia([]);
      setPoiTranslations({});
    } finally {
      setLoadingPoiMedia(false);
      setLoadingTranslations(false);
    }
  };

  const closeEditPoiModal = () => {
    setEditPoiModal(false);
    setSelectedPoiForEdit(null);
    setPoiMedia([]);
    setPoiMediaForm({ type: "image", title: "", url: "", lang: i18n.language, content: "" });
    setSelectedFile(null);
    setEditingPoiMedia(null);
    setPoiMediaError("");
    setUploadingMedia(false);
    setUploadProgress(0);
    // Reset translation states
    setPoiTranslations({});
    setSelectedLang('en');
    setTranslationsDirty({});
  };

  const handleUpdatePoiDescription = async () => {
    if (!selectedPoiForEdit) return;
    
    try {
      await poisApi.updatePoi(selectedPoiForEdit.id, { 
        label: editPoiData.label,
        description: editPoiData.description 
      });
      
      const updatedPois = pois.map(p =>
        p.id === selectedPoiForEdit.id 
          ? { ...p, label: editPoiData.label, description: editPoiData.description }
          : p
      );
      setPois(updatedPois);
      
      alert(t("poiManager.alerts.updateSuccess"));
    } catch (error) {
      console.error("Errore aggiornamento POI:", error);
      alert(t("poiManager.alerts.updateFail"));
    }
  };

  // =======================================
  // GESTIONE TRADUZIONI POI
  // =======================================

  const handleTranslationChange = (lang, field, value) => {
    setPoiTranslations(prev => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [field]: value
      }
    }));
    setTranslationsDirty(prev => ({
      ...prev,
      [lang]: true
    }));
  };

  const handleSaveTranslation = async (lang) => {
    if (!selectedPoiForEdit) return;

    // Validate English label is required
    if (lang === 'en' && (!poiTranslations[lang]?.label || poiTranslations[lang].label.trim() === '')) {
      alert(t("poiManager.alerts.englishLabelRequired"));
      return;
    }

    try {
      const translationData = poiTranslations[lang];
      await poisApi.savePoiTranslation(
        selectedPoiForEdit.id,
        lang,
        translationData
      );

      // If saving English, also update local POI list for display
      if (lang === 'en') {
        const updatedPois = pois.map(p =>
          p.id === selectedPoiForEdit.id
            ? { ...p, label: translationData.label, description: translationData.description }
            : p
        );
        setPois(updatedPois);
      }

      setTranslationsDirty(prev => ({ ...prev, [lang]: false }));
      alert(t("poiManager.alerts.translationSaveSuccess"));

    } catch (error) {
      console.error("Errore salvataggio traduzione:", error);
      alert(t("poiManager.alerts.translationSaveFail"));
    }
  };

  const handleAddPoiMedia = async () => {
    if (!selectedPoiForEdit) return;
    
    setPoiMediaError("");
    
    // Validazioni
    const validation = poisApi.validatePoiMediaData(poiMediaForm, selectedFile);
    if (!validation.isValid) {
      setPoiMediaError(validation.errors.join(", "));
      return;
    }

    // Controllo: per audio e text, solo 1 per lingua
    if (poiMediaForm.type === "audio" || poiMediaForm.type === "text") {
      const existingMediaSameTypeLang = poiMedia.find(
        m => m.type === poiMediaForm.type && m.lang === poiMediaForm.lang
      );
      if (existingMediaSameTypeLang) {
        const langInfo = AVAILABLE_LANGUAGES.find(l => l.code === poiMediaForm.lang);
        const langName = langInfo ? langInfo.nativeName : poiMediaForm.lang;
        setPoiMediaError(t('poiManager.errors.duplicateTypeLang', {
          type: poiMediaForm.type,
          lang: langName
        }));
        return;
      }
    }

    try {
      setUploadingMedia(true);
      setUploadProgress(0);

      // Passa il file come terzo parametro e il callback di progresso come quarto
      const onUploadProgress = selectedFile ? (percent) => {
        setUploadProgress(percent);
      } : null;

      const newMedia = await poisApi.createPoiMedia(selectedPoiForEdit.id, poiMediaForm, selectedFile, onUploadProgress);
      setPoiMedia([...poiMedia, newMedia]);
      setPoiMediaForm({ type: "image", title: "", url: "", lang: i18n.language, content: "" });
      setSelectedFile(null); // RESET file

      // Aggiorna conteggio media nella cache locale
      const updatedPois = pois.map(p =>
        p.id === selectedPoiForEdit.id
          ? { ...p, media_count: (p.media_count || 0) + 1 }
          : p
      );
      setPois(updatedPois);

    } catch (error) {
      console.error("Errore aggiunta media POI:", error);
      setPoiMediaError(error.message || t('poiManager.errors.addMedia'));
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
    }
  };

  const handleEditPoiMedia = (media) => {
    setEditingPoiMedia(media);
    setPoiMediaForm({
      type: media.type,
      title: media.title || "",
      url: media.url || "",
      lang: media.lang || i18n.language,
      content: media.content || "" // NUOVO
    });
    setSelectedFile(null); // Reset file quando si modifica
  };

  const handleUpdatePoiMedia = async () => {
    if (!editingPoiMedia || !selectedPoiForEdit) return;
    
    setPoiMediaError("");
    
    const validation = poisApi.validatePoiMediaData(poiMediaForm, selectedFile);
    if (!validation.isValid) {
      setPoiMediaError(validation.errors.join(", "));
      return;
    }
    
    try {
      setUploadingMedia(true);
      setUploadProgress(0);

      // Passa il file come terzo parametro e il callback di progresso come quarto
      const onUploadProgress = selectedFile ? (percent) => {
        setUploadProgress(percent);
      } : null;

      const updatedMedia = await poisApi.updatePoiMedia(editingPoiMedia.id, poiMediaForm, selectedFile, onUploadProgress);

      const updatedPoiMedia = poiMedia.map(m => m.id === editingPoiMedia.id ? updatedMedia : m);
      setPoiMedia(updatedPoiMedia);
      setEditingPoiMedia(null);
      setPoiMediaForm({ type: "image", title: "", url: "", lang: i18n.language, content: "" });
      setSelectedFile(null); // RESET file

    } catch (error) {
      console.error("Errore aggiornamento media POI:", error);
      setPoiMediaError(error.message || t('poiManager.errors.updateMedia'));
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
    }
  };

  const handleDeletePoiMedia = async (mediaId) => {
    if (!window.confirm(t('poiManager.confirm.deleteMedia')) || !selectedPoiForEdit) return;
    
    try {
      await poisApi.deletePoiMedia(mediaId);
      setPoiMedia(poiMedia.filter(m => m.id !== mediaId));
      
      // Aggiorna conteggio media nella cache locale
      const updatedPois = pois.map(p =>
        p.id === selectedPoiForEdit.id 
          ? { ...p, media_count: Math.max((p.media_count || 1) - 1, 0) }
          : p
      );
      setPois(updatedPois);
      
    } catch (error) {
      console.error("Errore eliminazione media POI:", error);
      alert(t('poiManager.errors.deleteMedia'));
    }
  };

  const cancelEditPoiMedia = () => {
    setEditingPoiMedia(null);
    setPoiMediaForm({ type: "image", title: "", url: "", lang: i18n.language, content: "" });
    setSelectedFile(null); // RESET file
    setPoiMediaError("");
  };

  // Gestione file upload
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Se viene selezionato un file, pulisci l'URL
      setPoiMediaForm(prev => ({ ...prev, url: "" }));
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
  };

  // Metodi pubblici per essere chiamati dall'esterno (es. da MapComponent)
  const createPoi = async (lat, lng, label) => {
  if (!environmentId || !environmentLatitude || !environmentLongitude) {
    throw new Error("Dati ambiente mancanti per creare POI");
  }

  try {
    const poiData = poisApi.createPoiDataWithRelativeCoords(
      {
        environment_id: environmentId,
        label: label.trim(),
        latitude: lat,
        longitude: lng
      },
      environmentLatitude,
      environmentLongitude
    );

    const created = await poisApi.createPoi(poiData);
    const newPoi = { ...created, media_count: 0 };
    
    // Aggiorna stato locale
    setPois(prev => [...prev, newPoi]);
    
    // Notifica granulare al parent
    if (onSinglePoiAdd) {
      onSinglePoiAdd(newPoi);
    } else if (onPoisChange) {
      onPoisChange([...pois, newPoi]);
    }
    
    return newPoi;
  } catch (error) {
    console.error("Errore creazione POI:", error);
    throw error;
  }
};

  const updatePoiPosition = async (poiId, lat, lng) => {
  if (!environmentLatitude || !environmentLongitude) {
    throw new Error("Coordinate ambiente mancanti");
  }

  try {
    const { rel_x, rel_y } = poisApi.calculateRelativePosition(lat, lng, environmentLatitude, environmentLongitude);
    
    await poisApi.updatePoi(poiId, {
      latitude: lat,
      longitude: lng,
      rel_x,
      rel_y,
    });
    
    const updatedPoi = pois.find(p => p.id === poiId);
    if (updatedPoi) {
      const newPoiData = { ...updatedPoi, latitude: lat, longitude: lng, rel_x, rel_y };
      
      // Aggiorna stato locale
      setPois(prev => prev.map(p => p.id === poiId ? newPoiData : p));
      
      // if (onSinglePoiUpdate) {
      //   onSinglePoiUpdate(newPoiData);
      // }
    }
  } catch (error) {
    console.error("Errore aggiornamento posizione POI:", error);
    throw error;
  }
};

  // Esponi metodi per il componente parent
  useImperativeHandle(ref, () => ({
    createPoi,
    updatePoiPosition,
    loadPois
  }), [pois, environmentId, environmentLatitude, environmentLongitude]);

  // Utility per icone media
  const getMediaIcon = (type) => {
    switch (type) {
      case "image": return <PhotoIcon />;
      case "video": return <VideoLibraryIcon />;
      case "audio": return <AudiotrackIcon />; // NUOVO
      case "text": return <TextFieldsIcon />; // NUOVO
      default: return <LinkIcon />;
    }
  };

  // Utility per preview media
  const renderMediaPreview = (media) => {
    if (media.type === "video") {
      const videoId = poisApi.extractYouTubeVideoId(media.url);
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
      // Video locale (file caricato) - usa player HTML5
      return (
        <Box sx={{ width: "100%", height: 200, overflow: "hidden", borderRadius: 1 }}>
          <video
            width="100%"
            height="200"
            controls
            style={{ objectFit: "contain", backgroundColor: "#000" }}
          >
            <source src={media.url} />
            {t('poiManager.dialog.media.videoNotSupported', 'Il browser non supporta il video.')}
          </video>
        </Box>
      );
    } else if (media.type === "image") {
      return (
        <Box sx={{ width: "100%", height: 200, overflow: "hidden", borderRadius: 1 }}>
          <img
            src={media.url}
            alt={media.title || t('poiManager.dialog.media.type.image')}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              // Evita loop infinito: sostituisci con un placeholder solo una volta
              if (!e.target.dataset.failed) {
                e.target.dataset.failed = "true";
                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect width='300' height='200' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='14' fill='%23999'%3EImmagine non disponibile%3C/text%3E%3C/svg%3E";
              }
            }}
          />
        </Box>
      );
    } else if (media.type === "audio") {
      // NUOVO: preview audio
      return (
        <Box sx={{ 
          width: "100%", 
          height: 200, 
          display: "flex", 
          flexDirection: "column",
          alignItems: "center", 
          justifyContent: "center",
          bgcolor: "grey.100",
          borderRadius: 1,
          p: 2
        }}>
          <AudiotrackIcon sx={{ fontSize: 60, color: "grey.500", mb: 2 }} />
          {media.url && (
            <audio controls style={{ width: "100%", maxWidth: 250 }}>
              <source src={media.url} />
              {t('poiManager.dialog.media.audioNotSupported')}
            </audio>
          )}
        </Box>
      );
    } else if (media.type === "text") {
      // NUOVO: preview testo
      const contentPreview = media.content
        ? media.content.substring(0, 150) + (media.content.length > 150 ? "..." : "")
        : t('poiManager.dialog.media.noContent');
      
      return (
        <Box sx={{ 
          width: "100%", 
          height: 200, 
          overflow: "hidden",
          bgcolor: "grey.50",
          borderRadius: 1,
          p: 2,
          border: "1px solid",
          borderColor: "grey.300"
        }}>
          <TextFieldsIcon sx={{ fontSize: 30, color: "grey.600", mb: 1 }} />
          <Typography variant="body2" color="text.secondary" sx={{ 
            display: "-webkit-box",
            WebkitLineClamp: 6,
            WebkitBoxOrient: "vertical",
            overflow: "hidden"
          }}>
            {contentPreview}
          </Typography>
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

  // Helper per ottenere info lingua
  const getLanguageInfo = (langCode) => {
    const lang = AVAILABLE_LANGUAGES.find(l => l.code === langCode);
    return lang || { code: langCode, name: langCode, flag: '🌐', nativeName: langCode };
  };

  if (isCreating) {
    return null;
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PlaceIcon />
            {t('poiManager.title')}
            {pois.length > 0 && (
              <Chip label={`${pois.length} POI`} size="small" color="primary" />
            )}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {(loading || poisLoading) ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ overflowX: "hidden" }}>
              <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 36, px: 1 }}>#</TableCell>
                    <TableCell sx={{ px: 1 }}>{t('poiManager.table.name')}</TableCell>
                    <TableCell sx={{ width: 90, px: 1 }}>{t('poiManager.table.lat')}</TableCell>
                    <TableCell sx={{ width: 90, px: 1 }}>{t('poiManager.table.lng')}</TableCell>
                    <TableCell align="center" sx={{ width: 56, px: 1 }}>{t('poiManager.table.media')}</TableCell>
                    <TableCell align="center" sx={{ width: 80, px: 1 }}>{t('poiManager.table.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pois.map((poi, idx) => (
                    <TableRow key={poi.id}>
                      <TableCell sx={{ px: 1 }}>{idx + 1}</TableCell>
                      <TableCell sx={{ px: 1 }}>
                        <TextField
                          size="small"
                          value={poi.label || ""}
                          onChange={(e) => {
                            const updatedPois = pois.map(p =>
                              p.id === poi.id ? { ...p, label: e.target.value } : p
                            );
                            setPois(updatedPois);
                          }}
                          onBlur={(e) => updatePoiLabel(poi.id, e.target.value)}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell sx={{ px: 1, fontSize: "0.75rem" }}>{Number(poi.latitude).toFixed(4)}</TableCell>
                      <TableCell sx={{ px: 1, fontSize: "0.75rem" }}>{Number(poi.longitude).toFixed(4)}</TableCell>
                      <TableCell align="center" sx={{ px: 1 }}>
                        <Chip
                          label={poi.media_count || 0}
                          color={poi.media_count > 0 ? "primary" : "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ px: 0 }}>
                        <IconButton
                          color="primary"
                          onClick={() => openEditPoiModal(poi)}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => deletePoi(poi.id)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pois.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3, color: "text.secondary" }}>
                        {t('poiManager.empty')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Dialog Edit POI con gestione Media */}
      <Dialog open={editPoiModal} onClose={uploadingMedia ? undefined : closeEditPoiModal} fullWidth maxWidth="md">
        <DialogTitle>
          {t('poiManager.dialog.editTitle', { label: selectedPoiForEdit?.label })}
        </DialogTitle>
        <DialogContent>
          {selectedPoiForEdit && (
            <Box>
              {/* Coordinate POI (read-only) */}
              <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
                <TextField
                  label={t('poiManager.table.lat')}
                  value={Number(selectedPoiForEdit.latitude).toFixed(6)}
                  disabled
                  sx={{ flex: 1 }}
                />
                <TextField
                  label={t('poiManager.table.lng')}
                  value={Number(selectedPoiForEdit.longitude).toFixed(6)}
                  disabled
                  sx={{ flex: 1 }}
                />
              </Box>

              {/* Traduzioni POI con Tabs */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {t('poiManager.dialog.translations.title')}
                </Typography>

                {loadingTranslations ? (
                  <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <>
                    <Tabs
                      value={AVAILABLE_LANGUAGES.findIndex(l => l.code === selectedLang)}
                      onChange={(e, newValue) => setSelectedLang(AVAILABLE_LANGUAGES[newValue].code)}
                      variant="scrollable"
                      scrollButtons="auto"
                      sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
                    >
                      {AVAILABLE_LANGUAGES.map((lang) => (
                        <Tab
                          key={lang.code}
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <span>{lang.flag}</span>
                              <span>{lang.nativeName}</span>
                              {lang.code === 'en' && (
                                <Chip label="*" size="small" color="primary" sx={{ height: 18, fontSize: '0.7rem' }} />
                              )}
                              {translationsDirty[lang.code] && (
                                <Box
                                  component="span"
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    bgcolor: 'warning.main',
                                    ml: 0.5
                                  }}
                                />
                              )}
                            </Box>
                          }
                        />
                      ))}
                    </Tabs>

                    {AVAILABLE_LANGUAGES.map((lang) => (
                      <Box
                        key={lang.code}
                        role="tabpanel"
                        hidden={selectedLang !== lang.code}
                        sx={{ pt: 1 }}
                      >
                        {selectedLang === lang.code && (
                          <Box>
                            <TextField
                              label={`${t('poiManager.dialog.name')} (${lang.nativeName})${lang.code === 'en' ? ' *' : ''}`}
                              fullWidth
                              required={lang.code === 'en'}
                              sx={{ mb: 2 }}
                              value={poiTranslations[lang.code]?.label || ''}
                              onChange={(e) => handleTranslationChange(lang.code, 'label', e.target.value)}
                            />

                            <TextField
                              label={`${t('poiManager.dialog.description')} (${lang.nativeName})`}
                              multiline
                              rows={3}
                              fullWidth
                              sx={{ mb: 2 }}
                              value={poiTranslations[lang.code]?.description || ''}
                              onChange={(e) => handleTranslationChange(lang.code, 'description', e.target.value)}
                              placeholder={t('poiManager.dialog.descriptionPlaceholder')}
                            />

                            <Button
                              variant="outlined"
                              onClick={() => handleSaveTranslation(lang.code)}
                              disabled={!translationsDirty[lang.code]}
                            >
                              {t('poiManager.dialog.translations.saveLanguage', { lang: lang.nativeName })}
                            </Button>
                          </Box>
                        )}
                      </Box>
                    ))}
                  </>
                )}
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Gestione Media */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {t('poiManager.dialog.media.sectionTitle', { count: poiMedia.length })}
                </Typography>

                {poiMediaError && (
                  <Alert severity="error" sx={{ mb: 2 }}>{poiMediaError}</Alert>
                )}

                {/* Form Aggiungi/Modifica Media */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 2 }}>
                      {editingPoiMedia ? t('poiManager.dialog.media.edit') : t('poiManager.dialog.media.new')}
                    </Typography>

                    {/* Tipo e Titolo */}
                    <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                      <FormControl sx={{ minWidth: 150 }} disabled={uploadingMedia}>
                        <InputLabel>{t('poiManager.dialog.media.type.label')}</InputLabel>
                        <Select
                          value={poiMediaForm.type}
                          label={t('poiManager.dialog.media.type.label')}
                          onChange={(e) => {
                            const newType = e.target.value;
                            setPoiMediaForm(prev => ({
                              ...prev,
                              type: newType,
                              // Se tipo image o video, imposta lingua di default a english
                              lang: (newType === "image" || newType === "video") ? "en" : prev.lang
                            }));
                            setSelectedFile(null); // Reset file quando cambia tipo
                          }}
                        >
                          <MenuItem value="image">{t('poiManager.dialog.media.type.image')}</MenuItem>
                          <MenuItem value="video">{t('poiManager.dialog.media.type.video')}</MenuItem>
                          <MenuItem value="audio">{t('poiManager.dialog.media.type.audio')}</MenuItem>
                          <MenuItem value="text">{t('poiManager.dialog.media.type.text')}</MenuItem>
                        </Select>
                      </FormControl>

                      <TextField
                        label={t('poiManager.dialog.media.title')}
                        sx={{ flex: 1 }}
                        value={poiMediaForm.title}
                        onChange={(e) => setPoiMediaForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder={t('poiManager.dialog.media.titlePlaceholder')}
                        disabled={uploadingMedia}
                      />
                    </Box>

                    {/* Selezione Lingua (nascosto per tipo image e video, default english) */}
                    {poiMediaForm.type !== "image" && poiMediaForm.type !== "video" && (
                      <FormControl fullWidth sx={{ mb: 2 }} disabled={uploadingMedia}>
                        <InputLabel>{t('poiManager.dialog.media.language')}</InputLabel>
                        <Select
                          value={poiMediaForm.lang}
                          label={t('poiManager.dialog.media.language')}
                          onChange={(e) => setPoiMediaForm(prev => ({ ...prev, lang: e.target.value }))}
                        >
                          {AVAILABLE_LANGUAGES.map(lang => (
                            <MenuItem key={lang.code} value={lang.code}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <span>{lang.flag}</span>
                                <span>{lang.nativeName}</span>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}

                    {/* Campo Content (solo per tipo "text") */}
                    {poiMediaForm.type === "text" && (
                      <TextField
                        label={t('poiManager.dialog.media.content')}
                        multiline
                        rows={5}
                        fullWidth
                        sx={{ mb: 2 }}
                        value={poiMediaForm.content}
                        onChange={(e) => setPoiMediaForm(prev => ({ ...prev, content: e.target.value }))}
                        placeholder={t('poiManager.dialog.media.contentPlaceholder')}
                        helperText={t('poiManager.dialog.media.contentHelper')}
                        disabled={uploadingMedia}
                      />
                    )}

                    {/* Upload File (per image, audio e video) */}
                    {(poiMediaForm.type === "image" || poiMediaForm.type === "audio" || poiMediaForm.type === "video") && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {poiMediaForm.type === "image"
                            ? t('poiManager.dialog.media.uploadOrUrl')
                            : poiMediaForm.type === "audio"
                            ? t('poiManager.dialog.media.uploadAudioOrUrl')
                            : t('poiManager.dialog.media.uploadVideoOrUrl', 'Carica un file video o inserisci un URL')}
                          {poiMediaForm.type === "video" && (
                            <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.disabled' }}>
                              (max 100MB - MP4, WebM, OGG, MOV, AVI, MKV)
                            </Typography>
                          )}
                          {(poiMediaForm.type === "image" || poiMediaForm.type === "audio") && (
                            <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.disabled' }}>
                              (max 10MB)
                            </Typography>
                          )}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                          <Button
                            variant="outlined"
                            component="label"
                            startIcon={<UploadFileIcon />}
                            disabled={uploadingMedia}
                          >
                            {t('poiManager.dialog.media.chooseFile')}
                            <input
                              type="file"
                              hidden
                              accept={
                                poiMediaForm.type === "image" ? "image/*" :
                                poiMediaForm.type === "audio" ? "audio/*" :
                                "video/*"
                              }
                              onChange={handleFileChange}
                              disabled={uploadingMedia}
                            />
                          </Button>
                          {selectedFile && (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Chip
                                label={`${selectedFile.name} (${selectedFile.size > 1024 * 1024 ? (selectedFile.size / (1024 * 1024)).toFixed(1) + ' MB' : (selectedFile.size / 1024).toFixed(1) + ' KB'})`}
                                onDelete={clearSelectedFile}
                                color="primary"
                                variant="outlined"
                              />
                            </Box>
                          )}
                        </Box>
                        {selectedFile && (
                          <Alert severity="info" sx={{ mt: 1 }}>
                            {t('poiManager.dialog.media.fileSelected')}
                          </Alert>
                        )}
                      </Box>
                    )}
                    
                    {/* URL (nascosto per tipo "text", opzionale per image/audio con file) */}
                    {poiMediaForm.type !== "text" && (
                      <TextField
                        label={selectedFile ? t('poiManager.dialog.media.urlOptional') : t('poiManager.dialog.media.url')}
                        fullWidth
                        sx={{ mb: 2 }}
                        value={poiMediaForm.url}
                        onChange={(e) => setPoiMediaForm(prev => ({ ...prev, url: e.target.value }))}
                        disabled={uploadingMedia}
                        placeholder={
                          poiMediaForm.type === "video"
                            ? (selectedFile ? t('poiManager.dialog.media.urlOptional') : t('poiManager.dialog.media.youtubePlaceholder'))
                            : poiMediaForm.type === "image"
                            ? t('poiManager.dialog.media.imagePlaceholder')
                            : poiMediaForm.type === "audio"
                            ? t('poiManager.dialog.media.audioPlaceholder')
                            : t('poiManager.dialog.media.urlPlaceholder')
                        }
                        helperText={
                          selectedFile
                            ? t('poiManager.dialog.media.optionalWithFile')
                            : poiMediaForm.type === "video"
                            ? t('poiManager.dialog.media.youtubeHelper')
                            : ""
                        }
                      />
                    )}
                    
                    {/* Barra di progresso upload */}
                    {uploadingMedia && (
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <LinearProgress
                              variant={uploadProgress > 0 ? "determinate" : "indeterminate"}
                              value={uploadProgress}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 45 }}>
                            {uploadProgress > 0 ? `${uploadProgress}%` : ""}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {uploadProgress < 100
                            ? t('poiManager.dialog.media.uploading')
                            : t('poiManager.dialog.media.processing')}
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ display: "flex", gap: 2 }}>
                      {editingPoiMedia ? (
                        <>
                          <Button variant="contained" onClick={handleUpdatePoiMedia} disabled={uploadingMedia}>
                            {uploadingMedia ? t('poiManager.dialog.media.uploading') : t('poiManager.dialog.media.update')}
                          </Button>
                          <Button variant="outlined" onClick={cancelEditPoiMedia} disabled={uploadingMedia}>
                            {t('poiManager.dialog.media.cancel')}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="contained"
                          onClick={handleAddPoiMedia}
                          startIcon={uploadingMedia ? <CircularProgress size={18} color="inherit" /> : <AddIcon />}
                          disabled={uploadingMedia}
                        >
                          {uploadingMedia ? t('poiManager.dialog.media.uploading') : t('poiManager.dialog.media.add')}
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>

                {/* Lista Media Esistenti */}
                {loadingPoiMedia ? (
                  <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {poiMedia.map((media, index) => {
                      const langInfo = getLanguageInfo(media.lang);
                      
                      return (
                        <Card key={media.id} variant="outlined">
                          <CardContent>
                            <Box sx={{ display: "flex", gap: 2 }}>
                              <Box sx={{ minWidth: 200 }}>
                                {renderMediaPreview(media)}
                              </Box>
                              
                              <Box sx={{ flex: 1 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
                                  {getMediaIcon(media.type)}
                                  <Typography variant="h6">
                                    {media.title || `${media.type.charAt(0).toUpperCase() + media.type.slice(1)} ${index + 1}`}
                                  </Typography>
                                  <Chip label={media.type} size="small" />
                                  {media.lang && media.type !== "image" && media.type !== "video" && (
                                    <Chip
                                      label={`${langInfo.flag} ${langInfo.nativeName}`}
                                      size="small"
                                      color="primary"
                                      variant="outlined"
                                    />
                                  )}
                                </Box>
                                
                                {media.type === "text" && media.content && (
                                  <Typography 
                                    variant="body2" 
                                    color="text.secondary" 
                                    sx={{ 
                                      mb: 2,
                                      display: "-webkit-box",
                                      WebkitLineClamp: 3,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden"
                                    }}
                                  >
                                    {media.content}
                                  </Typography>
                                )}
                                
                                {media.url && media.type !== "text" && (
                                  <Typography 
                                    variant="body2" 
                                    color="text.secondary" 
                                    sx={{ 
                                      mb: 2,
                                      wordBreak: "break-all"
                                    }}
                                  >
                                    {media.url}
                                  </Typography>
                                )}
                                
                                <Box sx={{ display: "flex", gap: 1 }}>
                                  <Button
                                    size="small"
                                    color="error"
                                    startIcon={<DeleteIcon />}
                                    onClick={() => handleDeletePoiMedia(media.id)}
                                  >
                                    {t('poiManager.buttons.delete')}
                                  </Button>
                                  {media.type !== "other" && media.type !== "text" && media.url && (
                                    <Button
                                      size="small"
                                      href={media.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {t('poiManager.buttons.open')}
                                    </Button>
                                  )}
                                </Box>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })}
                    
                    {poiMedia.length === 0 && (
                      <Box sx={{
                        textAlign: "center",
                        py: 4,
                        color: "text.secondary",
                        border: "2px dashed",
                        borderColor: "grey.300",
                        borderRadius: 1
                      }}>
                        <Typography variant="body1">
                          {t('poiManager.dialog.media.noneTitle')}
                        </Typography>
                        <Typography variant="body2">
                          {t('poiManager.dialog.media.noneSubtitle')}
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
          <Button onClick={closeEditPoiModal} disabled={uploadingMedia}>{t('poiManager.buttons.close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

export default POIManager;