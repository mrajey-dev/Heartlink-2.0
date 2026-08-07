import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, StatusBar, Dimensions, Platform, Animated,
  ActivityIndicator, Linking,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import CustomAlertModal from '../components/CustomAlertModal';
import PaymentGatewayModal from '../components/PaymentGatewayModal';
import { apiSubscribePlan, apiGetSubscriptionPlans } from '../services/api';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.92;
const CARD_SPACING = (width - CARD_WIDTH) / 2;

// Helper to check if device is small
const isSmallDevice = height < 700;

export default function PlansScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme, isDark } = useTheme();
  const { user, updateUser } = useAuth();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const [cardDurations, setCardDurations] = useState({
    basic: '6m',
    plus: '6m',
    premium: '6m',
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [successAlertVisible, setSuccessAlertVisible] = useState(false);
  const [purchasedPlanName, setPurchasedPlanName] = useState('');

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedCardForPayment, setSelectedCardForPayment] = useState(null);
  const [customOfferPrice, setCustomOfferPrice] = useState(null);
  const [originalOfferPrice, setOriginalOfferPrice] = useState(null);

  const OFFER_DURATION_MS = 48 * 60 * 60 * 1000;
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

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const res = await apiGetSubscriptionPlans();
        if (res?.plans && Array.isArray(res.plans)) {
          setPlans(res.plans);
        }
      } catch (e) {
        console.warn('Fetch plans error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, [route.params]);

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

    const selectedDurId = cardDurations[card.id] || '6m';
    const selectedDurObj = card.durations.find(d => d.id === selectedDurId) || card.durations[1];

    return (
      <Animated.View style={[styles.cardWrapper, { transform: [{ scale }], opacity }]}>
        <View style={styles.cardContainer}>
          {/* Top Subtle Gradient Glow */}
          <LinearGradient
            colors={[card.glowColor, 'transparent']}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.4 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Use ScrollView inside card for vertical scrolling */}
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.cardInnerScroll}
            style={styles.cardScrollView}
          >
            {/* Top Pill Badge */}
            <View style={styles.badgeRow}>
              <View style={styles.badgeCapsule}>
              </View>
            </View>

            {/* Header Icon & Plan Name */}
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { shadowColor: card.accentColor }]}>
                <LinearGradient
                  colors={card.gradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.iconGrad}
                >
                  <Ionicons name={card.iconName} size={isSmallDevice ? 24 : 28} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <Text style={[styles.cardTitle, isSmallDevice && styles.smallCardTitle]}>{card.name}</Text>
              <Text style={[styles.cardTagline, isSmallDevice && styles.smallCardTagline]}>{card.tagline}</Text>
            </View>

            {/* Duration Selector Tabs inside Card */}
            <View style={styles.durationSection}>
              <Text style={styles.sectionLabel}>SELECT DURATION</Text>
              <View style={styles.durationRow}>
                {card.durations.map((dur) => {
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
                          colors={card.gradient}
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
                          {dur.price}<Text style={styles.durUnitText}>{dur.unit}</Text>
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

            {/* Features Checklist */}
            <View style={styles.featuresSection}>
              <Text style={styles.sectionLabel}>INCLUDED PERKS</Text>
              <View style={styles.featuresList}>
                {card.features.map((feat, fIdx) => (
                  <View key={fIdx} style={[styles.featureRow, isSmallDevice && styles.smallFeatureRow]}>
                    <View style={[styles.featureIconBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                      <Ionicons name={feat.icon} size={isSmallDevice ? 13 : 15} color={card.accentColor} />
                    </View>
                    <Text style={[styles.featureTitle, isSmallDevice && styles.smallFeatureTitle]}>{feat.title}</Text>
                  </View>
                ))}
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
              style={[styles.cardCtaBtn, { shadowColor: card.accentColor }]}
            >
              <LinearGradient
                colors={card.gradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.cardCtaGrad}
              >
                <Ionicons name="sparkles" size={isSmallDevice ? 15 : 17} color="#FFFFFF" />
                <Text style={[styles.cardCtaText, isSmallDevice && styles.smallCardCtaText]}>
                  Get {card.name} ({selectedDurObj.price}{selectedDurObj.unit})
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

        {/* Top 20% Welcome Offer Banner with Countdown Timer for 48-Hour New Users */}
        {isOfferEligible && (
          <View style={[styles.topOfferBannerWrap, isSmallDevice && styles.smallTopOfferBannerWrap]}>
            <LinearGradient
              colors={['#FF007F', '#E0006C', '#8A2BE2']}
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
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#FF007F" />
            <Text style={{ color: theme.textSec, fontSize: 13, marginTop: 12 }}>Loading membership plans…</Text>
          </View>
        ) : (
          <>
            <View style={styles.carouselContainer}>
              <Animated.FlatList
                ref={flatListRef}
                data={plans}
                renderItem={renderCard}
                keyExtractor={item => item.id}
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

            {/* Page Dots Indicator */}
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

                return (
                  <Animated.View
                    key={card.id}
                    style={[
                      styles.dot,
                      { width: dotWidth, opacity, backgroundColor: card.accentColor },
                      isSmallDevice && styles.smallDot,
                    ]}
                  />
                );
              })}
            </View>
          </>
        )}

        <View style={[styles.disclaimerWrap, isSmallDevice && styles.smallDisclaimerWrap]}>
          <View style={styles.policyLinksRow}>
            {/* <TouchableOpacity onPress={() => Linking.openURL('https://heartlink.app/terms').catch(() => {})}>
              <Text style={[styles.policyLinkTxt, isSmallDevice && styles.smallPolicyLinkTxt]}>Terms of Service</Text>
            </TouchableOpacity> */}
            <Text style={styles.policyDot}>•</Text>
            {/* <TouchableOpacity onPress={() => Linking.openURL('https://heartlink.app/privacy').catch(() => {})}>
              <Text style={[styles.policyLinkTxt, isSmallDevice && styles.smallPolicyLinkTxt]}>Privacy Policy</Text>
            </TouchableOpacity> */}
          </View>
        </View>
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

const getStyles = (theme) => StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, position: 'relative' },

  glowBlobFuchsia: {
    position: 'absolute',
    top: height * 0.1,
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
    bottom: height * 0.15,
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 10,
    paddingBottom: 8,
    zIndex: 10,
  },
  smallHeader: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 6 : 6,
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
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 6,
  },
  flatListContent: {
    paddingHorizontal: CARD_SPACING,
    alignItems: 'center',
  },

  // Card Outer & Inner
  cardWrapper: {
    width: CARD_WIDTH,
    height: isSmallDevice ? height * 0.78 : height * 0.81,
    paddingHorizontal: 4,
    paddingVertical: 4,
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
    paddingBottom: isSmallDevice ? 70 : 80,
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
  featuresList: {
    gap: isSmallDevice ? 6 : 10,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  featureTitle: {
    fontSize: 13,
    color: theme.textPrimary,
    fontWeight: '400',
    flex: 1,
    lineHeight: 18,
  },
  smallFeatureTitle: {
    fontSize: 11.5,
    lineHeight: 15,
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

  // Pagination Dots
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
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