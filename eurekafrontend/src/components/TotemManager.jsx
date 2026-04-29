import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  Box, Accordion, AccordionSummary, AccordionDetails,
  Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Button, Chip,
  Alert, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl,
  InputLabel, Card, CardContent
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteIcon from "@mui/icons-material/Delete";
import AddLocationIcon from "@mui/icons-material/AddLocation";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { useTranslation } from 'react-i18next';
import totemsApi from "../services/totemsApi";

const TotemManager = forwardRef(({
  environmentId,
  isCreating = false,
  onTotemsChange,
  onDataLoaded,
  totemsLoading = false,
  // Callbacks per rendering granulare
  onSingleTotemAdd,
  onSingleTotemUpdate,
  onSingleTotemRemove
}, ref) => {
  const { t } = useTranslation('translation');

  // Stati
  const [availableTotems, setAvailableTotems] = useState([]);
  const [positionedTotems, setPositionedTotems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Modal posizionamento manuale
  const [positionModal, setPositionModal] = useState(false);
  const [selectedTotemForPosition, setSelectedTotemForPosition] = useState(null);
  const [positionForm, setPositionForm] = useState({ latitude: "", longitude: "" });

  // Modal dettagli/QR
  const [detailModal, setDetailModal] = useState(false);
  const [selectedTotemForDetail, setSelectedTotemForDetail] = useState(null);
  const qrCanvasRef = useRef(null);

  // Carica totem all'avvio
  useEffect(() => {
    if (!isCreating && environmentId) {
      loadTotems();
    }
  }, [environmentId, isCreating]);

  // Notifica cambiamenti al parent
  useEffect(() => {
    if (onTotemsChange) {
      onTotemsChange(positionedTotems);
    }
  }, [positionedTotems, onTotemsChange]);

  const loadTotems = async () => {
    try {
      setLoading(true);
      setError("");

      // Carica totem disponibili e posizionati in parallelo
      const [availableResponse, positioned] = await Promise.all([
        totemsApi.listAvailableTotems(environmentId),
        totemsApi.listPositionedTotems(environmentId)
      ]);

      setAvailableTotems(availableResponse.available_totems || []);
      setPositionedTotems(positioned);

      if (onDataLoaded) {
        onDataLoaded(positioned);
      }
    } catch (err) {
      console.error("Errore caricamento totem:", err);
      setError(t('totemManager.alerts.loadError'));
    } finally {
      setLoading(false);
    }
  };

  // Esponi metodi al parent tramite ref
  useImperativeHandle(ref, () => ({
    // Chiamato quando l'utente clicca sulla mappa in totemMode
    async positionTotemAtCoords(latitude, longitude) {
      if (availableTotems.length === 0) {
        setError(t('totemManager.noAvailableTotems'));
        return;
      }
      // Apri modal per selezionare quale totem posizionare
      setPositionForm({ latitude: latitude.toFixed(6), longitude: longitude.toFixed(6) });
      setSelectedTotemForPosition(null); // L'utente deve selezionare
      setPositionModal(true);
    },

    // Aggiorna posizione di un totem esistente (dopo drag)
    async updateTotemPosition(totemId, latitude, longitude) {
      try {
        await totemsApi.positionTotem(totemId, {
          environment_id: Number(environmentId),
          latitude,
          longitude
        });
        // Aggiorna stato locale
        setPositionedTotems(prev => prev.map(t =>
          t.id === totemId ? { ...t, latitude, longitude } : t
        ));
        if (onSingleTotemUpdate) {
          const updatedTotem = positionedTotems.find(t => t.id === totemId);
          onSingleTotemUpdate({ ...updatedTotem, latitude, longitude });
        }
      } catch (err) {
        setError(t('totemManager.alerts.positionError'));
        throw err; // Rilancia per rollback marker
      }
    },

    // Ricarica lista totem
    reload: loadTotems
  }), [availableTotems, positionedTotems, environmentId, onSingleTotemUpdate, t]);

  // Posiziona totem (da modal)
  const handlePositionTotem = async () => {
    if (!selectedTotemForPosition) {
      setError(t('totemManager.selectToPosition'));
      return;
    }

    const { isValid, errors } = totemsApi.validateCoordinates(
      positionForm.latitude,
      positionForm.longitude
    );
    if (!isValid) {
      setError(errors.join(", "));
      return;
    }

    try {
      await totemsApi.positionTotem(selectedTotemForPosition.id, {
        environment_id: Number(environmentId),
        latitude: Number(positionForm.latitude),
        longitude: Number(positionForm.longitude)
      });

      // Aggiorna stati locali
      const positionedTotem = {
        ...selectedTotemForPosition,
        environment_id: Number(environmentId),
        latitude: Number(positionForm.latitude),
        longitude: Number(positionForm.longitude)
      };

      setAvailableTotems(prev => prev.filter(t => t.id !== selectedTotemForPosition.id));
      setPositionedTotems(prev => [...prev, positionedTotem]);

      // Notifica parent per rendering marker
      if (onSingleTotemAdd) {
        onSingleTotemAdd(positionedTotem);
      }

      setPositionModal(false);
      setSelectedTotemForPosition(null);
      setPositionForm({ latitude: "", longitude: "" });
      setError("");
    } catch (err) {
      console.error("Errore posizionamento totem:", err);
      setError(t('totemManager.alerts.positionError'));
    }
  };

  // Rimuovi posizionamento
  const handleUnpositionTotem = async (totem) => {
    if (!window.confirm(t('totemManager.confirm.removePosition'))) return;

    try {
      await totemsApi.unpositionTotem(totem.id);

      // Aggiorna stati locali
      setPositionedTotems(prev => prev.filter(t => t.id !== totem.id));
      setAvailableTotems(prev => [...prev, {
        ...totem,
        environment_id: null,
        latitude: null,
        longitude: null
      }]);

      // Notifica parent per rimuovere marker
      if (onSingleTotemRemove) {
        onSingleTotemRemove(totem.id);
      }
    } catch (err) {
      console.error("Errore rimozione posizionamento:", err);
      setError(t('totemManager.alerts.removeError'));
    }
  };

  // Apri modal dettagli con QR
  const openDetailModal = (totem) => {
    setSelectedTotemForDetail(totem);
    setDetailModal(true);
  };

  // Crea canvas con QR + label + serial code
  const createQRCanvas = () => {
    const qrCanvas = qrCanvasRef.current;
    if (!qrCanvas || !selectedTotemForDetail) return null;

    const padding = 40;
    const qrSize = qrCanvas.width;

    // Calcola larghezza necessaria per il testo
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = 'bold 20px Arial';
    const labelWidth = tempCtx.measureText(selectedTotemForDetail.label || '').width;
    tempCtx.font = '16px monospace';
    const serialWidth = tempCtx.measureText(selectedTotemForDetail.serial_code).width;
    const maxTextWidth = Math.max(labelWidth, serialWidth);

    const width = Math.max(qrSize, maxTextWidth) + padding * 2;
    const height = qrSize + padding * 2 + 80;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Sfondo bianco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // QR code centrato
    ctx.drawImage(qrCanvas, (width - qrSize) / 2, padding);

    // Label
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(selectedTotemForDetail.label || '', width / 2, qrSize + padding + 30);

    // Serial code
    ctx.fillStyle = '#666666';
    ctx.font = '16px monospace';
    ctx.fillText(selectedTotemForDetail.serial_code, width / 2, qrSize + padding + 58);

    return canvas;
  };

  // Download QR come immagine PNG
  const handleDownloadImage = () => {
    const canvas = createQRCanvas();
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `QR_${selectedTotemForDetail.serial_code}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Disegna una pagina QR vettoriale nel PDF
  const drawQRPage = (pdf, serialCode, label) => {
    const qrData = QRCode.create(serialCode, { errorCorrectionLevel: 'H' });
    const modules = qrData.modules;
    const moduleCount = modules.size;
    const pageWidth = pdf.internal.pageSize.getWidth();

    const qrSizeMm = 60;
    const moduleSizeMm = qrSizeMm / moduleCount;
    const qrX = (pageWidth - qrSizeMm) / 2;
    const qrY = 50;

    pdf.setFillColor(0, 0, 0);
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (modules.get(row, col)) {
          pdf.rect(
            qrX + col * moduleSizeMm,
            qrY + row * moduleSizeMm,
            moduleSizeMm,
            moduleSizeMm,
            'F'
          );
        }
      }
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(0, 0, 0);
    pdf.text(label, pageWidth / 2, qrY + qrSizeMm + 12, { align: 'center' });

    pdf.setFont('courier', 'normal');
    pdf.setFontSize(14);
    pdf.setTextColor(100, 100, 100);
    pdf.text(serialCode, pageWidth / 2, qrY + qrSizeMm + 22, { align: 'center' });
  };

  // Download QR come PDF (vettoriale)
  const handleDownloadPDF = () => {
    if (!selectedTotemForDetail) return;

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    drawQRPage(pdf, selectedTotemForDetail.serial_code, selectedTotemForDetail.label || '');
    pdf.save(`QR_${selectedTotemForDetail.serial_code}.pdf`);
  };

  // Download tutti i QR dei totem posizionati in un unico PDF multi-pagina
  const handleDownloadAllPDF = () => {
    if (positionedTotems.length === 0) return;

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    positionedTotems.forEach((totem, index) => {
      if (index > 0) pdf.addPage();
      drawQRPage(pdf, totem.serial_code, totem.label || '');
    });

    pdf.save('QR_all_totems.pdf');
  };

  if (isCreating) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QrCode2Icon color="primary" />
            {t('totemManager.title')}
            <Chip
              label={`${positionedTotems.length} / ${positionedTotems.length + availableTotems.length}`}
              size="small"
              color="primary"
              sx={{ ml: 1 }}
            />
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          {(loading || totemsLoading) ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Totem Disponibili */}
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                {t('totemManager.availableTotems')} ({availableTotems.length})
              </Typography>

              {availableTotems.length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  {t('totemManager.noAvailableTotems')}
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell>{t('totemManager.serialCode')}</TableCell>
                        <TableCell>{t('totemManager.label')}</TableCell>
                        <TableCell align="right">{t('common.actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {availableTotems.map(totem => (
                        <TableRow key={totem.id} hover>
                          <TableCell>
                            <Chip
                              label={totem.serial_code}
                              size="small"
                              variant="outlined"
                              sx={{ fontFamily: 'monospace' }}
                            />
                          </TableCell>
                          <TableCell>{totem.label || '-'}</TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              startIcon={<AddLocationIcon />}
                              onClick={() => {
                                setSelectedTotemForPosition(totem);
                                setPositionForm({ latitude: "", longitude: "" });
                                setPositionModal(true);
                              }}
                            >
                              {t('totemManager.manualPosition')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Totem Posizionati */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  {t('totemManager.positionedTotems')} ({positionedTotems.length})
                </Typography>
                {positionedTotems.length > 0 && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<PictureAsPdfIcon />}
                    onClick={handleDownloadAllPDF}
                  >
                    {t('totemManager.downloadAllPdf')}
                  </Button>
                )}
              </Box>

              {positionedTotems.length === 0 ? (
                <Alert severity="info">
                  {t('totemManager.noPositionedTotems')}
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell>{t('totemManager.serialCode')}</TableCell>
                        <TableCell>{t('totemManager.label')}</TableCell>
                        <TableCell>{t('totemManager.coordinates')}</TableCell>
                        <TableCell align="right">{t('common.actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {positionedTotems.map(totem => (
                        <TableRow key={totem.id} hover>
                          <TableCell>
                            <Chip
                              label={totem.serial_code}
                              size="small"
                              color="primary"
                              sx={{ fontFamily: 'monospace' }}
                            />
                          </TableCell>
                          <TableCell>{totem.label || '-'}</TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                              {Number(totem.latitude).toFixed(6)}, {Number(totem.longitude).toFixed(6)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => openDetailModal(totem)}
                              title={t('totemManager.qrPreview')}
                            >
                              <QrCode2Icon />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleUnpositionTotem(totem)}
                              title={t('totemManager.removePosition')}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Modal Posizionamento Manuale */}
      <Dialog open={positionModal} onClose={() => setPositionModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('totemManager.manualPosition')}</DialogTitle>
        <DialogContent>
          {/* Selezione totem (se non preselezionato) */}
          {!selectedTotemForPosition && availableTotems.length > 0 && (
            <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
              <InputLabel>{t('totemManager.selectToPosition')}</InputLabel>
              <Select
                value=""
                onChange={(e) => {
                  const totem = availableTotems.find(t => t.id === e.target.value);
                  setSelectedTotemForPosition(totem);
                }}
                label={t('totemManager.selectToPosition')}
              >
                {availableTotems.map(totem => (
                  <MenuItem key={totem.id} value={totem.id}>
                    {totem.serial_code} {totem.label ? `- ${totem.label}` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {selectedTotemForPosition && (
            <Card sx={{ mb: 2, mt: 1, bgcolor: 'primary.50' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="subtitle2">
                  {t('totemManager.serialCode')}: <strong>{selectedTotemForPosition.serial_code}</strong>
                </Typography>
                {selectedTotemForPosition.label && (
                  <Typography variant="body2" color="text.secondary">
                    {selectedTotemForPosition.label}
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}

          <TextField
            fullWidth
            label={t('totemManager.form.latitude')}
            type="number"
            value={positionForm.latitude}
            onChange={(e) => setPositionForm(prev => ({ ...prev, latitude: e.target.value }))}
            sx={{ mb: 2 }}
            inputProps={{ step: "0.000001", min: -90, max: 90 }}
          />
          <TextField
            fullWidth
            label={t('totemManager.form.longitude')}
            type="number"
            value={positionForm.longitude}
            onChange={(e) => setPositionForm(prev => ({ ...prev, longitude: e.target.value }))}
            inputProps={{ step: "0.000001", min: -180, max: 180 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPositionModal(false)}>
            {t('totemManager.form.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handlePositionTotem}
            disabled={!selectedTotemForPosition || !positionForm.latitude || !positionForm.longitude}
          >
            {t('totemManager.form.submit')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Dettagli + QR */}
      <Dialog open={detailModal} onClose={() => setDetailModal(false)} maxWidth="sm">
        <DialogTitle>{t('totemManager.qrPreview')}</DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          {selectedTotemForDetail && (
            <>
              <Box sx={{ p: 2, bgcolor: 'white', display: 'inline-block', mb: 2, borderRadius: 2 }}>
                <QRCodeCanvas
                  ref={qrCanvasRef}
                  value={selectedTotemForDetail.serial_code}
                  size={200}
                  level="H"
                />
              </Box>
              <Typography variant="h6">{selectedTotemForDetail.label || '-'}</Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', mt: 1 }}>
                {selectedTotemForDetail.serial_code}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {t('totemManager.coordinates')}: {Number(selectedTotemForDetail.latitude).toFixed(6)}, {Number(selectedTotemForDetail.longitude).toFixed(6)}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailModal(false)}>
            {t('common.close')}
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadImage}>
            {t('totemManager.downloadImage')}
          </Button>
          <Button variant="contained" startIcon={<PictureAsPdfIcon />} onClick={handleDownloadPDF}>
            {t('totemManager.downloadPdf')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

TotemManager.displayName = 'TotemManager';
export default TotemManager;
