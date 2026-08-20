// App.js
import React, { useEffect } from 'react';
import { Text, TextInput } from 'react-native';
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

import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/hooks/useAuth';
import { ThemeProvider } from './src/theme/ThemeContext';
import { NotificationProvider } from './src/context/NotificationContext';

export default function App() {
  // Load Bricolage Grotesque fonts asynchronously
  useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800Bold,
    BricolageGrotesque_900Black,
  });

  useEffect(() => {
    // Prevent screenshots and screen recording across the entire application
    ScreenCapture.preventScreenCaptureAsync().catch(err => console.warn('Screen capture prevention error:', err));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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