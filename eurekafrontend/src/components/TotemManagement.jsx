import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useTranslation } from 'react-i18next';
import {
  Button, Container, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography, Chip,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, Alert, Box,
  TextField, InputAdornment, ToggleButtonGroup, ToggleButton
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import SearchIcon from "@mui/icons-material/Search";
import Navbar from "./Navbar";

const API = (__API_BASE_URL__ || "https://YOUR_BACKEND_API_URL").replace(/\/+$/, "");

const TotemManagement = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Stati
  const [totems, setTotems] = useState([]);
  const [editors, setEditors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filtri
  const [filter, setFilter] = useState("all"); // all, unassigned, unpositioned
  const [searchTerm, setSearchTerm] = useState("");

  // Modal assegnazione
  const [assignModal, setAssignModal] = useState(false);
  const [selectedTotem, setSelectedTotem] = useState(null);
  const [selectedEditor, setSelectedEditor] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    } else {
      fetchTotems(token);
      fetchEditors(token);
    }
  }, [navigate]);

  const fetchTotems = async (token) => {
    try {
      setLoading(true);
      let url = `${API}/api/totems`;

      // Applica filtri
      const params = new URLSearchParams();
      if (filter === "unassigned") params.append("unassigned", "true");
      if (filter === "unpositioned") params.append("unpositioned", "true");

      if (params.toString()) url += `?${params.toString()}`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTotems(response.data);
    } catch (error) {
      console.error("Errore nel recupero dei totem:", error);
      setError(t('totemManagement.alerts.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const fetchEditors = async (token) => {
    try {
      const response = await axios.get(`${API}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Filtra solo editor e admin
      setEditors(response.data.filter(u => u.role === 'editor' || u.role === 'admin'));
    } catch (error) {
      console.error("Errore nel recupero degli editor:", error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('totemManagement.confirm.delete'))) return;

    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${API}/api/totems/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTotems(totems.filter((totem) => totem.id !== id));
    } catch (error) {
      console.error("Errore nella cancellazione del totem:", error);
      setError(t('totemManagement.alerts.deleteError'));
    }
  };

  const openAssignModal = (totem) => {
    setSelectedTotem(totem);
    setSelectedEditor(totem.assigned_to || "");
    setAssignModal(true);
  };

  const handleAssign = async () => {
    const token = localStorage.getItem("token");
    try {
      await axios.patch(
        `${API}/api/totems/${selectedTotem.id}/assign`,
        { user_id: selectedEditor || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Aggiorna lista
      fetchTotems(token);
      setAssignModal(false);
      setSelectedTotem(null);
    } catch (error) {
      console.error("Errore nell'assegnazione:", error);
      setError(error.response?.data?.message || t('totemManagement.alerts.assignError'));
    }
  };

  // Filtra per ricerca
  const filteredTotems = totems.filter(totem => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      totem.serial_code.toLowerCase().includes(search) ||
      (totem.label && totem.label.toLowerCase().includes(search)) ||
      (totem.assigned_username && totem.assigned_username.toLowerCase().includes(search))
    );
  });

  // Ricarica quando cambia filtro
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) fetchTotems(token);
  }, [filter]);

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <QrCode2Icon color="primary" sx={{ fontSize: 40 }} />
            <Typography variant="h4" color="primary">
              {t('totemManagement.title')}
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

          {/* Toolbar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<QrCode2Icon />}
              onClick={() => navigate("/totem-management/create")}
            >
              {t('totemManagement.button.createTotem')}
            </Button>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Ricerca */}
              <TextField
                size="small"
                placeholder={t('totemManagement.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 200 }}
              />

              {/* Filtri */}
              <ToggleButtonGroup
                value={filter}
                exclusive
                onChange={(e, newFilter) => newFilter && setFilter(newFilter)}
                size="small"
              >
                <ToggleButton value="all">{t('totemManagement.filter.all')}</ToggleButton>
                <ToggleButton value="unassigned">{t('totemManagement.filter.unassigned')}</ToggleButton>
                <ToggleButton value="unpositioned">{t('totemManagement.filter.unpositioned')}</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>

          {/* Tabella */}
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>{t('totemManagement.table.serialCode')}</TableCell>
                  <TableCell>{t('totemManagement.table.label')}</TableCell>
                  <TableCell>{t('totemManagement.table.assignedTo')}</TableCell>
                  <TableCell>{t('totemManagement.table.environment')}</TableCell>
                  <TableCell>{t('totemManagement.table.position')}</TableCell>
                  <TableCell>{t('totemManagement.table.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTotems.map((totem) => (
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
                      {totem.assigned_username ? (
                        <Chip
                          label={totem.assigned_username}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      ) : (
                        <Chip
                          label={t('totemManagement.notAssigned')}
                          size="small"
                          color="default"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell>{totem.environment_name || '-'}</TableCell>
                    <TableCell>
                      {totem.latitude && totem.longitude ? (
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {Number(totem.latitude).toFixed(4)}, {Number(totem.longitude).toFixed(4)}
                        </Typography>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        color="primary"
                        onClick={() => navigate(`/totem-management/edit/${totem.id}`)}
                        title={t('totemManagement.button.edit')}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color={totem.assigned_to ? "warning" : "success"}
                        onClick={() => openAssignModal(totem)}
                        title={totem.assigned_to ? t('totemManagement.button.changeAssignment') : t('totemManagement.button.assign')}
                        size="small"
                      >
                        {totem.assigned_to ? <PersonRemoveIcon /> : <PersonAddIcon />}
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDelete(totem.id)}
                        title={t('totemManagement.button.delete')}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTotems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary" sx={{ py: 3 }}>
                        {loading ? t('common.loading') : t('totemManagement.noTotems')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Container>

      {/* Modal Assegnazione */}
      <Dialog open={assignModal} onClose={() => setAssignModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedTotem?.assigned_to
            ? t('totemManagement.modal.changeAssignment')
            : t('totemManagement.modal.assignTotem')}
        </DialogTitle>
        <DialogContent>
          {selectedTotem && (
            <Box sx={{ mb: 3, mt: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {t('totemManagement.modal.totem')}:
              </Typography>
              <Typography variant="h6">
                {selectedTotem.serial_code}
                {selectedTotem.label && ` - ${selectedTotem.label}`}
              </Typography>
            </Box>
          )}

          {selectedTotem?.environment_id && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t('totemManagement.modal.warningPositioned')}
            </Alert>
          )}

          <FormControl fullWidth>
            <InputLabel>{t('totemManagement.modal.selectEditor')}</InputLabel>
            <Select
              value={selectedEditor}
              onChange={(e) => setSelectedEditor(e.target.value)}
              label={t('totemManagement.modal.selectEditor')}
            >
              <MenuItem value="">
                <em>{t('totemManagement.modal.noAssignment')}</em>
              </MenuItem>
              {editors.map(editor => (
                <MenuItem key={editor.id} value={editor.id}>
                  {editor.username} ({editor.firstname} {editor.lastname}) - {editor.role}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignModal(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="contained" onClick={handleAssign}>
            {selectedEditor ? t('totemManagement.modal.assign') : t('totemManagement.modal.revoke')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TotemManagement;
