// src/components/PaymentGatewayModal.jsx — Interactive Payment Gateway Checkout Modal with Discount Display
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ActivityIndicator, Dimensions, ScrollView, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { apiSubscribePlan } from '../services/api';

const { width } = Dimensions.get('window');

const PAYMENT_METHODS = [
  { id: 'upi', name: 'UPI (GPay / PhonePe / Paytm)', icon: 'qr-code-outline', badge: 'FASTEST' },
  { id: 'card', name: 'Credit / Debit Card', icon: 'card-outline', badge: 'SECURE' },
  { id: 'netbanking', name: 'Net Banking', icon: 'business-outline', badge: 'ALL BANKS' },
];

export default function PaymentGatewayModal({
  visible,
  plan,
  durationId = '6m',
  customPrice = null,
  originalPrice = null,
  onClose,
  onPaymentSuccess,
}) {
  const { theme, isDark } = useTheme();
  const { user, updateUser } = useAuth();

  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedMethod('upi');
      setProcessing(false);
      setCompleted(false);
    }
  }, [visible]);

  if (!visible || !plan) return null;

  // Determine duration object
  const durations = plan.durations || [
    { id: '1m', label: '1 Month', total: '₹117' },
    { id: '6m', label: '6 Months', total: '₹600' },
    { id: '12m', label: '1 Year', total: '₹864' },
  ];
  const durObj = durations.find(d => d.id === durationId) || durations[1] || durations[0];

  const finalPrice = customPrice || durObj.total || '₹94';
  const showOriginalPrice = originalPrice || (customPrice ? '₹117' : null);

  const handleProcessPayment = async () => {
    setProcessing(true);
    try {
      const planName = plan.name || 'HeartLink Basic';

      const subscriptionPayload = {
        plan_id: plan.id,
        duration: durObj.label,
        plan_name: planName,
        price: finalPrice,
      };
      const res = await apiSubscribePlan(subscriptionPayload);

      const subInfo = res?.user?.active_subscription || res?.subscription || {
        plan_name: planName,
        expires_at: res?.subscription?.expires_at || null,
      };

      const updatedUser = {
        ...(res?.user || {}),
        subscription_plan: planName,
        active_subscription: subInfo,
        activeSubscription: subInfo,
        plan: planName,
      };
      updateUser(updatedUser);
      setCompleted(true);
      if (onPaymentSuccess) onPaymentSuccess(updatedUser);
      if (onClose) onClose();
    } catch (err) {
      console.warn('Subscription activation error:', err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal visible={visible} transparent statusBarTranslucent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <View style={[
          styles.card,
          {
            backgroundColor: isDark ? '#1C1433' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)',
          }
        ]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollWrap}>

            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.badgeCapsule}>
                <Ionicons name="shield-checkmark" size={14} color="#FF007F" style={{ marginRight: 5 }} />
                <Text style={styles.badgeTxt}>HEARTLINK PAYMENTS</Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={26} color={theme.textSec} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.title, { color: theme.textPrimary }]}>Checkout & Upgrade 💳</Text>
            <Text style={[styles.sub, { color: theme.textSec }]}>Select payment method to complete subscription.</Text>

            {/* Plan Summary Banner with Original Price Strikethrough & Highlighted Offer Price */}
            <LinearGradient
              colors={plan.gradient || ['#FF007F', '#B5179E']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.summaryBanner}
            >
              <View style={styles.summaryRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planNameTxt}>{plan.name}</Text>
                  <Text style={styles.planDurTxt}>{durObj.label || 'Subscription'}</Text>
                  {!!showOriginalPrice && (
                    <View style={styles.offerBadgeTag}>
                      <Ionicons name="flame" size={12} color="#FFD700" style={{ marginRight: 4 }} />
                      <Text style={styles.offerBadgeTxt}>20% WELCOME OFFER</Text>
                    </View>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {!!showOriginalPrice && (
                    <Text style={styles.originalCutPriceTxt}>{showOriginalPrice}</Text>
                  )}
                  <Text style={styles.planPriceTxt}>{finalPrice}</Text>
                  <Text style={styles.planTaxTxt}>Incl. all taxes</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Payment Method Selector */}
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Select Payment Method</Text>

            <View style={styles.methodsList}>
              {PAYMENT_METHODS.map((m) => {
                const isSelected = selectedMethod === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.methodRow,
                      {
                        borderColor: isSelected ? '#FF007F' : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'),
                        backgroundColor: isSelected ? 'rgba(255, 0, 127, 0.08)' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
                      }
                    ]}
                    onPress={() => setSelectedMethod(m.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.methodLeft}>
                      <View style={[styles.radioCircle, isSelected && styles.radioSelected]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <Ionicons name={m.icon} size={20} color={isSelected ? '#FF007F' : theme.textPrimary} style={{ marginRight: 10 }} />
                      <Text style={[styles.methodTxt, { color: theme.textPrimary, fontWeight: isSelected ? '800' : '600' }]}>{m.name}</Text>
                    </View>
                    <View style={styles.methodBadge}>
                      <Text style={styles.methodBadgeTxt}>{m.badge}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Pay Button */}
            <TouchableOpacity
              style={styles.payBtn}
              onPress={handleProcessPayment}
              disabled={processing || completed}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#FF007F', '#B5179E']} style={styles.payBtnGrad}>
                {processing ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 10 }} />
                    <Text style={styles.payBtnTxt}>Processing Payment...</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={18} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.payBtnTxt}>Pay {finalPrice} & Activate Plan</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.securityFooter}>
              <Ionicons name="shield-checkmark-outline" size={14} color={theme.textFaint} style={{ marginRight: 5 }} />
              <Text style={[styles.securityTxt, { color: theme.textFaint }]}>256-Bit Encrypted Secure Payment Gateway</Text>
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
    backgroundColor: 'rgba(5, 2, 12, 0.85)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  card: {
    width: '100%',
    maxHeight: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  scrollWrap: {
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 127, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF007F',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    marginBottom: 16,
  },

  // Summary Banner
  summaryBanner: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 22,
    elevation: 6,
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planNameTxt: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  planDurTxt: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  offerBadgeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  offerBadgeTxt: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 0.4,
  },
  originalCutPriceTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.65)',
    textDecorationLine: 'line-through',
    marginBottom: -2,
  },
  planPriceTxt: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  planTaxTxt: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.75)',
  },

  // Payment Methods
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  methodsList: {
    gap: 10,
    marginBottom: 20,
  },
  methodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(255, 0, 127, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioSelected: {
    borderColor: '#FF007F',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF007F',
  },
  methodTxt: {
    fontSize: 13.5,
  },
  methodBadge: {
    backgroundColor: 'rgba(255, 0, 127, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  methodBadgeTxt: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FF007F',
  },

  // Pay Button
  payBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 8,
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  payBtnGrad: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  payBtnTxt: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  securityFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityTxt: {
    fontSize: 11.5,
  },
});
