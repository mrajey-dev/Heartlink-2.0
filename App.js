// App.js
import React, { useEffect } from 'react';
import { Platform, Text, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Standardize mobile OS font scale cap across entire application
if (Text.defaultProps) {
  Text.defaultProps.maxFontSizeMultiplier = 1.25;
} else {
  Text.defaultProps = { maxFontSizeMultiplier: 1.25 };
}

if (TextInput.defaultProps) {
  TextInput.defaultProps.maxFontSizeMultiplier = 1.25;
} else {
  TextInput.defaultProps = { maxFontSizeMultiplier: 1.25 };
}
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as ScreenCapture from 'expo-screen-capture';
import {
  useFonts,
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800Bold,
  BricolageGrotesque_900Black,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_800ExtraBold,
  PlayfairDisplay_900Black,
} from '@expo-google-fonts/playfair-display';

import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/hooks/useAuth';
import { ThemeProvider } from './src/theme/ThemeContext';
import { NotificationProvider } from './src/context/NotificationContext';

export default function App() {
  // Load Bricolage Grotesque and Playfair Display fonts asynchronously
  useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800Bold,
    BricolageGrotesque_900Black,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_800ExtraBold,
    PlayfairDisplay_900Black,
  });

  useEffect(() => {
    // Note: Screenshot permissions are managed dynamically in useAuth.js according to user is_screenshot_allowed
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (!document.getElementById('playfair-google-font')) {
        const link = document.createElement('link');
        link.id = 'playfair-google-font';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap';
        document.head.appendChild(link);
      }
      // Global fix for web browser scrolling: ensure html, body, and root allow standard overflow scrolling
      const existing = document.getElementById('heartlink-web-scroll-fix');
      if (!existing) {
        const style = document.createElement('style');
        style.id = 'heartlink-web-scroll-fix';
        style.textContent = `
          html, body, #root {
            height: 100%;
            width: 100%;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, width: '100%', height: '100%' }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <NotificationProvider>
              <AppNavigator />
            </NotificationProvider>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}