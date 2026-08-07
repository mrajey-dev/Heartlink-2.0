// src/screens/DiscoverScreen.jsx
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Pressable,
  Animated, Dimensions, Image, ActivityIndicator,
  SafeAreaView, StatusBar, Platform, Easing, BackHandler,
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
import { apiSwipeUser, apiGetDiscoveryFeed, apiResetDiscovery } from '../services/api';
import { ensureArray, formatImageUrl, calculateMatchPercentage } from '../utils/helpers';
import { eventEmitter, EVENTS } from '../utils/eventEmitter';

const { width, height } = Dimensions.get('window');

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
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [fontsLoaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800Bold,
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

  const isFreePlan = useMemo(() => {
    const plan = (user?.subscription_plan || '').toLowerCase();
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

    swipeCard('right', 'super_like');
  };

  // Sequential 3-Phase Animation Sequence:
  // Phase 1: Slide current profile card off-screen (190ms)
  // Phase 2: Show reaction status toast on screen -> display -> fade out status toast COMPLETELY
  // Phase 3: AFTER status toast has disappeared, transition the next profile card cleanly into view!
  const swipeCard = (direction, rawSwipeType = 'like') => {
    if (isAnimating || !currentProfile) return;

    const swipeType = (typeof rawSwipeType === 'string' && ['like', 'super_like', 'pass'].includes(rawSwipeType))
      ? rawSwipeType
      : (direction === 'right' ? 'like' : 'pass');

    const isUserVerified = user?.is_verified === true || user?.is_verified === 1 || user?.is_verified === '1' || user?.is_verified === 'true';
    if (!isUserVerified && !hasActivePlan && swipedCount >= 5) {
      setFreeLimitModalVisible(true);
      Animated.spring(card1Pos, { toValue: { x: 0, y: 0 }, friction: 7, useNativeDriver: false }).start();
      return;
    }

    const isLastProfile = activeProfiles.length <= 1;

    // Set status message text & icon type
    if (swipeType === 'super_like') {
      setToastType('super_like');
      setToastMsg(SUPERLIKE_MESSAGES[Math.floor(Math.random() * SUPERLIKE_MESSAGES.length)]);
    } else if (direction === 'right' || swipeType === 'like') {
      setToastType('like');
      setToastMsg(LIKE_MESSAGES[Math.floor(Math.random() * LIKE_MESSAGES.length)]);
    } else {
      setToastType('pass');
      setToastMsg(PASS_MESSAGES[Math.floor(Math.random() * PASS_MESSAGES.length)]);
    }

    setIsAnimating(true);
    setSwipedCount(prev => prev + 1);

    const currentP = currentProfile;
    if (currentP && currentP.id) {
      if (swipeType === 'pass') {
        setPassedHistory(prev => [...prev, currentP]);
      }
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

  const moveToNext = (swipeType = 'like') => {
    swipeCard('right', swipeType);
  };

  const moveToPrevious = () => {
    swipeCard('left', 'pass');
  };

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
            /* Single focused Card - Action Buttons for profile swiping */
            <Animated.View
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
});