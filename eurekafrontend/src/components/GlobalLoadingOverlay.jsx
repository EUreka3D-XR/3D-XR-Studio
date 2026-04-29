import React, { useSyncExternalStore } from "react";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { apiLoadingState } from "../services/axiosInstance";

const GlobalLoadingOverlay = () => {
  const { t } = useTranslation();

  const { loading, retrying } = useSyncExternalStore(
    apiLoadingState.subscribe,
    apiLoadingState.getState
  );

  if (!loading) return null;

  return (
    <Backdrop
      open
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        color: "#fff",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <CircularProgress color="inherit" size={48} />
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          {retrying
            ? t("globalLoading.retrying", "Riconnessione al server in corso...")
            : t("globalLoading.loading", "Caricamento in corso...")}
        </Typography>
        {retrying && (
          <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.8 }}>
            {t("globalLoading.retryHint", "Il server è temporaneamente occupato. Nuovo tentativo automatico...")}
          </Typography>
        )}
      </Box>
    </Backdrop>
  );
};

export default GlobalLoadingOverlay;
