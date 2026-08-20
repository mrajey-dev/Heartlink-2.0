// src/components/SafeBlurView.jsx — Bulletproof BlurView Fallback Component
import React from 'react';
import { View, Platform } from 'react-native';

let NativeExpoBlurView = null;
try {
  const ExpoBlurModule = require('expo-blur');
  NativeExpoBlurView = ExpoBlurModule?.BlurView || ExpoBlurModule?.default || null;
} catch (e) {
  NativeExpoBlurView = null;
}

export const BlurView = ({ intensity = 50, tint = 'dark', style, children, ...props }) => {
  // Use native BlurView on iOS where native blur is fully supported
  if (NativeExpoBlurView && Platform.OS === 'ios') {
    try {
      return (
        <NativeExpoBlurView intensity={intensity} tint={tint} style={style} {...props}>
          {children}
        </NativeExpoBlurView>
      );
    } catch (e) {
      // Fallback below if native rendering fails
    }
  }

  // Fallback glassmorphism View for Android / Expo Go / missing native module
  const isDark = tint === 'dark';
  const alpha = Math.min(0.92, Math.max(0.35, (intensity || 50) / 100));
  const backgroundColor = isDark
    ? `rgba(13, 15, 29, ${alpha})`
    : `rgba(255, 255, 255, ${alpha})`;

  return (
    <View style={[{ backgroundColor }, style]} {...props}>
      {children}
    </View>
  );
};

export default BlurView;
