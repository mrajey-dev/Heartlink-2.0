// src/services/userService.js
import { apiGetProfile, apiUpdateProfile } from './api';

export const createUserProfile = async (uid, data) => {
  return await apiUpdateProfile(data);
};

export const getUserProfile = async (uid) => {
  const res = await apiGetProfile();
  return res.user;
};

export const updateUserProfile = async (uid, data) => {
  return await apiUpdateProfile(data);
};