// src/components/PaymentGatewayModal.jsx — Payment Gateway Under Construction Warning Modal
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Dimensions, ScrollView, StatusBar, Platform, Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { navigate } from '../navigation/navigationRef';
import { apiNotifyPaymentAttempt } from '../services/api';

const { width } = Dimensions.get('window');

export default function PaymentGatewayModal({
  visible,
  plan,
  durationId = '6m',
  customPrice = null,
  originalPrice = null,
  onClose,
  onPaymentSuccess,
}) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const notifiedRef = useRef(false);
  const [supportNotified, setSupportNotified] = useState(false);

  // Determine duration object
  const durations = plan?.durations || [
    { id: '1m', label: '1 Month', total: '₹117' },
    { id: '6m', label: '6 Months', total: '₹600' },
    { id: '12m', label: '1 Year', total: '₹864' },
  ];
  const durObj = durations.find(d => d.id === durationId) || durations[1] || durations[0];
  const finalPrice = customPrice || durObj?.total || '₹94';
  const planName = plan?.name || 'HeartLink Premium';
  const isSuperlike = (planName || '').toLowerCase().includes('superlike') || (plan?.id || '').toLowerCase().includes('superlike');

  useEffect(() => {
    if (visible && plan) {
      if (!notifiedRef.current) {
        notifiedRef.current = true;
        apiNotifyPaymentAttempt({
          plan_name: planName,
          price: finalPrice,
          duration: durObj?.label || '',
          item_type: isSuperlike ? 'superlikes' : 'membership',
        })
          .then(() => setSupportNotified(true))
          .catch(() => {});
      }
    } else {
      notifiedRef.current = false;
      setSupportNotified(false);
    }
  }, [visible, plan, planName, finalPrice, durObj?.label, isSuperlike]);

  if (!visible || !plan) return null;

  const handleContactSupport = () => {
    if (onClose) onClose();
    try {
      navigate('SupportChat');
    } catch (e) {
      Linking.openURL('mailto:support@heartlink.app?subject=Payment%20Gateway%20Query');
    }
  };

  const cardBg = isDark ? '#150E28' : '#FFFFFF';
  const innerSectionBg = isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <Modal visible={visible} transparent statusBarTranslucent={true} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

        {/* Backdrop touchable overlay to dismiss modal */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          {/* Top Decorative Gradient Ambient Bar */}
          <View style={styles.topBarGradWrapper}>
            <LinearGradient
              colors={['#FF9500', '#FF2D55', '#7000FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.topBarGrad}
            />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollWrap}
            style={styles.modalScrollView}
            bounces={true}
          >
            {/* Header Close Row */}
            <View style={styles.headerRow}>
              <View style={styles.badgeCapsule}>
                <LinearGradient
                  colors={['rgba(255, 149, 0, 0.18)', 'rgba(255, 45, 85, 0.18)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.pillGrad}
                >
                  <Ionicons name="construct" size={12} color="#FF9500" style={{ marginRight: 5 }} />
                  <Text style={styles.badgeTxt}>PAYMENT SYSTEM UNDER MAINTENANCE</Text>
                </LinearGradient>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close-circle" size={26} color={theme.textSec} />
              </TouchableOpacity>
            </View>

            {/* Central Construction Hero Graphic */}
            <View style={styles.heroIconWrapper}>
              <View style={styles.heroOuterGlow}>
                <LinearGradient
                  colors={['#FF9500', '#FF3B30', '#FF2D55']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroIconCircle}
                >
                  <Ionicons name="construct-outline" size={42} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <View style={styles.sparkleBadge}>
                <MaterialCommunityIcons name="shield-alert-outline" size={14} color="#FFD700" />
              </View>
            </View>

            {/* Title & Headline */}
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              Payment Gateway Under Construction 🚧
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSec }]}>
              We are currently upgrading our banking gateway to provide faster 1-click UPI, Cards, and NetBanking payments. Paid checkout is temporarily paused.
            </Text>

            {/* Item Details Box */}
            <View style={[styles.itemSummaryCard, { backgroundColor: innerSectionBg, borderColor }]}>
              <View style={styles.itemIconCircle}>
                <LinearGradient
                  colors={plan.gradient || ['#FF007F', '#B5179E']}
                  style={StyleSheet.absoluteFill}
                  borderRadius={18}
                />
                <Ionicons name={isSuperlike ? 'flash' : 'heart'} size={18} color="#FFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.itemTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                  {planName}
                </Text>
                <Text style={[styles.itemSub, { color: theme.textSec }]}>
                  {durObj.label || 'Standard Subscription'} • {finalPrice}
                </Text>
              </View>
              <View style={styles.pausedBadge}>
                <Text style={styles.pausedBadgeTxt}>₹0 CHARGED</Text>
              </View>
            </View>

            {/* Reassurance Feature Highlights */}
            <View style={styles.reassuranceSection}>
              {/* Highlight 1: No Money Deducted */}
              <View style={[styles.reassuranceCard, { backgroundColor: isDark ? 'rgba(0,200,83,0.06)' : 'rgba(0,200,83,0.04)', borderColor: isDark ? 'rgba(0,200,83,0.2)' : 'rgba(0,200,83,0.18)' }]}>
                <LinearGradient colors={['#00C853', '#00E676']} style={styles.reassuranceIconBox}>
                  <Ionicons name="shield-checkmark" size={18} color="#FFF" />
                </LinearGradient>
                <View style={styles.reassuranceTextWrap}>
                  <Text style={[styles.reassuranceTitle, { color: theme.textPrimary }]}>Zero Bank Deduction</Text>
                  <Text style={[styles.reassuranceDesc, { color: theme.textSec }]}>
                    No charges or debits have been made to your bank account, card, or UPI app.
                  </Text>
                </View>
              </View>

              {/* Highlight 2: 100% Free Core App */}
              <View style={[styles.reassuranceCard, { backgroundColor: isDark ? 'rgba(0,114,227,0.06)' : 'rgba(0,114,227,0.04)', borderColor: isDark ? 'rgba(0,114,227,0.2)' : 'rgba(0,114,227,0.18)' }]}>
                <LinearGradient colors={['#0072E3', '#3897F0']} style={styles.reassuranceIconBox}>
                  <Ionicons name="heart" size={18} color="#FFF" />
                </LinearGradient>
                <View style={styles.reassuranceTextWrap}>
                  <Text style={[styles.reassuranceTitle, { color: theme.textPrimary }]}>HeartLink is 100% Free to Use</Text>
                  <Text style={[styles.reassuranceDesc, { color: theme.textSec }]}>
                    Matching, chatting, swiping, and Aadhaar identity verification are completely free!
                  </Text>
                </View>
              </View>

              {/* Highlight 3: Launching Soon */}
              <View style={[styles.reassuranceCard, { backgroundColor: isDark ? 'rgba(255,149,0,0.06)' : 'rgba(255,149,0,0.04)', borderColor: isDark ? 'rgba(255,149,0,0.2)' : 'rgba(255,149,0,0.18)' }]}>
                <LinearGradient colors={['#FF9500', '#FF2D55']} style={styles.reassuranceIconBox}>
                  <Ionicons name="flash" size={18} color="#FFF" />
                </LinearGradient>
                <View style={styles.reassuranceTextWrap}>
                  <Text style={[styles.reassuranceTitle, { color: theme.textPrimary }]}>Gateway Launching Soon</Text>
                  <Text style={[styles.reassuranceDesc, { color: theme.textSec }]}>
                    Direct UPI (Google Pay, PhonePe, Paytm), Cards, and NetBanking will be live shortly.
                  </Text>
                </View>
              </View>
            </View>

            {/* Automatic Support Notification Status Badge */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isDark ? 'rgba(0, 114, 227, 0.12)' : 'rgba(0, 114, 227, 0.08)',
              borderColor: isDark ? 'rgba(0, 114, 227, 0.25)' : 'rgba(0, 114, 227, 0.2)',
              borderWidth: 1,
              borderRadius: 12,
              paddingVertical: 8,
              paddingHorizontal: 12,
              marginBottom: 16,
            }}>
              <Ionicons name="chatbubbles" size={16} color="#0072E3" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 11.5, color: isDark ? '#93C5FD' : '#1D4ED8', flex: 1, fontWeight: '600', lineHeight: 16 }}>
                {supportNotified
                  ? "✓ Automatic inquiry sent to HeartLink Support from your chat. Our team is notified!"
                  : "Connecting with HeartLink Support from your chat..."}
              </Text>
            </View>

            {/* Action CTA Buttons */}
            <View style={styles.btnStack}>
              <TouchableOpacity
                style={styles.primaryCtaBtn}
                onPress={onClose}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={['#FF9500', '#FF5E3A', '#FF2A6D']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradCtaBtn}
                >
                  <Ionicons name="checkmark-circle" size={19} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.gradCtaBtnTxt}>Understood • Continue with Free Features</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)' }]}
                onPress={handleContactSupport}
                activeOpacity={0.7}
              >
                <Ionicons name="chatbubbles-outline" size={16} color={theme.textSec} style={{ marginRight: 6 }} />
                <Text style={[styles.secondaryBtnTxt, { color: theme.textSec }]}>View in HeartLink Support Chat 💬</Text>
              </TouchableOpacity>
            </View>

            {/* Footer Trust Note */}
            <View style={styles.securityFooter}>
              <Ionicons name="lock-closed-outline" size={12} color={theme.textFaint} style={{ marginRight: 4 }} />
              <Text style={[styles.securityFooterTxt, { color: theme.textFaint }]}>
                PCI-DSS Level 1 & RBI Compliant Banking System • 100% Safe
              </Text>
            </View>
          </ScrollView>
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
    zIndex: 9999,
  },
  card: {
    width: '92%',
    maxWidth: 440,
    maxHeight: '90%',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 24,
    zIndex: 10,
    overflow: 'hidden',
  },
  topBarGradWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  topBarGrad: {
    flex: 1,
  },
  modalScrollView: {
    flexShrink: 1,
    width: '100%',
  },
  scrollWrap: {
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeCapsule: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  pillGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
  },
  badgeTxt: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FF9500',
    letterSpacing: 0.6,
  },

  // Central Hero Graphic
  heroIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 14,
    position: 'relative',
  },
  heroOuterGlow: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  heroIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleBadge: {
    position: 'absolute',
    top: 2,
    right: width * 0.33 > 140 ? 130 : width * 0.31,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1C1236',
    borderWidth: 2,
    borderColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 21,
    fontWeight: '900',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18.5,
    textAlign: 'center',
    marginBottom: 18,
    paddingHorizontal: 6,
  },

  // Item Summary Card
  itemSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  itemIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  itemSub: {
    fontSize: 11.5,
    marginTop: 1,
    fontWeight: '500',
  },
  pausedBadge: {
    backgroundColor: 'rgba(0, 200, 83, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 83, 0.3)',
  },
  pausedBadgeTxt: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#00C853',
    letterSpacing: 0.4,
  },

  // Reassurance Section
  reassuranceSection: {
    marginBottom: 20,
    gap: 10,
  },
  reassuranceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  reassuranceIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reassuranceTextWrap: {
    flex: 1,
  },
  reassuranceTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  reassuranceDesc: {
    fontSize: 11.5,
    lineHeight: 16,
  },

  // Buttons
  btnStack: {
    gap: 10,
    marginBottom: 12,
  },
  primaryCtaBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  gradCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  gradCtaBtnTxt: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  secondaryBtnTxt: {
    fontSize: 12.5,
    fontWeight: '700',
  },

  // Security Footer
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  securityFooterTxt: {
    fontSize: 10,
    fontWeight: '600',
  },
});