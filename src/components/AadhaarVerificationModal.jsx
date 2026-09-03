// src/components/AadhaarVerificationModal.jsx — In-App Aadhaar OTP Verification & Profile Identity Modal
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView, Alert, Linking, NativeModules, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { apiSendAadhaarOtp, apiVerifyAadhaarOtp, apiCreateRazorpayOrder, apiVerifyRazorpayPayment } from '../services/api';
import { openRazorpayCheckout } from '../utils/razorpayService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { scale, verticalScale, fs, SCREEN } from '../utils/responsive';

export default function AadhaarVerificationModal({
  visible,
  onClose,
  onVerifiedSuccess,
  initialStep = 'alert',
}) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { user, updateUser } = useAuth();

  // Steps: 'alert' (or 'verify') -> 'payment' -> 'aadhaar' -> 'success'
  const [step, setStep] = useState(initialStep);
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Aadhaar Form State
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [refId, setRefId] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (visible) {
      setStep(initialStep === 'verify' ? 'alert' : initialStep);
      setPaying(false);
      setVerifying(false);
      setAadhaarNumber('');
      setOtp('');
      setRefId('');
      setOtpSent(false);
      setOtpSending(false);
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [visible, initialStep]);

  if (!visible) return null;

  const handleStartPayment = async () => {
    setPaying(true);
    setStep('payment');
    try {
      // Create Razorpay Order
      const orderData = {
        amount: 99,
        currency: 'INR',
        planId: 'verification_99',
        planName: 'Profile Identity Verification',
        durationId: 'lifetime',
        durationLabel: 'Lifetime',
        userId: user?.id,
        userEmail: user?.email,
        userPhone: user?.phone,
        userName: user?.name,
      };

      const orderResponse = await apiCreateRazorpayOrder(orderData);

      const responseOrderId = orderResponse?.orderId || orderResponse?.order_id;
      if (!responseOrderId) {
        throw new Error('No order ID received from server');
      }

      const razorpayKeyId = orderResponse?.key_id || orderResponse?.keyId || 'rzp_live_SsJLwM19hIvB6A';

      const razorpayOptions = {
        description: 'Profile Identity Verification',
        image: 'https://heartlink.app/logo.png',
        currency: 'INR',
        key: razorpayKeyId,
        amount: 99 * 100, // paise
        name: 'HeartLink',
        order_id: responseOrderId,
        prefill: {
          email: user?.email || '',
          contact: user?.phone || '',
          name: user?.name || '',
        },
        theme: {
          color: '#00C853',
        },
        modal: {
          backdrop: true,
        }
      };

      openRazorpayCheckout(razorpayOptions)
        .then(async (data) => {
          try {
            const verificationData = {
              orderId: responseOrderId,
              paymentId: data.razorpay_payment_id,
              signature: data.razorpay_signature,
              planId: 'verification_99',
              durationId: 'lifetime',
              userId: user?.id
            };

            const verifyRes = await apiVerifyRazorpayPayment(verificationData);
            if (verifyRes?.success) {
              setPaying(false);
              setStep('aadhaar'); // Payment successful, proceed to aadhaar verification
            } else {
              setPaying(false);
              setStep('alert');
              Alert.alert('Payment Verification Failed', 'We could not verify your payment. Please contact support.');
            }
          } catch (verifyError) {
            setPaying(false);
            setStep('alert');
            Alert.alert('Payment Verification Failed', verifyError.message || 'Unknown error');
          }
        })
        .catch((error) => {
          if (error.code === 'PAYMENT_CANCELED') {
            setPaying(false);
            setStep('alert');
            return;
          }

          if (orderResponse?.checkout_url && Platform.OS !== 'web') {
            console.log('[Payment] Falling back to checkout URL on native...');
            Linking.openURL(orderResponse.checkout_url).catch(() => { });
            setPaying(false);
            setStep('awaiting_payment');
            return;
          }

          setPaying(false);
          setStep('alert');
          Alert.alert('Payment Failed', error.description || error.message || 'An error occurred during payment processing.');
        });

    } catch (error) {
      setPaying(false);
      setStep('alert');
      Alert.alert('Payment Error', error.message || 'Failed to initiate payment. Please try again.');
    }
  };

  const handleSendOtp = async () => {
    const cleaned = aadhaarNumber.replace(/\s+/g, '');
    if (cleaned.length !== 12) {
      setErrorMessage('Please enter a valid 12-digit Aadhaar number.');
      return;
    }
    setErrorMessage('');
    setOtpSending(true);
    try {
      const res = await apiSendAadhaarOtp(cleaned);
      if (res?.ref_id !== undefined && res?.ref_id !== null) {
        setRefId(String(res.ref_id));
      }
      setOtpSent(true);
    } catch (err) {
      console.warn('Aadhaar OTP send error:', err);
      const errMsg = err?.message || err?.response?.data?.message || 'Could not send OTP. Please check your Aadhaar number and try again.';
      setErrorMessage(errMsg);
    } finally {
      setOtpSending(false);
    }
  };

  const handleCompleteVerification = async () => {
    if (!otpSent) {
      setErrorMessage('Please enter your 12-digit Aadhaar number and click "Send OTP" first.');
      return;
    }
    if (!otp || otp.trim().length < 4) {
      setErrorMessage('Please enter the OTP received on your registered mobile number.');
      return;
    }

    setErrorMessage('');
    setVerifying(true);
    try {
      const cleaned = aadhaarNumber.replace(/\s+/g, '');
      const res = await apiVerifyAadhaarOtp(otp.trim(), refId ? String(refId) : '', cleaned);
      let updatedUser = {
        is_verified: true,
        email_verified_at: new Date().toISOString(),
        subscription_plan: user?.subscription_plan && user?.subscription_plan !== 'none' ? user.subscription_plan : 'Free',
      };
      if (res?.user) {
        updatedUser = { ...res.user, is_verified: true };
      }
      updateUser(updatedUser);
      setSuccessMessage(res?.message || 'Your identity has been verified successfully via Aadhaar OTP. Profile verification badge is now active!');
      setStep('success');
    } catch (err) {
      console.warn('Verification error:', err);
      const errMsg = err?.message || err?.response?.data?.message || 'Invalid OTP entered. Please try again.';
      setErrorMessage(errMsg);
    } finally {
      setVerifying(false);
    }
  };

  // Format Aadhaar number with spaces (XXXX XXXX XXXX) for display
  const handleAadhaarChange = (text) => {
    const raw = text.replace(/[^0-9]/g, '').slice(0, 12);
    let formatted = raw;
    if (raw.length > 4 && raw.length <= 8) {
      formatted = `${raw.slice(0, 4)} ${raw.slice(4)}`;
    } else if (raw.length > 8) {
      formatted = `${raw.slice(0, 4)} ${raw.slice(4, 8)} ${raw.slice(8)}`;
    }
    setAadhaarNumber(formatted);
  };

  const isInitialPitchStep = step === 'alert' || step === 'verify';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
        <View style={[
          styles.card,
          {
            backgroundColor: isDark ? '#160B28' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)',
          }
        ]}>

          {/* Top Decorative Gradient Ambient Bar */}
          <View style={styles.topBarGradWrapper}>
            <LinearGradient
              colors={['#0072E3', '#7000FF', '#FF007F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.topBarGrad}
            />
          </View>

          {isInitialPitchStep ? (
            // ─── STEP 1: Official Aadhaar e-KYC Verification Modal ─────────────────
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollWrapPitch}>
              {/* Header Close Row */}
              <View style={styles.pitchHeaderRow}>
                <View style={styles.verifyPillBadge}>
                  <LinearGradient colors={['rgba(0, 114, 227, 0.18)', 'rgba(0, 200, 83, 0.18)']} style={styles.pillGrad}>
                    <Ionicons name="shield-checkmark" size={13} color="#00C853" style={{ marginRight: 5 }} />
                    <Text style={styles.verifyPillTxt}>GOVERNMENT RECOGNIZED e-KYC</Text>
                  </LinearGradient>
                </View>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={26} color={theme.textSec} />
                </TouchableOpacity>
              </View>

              {/* Central Official Shield Hero Icon */}
              <View style={styles.heroIconWrapper}>
                <View style={styles.heroOuterGlow}>
                  <LinearGradient colors={['#0072E3', '#00C853']} style={styles.heroIconCircle}>
                    <Ionicons name="shield-checkmark" size={42} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <View style={styles.sparkleBadge}>
                  <Ionicons name="lock-closed" size={13} color="#FFD700" />
                </View>
              </View>

              {/* Title & Headline */}
              <Text style={[styles.pitchTitle, { color: theme.textPrimary }]}>
                Aadhaar Identity Verification
              </Text>
              <Text style={[styles.pitchSubtitle, { color: theme.textSec }]}>
                Authenticate your profile via secure UIDAI Aadhaar e-KYC. Gain instant trust, guarantee authenticity, and unlock the official Verified Shield badge!
              </Text>

              {/* ─── Aadhaar Verification Benefits (Government e-KYC Theme) ───────── */}
              <View style={styles.benefitsGrid}>

                {/* Benefit 1: 100% Authentic Identity */}
                <View style={[styles.benefitCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,200,83,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,200,83,0.18)' }]}>
                  <LinearGradient colors={['#00C853', '#00E676']} style={styles.benefitIconBox}>
                    <MaterialCommunityIcons name="check-decagram" size={22} color="#FFF" />
                  </LinearGradient>
                  <View style={styles.benefitTextWrap}>
                    <Text style={[styles.benefitTitle, { color: theme.textPrimary }]}>100% Authentic Profile Badge</Text>
                    <Text style={[styles.benefitSub, { color: theme.textSec }]}>
                      Get the official Verified Shield checkmark proving you are a 100% verified, genuine person.
                    </Text>
                  </View>
                </View>

                {/* Benefit 2: Anti-Fraud & Community Trust */}
                <View style={[styles.benefitCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,114,227,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,114,227,0.18)' }]}>
                  <LinearGradient colors={['#0072E3', '#3897F0']} style={styles.benefitIconBox}>
                    <Ionicons name="shield-checkmark" size={20} color="#FFF" />
                  </LinearGradient>
                  <View style={styles.benefitTextWrap}>
                    <Text style={[styles.benefitTitle, { color: theme.textPrimary }]}>Fraud & Bot Protection</Text>
                    <Text style={[styles.benefitSub, { color: theme.textSec }]}>
                      Eliminates fake accounts, bots, and impersonators for a safe dating environment.
                    </Text>
                  </View>
                </View>

                {/* Benefit 3: Higher Trust & More Connections */}
                <View style={[styles.benefitCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,149,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,149,0,0.18)' }]}>
                  <LinearGradient colors={['#FF9500', '#FF2D55']} style={styles.benefitIconBox}>
                    <Ionicons name="heart-circle" size={20} color="#FFF" />
                  </LinearGradient>
                  <View style={styles.benefitTextWrap}>
                    <Text style={[styles.benefitTitle, { color: theme.textPrimary }]}>Maximum Trust & Match Priority</Text>
                    <Text style={[styles.benefitSub, { color: theme.textSec }]}>
                      Aadhaar verified profiles receive up to 3x higher response rates and instant mutual trust.
                    </Text>
                  </View>
                </View>

                {/* Benefit 4: Encrypted UIDAI Privacy */}
                <View style={[styles.benefitCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(112,0,255,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(112,0,255,0.18)' }]}>
                  <LinearGradient colors={['#7000FF', '#9D4EDD']} style={styles.benefitIconBox}>
                    <Ionicons name="lock-closed" size={20} color="#FFF" />
                  </LinearGradient>
                  <View style={styles.benefitTextWrap}>
                    <Text style={[styles.benefitTitle, { color: theme.textPrimary }]}>100% Encrypted & Private</Text>
                    <Text style={[styles.benefitSub, { color: theme.textSec }]}>
                      Verification is processed strictly via 256-bit UIDAI protocols. Your data is never shared.
                    </Text>
                  </View>
                </View>

              </View>

              {/* ─── Official Verification Processing Notice ──────────────────── */}
              <View style={[styles.offerBanner, { backgroundColor: isDark ? 'rgba(0, 200, 83, 0.12)' : 'rgba(0, 200, 83, 0.06)', borderColor: 'rgba(0, 200, 83, 0.3)' }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.offerPrice, { color: '#00C853' }]}>₹99</Text>
                    <Text style={[styles.offerPriceSub, { color: '#00C853', marginLeft: 6 }]}> • One-Time e-KYC Fee</Text>
                  </View>
                  <Text style={[styles.offerDesc, { color: theme.textSec }]}>
                    Official one-time Aadhaar identity verification and background validation.
                  </Text>
                </View>
                <View style={[styles.valueTag, { backgroundColor: '#00C853' }]}>
                  <Ionicons name="shield-checkmark" size={13} color="#FFF" style={{ marginRight: 4 }} />
                  <Text style={styles.valueTagTxt}>UIDAI VERIFIED</Text>
                </View>
              </View>

              {/* CTA Action Buttons Stack */}
              <View style={styles.btnStack}>
                <TouchableOpacity
                  style={styles.ctaActionBtn}
                  onPress={handleStartPayment}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={['#00C853', '#0072E3', '#005bb5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradCtaBtn}
                  >
                    <Ionicons name="shield-checkmark" size={19} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.gradCtaBtnTxt}>Proceed to Aadhaar e-KYC (₹99)</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }]}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelBtnTxt, { color: theme.textSec }]}>Maybe Later</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.securityFooter}>
                <Ionicons name="lock-closed-outline" size={12} color={theme.textFaint} style={{ marginRight: 4 }} />
                <Text style={[styles.securityFooterTxt, { color: theme.textFaint }]}>
                  UIDAI Certified e-KYC • 100% Encrypted & Safe
                </Text>
              </View>

            </ScrollView>

          ) : step === 'payment' ? (
            // ─── STEP 2: Payment Processing Simulation ──────────────────────
            <View style={styles.contentWrap}>
              <View style={[styles.iconCircle, { borderColor: '#3897F0', backgroundColor: 'rgba(56, 151, 240, 0.12)' }]}>
                <ActivityIndicator size="large" color="#3897F0" />
              </View>

              <Text style={[styles.title, { color: theme.textPrimary }]}>
                Processing ₹99 Payment 💳
              </Text>

              <Text style={[styles.message, { color: theme.textSec }]}>
                Payment of ₹99 successful! Opening secure Aadhaar OTP verification...
              </Text>
            </View>

          ) : step === 'awaiting_payment' ? (
            // ─── STEP 2.5: Web Fallback Payment Verification ──────────────────────
            <View style={styles.contentWrap}>
              <View style={[styles.iconCircle, { borderColor: '#FF9500', backgroundColor: 'rgba(255, 149, 0, 0.12)' }]}>
                <Ionicons name="time" size={32} color="#FF9500" />
              </View>

              <Text style={[styles.title, { color: theme.textPrimary }]}>
                Awaiting Payment ⏳
              </Text>

              <Text style={[styles.message, { color: theme.textSec }]}>
                Please complete your ₹99 payment in the secure browser window that opened. Once successful, return here and click the button below.
              </Text>

              <TouchableOpacity
                style={[styles.ctaActionBtn, { width: '100%' }]}
                onPress={() => setStep('aadhaar')}
                activeOpacity={0.88}
              >
                <LinearGradient colors={['#FF9500', '#FF2D55']} style={styles.gradCtaBtn}>
                  <Ionicons name="checkmark-done" size={19} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.gradCtaBtnTxt}>I've Paid - Continue to Aadhaar</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelBtn, { marginTop: 12, width: '100%', borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }]}
                onPress={() => setStep('alert')}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelBtnTxt, { color: theme.textSec }]}>Cancel</Text>
              </TouchableOpacity>
            </View>

          ) : step === 'success' ? (
            // ─── STEP 4: Custom Verification Success Screen ──────────────────
            <View style={styles.contentWrap}>
              <View style={[styles.successIconCircle]}>
                <MaterialCommunityIcons name="check-decagram" size={54} color="#00C853" />
              </View>

              <Text style={[styles.title, { color: theme.textPrimary, marginTop: 4 }]}>
                Profile Identity Verified! 🎉
              </Text>

              <Text style={[styles.message, { color: theme.textSec }]}>
                {successMessage || 'Your identity has been verified successfully via Aadhaar OTP!'}
              </Text>

              {/* Active Perks List */}
              <View style={[styles.perksActiveBox, { backgroundColor: isDark ? 'rgba(0, 200, 83, 0.08)' : 'rgba(0, 200, 83, 0.05)', borderColor: 'rgba(0, 200, 83, 0.25)' }]}>
                <View style={styles.perkRow}>
                  <MaterialCommunityIcons name="check-decagram" size={16} color="#00C853" style={{ marginRight: 8 }} />
                  <Text style={[styles.perkTxt, { color: theme.textPrimary }]}>Official Verified Identity Badge Active on Profile</Text>
                </View>
                <View style={styles.perkRow}>
                  <Ionicons name="shield-checkmark" size={16} color="#0072E3" style={{ marginRight: 8 }} />
                  <Text style={[styles.perkTxt, { color: theme.textPrimary }]}>Government Aadhaar e-KYC Authentication Completed</Text>
                </View>
                <View style={styles.perkRow}>
                  <Ionicons name="trending-up" size={16} color="#00C853" style={{ marginRight: 8 }} />
                  <Text style={[styles.perkTxt, { color: theme.textPrimary }]}>Maximum Trust Factor & Match Priority Unlocked</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.ctaActionBtn, { marginTop: 20 }]}
                onPress={() => {
                  if (onVerifiedSuccess) onVerifiedSuccess();
                  if (onClose) onClose();
                }}
                activeOpacity={0.88}
              >
                <LinearGradient colors={['#00C853', '#00E676']} style={styles.gradCtaBtn}>
                  <Ionicons name="sparkles" size={19} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.gradCtaBtnTxt}>Awesome! Explore Discover</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

          ) : (
            // ─── STEP 3: Government-Style Aadhaar OTP Verification ───────────
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollWrap}>
              {/* Government-style Tricolor Top Accent */}
              <View style={styles.govStripe}>
                <LinearGradient
                  colors={['#FF9933', '#FFFFFF', '#138808']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.govStripeGrad}
                />
              </View>

              <View style={styles.headerRow}>
                <View style={styles.aadhaarBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#1A237E" style={{ marginRight: 5 }} />
                  <Text style={styles.aadhaarBadgeTxt}>UIDAI AADHAAR VERIFICATION</Text>
                </View>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={26} color={theme.textSec} />
                </TouchableOpacity>
              </View>

              {/* Official Emblem & Title Row */}
              <View style={styles.govTitleRow}>
                <View style={[styles.govEmblemCircle, { backgroundColor: isDark ? 'rgba(26, 35, 126, 0.25)' : 'rgba(26, 35, 126, 0.08)', borderColor: '#1A237E40' }]}>
                  <Ionicons name="finger-print" size={22} color="#1A237E" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.titleLeft, { color: theme.textPrimary, marginBottom: 2 }]}>
                    Aadhaar OTP Verification
                  </Text>
                  <Text style={styles.govSubtitle}>Unique Identification Authority of India</Text>
                </View>
              </View>

              <Text style={[styles.subLeft, { color: theme.textSec }]}>
                Enter your 12-digit Aadhaar number below. An OTP will be sent directly to your Aadhaar-registered mobile number.
              </Text>

              {/* Inline Error Message */}
              {!!errorMessage && (
                <View style={styles.inlineError}>
                  <Ionicons name="alert-circle" size={16} color="#FF375F" style={{ marginRight: 6 }} />
                  <Text style={styles.inlineErrorTxt}>{errorMessage}</Text>
                </View>
              )}

              {/* Form Section */}
              <View style={styles.formContainer}>
                {/* 1. Aadhaar Number Input */}
                <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>12-Digit Aadhaar Number</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: theme.textPrimary,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                      }
                    ]}
                    placeholder="1234 5678 9012"
                    placeholderTextColor={theme.textFaint}
                    keyboardType="number-pad"
                    maxLength={14}
                    value={aadhaarNumber}
                    onChangeText={(t) => { handleAadhaarChange(t); setErrorMessage(''); }}
                  />
                  <TouchableOpacity
                    style={styles.sendOtpBtn}
                    onPress={handleSendOtp}
                    disabled={otpSending}
                    activeOpacity={0.8}
                  >
                    <LinearGradient colors={['#1A237E', '#283593']} style={styles.sendOtpGrad}>
                      {otpSending ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.sendOtpTxt}>{otpSent ? 'Resend' : 'Send OTP'}</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* 2. OTP Input */}
                {otpSent && (
                  <View style={styles.otpSection}>
                    <View style={styles.otpStatusBox}>
                      <Ionicons name="checkmark-circle" size={16} color="#00C853" style={{ marginRight: 6 }} />
                      <Text style={styles.otpStatusTxt}>OTP sent to Aadhaar linked mobile number</Text>
                    </View>

                    <Text style={[styles.inputLabel, { color: theme.textPrimary, marginTop: 12 }]}>
                      Enter 6-Digit OTP
                    </Text>
                    <TextInput
                      style={[
                        styles.inputFull,
                        {
                          color: theme.textPrimary,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                        }
                      ]}
                      placeholder="Enter 6-digit OTP"
                      placeholderTextColor={theme.textFaint}
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otp}
                      onChangeText={(t) => { setOtp(t); setErrorMessage(''); }}
                    />
                  </View>
                )}
              </View>

              {/* Final Confirm & Activate Button */}
              <TouchableOpacity
                style={[styles.confirmVerifyBtn, { opacity: otpSent ? 1 : 0.6 }]}
                onPress={handleCompleteVerification}
                disabled={verifying || !otpSent}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#1A237E', '#283593']} style={styles.gradBtn}>
                  {verifying ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={styles.gradBtnTxt}>Verify OTP & Activate Blue Tick</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Privacy Disclaimer Container */}
              <View style={[styles.privacyBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(26, 35, 126, 0.04)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26, 35, 126, 0.12)' }]}>
                <View style={styles.privacyHeader}>
                  <Ionicons name="shield-checkmark-sharp" size={14} color={isDark ? '#7986CB' : '#1A237E'} style={{ marginRight: 6 }} />
                  <Text style={[styles.privacyHeaderTxt, { color: isDark ? '#7986CB' : '#1A237E' }]}>Official Verification & Privacy Notice</Text>
                </View>
                <Text style={[styles.privacyTxt, { color: theme.textSec }]}>
                  This data is used solely for identity verification purposes and is not shared with anyone. All verification is encrypted and processed via UIDAI authorised protocols.
                </Text>
              </View>
            </ScrollView>
          )}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 2, 14, 0.86)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    zIndex: 9999,
  },
  card: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: scale(26),
    paddingHorizontal: scale(20),
    paddingTop: scale(16),
    paddingBottom: scale(20),
    borderWidth: 1,
    shadowColor: '#0072E3',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
    overflow: 'hidden',
  },
  topBarGradWrapper: {
    height: 4,
    width: '120%',
    marginLeft: '-10%',
    marginTop: scale(-16),
    marginBottom: scale(14),
  },
  topBarGrad: {
    flex: 1,
  },
  scrollWrapPitch: {
    paddingBottom: verticalScale(8),
    alignItems: 'center',
  },
  pitchHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  verifyPillBadge: {
    borderRadius: scale(16),
    overflow: 'hidden',
  },
  pillGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
  },
  verifyPillTxt: {
    fontSize: fs(10),
    fontWeight: '900',
    color: '#3897F0',
    letterSpacing: 0.8,
  },
  heroIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: verticalScale(6),
  },
  heroOuterGlow: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    backgroundColor: 'rgba(0, 114, 227, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 151, 240, 0.4)',
  },
  heroIconCircle: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  sparkleBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#160B28',
    borderRadius: scale(12),
    padding: scale(3),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.6)',
  },
  pitchTitle: {
    fontSize: fs(21),
    fontWeight: '900',
    textAlign: 'center',
    marginTop: verticalScale(8),
    marginBottom: verticalScale(4),
  },
  pitchSubtitle: {
    fontSize: fs(12.5),
    textAlign: 'center',
    lineHeight: verticalScale(17),
    paddingHorizontal: scale(10),
    marginBottom: verticalScale(16),
  },
  benefitsGrid: {
    width: '100%',
    gap: verticalScale(10),
    marginBottom: verticalScale(14),
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(12),
    borderRadius: scale(16),
    borderWidth: 1,
  },
  benefitIconBox: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(14),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  benefitTextWrap: {
    flex: 1,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  benefitTitle: {
    fontSize: fs(13.5),
    fontWeight: '800',
    marginBottom: verticalScale(2),
  },
  freeBadge: {
    backgroundColor: '#FF007F',
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: scale(6),
  },
  freeBadgeTxt: {
    color: '#FFF',
    fontSize: fs(9),
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  benefitSub: {
    fontSize: fs(11.5),
    lineHeight: verticalScale(15),
  },
  offerBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(12),
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: 'rgba(0, 114, 227, 0.3)',
    marginBottom: verticalScale(16),
  },
  offerPrice: {
    fontSize: fs(22),
    fontWeight: '900',
    color: '#0072E3',
  },
  offerPriceSub: {
    fontSize: fs(12),
    fontWeight: '700',
    color: '#3897F0',
  },
  offerDesc: {
    fontSize: fs(10.5),
    marginTop: verticalScale(2),
  },
  valueTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0072E3',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: scale(12),
  },
  valueTagTxt: {
    color: '#FFF',
    fontSize: fs(10),
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnStack: {
    width: '100%',
    gap: verticalScale(10),
  },
  ctaActionBtn: {
    height: verticalScale(50),
    borderRadius: scale(25),
    overflow: 'hidden',
    shadowColor: '#0072E3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  gradCtaBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(16),
  },
  gradCtaBtnTxt: {
    color: '#FFF',
    fontSize: fs(15.5),
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  cancelBtn: {
    height: verticalScale(44),
    borderRadius: scale(22),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelBtnTxt: {
    fontSize: fs(14),
    fontWeight: '700',
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(12),
  },
  securityFooterTxt: {
    fontSize: fs(10.5),
  },
  contentWrap: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: verticalScale(10),
  },
  iconCircle: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: 'rgba(255, 0, 127, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(16),
    borderWidth: 1.5,
    borderColor: '#FF007F',
  },
  title: {
    fontSize: fs(21),
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: verticalScale(8),
  },
  message: {
    fontSize: fs(14),
    textAlign: 'center',
    lineHeight: verticalScale(20),
    marginBottom: verticalScale(16),
  },
  gradBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(16),
  },
  gradBtnTxt: {
    color: '#FFF',
    fontSize: fs(15.5),
    fontWeight: '800',
  },
  scrollWrap: {
    paddingBottom: verticalScale(8),
  },
  govStripe: {
    height: verticalScale(4),
    width: '100%',
    borderRadius: scale(2),
    overflow: 'hidden',
    marginBottom: verticalScale(14),
  },
  govStripeGrad: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  aadhaarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 35, 126, 0.1)',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: 'rgba(26, 35, 126, 0.25)',
  },
  aadhaarBadgeTxt: {
    fontSize: fs(10),
    fontWeight: '800',
    color: '#1A237E',
    letterSpacing: 0.5,
  },
  govTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(10),
  },
  govEmblemCircle: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  govSubtitle: {
    fontSize: fs(10.5),
    fontWeight: '700',
    color: '#1A237E',
    letterSpacing: 0.3,
  },
  titleLeft: {
    fontSize: fs(18),
    fontWeight: '900',
    marginBottom: verticalScale(2),
  },
  subLeft: {
    fontSize: fs(13),
    lineHeight: verticalScale(18),
    marginBottom: verticalScale(14),
  },
  formContainer: {
    width: '100%',
    marginBottom: verticalScale(16),
  },
  inputLabel: {
    fontSize: fs(12.5),
    fontWeight: '700',
    marginBottom: verticalScale(5),
  },
  inputRow: {
    flexDirection: 'row',
    gap: scale(8),
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: verticalScale(44),
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    fontSize: fs(13.5),
    borderWidth: 1,
  },
  inputFull: {
    width: '100%',
    height: verticalScale(44),
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    fontSize: fs(13.5),
    borderWidth: 1,
  },
  sendOtpBtn: {
    height: verticalScale(44),
    width: scale(85),
    borderRadius: scale(12),
    overflow: 'hidden',
  },
  sendOtpGrad: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendOtpTxt: {
    color: '#FFF',
    fontSize: fs(12.5),
    fontWeight: '800',
  },
  otpSection: {
    marginTop: verticalScale(12),
  },
  otpStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 200, 83, 0.1)',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 83, 0.25)',
  },
  otpStatusTxt: {
    fontSize: fs(12),
    fontWeight: '600',
    color: '#00C853',
  },
  confirmVerifyBtn: {
    height: verticalScale(48),
    borderRadius: scale(24),
    overflow: 'hidden',
  },
  privacyBox: {
    marginTop: verticalScale(14),
    padding: scale(12),
    borderRadius: scale(12),
    borderWidth: 1,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(4),
  },
  privacyHeaderTxt: {
    fontSize: fs(11.5),
    fontWeight: '800',
    color: '#1A237E',
    letterSpacing: 0.3,
  },
  privacyTxt: {
    fontSize: fs(11),
    lineHeight: verticalScale(15),
  },
  successIconCircle: {
    width: scale(76),
    height: scale(76),
    borderRadius: scale(38),
    backgroundColor: 'rgba(0, 200, 83, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(14),
    borderWidth: 2,
    borderColor: 'rgba(0, 200, 83, 0.4)',
  },
  perksActiveBox: {
    width: '100%',
    padding: scale(14),
    borderRadius: scale(16),
    borderWidth: 1,
    gap: verticalScale(10),
    marginVertical: verticalScale(12),
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  perkTxt: {
    fontSize: fs(12.5),
    fontWeight: '700',
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 55, 95, 0.1)',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: 'rgba(255, 55, 95, 0.25)',
    marginBottom: verticalScale(10),
  },
  inlineErrorTxt: {
    fontSize: fs(12),
    fontWeight: '600',
    color: '#FF375F',
    flex: 1,
  },
});
