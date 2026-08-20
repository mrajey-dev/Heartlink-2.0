// src/screens/VibesScreen.jsx — Locked Vibes Feature with Real-Time User Counter & Interactive Invites
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Easing,
  StatusBar, ScrollView, Dimensions, Share,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BlurView from '../components/SafeBlurView';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { apiGetUserCount } from '../services/api';

const { width } = Dimensions.get('window');

// Attractive Invite Message Templates
const INVITE_TEMPLATES = [
  {
    id: 'cosmic',
    name: 'Cosmic Vibe',
    icon: 'planet-outline',
    badge: 'POPULAR ✨',
    color: ['#FF007F', '#8B5CF6'],
    message: (count, goal) =>
      `✨ Join me on HeartLink! Match your vibe frequency & help us reach ${goal.toLocaleString()} members to unlock the Orbital Vibe Radar 🛰️💫 Currently at ${count.toLocaleString()} members!\n\nDownload HeartLink now: https://heartlink.app/invite`,
  },
  {
    id: 'vip',
    name: 'VIP Pioneer',
    icon: 'sparkles-outline',
    badge: 'EXCLUSIVE 🚀',
    color: ['#8B5CF6', '#3B82F6'],
    message: (count, goal) =>
      `🚀 VIP Invitation: Be part of the pioneer community on HeartLink! We're unlocking the Orbital Vibe Radar at ${goal.toLocaleString()} members (${count.toLocaleString()} joined already)! 🔥\n\nClaim your spot: https://heartlink.app/invite`,
  },
  {
    id: 'romantic',
    name: 'Romantic Sparks',
    icon: 'heart-outline',
    badge: 'TRENDING 💖',
    color: ['#FF2E93', '#FF6B6B'],
    message: (count, goal) =>
      `💖 Stop swiping blindly! Find your true aesthetic vibe match on HeartLink. Help us unlock Orbital Radar for everyone (${count.toLocaleString()}/${goal.toLocaleString()})! 🔮\n\nJoin the vibe movement: https://heartlink.app/invite`,
  },
  {
    id: 'nightowl',
    name: 'Night Owl Vibe',
    icon: 'moon-outline',
    badge: 'AESTHETIC 🎧',
    color: ['#6366F1', '#A855F7'],
    message: (count, goal) =>
      `🎧 Late night beats & aesthetic connections! Join HeartLink today and help us hit ${goal.toLocaleString()} members to launch Orbital Vibe Radar 🌌 (${count.toLocaleString()} & counting!)\n\nJoin here: https://heartlink.app/invite`,
  },
];

