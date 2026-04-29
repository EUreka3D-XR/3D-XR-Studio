import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useTranslation } from 'react-i18next';

const API = (__API_BASE_URL__ || "https://YOUR_BACKEND_API_URL").replace(/\/+$/, "");

import {
  Button,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import Navbar from "../components/Navbar";

const UserManagement = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    } else {
      fetchUsers(token);
    }
  }, [navigate]);

  const fetchUsers = async (token) => {
    try {
      const response = await axios.get(`${API}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data);
    } catch (error) {
      console.error("Errore nel recupero degli utenti:", error);
    }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${API}/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(users.filter((user) => user.id !== id));
    } catch (error) {
      console.error("Errore nella cancellazione dell'utente:", error);
    }
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="h4" color="primary" sx={{ mb: 3 }}>
            {t('userManagement.title')}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            sx={{ mb: 3 }}
            onClick={() => navigate("/user-management/create")}
          >
            {t('userManagement.button.createUser')}
          </Button>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('userManagement.table.id')}</TableCell>
                  <TableCell>{t('userManagement.table.username')}</TableCell>
                  <TableCell>{t('userManagement.table.lastname')}</TableCell>
                  <TableCell>{t('userManagement.table.firstname')}</TableCell>
                  <TableCell>{t('userManagement.table.role')}</TableCell>
                  <TableCell>{t('userManagement.table.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.lastname}</TableCell>
                    <TableCell>{user.firstname}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => navigate(`/user-management/edit/${user.id}`)}
                        sx={{ mr: 1 }}
                      >
                        {t('userManagement.button.edit')}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => handleDelete(user.id)}
                      >
                        {t('userManagement.button.delete')}
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

export default UserManagement;
