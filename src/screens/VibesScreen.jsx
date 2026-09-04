// src/screens/VibesScreen.jsx — Orbital Vibes Coming Soon Flagship Screen
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Easing,
  StatusBar, ScrollView, Dimensions, Share,
  ActivityIndicator, RefreshControl, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BlurView from '../components/SafeBlurView';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { apiGetUserCount } from '../services/api';

const { width } = Dimensions.get('window');

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.heartlinkdatingapp.app';

// Floating Orbit Frequency Badges positioned around the radar
const ORBIT_TAGS = [
  { id: '1', title: 'Soul Frequency ✨', top: 12, left: 14 },
  { id: '2', title: 'Late Night Beats 🎧', top: 18, right: 14 },
  { id: '3', title: 'Deep Chemistry ⚡', bottom: 18, left: 20 },
  { id: '4', title: 'Aesthetic Cafes ☕', bottom: 12, right: 18 },
];

// 3 Feature Pillars explaining why Orbital Vibes is game-changing
const FEATURE_PILLARS = [
  {
    icon: 'planet-outline',
    title: 'Aesthetic Frequencies',
    desc: 'Match with people who resonate on your exact lifestyle tempo, music tastes, and unspoken energy.',
  },
  {
    icon: 'radio-outline',
    title: 'Real-Time Orbit Radar',
    desc: 'Discover mutual wavelength matches nearby who are tuned into the same frequency at the same time.',
  },
  {
    icon: 'sparkles-outline',
    title: 'Zero Small-Talk Noise',
    desc: 'Bypasses superficial bios with deep vibe synchrony and shared aesthetic sparks.',
  },
];

// Attractive Invite Message Templates
const INVITE_TEMPLATES = [
  {
    id: 'cosmic',
    name: 'Cosmic Vibe',
    icon: 'planet-outline',
    badge: 'POPULAR ✨',
    color: ['#FBBF24', '#F59E0B', '#D97706'],
    message: (count, goal, isAdmin) =>
      isAdmin
        ? `✨ Join me on HeartLink! Match your vibe frequency & help us reach ${goal.toLocaleString()} members to unlock the Orbital Vibe Radar 🛰️💫 Currently at ${count.toLocaleString()} members!\n\nDownload HeartLink on Google Play: https://play.google.com/store/apps/details?id=com.heartlinkdatingapp.app`
        : `✨ Join me on HeartLink! Match your vibe frequency & help us unlock the Orbital Vibe Radar 🛰️💫\n\nDownload HeartLink on Google Play: https://play.google.com/store/apps/details?id=com.heartlinkdatingapp.app`,
  },
  {
    id: 'vip',
    name: 'VIP Pioneer',
    icon: 'sparkles-outline',
    badge: 'EXCLUSIVE 🚀',
    color: ['#8B5CF6', '#3B82F6'],
    message: (count, goal, isAdmin) =>
      isAdmin
        ? `🚀 VIP Invitation: Be part of the pioneer community on HeartLink! We're unlocking the Orbital Vibe Radar at ${goal.toLocaleString()} members (${count.toLocaleString()} joined already)! 🔥\n\nDownload HeartLink on Google Play: https://play.google.com/store/apps/details?id=com.heartlinkdatingapp.app`
        : `🚀 VIP Invitation: Be part of the pioneer community on HeartLink! We're unlocking the Orbital Vibe Radar for our community! 🔥\n\nClaim your spot: https://play.google.com/store/apps/details?id=com.heartlinkdatingapp.app`,
  },
  {
    id: 'romantic',
    name: 'Romantic Sparks',
    icon: 'heart-outline',
    badge: 'TRENDING 💖',
    color: ['#F59E0B', '#EA580C'],
    message: (count, goal, isAdmin) =>
      isAdmin
        ? `💖 Stop swiping blindly! Find your true aesthetic vibe match on HeartLink. Help us unlock Orbital Radar for everyone (${count.toLocaleString()}/${goal.toLocaleString()})! 🔮\n\nDownload HeartLink on Google Play: https://play.google.com/store/apps/details?id=com.heartlinkdatingapp.app`
        : `💖 Stop swiping blindly! Find your true aesthetic vibe match on HeartLink. Help us unlock the Orbital Vibe Radar! 🔮\n\nDownload HeartLink on Google Play: https://play.google.com/store/apps/details?id=com.heartlinkdatingapp.app`,
  },
  {
    id: 'nightowl',
    name: 'Night Owl Vibe',
    icon: 'moon-outline',
    badge: 'AESTHETIC 🎧',
    color: ['#6366F1', '#A855F7'],
    message: (count, goal, isAdmin) =>
      isAdmin
        ? `🎧 Late night beats & aesthetic connections! Join HeartLink today and help us hit ${goal.toLocaleString()} members to launch Orbital Vibe Radar 🌌 (${count.toLocaleString()} & counting!)\n\nDownload HeartLink on Google Play: https://play.google.com/store/apps/details?id=com.heartlinkdatingapp.app`
        : `🎧 Late night beats & aesthetic connections! Join HeartLink today and connect with people who share your midnight frequency 🌌\n\nDownload HeartLink on Google Play: https://play.google.com/store/apps/details?id=com.heartlinkdatingapp.app`,
  },
];

