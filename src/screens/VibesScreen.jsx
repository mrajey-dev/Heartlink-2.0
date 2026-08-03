// src/screens/VibesScreen.jsx — Locked Vibes Feature with Real-Time User Counter
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Easing,
  SafeAreaView, StatusBar, ScrollView, Dimensions, Share,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { apiGetUserCount } from '../services/api';

const { width } = Dimensions.get('window');

export default function VibesScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);

  const [userCount, setUserCount] = useState(0);
  const [targetGoal, setTargetGoal] = useState(5000);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const fetchUserCount = async () => {
    try {
      const res = await apiGetUserCount();
      if (res && typeof res.user_count === 'number') {
        setUserCount(res.user_count);
        if (res.target_goal) setTargetGoal(res.target_goal);

        const ratio = Math.min(res.user_count / (res.target_goal || 5000), 1);
        Animated.timing(progressAnim, {
          toValue: ratio,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      }
    } catch (e) {
      console.warn('Fetch user count error:', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserCount();

    const unsubscribe = navigation.addListener('focus', () => {
      fetchUserCount();
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me on HeartLink! We are waiting for 5,000 members to unlock the Orbital Vibe Radar feature! \nDownload HeartLink now!`,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const progressPercent = Math.min(((userCount / targetGoal) * 100), 100).toFixed(1);

  return (
    <LinearGradient colors={theme.bgGrad} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Cosmic background glow blobs */}
      <View style={styles.glowBlobCyan} pointerEvents="none" />
      <View style={styles.glowBlobPurple} pointerEvents="none" />

      <SafeAreaView style={styles.flex}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Orbital Vibes</Text>
            <Text style={styles.sub}>Community Unlock Counter</Text>
          </View>
          <View style={styles.lockStatusBadge}>
            <LinearGradient colors={['#FF007F', '#B5179E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.lockBadgeGrad}>
              <Ionicons name="lock-closed" size={12} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.lockBadgeTxt}>COMING SOON</Text>
            </LinearGradient>
          </View>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchUserCount();
              }}
              tintColor="#FF007F"
            />
          }
        >
          {/* Main Cosmic Lock Graphic */}
          <View style={styles.lockOrbContainer}>
            <Animated.View style={[styles.orbPulseRing, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient colors={['rgba(255, 0, 127, 0.35)', 'rgba(139, 92, 246, 0.15)', 'transparent']} style={StyleSheet.absoluteFill} />
            </Animated.View>

            <View style={styles.orbCoreCircle}>
              <BlurView intensity={isDark ? 60 : 90} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['rgba(255, 0, 127, 0.25)', 'rgba(147, 51, 234, 0.25)']} style={StyleSheet.absoluteFill} />
              <Ionicons name="sparkles" size={28} color="#ffec7eff" style={styles.sparkleIcon} />
              <Ionicons name="lock-closed" size={48} color="#FFF" />
            </View>
          </View>

          {/* Heading & Notice */}
          <View style={styles.messageWrap}>
            <Text style={styles.headingTitle}>Vibes Feature Coming Soon!</Text>
            <Text style={styles.headingSub}>
              This feature will be launched soon. We are waiting for <Text style={styles.highlightTxt}>5,000 users</Text> to join the HeartLink community before unlocking the Orbital Vibe Radar!
            </Text>
          </View>

          {/* Real-time Progress Card */}
          <View style={styles.progressCard}>
            <View style={[StyleSheet.absoluteFill, { borderRadius: 26, overflow: 'hidden' }]}>
              <BlurView intensity={isDark ? 50 : 80} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={isDark ? ['rgba(255, 255, 255, 0.05)', 'rgba(255, 0, 127, 0.08)'] : ['rgba(255, 255, 255, 0.9)', 'rgba(255, 0, 127, 0.04)']} style={StyleSheet.absoluteFill} />
            </View>

            <View style={styles.cardHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.liveIndicatorDot} />
                <Text style={styles.cardHeaderTitle}>REAL-TIME USER COUNT</Text>
              </View>
              <View style={styles.percentBadge}>
                <Text style={styles.percentBadgeTxt}>{progressPercent}%</Text>
              </View>
            </View>

            {/* Big Stat Display */}
            {loading ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator size="large" color="#FF007F" />
              </View>
            ) : (
              <View style={styles.statRow}>
                <Text style={styles.currentCountTxt}>{userCount.toLocaleString()}</Text>
                <Text style={styles.targetGoalTxt}> / {targetGoal.toLocaleString()} Users</Text>
              </View>
            )}

            {/* Animated Progress Bar */}
            <View style={styles.progressBarTrack}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              >
                <LinearGradient colors={['#FF007F', '#A855F7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
              </Animated.View>
            </View>

            <View style={styles.cardFooterRow}>
              <Ionicons name="people-outline" size={14} color={theme.textSec} style={{ marginRight: 6 }} />
              <Text style={styles.cardFooterTxt}>
                {userCount < targetGoal ? `${(targetGoal - userCount).toLocaleString()} more members needed` : 'Goal reached! Launching feature...'}
              </Text>
            </View>
          </View>

          {/* Share / Invite CTA */}
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
            <LinearGradient colors={['#FF007F', '#B5179E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.shareBtnGrad}>
              <Ionicons name="paper-plane" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.shareBtnTxt}>Invite Friends & Unlock Faster </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const getStyles = (theme, isDark) => StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  glowBlobCyan: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: (width * 0.7) / 2,
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
  },
  glowBlobPurple: {
    position: 'absolute',
    bottom: 100,
    right: -40,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: (width * 0.8) / 2,
    backgroundColor: 'rgba(255, 0, 127, 0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 14 : 14,
    paddingBottom: 16,
    zIndex: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.textPrimary,
    letterSpacing: -0.6,
  },
  sub: {
    fontSize: 13,
    color: theme.textSec,
    marginTop: 3,
    fontWeight: '500',
  },
  lockStatusBadge: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  lockBadgeGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  lockBadgeTxt: {
    color: '#FFF',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 120,
    alignItems: 'center',
  },
  lockOrbContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  orbPulseRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
  },
  orbCoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 0, 127, 0.4)',
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  sparkleIcon: {
    position: 'absolute',
    top: 14,
    right: 18,
  },
  messageWrap: {
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  headingTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: theme.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  headingSub: {
    fontSize: 14.5,
    color: theme.textSec,
    textAlign: 'center',
    lineHeight: 22,
  },
  highlightTxt: {
    color: theme.accentBright || '#FF007F',
    fontWeight: '800',
  },
  progressCard: {
    width: '100%',
    borderRadius: 26,
    padding: 22,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255, 0, 127, 0.3)' : 'rgba(255, 0, 127, 0.18)',
    marginBottom: 24,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  liveIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#30D158',
    marginRight: 8,
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.textSec,
    letterSpacing: 1,
  },
  percentBadge: {
    backgroundColor: 'rgba(255, 0, 127, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  percentBadgeTxt: {
    color: '#FF007F',
    fontSize: 12,
    fontWeight: '900',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  currentCountTxt: {
    fontSize: 36,
    fontWeight: '900',
    color: theme.textPrimary,
  },
  targetGoalTxt: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.textSec,
  },
  progressBarTrack: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
    overflow: 'hidden',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardFooterTxt: {
    fontSize: 12.5,
    color: theme.textSec,
    fontWeight: '600',
  },
  shareBtn: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  shareBtnGrad: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnTxt: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
