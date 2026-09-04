// src/screens/DiscoverScreen.jsx
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Pressable,
  Animated, Dimensions, Image, ActivityIndicator,
  StatusBar, Platform, Easing, BackHandler, PanResponder,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useFonts,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800Bold,
} from '@expo-google-fonts/bricolage-grotesque';
const SatisfyFont = require('../../assets/fonts/Satisfy-Regular.ttf');
import CustomAlertModal from '../components/CustomAlertModal';
import MatchModal from '../components/MatchModal';
import ProfileDetail from '../components/discovery/ProfileDetail';
import AadhaarVerificationModal from '../components/AadhaarVerificationModal';
import SuperlikeUpgradeModal from '../components/SuperlikeUpgradeModal';
import { apiSwipeUser, apiGetDiscoveryFeed, apiResetDiscovery } from '../services/api';
import { ensureArray, formatImageUrl, calculateMatchPercentage, renderVerifiedBadge } from '../utils/helpers';
import { eventEmitter, EVENTS } from '../utils/eventEmitter';

import { scale, verticalScale, fs, SCREEN } from '../utils/responsive';

const { width, height } = SCREEN;

const LIKE_MESSAGES = [
  { title: 'Liked Profile', subtitle: 'Sending your interest request their way' },
  { title: "That's a Yes", subtitle: 'Fingers crossed for a mutual match' },
  { title: 'Great Taste', subtitle: 'Your like is registered and on its way' },
  { title: 'Sent Interest', subtitle: 'Now we wait to see if they connect back' },
  { title: 'Nice Pick', subtitle: 'They might just send a spark back to you' },
];

const PASS_MESSAGES = [
  { title: 'Passed Profile', subtitle: 'Searching for your next potential match' },
  { title: 'Moving On', subtitle: 'Bringing someone better suited your way' },
  { title: 'Next Up', subtitle: 'The right connection is still out there' },
  { title: 'Swiped Past', subtitle: 'Exploring new profiles in your feed' },
];

const SUPERLIKE_MESSAGES = [
  { title: 'Super Spark Sent!', subtitle: 'You stand out at the top of their incoming requests' },
  { title: 'Priority Like', subtitle: 'They will be notified of your special spark immediately' },
];

