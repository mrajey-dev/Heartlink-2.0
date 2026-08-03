// src/screens/DiscoverScreen.jsx
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Pressable,
  Animated, Dimensions, Image, PanResponder, ActivityIndicator,
  SafeAreaView, ScrollView, FlatList, StatusBar, Platform, Easing, BackHandler, Alert,
} from 'react-native';
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
import CustomAlertModal from '../components/CustomAlertModal';
import MatchModal from '../components/MatchModal';
import ProfileDetail from '../components/discovery/ProfileDetail';
import AadhaarVerificationModal from '../components/AadhaarVerificationModal';
import { apiSwipeUser, apiGetDiscoveryFeed, apiGetRequests, apiResetDiscovery } from '../services/api';
import { ensureArray, formatImageUrl, calculateMatchPercentage } from '../utils/helpers';
import { eventEmitter, EVENTS } from '../utils/eventEmitter';

const { width, height } = Dimensions.get('window');


// Varied reaction copy — a fresh one is picked each time a button is pressed
const LIKE_MESSAGES = [
  { title: 'Liked', subtitle: 'Sending your interest their way' },
  { title: "That's a yes", subtitle: 'Fingers crossed for a match' },
  { title: 'Good taste', subtitle: 'Your like is on its way' },
  { title: 'Sent with confidence', subtitle: 'Now we wait and see' },
  { title: 'Nice pick', subtitle: 'They might just like you back' },
];

const PASS_MESSAGES = [
  { title: 'Passed', subtitle: 'Finding your next match' },
  { title: 'Not this one', subtitle: 'Onto someone better suited' },
  { title: 'Moving on', subtitle: 'The right one is still out there' },
  { title: 'Next up', subtitle: 'Bringing a new profile your way' },
  { title: 'Swiped past', subtitle: "That's okay, keep exploring" },
];

