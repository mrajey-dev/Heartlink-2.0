import React, { useMemo } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

export default function Input({ placeholder, value, onChangeText, icon, secureTextEntry, style }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <View style={[styles.wrap, style]}>
      {icon && <Ionicons name={icon} size={18} color={theme.textFaint} style={styles.icon} />}
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={theme.textFaint}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
      />
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.surface, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: theme.glassBorder, gap: 10,
  },
  icon:  {},
  input: { flex: 1, color: theme.textPrimary, fontSize: 15, padding: 0 },
});

