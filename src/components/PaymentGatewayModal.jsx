// src/components/PaymentGatewayModal.jsx — Simple plan details & payment
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ActivityIndicator, Dimensions, ScrollView, StatusBar,
  Alert, Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { 
  apiSubscribePlan, 
  apiCreateRazorpayOrder, 
  apiVerifyRazorpayPayment 
} from '../services/api';
import RazorpayCheckout from 'react-native-razorpay';

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
  const { theme, isDark } = useTheme();
  const { user, updateUser } = useAuth();

  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [razorpayKey, setRazorpayKey] = useState(null);

  useEffect(() => {
    if (visible) {
      setProcessing(false);
      setCompleted(false);
      setOrderId(null);
      setRazorpayKey(null);
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
  const showOriginalPrice = originalPrice || (customPrice ? durObj.total : null);

  // Extract numeric value from price string (returns amount in rupees)
  const getNumericAmountInRupees = (priceStr) => {
    const numStr = priceStr.replace(/[^0-9]/g, '');
    return parseInt(numStr, 10);
  };

  const handleRazorpayPayment = async () => {
    setProcessing(true);
    try {
      const planName = plan.name || 'HeartLink Basic';
      const amountInRupees = getNumericAmountInRupees(finalPrice);
      
      console.log('[Payment] Final price:', finalPrice);
      console.log('[Payment] Amount in rupees:', amountInRupees);
      
      if (isNaN(amountInRupees) || amountInRupees <= 0) {
        Alert.alert('Error', 'Invalid payment amount');
        setProcessing(false);
        return;
      }

      // Step 1: Create order on backend - Send amount in RUPEES
      const orderData = {
        amount: amountInRupees,
        currency: 'INR',
        planId: plan.id,
        planName: planName,
        durationId: durationId,
        durationLabel: durObj.label,
        userId: user?.id,
        userEmail: user?.email,
        userPhone: user?.phone,
        userName: user?.name,
        customPrice: customPrice,
        originalPrice: originalPrice,
        isOfferApplied: !!customPrice
      };

      console.log('[Payment] Creating order with data:', orderData);

      const orderResponse = await apiCreateRazorpayOrder(orderData);

      console.log('[Payment] Order response:', orderResponse);

      const responseOrderId = orderResponse?.orderId || orderResponse?.order_id;
      
      if (!responseOrderId) {
        console.error('[Payment] No orderId in response:', orderResponse);
        throw new Error('No order ID received from server');
      }

      setOrderId(responseOrderId);
      const razorpayKeyId = orderResponse?.key_id || 'YOUR_RAZORPAY_KEY_ID';
      setRazorpayKey(razorpayKeyId);

      // Check if backend provides a checkout URL
      if (orderResponse?.checkout_url) {
        console.log('[Payment] Using server-side checkout URL');
        Alert.alert(
          'Redirecting to Payment',
          'You will be redirected to the secure payment page.',
          [
            {
              text: 'Continue',
              onPress: () => {
                Linking.openURL(orderResponse.checkout_url).catch(() => {
                  Alert.alert('Error', 'Unable to open payment page');
                });
                setProcessing(false);
              }
            },
            {
              text: 'Cancel',
              onPress: () => setProcessing(false)
            }
          ]
        );
        return;
      }

      // Step 2: Open Razorpay Checkout
      const razorpayOptions = {
        description: `${planName} - ${durObj.label} Plan`,
        image: 'https://heartlink.app/logo.png',
        currency: 'INR',
        key: razorpayKeyId,
        amount: amountInRupees * 100,
        name: 'HeartLink',
        order_id: responseOrderId,
        prefill: {
          email: user?.email || '',
          contact: user?.phone || '',
          name: user?.name || '',
        },
        theme: {
          color: '#FF007F',
        },
        modal: {
          backdrop: true,
        }
      };

      console.log('[Payment] Opening Razorpay with amount:', amountInRupees * 100, 'paise (₹' + amountInRupees + ')');

      RazorpayCheckout.open(razorpayOptions)
        .then(async (data) => {
          console.log('[Payment] Razorpay success:', data);
          
          try {
            const verificationData = {
              orderId: responseOrderId,
              paymentId: data.razorpay_payment_id,
              signature: data.razorpay_signature,
              planId: plan.id,
              durationId: durationId,
              userId: user?.id
            };

            console.log('[Payment] Verifying payment:', verificationData);

            const verificationResponse = await apiVerifyRazorpayPayment(verificationData);

            console.log('[Payment] Verification response:', verificationResponse);

            if (verificationResponse?.success) {
              const subscriptionPayload = {
                plan_id: plan.id,
                duration: durObj.label,
                plan_name: planName,
                price: finalPrice,
                payment_id: data.razorpay_payment_id,
                order_id: responseOrderId,
              };

              console.log('[Payment] Activating subscription:', subscriptionPayload);

              const subscribeResponse = await apiSubscribePlan(subscriptionPayload);

              console.log('[Payment] Subscription response:', subscribeResponse);

              const subInfo = subscribeResponse?.user?.active_subscription || 
                             subscribeResponse?.subscription || {
                plan_name: planName,
                expires_at: subscribeResponse?.subscription?.expires_at || null,
              };

              const updatedUser = {
                ...(subscribeResponse?.user || {}),
                subscription_plan: planName,
                active_subscription: subInfo,
                activeSubscription: subInfo,
                plan: planName,
              };
              
              updateUser(updatedUser);
              setCompleted(true);
              
              Alert.alert(
                'Payment Successful! 🎉',
                `Your ${planName} subscription has been activated successfully!`,
                [
                  {
                    text: 'Continue',
                    onPress: () => {
                      if (onPaymentSuccess) onPaymentSuccess(updatedUser);
                      if (onClose) onClose();
                    }
                  }
                ]
              );
            } else {
              Alert.alert(
                'Payment Verification Failed',
                'Your payment was received but verification failed. Please contact support.',
                [{ text: 'OK' }]
              );
            }
          } catch (verifyError) {
            console.error('[Payment] Verification error:', verifyError);
            Alert.alert(
              'Verification Error',
              `Payment verification failed: ${verifyError.message || 'Unknown error'}`,
              [{ text: 'OK' }]
            );
          } finally {
            setProcessing(false);
          }
        })
        .catch((error) => {
          console.log('[Payment] Razorpay error:', error);
          if (error.code === 'PAYMENT_CANCELED') {
            Alert.alert('Payment Cancelled', 'You cancelled the payment process.');
          } else {
            Alert.alert(
              'Payment Failed',
              error.description || error.message || 'An error occurred during payment processing.'
            );
          }
          setProcessing(false);
        });

    } catch (error) {
      console.error('[Payment] Initiation error:', error);
      console.error('[Payment] Error stack:', error.stack);
      
      let errorMessage = 'Failed to initiate payment. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Payment Error', errorMessage);
      setProcessing(false);
    }
  };

  return (
    <Modal visible={visible} transparent statusBarTranslucent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <TouchableOpacity 
          style={styles.backdropTouch} 
          activeOpacity={1} 
          onPress={onClose}
        >
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
                  <Text style={styles.badgeTxt}>SECURE PAYMENT</Text>
                </View>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={26} color={theme.textSec} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.title, { color: theme.textPrimary }]}>Complete Your Purchase</Text>

              {/* Plan Summary Card */}
              <LinearGradient
                colors={plan.gradient || ['#FF007F', '#B5179E']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.summaryCard}
              >
                <View style={styles.planIconContainer}>
                  <Ionicons name="heart" size={32} color="#FFF" />
                </View>
                
                <Text style={styles.planNameTxt}>{plan.name}</Text>
                <Text style={styles.planDurTxt}>{durObj.label || 'Subscription'}</Text>
                
                <View style={styles.priceContainer}>
                  {!!showOriginalPrice && (
                    <Text style={styles.originalCutPriceTxt}>{showOriginalPrice}</Text>
                  )}
                  <Text style={styles.planPriceTxt}>{finalPrice}</Text>
                </View>
                
                {!!showOriginalPrice && (
                  <View style={styles.offerBadgeTag}>
                    <Ionicons name="flame" size={14} color="#FFD700" style={{ marginRight: 6 }} />
                    <Text style={styles.offerBadgeTxt}>20% WELCOME OFFER</Text>
                  </View>
                )}
                
                <Text style={styles.planTaxTxt}>✓ Inclusive of all taxes</Text>
              </LinearGradient>

              {/* Features/Benefits */}
              <View style={styles.featuresContainer}>
               
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                  <Text style={[styles.featureText, { color: theme.textPrimary }]}>Secure payment via Razorpay</Text>
                </View>
              </View>

              {/* Pay Button */}
              <TouchableOpacity
                style={styles.payBtn}
                onPress={handleRazorpayPayment}
                disabled={processing || completed}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#FF007F', '#B5179E']} style={styles.payBtnGrad}>
                  {processing ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 10 }} />
                      <Text style={styles.payBtnTxt}>Processing Payment...</Text>
                    </View>
                  ) : completed ? (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={styles.payBtnTxt}>Payment Completed</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="lock-closed" size={20} color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={styles.payBtnTxt}>Pay {finalPrice}</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Security Footer */}
              <View style={styles.securityFooter}>
                <Ionicons name="shield-checkmark-outline" size={14} color={theme.textFaint} style={{ marginRight: 5 }} />
                <Text style={[styles.securityTxt, { color: theme.textFaint }]}>256-Bit Encrypted Secure Payment</Text>
              </View>

              <View style={styles.razorpayFooter}>
                <Text style={[styles.razorpayText, { color: theme.textFaint }]}>🔒 Powered by</Text>
                <Text style={styles.razorpayBrand}>Razorpay</Text>
              </View>

            </ScrollView>
          </View>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 2, 12, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  backdropTouch: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '90%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 127, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
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
    marginBottom: 20,
    textAlign: 'center',
  },
  summaryCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    marginBottom: 20,
  },
  planIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  planNameTxt: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  planDurTxt: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 12,
    textAlign: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  originalCutPriceTxt: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textDecorationLine: 'line-through',
  },
  planPriceTxt: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  offerBadgeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 8,
  },
  offerBadgeTxt: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 0.5,
  },
  planTaxTxt: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  featuresContainer: {
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '500',
  },
  payBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 8,
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  payBtnGrad: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  payBtnTxt: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  securityFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  securityTxt: {
    fontSize: 11.5,
  },
  razorpayFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  razorpayText: {
    fontSize: 11,
  },
  razorpayBrand: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF007F',
  },
});