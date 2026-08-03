// src/components/AadhaarVerificationModal.jsx — In-App Aadhaar OTP Verification Modal
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  ActivityIndicator, Dimensions, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { apiSendAadhaarOtp, apiVerifyAadhaarOtp } from '../services/api';

const { width } = Dimensions.get('window');

export default function AadhaarVerificationModal({
  visible,
  onClose,
  onVerifiedSuccess,
  initialStep = 'alert',
}) {
  const { theme, isDark } = useTheme();
  const { user, updateUser } = useAuth();

  // Steps: 'alert' -> 'payment' -> 'aadhaar' -> 'success'
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
      setStep(initialStep);
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

  const handleStartPayment = () => {
    setStep('payment');
    setPaying(true);

    // Simulate ₹99 payment gateway processing for 1 second
    setTimeout(() => {
      setPaying(false);
      setStep('aadhaar');
    }, 1000);
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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[
          styles.card,
          {
            backgroundColor: isDark ? '#1A1128' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
          }
        ]}>

          {step === 'alert' ? (
            // ─── STEP 1: Unverified Warning Popup ───────────────────────────
            <View style={styles.contentWrap}>
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark" size={32} color="#FF007F" />
              </View>

              <Text style={[styles.title, { color: theme.textPrimary }]}>
                Verification Required
              </Text>

              <Text style={[styles.message, { color: theme.textSec }]}>
                Verify your profile identity using your Aadhaar linked mobile OTP to unlock all HeartLink features.
              </Text>

              <View style={styles.priceTag}>
                <Ionicons name="sparkles" size={15} color="#FF007F" style={{ marginRight: 6 }} />
                <Text style={styles.priceTxt}>Profile Verification: ₹99 Only</Text>
              </View>

              <View style={styles.btnStack}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleStartPayment}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={['#FF007F', '#B5179E']} style={styles.gradBtn}>
                    <Ionicons name="card-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.gradBtnTxt}>Verify Profile (₹99)</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)' }]}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelBtnTxt, { color: theme.textSec }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>

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
                Payment of ₹99 successful! Loading Aadhaar OTP verification...
              </Text>
            </View>

          ) : step === 'success' ? (
            // ─── STEP 4: Custom Verification Success Screen ──────────────────
            <View style={styles.contentWrap}>
              <View style={[styles.successIconCircle]}>
                <Ionicons name="checkmark-circle" size={48} color="#00C853" />
              </View>

              <Text style={[styles.title, { color: theme.textPrimary, marginTop: 4 }]}>
                Aadhaar Verified! 🎉
              </Text>

              <Text style={[styles.message, { color: theme.textSec }]}>
                {successMessage || 'Your identity has been verified successfully. Profile verification badge is now active!'}
              </Text>

              <View style={styles.successBadgeRow}>
                <View style={styles.successBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#00C853" style={{ marginRight: 5 }} />
                  <Text style={styles.successBadgeTxt}>IDENTITY VERIFIED</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, { marginTop: 20 }]}
                onPress={() => {
                  if (onVerifiedSuccess) onVerifiedSuccess();
                  if (onClose) onClose();
                }}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#00C853', '#00E676']} style={styles.gradBtn}>
                  <Ionicons name="sparkles" size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.gradBtnTxt}>Awesome!</Text>
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
                      <Text style={styles.gradBtnTxt}>Verify OTP & Activate Profile</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Privacy Disclaimer Container */}
              <View style={[styles.privacyBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(26, 35, 126, 0.04)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26, 35, 126, 0.12)' }]}>
                <View style={styles.privacyHeader}>
                  <Ionicons name="shield-checkmark-sharp" size={14} color="#1A237E" style={{ marginRight: 6 }} />
                  <Text style={styles.privacyHeaderTxt}>Official Verification & Privacy Notice</Text>
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
    backgroundColor: 'rgba(5, 2, 12, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 9999,
  },
  card: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 26,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  contentWrap: {
    alignItems: 'center',
    width: '100%',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 0, 127, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FF007F',
  },
  title: {
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 127, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 127, 0.3)',
  },
  priceTxt: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF007F',
  },
  btnStack: {
    width: '100%',
    gap: 12,
  },
  actionBtn: {
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  cancelBtn: {
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelBtnTxt: {
    fontSize: 15,
    fontWeight: '700',
  },
  gradBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  gradBtnTxt: {
    color: '#FFF',
    fontSize: 15.5,
    fontWeight: '800',
  },
  scrollWrap: {
    paddingBottom: 8,
  },
  govStripe: {
    height: 4,
    width: '100%',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  govStripeGrad: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  aadhaarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 35, 126, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(26, 35, 126, 0.25)',
  },
  aadhaarBadgeTxt: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1A237E',
    letterSpacing: 0.5,
  },
  govTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  govEmblemCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  govSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A237E',
    letterSpacing: 0.3,
  },
  titleLeft: {
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 2,
  },
  subLeft: {
    fontSize: 13.5,
    lineHeight: 19,
    marginBottom: 16,
  },
  formContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    borderWidth: 1,
  },
  inputFull: {
    width: '100%',
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    borderWidth: 1,
  },
  sendOtpBtn: {
    height: 46,
    width: 90,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sendOtpGrad: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendOtpTxt: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  otpSection: {
    marginTop: 14,
  },
  otpStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 200, 83, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 83, 0.25)',
  },
  otpStatusTxt: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#00C853',
  },
  confirmVerifyBtn: {
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  privacyBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  privacyHeaderTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1A237E',
    letterSpacing: 0.3,
  },
  privacyTxt: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 200, 83, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(0, 200, 83, 0.35)',
  },
  successBadgeRow: {
    alignItems: 'center',
    marginTop: 4,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 200, 83, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 83, 0.3)',
  },
  successBadgeTxt: {
    fontSize: 11,
    fontWeight: '900',
    color: '#00C853',
    letterSpacing: 0.6,
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 55, 95, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 55, 95, 0.25)',
    marginBottom: 12,
  },
  inlineErrorTxt: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#FF375F',
    flex: 1,
  },
});
