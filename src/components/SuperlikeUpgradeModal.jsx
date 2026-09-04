// src/components/SuperlikeUpgradeModal.jsx — Ultra-Professional Superlikes Top-Up & Upgrade Modal
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import BlurView from './SafeBlurView';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PaymentGatewayModal from './PaymentGatewayModal';

const { width } = Dimensions.get('window');

const SUPERLIKE_PACKS = [
  {
    id: '5_superlikes',
    count: 5,
    title: '5 Superlikes',
    price: '₹109',
    unitPrice: '₹21.8/ea',
    badge: null,
    save: null,
    popular: false,
  },
  {
    id: '15_superlikes',
    count: 15,
    title: '15 Superlikes',
    price: '₹207',
    unitPrice: '₹13.8/ea',
    badge: 'POPULAR',
    save: 'SAVE 27%',
    popular: true,
  },
  {
    id: '30_superlikes',
    count: 30,
    title: '30 Superlikes',
    price: '₹349',
    unitPrice: '₹11.6/ea',
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

  const cardBg = isDark ? '#140E26' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
  const selectedPack = SUPERLIKE_PACKS.find(p => p.id === selectedPackId) || SUPERLIKE_PACKS[1];

  const paymentPlanObj = {
    id: `superlike_${selectedPack.count}`,
    name: `${selectedPack.count} Superlikes Pack`,
    gradient: ['#FBBF24', '#F59E0B', '#D97706'],
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
              paddingTop: insets.top + 16,
              paddingBottom: Math.max(insets.bottom + 16, 24),
            },
          ]}
        >
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />

          <View style={styles.cardWrap}>
            {/* Top Center Floating Golden Lightning Badge */}
            <View style={[styles.topBadgeContainer, { borderColor: cardBg }]}>
              <LinearGradient
                colors={['#FBBF24', '#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.topBadgeGrad}
              >
                <Ionicons name="flash" size={28} color="#FFFFFF" />
              </LinearGradient>
            </View>

            {/* Top-Right Cross Close Button */}
            <TouchableOpacity
              style={styles.closeIconBtn}
              onPress={onClose}
              activeOpacity={0.75}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <View style={[styles.closeIconBg, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)' }]}>
                <Ionicons name="close" size={18} color={isDark ? '#FFFFFF' : '#475569'} />
              </View>
            </TouchableOpacity>

            {/* Card Main Body */}
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                style={{ width: '100%' }}
              >
                {/* Status Pill Header */}
                <View style={styles.statusPillWrap}>
                  <LinearGradient
                    colors={['rgba(245, 158, 11, 0.18)', 'rgba(217, 119, 6, 0.12)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.statusPillGrad}
                  >
                    <Ionicons name="sparkles" size={12} color="#F59E0B" style={{ marginRight: 5 }} />
                    <Text style={styles.statusPillTxt}>STAND OUT FROM THE CROWD</Text>
                  </LinearGradient>
                </View>

                {/* Title & Description */}
                <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                  Need More Superlikes?
                </Text>

                <Text style={[styles.subtitle, { color: isDark ? 'rgba(255, 255, 255, 0.72)' : '#64748B' }]}>
                  {message || 'Send a Superlike to get highlighted on their screen and stand out with a 3x higher match rate!'}
                </Text>

                {/* Modern 3-Column Pack Selector Cards */}
                <View style={styles.packsGrid}>
                  {SUPERLIKE_PACKS.map((pack) => {
                    const isSelected = pack.id === selectedPackId;
                    return (
                      <TouchableOpacity
                        key={pack.id}
                        onPress={() => setSelectedPackId(pack.id)}
                        activeOpacity={0.85}
                        style={[
                          styles.packTile,
                          {
                            backgroundColor: isDark ? (isSelected ? '#271D12' : '#1A132E') : (isSelected ? '#FFFBEB' : '#F8FAFC'),
                            borderColor: isSelected ? '#F59E0B' : (isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0'),
                          },
                          isSelected && styles.packTileSelected,
                        ]}
                      >
                        {/* Top Highlight Badge (Popular / Best Value) */}
                        {!!pack.badge && (
                          <View style={styles.packRibbonWrap}>
                            <LinearGradient
                              colors={pack.popular ? ['#F59E0B', '#D97706'] : ['#EAB308', '#B45309']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={styles.packRibbonGrad}
                            >
                              <Text style={styles.packRibbonTxt}>{pack.badge}</Text>
                            </LinearGradient>
                          </View>
                        )}

                        {/* Lightning Icon & Superlike Count */}
                        <View style={styles.packCountRow}>
                          <Ionicons
                            name="flash"
                            size={16}
                            color={isSelected ? '#F59E0B' : (isDark ? '#CBD5E1' : '#64748B')}
                            style={{ marginRight: 3 }}
                          />
                          <Text
                            style={[
                              styles.packCountNumber,
                              { color: isDark ? '#FFFFFF' : '#0F172A' },
                              isSelected && { color: '#F59E0B', fontWeight: '900' },
                            ]}
                          >
                            {pack.count}
                          </Text>
                        </View>

                        <Text style={[styles.packLabelTxt, { color: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748B' }]}>
                          Superlikes
                        </Text>

                        {/* Price */}
                        <Text style={[styles.packPriceTxt, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                          {pack.price}
                        </Text>

                        {/* Unit Price / Savings Tag */}
                        {pack.save ? (
                          <View style={styles.saveBadge}>
                            <Text style={styles.saveBadgeTxt}>{pack.save}</Text>
                          </View>
                        ) : (
                          <Text style={[styles.unitPriceTxt, { color: isDark ? 'rgba(255, 255, 255, 0.45)' : '#94A3B8' }]}>
                            {pack.unitPrice}
                          </Text>
                        )}

                        {/* Active Selection Indicator */}
                        <View
                          style={[
                            styles.radioIndicator,
                            isSelected ? styles.radioIndicatorActive : { borderColor: isDark ? 'rgba(255,255,255,0.25)' : '#CBD5E1' },
                          ]}
                        >
                          {isSelected && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* High-Impact Benefit Badges */}
                <View style={[styles.benefitsBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC', borderColor: cardBorder }]}>
                  <View style={styles.benefitRow}>
                    <View style={styles.benefitIconWrap}>
                      <Ionicons name="trending-up" size={14} color="#F59E0B" />
                    </View>
                    <Text style={[styles.benefitTxt, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                      <Text style={{ fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A' }}>3x Higher Match Rate:</Text> Your profile shines with an electric glowing badge
                    </Text>
                  </View>

                  <View style={[styles.benefitDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }]} />

                  <View style={styles.benefitRow}>
                    <View style={styles.benefitIconWrap}>
                      <Ionicons name="notifications" size={14} color="#D97706" />
                    </View>
                    <Text style={[styles.benefitTxt, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                      <Text style={{ fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A' }}>Instant Priority Alert:</Text> Notifies them right away before they browse
                    </Text>
                  </View>
                </View>

                {/* Big Golden Action CTA Button */}
                <TouchableOpacity
                  style={styles.ctaBtnShadow}
                  onPress={handleBuySuperlikes}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={['#FBBF24', '#F59E0B', '#D97706']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ctaBtnGrad}
                  >
                    <Ionicons name="flash" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.ctaBtnTxt}>
                      Get {selectedPack.count} Superlikes • {selectedPack.price}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </LinearGradient>
                </TouchableOpacity>

                {/* Secondary Upgrade Link to Full Plans */}
                <TouchableOpacity
                  style={styles.plansLinkBtn}
                  onPress={() => {
                    if (onUpgrade) onUpgrade();
                  }}
                  activeOpacity={0.75}
                >
                  <Ionicons name="diamond-outline" size={14} color="#F59E0B" style={{ marginRight: 6 }} />
                  <Text style={styles.plansLinkTxt}>
                    Or get weekly free Superlikes with Premium Plans
                  </Text>
                </TouchableOpacity>

                {/* Subtle Dismiss Link */}
                <TouchableOpacity
                  style={styles.dismissBtn}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dismissBtnTxt, { color: isDark ? 'rgba(255, 255, 255, 0.45)' : '#94A3B8' }]}>
                    No thanks, maybe later
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Razorpay Payment Modal for Superlike Pack */}
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
    backgroundColor: 'rgba(7, 3, 15, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 390,
    maxHeight: '92%',
    position: 'relative',
    alignItems: 'center',
  },
  topBadgeContainer: {
    position: 'absolute',
    top: -26,
    zIndex: 25,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3.5,
    elevation: 14,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
  },
  topBadgeGrad: {
    flex: 1,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIconBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 30,
  },
  closeIconBg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    borderRadius: 28,
    paddingTop: 42,
    paddingBottom: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  statusPillWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 10,
  },
  statusPillGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  statusPillTxt: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#D97706',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    paddingHorizontal: 8,
  },

  // 3-Column Pack Selector Grid
  packsGrid: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginBottom: 16,
  },
  packTile: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  packTileSelected: {
    borderWidth: 2,
    borderColor: '#F59E0B',
    elevation: 6,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  packRibbonWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    overflow: 'hidden',
  },
  packRibbonGrad: {
    width: '100%',
    paddingVertical: 2.5,
    alignItems: 'center',
  },
  packRibbonTxt: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  packCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  packCountNumber: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  packLabelTxt: {
    fontSize: 10.5,
    fontWeight: '600',
    marginBottom: 6,
  },
  packPriceTxt: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  saveBadge: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 8,
  },
  saveBadgeTxt: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#30D158',
  },
  unitPriceTxt: {
    fontSize: 9.5,
    fontWeight: '600',
    marginBottom: 8,
  },
  radioIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioIndicatorActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },

  // Benefits Box
  benefitsBox: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  benefitTxt: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
  },
  benefitDivider: {
    height: 1,
    width: '100%',
    marginVertical: 8,
  },

  // Big Golden CTA Button
  ctaBtnShadow: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    marginBottom: 12,
  },
  ctaBtnGrad: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  ctaBtnTxt: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  // Secondary Links
  plansLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  plansLinkTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  dismissBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  dismissBtnTxt: {
    fontSize: 12,
    fontWeight: '600',
  },
});
