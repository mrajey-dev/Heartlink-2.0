// src/theme/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK_THEME, LIGHT_THEME } from './colors';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Default is LIGHT theme (isDark = false) on app install or new account creation
  const [isDark, setIsDark] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('user-theme');
        if (storedTheme !== null) {
          setIsDark(storedTheme === 'dark');
        } else {
          // Fresh install: default to LIGHT theme and save preference
          setIsDark(false);
          await AsyncStorage.setItem('user-theme', 'light');
        }
      } catch (e) {
        console.warn('Failed to load theme preference', e);
      } finally {
        setLoading(false);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    try {
      const nextTheme = !isDark;
      setIsDark(nextTheme);
      await AsyncStorage.setItem('user-theme', nextTheme ? 'dark' : 'light');
    } catch (e) {
      console.warn('Failed to save theme preference', e);
    }
  };

  const setTheme = async (themeMode) => {
    try {
      const dark = themeMode === 'dark';
      setIsDark(dark);
      await AsyncStorage.setItem('user-theme', dark ? 'dark' : 'light');
    } catch (e) {
      console.warn('Failed to save theme preference', e);
    }
  };

  const setLightTheme = async () => {
    try {
      setIsDark(false);
      await AsyncStorage.setItem('user-theme', 'light');
    } catch (e) {
      console.warn('Failed to set light theme', e);
    }
  };

  const setDarkTheme = async () => {
    try {
      setIsDark(true);
      await AsyncStorage.setItem('user-theme', 'dark');
    } catch (e) {
      console.warn('Failed to set dark theme', e);
    }
  };

  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider value={{ isDark, theme, toggleTheme, setTheme, setLightTheme, setDarkTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
