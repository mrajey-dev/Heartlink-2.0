// src/services/authService.js
import { apiRegister, apiLogin, apiLogout, apiForgotPassword, setAuthToken } from './api';

// Register User via Laravel API
export const registerUser = async (registrationData) => {
  const res = await apiRegister(registrationData);
  if (res.access_token) {
    setAuthToken(res.access_token);
  }
  return res;
};

// Login User via Laravel API
export const loginUser = async (email, password) => {
  const res = await apiLogin({ email, password });
  if (res.access_token) {
    setAuthToken(res.access_token);
  }
  return res;
};

// Request Password Reset via Laravel API
export const requestPasswordReset = async (email) => {
  return await apiForgotPassword(email);
};

// Logout User via Laravel API
export const logoutUser = async () => {
  try {
    await apiLogout();
  } catch (e) {
    // ignore error if token already revoked
  }
  setAuthToken(null);
};