// src/screens/VibesScreen.jsx — Premium Orbital Vibes Coming Soon Screen
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  StatusBar,
  ScrollView,
  Dimensions,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import SafeBlurView from '../components/SafeBlurView';
import { useTheme } from '../theme/ThemeContext';

const { width, height } = Dimensions.get('window');
const NOTIFICATION_STORAGE_KEY = '@heartlink_orbital_vibes_notified';
const APP_LINK = 'https://play.google.com/store/apps/details?id=com.heartlinkdatingapp.app';

const FEATURES = [
  { icon: 'musical-notes', label: 'Music DNA' },
  { icon: 'fitness', label: 'Energy Match' },
  { icon: 'moon', label: 'Night Vibe' },
  { icon: 'leaf', label: 'Lifestyle Sync' },
  { icon: 'radio', label: 'Frequency' },
  { icon: 'heart', label: 'Chemistry' },
];

export default function VibesScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);

  const [isNotified, setIsNotified] = useState(true);

  // Animations
  const [orbitRotation] = useState(() => new Animated.Value(0));
  const [orbitRotation2] = useState(() => new Animated.Value(0));
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [glowAnim] = useState(() => new Animated.Value(0.6));
  const [fadeIn] = useState(() => new Animated.Value(0));
  const [slideUp] = useState(() => new Animated.Value(40));

  const spin1 = useMemo(() => orbitRotation.interpolate({
    inputRange: [0, 1], outputRange: ['0deg', '360deg'],
  }), [orbitRotation]);

  const spin2 = useMemo(() => orbitRotation2.interpolate({
    inputRange: [0, 1], outputRange: ['360deg', '0deg'],
  }), [orbitRotation2]);

  useEffect(() => {
    AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY)
      .then((val) => { if (val !== null) setIsNotified(val === 'true'); })
      .catch(() => {});

    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
    ]).start();

    // Orbit 1 — clockwise slow
    Animated.loop(Animated.timing(orbitRotation, {
      toValue: 1, duration: 18000, easing: Easing.linear, useNativeDriver: true,
    })).start();

    // Orbit 2 — counter-clockwise faster
    Animated.loop(Animated.timing(orbitRotation2, {
      toValue: 1, duration: 11000, easing: Easing.linear, useNativeDriver: true,
    })).start();

    // Breathing pulse on core
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.08, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();

    // Glow breathing
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0.5, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();

    return () => {
      orbitRotation.stopAnimation();
      orbitRotation2.stopAnimation();
      pulseAnim.stopAnimation();
      glowAnim.stopAnimation();
    };
  }, []);

  const toggleNotification = async () => {
    const nextVal = !isNotified;
    setIsNotified(nextVal);
    try { await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, String(nextVal)); } catch (_) {}
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `✨ Experience intentional dating on HeartLink! Match on shared frequencies:\n\n${APP_LINK}`,
        title: 'HeartLink — Orbital Vibes',
      });
    } catch (_) {}
  };

  return (
    <LinearGradient
      colors={isDark
        ? ['#0C0A1E', '#110D2E', '#0E1628']
        : ['#FDF8FF', '#FFF5F0', '#FFFBF0']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Background ambient orbs */}
      <View style={styles.bgOrb2} pointerEvents="none" />
      <View style={styles.bgOrb3} pointerEvents="none" />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Orbital Vibes</Text>
            <Text style={styles.headerSubtitle}>Frequency & Chemistry Matchmaking</Text>
          </View>
          <LinearGradient
            colors={['#FBBF24', '#F59E0B', '#D97706']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.badge}
          >
            <View style={styles.badgeDot} />
            <Text style={styles.badgeTxt}>COMING SOON</Text>
          </LinearGradient>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Orbital Visualizer ── */}
          <Animated.View style={[styles.heroSection, { opacity: fadeIn }]}>
            <View style={styles.orbitalStage}>

              {/* Light ambient backdrop — centered and aligned with the orbital system */}
              <View style={styles.orbitalBackdrop} pointerEvents="none" />

              {/* Glow halo behind everything */}
              <Animated.View style={[styles.coreGlow, { opacity: glowAnim }]} />

              {/* Ring 1 — outermost dashed */}
              <View style={styles.ring1} />
              {/* Ring 2 */}
              <View style={styles.ring2} />
              {/* Ring 3 */}
              <View style={styles.ring3} />
              {/* Ring 4 — innermost */}
              <View style={styles.ring4} />

              {/* Satellite 1 — outer ring, clockwise */}
              <Animated.View style={[styles.satTrack1, { transform: [{ rotate: spin1 }] }]} pointerEvents="none">
                <View style={styles.sat1}>
                  <LinearGradient colors={['#FBBF24', '#F59E0B']} style={styles.satCore} />
                </View>
              </Animated.View>

              {/* Satellite 2 — mid ring, counter-clockwise */}
              <Animated.View style={[styles.satTrack2, { transform: [{ rotate: spin2 }] }]} pointerEvents="none">
                <View style={styles.sat2}>
                  <View style={styles.sat2Core} />
                </View>
              </Animated.View>

              {/* Center Orb */}
              <Animated.View style={[styles.centerWrap, { transform: [{ scale: pulseAnim }] }]}>
                <View style={styles.orbHalo} />
                <View style={styles.orbBody}>
                  <SafeBlurView intensity={isDark ? 60 : 90} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                  <LinearGradient
                    colors={['rgba(251,191,36,0.35)', 'rgba(217,119,6,0.15)', 'transparent']}
                    style={StyleSheet.absoluteFill}
                  />
                  <Ionicons name="planet" size={50} color="#F59E0B" />
                  <View style={styles.sparkBadge}>
                    <Ionicons name="sparkles" size={10} color="#FFF" />
                  </View>
                </View>
              </Animated.View>
            </View>

            {/* Headline */}
            <Text style={styles.heroHeadline}>Match on Shared Energy</Text>
            <Text style={styles.heroDesc}>
              A new dimension of matchmaking tuned to your music taste,
              lifestyle rhythm, and unspoken frequencies.
            </Text>
          </Animated.View>

          {/* ── Feature Chips ── */}
          <Animated.View style={[styles.chipsSection, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
            <View style={styles.chipsRow}>
              {FEATURES.map((f, i) => (
                <View key={i} style={styles.chip}>
                  <LinearGradient
                    colors={isDark
                      ? ['rgba(245,158,11,0.18)', 'rgba(217,119,6,0.08)']
                      : ['rgba(245,158,11,0.14)', 'rgba(251,191,36,0.06)']}
                    style={StyleSheet.absoluteFill}
                  />
                  <Ionicons name={f.icon} size={14} color="#F59E0B" style={{ marginRight: 5 }} />
                  <Text style={styles.chipLabel}>{f.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* ── Priority Launch Card ── */}
          <Animated.View style={[styles.actionCard, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
            {/* Subtle inner glow */}
            <LinearGradient
              colors={isDark
                ? ['rgba(245,158,11,0.07)', 'transparent']
                : ['rgba(245,158,11,0.05)', 'transparent']}
              style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
            />

            <View style={styles.actionHeader}>
              <LinearGradient
                colors={['#FBBF24', '#F59E0B']}
                style={styles.actionIconWrap}
              >
                <Ionicons name="notifications" size={18} color="#FFF" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Priority Launch Access</Text>
                <Text style={styles.actionSub}>
                  {isNotified
                    ? 'You\'re on the list — first to experience Orbital Vibes.'
                    : 'Enable alerts to get instant access the moment it goes live.'}
                </Text>
              </View>
              {isNotified && (
                <View style={styles.activePill}>
                  <Text style={styles.activePillTxt}>ACTIVE</Text>
                </View>
              )}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            <View style={styles.btnRow}>
              {/* Notify / Enabled button */}
              <TouchableOpacity
                style={styles.notifyBtn}
                onPress={toggleNotification}
                activeOpacity={0.85}
              >
                {isNotified ? (
                  <LinearGradient
                    colors={['rgba(245,158,11,0.18)', 'rgba(217,119,6,0.1)']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
                  />
                ) : (
                  <LinearGradient
                    colors={['#FBBF24', '#F59E0B', '#D97706']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
                  />
                )}
                <Ionicons
                  name={isNotified ? 'checkmark-circle' : 'notifications-outline'}
                  size={17}
                  color={isNotified ? '#F59E0B' : '#FFF'}
                  style={{ marginRight: 7 }}
                />
                <Text style={[styles.notifyTxt, isNotified && styles.notifyTxtActive]}>
                  {isNotified ? 'Alerts Enabled ✓' : 'Notify Me at Launch'}
                </Text>
              </TouchableOpacity>

              {/* Share button */}
              <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
                <Ionicons name="share-social-outline" size={17} color={theme.textPrimary} style={{ marginRight: 6 }} />
                <Text style={styles.shareTxt}>Share</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── Bottom teaser ── */}
          <Animated.View style={[styles.teaserRow, { opacity: fadeIn }]}>
            <Ionicons name="lock-closed" size={12} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'} />
            <Text style={styles.teaserTxt}>  Exclusive feature — launching soon for HeartLink members</Text>
          </Animated.View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const ORB = width * 0.7;

const getStyles = (theme, isDark) =>
  StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },

    // Orbital Backdrop — aligned perfectly with orbital center
    orbitalBackdrop: {
      position: 'absolute',
      width: width * 0.85,
      height: width * 0.85,
      borderRadius: (width * 0.85) / 2,
      top: (ORB - width * 0.85) / 2,
      left: (ORB - width * 0.85) / 2,
      backgroundColor: isDark ? 'rgba(245,158,11,0.07)' : 'rgba(245,158,11,0.06)',
    },
    bgOrb2: {
      position: 'absolute',
      width: width * 0.6,
      height: width * 0.6,
      borderRadius: (width * 0.6) / 2,
      bottom: height * 0.12,
      right: -width * 0.2,
      backgroundColor: isDark ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.04)',
    },
    bgOrb3: {
      position: 'absolute',
      width: width * 0.4,
      height: width * 0.4,
      borderRadius: (width * 0.4) / 2,
      bottom: height * 0.25,
      left: -width * 0.1,
      backgroundColor: isDark ? 'rgba(245,158,11,0.05)' : 'rgba(245,158,11,0.04)',
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 22,
      paddingTop: 10,
      paddingBottom: 12,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: '900',
      color: theme.textPrimary,
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: 12,
      color: theme.textSec,
      marginTop: 2,
      fontWeight: '500',
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      elevation: 4,
      shadowColor: '#F59E0B',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.35,
      shadowRadius: 6,
    },
    badgeDot: {
      width: 6, height: 6, borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.8)',
      marginRight: 6,
    },
    badgeTxt: {
      fontSize: 10, fontWeight: '900',
      color: '#FFF', letterSpacing: 0.8,
    },

    // Scroll
    scrollView: { flex: 1 },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 100,
    },

    // ── Hero ──
    heroSection: {
      alignItems: 'center',
      paddingTop: 10,
      paddingBottom: 10,
    },
    orbitalStage: {
      width: ORB,
      height: ORB,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 28,
    },

    // Core glow
    coreGlow: {
      position: 'absolute',
      width: ORB * 0.7,
      height: ORB * 0.7,
      borderRadius: (ORB * 0.7) / 2,
      backgroundColor: isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.1)',
    },

    // Rings
    ring1: {
      position: 'absolute',
      width: ORB * 0.97, height: ORB * 0.97,
      borderRadius: (ORB * 0.97) / 2,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.2)',
      borderStyle: 'dashed',
    },
    ring2: {
      position: 'absolute',
      width: ORB * 0.76, height: ORB * 0.76,
      borderRadius: (ORB * 0.76) / 2,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(245,158,11,0.22)' : 'rgba(245,158,11,0.28)',
    },
    ring3: {
      position: 'absolute',
      width: ORB * 0.56, height: ORB * 0.56,
      borderRadius: (ORB * 0.56) / 2,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(245,158,11,0.14)' : 'rgba(245,158,11,0.18)',
      borderStyle: 'dashed',
    },
    ring4: {
      position: 'absolute',
      width: ORB * 0.37, height: ORB * 0.37,
      borderRadius: (ORB * 0.37) / 2,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.14)',
    },

    // Satellites
    satTrack1: {
      position: 'absolute',
      width: ORB * 0.76, height: ORB * 0.76,
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    sat1: {
      width: 16, height: 16, borderRadius: 8,
      backgroundColor: 'rgba(245,158,11,0.22)',
      alignItems: 'center', justifyContent: 'center',
      marginTop: -8,
      shadowColor: '#F59E0B',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 6,
      elevation: 6,
    },
    satCore: {
      width: 8, height: 8, borderRadius: 4,
    },

    satTrack2: {
      position: 'absolute',
      width: ORB * 0.56, height: ORB * 0.56,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    sat2: {
      width: 10, height: 10, borderRadius: 5,
      backgroundColor: 'rgba(139,92,246,0.3)',
      alignItems: 'center', justifyContent: 'center',
      marginBottom: -5,
    },
    sat2Core: {
      width: 5, height: 5, borderRadius: 2.5,
      backgroundColor: '#A78BFA',
    },

    // Center orb
    centerWrap: {
      width: ORB * 0.32, height: ORB * 0.32,
      alignItems: 'center', justifyContent: 'center',
    },
    orbHalo: {
      position: 'absolute',
      width: ORB * 0.42, height: ORB * 0.42,
      borderRadius: (ORB * 0.42) / 2,
      backgroundColor: isDark ? 'rgba(245,158,11,0.14)' : 'rgba(245,158,11,0.1)',
    },
    orbBody: {
      width: ORB * 0.32, height: ORB * 0.32,
      borderRadius: (ORB * 0.32) / 2,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'rgba(245,158,11,0.5)',
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(20,14,40,0.7)' : 'rgba(255,255,255,0.9)',
    },
    sparkBadge: {
      position: 'absolute', top: 10, right: 10,
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: '#D97706',
      alignItems: 'center', justifyContent: 'center',
    },

    // Headline
    heroHeadline: {
      fontSize: 24,
      fontWeight: '900',
      color: theme.textPrimary,
      textAlign: 'center',
      letterSpacing: -0.5,
      marginBottom: 10,
    },
    heroDesc: {
      fontSize: 13.5,
      lineHeight: 21,
      color: theme.textSec,
      textAlign: 'center',
      maxWidth: 300,
      fontWeight: '400',
    },

    // ── Feature Chips ──
    chipsSection: {
      marginTop: 20,
      marginBottom: 16,
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(245,158,11,0.22)' : 'rgba(245,158,11,0.25)',
      overflow: 'hidden',
    },
    chipLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)',
      letterSpacing: 0.2,
    },

    // ── Action Card ──
    actionCard: {
      borderRadius: 22,
      padding: 18,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(245,158,11,0.22)' : 'rgba(245,158,11,0.2)',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.95)',
      overflow: 'hidden',
      elevation: 6,
      shadowColor: '#F59E0B',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.2 : 0.1,
      shadowRadius: 16,
    },
    actionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
      gap: 12,
    },
    actionIconWrap: {
      width: 42, height: 42, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#F59E0B',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.4,
      shadowRadius: 6,
      elevation: 4,
    },
    actionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.textPrimary,
      marginBottom: 3,
      letterSpacing: -0.2,
    },
    actionSub: {
      fontSize: 12,
      color: theme.textSec,
      lineHeight: 17,
    },
    activePill: {
      backgroundColor: 'rgba(34,197,94,0.15)',
      borderWidth: 1,
      borderColor: 'rgba(34,197,94,0.35)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    activePillTxt: {
      fontSize: 9,
      fontWeight: '800',
      color: '#22C55E',
      letterSpacing: 0.5,
    },
    divider: {
      height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
      marginBottom: 14,
    },
    btnRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    notifyBtn: {
      flex: 1,
      height: 48,
      borderRadius: 14,
      overflow: 'hidden',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(245,158,11,0.3)',
    },
    notifyTxt: {
      fontSize: 13.5,
      fontWeight: '800',
      color: '#FFF',
      letterSpacing: 0.2,
    },
    notifyTxtActive: { color: '#F59E0B' },
    shareBtn: {
      height: 48,
      paddingHorizontal: 18,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    shareTxt: {
      fontSize: 13.5,
      fontWeight: '700',
      color: theme.textPrimary,
    },

    // Teaser footer
    teaserRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
      paddingHorizontal: 20,
    },
    teaserTxt: {
      fontSize: 11,
      color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)',
      fontWeight: '500',
      textAlign: 'center',
    },
  });
