import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useTranslation } from 'react-i18next';
import {
  Container, Paper, TextField, Button, Typography, Box,
  Alert, CircularProgress, Divider
} from "@mui/material";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import { QRCodeSVG } from "qrcode.react";
import Navbar from "./Navbar";

const API = (__API_BASE_URL__ || "https://YOUR_BACKEND_API_URL").replace(/\/+$/, "");

const TotemForm = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { id } = useParams();
  const isEdit = Boolean(id);

  // Form state
  const [serialCode, setSerialCode] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Info aggiuntive (solo visualizzazione in edit)
  const [totemInfo, setTotemInfo] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    if (isEdit) {
      loadTotem(token);
    }
  }, [id, isEdit, navigate]);

  const loadTotem = async (token) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/api/totems/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data;
      setSerialCode(data.serial_code);
      setLabel(data.label || "");
      setTotemInfo(data);
    } catch (error) {
      console.error("Errore nel recupero del totem:", error);
      setError(t('totemForm.alerts.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const validateSerialCode = (code) => {
    if (!code) return true; // Vuoto = auto-generato
    const regex = /^[A-Z0-9]{10}$/;
    return regex.test(code);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validazione serial_code se fornito
    if (serialCode && !validateSerialCode(serialCode)) {
      setError(t('totemForm.alerts.invalidSerialCode'));
      return;
    }

    const token = localStorage.getItem("token");
    const payload = { label: label || null };

    // Includi serial_code solo se modificato o in creazione
    if (serialCode) {
      payload.serial_code = serialCode;
    }

    try {
      setLoading(true);
      if (isEdit) {
        await axios.put(`${API}/api/totems/${id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert(t('totemForm.alerts.updateSuccess'));
      } else {
        const response = await axios.post(`${API}/api/totems`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert(t('totemForm.alerts.createSuccess', { serialCode: response.data.totem.serial_code }));
      }
      navigate("/totem-management");
    } catch (error) {
      console.error("Errore nel salvataggio del totem:", error);
      setError(error.response?.data?.message || t('totemForm.alerts.saveError'));
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit && !totemInfo) {
    return (
      <>
        <Navbar />
        <Container maxWidth="sm" sx={{ mt: 4, textAlign: 'center' }}>
          <CircularProgress />
        </Container>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <QrCode2Icon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" color="primary">
              {isEdit ? t('totemForm.title.edit') : t('totemForm.title.create')}
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              label={t('totemForm.field.serialCode')}
              variant="outlined"
              fullWidth
              sx={{ mb: 2 }}
              value={serialCode}
              onChange={(e) => setSerialCode(e.target.value.toUpperCase())}
              placeholder={t('totemForm.placeholder.serialCode')}
              helperText={t('totemForm.helper.serialCode')}
              inputProps={{
                maxLength: 10,
                style: { fontFamily: 'monospace', letterSpacing: '2px' }
              }}
            />

            <TextField
              label={t('totemForm.field.label')}
              variant="outlined"
              fullWidth
              sx={{ mb: 3 }}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('totemForm.placeholder.label')}
            />

            {/* Preview QR Code (solo se serial_code presente e valido) */}
            {serialCode && validateSerialCode(serialCode) && (
              <Box sx={{ textAlign: 'center', mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  {t('totemForm.qrPreview')}
                </Typography>
                <QRCodeSVG value={serialCode} size={150} level="H" />
                <Typography variant="caption" display="block" sx={{ mt: 1, fontFamily: 'monospace' }}>
                  {serialCode}
                </Typography>
              </Box>
            )}

            {/* Info aggiuntive in edit mode */}
            {isEdit && totemInfo && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {t('totemForm.info.title')}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('totemForm.info.assignedTo')}:
                    </Typography>
                    <Typography variant="body2">
                      {totemInfo.assigned_username || t('totemForm.info.notAssigned')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('totemForm.info.environment')}:
                    </Typography>
                    <Typography variant="body2">
                      {totemInfo.environment_name || t('totemForm.info.notPositioned')}
                    </Typography>
                  </Box>
                  {totemInfo.latitude && totemInfo.longitude && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        {t('totemForm.info.coordinates')}:
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {Number(totemInfo.latitude).toFixed(6)}, {Number(totemInfo.longitude).toFixed(6)}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('totemForm.info.createdAt')}:
                    </Typography>
                    <Typography variant="body2">
                      {new Date(totemInfo.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
              </>
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => navigate("/totem-management")}
                fullWidth
                size="large"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : (
                  isEdit ? t('totemForm.button.saveChanges') : t('totemForm.button.createTotem')
                )}
              </Button>
            </Box>
          </form>
        </Paper>
      </Container>
    </>
  );
};

export default TotemForm;