export default function DiscoverScreen() {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [fontsLoaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800Bold,
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showBackgroundCards, setShowBackgroundCards] = useState(true);
  const [likeMsgIdx, setLikeMsgIdx] = useState(0);
  const [passMsgIdx, setPassMsgIdx] = useState(0);
  const [sheetPhotoIdx, setSheetPhotoIdx] = useState(0);
  const [feedLoading, setFeedLoading] = useState(true);

  const { user } = useAuth();
  const [dbProfiles, setDbProfiles] = useState([]);
  const [requestCount, setRequestCount] = useState(0);

  const [passedHistory, setPassedHistory] = useState([]);
  const [swipedCount, setSwipedCount] = useState(0);
  const [freeLimitModalVisible, setFreeLimitModalVisible] = useState(false);
  const [aadhaarModalVisible, setAadhaarModalVisible] = useState(false);
  const [noRewindModalVisible, setNoRewindModalVisible] = useState(false);
  const [rewindUsed, setRewindUsed] = useState(false);
  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [matchModalUser, setMatchModalUser] = useState(null);

  // Improved subscription check with better detection
  const hasActivePlan = useMemo(() => {
    if (!user) return false;
    const planName = (
      user.activeSubscription?.plan_name ||
      user.active_subscription?.plan_name ||
      user.subscription_plan ||
      user.plan_name ||
      user.plan ||
      ''
    ).toLowerCase();

    return !!(
      (planName && planName !== 'free' && planName !== 'basic_free' && planName !== 'none') ||
      user.premium === true ||
      user.isPremium === true ||
      user.subscription === 'active' ||
      user.subscriptionStatus === 'active'
    );
  }, [user]);

  // Determine if the user is on a free plan (direct DB field)
  const isFreePlan = useMemo(() => {
    const plan = (user?.subscription_plan || '').toLowerCase();
    return plan === 'free' || plan === 'basic_free' || plan === '' || plan === 'none';
  }, [user]);

  const handleRewindPassedProfile = () => {
    if (isAnimating) return;
    if (passedHistory.length === 0) {
      setNoRewindModalVisible(true);
      return;
    }

    const lastPassed = passedHistory[passedHistory.length - 1];
    setPassedHistory(prev => prev.slice(0, -1));

    // Restore last passed profile back to front of active feed
    setDbProfiles(prev => [lastPassed, ...prev.filter(p => p.id !== lastPassed.id)]);
    resetCardPositions();
  };

  // New handler respecting free plan limit
  const handleRewindPress = () => {
    console.warn('Rewind press - isFreePlan:', isFreePlan, 'rewindUsed:', rewindUsed);
    if (!isFreePlan) {
      // Paid users – unlimited rewinds
      handleRewindPassedProfile();
      return;
    }
    // Free plan – only one rewind allowed
    if (rewindUsed) {
      setNoRewindModalVisible(true);
      return;
    }
    setRewindUsed(true);
    handleRewindPassedProfile();
  };

  const cardHeightRef = useRef(height * 0.5);

  // Create animated values for each card
  const card1Pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const card2Pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const card3Pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const card1Scale = useRef(new Animated.Value(1)).current;
  const card2Scale = useRef(new Animated.Value(0.97)).current;
  const card3Scale = useRef(new Animated.Value(0.93)).current;

  const card1Opacity = useRef(new Animated.Value(1)).current;
  const card2Opacity = useRef(new Animated.Value(0.8)).current;
  const card3Opacity = useRef(new Animated.Value(0.5)).current;

  // Reaction stamp + background flash — now triggered only by the action buttons
  const likeOpacity = useRef(new Animated.Value(0)).current;
  const nopeOpacity = useRef(new Animated.Value(0)).current;
  const likeFlashOpacity = useRef(new Animated.Value(0)).current;
  const passFlashOpacity = useRef(new Animated.Value(0)).current;

  const sheetY = useRef(new Animated.Value(height)).current;

  // Swipe-down-to-close gesture state
  const sheetDragY = useRef(new Animated.Value(0)).current;
  const sheetScrollY = useRef(0); // tracks ScrollView vertical offset

  const sheetPanResponder = useRef(
    PanResponder.create({
      // Only claim the gesture when: scrolled to top AND dragging downward
      onMoveShouldSetPanResponder: (_, gs) =>
        sheetScrollY.current <= 0 && gs.dy > 8 && gs.dy > Math.abs(gs.dx),
      onPanResponderGrant: () => {
        sheetDragY.setValue(0);
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) sheetDragY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 120 || gs.vy > 0.8) {
          // Close — reset drag offset first then animate sheetY out
          sheetDragY.setValue(0);
          Animated.timing(sheetY, { toValue: height, duration: 220, useNativeDriver: false }).start(
            () => setShowDetail(false)
          );
        } else {
          // Snap back
          Animated.spring(sheetDragY, { toValue: 0, tension: 50, friction: 9, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  // Active card position (only ever driven programmatically now, never by touch/drag)
  const pan = card1Pos;
  const rotate = pan.x.interpolate({
    inputRange: [-width * 0.8, 0, width * 0.8],
    outputRange: ['-15deg', '0deg', '15deg'],
    extrapolate: 'clamp'
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

    const isVerifiedUser = u.is_verified === true || u.is_verified === 1 || u.is_verified === '1' || u.is_verified === 'true' || u.isVerified === true || !!u.email_verified_at || (u.id === user?.id && !!user?.is_verified);

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

  const fetchFeed = async (isBackground = false) => {
    try {
      if (!isBackground && dbProfiles.length === 0) setFeedLoading(true);
      const fRes = await apiGetDiscoveryFeed().catch(() => null);

      if (fRes?.profiles && Array.isArray(fRes.profiles)) {
        const formatted = fRes.profiles.map(formatApiProfile);
        setDbProfiles(formatted);
      }
    } catch (err) {
      console.warn('Discovery Feed fetch error:', err?.message);
    } finally {
      if (!isBackground) setFeedLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed(false);

    const unsubReq = eventEmitter.on(EVENTS.REQUEST_UPDATED, () => fetchFeed(true));
    const unsubMatch = eventEmitter.on(EVENTS.MATCH_UPDATED, () => fetchFeed(true));
    const unsubscribe = navigation.addListener('focus', () => {
      setPhotoIdx(0);
      fetchFeed(true);
    });

    return () => {
      unsubscribe();
      unsubReq();
      unsubMatch();
    };
  }, [navigation]);

  const activeProfiles = useMemo(() => {
    const userGender = (user?.gender || 'Man').toLowerCase();
    const isMaleUser = userGender === 'man' || userGender === 'male';
    const targetGenders = isMaleUser ? ['female', 'woman'] : ['male', 'man'];

    if (dbProfiles.length > 0) {
      const filtered = dbProfiles.filter(p => !p.gender || targetGenders.includes(p.gender.toLowerCase()));
      return filtered.length > 0 ? filtered : dbProfiles;
    }

    // No fallback — always use real database profiles
    return [];
  }, [dbProfiles, user]);

  // Get profiles for the 3 cards safely without infinite looping
  const getProfileAt = (offset) => {
    if (!activeProfiles || activeProfiles.length === 0) return null;
    const idx = currentIndex + offset;
    if (idx >= activeProfiles.length) return null;
    return activeProfiles[idx];
  };

  const currentProfile = getProfileAt(0);
  const nextProfile = getProfileAt(1);
  const nextNextProfile = getProfileAt(2);

  const detailsOpacity = useRef(new Animated.Value(1)).current;

  const showDetailRef = useRef(false);
  useEffect(() => {
    showDetailRef.current = showDetail;
  }, [showDetail]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setPhotoIdx(0);
    });
    return unsubscribe;
  }, [navigation]);

  // Intercept Android hardware back press: close the detail sheet if open
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (showDetailRef.current) {
          closeDetail();
          return true; // prevent default back navigation
        }
        return false; // allow default back navigation
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  const handlePhotoTapLeft = () => {
    if (isAnimating) return;
    setPhotoIdx(prev => Math.max(0, prev - 1));
  };

  const handlePhotoTapRight = () => {
    if (isAnimating) return;
    if (currentProfile?.images?.length) {
      setPhotoIdx(prev => (prev + 1) % currentProfile.images.length);
    }
  };

  const openDetail = () => {
    if (isAnimating || !currentProfile) return;
    setShowDetail(true);
  };

  const closeDetail = () => {
    setShowDetail(false);
  };

  const resetCardPositions = () => {
    // Reset all cards to default positions instantly
    card1Pos.setValue({ x: 0, y: 0 });
    card2Pos.setValue({ x: 0, y: 0 });
    card3Pos.setValue({ x: 0, y: 0 });
    card1Scale.setValue(1);
    card2Scale.setValue(0.97);
    card3Scale.setValue(0.93);
    card1Opacity.setValue(1);
    card2Opacity.setValue(0.8);
    card3Opacity.setValue(0.5);
    likeOpacity.setValue(0);
    nopeOpacity.setValue(0);
    likeFlashOpacity.setValue(0);
    passFlashOpacity.setValue(0);
  };




  const [dailyVerifyPromptVisible, setDailyVerifyPromptVisible] = useState(false);

  const isVerifiedUser = user?.is_verified === true || user?.is_verified === 1 || user?.is_verified === '1' || user?.is_verified === 'true';

  useEffect(() => {
    const checkDailyVerificationPrompt = async () => {
      if (isVerifiedUser) return;
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const lastPromptDate = await AsyncStorage.getItem('@heartlink_last_verification_prompt_date');

        if (lastPromptDate !== todayStr) {
          setTimeout(() => {
            setDailyVerifyPromptVisible(true);
            AsyncStorage.setItem('@heartlink_last_verification_prompt_date', todayStr);
          }, 1200);
        }
      } catch (err) {
        console.warn('Daily prompt check error:', err);
      }
    };
    checkDailyVerificationPrompt();
  }, [isVerifiedUser]);

  const [superlikeUpgradeModalVisible, setSuperlikeUpgradeModalVisible] = useState(false);

  const handleSparkPress = () => {
    const planName = user?.subscription_plan?.toLowerCase() || '';
    if (planName.includes('basic') || planName === 'free' || !user?.subscription_plan) {
      setSuperlikeUpgradeModalVisible(true);
      return;
    }

    moveToNext('super_like');
  };

  const moveToNext = (rawSwipeType = 'like') => {
    if (isAnimating) return;

    const swipeType = (typeof rawSwipeType === 'string' && ['like', 'super_like'].includes(rawSwipeType)) ? rawSwipeType : 'like';

    const isUserVerified = user?.is_verified === true || user?.is_verified === 1 || user?.is_verified === '1' || user?.is_verified === 'true';
    if (!isUserVerified && !hasActivePlan && swipedCount >= 5) {
      setFreeLimitModalVisible(true);
      return;
    }

    setIsAnimating(true);
    setPhotoIdx(0);
    setSwipedCount(prev => prev + 1);

    const currentP = currentProfile;
    if (currentP && currentP.id) {
      apiSwipeUser(currentP.id, swipeType).then(res => {
        if (res?.is_match) {
          setMatchModalUser(currentP);
          setMatchModalVisible(true);
        } else if (['like', 'super_like'].includes(swipeType)) {
          eventEmitter.emit(EVENTS.REQUEST_SENT, {
            title: swipeType === 'super_like' ? 'Super Spark Sent' : 'Like Sent',
            message: `Sent interest request to ${currentP.name || 'Member'}`,
            avatar: currentP.avatar || currentP.image,
            userId: currentP.id,
          });
        }
      }).catch(err => {
        if (err?.message?.includes('not verified') || err?.requires_verification) {
          setAadhaarModalVisible(true);
        } else if (err?.message?.includes('limit') || err?.requires_upgrade || err?.error === 'UPGRADE_PLAN_REQUIRED') {
          setFreeLimitModalVisible(true);
        }
      });
    }

    setLikeMsgIdx(Math.floor(Math.random() * LIKE_MESSAGES.length));
    likeOpacity.setValue(0);
    likeFlashOpacity.setValue(0);

    // Step 1: Hide background cards & swipe present profile off screen
    card2Opacity.setValue(0);
    card3Opacity.setValue(0);

    Animated.parallel([
      Animated.timing(pan.x, {
        toValue: width * 1.4,
        duration: 280,
        useNativeDriver: false,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(card1Scale, {
        toValue: 0.85,
        duration: 280,
        useNativeDriver: false,
      }),
      Animated.timing(card1Opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start(() => {
      // Step 2: Present profile is completely gone. Show reaction message on clean screen.
      Animated.parallel([
        Animated.sequence([
          Animated.timing(likeOpacity, { toValue: 1, duration: 180, useNativeDriver: false, easing: Easing.out(Easing.cubic) }),
          Animated.delay(350),
          Animated.timing(likeOpacity, { toValue: 0, duration: 180, useNativeDriver: false }),
        ]),
        Animated.sequence([
          Animated.timing(likeFlashOpacity, { toValue: 0.6, duration: 180, useNativeDriver: false }),
          Animated.delay(350),
          Animated.timing(likeFlashOpacity, { toValue: 0, duration: 180, useNativeDriver: false }),
        ])
      ]).start(() => {
        setDbProfiles(prev => prev.filter(p => p.id !== currentP?.id));
        setPhotoIdx(0);

        requestAnimationFrame(() => {
          card1Pos.setValue({ x: 0, y: 0 });
          card1Scale.setValue(0.92);
          card1Opacity.setValue(0);
          card2Scale.setValue(0.97);
          card2Opacity.setValue(0);
          card3Scale.setValue(0.93);
          card3Opacity.setValue(0);

          Animated.parallel([
            Animated.timing(card1Opacity, {
              toValue: 1,
              duration: 320,
              useNativeDriver: false,
              easing: Easing.out(Easing.quad),
            }),
            Animated.spring(card1Scale, {
              toValue: 1,
              friction: 7,
              tension: 40,
              useNativeDriver: false,
            }),
            Animated.timing(card2Opacity, {
              toValue: 0.8,
              duration: 320,
              useNativeDriver: false,
            }),
            Animated.timing(card3Opacity, {
              toValue: 0.5,
              duration: 320,
              useNativeDriver: false,
            }),
          ]).start(() => {
            setIsAnimating(false);
          });
        });
      });
    });
  };

  const moveToPrevious = () => {
    if (isAnimating) return;
    if (!hasActivePlan && swipedCount >= 5) {
      setFreeLimitModalVisible(true);
      return;
    }

    setIsAnimating(true);
    setPhotoIdx(0);
    setSwipedCount(prev => prev + 1);

    const currentP = currentProfile;
    if (currentP && currentP.id) {
      setPassedHistory(prev => [...prev, currentP]);
      apiSwipeUser(currentP.id, 'pass').catch(() => { });
    }

    setPassMsgIdx(Math.floor(Math.random() * PASS_MESSAGES.length));
    nopeOpacity.setValue(0);
    passFlashOpacity.setValue(0);

    // Step 1: Hide background cards & swipe present profile off screen to left
    card2Opacity.setValue(0);
    card3Opacity.setValue(0);

    Animated.parallel([
      Animated.timing(pan.x, {
        toValue: -width * 1.4,
        duration: 280,
        useNativeDriver: false,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(card1Scale, {
        toValue: 0.85,
        duration: 280,
        useNativeDriver: false,
      }),
      Animated.timing(card1Opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start(() => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(nopeOpacity, { toValue: 1, duration: 180, useNativeDriver: false, easing: Easing.out(Easing.cubic) }),
          Animated.delay(350),
          Animated.timing(nopeOpacity, { toValue: 0, duration: 180, useNativeDriver: false }),
        ]),
        Animated.sequence([
          Animated.timing(passFlashOpacity, { toValue: 0.6, duration: 180, useNativeDriver: false }),
          Animated.delay(350),
          Animated.timing(passFlashOpacity, { toValue: 0, duration: 180, useNativeDriver: false }),
        ])
      ]).start(() => {
        setDbProfiles(prev => prev.filter(p => p.id !== currentP?.id));
        setPhotoIdx(0);

        requestAnimationFrame(() => {
          card1Pos.setValue({ x: 0, y: 0 });
          card1Scale.setValue(0.92);
          card1Opacity.setValue(0);
          card2Scale.setValue(0.97);
          card2Opacity.setValue(0);
          card3Scale.setValue(0.93);
          card3Opacity.setValue(0);

          Animated.parallel([
            Animated.timing(card1Opacity, {
              toValue: 1,
              duration: 320,
              useNativeDriver: false,
              easing: Easing.out(Easing.quad),
            }),
            Animated.spring(card1Scale, {
              toValue: 1,
              friction: 7,
              tension: 40,
              useNativeDriver: false,
            }),
            Animated.timing(card2Opacity, {
              toValue: 0.8,
              duration: 320,
              useNativeDriver: false,
            }),
            Animated.timing(card3Opacity, {
              toValue: 0.5,
              duration: 320,
              useNativeDriver: false,
            }),
          ]).start(() => {
            setIsAnimating(false);
          });
        });
      });
    });
  };

  // Tap zones on the active card: left third = previous photo, right third = next photo,
  // center = open detail sheet. No drag/swipe gesture handling — the card never
  // follows the finger, only the action buttons below trigger like/pass.

  return (
    <LinearGradient colors={theme.bgGrad} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <SafeAreaView style={styles.headerWrap} edges={['top']}>
        <View style={styles.headerPill}>
          <TouchableOpacity style={styles.headerLeftBtn} onPress={() => navigation.navigate('Profile')} activeOpacity={0.7}>
            <Ionicons name="person" size={17} color={theme.textPrimary} />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.headerCenterTitle}>HeartLink</Text>
          </View>

          <View style={styles.headerRightGroup}>
            {/* <TouchableOpacity style={styles.headerRightBtn} onPress={handleRewindPress} activeOpacity={0.7}>
              <Ionicons name="reload-outline" size={18} color="#F59E0B" />
            </TouchableOpacity> */}

            <TouchableOpacity style={styles.headerRightBtn} onPress={() => navigation.navigate('Requests')} activeOpacity={0.7}>
              <Ionicons name="notifications" size={19} color={theme.textPrimary} />
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
        <View style={styles.glowBlobFuchsia} pointerEvents="none" />
        <View style={styles.glowBlobCyan} pointerEvents="none" />
        <View style={styles.glowBlobPurple} pointerEvents="none" />

        {/* Reaction color flash, triggered by the buttons */}
        <Animated.View style={[styles.swipeBgBase, { opacity: likeFlashOpacity }]} pointerEvents="none">
          {/* <View style={styles.swipeBgContent}>
            <Ionicons name="heart" size={100} color="#30D158" />
          </View> */}
        </Animated.View>

        <Animated.View style={[styles.swipeBgBase, { opacity: passFlashOpacity }]} pointerEvents="none">
          {/* <View style={styles.swipeBgContent}>
            <Ionicons name="close-outline" size={110} color="#FF375F" />
          </View> */}
        </Animated.View>

        {/* Card Stack */}
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
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="sparkles-outline" size={48} color="#FF007F" />
                  </View>

                  <Text style={styles.emptyTitle}>You've Swiped All Profiles!</Text>
                  {!user?.subscription_plan || user?.subscription_plan === 'Free' || user?.subscription_plan === 'basic_free' ? (
                    <>
                      <Text style={styles.emptySub}>
                        Buy a HeartLink Membership plan to unlock unlimited profile re-checks, worldwide Passport reach, and priority matching!
                      </Text>
                      <TouchableOpacity
                        style={styles.emptyBtn}
                        onPress={() => navigation.navigate('Plans')}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={['#FF007F', '#B5179E']} style={styles.emptyBtnGrad}>
                          <Ionicons name="sparkles" size={18} color="#FFF" style={{ marginRight: 6 }} />
                          <Text style={styles.emptyBtnTxt}>Buy Plan to Unlock Swipes</Text>
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
                        <LinearGradient colors={['#FF007F', '#B5179E']} style={styles.emptyBtnGrad}>
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
            <>
              {/* Card 3 (Back-most) - Hidden during transition */}
              {showBackgroundCards && nextNextProfile && (
                <Animated.View style={[
                  styles.card,
                  styles.cardBack2,
                  {
                    opacity: card3Opacity,
                    transform: [
                      { translateY: card3Pos.y },
                      { scale: card3Scale }
                    ]
                  }
                ]}>
                  <Image source={{ uri: formatImageUrl(nextNextProfile.images?.[0]) }} style={styles.cardPhoto} resizeMode="cover" />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.75)']} style={styles.bottomGrad} />
                  <View style={styles.cardTextOverlayBottomLeft}>
                    <Text style={styles.cardProfileName}>{nextNextProfile.name}{nextNextProfile.showAge !== false ? `, ${nextNextProfile.age}` : ''}</Text>
                    <Text style={styles.cardProfileJob}>{nextNextProfile.job}</Text>
                  </View>
                </Animated.View>
              )}

              {/* Card 2 (Middle) - Hidden during transition */}
              {showBackgroundCards && nextProfile && (
                <Animated.View style={[
                  styles.card,
                  styles.cardBack1,
                  {
                    opacity: card2Opacity,
                    transform: [
                      { translateY: card2Pos.y },
                      { scale: card2Scale }
                    ]
                  }
                ]}>
                  <Image source={{ uri: formatImageUrl(nextProfile.images?.[0]) }} style={styles.cardPhoto} resizeMode="cover" />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.75)']} style={styles.bottomGrad} />
                  <View style={styles.cardTextOverlayBottomLeft}>
                    <Text style={styles.cardProfileName}>{nextProfile.name}{nextProfile.showAge !== false ? `, ${nextProfile.age}` : ''}</Text>
                    <Text style={styles.cardProfileJob}>{nextProfile.job}</Text>
                  </View>
                  <View style={styles.cardMatchBadge} pointerEvents="none">
                    <Ionicons name="sparkles" size={11} color="#FFF" style={{ marginRight: 3 }} />
                    <Text style={styles.cardMatchBadgeTxt}>{nextProfile.compatibility}% MATCH</Text>
                  </View>
                </Animated.View>
              )}

              {/* Card 1 (Active) - No drag/swipe handlers, only taps + buttons */}
              <Animated.View
                style={[
                  styles.card,
                  styles.cardActive,
                  {
                    opacity: card1Opacity,
                    transform: [
                      { translateX: pan.x },
                      { translateY: pan.y },
                      { rotate: rotate }
                    ]
                  }
                ]}
              >
                <Image
                  key={currentProfile?.id || currentIndex}
                  source={{ uri: formatImageUrl(currentProfile?.images?.[Math.min(photoIdx, (currentProfile?.images?.length || 1) - 1)] || currentProfile?.images?.[0]) }}
                  style={styles.cardPhoto}
                  resizeMode="cover"
                />

                <LinearGradient colors={['rgba(0,0,0,0.15)', 'transparent']} style={styles.topGrad} />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.75)']} style={styles.bottomGrad} />

                {/* Top-Right Match Percentage Badge */}
                <View style={styles.cardMatchBadge} pointerEvents="none">
                  <Ionicons name="sparkles" size={11} color="#FFF" style={{ marginRight: 3 }} />
                  <Text style={styles.cardMatchBadgeTxt}>{currentProfile.compatibility}% MATCH</Text>
                </View>

                {/* Photo progress dots */}
                {currentProfile.images.length > 1 && (
                  <View style={styles.photoDotsRow} pointerEvents="none">
                    {currentProfile.images.map((_, i) => (
                      <View
                        key={i}
                        style={[styles.photoDot, i === photoIdx && styles.photoDotActive]}
                      />
                    ))}
                  </View>
                )}

                {/* Tap zones: left = prev photo, right = next photo. No drag. */}
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

                <Animated.View style={{ opacity: detailsOpacity, width: '100%', position: 'absolute', bottom: 0 }} pointerEvents="box-none">
                  <TouchableOpacity activeOpacity={0.9} onPress={openDetail} style={styles.cardTextOverlayBottomLeft}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.cardProfileName}>{currentProfile.display_name || currentProfile.displayName || currentProfile.name}{currentProfile.showAge !== false ? `, ${currentProfile.age}` : ''}</Text>
                      {(currentProfile.subscription_plan?.toLowerCase().includes('premium') || currentProfile.isGoldenTick) ? (
                        <Ionicons name="checkmark-circle" size={19} color="#F59E0B" style={{ marginLeft: 6, alignSelf: 'center' }} />
                      ) : (currentProfile.isVerified || currentProfile.user?.is_verified) ? (
                        <Ionicons name="checkmark-circle" size={19} color="#3897F0" style={{ marginLeft: 6, alignSelf: 'center' }} />
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, flexWrap: 'wrap' }}>
                      <Text style={styles.cardProfileJob}>{currentProfile.job}</Text>
                      {currentProfile.distance ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.cardProfileJob}> · </Text>
                          <Ionicons name="location-sharp" size={13} color="#ffffffff" style={{ marginRight: 2 }} />
                          <Text style={styles.cardProfileJob}>{currentProfile.distance}</Text>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                </Animated.View>

              </Animated.View>

              {/* Reaction message — shown only when a button is pressed, icon-led, no emoji */}
              <Animated.View
                style={[
                  styles.reactionToast,
                  {
                    opacity: likeOpacity,
                    transform: [{
                      scale: likeOpacity.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] })
                    }],
                  },
                ]}
                pointerEvents="none"
              >
                <View style={[styles.reactionIconCircle, styles.reactionIconCircleLike]}>
                  <Ionicons name="heart" size={30} color="#fff" />
                </View>
                <Text style={styles.reactionTitle}>{LIKE_MESSAGES[likeMsgIdx].title}</Text>
                <Text style={styles.reactionSubtitle}>{LIKE_MESSAGES[likeMsgIdx].subtitle}</Text>
              </Animated.View>

              <Animated.View
                style={[
                  styles.reactionToast,
                  {
                    opacity: nopeOpacity,
                    transform: [{
                      scale: nopeOpacity.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] })
                    }],
                  },
                ]}
                pointerEvents="none"
              >
                <View style={[styles.reactionIconCircle, styles.reactionIconCirclePass]}>
                  <Ionicons name="close" size={30} color="#fff" />
                </View>
                <Text style={styles.reactionTitle}>{PASS_MESSAGES[passMsgIdx].title}</Text>
                <Text style={styles.reactionSubtitle}>{PASS_MESSAGES[passMsgIdx].subtitle}</Text>
              </Animated.View>
            </>
          )}
        </View>

        {/* Actions Row (Only visible when active profiles exist) */}
        {currentProfile && activeProfiles.length > 0 && (
          <View style={styles.actionsRowWrapper}>
            {/* Rewind button — only rendered when there are passed profiles to rewind */}
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

            {/* Original 3-button row — centered across full width */}
            <View style={styles.actionsRowContainer}>
              <TouchableOpacity
                onPress={moveToPrevious}
                activeOpacity={0.8}
                style={styles.actionBtnSmallX}
                disabled={isAnimating}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSparkPress}
                activeOpacity={0.8}
                style={styles.actionBtnLargeLightning}
                disabled={isAnimating}
              >
                <LinearGradient
                  colors={['#FF007F', '#B5179E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Ionicons name="flash" size={28} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => moveToNext('like')}
                activeOpacity={0.8}
                style={styles.actionBtnSmallHeart}
                disabled={isAnimating}
              >
                <Ionicons name="heart" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Unified Profile Detail Modal across Discover, Matches & Chat */}
      {showDetail && currentProfile && (
        <ProfileDetail
          visible={showDetail}
          profile={currentProfile}
          onClose={closeDetail}
          onLike={() => {
            closeDetail();
            moveToNext('like');
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
        message="You have swiped through all 5 of your free profiles! Upgrade your plan to unlock unlimited swipes and discover more amazing people."
        icon="lock-closed-outline"
        iconColor="#FF007F"
        confirmText="Upgrade Plan"
        cancelText="Maybe Later"
        onConfirm={() => {
          setFreeLimitModalVisible(false);
          navigation.navigate('Plans');
        }}
        onCancel={() => setFreeLimitModalVisible(false)}
      />

      <AadhaarVerificationModal
        visible={aadhaarModalVisible}
        onClose={() => setAadhaarModalVisible(false)}
        initialStep="alert"
      />

      {/* Superlike Plan Upgrade Custom Modal */}
      <CustomAlertModal
        visible={superlikeUpgradeModalVisible}
        title="Superlikes Locked"
        message="Superlikes are not included in your Basic plan. Upgrade to HeartLink Plus or Premium to send Superlikes, boost match priority, and stand out instantly!"
        icon="flash"
        iconColor="#FF007F"
        confirmText="Upgrade Plan"
        cancelText="Maybe Later"
        onConfirm={() => {
          setSuperlikeUpgradeModalVisible(false);
          navigation.navigate('Plans');
        }}
        onCancel={() => setSuperlikeUpgradeModalVisible(false)}
      />

      {/* Once-Daily Verification Prompt Modal */}
      <CustomAlertModal
        visible={dailyVerifyPromptVisible}
        title="Verify Your Profile Identity"
        message="Verify your profile for ₹99 to gain 3x more trust, get a verified checkmark badge, and stand out at the top of discover feeds!"
        icon="shield-checkmark-outline"
        iconColor="#FF007F"
        confirmText="Verify"
        cancelText="Maybe Later"
        onConfirm={() => {
          setDailyVerifyPromptVisible(false);
          setAadhaarModalVisible(true);
        }}
        onCancel={() => setDailyVerifyPromptVisible(false)}
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

const getStyles = (theme) => StyleSheet.create({
  root: { flex: 1 },
  mainContent: {
    flex: 1,
    paddingBottom: 95,
  },

  headerWrap: {
    backgroundColor: 'transparent',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  headerLeftBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1.2,
    borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(0, 0, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  headerRightBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1.2,
    borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(0, 0, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#FF375F',
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: theme.isDark ? '#0D0214' : '#fff',
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 8.5,
    fontWeight: '900',
  },
  headerCenterTitle: {
    fontFamily: Platform.OS === 'ios' ? 'serif' : 'math',
    fontSize: 22,
    fontWeight: '900',
    color: theme.textPrimary,
    letterSpacing: -0.6,
    textShadowColor: theme.isDark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(255, 255, 255, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  glowBlobFuchsia: {
    position: 'absolute',
    top: height * 0.15,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255, 0, 127, 0.26)',
    opacity: 0.85,
    zIndex: 0,
  },
  glowBlobCyan: {
    position: 'absolute',
    bottom: height * 0.1,
    right: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(0, 191, 255, 0.20)',
    opacity: 0.75,
    zIndex: 0,
  },
  glowBlobPurple: {
    position: 'absolute',
    top: height * 0.48,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(123, 47, 190, 0.24)',
    opacity: 0.75,
    zIndex: 0,
  },

  cardStackContainer: {
    flex: 1,
    marginTop: 12,
    marginBottom: height * 0.015,
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
    padding: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.isDark ? '#1C1236' : '#FFFFFF',
    borderWidth: 1.5,
    borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 0, 127, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.textPrimary,
    marginTop: 10,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13.5,
    color: theme.textSec,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  emptyBtn: {
    marginTop: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnTxt: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  emptySecondaryBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 0, 127, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 127, 0.2)',
  },
  emptySecondaryTxt: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FF007F',
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 36,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  cardBack2: {
    zIndex: 1,
  },
  cardBack1: {
    zIndex: 2,
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

  // Left/center/right tap regions on the active card (no drag, taps only)
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
    top: 24,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 127, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  cardMatchBadgeTxt: {
    color: '#FFF',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  cardTextOverlayBottomLeft: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  cardProfileName: {
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-medium',
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.6,
    marginBottom: 3,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 4,
  },
  cardProfileJob: {
    fontFamily: Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif-light',
    fontSize: 14,
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
    marginVertical: height * 0.015,
  },
  actionsRowContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  actionBtnRewindFloating: {
    position: 'absolute',
    left: 24,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1.2,
    borderColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  actionBtnSmallX: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4A89FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A89FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  actionBtnLargeLightning: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  actionBtnSmallHeart: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#8A66FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8A66FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },

  // Reaction message — transparent (no background card), icon-led, big bold text
  reactionToast: {
    position: 'absolute',
    top: '32%',
    left: 32,
    right: 32,
    alignItems: 'center',
    zIndex: 40,
  },
  reactionIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 18,
    elevation: 10,
  },
  reactionIconCircleLike: {
    backgroundColor: '#FF007F',
    shadowColor: '#FF007F',
  },
  reactionIconCirclePass: {
    backgroundColor: '#4A89FF',
    shadowColor: '#4A89FF',
  },
  reactionTitle: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 40,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  reactionSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  swipeBgBase: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    zIndex: 5,
    pointerEvents: 'none',
  },
  swipeBgContent: {
    alignItems: 'center',
    gap: 14,
    zIndex: 10,
  },

  detailSheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    // No overflow:hidden — it clips Android scroll gesture recognition
    zIndex: 100,
  },
  detailSheetBgClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  sheetHandleWrap: {
    // Inside ScrollView — not absolutely positioned, so no touch interception
    paddingTop: 14,
    paddingBottom: 10,
    alignItems: 'center',
  },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.40)',
  },

  sheetPhotoWrap: {
    height: height * 0.56,
    overflow: 'hidden',
    position: 'relative',
  },
  sheetPhoto: {
    width,
    height: height * 0.56,
    resizeMode: 'cover',
  },
  sheetPhotoGrad: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
  },
  sheetPhotoDots: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  sheetDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.20)',
  },
  sheetDotActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1F2026',
  },

  sheetBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sheetNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  sheetName: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.textPrimary,
    letterSpacing: -0.6,
  },
  sheetJob: {
    fontSize: 14,
    color: theme.textSec,
    marginTop: 4,
  },
  sheetCompatBadge: {
    backgroundColor: 'rgba(255,55,95,0.12)',
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,55,95,0.25)',
  },
  sheetCompatNum: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FF375F',
  },
  sheetCompatLbl: {
    fontSize: 11,
    color: theme.textSec,
    fontWeight: '600',
  },

  sheetCard: {
    backgroundColor: theme.isDark ? '#1C1236' : '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.isDark ? 0.2 : 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sheetCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.textFaint,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  sheetBio: {
    fontSize: 15,
    color: theme.textSec,
    lineHeight: 23,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: theme.isDark ? '#2B1E4D' : '#F2EBFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: theme.border,
  },
  tagText: {
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },

  mutualDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mutualDetailAv: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  mutualDetailTxt: {
    fontSize: 13,
    color: theme.textSec,
    flex: 1,
  },

  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  sheetBtnPass: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.80)' : 'rgba(0,0,0,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,55,95,0.35)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  sheetBtnPassTxt: {
    color: '#FF375F',
    fontWeight: '800',
    fontSize: 15,
  },
  sheetBtnLike: {
    flex: 2,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
  },
  sheetBtnLikeGrad: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  sheetBtnLikeTxt: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },

  sheetCloseBtn: {
    position: 'absolute',
    top: 24,
    right: 18,
    zIndex: 20,
  },
  sheetCloseBtnInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  // Hero overlay helpers (positioned inside sheetPhotoWrap)
  sheetHeroWrap: {
    height: height * 0.52,
    position: 'relative',
    overflow: 'hidden',
  },
  sheetHeroPhoto: {
    width: '100%',
    height: '100%',
  },
  sheetHeroGrad: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
  },
  sheetHeroTag: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  sheetTagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#30D158',
  },
  sheetTagTxt: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  sheetHeroCompat: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255,55,95,0.85)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  sheetHeroCompatNum: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  sheetHeroCompatLbl: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sheetHeroNameWrap: {
    position: 'absolute',
    bottom: 18,
    left: 18,
    right: 18,
  },
  sheetHeroName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  sheetHeroSub: {
    color: 'rgba(255,255,255,0.80)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },

  // Quick facts
  quickFactsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  quickFact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.isDark ? '#1C1236' : '#F2EBFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: theme.border,
  },
  quickFactTxt: {
    color: theme.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },

  // Lifestyle grid
  lifestyleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  lifestyleItem: {
    width: '46%',
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    borderRadius: 14,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.border,
  },
  lifestyleIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  lifestyleLbl: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.textFaint,
    letterSpacing: 0.5,
  },
  lifestyleVal: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textPrimary,
  },
});