export default function DiscoverScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(theme, insets), [theme, insets]);

  const [fontsLoaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800Bold,
    Satisfy_400Regular: SatisfyFont,
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [feedLoading, setFeedLoading] = useState(true);

  const { user } = useAuth();
  const [dbProfiles, setDbProfiles] = useState([]);
  const [requestCount, setRequestCount] = useState(0);

  const [passedHistory, setPassedHistory] = useState([]);
  const [swipedCount, setSwipedCount] = useState(0);
  const [isSwipeLoading, setIsSwipeLoading] = useState(false);
  const [freeLimitModalVisible, setFreeLimitModalVisible] = useState(false);
  const [aadhaarModalVisible, setAadhaarModalVisible] = useState(false);
  const [noRewindModalVisible, setNoRewindModalVisible] = useState(false);
  const [rewindUsed, setRewindUsed] = useState(false);
  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [matchModalUser, setMatchModalUser] = useState(null);

  // Reaction toast state
  const [toastType, setToastType] = useState('like');
  const [toastMsg, setToastMsg] = useState(LIKE_MESSAGES[0]);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastScale = useRef(new Animated.Value(0.85)).current;

  // Active Plan Check
  const hasActivePlan = useMemo(() => {
    if (!user) return false;
    const raw = (
      user.activeSubscription?.plan_name ||
      user.active_subscription?.plan_name ||
      user.subscription_plan ||
      user.plan_name ||
      user.plan ||
      ''
    );
    const planName = (typeof raw === 'string' ? raw : (raw?.name || raw?.plan_key || raw?.plan_name || '')).toLowerCase();

    return !!(
      (planName && planName !== 'free' && planName !== 'basic_free' && planName !== 'none') ||
      user.premium === true ||
      user.isPremium === true ||
      user.subscription === 'active' ||
      user.subscriptionStatus === 'active'
    );
  }, [user]);

  const isFreePlan = useMemo(() => {
    const raw = user?.subscription_plan || '';
    const plan = (typeof raw === 'string' ? raw : (raw?.name || raw?.plan_key || raw?.plan_name || '')).toLowerCase();
    return plan === 'free' || plan === 'basic_free' || plan === '' || plan === 'none';
  }, [user]);

  const cardHeightRef = useRef(height * 0.5);

  // Animated values for Card
  const card1Pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const card1Scale = useRef(new Animated.Value(1)).current;
  const card1Opacity = useRef(new Animated.Value(1)).current;

  // Rotation during button swipe transition
  const rotate = card1Pos.x.interpolate({
    inputRange: [-width * 0.8, 0, width * 0.8],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });

  // Stamp opacities for real-time swipe hints
  const likeStampOpacity = card1Pos.x.interpolate({
    inputRange: [25, 90],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeStampOpacity = card1Pos.x.interpolate({
    inputRange: [-90, -25],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const detailsHintOpacity = card1Pos.y.interpolate({
    inputRange: [-75, -25],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const formatApiProfile = (u) => {
    let userPhotos = [];
    const photosArr = ensureArray(u.photos);
    if (photosArr.length > 0) {
      userPhotos = photosArr.map(p => (typeof p === 'string' ? p : (p ? (p.photo_url || p.uri) : null))).filter(Boolean);
    }
    if (u.avatar && !userPhotos.includes(u.avatar)) {
      userPhotos.unshift(u.avatar);
    }
    userPhotos = userPhotos.map(url => formatImageUrl(url)).filter(Boolean);
    if (userPhotos.length === 0) {
      userPhotos = ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900'];
    }

    const cityVal = u.city || u.user?.city || null;
    const cityState = cityVal ? `${cityVal}${u.state ? ', ' + u.state : ''}` : (u.location && u.location !== 'Nearby' ? u.location : 'Nearby');

    const matchRes = calculateMatchPercentage(user, u);
    const dynamicScore = u.compatibility_score || matchRes.percentage;

    const targetSettings = u.settings || (u.id === user?.id ? user?.settings : null);
    const isFalseVal = (v) => v === false || v === 0 || v === '0' || v === 'false';
    const isTrueVal = (v) => v === true || v === 1 || v === '1' || v === 'true';

    const showAgeSetting = targetSettings ? !isFalseVal(targetSettings.show_age) : true;
    const showOccupationSetting = targetSettings ? !isFalseVal(targetSettings.show_occupation) : true;
    const showDistanceSetting = targetSettings ? !isFalseVal(targetSettings.show_distance) : true;
    const hideEducationSetting = targetSettings ? isTrueVal(targetSettings.hide_education) : false;

    const isVerifiedUser = isTrueVal(u.is_verified) || isTrueVal(u.isVerified) || (u.id === user?.id && isTrueVal(user?.is_verified));

    return {
      id: u.id,
      name: u.name || 'Member',
      display_name: u.display_name || u.name || 'Member',
      displayName: u.display_name || u.name || 'Member',
      age: u.age || 25,
      isVerified: isVerifiedUser,
      is_verified: isVerifiedUser,
      subscription_plan: u.subscription_plan || u.subscriptionPlan,
      showAge: showAgeSetting,
      showOccupation: showOccupationSetting,
      showDistance: showDistanceSetting,
      hideEducation: hideEducationSetting,
      gender: u.gender || 'Female',
      job: showOccupationSetting ? (u.occupation || u.job || 'Member') : 'Member',
      occupation: u.occupation || u.job || null,
      bio: u.bio || 'Living life and finding meaningful connections on HeartLink.',
      city: cityVal || 'Nearby',
      location: cityState,
      distance: showDistanceSetting ? cityState : 'Hidden',
      compatibility: dynamicScore,
      images: userPhotos,
      interests: ensureArray(u.interests, ['Travel', 'Coffee', 'Music']),
      mutuals: ensureArray(u.mutuals, []),
      smoking: u.smoking,
      drinking: u.drinking,
      clubbing: u.clubbing,
      diet: u.diet,
      education: u.education,
      religion: u.religion,
      mother_tongue: u.mother_tongue || u.motherTongue,
      marital_status: u.marital_status || u.maritalStatus,
      user: u,
    };
  };

  const getTodayKey = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const syncDailySwipeLimit = useCallback(async () => {
    if (!user?.id) return;
    try {
      const today = getTodayKey();
      const storedDate = await AsyncStorage.getItem(`@heartlink_swipe_date_${user.id}`);
      if (storedDate !== today) {
        // Calendar day changed (passed 12:00 AM midnight) -> reset to 0
        await AsyncStorage.setItem(`@heartlink_swipe_date_${user.id}`, today);
        await AsyncStorage.setItem(`@heartlink_daily_swipes_${user.id}`, '0');
        setSwipedCount(0);
      } else {
        const countStr = await AsyncStorage.getItem(`@heartlink_daily_swipes_${user.id}`);
        const count = parseInt(countStr || '0', 10);
        setSwipedCount(isNaN(count) ? 0 : count);
      }
    } catch (_) { }
  }, [user?.id]);

  const fetchFeed = async (isBackground = false) => {
    try {
      if (!isBackground && dbProfiles.length === 0) setFeedLoading(true);
      await syncDailySwipeLimit();
      const fRes = await apiGetDiscoveryFeed().catch(() => null);

      if (fRes?.profiles && Array.isArray(fRes.profiles)) {
        const formatted = fRes.profiles
          .filter(p => p.id !== 16 && p.id !== '16' && !p.is_support)
          .map(formatApiProfile);
        setDbProfiles(formatted);
      }
      if (typeof fRes?.daily_likes_count === 'number') {
        setSwipedCount(fRes.daily_likes_count);
        if (user?.id) {
          const today = getTodayKey();
          AsyncStorage.setItem(`@heartlink_swipe_date_${user.id}`, today).catch(() => { });
          AsyncStorage.setItem(`@heartlink_daily_swipes_${user.id}`, String(fRes.daily_likes_count)).catch(() => { });
        }
      }
    } catch (err) {
      console.warn('Discovery Feed fetch error:', err?.message);
    } finally {
      if (!isBackground) setFeedLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed(false);
    syncDailySwipeLimit();

    const unsubReq = eventEmitter.on(EVENTS.REQUEST_UPDATED, () => fetchFeed(true));
    const unsubMatch = eventEmitter.on(EVENTS.MATCH_UPDATED, () => fetchFeed(true));
    const unsubscribe = navigation.addListener('focus', () => {
      setPhotoIdx(0);
      syncDailySwipeLimit();
      fetchFeed(true);
    });

    return () => {
      unsubscribe();
      unsubReq();
      unsubMatch();
    };
  }, [navigation, syncDailySwipeLimit]);

  const activeProfiles = useMemo(() => {
    const userGender = (user?.gender || 'Man').toLowerCase();
    const isMaleUser = userGender === 'man' || userGender === 'male';
    const targetGenders = isMaleUser ? ['female', 'woman'] : ['male', 'man'];

    if (dbProfiles.length > 0) {
      const nonSupport = dbProfiles.filter(p => p.id !== 16 && p.id !== '16' && !p.is_support);
      const filtered = nonSupport.filter(p => !p.gender || targetGenders.includes(p.gender.toLowerCase()));
      return filtered.length > 0 ? filtered : nonSupport;
    }

    return [];
  }, [dbProfiles, user]);

  const currentProfile = activeProfiles.length > 0 ? activeProfiles[0] : null;

  // Clear toast if feed is empty
  useEffect(() => {
    if (!currentProfile || activeProfiles.length === 0) {
      toastOpacity.setValue(0);
    }
  }, [currentProfile, activeProfiles.length, toastOpacity]);

  const showDetailRef = useRef(false);
  useEffect(() => {
    showDetailRef.current = showDetail;
  }, [showDetail]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (showDetailRef.current) {
          setShowDetail(false);
          return true;
        }
        return false;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  const safePhotoIdx = Math.min(photoIdx, (currentProfile?.images?.length || 1) - 1);

  const handlePhotoTapLeft = () => {
    if (isAnimating) return;
    setPhotoIdx(prev => Math.max(0, prev - 1));
  };

  const handlePhotoTapRight = () => {
    if (isAnimating) return;
    if (currentProfile?.images?.length) {
      setPhotoIdx(prev => Math.min(prev + 1, currentProfile.images.length - 1));
    }
  };

  const openDetail = () => {
    if (!currentProfile) return;
    setShowDetail(true);
  };

  const closeDetail = () => {
    setShowDetail(false);
  };

  const resetCardPositions = () => {
    card1Pos.setValue({ x: 0, y: 0 });
    card1Scale.setValue(1);
    card1Opacity.setValue(1);
    toastOpacity.setValue(0);
  };

  const handleRewindPassedProfile = () => {
    if (isAnimating) return;
    if (passedHistory.length === 0) {
      setNoRewindModalVisible(true);
      return;
    }

    const lastPassed = passedHistory[passedHistory.length - 1];
    setPassedHistory(prev => prev.slice(0, -1));

    setDbProfiles(prev => [lastPassed, ...prev.filter(p => p.id !== lastPassed.id)]);
    resetCardPositions();
  };

  const handleRewindPress = () => {
    if (!isFreePlan) {
      handleRewindPassedProfile();
      return;
    }
    if (rewindUsed) {
      setNoRewindModalVisible(true);
      return;
    }
    setRewindUsed(true);
    handleRewindPassedProfile();
  };

  const [dailyVerifyPromptVisible, setDailyVerifyPromptVisible] = useState(false);
  const isVerifiedUser =
    user?.is_verified === true ||
    user?.is_verified === 1 ||
    user?.is_verified === '1' ||
    user?.is_verified === 'true' ||
    user?.isVerified === true ||
    user?.isVerified === 1 ||
    user?.isVerified === '1' ||
    user?.isVerified === 'true';

  useEffect(() => {
    let timer;
    const checkAndShowVerifyPrompt = async () => {
      if (!user || !user.id || isVerifiedUser) {
        setDailyVerifyPromptVisible(false);
        return;
      }

      try {
        const storageKey = `@heartlink_verify_popup_shown_${user.id}`;

        // 1. If already shown or dismissed before for this user, do not show again
        const hasShown = await AsyncStorage.getItem(storageKey);
        if (hasShown === 'true') {
          setDailyVerifyPromptVisible(false);
          return;
        }

        // 2. Only show within the first 24 hours of account creation
        if (user.created_at) {
          const createdAtTime = new Date(user.created_at).getTime();
          const now = Date.now();
          if (!isNaN(createdAtTime)) {
            const hoursSinceCreation = (now - createdAtTime) / (1000 * 60 * 60);
            if (hoursSinceCreation > 24) {
              // Account is older than 24 hours, mark as shown so it never prompts
              await AsyncStorage.setItem(storageKey, 'true').catch(() => { });
              setDailyVerifyPromptVisible(false);
              return;
            }
          }
        }

        // Show once after a brief delay
        timer = setTimeout(async () => {
          setDailyVerifyPromptVisible(true);
          await AsyncStorage.setItem(storageKey, 'true').catch(() => { });
        }, 1000);
      } catch (err) {
        console.warn('Verify prompt check error:', err?.message);
      }
    };

    checkAndShowVerifyPrompt();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [user?.id, user?.created_at, isVerifiedUser]);

  const [superlikeUpgradeModalVisible, setSuperlikeUpgradeModalVisible] = useState(false);
  const [superlikeModalMessage, setSuperlikeModalMessage] = useState('');
  const [isSuperlikeLoading, setIsSuperlikeLoading] = useState(false);

  const handleSparkPress = async () => {
    if (isAnimating || isSuperlikeLoading || !currentProfile) return;

    const currentP = currentProfile;
    setIsSuperlikeLoading(true);

    try {
      const res = await apiSwipeUser(currentP.id, 'super_like');
      setIsSuperlikeLoading(false);
      executeSuperlikeSwipe(currentP, res);
    } catch (err) {
      setIsSuperlikeLoading(false);

      // Ensure card remains in current position on screen, do not swipe away
      Animated.spring(card1Pos, { toValue: { x: 0, y: 0 }, friction: 7, useNativeDriver: false }).start();

      if (err?.message?.includes('not verified') || err?.requires_verification) {
        setAadhaarModalVisible(true);
      } else if (
        err?.limit_type === 'super_like' ||
        err?.message?.toLowerCase()?.includes('superlike') ||
        err?.error === 'UPGRADE_PLAN_REQUIRED'
      ) {
        setSuperlikeModalMessage(err?.message || '');
        setSuperlikeUpgradeModalVisible(true);
      } else if (err?.message?.includes('limit') || err?.requires_upgrade) {
        setFreeLimitModalVisible(true);
      } else {
        setSuperlikeModalMessage(err?.message || '');
        setSuperlikeUpgradeModalVisible(true);
      }
    }
  };

  const executeSuperlikeSwipe = (currentP, res) => {
    if (!currentP) return;

    setToastType('super_like');
    setToastMsg(SUPERLIKE_MESSAGES[Math.floor(Math.random() * SUPERLIKE_MESSAGES.length)]);

    setIsAnimating(true);
    setSwipedCount(prev => prev + 1);

    if (res?.is_match) {
      setMatchModalUser(currentP);
      setMatchModalVisible(true);
    } else {
      eventEmitter.emit(EVENTS.REQUEST_SENT, {
        title: 'Super Spark Sent',
        message: `Sent interest request to ${currentP.name || 'Member'}`,
        avatar: currentP.avatar || currentP.image,
        userId: currentP.id,
      });
    }

    const isLastProfile = activeProfiles.length <= 1;
    const targetX = width * 1.35;

    // Phase 1: Slide current profile card off-screen cleanly
    Animated.parallel([
      Animated.timing(card1Pos.x, {
        toValue: targetX,
        duration: 190,
        useNativeDriver: false,
        easing: Easing.out(Easing.quad),
      }),
      Animated.timing(card1Opacity, {
        toValue: 0,
        duration: 170,
        useNativeDriver: false,
      })
    ]).start(() => {
      if (!isLastProfile) {
        // Phase 2: Show reaction status toast on screen -> display -> fade out completely
        toastOpacity.setValue(0);
        toastScale.setValue(0.85);

        Animated.sequence([
          Animated.parallel([
            Animated.timing(toastOpacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: false,
              easing: Easing.out(Easing.quad),
            }),
            Animated.spring(toastScale, {
              toValue: 1,
              friction: 6,
              tension: 40,
              useNativeDriver: false,
            }),
          ]),
          Animated.delay(400),
          Animated.timing(toastOpacity, {
            toValue: 0,
            duration: 180,
            useNativeDriver: false,
          }),
        ]).start(() => {
          // Phase 3: AFTER reaction toast has completely disappeared, transition next profile onto clean screen
          setPhotoIdx(0);
          setDbProfiles(prev => prev.filter(p => p.id !== currentP?.id));

          card1Pos.setValue({ x: 0, y: 0 });
          card1Scale.setValue(0.95);
          card1Opacity.setValue(0);

          Animated.parallel([
            Animated.timing(card1Opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: false,
              easing: Easing.out(Easing.quad),
            }),
            Animated.spring(card1Scale, {
              toValue: 1,
              friction: 8,
              tension: 45,
              useNativeDriver: false,
            }),
          ]).start(() => {
            setIsAnimating(false);
          });
        });
      } else {
        // Final profile swiped: remove from state immediately and show clean empty feed popup
        toastOpacity.setValue(0);
        setPhotoIdx(0);
        setDbProfiles(prev => prev.filter(p => p.id !== currentP?.id));
        card1Pos.setValue({ x: 0, y: 0 });
        card1Scale.setValue(1);
        card1Opacity.setValue(1);
        setIsAnimating(false);
      }
    });
  };

  // Sequential 3-Phase Animation Sequence for Like / Pass swipes
  const executeSwipeTransition = (direction, swipeType, currentP, res) => {
    if (!currentP) return;

    const isLastProfile = activeProfiles.length <= 1;

    // Set status message text & icon type
    if (direction === 'right' || swipeType === 'like') {
      setToastType('like');
      setToastMsg(LIKE_MESSAGES[Math.floor(Math.random() * LIKE_MESSAGES.length)]);
    } else {
      setToastType('pass');
      setToastMsg(PASS_MESSAGES[Math.floor(Math.random() * PASS_MESSAGES.length)]);
    }

    setIsAnimating(true);

    if (swipeType === 'pass') {
      setPassedHistory(prev => [...prev, currentP]);
    }

    if (res?.is_match) {
      setMatchModalUser(currentP);
      setMatchModalVisible(true);
    } else if (swipeType === 'like') {
      eventEmitter.emit(EVENTS.REQUEST_SENT, {
        title: 'Like Sent',
        message: `Sent interest request to ${currentP.name || 'Member'}`,
        avatar: currentP.avatar || currentP.image,
        userId: currentP.id,
      });
    }

    const targetX = direction === 'right' ? width * 1.35 : -width * 1.35;

    // Phase 1: Slide current profile card off-screen cleanly
    Animated.parallel([
      Animated.timing(card1Pos.x, {
        toValue: targetX,
        duration: 190,
        useNativeDriver: false,
        easing: Easing.out(Easing.quad),
      }),
      Animated.timing(card1Opacity, {
        toValue: 0,
        duration: 170,
        useNativeDriver: false,
      })
    ]).start(() => {
      if (!isLastProfile) {
        // Phase 2: Show reaction status toast on screen -> display -> fade out completely
        toastOpacity.setValue(0);
        toastScale.setValue(0.85);

        Animated.sequence([
          Animated.parallel([
            Animated.timing(toastOpacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: false,
              easing: Easing.out(Easing.quad),
            }),
            Animated.spring(toastScale, {
              toValue: 1,
              friction: 6,
              tension: 40,
              useNativeDriver: false,
            }),
          ]),
          Animated.delay(400),
          Animated.timing(toastOpacity, {
            toValue: 0,
            duration: 180,
            useNativeDriver: false,
          }),
        ]).start(() => {
          // Phase 3: AFTER reaction toast has completely disappeared, transition next profile onto clean screen
          setPhotoIdx(0);
          setDbProfiles(prev => prev.filter(p => p.id !== currentP?.id));

          card1Pos.setValue({ x: 0, y: 0 });
          card1Scale.setValue(0.95);
          card1Opacity.setValue(0);

          Animated.parallel([
            Animated.timing(card1Opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: false,
              easing: Easing.out(Easing.quad),
            }),
            Animated.spring(card1Scale, {
              toValue: 1,
              friction: 8,
              tension: 45,
              useNativeDriver: false,
            }),
          ]).start(() => {
            setIsAnimating(false);
          });
        });
      } else {
        // Final profile swiped: remove from state immediately and show clean empty feed popup
        toastOpacity.setValue(0);
        setPhotoIdx(0);
        setDbProfiles(prev => prev.filter(p => p.id !== currentP?.id));
        card1Pos.setValue({ x: 0, y: 0 });
        card1Scale.setValue(1);
        card1Opacity.setValue(1);
        setIsAnimating(false);
      }
    });
  };

  const swipeCard = async (direction, rawSwipeType = 'like') => {
    if (isAnimating || isSwipeLoading || !currentProfile) return;

    const swipeType = (typeof rawSwipeType === 'string' && ['like', 'super_like', 'pass'].includes(rawSwipeType))
      ? rawSwipeType
      : (direction === 'right' ? 'like' : 'pass');

    if (swipeType === 'super_like') {
      handleSparkPress();
      return;
    }

    const currentP = currentProfile;
    if (!currentP || !currentP.id) return;

    // 1. Check if user on free plan without active subscription has already reached 5 daily likes
    if (!hasActivePlan && (swipeType === 'like' || swipeType === 'pass') && swipedCount >= 5) {
      setFreeLimitModalVisible(true);
      Animated.spring(card1Pos, { toValue: { x: 0, y: 0 }, friction: 7, useNativeDriver: false }).start();
      return;
    }

    setIsSwipeLoading(true);

    try {
      const res = await apiSwipeUser(currentP.id, swipeType);
      setIsSwipeLoading(false);

      // Increment daily counter and persist for today
      setSwipedCount(prev => {
        const next = prev + 1;
        if (user?.id) {
          AsyncStorage.setItem(`@heartlink_daily_swipes_${user.id}`, String(next)).catch(() => { });
        }
        return next;
      });

      // Execute animated card exit and advance to next profile
      executeSwipeTransition(direction, swipeType, currentP, res);
    } catch (err) {
      setIsSwipeLoading(false);

      // RESTRICT CARD: Spring the card back to center! Never swipe away if rejected or limit reached!
      Animated.spring(card1Pos, { toValue: { x: 0, y: 0 }, friction: 7, useNativeDriver: false }).start();

      if (err?.message?.includes('not verified') || err?.requires_verification) {
        setAadhaarModalVisible(true);
      } else if (err?.message?.includes('limit') || err?.requires_upgrade || err?.error === 'UPGRADE_PLAN_REQUIRED') {
        setSwipedCount(5);
        if (user?.id) {
          AsyncStorage.setItem(`@heartlink_daily_swipes_${user.id}`, '5').catch(() => { });
        }
        setFreeLimitModalVisible(true);
      } else {
        console.warn('Swipe error:', err?.message);
      }
    }
  };

  const moveToNext = (swipeType = 'like') => {
    swipeCard('right', swipeType);
  };

  const moveToPrevious = () => {
    swipeCard('left', 'pass');
  };

  const swipeCardRef = useRef(swipeCard);
  swipeCardRef.current = swipeCard;
  const openDetailRef = useRef(openDetail);
  openDetailRef.current = openDetail;
  const isAnimatingRef = useRef(isAnimating);
  isAnimatingRef.current = isAnimating;

  // Touch and drag gesture handler: allows moving the profile card anywhere on touch
  // and opening profile details when swiped upward
  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (isAnimatingRef.current || showDetailRef.current) return false;
        return Math.abs(gestureState.dx) > 7 || Math.abs(gestureState.dy) > 7;
      },
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        if (isAnimatingRef.current || showDetailRef.current) return false;
        return Math.abs(gestureState.dx) > 7 || Math.abs(gestureState.dy) > 7;
      },
      onPanResponderGrant: () => {
        card1Pos.stopAnimation();
      },
      onPanResponderMove: (evt, gestureState) => {
        card1Pos.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (evt, gestureState) => {
        const { dx, dy, vx } = gestureState;

        // 1. SWIPE UP -> Show User Details
        if (dy < -65 && Math.abs(dy) > Math.abs(dx) * 0.75) {
          Animated.spring(card1Pos, {
            toValue: { x: 0, y: 0 },
            friction: 7,
            tension: 45,
            useNativeDriver: false,
          }).start();
          openDetailRef.current();
          return;
        }

        // 2. SWIPE RIGHT -> LIKE
        if (dx > 110 || (dx > 50 && vx > 0.4)) {
          swipeCardRef.current('right', 'like');
          return;
        }

        // 3. SWIPE LEFT -> PASS
        if (dx < -110 || (dx < -50 && vx < -0.4)) {
          swipeCardRef.current('left', 'pass');
          return;
        }

        // 4. Released without meeting threshold -> Spring back to center smoothly
        Animated.spring(card1Pos, {
          toValue: { x: 0, y: 0 },
          friction: 6,
          tension: 40,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(card1Pos, {
          toValue: { x: 0, y: 0 },
          friction: 6,
          tension: 40,
          useNativeDriver: false,
        }).start();
      },
    });
  }, [card1Pos]);

  const discoverBgGrad = useMemo(() => {
    return isDark
      ? ['#16120C', '#0E0B07', '#060503'] // Ultra-fresh obsidian with luminous golden warmth
      : ['#FFFDF9', '#FAF5EB', '#F4EDE0']; // Clean frosted starlight champagne
  }, [isDark]);

  return (
    <LinearGradient colors={discoverBgGrad} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />

      <SafeAreaView style={styles.headerWrap} edges={['top']}>
        <View style={styles.headerPill}>
          <View style={styles.headerTitleContainer} pointerEvents="none">
            <View style={styles.brandTitleRow}>
              <Text style={styles.headerCenterTitle}>HeartLink</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.headerLeftBtn} onPress={() => navigation.navigate('Profile')} activeOpacity={0.7}>
            <Ionicons name="person" size={17} color={isDark ? '#FDE68A' : theme.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerRightGroup}>
            <TouchableOpacity style={styles.headerRightBtn} onPress={() => navigation.navigate('Settings')} activeOpacity={0.7}>
              <Ionicons name="options-outline" size={18} color={isDark ? '#FDE68A' : theme.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerRightBtn} onPress={() => navigation.navigate('Requests')} activeOpacity={0.7}>
              <Ionicons name="notifications" size={19} color={isDark ? '#FDE68A' : theme.textPrimary} />
              {requestCount > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>{requestCount > 99 ? '99+' : requestCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.mainContent} pointerEvents={(showDetail || feedLoading) ? "none" : "auto"}>
        <View style={styles.glowBlobGold} pointerEvents="none" />
        <View style={styles.glowBlobAmber} pointerEvents="none" />
        <View style={styles.glowBlobWarm} pointerEvents="none" />

        {/* Reaction Toast Overlay (Shown on clean screen, disappears completely before next profile arrives) */}
        {currentProfile && activeProfiles.length > 0 && (
          <Animated.View
            style={[
              styles.reactionToast,
              {
                opacity: toastOpacity,
                transform: [{ scale: toastScale }],
              },
            ]}
            pointerEvents="none"
          >
            <View
              style={[
                styles.reactionIconCircle,
                toastType === 'super_like'
                  ? styles.reactionIconCircleSuperlike
                  : toastType === 'like'
                    ? styles.reactionIconCircleLike
                    : styles.reactionIconCirclePass,
              ]}
            >
              <Ionicons
                name={toastType === 'super_like' ? 'flash' : toastType === 'like' ? 'heart' : 'close'}
                size={toastType === 'pass' ? 36 : 30}
                color="#FFF"
              />
            </View>
            <Text style={styles.reactionTitle}>{toastMsg.title}</Text>
            <Text style={styles.reactionSubtitle}>{toastMsg.subtitle}</Text>
          </Animated.View>
        )}

        {/* Card Container (Only Current Profile Card Rendered) */}
        <View
          style={styles.cardStackContainer}
          onLayout={(e) => {
            cardHeightRef.current = e.nativeEvent.layout.height;
          }}
        >
          {!currentProfile || activeProfiles.length === 0 ? (
            feedLoading ? (
              <View style={styles.emptyWrap} pointerEvents="none">
                <ActivityIndicator size="large" color="#FF007F" />
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyCard}>
                  <LinearGradient
                    colors={['#FBBF24', '#F59E0B', '#D97706']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.emptyIconWrap}
                  >
                    <Ionicons name="sparkles" size={36} color="#FFF" />
                  </LinearGradient>

                  <Text style={styles.emptyTitle}>You've Swiped All Profiles!</Text>

                  <View style={styles.emptyRefreshPill}>
                    <Ionicons name="time-outline" size={13} color="#F59E0B" style={{ marginRight: 5 }} />
                    <Text style={styles.emptyRefreshPillTxt}>5 Free Likes refresh everyday at 12:00 AM</Text>
                  </View>

                  {!user?.subscription_plan || user?.subscription_plan === 'Free' || user?.subscription_plan === 'basic_free' ? (
                    <>
                      <Text style={styles.emptySub}>
                        Upgrade to HeartLink Plus or Premium to unlock unlimited daily profile likes, rewinds, and priority matching!
                      </Text>
                      <TouchableOpacity
                        style={styles.emptyBtn}
                        onPress={() => navigation.navigate('Plans')}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={['#FBBF24', '#F59E0B', '#D97706']} style={styles.emptyBtnGrad}>
                          <Ionicons name="sparkles" size={18} color="#FFF" style={{ marginRight: 6 }} />
                          <Text style={styles.emptyBtnTxt}>Upgrade Plan to Unlock Swipes</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={styles.emptySub}>
                        As an active member ({user?.subscription_plan}), you can reload your feed anytime to explore swiped profiles again!
                      </Text>
                      <TouchableOpacity
                        style={styles.emptyBtn}
                        onPress={async () => {
                          try {
                            setFeedLoading(true);
                            await apiResetDiscovery();
                            await fetchFeed();
                          } catch (err) {
                            console.warn('Reload feed error:', err);
                          } finally {
                            setCurrentIndex(0);
                            resetCardPositions();
                            setFeedLoading(false);
                          }
                        }}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={['#FBBF24', '#F59E0B', '#D97706']} style={styles.emptyBtnGrad}>
                          <Ionicons name="refresh-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                          <Text style={styles.emptyBtnTxt}>Reload Swiped Feed</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            )
          ) : (
            /* Single focused Card - Action Buttons for profile swiping */
            <Animated.View
              {...panResponder.panHandlers}
              style={[
                styles.card,
                styles.cardActive,
                {
                  opacity: card1Opacity,
                  transform: [
                    { translateX: card1Pos.x },
                    { translateY: card1Pos.y },
                    { rotate: rotate },
                    { scale: card1Scale }
                  ]
                }
              ]}
            >
              <Image
                key={`${currentProfile?.id}_${safePhotoIdx}`}
                source={{ uri: formatImageUrl(currentProfile?.images?.[safePhotoIdx] || currentProfile?.images?.[0]) }}
                style={styles.cardPhoto}
                resizeMode="cover"
              />

              <LinearGradient colors={['rgba(0,0,0,0.15)', 'transparent']} style={styles.topGrad} />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.75)']} style={styles.bottomGrad} />

              {/* Dynamic Action Stamps */}
              <Animated.View style={[styles.stampContainer, styles.likeStamp, { opacity: likeStampOpacity }]} pointerEvents="none">
                <Text style={styles.likeStampText}>LIKE</Text>
              </Animated.View>

              <Animated.View style={[styles.stampContainer, styles.nopeStamp, { opacity: nopeStampOpacity }]} pointerEvents="none">
                <Text style={styles.nopeStampText}>NOPE</Text>
              </Animated.View>

              <Animated.View style={[styles.detailsHintContainer, { opacity: detailsHintOpacity }]} pointerEvents="none">
                <Ionicons name="chevron-up" size={17} color="#FDE68A" style={{ marginRight: 4 }} />
                <Text style={styles.detailsHintText}>VIEW DETAILS</Text>
              </Animated.View>

              {/* Top-Right Match Percentage Badge */}
              <LinearGradient
                colors={['rgba(251, 191, 36, 0.95)', 'rgba(217, 119, 6, 0.95)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardMatchBadge}
                pointerEvents="none"
              >
                <Ionicons name="sparkles" size={11} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.cardMatchBadgeTxt}>{currentProfile.compatibility}% MATCH</Text>
              </LinearGradient>

              {/* Photo progress dots */}
              {currentProfile.images.length > 1 && (
                <View style={styles.photoDotsRow} pointerEvents="none">
                  {currentProfile.images.map((_, i) => (
                    <View
                      key={i}
                      style={[styles.photoDot, i === safePhotoIdx && styles.photoDotActive]}
                    />
                  ))}
                </View>
              )}

              {/* Tap zones: left = prev photo, right = next photo, center = detail */}
              <View style={styles.tapZoneRow} pointerEvents="box-none">
                <Pressable onPress={handlePhotoTapLeft} style={{ flex: 1 }}>
                  <View style={styles.tapZoneSide} />
                </Pressable>
                <Pressable onPress={openDetail} style={{ flex: 2 }}>
                  <View style={styles.tapZoneCenter} />
                </Pressable>
                <Pressable onPress={handlePhotoTapRight} style={{ flex: 1 }}>
                  <View style={styles.tapZoneSide} />
                </Pressable>
              </View>

              <View style={{ width: '100%', position: 'absolute', bottom: 0 }} pointerEvents="box-none">
                <TouchableOpacity activeOpacity={0.9} onPress={openDetail} style={styles.cardTextOverlayBottomLeft}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.cardProfileName}>
                      {currentProfile.display_name || currentProfile.displayName || currentProfile.name}
                      {currentProfile.showAge !== false ? `, ${currentProfile.age}` : ''}
                    </Text>
                    {renderVerifiedBadge(currentProfile, 19, { marginLeft: 6 })}
                  </View>
                  <View style={styles.cardGlassPillRow}>
                    {currentProfile.job ? (
                      <View style={styles.cardInfoPill}>
                        <Ionicons name="briefcase-outline" size={12} color="#FDE68A" style={{ marginRight: 5 }} />
                        <Text style={styles.cardInfoPillTxt} numberOfLines={1}>{currentProfile.job}</Text>
                      </View>
                    ) : null}
                    {currentProfile.distance ? (
                      <View style={styles.cardInfoPill}>
                        <Ionicons name="location-sharp" size={12} color="#FDE68A" style={{ marginRight: 4 }} />
                        <Text style={styles.cardInfoPillTxt}>{currentProfile.distance}</Text>
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </View>

        {/* Actions Row */}
        {currentProfile && activeProfiles.length > 0 && (
          <View style={styles.actionsRowWrapper}>
            {passedHistory.length > 0 && (
              <TouchableOpacity
                onPress={handleRewindPress}
                activeOpacity={0.8}
                style={styles.actionBtnRewindFloating}
                disabled={isAnimating}
              >
                <Ionicons name="arrow-undo" size={16} color="#F59E0B" />
              </TouchableOpacity>
            )}

            <View style={styles.actionsRowContainer}>
              <TouchableOpacity
                onPress={moveToPrevious}
                activeOpacity={0.8}
                style={styles.actionBtnSmallX}
                disabled={isAnimating || isSwipeLoading}
              >
                <LinearGradient
                  colors={['#3B82F6', '#1D4ED8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionBtnGradFill}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSparkPress}
                activeOpacity={0.8}
                style={styles.actionBtnLargeLightning}
                disabled={isAnimating || isSuperlikeLoading || isSwipeLoading}
              >
                <LinearGradient
                  colors={['#FBBF24', '#F59E0B', '#D97706']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionBtnGradFill}
                >
                  {isSuperlikeLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="flash" size={28} color="#fff" />
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => moveToNext('like')}
                activeOpacity={0.8}
                style={styles.actionBtnSmallHeart}
                disabled={isAnimating || isSwipeLoading}
              >
                <LinearGradient
                  colors={['#FF007F', '#D90429']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionBtnGradFill}
                >
                  <Ionicons name="heart" size={24} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Unified Profile Detail Modal */}
      {showDetail && currentProfile && (
        <ProfileDetail
          visible={showDetail}
          profile={currentProfile}
          onClose={closeDetail}
          onLike={() => {
            closeDetail();
            moveToNext('like');
          }}
          onSuperLike={() => {
            closeDetail();
            handleSparkPress();
          }}
          onPass={() => {
            closeDetail();
            moveToPrevious();
          }}
          isMatch={false}
        />
      )}

      <CustomAlertModal
        visible={freeLimitModalVisible}
        title="Free Profiles Exhausted"
        message="You have reached your daily limit of 5 free profiles for today. Your 5 free likes refresh everyday at 12:00 AM midnight. Upgrade your plan now to unlock unlimited likes and discover more connections!"
        icon="lock-closed-outline"
        iconColor="#F59E0B"
        confirmText="Upgrade Plan"
        cancelText="Maybe Later"
        onConfirm={() => {
          setFreeLimitModalVisible(false);
          navigation.navigate('Plans');
        }}
        onCancel={() => {
          setFreeLimitModalVisible(false);
          Animated.spring(card1Pos, { toValue: { x: 0, y: 0 }, friction: 7, useNativeDriver: false }).start();
        }}
      />

      <AadhaarVerificationModal
        visible={aadhaarModalVisible || dailyVerifyPromptVisible}
        onClose={async () => {
          setAadhaarModalVisible(false);
          setDailyVerifyPromptVisible(false);
          if (user?.id) {
            await AsyncStorage.setItem(`@heartlink_verify_popup_shown_${user.id}`, 'true').catch(() => { });
          }
        }}
        initialStep="alert"
      />

      <SuperlikeUpgradeModal
        visible={superlikeUpgradeModalVisible}
        message={superlikeModalMessage}
        onUpgrade={() => {
          setSuperlikeUpgradeModalVisible(false);
          navigation.navigate('Plans');
        }}
        onClose={() => setSuperlikeUpgradeModalVisible(false)}
      />

      <CustomAlertModal
        visible={noRewindModalVisible}
        title="Action Restricted"
        message="You are on a free plan and can go back only once."
        icon="arrow-undo-circle-outline"
        iconColor="#F59E0B"
        confirmText="Got it"
        onConfirm={() => setNoRewindModalVisible(false)}
      />

      <MatchModal
        visible={matchModalVisible}
        currentUser={user}
        matchedUser={matchModalUser}
        onClose={() => setMatchModalVisible(false)}
        onSendMessage={(targetUser) => {
          setMatchModalVisible(false);
          navigation.navigate('ChatDetail', {
            match: {
              id: targetUser.id,
              user_id: targetUser.id,
              name: targetUser.name,
              avatar: targetUser.image || targetUser.avatar,
            },
          });
        }}
      />
    </LinearGradient>
  );
}

const getStyles = (theme, insets) => {
  const isDark = !!theme?.isDark;
  const bottomNavHeight = Math.max((insets?.bottom || 0) + 8, Platform.OS === 'ios' ? 24 : 14) + 72;
  const bottomClearance = bottomNavHeight + verticalScale(14);

  return StyleSheet.create({
    root: { flex: 1 },
    mainContent: {
      flex: 1,
      paddingBottom: bottomClearance,
    },

    headerWrap: {
      backgroundColor: 'transparent',
      paddingTop: 0,
    },
    headerPill: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 24,
      position: 'relative',
    },
    headerTitleContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerLeftBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.75)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(245, 158, 11, 0.22)' : 'rgba(245, 158, 11, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    headerRightGroup: {
      flexDirection: 'row',
      gap: 10,
    },
    headerRightBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.75)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(245, 158, 11, 0.22)' : 'rgba(245, 158, 11, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    headerBadge: {
      position: 'absolute',
      top: -2,
      right: -2,
      backgroundColor: '#F59E0B',
      borderRadius: 8,
      minWidth: 16,
      height: 16,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 3,
      borderWidth: 1.5,
      borderColor: isDark ? '#16120C' : '#FFFFFF',
    },
    headerBadgeText: {
      color: '#fff',
      fontSize: 8.5,
      fontWeight: '900',
    },
    brandTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    headerHeartBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#FF007F',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 3,
    },
    headerCenterTitle: {
      fontFamily: 'Satisfy_400Regular',
      fontSize: fs(24),
      color: theme.textPrimary,
      letterSpacing: 0.3,
      lineHeight: 34,
      paddingTop: Platform.OS === 'android' ? 2 : 0,
      textShadowColor: theme.isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.1)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },

    glowBlobGold: {
      position: 'absolute',
      top: height * 0.12,
      left: -70,
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.16)' : 'rgba(245, 158, 11, 0.09)',
      opacity: 0.85,
      zIndex: 0,
    },
    glowBlobAmber: {
      position: 'absolute',
      bottom: height * 0.08,
      right: -90,
      width: 290,
      height: 290,
      borderRadius: 145,
      backgroundColor: isDark ? 'rgba(217, 119, 6, 0.13)' : 'rgba(217, 119, 6, 0.07)',
      opacity: 0.8,
      zIndex: 0,
    },
    glowBlobWarm: {
      position: 'absolute',
      top: height * 0.45,
      right: -50,
      width: 230,
      height: 230,
      borderRadius: 115,
      backgroundColor: isDark ? 'rgba(251, 191, 36, 0.12)' : 'rgba(251, 191, 36, 0.07)',
      opacity: 0.8,
      zIndex: 0,
    },

    reactionToast: {
      position: 'absolute',
      top: '35%',
      left: 28,
      right: 28,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
    },
    reactionIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 8,
    },
    reactionIconCircleLike: {
      backgroundColor: '#FF007F',
      shadowColor: '#FF007F',
    },
    reactionIconCirclePass: {
      backgroundColor: '#4A89FF',
      shadowColor: '#4A89FF',
    },
    reactionIconCircleSuperlike: {
      backgroundColor: '#F59E0B',
      shadowColor: '#F59E0B',
    },
    reactionTitle: {
      fontFamily: 'BricolageGrotesque_800Bold',
      fontSize: 28,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: -0.5,
      textAlign: 'center',
      marginBottom: 4,
      textShadowColor: 'rgba(0,0,0,0.6)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 6,
    },
    reactionSubtitle: {
      fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-medium',
      fontSize: 14,
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.90)',
      textAlign: 'center',
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },

    cardStackContainer: {
      flex: 1,
      marginTop: verticalScale(6),
      marginBottom: verticalScale(6),
      width: width - 48,
      alignSelf: 'center',
      position: 'relative',
    },
    emptyWrap: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyCard: {
      width: '100%',
      borderRadius: 32,
      paddingVertical: verticalScale(30),
      paddingHorizontal: scale(22),
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(25, 18, 9, 0.94)' : 'rgba(255, 255, 255, 0.96)',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.22)',
      shadowColor: '#F59E0B',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: isDark ? 0.35 : 0.15,
      shadowRadius: 20,
      elevation: 10,
    },
    emptyIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
      shadowColor: '#F59E0B',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.45,
      shadowRadius: 12,
      elevation: 8,
    },
    emptyRefreshPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.08)',
      paddingHorizontal: 12,
      paddingVertical: 5.5,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(245, 158, 11, 0.30)' : 'rgba(245, 158, 11, 0.20)',
      marginTop: 8,
      marginBottom: 4,
    },
    emptyRefreshPillTxt: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#FDE68A' : '#D97706',
      letterSpacing: 0.2,
    },
    emptyTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: isDark ? '#FFFFFF' : '#1C1917',
      marginTop: 4,
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    emptySub: {
      fontSize: 13.5,
      color: isDark ? 'rgba(255, 255, 255, 0.72)' : '#64748B',
      marginTop: 8,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 6,
    },
    emptyBtn: {
      marginTop: 20,
      borderRadius: 24,
      overflow: 'hidden',
      shadowColor: '#F59E0B',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.45,
      shadowRadius: 10,
      elevation: 6,
    },
    emptyBtnGrad: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 26,
      paddingVertical: 13,
    },
    emptyBtnTxt: {
      color: '#FFF',
      fontSize: 14.5,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    card: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      borderRadius: 36,
      overflow: 'hidden',
      backgroundColor: '#000000',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(251, 191, 36, 0.22)' : 'rgba(255, 255, 255, 0.85)',
      shadowColor: isDark ? '#F59E0B' : '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.25 : 0.15,
      shadowRadius: 18,
      elevation: 8,
    },
    cardActive: {
      zIndex: 3,
    },
    cardPhoto: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: 36,
      borderWidth: 0,
      borderColor: 'transparent',
    },
    topGrad: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 90,
    },
    bottomGrad: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '40%',
    },

    tapZoneRow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 90,
      flexDirection: 'row',
      zIndex: 5,
    },
    tapZoneSide: {
      flex: 0.32,
      height: '100%',
    },
    tapZoneCenter: {
      flex: 0.36,
      height: '100%',
    },

    photoDotsRow: {
      position: 'absolute',
      top: 14,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      zIndex: 8,
    },
    photoDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: 'rgba(255, 255, 255, 0.45)',
    },
    photoDotActive: {
      width: 18,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: '#FFFFFF',
    },
    cardMatchBadge: {
      position: 'absolute',
      top: 22,
      right: 18,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 5.5,
      borderRadius: 16,
      zIndex: 10,
      shadowColor: '#F59E0B',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.45,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    cardMatchBadgeTxt: {
      color: '#FFF',
      fontSize: 10.5,
      fontWeight: '900',
      letterSpacing: 0.8,
    },

    // Dynamic Gestures & Action Stamps
    stampContainer: {
      position: 'absolute',
      top: 40,
      zIndex: 25,
      borderWidth: 3,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 5,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    likeStamp: {
      left: 24,
      borderColor: '#30D158',
      transform: [{ rotate: '-14deg' }],
    },
    likeStampText: {
      fontSize: 22,
      fontWeight: '900',
      color: '#30D158',
      letterSpacing: 2,
    },
    nopeStamp: {
      right: 24,
      borderColor: '#FF375F',
      transform: [{ rotate: '14deg' }],
    },
    nopeStampText: {
      fontSize: 22,
      fontWeight: '900',
      color: '#FF375F',
      letterSpacing: 2,
    },
    detailsHintContainer: {
      position: 'absolute',
      top: 32,
      alignSelf: 'center',
      zIndex: 25,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(20, 15, 8, 0.78)',
      borderColor: 'rgba(245, 158, 11, 0.45)',
      borderWidth: 1.5,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    detailsHintText: {
      fontSize: 11.5,
      fontWeight: '900',
      color: '#FDE68A',
      letterSpacing: 1,
    },

    cardTextOverlayBottomLeft: {
      paddingBottom: 24,
      paddingHorizontal: 20,
      zIndex: 10,
    },
    cardProfileName: {
      fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-medium',
      fontSize: fs(24),
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: -0.6,
      marginBottom: verticalScale(3),
      textShadowColor: 'rgba(0,0,0,0.6)',
      textShadowOffset: { width: 0, height: 1.5 },
      textShadowRadius: 4,
    },
    cardGlassPillRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 7,
      marginTop: 7,
    },
    cardInfoPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      paddingHorizontal: 10,
      paddingVertical: 4.5,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.18)',
    },
    cardInfoPillTxt: {
      fontSize: 12,
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.92)',
    },
    cardProfileJob: {
      fontFamily: Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif-light',
      fontSize: fs(13),
      color: 'rgba(255, 255, 255, 0.85)',
      fontWeight: '600',
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },

    actionsRowWrapper: {
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: verticalScale(2),
      marginTop: verticalScale(2),
      marginBottom: verticalScale(6),
    },
    actionsRowContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: scale(16),
      paddingHorizontal: scale(20),
      paddingVertical: verticalScale(7),
      borderRadius: scale(40),
      backgroundColor: isDark ? 'rgba(24, 18, 11, 0.82)' : 'rgba(255, 255, 255, 0.88)',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(245, 158, 11, 0.28)' : 'rgba(255, 255, 255, 0.95)',
      shadowColor: isDark ? '#F59E0B' : '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.35 : 0.12,
      shadowRadius: 18,
      elevation: 8,
    },
    actionBtnRewindFloating: {
      position: 'absolute',
      left: scale(20),
      width: scale(38),
      height: scale(38),
      borderRadius: scale(19),
      backgroundColor: isDark ? 'rgba(30, 22, 12, 0.85)' : 'rgba(255, 255, 255, 0.9)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.35)',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#F59E0B',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 3,
      zIndex: 10,
    },
    actionBtnSmallX: {
      width: scale(48),
      height: scale(48),
      borderRadius: scale(24),
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 4,
    },
    actionBtnLargeLightning: {
      width: scale(58),
      height: scale(58),
      borderRadius: scale(29),
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#F59E0B',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.5,
      shadowRadius: 14,
      elevation: 7,
    },
    actionBtnSmallHeart: {
      width: scale(48),
      height: scale(48),
      borderRadius: scale(24),
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#FF007F',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 4,
    },
    actionBtnGradFill: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
};