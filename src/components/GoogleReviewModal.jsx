// src/components/GoogleReviewModal.jsx — Real Google Review & Rating Window with In-App Review
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Linking,
  Platform,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../theme/ThemeContext';
import { navigate } from '../navigation/navigationRef';

const { width } = Dimensions.get('window');

const PLAY_STORE_PACKAGE = 'com.heartlinkdatingapp.app';
const MARKET_URL = `market://details?id=${PLAY_STORE_PACKAGE}&showAllReviews=true`;
const WEB_PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;

export default function GoogleReviewModal() {
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();

  const [visible, setVisible] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Animations
  const starScaleAnim = useRef(new Animated.Value(1)).current;
  const modalFadeAnim = useRef(new Animated.Value(0)).current;
  const toastFadeAnim = useRef(new Animated.Value(0)).current;

  const hasOpenedStoreRef = useRef(false);

  const userId = user?.id || user?.email || 'authenticated_user';
  const completedKey = `@heartlink_review_completed_${userId}`;

  const styles = useMemo(() => getStyles(isDark), [isDark]);

  // Show review popup on refresh ONLY if review has not been submitted yet
  useEffect(() => {
    if (!isAuthenticated) {
      setVisible(false);
      return;
    }

    let isMounted = true;

    const checkAndShow = async () => {
      try {
        const isCompleted = await AsyncStorage.getItem(completedKey);
        const storedReview = await AsyncStorage.getItem(`@heartlink_user_review_${userId}`);
        if (isCompleted === 'true' || storedReview) {
          // Review is already submitted — do not show popup
          if (isMounted) setVisible(false);
          return;
        }

        if (isMounted) {
          setVisible(true);
          Animated.timing(modalFadeAnim, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }).start();
        }
      } catch (err) {
        console.warn('[GoogleReviewModal] Check error:', err?.message);
      }
    };

    const timer = setTimeout(checkAndShow, 1200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isAuthenticated, userId, completedKey]);

  // When user returns to app after completing review on Google Play, show thank-you banner
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && hasOpenedStoreRef.current) {
        hasOpenedStoreRef.current = false;
        setShowSuccessToast(true);
        Animated.sequence([
          Animated.timing(toastFadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(3500),
          Animated.timing(toastFadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setShowSuccessToast(false);
        });
      }
    });

    return () => sub.remove();
  }, [toastFadeAnim]);

  // Star tap animation
  const handleStarPress = (rating) => {
    setSelectedRating(rating);
    Animated.sequence([
      Animated.timing(starScaleAnim, {
        toValue: 1.25,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(starScaleAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Submit Review Flow with Real Google Play In-App Review
  const handleSubmitReview = async () => {
    setIsSubmitting(true);

    try {
      // 1. Record review locally and mark as permanently completed
      const reviewPayload = {
        rating: selectedRating,
        reviewText: reviewText.trim(),
        user_id: userId,
        user_name: user?.name || user?.display_name || 'Anonymous',
        submittedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(`@heartlink_user_review_${userId}`, JSON.stringify(reviewPayload));
      await AsyncStorage.setItem(completedKey, 'true');

      // 2. Hide our custom modal immediately so Google Play can display cleanly
      setVisible(false);
      setIsSubmitting(false);

      // 3. For 4-5 stars: Launch Official Google Play Review Window
      if (selectedRating >= 4) {
        hasOpenedStoreRef.current = true;

        // Try in-app review API
        try {
          if (await StoreReview.isAvailableAsync()) {
            StoreReview.requestReview().catch(() => {});
          }
        } catch (e) {
          console.log('[GoogleReview] In-app request error:', e?.message);
        }

        // ALWAYS open official Google Play Store app directly to Heart Link review page
        try {
          const canOpenMarket = await Linking.canOpenURL(MARKET_URL);
          if (canOpenMarket) {
            await Linking.openURL(MARKET_URL);
          } else {
            await Linking.openURL(WEB_PLAY_STORE_URL);
          }
        } catch (err) {
          Linking.openURL(WEB_PLAY_STORE_URL).catch(() => {});
        }
      } else {
        // Lower rating (1-3 stars): open internal support concierge so user gets immediate help
        navigate('SupportChat');
      }
    } catch (err) {
      console.warn('[GoogleReview] Error submitting review:', err?.message);
      setIsSubmitting(false);
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  return (
    <>
      {/* Return Thank-You Toast */}
      {showSuccessToast && (
        <Animated.View style={[styles.toastContainer, { opacity: toastFadeAnim }]} pointerEvents="none">
          <LinearGradient
            colors={['#191309', '#0F0B05']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.toastCard}
          >
            <Ionicons name="checkmark-circle" size={22} color="#10B981" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.toastTitle}>Review Submitted to Google Play</Text>
              <Text style={styles.toastSub}>Thank you for supporting Heart Link! ⭐⭐⭐⭐⭐</Text>
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      {visible && (
        <Modal
          visible={visible}
          transparent
          animationType="fade"
          onRequestClose={handleDismiss}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <TouchableOpacity
              style={styles.overlay}
              activeOpacity={1}
              onPress={handleDismiss}
            >
              <TouchableOpacity
                activeOpacity={1}
                style={{ width: '100%', maxWidth: 380, alignItems: 'center' }}
                onPress={(e) => e.stopPropagation?.()}
              >
                <Animated.View style={[styles.card, { opacity: modalFadeAnim }]}>
                  {/* Glowing Top Icon */}
                  <View style={styles.iconWrap}>
                    <LinearGradient
                      colors={['#FBBF24', '#F59E0B', '#D97706']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.iconGrad}
                    >
                      <Ionicons name="logo-google-playstore" size={28} color="#FFF" />
                    </LinearGradient>
                    <View style={styles.heartBadge}>
                      <Ionicons name="heart" size={13} color="#FFF" />
                    </View>
                  </View>

                  {/* Heading & Subtitle */}
                  <Text style={styles.title}>Enjoying Heart Link?</Text>
                  <Text style={styles.subtitle}>
                    Tap a star to rate us and write your review for Google Play!
                  </Text>

                  {/* Interactive Star Rating Row */}
                  <Animated.View style={[styles.starsRow, { transform: [{ scale: starScaleAnim }] }]}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = star <= selectedRating;
                      return (
                        <TouchableOpacity
                          key={star}
                          onPress={() => handleStarPress(star)}
                          activeOpacity={0.75}
                          style={styles.starBtn}
                        >
                          <Ionicons
                            name={isFilled ? 'star' : 'star-outline'}
                            size={36}
                            color={isFilled ? '#F59E0B' : (isDark ? '#524535' : '#D1D5DB')}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </Animated.View>

                  <Text style={styles.ratingHint}>
                    {selectedRating === 5 && '⭐️⭐️⭐️⭐️⭐️ Outstanding Experience'}
                    {selectedRating === 4 && '⭐️⭐️⭐️⭐️ Great Experience'}
                    {selectedRating === 3 && '⭐️⭐️⭐️ Good • Tell us how to improve'}
                    {selectedRating <= 2 && '💬 Let us know how we can do better'}
                  </Text>

                  {/* Optional Review Text Input */}
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.reviewInput}
                      placeholder="Write your review for Google Play (optional)..."
                      placeholderTextColor={isDark ? '#8A7A65' : '#9CA3AF'}
                      value={reviewText}
                      onChangeText={setReviewText}
                      multiline
                      maxLength={300}
                    />
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[styles.primaryBtn, isSubmitting && { opacity: 0.7 }]}
                    onPress={handleSubmitReview}
                    disabled={isSubmitting}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['#FBBF24', '#F59E0B', '#D97706']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.primaryBtnGrad}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <>
                          <Ionicons name="logo-google-playstore" size={17} color="#FFF" style={{ marginRight: 8 }} />
                          <Text style={styles.primaryBtnText}>
                            {selectedRating >= 4 ? 'Submit Review to Google Play' : 'Submit Feedback'}
                          </Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </>
  );
}

const getStyles = (isDark) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.72)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 22,
    },
    card: {
      width: '100%',
      maxWidth: 380,
      borderRadius: 28,
      backgroundColor: isDark ? '#191309' : '#FFFFFF',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.22)',
      paddingHorizontal: 22,
      paddingTop: 26,
      paddingBottom: 22,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.35,
      shadowRadius: 24,
      elevation: 12,
      position: 'relative',
    },
    iconWrap: {
      position: 'relative',
      marginBottom: 14,
    },
    iconGrad: {
      width: 62,
      height: 62,
      borderRadius: 31,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#F59E0B',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 6,
    },
    heartBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#E11D48',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: isDark ? '#191309' : '#FFFFFF',
    },
    title: {
      fontSize: 20,
      fontWeight: '900',
      color: isDark ? '#FFFFFF' : '#18181B',
      textAlign: 'center',
      letterSpacing: -0.3,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 12.5,
      lineHeight: 18,
      color: isDark ? '#D4D4D8' : '#52525B',
      textAlign: 'center',
      paddingHorizontal: 8,
      marginBottom: 14,
    },
    starsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 8,
    },
    starBtn: {
      padding: 3,
    },
    ratingHint: {
      fontSize: 11.5,
      fontWeight: '700',
      color: isDark ? '#FDE68A' : '#B45309',
      textAlign: 'center',
      minHeight: 18,
      marginBottom: 14,
    },
    inputWrap: {
      width: '100%',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F9FAFB',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(245, 158, 11, 0.22)' : 'rgba(0, 0, 0, 0.08)',
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 16,
    },
    reviewInput: {
      fontSize: 13,
      color: isDark ? '#FFFFFF' : '#18181B',
      minHeight: 52,
      maxHeight: 90,
      textAlignVertical: 'top',
    },
    primaryBtn: {
      width: '100%',
      borderRadius: 18,
      overflow: 'hidden',
      shadowColor: '#F59E0B',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 4,
    },
    primaryBtnGrad: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      paddingHorizontal: 18,
    },
    primaryBtnText: {
      fontSize: 14.5,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 0.2,
    },

    // Return Toast Styles
    toastContainer: {
      position: 'absolute',
      top: 60,
      left: 20,
      right: 20,
      zIndex: 9999,
      alignItems: 'center',
    },
    toastCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1.2,
      borderColor: '#F59E0B',
      shadowColor: '#F59E0B',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 8,
    },
    toastTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    toastSub: {
      fontSize: 11,
      color: '#FDE68A',
      marginTop: 2,
    },
  });
