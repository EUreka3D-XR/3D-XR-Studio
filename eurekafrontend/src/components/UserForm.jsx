import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useTranslation } from 'react-i18next';

const API = (__API_BASE_URL__ || "https://YOUR_BACKEND_API_URL").replace(/\/+$/, "");

import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  MenuItem,
} from "@mui/material";
import Navbar from "../components/Navbar";

const UserForm = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { id } = useParams(); // Se presente, siamo in modalità modifica
  const isEdit = Boolean(id);

  const [username, setUsername] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [role, setRole] = useState("viewer"); // Valore di default, può essere modificato
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    if (isEdit) {
      // Carica i dati dell'utente esistente (si assume che esista un endpoint GET /api/users/:id)
      axios
        .get(`${API}/api/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => {
          const data = response.data;
          setUsername(data.username);
          setFirstname(data.firstname);
          setLastname(data.lastname);
          setRole(data.role);
        })
        .catch((error) => {
          console.error("Errore nel recupero dell'utente:", error);
        });
    }
  }, [id, isEdit, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const payload = { username, firstname, lastname, role };

    try {
      if (isEdit) {
        // Aggiornamento dell'utente (senza modificare la password)
        await axios.put(`${API}/api/users/${id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert(t('userForm.alerts.updateSuccess'));
      } else {
        payload.password = "password123";
        await axios.post(`${API}/api/users`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert(t('userForm.alerts.createSuccess'));
      }
      navigate("/user-management");
    } catch (error) {
      console.error("Errore nel salvataggio dell'utente:", error);
      alert(t('userForm.alerts.saveError'));
    }
  };

  const handleResetPassword = async () => {
    // Resetta la password a "password123" inviando una PUT con il campo password
    const token = localStorage.getItem("token");
    const payload = { username, firstname, lastname, role, password: "password123" };
    try {
      await axios.put(`${API}/api/users/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(t('userForm.alerts.resetSuccess'));
    } catch (error) {
      console.error("Errore nel reset della password:", error);
      alert(t('userForm.alerts.resetError'));
    }
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="h5" color="primary" sx={{ mb: 3 }}>
            {isEdit ? t('userForm.title.edit') : t('userForm.title.create')}
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              label={t('userForm.field.username')}
              variant="outlined"
              fullWidth
              required
              sx={{ mb: 2 }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
              label={t('userForm.field.firstname')}
              variant="outlined"
              fullWidth
              required
              sx={{ mb: 2 }}
              value={firstname}
              onChange={(e) => setFirstname(e.target.value)}
            />
            <TextField
              label={t('userForm.field.lastname')}
              variant="outlined"
              fullWidth
              required
              sx={{ mb: 2 }}
              value={lastname}
              onChange={(e) => setLastname(e.target.value)}
            />
            <TextField
              select
              label={t('userForm.field.role')}
              variant="outlined"
              fullWidth
              required
              sx={{ mb: 2 }}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <MenuItem value="admin">{t('userForm.role.admin')}</MenuItem>
              <MenuItem value="editor">{t('userForm.role.editor')}</MenuItem>
              <MenuItem value="viewer">{t('userForm.role.viewer')}</MenuItem>
            </TextField>
            <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mb: 2 }}>
              {isEdit ? t('userForm.button.saveChanges') : t('userForm.button.createUser')}
            </Button>
            {isEdit && (
              <Button
                variant="outlined"
                color="secondary"
                fullWidth
                onClick={handleResetPassword}
              >
                {t('userForm.button.resetPasswordDefault')}
              </Button>
            )}
          </form>
        </Paper>
      </Container>
    </>
  );
};

export default UserForm;
