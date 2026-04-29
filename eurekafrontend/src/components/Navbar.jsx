import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Button,
  Menu,
  MenuItem,
  Divider,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import LanguageSelector from '../components/LanguageSelector';
import { useTranslation } from 'react-i18next';


// Importa l'immagine del logo
import logoImage from "../assets/3D_XR_Studio_Logo.svg";
import swingItLogo from "../assets/swingit_logo_xs.png";
import eureka3DLogo from "../assets/eureka3D_XR_Logo.png";

const Navbar = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const username = localStorage.getItem("username");
  const role = localStorage.getItem("role"); // Recupera il ruolo dell'utente

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    navigate("/");
  };

  return (
    <AppBar sx={{ backgroundColor: "#00507f" }} position="static">
      <Toolbar>
        {/* Logo principale a sinistra */}
        <IconButton
          edge="start"
          color="inherit"
          onClick={() => navigate("/home")}
          sx={{ mr: 2 }}
        >
          <img
            src={logoImage}
            alt="3D XR Studio Logo"
            style={{
              height: "64px",
              width: "auto",
              objectFit: "contain"
            }}
          />
        </IconButton>
        
        {/* Titolo */}
        <Typography
          variant="h6"
          sx={{ cursor: "pointer", mr: 2 }}
          onClick={() => navigate("/home")}
        >
          3D XR Studio
        </Typography>

        {/* Contenitore centrato per i loghi aggiuntivi con sfondo bianco sfumato */}
        <div style={{
          flexGrow: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
            padding: "6px 40px",
            background: "linear-gradient(90deg, transparent 0%, #fff 15%, #fff 85%, transparent 100%)",
          }}>
            <img
              src={swingItLogo}
              alt="SwingIt Logo"
              style={{
                height: "64px",
                width: "auto",
                objectFit: "contain"
              }}
            />
            <img
              src={eureka3DLogo}
              alt="Eureka3D XR Logo"
              style={{
                height: "64px",
                width: "auto",
                objectFit: "contain"
              }}
            />
          </div>
        </div>

        {/* Link per la gestione utenti, visibile solo se l'utente è admin */}
        {role === "admin" && (
          <>
            <Button color="inherit" onClick={() => navigate("/user-management")}>
              {t('navbar.userManagement')}
            </Button>
            <Button color="inherit" onClick={() => navigate("/totem-management")}>
              {t('navbar.totemManagement')}
            </Button>
          </>
        )}

        <LanguageSelector />
        {/* Bottone Profilo con Menu a Tendina */}
        <Button color="inherit" onClick={handleMenuOpen}>
          <FontAwesomeIcon icon={faUser} style={{ marginRight: "8px" }} />
          {username}
        </Button>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem
            onClick={() => {
              handleMenuClose();
              navigate("/profile");
            }}
          >
            {t('navbar.profile')}
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => {
              handleMenuClose();
              handleLogout();
            }}
          >
            {t('navbar.logout')}
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;