export default function VibesScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);

  const [userCount, setUserCount] = useState(0);
  const [targetGoal, setTargetGoal] = useState(5000);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('cosmic');
  const [copiedToast, setCopiedToast] = useState(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const activeTemplate = useMemo(() => {
    return INVITE_TEMPLATES.find(t => t.id === selectedTemplateId) || INVITE_TEMPLATES[0];
  }, [selectedTemplateId]);

  const currentInviteText = useMemo(() => {
    return activeTemplate.message(userCount, targetGoal);
  }, [activeTemplate, userCount, targetGoal]);

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

  const handleShare = async (customMessage = null) => {
    try {
      const msgToShare = customMessage || currentInviteText;
      await Share.share({
        message: msgToShare,
        title: 'Invite to HeartLink',
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const handleCopyToast = () => {
    handleShare(currentInviteText);
    setCopiedToast(true);
    setTimeout(() => {
      setCopiedToast(false);
    }, 2500);
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

          {/* Interactive Invite Message Showcase Section */}
          <View style={styles.inviteSection}>
            <View style={styles.inviteSectionHeader}>
              <View style={styles.inviteSectionIconBox}>
                <Ionicons name="send" size={16} color="#FF007F" />
              </View>
              <View>
                <Text style={styles.inviteSectionTitle}>SELECT YOUR INVITE VIBE</Text>
                <Text style={styles.inviteSectionSub}>Choose an attractive message to invite friends</Text>
              </View>
            </View>

            {/* Vibe Selector Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorPillsScroll}>
              {INVITE_TEMPLATES.map((tmpl) => {
                const isSelected = tmpl.id === selectedTemplateId;
                return (
                  <TouchableOpacity
                    key={tmpl.id}
                    style={[styles.vibePill, isSelected && styles.vibePillSelected]}
                    onPress={() => setSelectedTemplateId(tmpl.id)}
                    activeOpacity={0.8}
                  >
                    {isSelected ? (
                      <LinearGradient colors={tmpl.color} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                    ) : null}
                    <Ionicons name={tmpl.icon} size={14} color={isSelected ? '#FFF' : theme.textSec} style={{ marginRight: 6 }} />
                    <Text style={[styles.vibePillTxt, isSelected && styles.vibePillTxtSelected]}>
                      {tmpl.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Attractive Message Preview Card */}
            <View style={styles.previewCard}>
              <View style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]}>
                <BlurView intensity={isDark ? 40 : 80} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                <LinearGradient
                  colors={isDark ? ['rgba(255, 0, 127, 0.1)', 'rgba(139, 92, 246, 0.05)'] : ['rgba(255, 255, 255, 0.95)', 'rgba(255, 0, 127, 0.03)']}
                  style={StyleSheet.absoluteFill}
                />
              </View>

              <View style={styles.previewHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="chatbox-ellipses-outline" size={16} color="#FF007F" style={{ marginRight: 6 }} />
                  <Text style={styles.previewHeaderLabel}>MESSAGE PREVIEW</Text>
                </View>
                <View style={styles.templateBadgeContainer}>
                  <Text style={styles.templateBadgeTxt}>{activeTemplate.badge}</Text>
                </View>
              </View>

              <View style={styles.quoteBox}>
                <Ionicons name="quote" size={24} color="rgba(255, 0, 127, 0.25)" style={styles.quoteIcon} />
                <Text style={styles.previewText}>{currentInviteText}</Text>
              </View>

              {/* Action Buttons for Preview */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.primaryShareBtn}
                  onPress={() => handleShare(currentInviteText)}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={activeTemplate.color} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryShareGrad}>
                    <Ionicons name="paper-plane" size={16} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.primaryShareTxt}>Share Invite Now</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickCopyBtn}
                  onPress={handleCopyToast}
                  activeOpacity={0.8}
                >
                  <Ionicons name="copy-outline" size={18} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Toast Notification Banner */}
          {copiedToast && (
            <Animated.View style={styles.toastBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#30D158" style={{ marginRight: 8 }} />
              <Text style={styles.toastBannerTxt}>Invite message ready to share! ✨</Text>
            </Animated.View>
          )}

          {/* Share / Invite CTA (Main Bottom) */}
          <TouchableOpacity style={styles.shareBtn} onPress={() => handleShare(currentInviteText)} activeOpacity={0.85}>
            <LinearGradient colors={['#FF007F', '#B5179E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.shareBtnGrad}>
              <Ionicons name="paper-plane" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.shareBtnTxt}>Invite Friends & Unlock Faster 🚀</Text>
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
    paddingTop: 6,
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
    marginTop: 10,
    marginBottom: 20,
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
    marginBottom: 24,
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
  inviteSection: {
    width: '100%',
    marginBottom: 24,
  },
  inviteSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  inviteSectionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 0, 127, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  inviteSectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: theme.textPrimary,
    letterSpacing: 0.8,
  },
  inviteSectionSub: {
    fontSize: 11.5,
    color: theme.textSec,
    fontWeight: '500',
    marginTop: 1,
  },
  selectorPillsScroll: {
    paddingBottom: 12,
  },
  vibePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
  },
  vibePillSelected: {
    borderColor: 'transparent',
  },
  vibePillTxt: {
    fontSize: 12.5,
    fontWeight: '700',
    color: theme.textSec,
  },
  vibePillTxtSelected: {
    color: '#FFF',
    fontWeight: '800',
  },
  previewCard: {
    width: '100%',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 0, 127, 0.25)' : 'rgba(255, 0, 127, 0.15)',
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  previewHeaderLabel: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FF007F',
    letterSpacing: 1,
  },
  templateBadgeContainer: {
    backgroundColor: 'rgba(255, 0, 127, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  templateBadgeTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF007F',
  },
  quoteBox: {
    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.6)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    position: 'relative',
  },
  quoteIcon: {
    position: 'absolute',
    top: 6,
    right: 10,
  },
  previewText: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.textPrimary,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryShareBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    marginRight: 10,
  },
  primaryShareGrad: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryShareTxt: {
    color: '#FFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  quickCopyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#30D158',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  toastBannerTxt: {
    fontSize: 12.5,
    fontWeight: '700',
    color: theme.textPrimary,
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