export default function VibesScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);

  // Only User ID = 16 (HeartLink Support / Admin) sees the Real Time user count section
  const isSupportOrAdmin = user?.id === 16 || user?.id === '16';

  const [userCount, setUserCount] = useState(0);
  const [targetGoal, setTargetGoal] = useState(5000);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('cosmic');
  const [copiedToast, setCopiedToast] = useState(false);
  const [waitlistNotified, setWaitlistNotified] = useState(true);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const radarSweepAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const activeTemplate = useMemo(() => {
    return INVITE_TEMPLATES.find(t => t.id === selectedTemplateId) || INVITE_TEMPLATES[0];
  }, [selectedTemplateId]);

  const currentInviteText = useMemo(() => {
    return activeTemplate.message(userCount, targetGoal, isSupportOrAdmin);
  }, [activeTemplate, userCount, targetGoal, isSupportOrAdmin]);

  const fetchUserCount = async () => {
    if (!isSupportOrAdmin) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
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
    if (isSupportOrAdmin) {
      fetchUserCount();
    } else {
      setLoading(false);
    }

    const unsubscribe = navigation.addListener('focus', () => {
      if (isSupportOrAdmin) {
        fetchUserCount();
      }
    });

    return unsubscribe;
  }, [navigation, isSupportOrAdmin]);

  // Orbit Pulse & Radar Rotation Loop
  useEffect(() => {
    // Pulse animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // 360 Radar Sweep continuous rotation
    const radarLoop = Animated.loop(
      Animated.timing(radarSweepAnim, {
        toValue: 1,
        duration: 5000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    radarLoop.start();

    return () => {
      pulseLoop.stop();
      radarLoop.stop();
    };
  }, []);

  const radarInterpolation = radarSweepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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
      <View style={styles.glowBlobGold} pointerEvents="none" />
      <View style={styles.glowBlobAmber} pointerEvents="none" />

      <SafeAreaView style={styles.flex}>
        {/* Header Bar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Orbital Vibes</Text>
            <Text style={styles.sub}>Aesthetic Frequency Matching</Text>
          </View>
          <View style={styles.lockStatusBadge}>
            <LinearGradient colors={['#FBBF24', '#F59E0B', '#D97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.lockBadgeGrad}>
              <View style={styles.pulseDot} />
              <Text style={styles.lockBadgeTxt}>COMING SOON</Text>
            </LinearGradient>
          </View>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            isSupportOrAdmin ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchUserCount();
                }}
                tintColor="#F59E0B"
              />
            ) : undefined
          }
        >
          {/* ─── 1. HERO ORBITAL RADAR VISUALIZER ─────────────────── */}
          <View style={styles.radarStage}>
            {/* Outer Orbit Ring */}
            <View style={styles.outerOrbitRing} />

            {/* Middle Orbit Ring */}
            <View style={styles.middleOrbitRing} />

            {/* Rotating Radar Sweep Beam */}
            <Animated.View
              style={[
                styles.radarSweepContainer,
                { transform: [{ rotate: radarInterpolation }] },
              ]}
              pointerEvents="none"
            >
              <LinearGradient
                colors={['rgba(245, 158, 11, 0.35)', 'rgba(245, 158, 11, 0.08)', 'transparent']}
                start={{ x: 1, y: 1 }}
                end={{ x: 0, y: 0 }}
                style={styles.radarSweepBeam}
              />
            </Animated.View>

            {/* Central Glowing Golden Core */}
            <Animated.View style={[styles.orbCoreWrap, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.orbGlowHalo} />
              <View style={styles.orbCoreCircle}>
                <BlurView intensity={isDark ? 60 : 90} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                <LinearGradient colors={['rgba(251, 191, 36, 0.3)', 'rgba(217, 119, 6, 0.25)']} style={StyleSheet.absoluteFill} />
                <Ionicons name="sparkles" size={26} color="#FBBF24" style={styles.sparkleIcon} />
                <Ionicons name="planet" size={46} color="#FBBF24" />
                <View style={styles.centerLockBadge}>
                  <Ionicons name="lock-closed" size={13} color="#FFFFFF" />
                </View>
              </View>
            </Animated.View>

            {/* Floating Frequency Pills around Radar */}
            {ORBIT_TAGS.map((tag) => (
              <View
                key={tag.id}
                style={[
                  styles.orbitPillWrap,
                  tag.top !== undefined && { top: tag.top },
                  tag.bottom !== undefined && { bottom: tag.bottom },
                  tag.left !== undefined && { left: tag.left },
                  tag.right !== undefined && { right: tag.right },
                ]}
              >
                <BlurView intensity={isDark ? 50 : 80} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                <View style={styles.orbitPillInner}>
                  <Text style={styles.orbitPillTxt}>{tag.title}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Radar Scanning Live Status */}
          <View style={styles.radarStatusPill}>
            <View style={styles.radarStatusPulseDot} />
            <Text style={styles.radarStatusTxt}>Orbital Radar Initializing • Calibration Phase</Text>
          </View>

          {/* ─── 2. FEATURE MANIFESTO & HEADING ────────────────────── */}
          <View style={styles.manifestoWrap}>
            <Text style={styles.manifestoSuper}>EXCLUSIVELY CRAFTED FOR HEARTLINK</Text>
            <Text style={styles.manifestoTitle}>Match on Energy, Not Just Photos.</Text>
            <Text style={styles.manifestoBody}>
              {isSupportOrAdmin ? (
                <>This game-changing feature is launching once we reach <Text style={styles.highlightTxt}>5,000 members</Text>. Discover people who share your vibe wavelength in real time.</>
              ) : (
                <>Orbital Vibes unlocks aesthetic frequencies, shared life rhythms, and conversational chemistry. Prepare to experience matchmaking on a cosmic level.</>
              )}
            </Text>
          </View>

          {/* ─── 3. VIP WAITLIST CONFIRMATION CARD ──────────────────── */}
          <View style={styles.waitlistCard}>
            <LinearGradient
              colors={isDark ? ['rgba(245, 158, 11, 0.12)', 'rgba(217, 119, 6, 0.05)'] : ['#FFFFFF', '#FFFDF7']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.waitlistHeaderRow}>
              <View style={styles.waitlistBadgeIcon}>
                <Ionicons name="checkmark-circle" size={24} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.waitlistTitle}>VIP Priority Beta Active</Text>
                <Text style={styles.waitlistSub}>You're set to receive instant access the moment the radar goes live.</Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setWaitlistNotified(!waitlistNotified)}
              style={styles.notifyToggleBtn}
            >
              <Ionicons
                name={waitlistNotified ? "notifications" : "notifications-off-outline"}
                size={16}
                color={waitlistNotified ? "#F59E0B" : theme.textSec}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.notifyToggleTxt, { color: waitlistNotified ? '#F59E0B' : theme.textSec }]}>
                {waitlistNotified ? 'Launch Alerts Enabled ✓' : 'Tap to Enable Launch Alerts'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ─── 4. PILLARS / HIGHLIGHT CARDS ───────────────────────── */}
          <View style={styles.pillarsSection}>
            <Text style={styles.sectionEyebrow}>WHAT TO EXPECT</Text>
            <Text style={styles.sectionHeaderTitle}>A Whole New Way to Connect</Text>

            {FEATURE_PILLARS.map((item, index) => (
              <View key={index} style={styles.pillarCard}>
                <View style={[StyleSheet.absoluteFill, { borderRadius: 18, overflow: 'hidden' }]}>
                  <BlurView intensity={isDark ? 40 : 70} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                  <LinearGradient
                    colors={isDark ? ['rgba(255, 255, 255, 0.04)', 'rgba(245, 158, 11, 0.04)'] : ['#FFFFFF', 'rgba(245, 158, 11, 0.04)']}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
                <View style={styles.pillarIconBox}>
                  <Ionicons name={item.icon} size={22} color="#F59E0B" />
                </View>
                <View style={styles.pillarContent}>
                  <Text style={styles.pillarTitle}>{item.title}</Text>
                  <Text style={styles.pillarDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ─── 5. REAL-TIME PROGRESS (Admin/Support Only) ─────────── */}
          {isSupportOrAdmin && (
            <View style={styles.progressCard}>
              <View style={[StyleSheet.absoluteFill, { borderRadius: 24, overflow: 'hidden' }]}>
                <BlurView intensity={isDark ? 50 : 80} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                <LinearGradient
                  colors={isDark ? ['rgba(255, 255, 255, 0.05)', 'rgba(245, 158, 11, 0.08)'] : ['rgba(255, 255, 255, 0.95)', 'rgba(245, 158, 11, 0.04)']}
                  style={StyleSheet.absoluteFill}
                />
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
                  <ActivityIndicator size="large" color="#F59E0B" />
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
                  <LinearGradient colors={['#FBBF24', '#F59E0B', '#D97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                </Animated.View>
              </View>

              <View style={styles.cardFooterRow}>
                <Ionicons name="people-outline" size={14} color={theme.textSec} style={{ marginRight: 6 }} />
                <Text style={styles.cardFooterTxt}>
                  {userCount < targetGoal ? `${(targetGoal - userCount).toLocaleString()} more members needed` : 'Goal reached! Launching feature...'}
                </Text>
              </View>
            </View>
          )}

          {/* ─── 6. INTERACTIVE INVITE MESSAGE SHOWCASE ─────────────── */}
          <View style={styles.inviteSection}>
            <View style={styles.inviteSectionHeader}>
              <View style={styles.inviteSectionIconBox}>
                <Ionicons name="send" size={16} color="#F59E0B" />
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

            {/* Message Preview Card */}
            <View style={styles.previewCard}>
              <View style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]}>
                <BlurView intensity={isDark ? 40 : 80} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                <LinearGradient
                  colors={isDark ? ['rgba(245, 158, 11, 0.1)', 'rgba(217, 119, 6, 0.05)'] : ['rgba(255, 255, 255, 0.95)', 'rgba(245, 158, 11, 0.03)']}
                  style={StyleSheet.absoluteFill}
                />
              </View>

              <View style={styles.previewHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="chatbox-ellipses-outline" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
                  <Text style={styles.previewHeaderLabel}>MESSAGE PREVIEW</Text>
                </View>
                <View style={styles.templateBadgeContainer}>
                  <Text style={styles.templateBadgeTxt}>{activeTemplate.badge}</Text>
                </View>
              </View>

              <View style={styles.quoteBox}>
                <FontAwesome name="quote-left" size={18} color="rgba(245, 158, 11, 0.3)" style={styles.quoteIcon} />
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

          {/* ─── 7. GOOGLE PLAY STORE DIRECT DOWNLOAD CARD ─────────── */}
          <TouchableOpacity
            style={styles.playStoreCard}
            onPress={() => Linking.openURL(PLAY_STORE_URL).catch(() => { })}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={isDark ? ['#1A1235', '#241442'] : ['#FFFFFF', '#F5F3FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.playStoreCardInner}
            >
              <View style={styles.playStoreIconWrap}>
                <Ionicons name="logo-google-playstore" size={26} color="#00E5FF" />
              </View>
              <View style={styles.playStoreTextCol}>
                <Text style={[styles.playStoreTitle, { color: theme.textPrimary }]}>
                  Download HeartLink on Google Play
                </Text>
                <Text style={[styles.playStoreSub, { color: theme.textSec }]}>
                  Official verified Android app • Latest release
                </Text>
              </View>
              <View style={styles.playStoreArrow}>
                <Ionicons name="open-outline" size={18} color="#F59E0B" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Bottom extra space */}
          <View style={{ height: 30 }} />
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
  glowBlobGold: {
    position: 'absolute',
    top: -40,
    right: -50,
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: (width * 0.75) / 2,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  glowBlobAmber: {
    position: 'absolute',
    bottom: 120,
    left: -60,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: (width * 0.8) / 2,
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
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
    elevation: 3,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  lockBadgeGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  lockBadgeTxt: {
    color: '#FFF',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 40,
    alignItems: 'center',
  },

  // ─── 1. RADAR STAGE ─────────────────────────────
  radarStage: {
    width: width - 40,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    position: 'relative',
  },
  outerOrbitRing: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(245, 158, 11, 0.22)' : 'rgba(245, 158, 11, 0.28)',
    borderStyle: 'dashed',
  },
  middleOrbitRing: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(245, 158, 11, 0.28)' : 'rgba(245, 158, 11, 0.35)',
  },
  radarSweepContainer: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarSweepBeam: {
    width: 120,
    height: 120,
    position: 'absolute',
    top: 0,
    right: 0,
    borderTopRightRadius: 120,
  },
  orbCoreWrap: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  orbGlowHalo: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  orbCoreCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.6)',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  sparkleIcon: {
    position: 'absolute',
    top: 10,
    right: 14,
  },
  centerLockBadge: {
    position: 'absolute',
    bottom: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  orbitPillWrap: {
    position: 'absolute',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.25)',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 6,
  },
  orbitPillInner: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.14)' : 'rgba(255, 255, 255, 0.85)',
  },
  orbitPillTxt: {
    fontSize: 11,
    fontWeight: '800',
    color: isDark ? '#FDE68A' : '#B45309',
    letterSpacing: -0.2,
  },
  radarStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 20,
  },
  radarStatusPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#F59E0B',
    marginRight: 8,
  },
  radarStatusTxt: {
    fontSize: 11.5,
    fontWeight: '700',
    color: isDark ? '#FBBF24' : '#B45309',
    letterSpacing: 0.2,
  },

  // ─── 2. MANIFESTO / HEADING ─────────────────────
  manifestoWrap: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 6,
  },
  manifestoSuper: {
    fontSize: 11,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  manifestoTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  manifestoBody: {
    fontSize: 14,
    color: theme.textSec,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 10,
  },
  highlightTxt: {
    color: '#F59E0B',
    fontWeight: '800',
  },

  // ─── 3. VIP WAITLIST CONFIRMATION CARD ──────────
  waitlistCard: {
    width: '100%',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.25)',
    overflow: 'hidden',
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  waitlistHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  waitlistBadgeIcon: {
    marginRight: 12,
  },
  waitlistTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.textPrimary,
    letterSpacing: -0.3,
  },
  waitlistSub: {
    fontSize: 12,
    color: theme.textSec,
    marginTop: 2,
    lineHeight: 17,
  },
  notifyToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.08)',
    borderRadius: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.18)',
  },
  notifyToggleTxt: {
    fontSize: 12.5,
    fontWeight: '800',
  },

  // ─── 4. PILLARS / HIGHLIGHTS ────────────────────
  pillarsSection: {
    width: '100%',
    marginBottom: 26,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  sectionHeaderTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: theme.textPrimary,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  pillarCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    marginBottom: 10,
    overflow: 'hidden',
  },
  pillarIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  pillarContent: {
    flex: 1,
  },
  pillarTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: theme.textPrimary,
    marginBottom: 3,
  },
  pillarDesc: {
    fontSize: 12,
    color: theme.textSec,
    lineHeight: 17,
  },

  // ─── 5. REAL-TIME USER PROGRESS (ADMIN) ─────────
  progressCard: {
    width: '100%',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.18)',
    marginBottom: 24,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  percentBadgeTxt: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '900',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  currentCountTxt: {
    fontSize: 34,
    fontWeight: '900',
    color: theme.textPrimary,
  },
  targetGoalTxt: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textSec,
  },
  progressBarTrack: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
    overflow: 'hidden',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardFooterTxt: {
    fontSize: 12,
    color: theme.textSec,
    fontWeight: '600',
  },

  // ─── 6. INVITE MESSAGE SECTION ──────────────────
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
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
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
    borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.15)',
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
    color: '#F59E0B',
    letterSpacing: 1,
  },
  templateBadgeContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  templateBadgeTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
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

  // ─── 7. PLAY STORE CARD ─────────────────────────
  playStoreCard: {
    width: '100%',
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.18)',
    elevation: 4,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  playStoreCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  playStoreIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  playStoreTextCol: {
    flex: 1,
  },
  playStoreTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  playStoreSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  playStoreArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
});
