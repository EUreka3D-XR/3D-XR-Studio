import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import HomePage from "./components/HomePage";
import EnvironmentForm from "./components/EnvironmentForm";
import UserManagement from "./components/UserManagement";
import UserForm from "./components/UserForm";
import Profile from "./components/Profile";
import TotemManagement from "./components/TotemManagement";
import TotemForm from "./components/TotemForm";
import TermsPage from "./components/TermsPage";
import PrivacyPage from "./components/PrivacyPage";
import GlobalLoadingOverlay from "./components/GlobalLoadingOverlay";

import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#00507f" },
    secondary: { main: "#95C11e" },
  },
  typography: {
    fontFamily: "'Muli', system-ui, Helvetica, Arial, sans-serif",
    fontSize: 16,
    h1: { fontFamily: "'Bebas Neue', sans-serif" },
    h2: { fontFamily: "'Bebas Neue', sans-serif" },
    h3: { fontFamily: "'Bebas Neue', sans-serif" },
    h4: { fontFamily: "'Bebas Neue', sans-serif" },
    h5: { fontFamily: "'Muli', sans-serif", fontWeight: 700 },
    h6: { fontFamily: "'Muli', sans-serif", fontWeight: 600 },
    body1: { lineHeight: 1.5 },
    body2: { lineHeight: 1.5 },
    button: { fontFamily: "'Muli', sans-serif", fontWeight: 600 },
  },
});

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalLoadingOverlay />
      <Router basename="/eureka3dxr/3dxrstudio">
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/environment/:id" element={<EnvironmentForm />} />
        <Route path="/create-environment" element={<EnvironmentForm />} />
        <Route path="/user-management" element={<UserManagement />} />
        <Route path="/user-management/create" element={<UserForm />} />
        <Route path="/user-management/edit/:id" element={<UserForm />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/totem-management" element={<TotemManagement />} />
        <Route path="/totem-management/create" element={<TotemForm />} />
        <Route path="/totem-management/edit/:id" element={<TotemForm />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
      </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;
