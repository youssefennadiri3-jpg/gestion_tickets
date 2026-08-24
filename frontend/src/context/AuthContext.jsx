import React, { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Vérifier l'utilisateur au chargement
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const res = await api.get('/auth/me/', {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUser(res.data);
        } catch (err) {
          console.error("Session expirée :", err);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  // Étape 1 : demande d'envoi du code OTP après vérification username/password
  const requestLoginOtp = async (username, password, recaptchaToken) => {
    const res = await api.post('/auth/login/', { username, password, recaptcha_token: recaptchaToken });
    return res.data; // { detail, username }
  };

  // Étape 2 : vérification du code OTP -> récupération des tokens + user
  const verifyLoginOtp = async (username, code) => {
    const res = await api.post('/auth/login/verify/', { username, code });
    const accessToken = res.data.access;
    const refreshToken = res.data.refresh;

    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);

    const userRes = await api.get('/auth/me/', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    setUser(userRes.data);
    return userRes.data;
  };

  // Fonction de Logout
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, requestLoginOtp, verifyLoginOtp, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};