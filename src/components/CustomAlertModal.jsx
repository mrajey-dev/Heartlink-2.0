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

  const cardBg = isDark ? '#1C1433' : '#FFFFFF';

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
        <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />

        {/* Outer Wrap allowing top overlapping badge */}
        <View style={styles.cardWrap}>
          {/* Top Center Overlapping Icon Badge */}
          <View style={[styles.topBadgeContainer, { borderColor: cardBg }]}>
            <LinearGradient
              colors={isDanger ? ['#FF375F', '#D00040'] : ['#FF007F', '#E0006C', '#8A2BE2']}
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
              borderColor: isDark ? 'rgba(255, 0, 127, 0.3)' : 'rgba(0, 0, 0, 0.08)',
            }
          ]}>
            {/* Title & Message */}
            {!!title && (
              <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#1E1B2E' }]}>
                {title}
              </Text>
            )}

            {!!message && (
              <Text style={[styles.message, { color: isDark ? 'rgba(255, 255, 255, 0.72)' : '#64748B' }]}>
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
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
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
                style={[styles.btn, styles.confirmBtnShadow]}
                onPress={handleConfirm}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={isDanger ? ['#FF375F', '#D00040'] : ['#FF007F', '#8A2BE2']}
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
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
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
    shadowColor: '#FF007F',
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
