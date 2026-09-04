import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Dimensions, Platform, Animated,
  ActivityIndicator, Linking, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import CustomAlertModal from '../components/CustomAlertModal';
import PaymentGatewayModal from '../components/PaymentGatewayModal';
import { apiSubscribePlan, apiGetSubscriptionPlans } from '../services/api';

export default function PlansScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme, isDark } = useTheme();
  const { user, updateUser } = useAuth();

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const CARD_WIDTH = Math.min(windowWidth * 0.92, 440);
  const CARD_SPACING = Math.max((windowWidth - CARD_WIDTH) / 2, 16);
  const isSmallDevice = windowHeight < 720;

  const styles = useMemo(
    () => getStyles(theme, CARD_WIDTH, CARD_SPACING, isSmallDevice, windowHeight),
    [theme, CARD_WIDTH, CARD_SPACING, isSmallDevice, windowHeight]
  );

  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const [cardDurations, setCardDurations] = useState({});

  const [activeIndex, setActiveIndex] = useState(0);
  const [successAlertVisible, setSuccessAlertVisible] = useState(false);
  const [purchasedPlanName, setPurchasedPlanName] = useState('');

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedCardForPayment, setSelectedCardForPayment] = useState(null);
  const [customOfferPrice, setCustomOfferPrice] = useState(null);
  const [originalOfferPrice, setOriginalOfferPrice] = useState(null);

  const OFFER_DURATION_MS = 24 * 60 * 60 * 1000;
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [isOfferEligible, setIsOfferEligible] = useState(false);

  useEffect(() => {
    let createdAtTimestamp = null;
    if (user?.created_at) {
      const parsed = new Date(user.created_at).getTime();
      if (!isNaN(parsed) && parsed > 0) {
        createdAtTimestamp = parsed;
      }
    }

    if (!createdAtTimestamp) {
      createdAtTimestamp = Date.now();
    }

    const expiresAt = createdAtTimestamp + OFFER_DURATION_MS;
    const remainingMs = expiresAt - Date.now();

    if (remainingMs > 0 || route.params?.welcomeDiscount20 || route.params?.discountOffer) {
      const initialRemaining = remainingMs > 0 ? remainingMs : OFFER_DURATION_MS;
      setTimeLeftMs(initialRemaining);
      setIsOfferEligible(true);
    } else {
      setIsOfferEligible(false);
      setTimeLeftMs(0);
    }
  }, [user, route.params]);

  useEffect(() => {
    if (!isOfferEligible || timeLeftMs <= 0) return;

    const interval = setInterval(() => {
      setTimeLeftMs((prev) => {
        if (prev <= 1000) {
          clearInterval(interval);
          setIsOfferEligible(false);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOfferEligible, timeLeftMs]);

  const formatTimeLeft = (ms) => {
    if (ms <= 0) return '00h 00m 00s';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  };

  const isWelcomeDiscount = isOfferEligible;

  const calculateDiscountedPrice = (totalStr, percent = 20) => {
    if (!totalStr) return '₹94';
    const numStr = totalStr.replace(/[^0-9]/g, '');
    const num = parseInt(numStr, 10);
    if (isNaN(num) || num <= 0) return totalStr;
    const discounted = Math.round(num * ((100 - percent) / 100));
    return '₹' + discounted.toLocaleString('en-IN');
  };

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await apiGetSubscriptionPlans();
      if (res?.plans && Array.isArray(res.plans) && res.plans.length > 0) {
        const enhancedPlans = res.plans.map((plan) => {
          const name = (plan.name || '').toLowerCase();
          const key = (plan.plan_key || '').toLowerCase();

          if (key === 'plus' || name.includes('plus')) {
            return {
              ...plan,
              accent_color: '#A855F7',
              accentColor: '#A855F7',
              gradient: ['#A855F7', '#7C3AED'],
              glow_color: 'rgba(168, 85, 247, 0.28)',
              glowColor: 'rgba(168, 85, 247, 0.28)',
            };
          }

          if (key === 'premium' || name.includes('premium')) {
            return {
              ...plan,
              accent_color: '#F59E0B',
              accentColor: '#F59E0B',
              gradient: ['#FBBF24', '#F59E0B', '#D97706'],
              glow_color: 'rgba(245, 158, 11, 0.32)',
              glowColor: 'rgba(245, 158, 11, 0.32)',
            };
          }

          return plan;
        });

        setPlans(enhancedPlans);
        // Initialize default selected durations for each plan
        const initialDurations = {};
        enhancedPlans.forEach((plan) => {
          const defaultDur = plan.durations?.find(d => d.popular)?.id || plan.durations?.[1]?.id || plan.durations?.[0]?.id || '6m';
          initialDurations[plan.id] = defaultDur;
        });
        setCardDurations(prev => ({ ...initialDurations, ...prev }));
      } else {
        setPlans([]);
      }
    } catch (e) {
      console.warn('Fetch plans error:', e);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [route.params]);

  useEffect(() => {
    if (Platform.OS === 'web' && flatListRef.current) {
      const node = flatListRef.current.getScrollableNode
        ? flatListRef.current.getScrollableNode()
        : null;
      if (node) {
        const onWheel = (e) => {
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && Math.abs(e.deltaY) > 20) {
            node.scrollBy({ left: e.deltaY > 0 ? CARD_WIDTH : -CARD_WIDTH, behavior: 'smooth' });
            e.preventDefault();
          }
        };
        node.addEventListener('wheel', onWheel, { passive: false });
        return () => node.removeEventListener('wheel', onWheel);
      }
    }
  }, [CARD_WIDTH, plans]);

  const handleSelectDuration = (cardId, durationId) => {
    setCardDurations(prev => ({ ...prev, [cardId]: durationId }));
  };

  const handleSubscribe = (card) => {
    const selectedDurId = cardDurations[card.id] || '6m';
    const selectedDurObj = card.durations?.find(d => d.id === selectedDurId) || card.durations?.[0];

    const origPrice = selectedDurObj?.total || '₹117';
    let priceToCharge = origPrice;

    if (isWelcomeDiscount) {
      priceToCharge = calculateDiscountedPrice(origPrice, 20);
      setOriginalOfferPrice(origPrice);
      setCustomOfferPrice(priceToCharge);
    } else {
      setOriginalOfferPrice(null);
      setCustomOfferPrice(null);
    }

    setSelectedCardForPayment(card);
    setPaymentModalVisible(true);
  };

  const renderCard = ({ item: card, index }) => {
    const inputRange = [
      (index - 1) * CARD_WIDTH,
      index * CARD_WIDTH,
      (index + 1) * CARD_WIDTH,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.91, 1.0, 0.91],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.65, 1.0, 0.65],
      extrapolate: 'clamp',
    });

    const durationsList = card.durations && Array.isArray(card.durations) && card.durations.length > 0
      ? card.durations
      : [{ id: '1m', label: '1 Month', price: '₹117', unit: '/mo', total: '₹117' }];

    const selectedDurId = cardDurations[card.id] || durationsList.find(d => d.popular)?.id || durationsList[1]?.id || durationsList[0]?.id || '6m';
    const selectedDurObj = durationsList.find(d => d.id === selectedDurId) || durationsList[0];

    const isPlus = (card.plan_key || '').toLowerCase() === 'plus' || (card.name || '').toLowerCase().includes('plus');
    const isPremium = (card.plan_key || '').toLowerCase() === 'premium' || (card.name || '').toLowerCase().includes('premium');

    const badgeTitle = card.badgeText || card.badge || card.badge_text;
    const cardGlow = isPlus
      ? 'rgba(168, 85, 247, 0.28)'
      : isPremium
      ? 'rgba(245, 158, 11, 0.32)'
      : (card.glowColor || card.glow_color || 'rgba(255, 0, 127, 0.25)');

    const cardGrad = isPlus
      ? ['#A855F7', '#7C3AED']
      : isPremium
      ? ['#FBBF24', '#F59E0B', '#D97706']
      : (Array.isArray(card.gradient) && card.gradient.length >= 2 ? card.gradient : ['#FF007F', '#B5179E']);

    const accentCol = isPlus ? '#A855F7' : isPremium ? '#F59E0B' : (card.accentColor || card.accent_color || cardGrad[0] || '#FF007F');
    const icon = card.iconName || card.icon_name || card.icon || (isPlus ? 'star-outline' : isPremium ? 'sparkles-outline' : 'heart-outline');

    return (
      <Animated.View style={[styles.cardWrapper, { transform: [{ scale }], opacity }]}>
        <View style={styles.cardContainer}>
          {/* Top Subtle Gradient Glow */}
          <LinearGradient
            colors={[cardGlow, 'transparent']}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.4 }}
            style={StyleSheet.absoluteFill}
          />

          {/* ScrollView inside card for main card content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.cardInnerScroll}
            style={styles.cardScrollView}
            nestedScrollEnabled={true}
          >
            {/* Top Pill Badge */}
            {!!badgeTitle && (
              <View style={styles.badgeRow}>
                <LinearGradient
                  colors={cardGrad}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.badgeCapsule}
                >
                  <Text style={styles.badgeText}>{String(badgeTitle).toUpperCase()}</Text>
                </LinearGradient>
              </View>
            )}

            {/* Header Icon & Plan Name */}
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { shadowColor: accentCol }]}>
                <LinearGradient
                  colors={cardGrad}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.iconGrad}
                >
                  <Ionicons name={icon} size={isSmallDevice ? 24 : 28} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <Text style={[styles.cardTitle, isSmallDevice && styles.smallCardTitle]}>{card.name}</Text>
              {!!card.tagline && (
                <Text style={[styles.cardTagline, isSmallDevice && styles.smallCardTagline]}>{card.tagline}</Text>
              )}
            </View>

            {/* Duration Selector Tabs inside Card */}
            <View style={styles.durationSection}>
              <Text style={styles.sectionLabel}>SELECT DURATION</Text>
              <View style={styles.durationRow}>
                {durationsList.map((dur) => {
                  const isSelected = dur.id === selectedDurId;
                  return (
                    <TouchableOpacity
                      key={dur.id}
                      style={[
                        styles.durTab,
                        isSelected && styles.durTabSelected,
                        isSmallDevice && styles.smallDurTab,
                      ]}
                      onPress={() => handleSelectDuration(card.id, dur.id)}
                      activeOpacity={0.8}
                    >
                      {isSelected && (
                        <LinearGradient
                          colors={cardGrad}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                        />
                      )}

                      <View style={[styles.durTabContent, isSmallDevice && styles.smallDurTabContent]}>
                        {dur.save ? (
                          <View style={[styles.savePill, isSelected && styles.savePillActive]}>
                            <Text style={[styles.saveTxt, isSelected && styles.whiteTxt]}>
                              {dur.save}
                            </Text>
                          </View>
                        ) : null}

                        <Text style={[styles.durLabelText, isSelected && styles.whiteTxt, isSmallDevice && styles.smallDurLabelText]}>
                          {dur.label}
                        </Text>
                        <Text style={[styles.durPriceText, isSelected && styles.whiteTxt, isSmallDevice && styles.smallDurPriceText]}>
                          {dur.price}<Text style={styles.durUnitText}>{dur.unit || ''}</Text>
                        </Text>
                        <Text style={[styles.durTotalText, isSelected && styles.whiteFaintTxt, isSmallDevice && styles.smallDurTotalText]}>
                          {isWelcomeDiscount ? `${calculateDiscountedPrice(dur.total, 20)} (20% OFF)` : dur.total}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Features Checklist with Scroller */}
            <View style={styles.featuresSection}>
              <View style={styles.featuresHeaderRow}>
                <Text style={styles.sectionLabel}>INCLUDED PERKS ({(card.features || []).length})</Text>
                {(card.features || []).length > 3 && (
                  <View style={styles.scrollHintBadge}>
                    <Ionicons name="swap-vertical" size={11} color={accentCol} />
                    <Text style={[styles.scrollHintTxt, { color: theme.textSec }]}>Scroll list</Text>
                  </View>
                )}
              </View>

              <View style={styles.featuresScrollView}>
                <View style={styles.featuresListContainer}>
                  {(card.features || []).map((feat, fIdx) => {
                    const featIcon = typeof feat === 'object' ? (feat.icon || feat.icon_name || 'checkmark-circle-outline') : 'checkmark-circle-outline';
                    const featTitle = typeof feat === 'object' ? feat.title : String(feat);
                    return (
                      <View key={fIdx} style={[styles.featureRow, isSmallDevice && styles.smallFeatureRow]}>
                        <View style={[styles.featureIconBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                          <Ionicons name={featIcon} size={isSmallDevice ? 13 : 15} color={accentCol} />
                        </View>
                        <Text style={[styles.featureTitle, isSmallDevice && styles.smallFeatureTitle]}>{featTitle}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Add extra bottom padding for CTA */}
            <View style={styles.bottomSpacer} />
          </ScrollView>

          {/* Sticky CTA Button at Bottom of Card */}
          <View style={[styles.cardCtaWrap, isSmallDevice && styles.smallCardCtaWrap]}>
            <TouchableOpacity
              onPress={() => handleSubscribe(card)}
              activeOpacity={0.88}
              style={[styles.cardCtaBtn, { shadowColor: accentCol }]}
            >
              <LinearGradient
                colors={cardGrad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.cardCtaGrad}
              >
                <Ionicons name="sparkles" size={isSmallDevice ? 15 : 17} color="#FFFFFF" />
                <Text style={[styles.cardCtaText, isSmallDevice && styles.smallCardCtaText]}>
                  Get {card.name} ({selectedDurObj?.price || ''}{selectedDurObj?.unit || ''})
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <LinearGradient colors={theme.bgGrad} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Decorative Orbs */}
      <View style={styles.glowBlobFuchsia} pointerEvents="none" />
      <View style={styles.glowBlobCyan} pointerEvents="none" />

      <SafeAreaView style={styles.flex}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={true}
          contentContainerStyle={styles.rootScrollContent}
        >
          {/* Header */}
          <View style={[styles.header, isSmallDevice && styles.smallHeader]}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={theme.textPrimary} />
            </TouchableOpacity>

            <View style={styles.headerTitleWrap}>
              <Text style={[styles.headerTitle, isSmallDevice && styles.smallHeaderTitle]}>HeartLink Membership</Text>
              <Text style={[styles.headerSubtitle, isSmallDevice && styles.smallHeaderSubtitle]}>Swipe to choose your plan</Text>
            </View>

            <View style={{ width: 38 }} />
          </View>

          {/* Top 20% Welcome Offer Banner with Countdown Timer for 24-Hour New Users */}
          {isOfferEligible && (
            <View style={[styles.topOfferBannerWrap, isSmallDevice && styles.smallTopOfferBannerWrap]}>
              <LinearGradient
                colors={['#FBBF24', '#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.topOfferBannerGrad}
              >
                <Text style={[styles.topOfferBannerTitle, isSmallDevice && styles.smallTopOfferBannerTitle]}>
                  <Text style={styles.boldOfferTxt}>20% OFF </Text>WELCOME OFFER ACTIVE
                </Text>
                <Text style={[styles.topOfferBannerSub, isSmallDevice && styles.smallTopOfferBannerSub]}>Expires in {formatTimeLeft(timeLeftMs)}</Text>
              </LinearGradient>
            </View>
          )}

          {/* Slidable Carousel of Cards */}
          {loading ? (
            <View style={{ paddingVertical: 80, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#F59E0B" />
              <Text style={{ color: theme.textSec, fontSize: 13, marginTop: 12 }}>Loading database membership plans…</Text>
            </View>
          ) : plans.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cloud-offline-outline" size={44} color={theme.textFaint} />
              <Text style={styles.emptyTitle}>Refresh</Text>
              <Text style={styles.emptySubtitle}>Check your internet connection and try again.</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchPlans} activeOpacity={0.8}>
                <LinearGradient colors={['#FBBF24', '#F59E0B', '#D97706']} style={styles.retryGrad}>
                  <Ionicons name="refresh" size={15} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.retryBtnTxt}>Retry Loading Plans</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.carouselContainer}>
                <Animated.FlatList
                  ref={flatListRef}
                  data={plans}
                  renderItem={renderCard}
                  keyExtractor={item => item.id || item.name}
                  horizontal
                  pagingEnabled={false}
                  snapToInterval={CARD_WIDTH}
                  decelerationRate="fast"
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.flatListContent}
                  onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                  )}
                  onMomentumScrollEnd={(e) => {
                    const newIndex = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
                    setActiveIndex(newIndex);
                  }}
                />
              </View>

              {/* Pagination Controls Row with Prev/Next Buttons & Clickable Dots */}
              <View style={styles.paginationControlsRow}>
                <TouchableOpacity
                  style={[styles.navArrowBtn, activeIndex === 0 && styles.navArrowDisabled]}
                  onPress={() => {
                    if (activeIndex > 0) {
                      flatListRef.current?.scrollToIndex({ index: activeIndex - 1, animated: true });
                      setActiveIndex(activeIndex - 1);
                    }
                  }}
                  disabled={activeIndex === 0}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={18} color={activeIndex === 0 ? theme.textFaint : theme.textPrimary} />
                </TouchableOpacity>

                <View style={[styles.paginationRow, isSmallDevice && styles.smallPaginationRow]}>
                  {plans.map((card, i) => {
                    const inputRange = [
                      (i - 1) * CARD_WIDTH,
                      i * CARD_WIDTH,
                      (i + 1) * CARD_WIDTH,
                    ];

                    const dotWidth = scrollX.interpolate({
                      inputRange,
                      outputRange: [7, 24, 7],
                      extrapolate: 'clamp',
                    });

                    const opacity = scrollX.interpolate({
                      inputRange,
                      outputRange: [0.35, 1.0, 0.35],
                      extrapolate: 'clamp',
                    });

                    const dotColor = card.accentColor || card.accent_color || '#FF007F';

                    return (
                      <TouchableOpacity
                        key={card.id || i}
                        onPress={() => {
                          flatListRef.current?.scrollToIndex({ index: i, animated: true });
                          setActiveIndex(i);
                        }}
                        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                        activeOpacity={0.75}
                      >
                        <Animated.View
                          style={[
                            styles.dot,
                            { width: dotWidth, opacity, backgroundColor: dotColor },
                            isSmallDevice && styles.smallDot,
                          ]}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={[styles.navArrowBtn, activeIndex >= plans.length - 1 && styles.navArrowDisabled]}
                  onPress={() => {
                    if (activeIndex < plans.length - 1) {
                      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
                      setActiveIndex(activeIndex + 1);
                    }
                  }}
                  disabled={activeIndex >= plans.length - 1}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-forward" size={18} color={activeIndex >= plans.length - 1 ? theme.textFaint : theme.textPrimary} />
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={[styles.disclaimerWrap, isSmallDevice && styles.smallDisclaimerWrap]}>
            <View style={styles.policyLinksRow}>
              <Text style={styles.policyDot}>•</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Payment Gateway Modal */}
      <PaymentGatewayModal
        visible={paymentModalVisible}
        plan={selectedCardForPayment}
        durationId={cardDurations[selectedCardForPayment?.id] || '6m'}
        customPrice={customOfferPrice}
        originalPrice={originalOfferPrice}
        onClose={() => {
          setPaymentModalVisible(false);
          setCustomOfferPrice(null);
          setOriginalOfferPrice(null);
        }}
        onPaymentSuccess={() => {
          setPaymentModalVisible(false);
          setCustomOfferPrice(null);
          setOriginalOfferPrice(null);
          navigation.goBack();
        }}
      />

      {/* Confirmation Modal */}
      <CustomAlertModal
        visible={successAlertVisible}
        title="Membership Activated"
        message={`Your ${purchasedPlanName} pass is now active. Enjoy your elite benefits!`}
        icon="sparkles"
        iconColor="#FF007F"
        confirmText="Continue"
        onConfirm={() => {
          setSuccessAlertVisible(false);
          navigation.goBack();
        }}
      />
    </LinearGradient>
  );
}

const getStyles = (theme, CARD_WIDTH, CARD_SPACING, isSmallDevice, windowHeight) => StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, position: 'relative' },
  rootScrollContent: {
    paddingBottom: 40,
  },

  glowBlobFuchsia: {
    position: 'absolute',
    top: (windowHeight || 800) * 0.1,
    right: -70,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255, 0, 127, 0.18)',
    opacity: 0.8,
    zIndex: 0,
  },
  glowBlobCyan: {
    position: 'absolute',
    bottom: (windowHeight || 800) * 0.15,
    left: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(0, 191, 255, 0.15)',
    opacity: 0.7,
    zIndex: 0,
  },

  // Top Offer Banner
  topOfferBannerWrap: {
    paddingHorizontal: 16,
    marginBottom: 8,
    zIndex: 10,
  },
  smallTopOfferBannerWrap: {
    marginBottom: 4,
    paddingHorizontal: 12,
  },
  topOfferBannerGrad: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    elevation: 4,
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  boldOfferTxt: {
    fontWeight: '900',
    fontSize: 12.5,
    color: '#FFD700',
  },
  topOfferBannerTitle: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '500',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  smallTopOfferBannerTitle: {
    fontSize: 10,
  },
  topOfferBannerSub: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  smallTopOfferBannerSub: {
    fontSize: 9.5,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
    zIndex: 10,
  },
  smallHeader: {
    paddingTop: 4,
    paddingBottom: 4,
    paddingHorizontal: 16,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.glass,
    borderWidth: 1,
    borderColor: theme.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.textPrimary,
    letterSpacing: -0.3,
  },
  smallHeaderTitle: {
    fontSize: 15,
  },
  headerSubtitle: {
    fontSize: 11,
    color: theme.textFaint,
    marginTop: 2,
  },
  smallHeaderSubtitle: {
    fontSize: 9.5,
  },

  // Carousel
  carouselContainer: {
    paddingVertical: 12,
    marginVertical: 6,
  },
  flatListContent: {
    paddingHorizontal: CARD_SPACING,
    alignItems: 'center',
  },

  // Card Outer & Inner
  cardWrapper: {
    width: CARD_WIDTH,
    height: isSmallDevice ? Math.min(windowHeight * 0.72, 540) : Math.min(windowHeight * 0.76, 620),
    paddingHorizontal: 4,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: theme.isDark ? 0.45 : 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  cardContainer: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1.2,
    borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.85)',
    backgroundColor: theme.isDark ? '#1C1433' : '#FFFFFF',
    overflow: 'hidden',
  },
  cardScrollView: {
    flex: 1,
  },
  cardInnerScroll: {
    padding: 18,
    paddingBottom: 90,
  },
  bottomSpacer: {
    height: isSmallDevice ? 10 : 20,
  },

  // Badge Tag
  badgeRow: {
    alignItems: 'center',
    marginBottom: isSmallDevice ? 10 : 14,
  },
  badgeCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    overflow: 'hidden',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.0,
  },

  // Header Icon & Title
  cardHeader: {
    alignItems: 'center',
    marginBottom: isSmallDevice ? 12 : 18,
  },
  iconCircle: {
    width: isSmallDevice ? 50 : 60,
    height: isSmallDevice ? 50 : 60,
    borderRadius: isSmallDevice ? 25 : 30,
    overflow: 'hidden',
    marginBottom: isSmallDevice ? 6 : 10,
  },
  iconGrad: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.textPrimary,
    letterSpacing: -0.3,
  },
  smallCardTitle: {
    fontSize: 18,
  },
  cardTagline: {
    fontSize: 12,
    color: theme.textSec,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 10,
    lineHeight: 17,
  },
  smallCardTagline: {
    fontSize: 10.5,
    lineHeight: 14,
    marginTop: 2,
  },

  // Duration Grid
  durationSection: {
    marginBottom: isSmallDevice ? 12 : 20,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.textFaint,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durTab: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)',
    overflow: 'hidden',
  },
  smallDurTab: {
    borderRadius: 14,
  },
  durTabSelected: {
    borderColor: 'transparent',
  },
  durTabContent: {
    padding: 10,
    alignItems: 'center',
  },
  smallDurTabContent: {
    padding: 6,
  },
  savePill: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  savePillActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  saveTxt: {
    fontSize: 9,
    fontWeight: '800',
    color: '#30D158',
  },
  durLabelText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  smallDurLabelText: {
    fontSize: 10,
  },
  durPriceText: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.textPrimary,
    marginTop: 2,
  },
  smallDurPriceText: {
    fontSize: 14,
  },
  durUnitText: {
    fontSize: 10,
    fontWeight: '600',
  },
  durTotalText: {
    fontSize: 9.5,
    color: theme.textFaint,
    marginTop: 2,
    textAlign: 'center',
  },
  smallDurTotalText: {
    fontSize: 8.5,
  },
  whiteTxt: {
    color: '#FFFFFF',
  },
  whiteFaintTxt: {
    color: 'rgba(255, 255, 255, 0.75)',
  },

  // Features Section
  featuresSection: {
    marginBottom: isSmallDevice ? 6 : 10,
  },
  featuresHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  scrollHintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
  },
  scrollHintTxt: {
    fontSize: 10,
    fontWeight: '600',
  },
  featuresScrollView: {
    borderRadius: 14,
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  featuresListContainer: {
    gap: isSmallDevice ? 6 : 8,
    paddingVertical: 6,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  smallFeatureRow: {
    gap: 8,
  },
  featureIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  featureTitle: {
    fontSize: 12.5,
    color: theme.textPrimary,
    fontWeight: '400',
    flex: 1,
    lineHeight: 17,
  },
  smallFeatureTitle: {
    fontSize: 11,
    lineHeight: 14,
  },

  // Empty Database State
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.textPrimary,
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.textSec,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  retryBtn: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  retryGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryBtnTxt: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Sticky Card CTA
  cardCtaWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.isDark ? '#1C1433' : '#FFFFFF',
    overflow: 'hidden',
  },
  smallCardCtaWrap: {
    padding: 10,
  },
  cardCtaBtn: {
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardCtaGrad: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  cardCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  smallCardCtaText: {
    fontSize: 11.5,
  },

  // Pagination Controls & Dots
  paginationControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  navArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navArrowDisabled: {
    opacity: 0.25,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  smallPaginationRow: {
    paddingVertical: 4,
    gap: 4,
  },
  dot: {
    height: 7,
    borderRadius: 3.5,
  },
  smallDot: {
    height: 5,
    borderRadius: 2.5,
  },

  disclaimerWrap: {
    alignItems: 'center',
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  smallDisclaimerWrap: {
    paddingBottom: 6,
    paddingHorizontal: 16,
  },
  disclaimerText: {
    fontSize: 10,
    color: theme.textFaint,
    textAlign: 'center',
    marginBottom: 4,
  },
  policyLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  policyLinkTxt: {
    fontSize: 10.5,
    fontWeight: '700',
    color: theme.accent || '#FF007F',
    textDecorationLine: 'underline',
  },
  smallPolicyLinkTxt: {
    fontSize: 9,
  },
  policyDot: {
    fontSize: 10,
    color: theme.textFaint,
  },
});