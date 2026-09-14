// src/components/discovery/ProfileDetail.jsx — Seamless Full-Screen Profile Popup with Block & Report
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Pressable,
  ScrollView, Image, Dimensions, FlatList, Animated, PanResponder, Platform, StatusBar,
  Alert, TextInput, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { ensureArray, formatImageUrl, calculateMatchPercentage, renderVerifiedBadge } from '../../utils/helpers';
import { apiBlockUser, apiReportUser } from '../../services/api';
import BlurView from '../SafeBlurView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const REPORT_REASONS = [
  { id: 'fake_profile', label: 'Fake Profile / Bot / Impersonation', icon: 'alert-circle-outline' },
  { id: 'inappropriate_photos', label: 'Inappropriate Photos or Nudity', icon: 'image-outline' },
  { id: 'harassment', label: 'Harassment or Abusive Behavior', icon: 'hand-left-outline' },
  { id: 'scam_fraud', label: 'Scam, Fraud, or Commercial Spam', icon: 'cash-outline' },
  { id: 'underage', label: 'Underage User (< 18 Years Old)', icon: 'person-remove-outline' },
  { id: 'other', label: 'Other Safety Violation', icon: 'shield-alert-outline' },
];

export default function ProfileDetail({
  visible,
  profile,
  onClose,
  onLike,
  onSuperLike,
  onPass,
  onBlockUser,
  onReportUser,
  isMatch = false
}) {
  const insets = useSafeAreaInsets();
  const [sheetPhotoIdx, setSheetPhotoIdx] = useState(0);
  const { isDark, theme } = useTheme();
  const { user: currentUser } = useAuth();
  const styles = useMemo(() => getStyles(theme), [theme]);

  // Safety Modal States
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState(REPORT_REASONS[0].id);
  const [reportDetailsText, setReportDetailsText] = useState('');
  const [alsoBlockUserOnReport, setAlsoBlockUserOnReport] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const compatPercentage = useMemo(() => {
    if (profile?.compatibility) return profile.compatibility;
    return calculateMatchPercentage(currentUser, profile);
  }, [currentUser, profile]);

  const translateY = useRef(new Animated.Value(height)).current;
  const photoListRef = useRef(null);

  const handlePrevPhoto = () => {
    if (sheetPhotoIdx > 0) {
      const newIdx = sheetPhotoIdx - 1;
      setSheetPhotoIdx(newIdx);
      photoListRef.current?.scrollToIndex({ index: newIdx, animated: true });
    }
  };

  const handleNextPhoto = (totalPhotos) => {
    if (sheetPhotoIdx < totalPhotos - 1) {
      const newIdx = sheetPhotoIdx + 1;
      setSheetPhotoIdx(newIdx);
      photoListRef.current?.scrollToIndex({ index: newIdx, animated: true });
    }
  };

  useEffect(() => {
    if (visible) {
      setSheetPhotoIdx(0);
      setShowOptionsMenu(false);
      setShowBlockModal(false);
      setShowReportModal(false);
      setSelectedReportReason(REPORT_REASONS[0].id);
      setReportDetailsText('');
      setAlsoBlockUserOnReport(true);
      setActionLoading(false);
      translateY.setValue(height);
      Animated.spring(translateY, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      translateY.setValue(height);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: height,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      if (onClose) onClose();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 12,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) {
          handleClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            tension: 40,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!profile || !visible) return null;

  const targetUserId = profile.id || profile.user?.id;
  const displayName = profile.display_name || profile.displayName || profile.name || profile.user?.display_name || profile.user?.name || 'User';

  const rawPhotos = profile.images && profile.images.length > 0
    ? profile.images
    : (profile.photos && profile.photos.length > 0 ? profile.photos : [profile.image]);

  const photos = ensureArray(rawPhotos, [
    profile.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800'
  ]).map(p => (typeof p === 'string' ? p : (p?.photo_url || p?.url || profile.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800')));

  const interests = ensureArray(profile.interests || profile.user?.interests, []);

  const formatList = (val) => {
    if (!val) return null;
    if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : null;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed.length > 0 ? parsed.join(', ') : null;
      } catch (e) { }
      return val.trim() || null;
    }
    return null;
  };

  // ─── Block User Handler ──────────────────────────────────────────────
  const handleConfirmBlock = async () => {
    if (!targetUserId) return;
    setActionLoading(true);
    try {
      await apiBlockUser(targetUserId);
      setShowBlockModal(false);
      setShowOptionsMenu(false);
      handleClose();
      if (onBlockUser) {
        onBlockUser(targetUserId);
      }
      Alert.alert(
        'User Blocked',
        `${displayName} has been blocked. Your profile is now completely hidden from them.`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.warn('Block user error:', err);
      Alert.alert('Error', err?.message || 'Failed to block user. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Report User Handler ─────────────────────────────────────────────
  const handleConfirmReport = async () => {
    if (!targetUserId) return;
    setActionLoading(true);
    try {
      const reasonObj = REPORT_REASONS.find(r => r.id === selectedReportReason);
      const fullReason = `${reasonObj?.label || selectedReportReason}${reportDetailsText.trim() ? ': ' + reportDetailsText.trim() : ''}`;
      await apiReportUser(targetUserId, fullReason);

      if (alsoBlockUserOnReport) {
        try {
          await apiBlockUser(targetUserId);
          if (onBlockUser) {
            onBlockUser(targetUserId);
          }
        } catch (e) { }
      }

      setShowReportModal(false);
      setShowOptionsMenu(false);
      handleClose();

      if (onReportUser) {
        onReportUser(targetUserId, fullReason);
      }

      Alert.alert(
        'Report Submitted',
        `Thank you for helping keep HeartLink safe. We have received your report regarding ${displayName} and our 24/7 moderation team will review it immediately.${alsoBlockUserOnReport ? ' This profile has also been blocked and hidden from you.' : ''}`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.warn('Report user error:', err);
      Alert.alert('Error', err?.message || 'Failed to submit report. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Modal transparent visible={visible} statusBarTranslucent={true} animationType="fade" onRequestClose={handleClose}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <Animated.View
          style={[styles.detailSheet, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.detailSheetBgClip} pointerEvents="none">
            <LinearGradient
              colors={isDark ? ['#140E2D', '#0A051C'] : ['#F2EBFF', '#FFFFFF']}
              style={StyleSheet.absoluteFill}
            />
          </View>

          {/* Small Fixed Chevron-Down Close Button (Left) */}
          <TouchableOpacity style={styles.floatingCloseBtn} onPress={handleClose} activeOpacity={0.75} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-down" size={20} color="#FFF" />
          </TouchableOpacity>

          {/* Safety 3-Dots Action Menu Button (Right - Next to close) */}
          <TouchableOpacity
            style={styles.floatingOptionsBtn}
            onPress={() => setShowOptionsMenu(prev => !prev)}
            activeOpacity={0.75}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#FFF" />
          </TouchableOpacity>

          {/* Small Fixed Cross (X) Close Button (Far Right) */}
          <TouchableOpacity style={styles.floatingCloseBtnRight} onPress={handleClose} activeOpacity={0.75} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={20} color="#FFF" />
          </TouchableOpacity>

          {/* Floating Dropdown Menu */}
          {showOptionsMenu && (
            <View style={[styles.optionsDropdown, { backgroundColor: isDark ? '#1C1236' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }]}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setShowOptionsMenu(false);
                  setShowReportModal(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="flag-outline" size={17} color="#F59E0B" style={{ marginRight: 10 }} />
                <Text style={[styles.dropdownItemTxt, { color: theme.textPrimary }]}>Report Profile</Text>
              </TouchableOpacity>

              <View style={[styles.dropdownDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setShowOptionsMenu(false);
                  setShowBlockModal(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="ban-outline" size={17} color="#FF375F" style={{ marginRight: 10 }} />
                <Text style={[styles.dropdownItemTxt, { color: '#FF375F', fontWeight: '700' }]}>Block User</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            nestedScrollEnabled={true}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: 0 }}
          >
            <View style={styles.sheetPhotoWrap}>
              <FlatList
                ref={photoListRef}
                data={photos}
                keyExtractor={(_, i) => i.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled={true}
                onMomentumScrollEnd={(e) => {
                  const activeIndex = Math.round(e.nativeEvent.contentOffset.x / width);
                  setSheetPhotoIdx(activeIndex);
                }}
                renderItem={({ item }) => (
                  <Image source={{ uri: formatImageUrl(item) }} style={styles.sheetPhoto} resizeMode="cover" />
                )}
              />

              {/* Left/Right Photo Navigation Buttons (Shown if photos > 1) */}
              {photos.length > 1 && (
                <>
                  {sheetPhotoIdx > 0 && (
                    <TouchableOpacity
                      style={[styles.photoNavBtn, styles.photoNavBtnLeft]}
                      onPress={handlePrevPhoto}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-back" size={20} color="#FFF" />
                    </TouchableOpacity>
                  )}
                  {sheetPhotoIdx < photos.length - 1 && (
                    <TouchableOpacity
                      style={[styles.photoNavBtn, styles.photoNavBtnRight]}
                      onPress={() => handleNextPhoto(photos.length)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-forward" size={20} color="#FFF" />
                    </TouchableOpacity>
                  )}
                </>
              )}

              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.85)']}
                style={styles.sheetHeroGrad}
              />
              <View style={styles.sheetHeroCompat}>
                <Text style={styles.sheetHeroCompatNum}>{compatPercentage}%</Text>
                <Text style={styles.sheetHeroCompatLbl}>match</Text>
              </View>
              <LinearGradient
                colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.1)', 'transparent']}
                style={styles.sheetTopGrad}
                pointerEvents="none"
              />

              {photos.length > 1 && (
                <View style={styles.sheetPhotoDots} pointerEvents="none">
                  {photos.map((_, i) => (
                    <View key={i} style={[styles.sheetDot, i === sheetPhotoIdx && styles.sheetDotActive]} />
                  ))}
                </View>
              )}
              <View style={styles.sheetHeroNameWrap}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text style={styles.sheetHeroName}>{displayName}{profile.showAge !== false ? `, ${profile.age || profile.user?.age || ''}` : ''}</Text>
                  {renderVerifiedBadge(profile.user || profile, 20, { marginLeft: 6 })}
                </View>
                <Text style={styles.sheetHeroSub}>{profile.showOccupation !== false ? (profile.occupation || profile.user?.occupation || (profile.job && profile.job !== 'Connections' && profile.job !== 'Member' ? profile.job : null) || 'Member') : 'Member'}</Text>
              </View>
            </View>

            {/* YouTube/iOS Style Centered Drag Handle Line */}
            <View style={styles.dragHandleContainer} {...panResponder.panHandlers}>
              <View style={styles.dragHandleBar} />
            </View>

            <View style={styles.sheetBody}>
              <View style={styles.quickFactsRow}>
                <View style={styles.quickFact}>
                  <Ionicons name="location-outline" size={14} color="#FF007F" />
                  <Text style={styles.quickFactTxt}>{profile?.city || profile?.user?.city || (profile?.location && profile.location !== 'Nearby' ? profile.location : null) || 'Nearby'}</Text>
                </View>
                <View style={styles.quickFact}>
                  <Ionicons name={(profile.gender || profile.user?.gender)?.toLowerCase().includes('female') ? 'woman-outline' : 'man-outline'} size={14} color="#4A89FF" />
                  <Text style={styles.quickFactTxt}>{profile.gender || profile.user?.gender || 'Person'}</Text>
                </View>
              </View>

              <View style={styles.sectionBox}>
                <BlurView intensity={isDark ? 40 : 70} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="person-circle-outline" size={18} color="#FF007F" style={{ marginRight: 6 }} />
                  <Text style={styles.sectionLabel}>Full Name</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: theme.textPrimary, letterSpacing: -0.2 }}>
                    {profile.name || profile.user?.name || profile.full_name || displayName}
                  </Text>
                  {renderVerifiedBadge(profile.user || profile, 20, { marginLeft: 6 })}
                </View>
              </View>

              <View style={styles.sectionBox}>
                <BlurView intensity={isDark ? 40 : 70} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="person-outline" size={16} color="#FF007F" style={{ marginRight: 6 }} />
                  <Text style={styles.sectionLabel}>About Me</Text>
                </View>
                <Text style={styles.bioText}>{(profile.bio || profile.user?.bio) ? `"${profile.bio || profile.user?.bio}"` : 'No bio provided.'}</Text>
              </View>

              <View style={styles.sectionBox}>
                <BlurView intensity={isDark ? 40 : 70} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="ribbon-outline" size={16} color="#FF007F" style={{ marginRight: 6 }} />
                  <Text style={styles.sectionLabel}>Personal & Lifestyle</Text>
                </View>

                <View style={styles.attributesGrid}>
                  {(profile.vibe || profile.user?.vibe) ? (
                    <View style={styles.attributePill}>
                      <Ionicons name="sparkles-outline" size={14} color="#FF007F" style={{ marginRight: 6 }} />
                      <Text style={styles.attributeText}>Primary Vibe: {profile.vibe || profile.user?.vibe}</Text>
                    </View>
                  ) : null}

                  <View style={styles.attributePill}>
                    <Ionicons name="transgender-outline" size={14} color="#FF007F" style={{ marginRight: 6 }} />
                    <Text style={styles.attributeText}>Gender: {profile.gender || profile.user?.gender || 'Not specified'}</Text>
                  </View>

                  <View style={styles.attributePill}>
                    <Ionicons name="briefcase-outline" size={14} color="#FF007F" style={{ marginRight: 6 }} />
                    <Text style={styles.attributeText}>Occupation: {profile.occupation || profile.user?.occupation || (profile.job && profile.job !== 'Connections' && profile.job !== 'Member' ? profile.job : null) || 'Not specified'}</Text>
                  </View>

                  {(!profile.hideEducation && !profile.user?.settings?.hide_education) && (
                    <View style={styles.attributePill}>
                      <Ionicons name="school-outline" size={14} color="#FF007F" style={{ marginRight: 6 }} />
                      <Text style={styles.attributeText}>Education: {profile.education || profile.user?.education || 'Not specified'}</Text>
                    </View>
                  )}

                  <View style={styles.attributePill}>
                    <Ionicons name="location-outline" size={14} color="#FF007F" style={{ marginRight: 6 }} />
                    <Text style={styles.attributeText}>City: {profile.city || profile.user?.city || 'Nearby'}{(profile.state || profile.user?.state) ? `, ${profile.state || profile.user?.state}` : ''}</Text>
                  </View>

                  {(profile.pincode || profile.user?.pincode) ? (
                    <View style={styles.attributePill}>
                      <Ionicons name="map-outline" size={14} color="#FF007F" style={{ marginRight: 6 }} />
                      <Text style={styles.attributeText}>Pincode: {profile.pincode || profile.user?.pincode}</Text>
                    </View>
                  ) : null}

                  <View style={styles.attributePill}>
                    <Ionicons name="sparkles-outline" size={14} color="#FF007F" style={{ marginRight: 6 }} />
                    <Text style={styles.attributeText}>Religion: {profile.religion || profile.user?.religion || 'Not specified'}</Text>
                  </View>

                  <View style={styles.attributePill}>
                    <Ionicons name="language-outline" size={14} color="#FF007F" style={{ marginRight: 6 }} />
                    <Text style={styles.attributeText}>Mother Tongue: {profile.mother_tongue || profile.motherTongue || profile.user?.mother_tongue || 'Not specified'}</Text>
                  </View>

                  {formatList(profile.languages_spoken || profile.languagesSpoken || profile.user?.languages_spoken) ? (
                    <View style={styles.attributePill}>
                      <Ionicons name="chatbubbles-outline" size={14} color="#FF007F" style={{ marginRight: 6 }} />
                      <Text style={styles.attributeText}>Languages: {formatList(profile.languages_spoken || profile.languagesSpoken || profile.user?.languages_spoken)}</Text>
                    </View>
                  ) : null}

                  <View style={styles.attributePill}>
                    <Ionicons name="shield-checkmark-outline" size={14} color="#FF007F" style={{ marginRight: 6 }} />
                    <Text style={styles.attributeText}>Status: {profile.marital_status || profile.maritalStatus || profile.user?.marital_status || 'Not specified'}</Text>
                  </View>

                  {(profile.zodiac_sign || profile.zodiacSign || profile.user?.zodiac_sign) ? (
                    <View style={styles.attributePill}>
                      <Ionicons name="planet-outline" size={14} color="#FF007F" style={{ marginRight: 6 }} />
                      <Text style={styles.attributeText}>Zodiac: {profile.zodiac_sign || profile.zodiacSign || profile.user?.zodiac_sign}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.sectionBox}>
                <BlurView intensity={isDark ? 40 : 70} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="wine-outline" size={16} color="#FF007F" style={{ marginRight: 6 }} />
                  <Text style={styles.sectionLabel}>How I Am To Date (Lifestyle & Habits)</Text>
                </View>

                <View style={styles.attributesGrid}>
                  <View style={styles.attributePill}>
                    <Ionicons name="restaurant-outline" size={14} color="#FF007F" style={{ marginRight: 6 }} />
                    <Text style={styles.attributeText}>Diet: {profile.diet || profile.user?.diet || 'Not specified'}</Text>
                  </View>

                  <View style={styles.attributePill}>
                    <Ionicons name="fitness-outline" size={14} color="#FF007F" style={{ marginRight: 6 }} />
                    <Text style={styles.attributeText}>Exercise: {profile.exercise || profile.user?.exercise || 'Not specified'}</Text>
                  </View>

                  <View style={styles.attributePill}>
                    <Ionicons name="flame-outline" size={14} color="#FF007F" style={{ marginRight: 6 }} />
                    <Text style={styles.attributeText}>Smoking: {profile.smoking || profile.user?.smoking || 'Not specified'}</Text>
                  </View>

                  <View style={styles.attributePill}>
                    <Ionicons name="wine-outline" size={14} color="#FF007F" style={{ marginRight: 6 }} />
                    <Text style={styles.attributeText}>Drinking: {profile.drinking || profile.user?.drinking || 'Not specified'}</Text>
                  </View>

                  <View style={styles.attributePill}>
                    <Ionicons name="disc-outline" size={14} color="#FF007F" style={{ marginRight: 6 }} />
                    <Text style={styles.attributeText}>Nightlife / Clubbing: {profile.clubbing || profile.user?.clubbing || 'Not specified'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.sectionBox}>
                <BlurView intensity={isDark ? 40 : 70} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="heart-outline" size={16} color="#FF007F" style={{ marginRight: 6 }} />
                  <Text style={styles.sectionLabel}>Looking For</Text>
                </View>
                <View style={styles.goalChip}>
                  <Text style={styles.goalChipText}>{profile.relationship_type || profile.relationshipType || profile.user?.relationship_type || 'Long-term relationship'}</Text>
                </View>
              </View>

              <View style={styles.sectionBox}>
                <BlurView intensity={isDark ? 40 : 70} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="sparkles-outline" size={16} color="#FF007F" style={{ marginRight: 6 }} />
                  <Text style={styles.sectionLabel}>Interests & Hobbies</Text>
                </View>
                <View style={styles.interestsRow}>
                  {interests.length > 0 ? (
                    interests.map((tag, idx) => (
                      <View key={idx} style={styles.interestTag}>
                        <Text style={styles.interestTagText}>{tag}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.interestTag}>
                      <Text style={styles.interestTagText}>None listed</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* ─── Profile Safety & Moderation Actions (Before Matching) ──── */}
              <View style={[styles.safetySectionBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
                <View style={styles.safetyHeaderRow}>
                  <Ionicons name="shield-checkmark" size={16} color="#0072E3" style={{ marginRight: 6 }} />
                  <Text style={[styles.safetyHeaderTitle, { color: theme.textPrimary }]}>Safety & Account Controls</Text>
                </View>
                <Text style={[styles.safetyDesc, { color: theme.textSec }]}>
                  If you feel uncomfortable or do not want {displayName} to see your profile, you can report or block them.
                </Text>

                <View style={styles.safetyButtonsRow}>
                  <TouchableOpacity
                    style={[styles.safetyActionBtn, styles.reportBtnBorder, { borderColor: isDark ? 'rgba(245,158,11,0.3)' : 'rgba(245,158,11,0.25)' }]}
                    onPress={() => setShowReportModal(true)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="flag-outline" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
                    <Text style={[styles.safetyBtnText, { color: '#F59E0B' }]}>Report Profile</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.safetyActionBtn, styles.blockBtnBorder, { borderColor: isDark ? 'rgba(255,55,95,0.35)' : 'rgba(255,55,95,0.25)' }]}
                    onPress={() => setShowBlockModal(true)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="ban-outline" size={16} color="#FF375F" style={{ marginRight: 6 }} />
                    <Text style={[styles.safetyBtnText, { color: '#FF375F' }]}>Block User</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {(onPass || onLike || onSuperLike) ? (
                <View style={styles.sheetActions}>
                  {onPass ? (
                    <TouchableOpacity
                      style={styles.sheetBtnPass}
                      onPress={() => { handleClose(); onPass(profile.id); }}
                    >
                      <Ionicons name={isMatch ? "close" : "close-outline"} size={22} color={isMatch ? "#FF375F" : theme.textSec} />
                      <Text style={[styles.sheetBtnPassTxt, !isMatch && { color: theme.textSec }]}>{isMatch ? "Unmatch" : "Close"}</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.sheetBtnPass}
                      onPress={handleClose}
                    >
                      <Ionicons name="close-outline" size={22} color={theme.textSec} />
                      <Text style={[styles.sheetBtnPassTxt, { color: theme.textSec }]}>Close</Text>
                    </TouchableOpacity>
                  )}

                  {onSuperLike && !isMatch ? (
                    <TouchableOpacity
                      style={styles.sheetBtnSuperLike}
                      onPress={() => { handleClose(); onSuperLike(profile.id); }}
                    >
                      <LinearGradient colors={['#FBBF24', '#F59E0B', '#D97706']} style={styles.sheetBtnSuperLikeGrad}>
                        <Ionicons name="flash" size={18} color="#fff" />
                        <Text style={styles.sheetBtnSuperLikeTxt}>Spark</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : null}

                  {onLike ? (
                    <TouchableOpacity
                      style={styles.sheetBtnLike}
                      onPress={() => { handleClose(); onLike(profile.id); }}
                    >
                      <LinearGradient colors={['#FF007F', '#B5179E']} style={styles.sheetBtnLikeGrad}>
                        <Ionicons name={isMatch ? "chatbubble-ellipses-outline" : "heart"} size={20} color="#fff" />
                        <Text style={styles.sheetBtnLikeTxt}>{isMatch ? "Chat" : "Like"}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}

              <View style={{ height: Math.max(insets.bottom + 80, 110) }} />
            </View>
          </ScrollView>
        </Animated.View>

        {/* ─── BLOCK CONFIRMATION MODAL ───────────────────────────────────── */}
        <Modal visible={showBlockModal} transparent animationType="fade" onRequestClose={() => setShowBlockModal(false)}>
          <View style={styles.dialogBackdrop}>
            <View style={[styles.dialogCard, { backgroundColor: isDark ? '#1C1236' : '#FFFFFF', borderColor: isDark ? 'rgba(255,55,95,0.3)' : 'rgba(0,0,0,0.12)' }]}>
              <View style={[styles.dialogIconCircle, { backgroundColor: 'rgba(255, 55, 95, 0.15)' }]}>
                <Ionicons name="ban" size={32} color="#FF375F" />
              </View>

              <Text style={[styles.dialogTitle, { color: theme.textPrimary }]}>
                Block {displayName}?
              </Text>

              <Text style={[styles.dialogMessage, { color: theme.textSec }]}>
                When you block {displayName}, <Text style={{ fontWeight: '800', color: theme.textPrimary }}>your profile will be completely hidden from them</Text>.
                {'\n\n'}
                They will never see you or find you on HeartLink, and you won't see them on Discover, Vibes, Requests, or Matches.
              </Text>

              <View style={styles.dialogBtnStack}>
                <TouchableOpacity
                  style={styles.dialogDangerBtn}
                  onPress={handleConfirmBlock}
                  disabled={actionLoading}
                  activeOpacity={0.88}
                >
                  <LinearGradient colors={['#FF375F', '#D90429']} style={styles.dialogDangerGrad}>
                    {actionLoading ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="ban" size={17} color="#FFF" style={{ marginRight: 6 }} />
                        <Text style={styles.dialogDangerTxt}>Yes, Block & Hide Profile</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dialogCancelBtn, { borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }]}
                  onPress={() => setShowBlockModal(false)}
                  disabled={actionLoading}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dialogCancelTxt, { color: theme.textSec }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ─── REPORT USER MODAL ─────────────────────────────────────────── */}
        <Modal visible={showReportModal} transparent animationType="fade" onRequestClose={() => setShowReportModal(false)}>
          <View style={styles.dialogBackdrop}>
            <View style={[styles.reportCard, { backgroundColor: isDark ? '#1C1236' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }]}>
              {/* Header */}
              <View style={styles.reportHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="flag" size={20} color="#F59E0B" style={{ marginRight: 8 }} />
                  <Text style={[styles.reportTitle, { color: theme.textPrimary }]}>Report {displayName}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowReportModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={24} color={theme.textSec} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.reportSub, { color: theme.textSec }]}>
                Help us keep HeartLink safe. Select the reason for your report. Reports are 100% confidential.
              </Text>

              <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                {REPORT_REASONS.map((r) => {
                  const isSelected = selectedReportReason === r.id;
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[
                        styles.reportReasonRow,
                        {
                          backgroundColor: isDark
                            ? (isSelected ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.04)')
                            : (isSelected ? '#FFFBEB' : '#F8FAFC'),
                          borderColor: isSelected ? '#F59E0B' : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0,0,0,0.06)'),
                        }
                      ]}
                      onPress={() => setSelectedReportReason(r.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={r.icon}
                        size={18}
                        color={isSelected ? '#F59E0B' : theme.textSec}
                        style={{ marginRight: 10 }}
                      />
                      <Text style={[styles.reportReasonTxt, { color: isSelected ? (isDark ? '#FBBF24' : '#B45309') : theme.textPrimary, fontWeight: isSelected ? '700' : '500' }]}>
                        {r.label}
                      </Text>
                      <View style={[styles.reportRadio, isSelected && styles.reportRadioActive]}>
                        {isSelected && <View style={styles.reportRadioInner} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                <TextInput
                  style={[
                    styles.reportInput,
                    {
                      color: theme.textPrimary,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                      borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                    }
                  ]}
                  placeholder="Additional details (optional)..."
                  placeholderTextColor={theme.textFaint}
                  multiline
                  numberOfLines={3}
                  value={reportDetailsText}
                  onChangeText={setReportDetailsText}
                  maxLength={300}
                />
              </ScrollView>

              {/* Also block toggle */}
              <TouchableOpacity
                style={styles.alsoBlockToggleRow}
                onPress={() => setAlsoBlockUserOnReport(prev => !prev)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={alsoBlockUserOnReport ? "checkbox" : "square-outline"}
                  size={20}
                  color={alsoBlockUserOnReport ? "#FF375F" : theme.textFaint}
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.alsoBlockToggleTxt, { color: theme.textPrimary }]}>
                  Also block {displayName} & hide my profile from them
                </Text>
              </TouchableOpacity>

              {/* Submit / Cancel Buttons */}
              <View style={styles.dialogBtnStack}>
                <TouchableOpacity
                  style={styles.dialogDangerBtn}
                  onPress={handleConfirmReport}
                  disabled={actionLoading}
                  activeOpacity={0.88}
                >
                  <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.dialogDangerGrad}>
                    {actionLoading ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="flag" size={17} color="#FFF" style={{ marginRight: 6 }} />
                        <Text style={styles.dialogDangerTxt}>Submit Confidential Report</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dialogCancelBtn, { borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }]}
                  onPress={() => setShowReportModal(false)}
                  disabled={actionLoading}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dialogCancelTxt, { color: theme.textSec }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    </Modal>
  );
}

const FIXED_TOP = 48;

const getStyles = (theme) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },

  detailSheet: {
    flex: 1,
    width: width,
    backgroundColor: theme.isDark ? '#140E2D' : '#FFFFFF',
    overflow: 'hidden',
  },
  detailSheetBgClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },

  floatingCloseBtn: {
    position: 'absolute',
    top: 80,
    left: 16,
    zIndex: 100,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingOptionsBtn: {
    position: 'absolute',
    top: 80,
    right: 58,
    zIndex: 100,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingCloseBtnRight: {
    position: 'absolute',
    top: 80,
    right: 16,
    zIndex: 100,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  optionsDropdown: {
    position: 'absolute',
    top: 122,
    right: 16,
    zIndex: 200,
    width: 170,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dropdownItemTxt: {
    fontSize: 13,
    fontWeight: '600',
  },
  dropdownDivider: {
    height: 1,
    width: '100%',
  },

  dragHandleContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    zIndex: 10,
  },
  dragHandleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(0, 0, 0, 0.2)',
  },

  sheetPhotoWrap: {
    width: width,
    height: height * 0.52,
    position: 'relative',
    backgroundColor: '#000',
  },
  sheetPhoto: {
    width: width,
    height: height * 0.52,
  },
  sheetHeroGrad: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '65%',
  },
  sheetTopGrad: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 110,
  },
  sheetHeroCompat: {
    position: 'absolute',
    top: 80,
    left: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sheetHeroCompatNum: {
    fontSize: 12,
    fontWeight: '900',
    color: '#00C853',
  },
  sheetHeroCompatLbl: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '700',
  },
  sheetPhotoDots: {
    position: 'absolute',
    top: 122,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  sheetDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  sheetDotActive: {
    backgroundColor: '#FF007F',
    width: 14,
  },
  sheetHeroNameWrap: {
    position: 'absolute',
    bottom: 14,
    left: 20,
    right: 20,
  },
  sheetHeroName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.4,
  },
  sheetHeroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    fontWeight: '600',
  },

  photoNavBtn: {
    position: 'absolute',
    top: '48%',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  photoNavBtnLeft: {
    left: 12,
  },
  photoNavBtnRight: {
    right: 12,
  },

  sheetBody: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  quickFactsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickFact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 4,
  },
  quickFactTxt: {
    fontSize: 12,
    color: theme.textPrimary,
    fontWeight: '600',
  },

  sectionBox: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.textPrimary,
    letterSpacing: -0.2,
  },
  bioText: {
    fontSize: 13.5,
    color: theme.textSec,
    lineHeight: 19,
    fontStyle: 'italic',
  },

  attributesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  attributePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  attributeText: {
    fontSize: 12,
    color: theme.textSec,
    fontWeight: '600',
  },

  goalChip: {
    alignSelf: 'flex-start',
    backgroundColor: theme.isDark ? 'rgba(255, 0, 127, 0.12)' : 'rgba(255, 0, 127, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 127, 0.25)',
  },
  goalChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FF007F',
  },

  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  interestTag: {
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  interestTagText: {
    fontSize: 12,
    color: theme.textSec,
    fontWeight: '600',
  },

  // Safety & Moderation Box
  safetySectionBox: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  safetyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  safetyHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  safetyDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 12,
  },
  safetyButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  safetyActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  reportBtnBorder: {
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
  },
  blockBtnBorder: {
    backgroundColor: 'rgba(255, 55, 95, 0.06)',
  },
  safetyBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Sheet Action Buttons
  sheetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 6,
    marginBottom: 10,
  },
  sheetBtnPass: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : '#FFF',
    borderWidth: 1,
    borderColor: theme.border,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  sheetBtnPassTxt: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 1,
  },
  sheetBtnSuperLike: {
    width: 66,
    height: 66,
    borderRadius: 33,
    overflow: 'hidden',
    elevation: 5,
  },
  sheetBtnSuperLikeGrad: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetBtnSuperLikeTxt: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 1,
  },
  sheetBtnLike: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 4,
  },
  sheetBtnLikeGrad: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetBtnLikeTxt: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 1,
  },

  // ─── Dialogs (Block & Report) ──────────────────────────────────────
  dialogBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 2, 12, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 9999,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  dialogIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  dialogMessage: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  dialogBtnStack: {
    width: '100%',
    gap: 10,
  },
  dialogDangerBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  dialogDangerGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  dialogDangerTxt: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  dialogCancelBtn: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  dialogCancelTxt: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Report Modal
  reportCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    elevation: 20,
  },
  reportHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  reportSub: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 14,
  },
  reportReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  reportReasonTxt: {
    flex: 1,
    fontSize: 12.5,
  },
  reportRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(150, 150, 150, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  reportRadioActive: {
    borderColor: '#F59E0B',
  },
  reportRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  reportInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    fontSize: 12.5,
    marginTop: 4,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  alsoBlockToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 14,
  },
  alsoBlockToggleTxt: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
});