// src/components/CustomAlertModal.jsx — HeartLink Overlapping Icon Pop-Up Design
import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import BlurView from './SafeBlurView';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale, verticalScale, fs, SCREEN } from '../utils/responsive';

const { width, height } = SCREEN;

export default function CustomAlertModal({
  visible,
  title,
  message,
  icon = 'heart',
  iconColor = '#FFFFFF',
  confirmText = 'OK',
  cancelText,
  onConfirm,
  onCancel,
  onClose,
  isDanger = false,
}) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  const handleConfirm = onConfirm || onClose;
  const handleCancel = onCancel || onClose || handleConfirm;

  if (!visible) return null;

  const cardBg = isDark ? '#191309' : '#FFFFFF';

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={[styles.backdrop, { paddingTop: insets.top + verticalScale(8), paddingBottom: Math.max(insets.bottom + verticalScale(16), verticalScale(24)) }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
        <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />

        {/* Outer Wrap allowing top overlapping badge */}
        <View style={styles.cardWrap}>
          {/* Top Center Overlapping Icon Badge */}
          <View style={[
            styles.topBadgeContainer,
            {
              borderColor: cardBg,
              shadowColor: isDanger ? '#EF4444' : '#F59E0B',
            }
          ]}>
            <LinearGradient
              colors={isDanger ? ['#EF4444', '#DC2626'] : ['#FBBF24', '#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.topBadgeGrad}
            >
              <Ionicons name={icon} size={scale(26)} color={iconColor} />
            </LinearGradient>
          </View>

          {/* Card Body */}
          <View style={[
            styles.card,
            {
              backgroundColor: cardBg,
              borderColor: isDanger
                ? 'rgba(239, 68, 68, 0.35)'
                : isDark
                  ? 'rgba(245, 158, 11, 0.32)'
                  : 'rgba(245, 158, 11, 0.20)',
            }
          ]}>
            {/* Title & Message */}
            {!!title && (
              <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#1E1B2E' }]}>
                {title}
              </Text>
            )}

            {!!message && (
              <Text style={[styles.message, { color: isDark ? 'rgba(255, 255, 255, 0.78)' : '#64748B' }]}>
                {message}
              </Text>
            )}

            {/* Side-by-Side Action Buttons */}
            <View style={styles.buttonRow}>
              {!!cancelText && (
                <TouchableOpacity
                  style={[
                    styles.btn,
                    styles.cancelBtn,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                    }
                  ]}
                  onPress={handleCancel}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.cancelTxt, { color: isDark ? '#FFFFFF' : '#475569' }]}>
                    {cancelText}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.confirmBtnShadow,
                  { shadowColor: isDanger ? '#EF4444' : '#F59E0B' }
                ]}
                onPress={handleConfirm}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={isDanger ? ['#EF4444', '#DC2626'] : ['#FBBF24', '#F59E0B', '#D97706']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confirmGrad}
                >
                  <Text style={styles.confirmTxt}>{confirmText}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 2, 12, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(22),
    zIndex: 9999,
  },
  cardWrap: {
    width: '88%',
    maxWidth: scale(360),
    position: 'relative',
    alignItems: 'center',
  },
  topBadgeContainer: {
    position: 'absolute',
    top: -verticalScale(28),
    zIndex: 20,
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    borderWidth: scale(4),
    elevation: 12,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  topBadgeGrad: {
    flex: 1,
    borderRadius: scale(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    borderRadius: scale(24),
    paddingTop: verticalScale(36),
    paddingBottom: verticalScale(20),
    paddingHorizontal: scale(20),
    alignItems: 'center',
    borderWidth: 1.5,
    elevation: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
  },
  title: {
    fontSize: fs(18),
    fontWeight: '900',
    marginBottom: verticalScale(8),
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  message: {
    fontSize: fs(13.5),
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: verticalScale(20),
    marginBottom: verticalScale(20),
    paddingHorizontal: scale(4),
  },
  buttonRow: {
    flexDirection: 'row',
    gap: scale(10),
    width: '100%',
    justifyContent: 'center',
  },
  btn: {
    flex: 1,
    height: verticalScale(44),
    borderRadius: scale(14),
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelTxt: {
    fontSize: fs(14),
    fontWeight: '700',
  },
  confirmBtnShadow: {
    elevation: 6,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  confirmGrad: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmTxt: {
    color: '#FFFFFF',
    fontSize: fs(14),
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
