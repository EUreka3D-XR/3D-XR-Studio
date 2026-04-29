import React from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  ButtonGroup
} from "@mui/material";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import RouteIcon from "@mui/icons-material/Route";
import PlaceIcon from "@mui/icons-material/Place";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import { useTranslation } from 'react-i18next';

const ModeControls = ({
  routeMode,
  poiMode,
  objectMode,
  totemMode,

  // Loading states
  routeLoading = false,
  poisLoading = false,
  totemsLoading = false,

  onRouteModeChange,
  onPoiModeChange,
  onObjectModeChange,
  onTotemModeChange,

  // Stato creazione ambiente
  isCreating = false
}) => {
  const { t } = useTranslation('translation');

  // Handler per selezione esclusiva
  const handleModeSelect = (mode) => {
    if (mode === 'object') {
      onObjectModeChange?.(!objectMode);
      if (!objectMode) {
        onRouteModeChange?.(false);
        onPoiModeChange?.(false);
        onTotemModeChange?.(false);
      }
    } else if (mode === 'route') {
      onRouteModeChange?.(!routeMode);
      if (!routeMode) {
        onObjectModeChange?.(false);
        onPoiModeChange?.(false);
        onTotemModeChange?.(false);
      }
    } else if (mode === 'poi') {
      onPoiModeChange?.(!poiMode);
      if (!poiMode) {
        onObjectModeChange?.(false);
        onRouteModeChange?.(false);
        onTotemModeChange?.(false);
      }
    } else if (mode === 'totem') {
      onTotemModeChange?.(!totemMode);
      if (!totemMode) {
        onObjectModeChange?.(false);
        onRouteModeChange?.(false);
        onPoiModeChange?.(false);
      }
    }
  };

  if (isCreating) {
    return null;
  }

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5, color: "text.secondary", fontWeight: 500 }}>
        {t('modeControls.title')}
      </Typography>

      <ButtonGroup
        fullWidth
        sx={{
          '& .MuiButton-root': {
            py: 1,
            textTransform: 'none',
            fontWeight: 500
          }
        }}
      >
        {/* Bottone 3D Objects - Brand Blue */}
        <Button
          variant={objectMode ? "contained" : "outlined"}
          onClick={() => handleModeSelect('object')}
          startIcon={<ViewInArIcon />}
          sx={{
            bgcolor: objectMode ? '#00507f' : 'transparent',
            borderColor: '#00507f',
            color: objectMode ? 'white' : '#00507f',
            '&:hover': {
              bgcolor: objectMode ? '#003d61' : 'rgba(0, 80, 127, 0.08)',
              borderColor: '#003d61'
            }
          }}
        >
          {t('modeControls.objectMode.label')}
        </Button>

        {/* Bottone Route - Arancione */}
        <Button
          variant={routeMode ? "contained" : "outlined"}
          onClick={() => handleModeSelect('route')}
          disabled={routeLoading}
          startIcon={routeLoading ? <CircularProgress size={18} color="inherit" /> : <RouteIcon />}
          sx={{
            bgcolor: routeMode ? '#ea580c' : 'transparent',
            borderColor: '#ea580c',
            color: routeMode ? 'white' : '#ea580c',
            '&:hover': {
              bgcolor: routeMode ? '#c2410c' : 'rgba(234, 88, 12, 0.08)',
              borderColor: '#c2410c'
            },
            '&.Mui-disabled': {
              borderColor: '#ea580c',
              color: '#ea580c',
              opacity: 0.6
            }
          }}
        >
          {t('modeControls.routeMode.label')}
        </Button>

        {/* Bottone POI - Brand Green */}
        <Button
          variant={poiMode ? "contained" : "outlined"}
          onClick={() => handleModeSelect('poi')}
          disabled={poisLoading}
          startIcon={poisLoading ? <CircularProgress size={18} color="inherit" /> : <PlaceIcon />}
          sx={{
            bgcolor: poiMode ? '#95C11e' : 'transparent',
            borderColor: '#95C11e',
            color: poiMode ? 'white' : '#6b8a16',
            '&:hover': {
              bgcolor: poiMode ? '#7da619' : 'rgba(149, 193, 30, 0.08)',
              borderColor: '#7da619'
            },
            '&.Mui-disabled': {
              borderColor: '#95C11e',
              color: '#6b8a16',
              opacity: 0.6
            }
          }}
        >
          {t('modeControls.poiMode.label')}
        </Button>

        {/* Bottone Totem - Nero */}
        <Button
          variant={totemMode ? "contained" : "outlined"}
          onClick={() => handleModeSelect('totem')}
          disabled={totemsLoading}
          startIcon={totemsLoading ? <CircularProgress size={18} color="inherit" /> : <QrCode2Icon />}
          sx={{
            bgcolor: totemMode ? '#000000' : 'transparent',
            borderColor: '#000000',
            color: totemMode ? 'white' : '#000000',
            '&:hover': {
              bgcolor: totemMode ? '#333333' : 'rgba(0, 0, 0, 0.08)',
              borderColor: '#333333'
            },
            '&.Mui-disabled': {
              borderColor: '#000000',
              color: '#000000',
              opacity: 0.6
            }
          }}
        >
          {t('modeControls.totemMode.label')}
        </Button>
      </ButtonGroup>
    </Paper>
  );
};

export default ModeControls;
