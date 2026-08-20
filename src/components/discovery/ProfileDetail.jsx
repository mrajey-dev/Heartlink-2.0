// src/components/discovery/ProfileDetail.jsx — Seamless Full-Screen Profile Popup
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Pressable,
  ScrollView, Image, Dimensions, FlatList, Animated, PanResponder, Platform, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { ensureArray, formatImageUrl, calculateMatchPercentage, renderVerifiedBadge } from '../../utils/helpers';
import BlurView from '../SafeBlurView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function ProfileDetail({ visible, profile, onClose, onLike, onSuperLike, onPass, isMatch = false }) {
  const insets = useSafeAreaInsets();
  const [sheetPhotoIdx, setSheetPhotoIdx] = useState(0);
  const { isDark, theme } = useTheme();
  const { user: currentUser } = useAuth();
  const styles = useMemo(() => getStyles(theme), [theme]);

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
      Animated.spring(translateY, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: height,
      duration: 220,
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

          {/* Small Fixed Chevron-Down Close Button */}
          <TouchableOpacity style={styles.floatingCloseBtn} onPress={handleClose} activeOpacity={0.75}>
            <Ionicons name="chevron-down" size={20} color="#FFF" />
          </TouchableOpacity>

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
                  <Text style={styles.sheetHeroName}>{profile.display_name || profile.displayName || profile.name || profile.user?.display_name || profile.user?.name}{profile.showAge !== false ? `, ${profile.age || profile.user?.age || ''}` : ''}</Text>
                  {renderVerifiedBadge(profile.user || profile, 20, { marginLeft: 6 })}
                </View>
                <Text style={styles.sheetHeroSub}>{profile.showOccupation !== false ? (profile.occupation || profile.user?.occupation || (profile.job && profile.job !== 'Connections' && profile.job !== 'Member' ? profile.job : null) || 'Member') : 'Member'}</Text>
              </View>
            </View>

            {/* YouTube/iOS Style Centered Drag Handle Line (Slide down to close) */}
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
                    {profile.name || profile.user?.name || profile.full_name || profile.display_name || profile.user?.display_name}
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

              {(onPass || onLike || onSuperLike) ? (
                <View style={styles.sheetActions}>
                  {onPass ? (
                    <TouchableOpacity
                      style={styles.sheetBtnPass}
                      onPress={() => { handleClose(); onPass(profile.id); }}
                    >
                      <Ionicons name="close" size={22} color="#FF375F" />
                      <Text style={styles.sheetBtnPassTxt}>{isMatch ? "Unmatch" : "Pass"}</Text>
                    </TouchableOpacity>
                  ) : null}

                  {onSuperLike && !isMatch ? (
                    <TouchableOpacity
                      style={styles.sheetBtnSuperLike}
                      onPress={() => { handleClose(); onSuperLike(profile.id); }}
                    >
                      <LinearGradient colors={['#7B2CBF', '#9D4EDD']} style={styles.sheetBtnSuperLikeGrad}>
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
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.28)',
  },

  photoNavBtn: {
    position: 'absolute',
    top: '44%',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  photoNavBtnLeft: {
    left: 14,
  },
  photoNavBtnRight: {
    right: 14,
  },

  sheetPhotoWrap: {
    height: height * 0.52 + FIXED_TOP,
    paddingTop: FIXED_TOP,
    width: width,
    overflow: 'hidden',
    position: 'relative',
  },
  sheetPhoto: {
    width: width,
    height: height * 0.52,
    resizeMode: 'cover',
  },
  sheetTopGrad: {
    position: 'absolute',
    top: FIXED_TOP,
    left: 0,
    right: 0,
    height: 80,
    zIndex: 9,
  },
  sheetHeroGrad: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },

  sheetHeroCompat: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 0, 127, 0.85)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sheetHeroCompatNum: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  sheetHeroCompatLbl: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sheetPhotoDots: {
    position: 'absolute',
    top: FIXED_TOP + 4,
    left: 65,
    right: 65,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  sheetDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  sheetDotActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 2,
    elevation: 3,
  },
  sheetHeroNameWrap: {
    position: 'absolute',
    bottom: 18,
    left: 20,
    right: 90,
  },
  sheetHeroName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  sheetHeroSub: {
    fontSize: 13.5,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    marginTop: 2,
  },

  sheetBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  quickFactsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickFact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
  },
  quickFactTxt: {
    fontSize: 12.5,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  sectionBox: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: theme.glass,
    overflow: 'hidden',
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.textPrimary,
    letterSpacing: -0.2,
  },
  bioText: {
    fontSize: 14,
    color: theme.textSec,
    lineHeight: 21,
  },
  attributesGrid: {
    gap: 8,
    marginTop: 4,
  },
  attributePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  attributeText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  goalChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 0, 127, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    marginTop: 4,
  },
  goalChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF007F',
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  interestTag: {
    backgroundColor: theme.cardBg,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
  },
  interestTagText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: theme.textPrimary,
  },

  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  sheetBtnPass: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.80)' : 'rgba(0,0,0,0.04)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  sheetBtnPassTxt: {
    color: '#FF375F',
    fontWeight: '800',
    fontSize: 15,
  },
  sheetBtnLike: {
    flex: 2,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
  },
  sheetBtnLikeGrad: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  sheetBtnLikeTxt: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  sheetBtnSuperLike: {
    flex: 1.5,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
  },
  sheetBtnSuperLikeGrad: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  sheetBtnSuperLikeTxt: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
});