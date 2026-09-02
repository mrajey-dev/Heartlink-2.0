import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ScreenCapture from 'expo-screen-capture';
import { setAuthToken, apiGetProfile } from '../services/api';

const AuthContext = createContext(null);
const USER_STORAGE_KEY = '@heartlink_user_session';
const TOKEN_STORAGE_KEY = '@heartlink_token_session';

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Screen capture permission based on user is_screenshot_allowed field:
  // Evaluates boolean, numeric (1/0), and string values from MySQL/PHP/AsyncStorage
  const isScreenshotAllowed = React.useMemo(() => {
    if (!user) return false;
    const rawVal = user.is_screenshot_allowed !== undefined 
      ? user.is_screenshot_allowed 
      : (user.allow_screenshot !== undefined ? user.allow_screenshot : null);

    if (rawVal !== null && rawVal !== undefined) {
      if (rawVal === true || rawVal === 1 || rawVal === '1' || String(rawVal).toLowerCase() === 'true') {
        return true;
      }
      if (rawVal === false || rawVal === 0 || rawVal === '0' || String(rawVal).toLowerCase() === 'false') {
        return false;
      }
    }

    // Default: Support Admin account (user ID 16) is allowed if not explicitly set to false
    if (String(user.id) === '16' || user.id === 16) {
      return true;
    }

    return false;
  }, [user?.id, user?.is_screenshot_allowed, user?.allow_screenshot]);

  useEffect(() => {
    const configureScreenCapture = async () => {
      if (Platform.OS === 'web') return;
      try {
        if (isScreenshotAllowed) {
          await ScreenCapture.allowScreenCaptureAsync();
          console.log('[ScreenCapture] Screenshots ALLOWED for user ID:', user?.id, 'is_screenshot_allowed:', user?.is_screenshot_allowed);
        } else {
          await ScreenCapture.preventScreenCaptureAsync();
          console.log('[ScreenCapture] Screenshots PREVENTED (blank image) for user ID:', user?.id, 'is_screenshot_allowed:', user?.is_screenshot_allowed);
        }
      } catch (err) {
        console.warn('[ScreenCapture] Warning setting capture mode:', err?.message);
      }
    };

    configureScreenCapture();
  }, [isScreenshotAllowed, user?.id]);

  // Restore saved authentication session on app startup and sync backend DB user record
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        const savedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);

        let localUser = null;
        if (savedUser) {
          localUser = JSON.parse(savedUser);
          setUser(localUser);
          setIsAuthenticated(true);
        }

        if (savedToken) {
          setAuthToken(savedToken);
          // Sync fresh profile in background with 4s timeout
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Profile sync timeout')), 4000)
          );
          try {
            const res = await Promise.race([apiGetProfile(), timeoutPromise]);
            if (res?.user) {
              const freshUser = res.user;

              // Backend may return photos as DB objects [{id, photo_url, user_id}] or strings or null
              const rawBackendPhotos = Array.isArray(freshUser.photos)
                ? freshUser.photos
                  .map(p => (typeof p === 'string' ? p : (p?.photo_url || p?.uri || null)))
                  .filter(Boolean)
                : [];

              // Local photos stored during registration or previous add-photo
              const localPhotos = Array.isArray(localUser?.photos)
                ? localUser.photos
                  .map(p => (typeof p === 'string' ? p : (p?.photo_url || p?.uri || null)))
                  .filter(Boolean)
                : [];
              const localImages = Array.isArray(localUser?.images)
                ? localUser.images.filter(p => typeof p === 'string' && p.startsWith('http'))
                : [];

              // Merge: backend updates profile fields, but preserve local photos if backend has none
              const mergedUser = {
                ...(localUser || {}),
                ...freshUser,
                photos: rawBackendPhotos.length > 0
                  ? rawBackendPhotos
                  : localPhotos.length > 0
                    ? localPhotos
                    : localImages,
                images: localImages.length > 0 ? localImages : rawBackendPhotos,
                avatar: freshUser.avatar || localUser?.avatar || null,
              };

              console.log('[useAuth] Synced. photos:', mergedUser.photos?.length, mergedUser.photos?.slice(0, 1));
              setUser(mergedUser);
              setIsAuthenticated(true);
              await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mergedUser));
            }
          } catch (apiErr) {
            console.warn('[useAuth] Backend DB sync warning:', apiErr?.message);
            // Keep localUser as-is — do NOT overwrite with empty data
          }
        }
      } catch (e) {
        console.warn('[Session Storage] Failed to restore user session:', e);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);


  const login = async (userData, token = null) => {
    const activeUser = userData || {
      id: 1,
      name: 'Alex Rivera',
      age: 26,
      bio: 'Living life, chasing dreams, and making meaningful connections.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      interests: ['Design', 'Photography', 'Travel', 'Coffee', 'Music'],
    };

    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(activeUser));
      if (token) {
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
        setAuthToken(token);
      }
    } catch (e) {
      console.warn('[Session Storage] Failed to store login session:', e);
    }

    setUser(activeUser);
    setIsAuthenticated(true);
  };

  const updateUser = async (updatedData) => {
    const nextUser = {
      ...(user || {}),
      ...updatedData,
    };

    setUser(nextUser);

    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    } catch (e) {
      console.warn('[Session Storage] Failed to update stored user session:', e);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (e) {
      console.warn('[Session Storage] Failed to clear stored session:', e);
    }

    setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
