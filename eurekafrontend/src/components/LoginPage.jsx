import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const API = (__API_BASE_URL__ || "https://YOUR_BACKEND_API_URL").replace(/\/+$/, "");

import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Paper,
  Divider,
  Alert,
  Link,
} from "@mui/material";
import { useTranslation } from 'react-i18next';

import logoImage from "../assets/3D_XR_Studio_Logo.svg";
import swingItLogo from "../assets/swingit_logo_xs.png";
import eureka3DLogo from "../assets/eureka3D_XR_Logo.png";


const EGI_LOGO_WHITE = "https://cdn.egi.eu/app/uploads/2022/02/EGI-Logo-White-SVG.svg";
const EGI_LOGO_COLOR = "https://cdn.egi.eu/app/uploads/2022/08/EGI_Logo_RGB.svg";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [egiHover, setEgiHover] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('translation');

  // Gestisce il callback da EGI Check-in
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      setError(t('login.errors.egiCheckin_withMsg', { error }));
      return;
    }

    if (code && state) {
      handleEGICallback(code, state);
    }
  }, [location]);

  const handleEGICallback = async (code, state) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/api/auth/egi-callback`, {
        code,
        state
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("role", response.data.role);
      navigate("/home");
    } catch (err) {
      setError(t("login.errors.egiAuth"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/api/auth/login`, {
        username,
        password,
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("role", response.data.role);
      navigate("/home");
    } catch (err) {
      setError(t("login.errors.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  const handleEGILogin = () => {
    setLoading(true);
    window.location.href = `${API}/api/auth/egi-login`;
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3, textAlign: "center" }}>
          <Typography>{t("login.loading")}</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      {/* Loghi esterni centrati sopra il form */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mb: 3 }}>
        <img 
          src={swingItLogo} 
          alt="SwingIt Logo" 
          style={{ height: '64px', width: 'auto' }}
        />
        <img 
          src={eureka3DLogo} 
          alt="Eureka3D XR Logo" 
          style={{ height: '64px', width: 'auto' }}
        />
      </Box>

      <Paper elevation={3} sx={{ p: 4, borderRadius: 3, textAlign: "center" }}>
        {/* Logo interno centrato in alto nella box */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <img 
            src={logoImage} 
            alt="3D XR Studio Logo" 
            style={{ height: '128px', width: 'auto' }}
          />
        </Box>

        <Typography variant="h5" color="primary" gutterBottom>
          {t("login.title")}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Login EGI Check-in — bottone conforme alle linee guida ufficiali EGI */}
        <Box sx={{ mb: 3 }}>
          <button
            onClick={handleEGILogin}
            disabled={loading}
            onMouseEnter={() => setEgiHover(true)}
            onMouseLeave={() => setEgiHover(false)}
            style={{
              display: 'block',
              width: '100%',
              padding: '20px 30px 20px 80px',
              border: '2px solid #005faa',
              borderRadius: '100vw',
              backgroundColor: egiHover ? '#fff' : '#005faa',
              backgroundImage: `url(${egiHover ? EGI_LOGO_COLOR : EGI_LOGO_WHITE})`,
              backgroundPosition: '30px 43%',
              backgroundSize: '36px',
              backgroundRepeat: 'no-repeat',
              transition: 'all 200ms ease-in-out',
              fontFamily: "'DM Sans', sans-serif",
              color: egiHover ? '#005faa' : '#fff',
              fontSize: '18px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              textAlign: 'center',
              boxSizing: 'border-box',
            }}
          >
            {t("login.button.egi")}
          </button>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {t("login.caption.egi")}
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }}>
          <Typography variant="body2" color="text.secondary">
            {t("login.divider.or")}
          </Typography>
        </Divider>

        {/* Login Tradizionale */}
        <Typography variant="h6" gutterBottom>
          {t("login.section.traditional")}
        </Typography>
        <form onSubmit={handleLogin}>
          <TextField
            label={t("login.field.username")}
            variant="outlined"
            fullWidth
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />
          <TextField
            label={t("login.field.password")}
            type="password"
            variant="outlined"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
            disabled={loading}
          >
            {t("login.button.submit")}
          </Button>
        </form>
      </Paper>

      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate("/terms")}
          sx={{ mx: 1 }}
        >
          {t("legal.terms")}
        </Link>
        {" | "}
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate("/privacy")}
          sx={{ mx: 1 }}
        >
          {t("legal.privacy")}
        </Link>
      </Box>
    </Container>
  );
};

export default LoginPage;
