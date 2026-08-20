import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';

export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}) {
  const { theme, isDark } = useTheme();

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        style={[styles.base, disabled && styles.disabled, style]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#FF2D6B', '#B84CF5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <Text style={styles.primaryText}>{title}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles.outline,
        {
          borderColor: theme.border,
          backgroundColor: theme.glass,
        },
        disabled && styles.disabled,
        style
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={[styles.outlineText, { color: theme.textPrimary }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  outline: {
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineText: { fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.4 },
});
