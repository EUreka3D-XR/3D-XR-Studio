import React, { useState, useEffect, useCallback  } from "react";
import MapIcon from '@mui/icons-material/Map';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress
} from "@mui/material";
import environmentsApi from "../services/environmentsApi";
import { useTranslation } from 'react-i18next';

const EnvironmentBasicForm = ({ 
  environmentId, 
  isCreating, 
  onSave, 
  onCancel,
  onEnvironmentDataChange,
  onSurfaceAreaModeChange,  // NUOVO: callback per notificare il parent
  onRequestMapCoordinateHandler  // NUOVO: callback per passare la funzione di ricezione coordinate mappa
}) => {
  const { t } = useTranslation('translation');

  const [formData, setFormData] = useState({
    name: "",
    latitude: "",
    longitude: "",
    surface_area: {
      topLeft: { lat: "", lng: "" },
      topRight: { lat: "", lng: "" },
      bottomLeft: { lat: "", lng: "" },
      bottomRight: { lat: "", lng: "" },
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);

const [surfaceAreaMode, setSurfaceAreaMode] = useState(false);
const [selectedVertex, setSelectedVertex] = useState(null); // "topLeft" | "topRight" | "bottomLeft" | "bottomRight" | null

  useEffect(() => {
    if (!isCreating && environmentId) {
      loadEnvironmentData();
    }
  }, [environmentId, isCreating]);

  // Notifica il componente parent quando cambiano i dati
  useEffect(() => {
    if (onEnvironmentDataChange) {
      onEnvironmentDataChange(formData);
    }
  }, [formData, onEnvironmentDataChange]);

useEffect(() => {
  if (onSurfaceAreaModeChange) {
    onSurfaceAreaModeChange(surfaceAreaMode, selectedVertex);
  }
}, [surfaceAreaMode, selectedVertex, onSurfaceAreaModeChange]);


  const loadEnvironmentData = async () => {
    try {
      setLoading(true);
      const envData = await environmentsApi.getEnvironmentDetails(environmentId);
      
      setFormData({
        name: envData.name || "",
        latitude: envData.position?.lat || "",
        longitude: envData.position?.long || "",
        surface_area: envData.surface_area || {
          topLeft: { lat: "", lng: "" },
          topRight: { lat: "", lng: "" },
          bottomLeft: { lat: "", lng: "" },
          bottomRight: { lat: "", lng: "" },
        }
      });
    } catch (error) {
      console.error("Errore nel caricamento dei dati ambiente:", error);
      setError(t("environmentBasicForm.errors.load"));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Pulisci gli errori quando l'utente inizia a digitare
    if (error) setError("");
    if (validationErrors.length > 0) setValidationErrors([]);
  };

  const handleSurfaceAreaChange = (vertex, coordinate, value) => {
    setFormData(prev => ({
      ...prev,
      surface_area: {
        ...prev.surface_area,
        [vertex]: {
          ...prev.surface_area[vertex],
          [coordinate]: value
        }
      }
    }));
  };

  const validateForm = () => {
    const dataToValidate = {
      name: formData.name,
      latitude: formData.latitude,
      longitude: formData.longitude,
      surface_area: formData.surface_area
    };

    const validation = environmentsApi.validateEnvironmentData(dataToValidate);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const submitData = {
        name: formData.name,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        surface_area: formData.surface_area
      };

      if (isCreating) {
        await environmentsApi.createEnvironment(submitData);
      } else {
        await environmentsApi.updateEnvironment(environmentId, submitData);
      }

      if (onSave) {
        onSave(submitData);
      }
    } catch (error) {
      console.error("Errore nel salvataggio:", error);
      setError(error.message || t("environmentBasicForm.errors.save"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

 // Funzione chiamata dal parent quando l'utente clicca sulla mappa
const handleMapCoordinateReceived = useCallback((lat, lng) => {
  if (!selectedVertex) return;
  
  setFormData(prev => ({
    ...prev,
    surface_area: {
      ...prev.surface_area,
      [selectedVertex]: {
        lat: lat.toString(),
        lng: lng.toString()
      }
    }
  }));
}, [selectedVertex]);

// Registra la funzione handleMapCoordinateReceived con il parent
useEffect(() => {
  if (onRequestMapCoordinateHandler) {
    onRequestMapCoordinateHandler(handleMapCoordinateReceived);
  }
}, [onRequestMapCoordinateHandler, handleMapCoordinateReceived]);


// Handler per selezionare un vertice cliccando sul campo input
const handleVertexFieldClick = (vertex) => {
  if (surfaceAreaMode) {
    setSelectedVertex(vertex);
  }
};

const handleToggleSurfaceAreaMode = () => {
  const newMode = !surfaceAreaMode;
  setSurfaceAreaMode(newMode);
  
  if (!newMode) {
    setSelectedVertex(null);
  }
};

  if (loading && isCreating) {
    return (
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3, textAlign: "center" }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          {t("environmentBasicForm.loading")}
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
      <Typography variant="h5" color="primary" sx={{ mb: 3 }}>
        {isCreating ? t("environmentBasicForm.title.create") : t("environmentBasicForm.title.edit")}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {validationErrors.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        {/* Nome Ambiente */}
        <TextField
          fullWidth
          label={t("environmentBasicForm.fields.name")}
          variant="outlined"
          value={formData.name}
          onChange={(e) => handleInputChange("name", e.target.value)}
          sx={{ mb: 2 }}
          required
        />

        {/* Coordinate Centrali */}
        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            label={t("environmentBasicForm.fields.longitude")}
            type="number"
            variant="outlined"
            value={formData.longitude}
            onChange={(e) => handleInputChange("longitude", e.target.value)}
            inputProps={{ step: "any" }}
            required
          />
          <TextField
            fullWidth
            label={t("environmentBasicForm.fields.latitude")}
            type="number"
            variant="outlined"
            value={formData.latitude}
            onChange={(e) => handleInputChange("latitude", e.target.value)}
            inputProps={{ step: "any" }}
            required
          />
        </Box>

        {/* Superficie - 4 coordinate */}
<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 3, mb: 2 }}>
  <Typography variant="h6">
    {t("environmentBasicForm.fields.surface")}
  </Typography>
  <Button
    variant={surfaceAreaMode ? "contained" : "outlined"}
    color={surfaceAreaMode ? "success" : "primary"}
    size="small"
    onClick={handleToggleSurfaceAreaMode}
    startIcon={surfaceAreaMode ? <CheckCircleIcon /> : <MapIcon />}
  >
    {surfaceAreaMode ? t("environmentBasicForm.buttons.mapModeActive") : t("environmentBasicForm.buttons.defineOnMap")}
  </Button>
</Box>

{surfaceAreaMode && (
  <Alert severity="info" sx={{ mb: 2 }}>
    {t("environmentBasicForm.surfaceMode.hint")}
    {selectedVertex && ` ${t("environmentBasicForm.surfaceMode.selectedVertex", { vertex: selectedVertex })}`}
  </Alert>
)}
        
{/* Top coordinates */}
<Box sx={{ display: "flex", gap: 2, mb: 2 }}>
  <TextField
    fullWidth
    type="number"
    label={`${t("environmentBasicForm.fields.topLeft")} Lng`}
    variant="outlined"
    value={formData.surface_area.topLeft.lng}
    onChange={(e) => handleSurfaceAreaChange("topLeft", "lng", e.target.value)}
    onClick={() => handleVertexFieldClick("topLeft")}
    inputProps={{ step: "any" }}
    sx={{ 
      flex: 0.25,
      '& .MuiOutlinedInput-root': {
        '& fieldset': {
          borderColor: selectedVertex === "topLeft" ? 'success.main' : undefined,
          borderWidth: selectedVertex === "topLeft" ? 2 : 1,
        }
      }
    }}
  />
  <TextField
    fullWidth
    type="number"
    label={`${t("environmentBasicForm.fields.topLeft")} Lat`}
    variant="outlined"
    value={formData.surface_area.topLeft.lat}
    onChange={(e) => handleSurfaceAreaChange("topLeft", "lat", e.target.value)}
    onClick={() => handleVertexFieldClick("topLeft")}
    inputProps={{ step: "any" }}
    sx={{ 
      flex: 0.25,
      '& .MuiOutlinedInput-root': {
        '& fieldset': {
          borderColor: selectedVertex === "topLeft" ? 'success.main' : undefined,
          borderWidth: selectedVertex === "topLeft" ? 2 : 1,
        }
      }
    }}
  />
  <TextField
    fullWidth
    type="number"
    label={`${t("environmentBasicForm.fields.topRight")} Lng`}
    variant="outlined"
    value={formData.surface_area.topRight.lng}
    onChange={(e) => handleSurfaceAreaChange("topRight", "lng", e.target.value)}
    onClick={() => handleVertexFieldClick("topRight")}
    inputProps={{ step: "any" }}
    sx={{ 
      flex: 0.25,
      '& .MuiOutlinedInput-root': {
        '& fieldset': {
          borderColor: selectedVertex === "topRight" ? 'success.main' : undefined,
          borderWidth: selectedVertex === "topRight" ? 2 : 1,
        }
      }
    }}
  />
  <TextField
    fullWidth
    type="number"
    label={`${t("environmentBasicForm.fields.topRight")} Lat`}
    variant="outlined"
    value={formData.surface_area.topRight.lat}
    onChange={(e) => handleSurfaceAreaChange("topRight", "lat", e.target.value)}
    onClick={() => handleVertexFieldClick("topRight")}
    inputProps={{ step: "any" }}
    sx={{ 
      flex: 0.25,
      '& .MuiOutlinedInput-root': {
        '& fieldset': {
          borderColor: selectedVertex === "topRight" ? 'success.main' : undefined,
          borderWidth: selectedVertex === "topRight" ? 2 : 1,
        }
      }
    }}
  />
</Box>

{/* Bottom coordinates */}
<Box sx={{ display: "flex", gap: 2, mb: 3 }}>
  <TextField
    fullWidth
    type="number"
    label={`${t("environmentBasicForm.fields.bottomLeft")} Lng`}
    variant="outlined"
    value={formData.surface_area.bottomLeft.lng}
    onChange={(e) => handleSurfaceAreaChange("bottomLeft", "lng", e.target.value)}
    onClick={() => handleVertexFieldClick("bottomLeft")}
    inputProps={{ step: "any" }}
    sx={{ 
      flex: 0.25,
      '& .MuiOutlinedInput-root': {
        '& fieldset': {
          borderColor: selectedVertex === "bottomLeft" ? 'success.main' : undefined,
          borderWidth: selectedVertex === "bottomLeft" ? 2 : 1,
        }
      }
    }}
  />
  <TextField
    fullWidth
    type="number"
    label={`${t("environmentBasicForm.fields.bottomLeft")} Lat`}
    variant="outlined"
    value={formData.surface_area.bottomLeft.lat}
    onChange={(e) => handleSurfaceAreaChange("bottomLeft", "lat", e.target.value)}
    onClick={() => handleVertexFieldClick("bottomLeft")}
    inputProps={{ step: "any" }}
    sx={{ 
      flex: 0.25,
      '& .MuiOutlinedInput-root': {
        '& fieldset': {
          borderColor: selectedVertex === "bottomLeft" ? 'success.main' : undefined,
          borderWidth: selectedVertex === "bottomLeft" ? 2 : 1,
        }
      }
    }}
  />
  <TextField
    fullWidth
    type="number"
    label={`${t("environmentBasicForm.fields.bottomRight")} Lng`}
    variant="outlined"
    value={formData.surface_area.bottomRight.lng}
    onChange={(e) => handleSurfaceAreaChange("bottomRight", "lng", e.target.value)}
    onClick={() => handleVertexFieldClick("bottomRight")}
    inputProps={{ step: "any" }}
    sx={{ 
      flex: 0.25,
      '& .MuiOutlinedInput-root': {
        '& fieldset': {
          borderColor: selectedVertex === "bottomRight" ? 'success.main' : undefined,
          borderWidth: selectedVertex === "bottomRight" ? 2 : 1,
        }
      }
    }}
  />
  <TextField
    fullWidth
    type="number"
    label={`${t("environmentBasicForm.fields.bottomRight")} Lat`}
    variant="outlined"
    value={formData.surface_area.bottomRight.lat}
    onChange={(e) => handleSurfaceAreaChange("bottomRight", "lat", e.target.value)}
    onClick={() => handleVertexFieldClick("bottomRight")}
    inputProps={{ step: "any" }}
    sx={{ 
      flex: 0.25,
      '& .MuiOutlinedInput-root': {
        '& fieldset': {
          borderColor: selectedVertex === "bottomRight" ? 'success.main' : undefined,
          borderWidth: selectedVertex === "bottomRight" ? 2 : 1,
        }
      }
    }}
  />
</Box>

        {/* Bottoni azioni */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
          <Button 
            variant="contained" 
            color="primary" 
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                {t("environmentBasicForm.buttons.saving")}
              </>
            ) : (
              isCreating ? t("environmentBasicForm.buttons.create") : t("environmentBasicForm.buttons.save")
            )}
          </Button>
          <Button 
            variant="outlined" 
            color="error" 
            onClick={handleCancel}
            disabled={loading}
          >
            {t("environmentBasicForm.buttons.cancel")}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default EnvironmentBasicForm;