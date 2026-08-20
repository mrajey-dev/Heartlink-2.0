// src/components/SuperlikeUpgradeModal.jsx — Superlikes Exhausted Upgrade & Top-Up Packs Modal
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import BlurView from './SafeBlurView';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale, verticalScale, fs } from '../utils/responsive';
import PaymentGatewayModal from './PaymentGatewayModal';

const SUPERLIKE_PACKS = [
  {
    id: '5_superlikes',
    count: 5,
    title: '5 Superlikes',
    price: '₹109',
    unitPrice: '₹21.8/each',
    badge: null,
    popular: false,
  },
  {
    id: '15_superlikes',
    count: 15,
    title: '15 Superlikes',
    price: '₹207',
    unitPrice: '₹13.8/each',
    badge: 'POPULAR',
    save: 'SAVE 27%',
    popular: true,
  },
  {
    id: '30_superlikes',
    count: 30,
    title: '30 Superlikes',
    price: '₹349',
    unitPrice: '₹11.6/each',
    badge: 'BEST VALUE',
    save: 'SAVE 43%',
    popular: false,
  },
];

export default function SuperlikeUpgradeModal({
  visible,
  onClose,
  onUpgrade,
  message,
}) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { updateUser } = useAuth();

  const [selectedPackId, setSelectedPackId] = useState('15_superlikes');
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  if (!visible) return null;

  const cardBg = isDark ? '#160E29' : '#FFFFFF';
  const selectedPack = SUPERLIKE_PACKS.find(p => p.id === selectedPackId) || SUPERLIKE_PACKS[1];

  const paymentPlanObj = {
    id: `superlike_${selectedPack.count}`,
    name: `${selectedPack.count} Superlikes Pack`,
    gradient: ['#FF007F', '#9D4EDD'],
    durations: [
      {
        id: selectedPack.id,
        label: `${selectedPack.count} Superlikes Instant Top-Up`,
        total: selectedPack.price,
        price: selectedPack.price,
      },
    ],
  };

  const handleBuySuperlikes = () => {
    setPaymentModalVisible(true);
  };

  const handlePaymentSuccess = (updatedUser) => {
    setPaymentModalVisible(false);
    if (updatedUser) {
      updateUser(updatedUser);
    }
    Alert.alert(
      'Superlikes Added! 🎉',
      `You have successfully purchased ${selectedPack.count} Superlikes! You can now send Superlikes instantly.`,
      [
        {
          text: 'Awesome!',
          onPress: () => {
            if (onClose) onClose();
          },
        },
      ]
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        statusBarTranslucent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View
          style={[
            styles.backdrop,
            {
              paddingTop: insets.top + verticalScale(12),
              paddingBottom: Math.max(insets.bottom + verticalScale(16), verticalScale(24)),
            },
          ]}
        >
          <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />

          <View style={styles.cardWrap}>
            {/* Top Overlapping Glowing Icon Badge */}
            <View style={[styles.topBadgeContainer, { borderColor: cardBg }]}>
              <LinearGradient
                colors={['#7B2CBF', '#9D4EDD', '#FF007F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.topBadgeGrad}
              >
                <Ionicons name="flash" size={scale(28)} color="#FFFFFF" />
              </LinearGradient>
            </View>

            {/* Close Button Top-Right */}
            <TouchableOpacity
              style={styles.closeIconBtn}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={[styles.closeIconBg, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)' }]}>
                <Ionicons name="close" size={scale(18)} color={isDark ? '#FFFFFF' : '#475569'} />
              </View>
            </TouchableOpacity>

            {/* Card Main Body */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: cardBg,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#F1F5F9',
                },
              ]}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                style={{ width: '100%' }}
              >
                {/* Status Pill Badge */}
                <View style={styles.statusPillWrap}>
                  <LinearGradient
                    colors={['rgba(255, 0, 127, 0.12)', 'rgba(123, 44, 191, 0.18)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.statusPillGrad}
                  >
                    <Ionicons name="flash-outline" size={scale(13)} color="#FF007F" style={{ marginRight: 4 }} />
                    <Text style={styles.statusPillTxt}>OUT OF SUPERLIKES</Text>
                  </LinearGradient>
                </View>

                {/* Title & Headline */}
                <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#1E1B2E' }]}>
                  Need More Superlikes?
                </Text>

                <Text style={[styles.subtitle, { color: isDark ? 'rgba(255, 255, 255, 0.72)' : '#64748B' }]}>
                  {message || "Buy a Superlike Pack to keep sending Superlikes instantly without waiting for monthly plan resets!"}
                </Text>

                {/* Superlike Packs Selection Grid */}
                <View style={styles.packsHeaderRow}>
                  <Text style={[styles.sectionLabel, { color: isDark ? 'rgba(255, 255, 255, 0.5)' : '#94A3B8' }]}>
                    SELECT SUPERLIKE TOP-UP PACK
                  </Text>
                </View>

                <View style={styles.packsContainer}>
                  {SUPERLIKE_PACKS.map((pack) => {
                    const isSelected = pack.id === selectedPackId;
                    return (
                      <TouchableOpacity
                        key={pack.id}
                        style={[
                          styles.packCard,
                          {
                            backgroundColor: isDark ? '#22173D' : '#FFFFFF',
                            borderColor: isSelected
                              ? '#FF007F'
                              : isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                          },
                          isSelected && styles.packCardSelected,
                        ]}
                        onPress={() => setSelectedPackId(pack.id)}
                        activeOpacity={0.8}
                      >
                        {isSelected && (
                          <LinearGradient
                            colors={['rgba(255, 0, 127, 0.04)', 'rgba(157, 78, 221, 0.04)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                          />
                        )}

                        {/* Top Badge Tag */}
                        {!!pack.badge && (
                          <View style={styles.packBadgeWrap}>
                            <LinearGradient
                              colors={['#FF007F', '#9D4EDD']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={styles.packBadgeGrad}
                            >
                              <Text style={styles.packBadgeTxt}>{pack.badge}</Text>
                            </LinearGradient>
                          </View>
                        )}

                        <View style={styles.packMainRow}>
                          <View style={styles.packLeftInfo}>
                            <View style={styles.packTitleRow}>
                              <Ionicons
                                name="flash"
                                size={scale(16)}
                                color={isSelected ? '#FF007F' : isDark ? '#E2E8F0' : '#475569'}
                                style={{ marginRight: scale(6) }}
                              />
                              <Text
                                style={[
                                  styles.packTitleTxt,
                                  { color: isDark ? '#FFFFFF' : '#1E1B2E' },
                                  isSelected && { fontWeight: '800', color: '#FF007F' },
                                ]}
                              >
                                {pack.title}
                              </Text>

                              {!!pack.save && (
                                <View style={styles.savePill}>
                                  <Text style={styles.savePillTxt}>{pack.save}</Text>
                                </View>
                              )}
                            </View>
                            <Text style={[styles.packSubTxt, { color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B' }]}>
                              {pack.unitPrice} • Instant delivery
                            </Text>
                          </View>

                          <View style={styles.packRightPrice}>
                            <Text style={[styles.priceTxt, { color: isDark ? '#FFFFFF' : '#1E1B2E' }]}>
                              {pack.price}
                            </Text>

                            <View
                              style={[
                                styles.radioCircle,
                                isSelected && styles.radioCircleActive,
                              ]}
                            >
                              {isSelected && <View style={styles.radioInnerDot} />}
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Benefits Feature Grid */}
                <View style={styles.featuresList}>
                  <View style={[styles.featureItem, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(123, 44, 191, 0.03)' }]}>
                    <LinearGradient colors={['#7B2CBF', '#9D4EDD']} style={styles.featureIconGrad}>
                      <Ionicons name="sparkles" size={scale(14)} color="#FFF" />
                    </LinearGradient>
                    <View style={styles.featureTextWrap}>
                      <Text style={[styles.featureTitle, { color: isDark ? '#FFF' : '#1E1B2E' }]}>3x Higher Match Rate</Text>
                      <Text style={[styles.featureDesc, { color: isDark ? 'rgba(255,255,255,0.6)' : '#64748B' }]}>Stand out at the top of their discovery stack</Text>
                    </View>
                  </View>
                </View>

                {/* Primary Action Button: Buy Superlikes Pack */}
                <TouchableOpacity
                  style={styles.buyBtnShadow}
                  onPress={handleBuySuperlikes}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#FF007F', '#B5179E', '#7B2CBF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buyBtnGrad}
                  >
                    <Ionicons name="flash" size={scale(18)} color="#FFF" style={{ marginRight: scale(8) }} />
                    <Text style={styles.buyBtnTxt}>
                      Buy {selectedPack.count} Superlikes — {selectedPack.price}
                    </Text>
                    <Ionicons name="chevron-forward" size={scale(18)} color="#FFF" style={{ marginLeft: scale(4) }} />
                  </LinearGradient>
                </TouchableOpacity>

                {/* Secondary Option: Full Membership Upgrade */}
                <TouchableOpacity
                  style={styles.upgradeLinkBtn}
                  onPress={() => {
                    if (onUpgrade) onUpgrade();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="star-outline" size={scale(14)} color="#FF007F" style={{ marginRight: 6 }} />
                  <Text style={styles.upgradeLinkTxt}>
                    Or View Full Membership Plans
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelBtnTxt, { color: isDark ? 'rgba(255, 255, 255, 0.5)' : '#64748B' }]}>
                    Maybe Later
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Embedded Razorpay Payment Modal for Superlike Pack */}
      <PaymentGatewayModal
        visible={paymentModalVisible}
        plan={paymentPlanObj}
        durationId={selectedPack.id}
        onClose={() => setPaymentModalVisible(false)}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 2, 12, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    zIndex: 9999,
  },
  cardWrap: {
    width: '94%',
    maxWidth: scale(380),
    maxHeight: '90%',
    position: 'relative',
    alignItems: 'center',
  },
  topBadgeContainer: {
    position: 'absolute',
    top: -verticalScale(28),
    zIndex: 25,
    width: scale(58),
    height: scale(58),
    borderRadius: scale(29),
    borderWidth: scale(3.5),
    elevation: 14,
    shadowColor: '#9D4EDD',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  topBadgeGrad: {
    flex: 1,
    borderRadius: scale(26),
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIconBtn: {
    position: 'absolute',
    top: verticalScale(12),
    right: scale(12),
    zIndex: 30,
  },
  closeIconBg: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    borderRadius: scale(26),
    paddingTop: verticalScale(36),
    paddingBottom: verticalScale(16),
    paddingHorizontal: scale(18),
    alignItems: 'center',
    borderWidth: 1,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: verticalScale(10),
  },
  statusPillWrap: {
    borderRadius: scale(20),
    overflow: 'hidden',
    marginBottom: verticalScale(8),
  },
  statusPillGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(4),
    paddingHorizontal: scale(12),
    borderRadius: scale(20),
  },
  statusPillTxt: {
    fontSize: fs(10),
    fontWeight: '800',
    color: '#FF007F',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: fs(20),
    fontWeight: '900',
    marginBottom: verticalScale(4),
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: fs(12),
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: verticalScale(17),
    marginBottom: verticalScale(14),
    paddingHorizontal: scale(4),
  },
  sectionLabel: {
    fontSize: fs(9.5),
    fontWeight: '800',
    letterSpacing: 1.0,
    marginBottom: verticalScale(8),
    alignSelf: 'flex-start',
  },
  packsHeaderRow: {
    width: '100%',
  },
  packsContainer: {
    width: '100%',
    gap: verticalScale(8),
    marginBottom: verticalScale(14),
  },
  packCard: {
    width: '100%',
    borderRadius: scale(16),
    borderWidth: 1,
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(14),
    position: 'relative',
    overflow: 'hidden',
  },
  packCardSelected: {
    borderWidth: 1.5,
    borderColor: '#FF007F',
    elevation: 2,
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  packBadgeWrap: {
    position: 'absolute',
    top: 0,
    right: scale(14),
    borderBottomLeftRadius: scale(8),
    borderBottomRightRadius: scale(8),
    overflow: 'hidden',
  },
  packBadgeGrad: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
  },
  packBadgeTxt: {
    fontSize: fs(8.5),
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  packMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  packLeftInfo: {
    flex: 1,
  },
  packTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  packTitleTxt: {
    fontSize: fs(14),
    fontWeight: '700',
  },
  savePill: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(1.5),
    borderRadius: scale(6),
    marginLeft: scale(6),
  },
  savePillTxt: {
    fontSize: fs(9),
    fontWeight: '800',
    color: '#30D158',
  },
  packSubTxt: {
    fontSize: fs(10.5),
    fontWeight: '500',
    marginTop: verticalScale(2),
  },
  packRightPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  priceTxt: {
    fontSize: fs(16),
    fontWeight: '900',
  },
  radioCircle: {
    width: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: {
    borderColor: '#FF007F',
    backgroundColor: 'rgba(255, 0, 127, 0.1)',
  },
  radioInnerDot: {
    width: scale(9),
    height: scale(9),
    borderRadius: scale(4.5),
    backgroundColor: '#FF007F',
  },
  featuresList: {
    width: '100%',
    marginBottom: verticalScale(14),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(12),
    borderRadius: scale(12),
  },
  featureIconGrad: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(10),
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: fs(12.5),
    fontWeight: '700',
    marginBottom: 1,
  },
  featureDesc: {
    fontSize: fs(10.5),
    fontWeight: '500',
  },
  buyBtnShadow: {
    width: '100%',
    height: verticalScale(46),
    borderRadius: scale(15),
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    marginBottom: verticalScale(10),
  },
  buyBtnGrad: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(16),
  },
  buyBtnTxt: {
    color: '#FFFFFF',
    fontSize: fs(14.5),
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  upgradeLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(12),
    marginBottom: verticalScale(4),
  },
  upgradeLinkTxt: {
    fontSize: fs(12.5),
    fontWeight: '700',
    color: '#FF007F',
  },
  cancelBtn: {
    marginTop: verticalScale(4),
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(16),
  },
  cancelBtnTxt: {
    fontSize: fs(12.5),
    fontWeight: '600',
  },
});
