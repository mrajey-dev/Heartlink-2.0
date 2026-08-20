// src/components/WelcomeOfferModal.jsx — HeartLink Theme Coupon Style 20% OFF Welcome Offer Modal
import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../theme/ThemeContext';
import { navigate } from '../navigation/navigationRef';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const OFFER_DURATION_MS = 48 * 60 * 60 * 1000; // 48 Hours

export default function WelcomeOfferModal() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isDark } = useTheme();

  // MATCH APP THEME DIRECTLY:
  // App in Dark mode (isDark = true) -> Card is Dark theme (cardIsDark = true)
  // App in Light mode (isDark = false) -> Card is Light theme (cardIsDark = false)
  const cardIsDark = isDark;

  const styles = useMemo(() => getStyles(cardIsDark), [cardIsDark]);

  const [visible, setVisible] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [dontShowToday, setDontShowToday] = useState(false);
  const [showCloseBtn, setShowCloseBtn] = useState(false);

  useEffect(() => {
    if (!user) {
      setVisible(false);
      return;
    }

    let isMounted = true;
    const userId = user.id || user.email || 'active_user';
    const storageKey = `@heartlink_first_login_${userId}`;
    const hideTodayKey = `@heartlink_hide_offer_${userId}`;

    const checkOfferEligibility = async () => {
      try {
        // Check if hidden for today
        const hideTimestamp = await AsyncStorage.getItem(hideTodayKey);
        if (hideTimestamp) {
          const hideAge = Date.now() - parseInt(hideTimestamp, 10);
          if (!isNaN(hideAge) && hideAge < 24 * 60 * 60 * 1000) {
            if (isMounted) setVisible(false);
            return;
          }
        }

        // Determine account creation timestamp
        let createdAtTimestamp = null;
        if (user.created_at) {
          const parsed = new Date(user.created_at).getTime();
          if (!isNaN(parsed) && parsed > 0) {
            createdAtTimestamp = parsed;
          }
        }

        if (!createdAtTimestamp) {
          const storedFirstSeen = await AsyncStorage.getItem(storageKey);
          if (storedFirstSeen) {
            const parsedStored = parseInt(storedFirstSeen, 10);
            if (!isNaN(parsedStored) && parsedStored > 0) {
              createdAtTimestamp = parsedStored;
            }
          }
          if (!createdAtTimestamp) {
            createdAtTimestamp = Date.now();
            await AsyncStorage.setItem(storageKey, createdAtTimestamp.toString()).catch(() => { });
          }
        }

        const expiresAt = createdAtTimestamp + OFFER_DURATION_MS; // 48 hours from creation
        const remainingMs = expiresAt - Date.now();

        // Strict 48-Hour Eligibility Rule:
        // Only show offer if account was created within the last 48 hours
        if (remainingMs <= 0) {
          if (isMounted) setVisible(false);
          return;
        }

        if (isMounted) {
          setTimeLeftMs(remainingMs);
          setVisible(true);
        }
      } catch (err) {
        console.warn('Error checking welcome offer eligibility:', err);
        if (isMounted) setVisible(false);
      }
    };

    checkOfferEligibility();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // 5 Seconds Delay Timer for Close Button
  useEffect(() => {
    if (visible) {
      setShowCloseBtn(false);
      const timer = setTimeout(() => {
        setShowCloseBtn(true);
      }, 6000); // Appears after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [visible]);

  // Live countdown timer loop
  useEffect(() => {
    if (!visible || timeLeftMs <= 0) return;

    const interval = setInterval(() => {
      setTimeLeftMs((prev) => {
        if (prev <= 1000) {
          clearInterval(interval);
          setVisible(false);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, timeLeftMs]);

  // Format milliseconds into HH:MM:SS
  const formatTimeLeft = (ms) => {
    if (ms <= 0) return '00h 00m 00s';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  };

  const handleClose = async () => {
    if (dontShowToday && user?.id) {
      const hideTodayKey = `@heartlink_hide_offer_${user.id}`;
      await AsyncStorage.setItem(hideTodayKey, Date.now().toString()).catch(() => { });
    }
    setVisible(false);
  };

  const handleClaimOffer = () => {
    setVisible(false);
    navigate('Plans', {
      welcomeDiscount20: true,
      discountPercent: 20,
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={[styles.overlay, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />

        {/* 3D Main Pop-Up Container */}
        <View style={styles.popUpCardWrap}>
          {/* Top Center Overlapping Heart Badge */}
          <View style={[styles.topBadgeContainer, { borderColor: cardIsDark ? '#141026' : '#FFF0F6' }]}>
            <LinearGradient
              colors={['#FF007F', '#E0006C', '#8A2BE2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.topBadgeGrad}
            >
              <Ionicons name="heart" size={28} color="#FFFFFF" />
            </LinearGradient>
          </View>

          <View style={styles.popUpCardContainer}>
            <LinearGradient
              colors={cardIsDark ? ['#141026', '#1E163B'] : ['#FFF0F6', '#F8E8FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              {/* Top-Right Cross Close Button */}
              {showCloseBtn && (
                <TouchableOpacity
                  onPress={handleClose}
                  activeOpacity={0.75}
                  style={styles.topRightCloseBtn}
                >
                  <Ionicons name="close" size={18} color={cardIsDark ? '#FFFFFF' : '#1E163B'} />
                </TouchableOpacity>
              )}

            {/* Top Row: Brand Icon on Left & Expiration Pill in Top Right Corner */}
            <View style={styles.topHeaderRow}>

              {/* Expiration Timer Pill in Top Right Corner */}
              <View style={[styles.topRightTimerPill, showCloseBtn && { marginRight: 32 }]}>
                <Ionicons name="time" size={12} color="#FF007F" style={{ marginRight: 4 }} />
                <Text style={styles.topRightTimerTxt}>EXPIRES IN {formatTimeLeft(timeLeftMs).toUpperCase()}</Text>
              </View>
            </View>

            {/* Center Content Section */}
            <View style={styles.contentBody}>
              {/* Bold Center Title */}
              <Text style={styles.impactTitle}>WELCOME OFFER</Text>

              {/* Subtitle Description */}
              <Text style={styles.offerDescTxt}>
                Get Flat 20% of on any membership plan
              </Text>

              {/* Middle 20% Coupon Ticket Card (HeartLink Signature Gradient Theme!) */}
              <View style={styles.couponCardWrapper}>
                <LinearGradient
                  colors={['#FF007F', '#E0006C', '#8A2BE2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.couponCardGradient}
                >
                  {/* Left Side: BIG 20% Text */}
                  <View style={styles.couponLeft}>
                    <View style={styles.couponPriceRow}>
                      <Text style={styles.bigPercentTxt}>20%</Text>
                      <Text style={styles.offTagTxt}>OFF</Text>
                    </View>
                  </View>

                  {/* Vertical Ticket Dashed Divider */}
                  <View style={styles.ticketDashedLine} />

                  {/* Right Side: Gift Illustration */}
                  <View style={styles.couponRight}>
                    <View style={styles.giftIconBubble}>
                      <Ionicons name="gift-outline" size={32} color="#FF007F" />
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* Full Width Action Button (HeartLink Gradient!) */}
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={handleClaimOffer}
                style={styles.ctaBtnShadow}
              >
                <LinearGradient
                  colors={['#FF007F', '#E0006C', '#8A2BE2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaBtnInner}
                >
                  <Text style={styles.ctaBtnTxt}>Claim Offer</Text>
                  <Ionicons name="arrow-forward-circle" size={17} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </LinearGradient>
              </TouchableOpacity>

              {/* "Don't show again today" Checkbox inside Card */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setDontShowToday(!dontShowToday)}
                style={styles.bottomCheckboxPill}
              >
                <Ionicons
                  name={dontShowToday ? 'checkbox' : 'square-outline'}
                  size={15}
                  color={cardIsDark ? '#FFFFFF' : '#64748B'}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.bottomCheckboxTxt}>Don't show again today</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (cardIsDark) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: cardIsDark ? 'rgba(5, 2, 12, 0.88)' : 'rgba(0, 0, 0, 0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 26,
    },

    popUpCardWrap: {
      width: width * 0.86,
      maxWidth: 360,
      position: 'relative',
      alignItems: 'center',
    },
    topBadgeContainer: {
      position: 'absolute',
      top: -29,
      zIndex: 20,
      width: 58,
      height: 58,
      borderRadius: 29,
      borderWidth: 4,
      elevation: 12,
      shadowColor: '#FF007F',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
    },
    topBadgeGrad: {
      flex: 1,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
    },

    popUpCardContainer: {
      width: '100%',
      borderRadius: 28,
      overflow: 'hidden',
      backgroundColor: cardIsDark ? '#141026' : '#FFF0F6',
      elevation: 24,
      shadowColor: '#FF007F',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.4,
      shadowRadius: 24,
      borderWidth: 1.5,
      borderColor: cardIsDark ? 'rgba(255, 0, 127, 0.35)' : '#FFFFFF',
      position: 'relative',
    },

    // Top-Right Close Button (Positioned inside top-right corner of card!)
    topRightCloseBtn: {
      position: 'absolute',
      top: 12,
      right: 12,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: cardIsDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 99,
    },

    cardGradient: {
      borderRadius: 28,
      paddingTop: 32,
      paddingBottom: 22,
      paddingHorizontal: 20,
    },

    // Top Header Row
    topHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    brandBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: cardIsDark ? 'rgba(255, 0, 127, 0.15)' : 'rgba(255, 0, 127, 0.1)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    brandBadgeTxt: {
      fontSize: 11,
      fontWeight: '800',
      color: '#FF007F',
    },
    topRightTimerPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: cardIsDark ? 'rgba(255, 0, 127, 0.2)' : '#FFFFFF',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255, 0, 127, 0.25)',
      elevation: 2,
    },
    topRightTimerTxt: {
      fontSize: 10,
      fontWeight: '900',
      color: '#FF007F',
      letterSpacing: 0.3,
    },

    contentBody: {
      alignItems: 'center',
      width: '100%',
    },

    // Bold Center Title
    impactTitle: {
      fontSize: 26,
      fontWeight: '900',
      color: cardIsDark ? '#FFFFFF' : '#120F24',
      letterSpacing: 0.5,
      textAlign: 'center',
      marginBottom: 4,
    },
    offerDescTxt: {
      fontSize: 12.5,
      fontWeight: '600',
      color: cardIsDark ? 'rgba(255, 255, 255, 0.75)' : '#64748B',
      textAlign: 'center',
      marginTop: 10,
      marginBottom: 18,
    },

    // Coupon Ticket Card
    couponCardWrapper: {
      width: '100%',
      borderRadius: 20,
      overflow: 'hidden',
      marginBottom: 20,
      elevation: 8,
      shadowColor: '#FF007F',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
    },
    couponCardGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingVertical: 16,
      borderRadius: 20,
    },
    couponLeft: {
      flex: 1,
    },
    couponBrandTag: {
      fontSize: 10,
      fontWeight: '900',
      color: 'rgba(255, 255, 255, 0.85)',
      letterSpacing: 0.8,
      marginBottom: 2,
    },
    couponPriceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    bigPercentTxt: {
      fontSize: 48,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: -1,
      lineHeight: 52,
    },
    offTagTxt: {
      fontSize: 18,
      fontWeight: '900',
      color: '#FFFFFF',
      marginLeft: 4,
    },

    ticketDashedLine: {
      width: 1,
      height: 48,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.4)',
      borderStyle: 'dashed',
      marginHorizontal: 14,
    },

    couponRight: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    giftIconBubble: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
    },

    // Action Button
    ctaBtnShadow: {
      width: '82%',
      height: 42,
      borderRadius: 21,
      alignSelf: 'center',
      overflow: 'hidden',
      elevation: 6,
      shadowColor: '#FF007F',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
    },
    ctaBtnInner: {
      flex: 1,
      borderRadius: 21,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    ctaBtnTxt: {
      fontSize: 13.5,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },

    bottomCheckboxPill: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 14,
      alignSelf: 'center',
    },
    bottomCheckboxTxt: {
      fontSize: 12,
      fontWeight: '600',
      color: cardIsDark ? 'rgba(255, 255, 255, 0.75)' : '#64748B',
    },
  });
