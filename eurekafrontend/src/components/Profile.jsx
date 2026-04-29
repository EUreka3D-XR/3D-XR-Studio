import React, { useState, useEffect } from "react";
import { Container, Paper, TextField, Button, Typography } from "@mui/material";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useTranslation } from 'react-i18next';

const API = (__API_BASE_URL__ || "https://YOUR_BACKEND_API_URL").replace(/\/+$/, "");

const Profile = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    // GET /api/users/profile per recuperare le info dell'utente loggato
    axios
      .get(`${API}/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        const data = response.data;
        setUsername(data.username);
        setFirstname(data.firstname);
        setLastname(data.lastname);
      })
      .catch((error) => {
        console.error("Errore nel recupero del profilo:", error);
      });
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    if (newPassword && !currentPassword) {
      alert(t('profile.alerts.needCurrentForNew'));
      return;
    }
    // Prepara il payload: se si desidera modificare la password, includi currentPassword e newPassword
    const payload = { firstname, lastname };
    if (currentPassword && newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }
    try {
      // PUT /api/users/profile per aggiornare le info dell'utente
      await axios.put(`${API}/api/users/profile`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(t('profile.alerts.updateSuccess'));
      navigate("/home");
    } catch (error) {
      console.error("Errore nell'aggiornamento del profilo:", error);
      alert(t('profile.alerts.updateError'));
    }
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="h5" color="primary" sx={{ mb: 3 }}>
            {t('profile.title')}
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              label={t('profile.field.username')}
              variant="outlined"
              fullWidth
              sx={{ mb: 2 }}
              value={username}
              disabled
            />
            <TextField
              label={t('profile.field.firstname')}
              variant="outlined"
              fullWidth
              required
              sx={{ mb: 2 }}
              value={firstname}
              onChange={(e) => setFirstname(e.target.value)}
            />
            <TextField
              label={t('profile.field.lastname')}
              variant="outlined"
              fullWidth
              required
              sx={{ mb: 2 }}
              value={lastname}
              onChange={(e) => setLastname(e.target.value)}
            />
            <TextField
              label={t('profile.field.password.current')}
              variant="outlined"
              fullWidth
              type="password"
              sx={{ mb: 2 }}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <TextField
              label={t('profile.field.password.newOptional')}
              variant="outlined"
              fullWidth
              type="password"
              sx={{ mb: 2 }}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Button type="submit" variant="contained" color="primary" fullWidth>
              {t('profile.button.saveChanges')}
            </Button>
          </form>
        </Paper>
      </Container>
    </>
  );
};

export default Profile;
