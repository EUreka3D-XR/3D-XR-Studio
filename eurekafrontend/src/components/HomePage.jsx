import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = (__API_BASE_URL__ || "https://YOUR_BACKEND_API_URL").replace(/\/+$/, "");

import {
  Button,
  Typography,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import Navbar from "../components/Navbar";
import { useTranslation } from 'react-i18next';

const HomePage = () => {
  const navigate = useNavigate();
  const [environments, setEnvironments] = useState([]);
  const [userRole, setUserRole] = useState(""); // Stato per il ruolo dell'utente
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("asc"); // 'asc' o 'desc'
  const { t } = useTranslation('translation');

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/"); // Se non c'è il token, torna alla Login
    } else {
      // Decodifica il token per ottenere il ruolo dell'utente
      const payload = JSON.parse(window.atob(token.split(".")[1]));
      setUserRole(payload.role);
      fetchEnvironments(token);
    }
  }, [navigate]);

  const fetchEnvironments = async (token) => {
    try {
      const response = await axios.get(`${API}/api/environments/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEnvironments(response.data);
    } catch (error) {
      console.error("Errore nel recupero degli ambienti:", error);
    }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${API}/api/environments/delete/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEnvironments(environments.filter((env) => env.id !== id));
    } catch (error) {
      console.error("Errore nella cancellazione dell'ambiente:", error);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedEnvironments = [...environments].sort((a, b) => {
    if (!sortField) return 0;
    const valueA = a[sortField] ? a[sortField].toString().toLowerCase() : "";
    const valueB = b[sortField] ? b[sortField].toString().toLowerCase() : "";
    if (valueA < valueB) return sortOrder === "asc" ? -1 : 1;
    if (valueA > valueB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <>
      <Navbar />

      <Container maxWidth="lg" sx={{ mt: 4, textAlign: "center" }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="h4" color="primary">
            {t("home.title")}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            sx={{ mt: 3, mb: 3 }}
            onClick={() => navigate("/create-environment")}
          >
            {t("home.button.createEnvironment")}
          </Button>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell
                    onClick={() => handleSort("name")}
                    sx={{ cursor: "pointer" }}
                  >
                    <strong>{t("home.table.name")}</strong>
                    {sortField === "name" &&
                      (sortOrder === "asc" ? " ▲" : " ▼")}
                  </TableCell>
                  <TableCell>
                    <strong>{t("home.table.coordinates")}</strong>
                  </TableCell>
                  <TableCell>
                    <strong>{t("home.table.objectCount")}</strong>
                  </TableCell>
                  {userRole === "admin" && (
                    <TableCell
                      onClick={() => handleSort("owner_username")}
                      sx={{ cursor: "pointer" }}
                    >
                      <strong>{t("home.table.createdBy")}</strong>
                      {sortField === "owner_username" &&
                        (sortOrder === "asc" ? " ▲" : " ▼")}
                    </TableCell>
                  )}
                  <TableCell>
                    <strong>{t("home.table.actions")}</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedEnvironments.map((env) => (
                  <TableRow key={env.id}>
                    <TableCell>{env.name}</TableCell>
                    <TableCell>{t("home.coordsLine", { lat: env.latitude, long: env.longitude })}</TableCell>
                    <TableCell>{env.object_count}</TableCell>
                    {userRole === "admin" && (
                      <TableCell>{env.owner_username}</TableCell>
                    )}
                    <TableCell>
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => navigate(`/environment/${env.id}`)}
                      >
                        {t("home.button.open")}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        sx={{ ml: 2 }}
                        onClick={() => handleDelete(env.id)}
                      >
                        {t("home.button.delete")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Container>
    </>
  );
};

export default HomePage;
