// src/screens/ProfileScreen.jsx — User Profile View & Interactive Settings
import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Image, StatusBar, ScrollView, Dimensions, FlatList, Platform, Modal, ActivityIndicator, Animated, KeyboardAvoidingView,
} from 'react-native';
import BlurView from '../components/SafeBlurView';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../theme/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { updateUserProfile } from '../services/userService';
import { apiUploadImage, apiDeleteImage } from '../services/api';
import { ensureArray, formatImageUrl, renderVerifiedBadge } from '../utils/helpers';
import { ALL_VIBE_NODES, getVibeByName } from '../utils/vibeData';

import CustomAlertModal from '../components/CustomAlertModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { scale, verticalScale, fs, SCREEN } from '../utils/responsive';

const { width, height } = SCREEN;

const FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800',
];

const RELATIONSHIP_OPTIONS = [
  'Long-term relationship',
  'Casual dating',
  'Marriage',
  'Friendship',
];

const MARITAL_OPTIONS = ['Never Married', 'Divorced', 'Widowed', 'Separated'];
const RELIGION_OPTIONS = ['Hinduism', 'Islam', 'Christianity', 'Sikhism', 'Buddhism', 'Jainism', 'Other'];
const EDUCATION_OPTIONS = ["Bachelor's Degree", "Master's Degree", "High School", "Doctorate / PhD", "Other"];
const DIET_OPTIONS = ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Eggetarian'];
const HABIT_OPTIONS = ['Never', 'Socially', 'Frequently'];

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, logout, updateUser } = useAuth();
  const { isDark, theme, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const safeTopSpacing = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44);
  const topHeaderOffset = safeTopSpacing + 6;
  const styles = useMemo(() => getStyles(theme, safeTopSpacing), [theme, safeTopSpacing]);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [heroLoading, setHeroLoading] = useState(false);
  const [thumbLoadingMap, setThumbLoadingMap] = useState({});
  const [isFullScreenViewerOpen, setIsFullScreenViewerOpen] = useState(false);
  const [mainPhotoSuccessAlertVisible, setMainPhotoSuccessAlertVisible] = useState(false);
  const [settingMainPhoto, setSettingMainPhoto] = useState(false);

  const scrollY = React.useRef(new Animated.Value(0)).current;

  const headerBgOpacity = scrollY.interpolate({
    inputRange: [100, 170],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerBgOpacityInverse = scrollY.interpolate({
    inputRange: [100, 170],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const headerNameOpacity = scrollY.interpolate({
    inputRange: [130, 180],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerNameTranslateY = scrollY.interpolate({
    inputRange: [130, 180],
    outputRange: [6, 0],
    extrapolate: 'clamp',
  });

  const morphWidth = scrollY.interpolate({
    inputRange: [0, 180],
    outputRange: [width, 42],
    extrapolate: 'clamp',
  });

  const morphHeight = scrollY.interpolate({
    inputRange: [0, 180],
    outputRange: [height * 0.42, 42],
    extrapolate: 'clamp',
  });

  const morphRadius = scrollY.interpolate({
    inputRange: [0, 180],
    outputRange: [0, 21],
    extrapolate: 'clamp',
  });

  const morphLeft = scrollY.interpolate({
    inputRange: [0, 180],
    outputRange: [0, 62],
    extrapolate: 'clamp',
  });

  const morphTop = scrollY.interpolate({
    inputRange: [0, 180],
    outputRange: [0, topHeaderOffset - 1],
    extrapolate: 'clamp',
  });

  const morphBorderWidth = scrollY.interpolate({
    inputRange: [0, 180],
    outputRange: [0, 2],
    extrapolate: 'clamp',
  });

  const heroImgHeight = scrollY.interpolate({
    inputRange: [0, 180],
    outputRange: [width * 1.33, 42],
    extrapolate: 'clamp',
  });

  const heroControlsOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Extract all photos uploaded by the user during registration
  const allPhotos = useMemo(() => {
    if (!user) return FALLBACK_PHOTOS;

    // DEBUG: trace what photo data exists in user state
    console.log('[ProfileScreen] allPhotos user.photos:', JSON.stringify(user.photos));
    console.log('[ProfileScreen] allPhotos user.images:', JSON.stringify(user.images));
    console.log('[ProfileScreen] allPhotos user.avatar:', user.avatar);

    let rawPhotos = [];
    const uPhotos = ensureArray(user.photos);
    const uImages = ensureArray(user.images);

    if (uPhotos.length > 0) {
      rawPhotos = uPhotos.map(p => (typeof p === 'string' ? p : (p ? (p.photo_url || p.uri) : null))).filter(Boolean);
    } else if (uImages.length > 0) {
      rawPhotos = uImages.filter(Boolean);
    }

    if (user.avatar && !rawPhotos.includes(user.avatar)) {
      rawPhotos.unshift(user.avatar);
    }

    if (user.coverImage && !rawPhotos.includes(user.coverImage)) {
      rawPhotos.unshift(user.coverImage);
    }

    const formattedPhotos = rawPhotos
      .map(p => formatImageUrl(p))
      .filter(p => p && typeof p === 'string' && !p.startsWith('file://') && !p.startsWith('content://'));

    // Remove duplicates while preserving order
    const uniquePhotos = Array.from(new Set(formattedPhotos));

    console.log('[ProfileScreen] allPhotos result:', uniquePhotos);
    return uniquePhotos.length > 0 ? uniquePhotos : FALLBACK_PHOTOS;
  }, [user]);

  // Registered user data
  const profileUser = useMemo(() => {
    const u = user || {};
    const userCity = u.city || null;
    const cityState = userCity ? `${userCity}${u.state ? ', ' + u.state : ''}` : (u.location && u.location !== 'Nearby' ? u.location : 'Nearby');

    return {
      name: u.name || 'Alex Rivera',
      display_name: u.display_name || u.name || 'Alex',
      displayName: u.display_name || u.name || 'Alex',
      age: u.age || 26,
      gender: u.gender || 'Male',
      job: u.occupation || u.job || 'Professional',
      city: userCity || 'Nearby',
      state: u.state || '',
      location: cityState,
      pincode: u.pincode || '',
      bio: u.bio || 'Living life, chasing dreams, and making meaningful connections.',
      relationshipType: u.relationship_type || u.relationshipType || 'Long-term relationship',
      maritalStatus: u.marital_status || 'Never Married',
      motherTongue: u.mother_tongue || 'Hindi',
      languagesSpoken: ensureArray(u.languages_spoken, [u.mother_tongue || 'Hindi', 'English']),
      religion: u.religion || 'Hinduism',
      education: u.education || "Bachelor's Degree",
      diet: u.diet || 'Vegetarian',
      smoking: u.smoking || 'Never',
      drinking: u.drinking || 'Socially',
      clubbing: u.clubbing || 'Never',
      videoIntroUrl: u.video_intro_url || '',
      vibe: u.vibe || 'Late Night Beats',
      interests: ensureArray(u.interests || u.hobbies, ['Design', 'Photography', 'Travel', 'Coffee', 'Music']),
    };
  }, [user]);

  const handlePickVideoIntro = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        const videoUri = res.assets[0].uri;
        updateUser({ video_intro_url: videoUri });
        try {
          await updateUserProfile(user?.id, { video_intro_url: videoUri });
        } catch (e) {
          console.log('Local video intro update saved:', e);
        }
        setSuccessAlertVisible(true);
      }
    } catch (e) {
      console.warn('Video picker error:', e);
    }
  };



  // State for Edit Modal
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editGender, setEditGender] = useState('Male');
  const [editJob, setEditJob] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editRelType, setEditRelType] = useState('');
  const [editMaritalStatus, setEditMaritalStatus] = useState('');
  const [editMotherTongue, setEditMotherTongue] = useState('');
  const [editReligion, setEditReligion] = useState('');
  const [editEducation, setEditEducation] = useState('');
  const [editDiet, setEditDiet] = useState('');
  const [editSmoking, setEditSmoking] = useState('');
  const [editDrinking, setEditDrinking] = useState('');
  const [editClubbing, setEditClubbing] = useState('');
  const [editVibe, setEditVibe] = useState('');
  const [editTagInput, setEditTagInput] = useState('');
  const [editInterests, setEditInterests] = useState([]);
  const [saving, setSaving] = useState(false);

  // Popups & Alerts
  const [logoutAlertVisible, setLogoutAlertVisible] = useState(false);
  const [successAlertVisible, setSuccessAlertVisible] = useState(false);
  const [errorAlertVisible, setErrorAlertVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState(null);

  // Photo Picker & Crop Modal State
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);

  const handlePickPhoto = async (sourceType) => {
    setPhotoPickerVisible(false);
    try {
      let result;
      if (sourceType === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Camera permission is required to take a profile photo.');
          setErrorAlertVisible(true);
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true, // Native pan, zoom, scale & crop tool
          aspect: [4, 5],       // Standard 4:5 portrait dating ratio
          quality: 0.5,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Gallery permission is required to choose a profile photo.');
          setErrorAlertVisible(true);
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true, // Native pan, zoom, scale & crop tool
          aspect: [4, 5],
          quality: 0.5,
          base64: true,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        setUploadingPhoto(true);
        setHeroLoading(true);
        const asset = result.assets[0];
        let imagePayload = asset.uri;
        if (asset.base64) {
          const mime = asset.mimeType || 'image/jpeg';
          imagePayload = `data:${mime};base64,${asset.base64}`;
        }

        const uploadedUrl = await apiUploadImage(imagePayload, { user_id: user?.id, email: user?.email });

        if (!uploadedUrl || typeof uploadedUrl !== 'string' || (!uploadedUrl.startsWith('http://') && !uploadedUrl.startsWith('https://'))) {
          setErrorMsg('Failed to upload profile photo to server. Please try again.');
          setErrorAlertVisible(true);
          return;
        }

        const cleanPrevious = allPhotos.filter(p => typeof p === 'string' && !p.startsWith('file://') && !p.startsWith('content://') && p !== uploadedUrl && p !== asset.uri);
        const validUploaded = uploadedUrl;
        const nextPhotos = [validUploaded, ...cleanPrevious];

        const updatedPayload = {
          avatar: validUploaded,
          photos: nextPhotos,
          images: nextPhotos,
        };

        updateUser(updatedPayload);
        try {
          await updateUserProfile(user?.id, updatedPayload);
        } catch (e) {
          console.log('Online profile update cached locally:', e);
        }
        setSuccessAlertVisible(true);
      }
    } catch (e) {
      console.warn('Photo picker error:', e);
      setErrorMsg(e?.message || 'Failed to upload photo. Inappropriate content or explicit images are strictly prohibited on HeartLink.');
      setErrorAlertVisible(true);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSelectProfilePic = async (selectedPhotoUrl, selectedIndex) => {
    setPhotoIdx(0);
    const otherPhotos = allPhotos.filter((_, i) => i !== selectedIndex);
    const updatedPhotos = [selectedPhotoUrl, ...otherPhotos];

    const updatedPayload = {
      avatar: selectedPhotoUrl,
      photos: updatedPhotos,
      images: updatedPhotos,
    };

    updateUser(updatedPayload);

    try {
      await updateUserProfile(user?.id, updatedPayload);
    } catch (e) {
      console.log('Profile photo update cached locally:', e);
    }
  };

  const currentViewerPhoto = allPhotos[photoIdx] || allPhotos[0];
  const isCurrentMainPhoto = user?.avatar === currentViewerPhoto || profileUser?.avatar === currentViewerPhoto;

  const handleSetMainPhoto = async (targetPhotoUrl) => {
    const photoToSet = targetPhotoUrl || currentViewerPhoto;
    if (!photoToSet) return;
    try {
      setSettingMainPhoto(true);
      await handleSelectProfilePic(photoToSet, photoIdx);
      setMainPhotoSuccessAlertVisible(true);
    } catch (err) {
      console.warn('[ProfileScreen] Error setting main avatar:', err?.message);
      setMainPhotoSuccessAlertVisible(true);
    } finally {
      setSettingMainPhoto(false);
    }
  };

  const handleLongPressPhoto = (photoUrl, index) => {
    if (allPhotos.length <= 1) {
      setErrorMsg('You must keep at least one profile photo.');
      setErrorAlertVisible(true);
      return;
    }
    setPhotoToDelete({ photoUrl, index });
    setDeleteAlertVisible(true);
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    const { photoUrl, index } = photoToDelete;
    setDeleteAlertVisible(false);
    setPhotoToDelete(null);

    const updatedPhotos = allPhotos.filter((p, i) => i !== index && p !== photoUrl);
    const newAvatar = (photoUrl === user?.avatar || photoUrl === profileUser.avatar || index === 0)
      ? (updatedPhotos[0] || null)
      : (user?.avatar || updatedPhotos[0] || null);

    if (photoIdx >= updatedPhotos.length) {
      setPhotoIdx(Math.max(0, updatedPhotos.length - 1));
    }

    const updatedPayload = {
      avatar: newAvatar,
      photos: updatedPhotos,
      images: updatedPhotos,
    };

    updateUser(updatedPayload);

    try {
      await apiDeleteImage(photoUrl);
    } catch (e) {
      console.warn('API delete image file error:', e?.message);
    }

    try {
      await updateUserProfile(user?.id, updatedPayload);
    } catch (e) {
      console.log('Delete photo update cached locally:', e);
    }
  };

  const handleOpenEdit = () => {
    setEditName(profileUser.name);
    setEditDisplayName(user?.display_name || profileUser.display_name || '');
    setEditAge(profileUser.age ? profileUser.age.toString() : '25');
    setEditGender(user?.gender || profileUser.gender || 'Male');
    setEditJob(profileUser.job);
    setEditCity(profileUser.city);
    setEditState(profileUser.state);
    setEditBio(profileUser.bio);
    setEditRelType(profileUser.relationshipType);
    setEditMaritalStatus(profileUser.maritalStatus);
    setEditMotherTongue(profileUser.motherTongue);
    setEditReligion(profileUser.religion);
    setEditEducation(profileUser.education);
    setEditDiet(profileUser.diet);
    setEditSmoking(profileUser.smoking);
    setEditDrinking(profileUser.drinking);
    setEditClubbing(profileUser.clubbing);
    setEditVibe(profileUser.vibe);
    setEditInterests([...ensureArray(profileUser.interests)]);
    setIsEditing(true);
  };

  const handleAddInterest = () => {
    const trimmed = editTagInput.trim();
    const current = ensureArray(editInterests);
    if (trimmed && !current.includes(trimmed)) {
      setEditInterests([...current, trimmed]);
      setEditTagInput('');
    }
  };

  const handleRemoveInterest = (tag) => {
    setEditInterests(ensureArray(editInterests).filter(t => t !== tag));
  };

  const handleSaveProfile = async () => {
    if (!user?.is_verified && !editName.trim()) {
      setErrorMsg('Full name cannot be empty.');
      setErrorAlertVisible(true);
      return;
    }

    setSaving(true);
    const updatedPayload = {
      display_name: editDisplayName.trim() || user?.display_name || (editName.trim() ? editName.trim().split(' ')[0] : 'Member'),
      gender: user?.is_verified ? (user?.gender || editGender) : editGender,
      job: editJob.trim(),
      occupation: editJob.trim(),
      city: editCity.trim(),
      state: editState.trim(),
      bio: editBio.trim(),
      relationship_type: editRelType,
      marital_status: editMaritalStatus,
      mother_tongue: editMotherTongue.trim(),
      religion: editReligion,
      education: editEducation,
      diet: editDiet,
      smoking: editSmoking,
      drinking: editDrinking,
      clubbing: editClubbing,
      vibe: editVibe,
      interests: editInterests,
    };

    if (!user?.is_verified) {
      updatedPayload.name = editName.trim();
      updatedPayload.age = parseInt(editAge, 10) || 25;
      updatedPayload.gender = editGender;
    }

    try {
      const res = await updateUserProfile(user?.id, updatedPayload);
      setSaving(false);
      setIsEditing(false);
      updateUser(res.user || updatedPayload);
      setSuccessAlertVisible(true);
    } catch (err) {
      setSaving(false);
      // Even if offline, update state locally
      updateUser(updatedPayload);
      setIsEditing(false);
      setSuccessAlertVisible(true);
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main', { screen: 'Discover' });
    }
  };

  const handleLogout = () => {
    setLogoutAlertVisible(true);
  };

  const confirmLogout = () => {
    setLogoutAlertVisible(false);
    logout();
  };

  return (
    <LinearGradient colors={theme.bgGrad} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.flex}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />

      {/* Floating background decorative glowing orbs */}
      <View style={styles.glowBlobPurple} pointerEvents="none" />
      <View style={styles.glowBlobCyan} pointerEvents="none" />

      {/* 1. Main Scroll Content (Bottom Layer) */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={styles.scrollContainer}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Ambient Cover Background Banner */}
        <View style={styles.coverBgWrapper}>
          <LinearGradient
            colors={isDark ? ['#2D1537', '#1A0E2A', '#0D0F1A'] : ['#FFEBEF', '#FFF0F5', '#F6F5FA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Profile Details Container */}
        <View style={styles.profileBody}>

          {/* Header Info & Edit Profile Button */}
          <View style={styles.topInfoRow}>
            <View style={styles.nameContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <Text style={styles.profileName}>
                  {profileUser.display_name}{(user?.settings && (user.settings.show_age === false || user.settings.show_age === 0 || user.settings.show_age === '0' || user.settings.show_age === 'false')) ? '' : `, ${profileUser.age}`}
                </Text>
                {renderVerifiedBadge(user, 20, { marginLeft: 6 })}
              </View>
              <View style={styles.subInfoRow}>
                <Ionicons name="briefcase-outline" size={14} color={theme.textSec} style={{ marginRight: 4 }} />
                <Text style={styles.profileSubtext}>{profileUser.job}</Text>
                <Text style={styles.dotSeparator}>•</Text>
                <Ionicons name="location-outline" size={14} color={theme.textSec} style={{ marginRight: 2 }} />
                <Text style={styles.profileSubtext}>{profileUser.location}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.editBtn} onPress={handleOpenEdit} activeOpacity={0.85}>
              <LinearGradient colors={theme.gradientAccent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.editBtnGrad}>
                <Ionicons name="create-outline" size={14} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Your Vibe Section */}
          {(() => {
            const currentVibeObj = getVibeByName(profileUser.vibe);
            return (
              <View style={styles.sectionBox}>
                <BlurView intensity={isDark ? 40 : 70} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="sparkles" size={16} color="#FF007F" style={{ marginRight: 6 }} />
                  <Text style={styles.sectionLabel}>Your Primary Vibe</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <LinearGradient colors={currentVibeObj.color} style={{ width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    <Ionicons name={currentVibeObj.icon} size={20} color="#FFF" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: theme.textPrimary }}>{currentVibeObj.name}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSec, marginTop: 1 }}>{currentVibeObj.tagline}</Text>
                  </View>
                  <View style={{ backgroundColor: 'rgba(255, 0, 127, 0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 0, 127, 0.25)' }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#FF007F' }}>ACTIVE VIBE</Text>
                  </View>
                </View>
              </View>
            );
          })()}

          {/* About Me Section */}
          <View style={styles.sectionBox}>
            <BlurView intensity={isDark ? 40 : 70} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="person-outline" size={16} color="#FF007F" style={{ marginRight: 6 }} />
              <Text style={styles.sectionLabel}>About Me</Text>
            </View>
            <Text style={styles.bioText}>{profileUser.bio}</Text>
          </View>

          {/* Video Introduction Box */}
          <View style={styles.sectionBox}>
            <BlurView intensity={isDark ? 40 : 70} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="videocam-outline" size={16} color="#FF007F" style={{ marginRight: 6 }} />
              <Text style={styles.sectionLabel}>Video Introduction (3x Reach Boost)</Text>
            </View>

            {profileUser.videoIntroUrl ? (
              <View style={styles.videoActiveRow}>
                <Ionicons name="checkmark-circle" size={18} color="#30D158" style={{ marginRight: 6 }} />
                <Text style={styles.videoActiveText}>Video Intro Attached</Text>
                <TouchableOpacity style={styles.videoChangeBtn} onPress={handlePickVideoIntro}>
                  <Text style={styles.videoChangeBtnText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadVideoIntroBtn} onPress={handlePickVideoIntro} activeOpacity={0.8}>
                <Ionicons name="videocam" size={16} color="#FF007F" style={{ marginRight: 6 }} />
                <Text style={styles.uploadVideoIntroText}>Record / Upload 15s Video Intro</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Personal Identity & Lifestyle Section */}
          <View style={styles.sectionBox}>
            <BlurView intensity={isDark ? 40 : 70} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="ribbon-outline" size={16} color="#FF007F" style={{ marginRight: 6 }} />
              <Text style={styles.sectionLabel}>Personal & Lifestyle</Text>
            </View>

            <View style={styles.attributesGrid}>
              <View style={styles.attributePill}>
                <Ionicons name="language-outline" size={14} color="#FF007F" style={{ marginRight: 6 }} />
                <Text style={styles.attributeText}>Mother Tongue: {profileUser.motherTongue}</Text>
              </View>

              <View style={styles.attributePill}>
                <Ionicons name="chatbubbles-outline" size={14} color="#FF007F" style={{ marginRight: 6 }} />
                <Text style={styles.attributeText}>Languages: {profileUser.languagesSpoken.join(', ')}</Text>
              </View>

              <View style={styles.attributePill}>
                <Ionicons name="sparkles-outline" size={14} color="#FF007F" style={{ marginRight: 6 }} />
                <Text style={styles.attributeText}>Religion: {profileUser.religion}</Text>
              </View>

              <View style={styles.attributePill}>
                <Ionicons name="school-outline" size={14} color="#FF007F" style={{ marginRight: 6 }} />
                <Text style={styles.attributeText}>Education: {profileUser.education}</Text>
              </View>

              <View style={styles.attributePill}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#FF007F" style={{ marginRight: 6 }} />
                <Text style={styles.attributeText}>Status: {profileUser.maritalStatus}</Text>
              </View>

              <View style={styles.attributePill}>
                <Ionicons name="restaurant-outline" size={14} color="#FF007F" style={{ marginRight: 6 }} />
                <Text style={styles.attributeText}>Diet: {profileUser.diet}</Text>
              </View>
            </View>
          </View>

          {/* Lifestyle & Dating Habits Box */}
          <View style={styles.sectionBox}>
            <BlurView intensity={isDark ? 40 : 70} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="wine-outline" size={16} color="#FF007F" style={{ marginRight: 6 }} />
              <Text style={styles.sectionLabel}>How I Am To Date (Lifestyle & Habits)</Text>
            </View>

            <View style={styles.attributesGrid}>
              <View style={styles.attributePill}>
                <Ionicons name="flame-outline" size={14} color="#FF007F" style={{ marginRight: 6 }} />
                <Text style={styles.attributeText}>Smoking: {profileUser.smoking}</Text>
              </View>

              <View style={styles.attributePill}>
                <Ionicons name="wine-outline" size={14} color="#FF007F" style={{ marginRight: 6 }} />
                <Text style={styles.attributeText}>Drinking: {profileUser.drinking}</Text>
              </View>

              <View style={styles.attributePill}>
                <Ionicons name="disc-outline" size={14} color="#FF007F" style={{ marginRight: 6 }} />
                <Text style={styles.attributeText}>Nightlife / Clubbing: {profileUser.clubbing}</Text>
              </View>
            </View>
          </View>

          {/* Relationship Goals Section */}
          <View style={styles.sectionBox}>
            <BlurView intensity={isDark ? 40 : 70} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="heart-outline" size={16} color="#FF007F" style={{ marginRight: 6 }} />
              <Text style={styles.sectionLabel}>Looking For</Text>
            </View>
            <View style={styles.goalChip}>
              <Text style={styles.goalChipText}>{profileUser.relationshipType}</Text>
            </View>
          </View>

          {/* Interests Section */}
          <View style={styles.sectionBox}>
            <BlurView intensity={isDark ? 40 : 70} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="sparkles-outline" size={16} color="#FF007F" style={{ marginRight: 6 }} />
              <Text style={styles.sectionLabel}>Interests & Hobbies</Text>
            </View>
            <View style={styles.interestsRow}>
              {profileUser.interests.map((tag, idx) => (
                <View key={idx} style={styles.interestTag}>
                  <Ionicons name="checkmark-circle-outline" size={13} color="#FF007F" style={{ marginRight: 4 }} />
                  <Text style={styles.interestTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Registered Photo Gallery */}
          <View style={styles.galleryContainer}>
            <View style={styles.galleryHeader}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="images-outline" size={16} color="#FF007F" style={{ marginRight: 6 }} />
                <Text style={styles.galleryTitle}>Photo Gallery ({allPhotos.length})</Text>
              </View>
              <TouchableOpacity
                style={styles.addPhotoHeaderBtn}
                onPress={() => setPhotoPickerVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={18} color="#FF007F" style={{ marginRight: 4 }} />
                <Text style={styles.addPhotoHeaderTxt}>Add Photo</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled={true} contentContainerStyle={styles.galleryList}>
              {/* Add Photo Card Tile */}
              <TouchableOpacity
                style={styles.addPhotoCardTile}
                onPress={() => setPhotoPickerVisible(true)}
                activeOpacity={0.8}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="small" color="#FF007F" />
                    <Text style={[styles.addPhotoTileTxt, { fontSize: 10, marginTop: 4 }]}>Uploading...</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="add" size={28} color="#FF007F" />
                    <Text style={styles.addPhotoTileTxt}>Add Photo</Text>
                  </>
                )}
              </TouchableOpacity>

              {allPhotos.map((item, index) => {
                const isCurrentAvatar = item === profileUser.avatar || index === 0;
                const isThumbLoading = !!thumbLoadingMap[index];
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.galleryThumb, isCurrentAvatar && styles.galleryThumbActive]}
                    onPress={() => {
                      setPhotoIdx(index);
                      setIsFullScreenViewerOpen(true);
                    }}
                    onLongPress={() => handleLongPressPhoto(item, index)}
                    delayLongPress={350}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri: item }}
                      style={styles.galleryThumbImg}
                      onLoadStart={() => setThumbLoadingMap(prev => ({ ...prev, [index]: true }))}
                      onLoadEnd={() => setThumbLoadingMap(prev => ({ ...prev, [index]: false }))}
                    />
                    {isThumbLoading && (
                      <View style={styles.thumbLoadingOverlay}>
                        <ActivityIndicator size="small" color="#FF007F" />
                      </View>
                    )}
                    {isCurrentAvatar ? (
                      <View style={styles.avatarBadgeOverlay}>
                        <Ionicons name="star" size={10} color="#FFF" style={{ marginRight: 3 }} />
                        <Text style={styles.avatarBadgeTxt}>Main Pic</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.thumbDeleteBtn}
                        onPress={() => handleLongPressPhoto(item, index)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash" size={11} color="#FFF" />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Animated.ScrollView>

      {/* 2. Fixed Sticky Top Header Background Shield (Middle Layer - masks body scroll) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fixedHeaderBgShield,
          {
            backgroundColor: isDark ? '#0D0F1A' : '#FFFFFF',
            opacity: headerBgOpacity,
          },
        ]}
      />

      {/* 3. Dynamic Morphing Hero Photo (Above background shield, morphs into circle) */}
      <Animated.View
        style={[
          styles.morphPhotoWrapper,
          {
            width: morphWidth,
            height: morphHeight,
            borderRadius: morphRadius,
            left: morphLeft,
            top: morphTop,
            borderWidth: morphBorderWidth,
          },
        ]}
      >
        <View style={StyleSheet.absoluteFill}>
          <Animated.Image
            source={{ uri: user?.avatar || profileUser?.avatar || allPhotos[0] }}
            style={[styles.heroImg, { height: heroImgHeight }]}
            onLoadStart={() => setHeroLoading(true)}
            onLoadEnd={() => setHeroLoading(false)}
          />
        </View>
        {(heroLoading || uploadingPhoto) && (
          <View style={styles.heroLoadingOverlay}>
            <ActivityIndicator size="large" color="#FF007F" />
          </View>
        )}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: heroControlsOpacity }]} pointerEvents="box-none">
          <LinearGradient colors={['rgba(0,0,0,0.22)', 'transparent']} style={styles.heroTopGrad} />
          <LinearGradient colors={['transparent', theme.isDark ? '#0D0F1A' : '#F6F5FA']} style={styles.heroBottomGrad} />

          {/* Change Photo Floating Badge */}
          <TouchableOpacity
            style={styles.changePhotoBtn}
            onPress={() => setPhotoPickerVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.changePhotoTxt}>Change Photo</Text>
          </TouchableOpacity>

          {/* Photo Indicator Dots */}
          {allPhotos.length > 1 && (
            <View style={styles.photoIndicatorRow}>
              {allPhotos.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setPhotoIdx(i)}
                  style={[styles.indicatorBar, i === photoIdx && styles.indicatorBarActive]}
                />
              ))}
            </View>
          )}
        </Animated.View>
      </Animated.View>

      {/* 4. Fixed Sticky Top Header Controls (Top Layer - Back button, Title, Settings gear) */}
      <View style={styles.fixedHeaderContainer} pointerEvents="box-none">
        <View style={styles.fixedHeaderContent}>
          <TouchableOpacity
            style={styles.solidControlBtn}
            onPress={handleBack}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color={isDark ? "#FFFFFF" : "#000000"} />
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.fixedHeaderNameWrap,
              {
                opacity: headerNameOpacity,
                transform: [{ translateY: headerNameTranslateY }],
              },
            ]}
            pointerEvents="none"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text
                style={[
                  styles.fixedHeaderName,
                  { color: isDark ? '#FFFFFF' : '#000000' },
                ]}
                numberOfLines={1}
              >
                {profileUser.name}
              </Text>
              {renderVerifiedBadge(user, 16, { marginLeft: 4 })}
            </View>
          </Animated.View>

          <TouchableOpacity
            style={styles.solidControlBtn}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="settings-outline" size={20} color={isDark ? "#FFFFFF" : "#000000"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Interactive Edit Profile Modal ───────────────────────────── */}
      <Modal visible={isEditing} animationType="slide" transparent onRequestClose={() => setIsEditing(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.editModalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              {/* Full Name (Single Line) */}
              <View style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  {user?.is_verified && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="lock-closed" size={11} color="#00C853" style={{ marginRight: 3 }} />
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#00C853' }}>Verified (Locked)</Text>
                    </View>
                  )}
                </View>
                <TextInput
                  style={[
                    styles.modalInput,
                    user?.is_verified && { opacity: 0.65, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }
                  ]}
                  value={editName}
                  onChangeText={setEditName}
                  editable={!user?.is_verified}
                  maxLength={25}
                  placeholder="Full Name"
                  placeholderTextColor={theme.textFaint}
                />
              </View>

              {/* Display Name (Single Line) — ALWAYS EDITABLE */}
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.inputLabel}>Display Name</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editDisplayName}
                  onChangeText={setEditDisplayName}
                  editable={true}
                  maxLength={25}
                  placeholder="Display Name"
                  placeholderTextColor={theme.textFaint}
                />
              </View>

              {/* Age & Job / Profession Row */}
              <View style={styles.rowTwo}>
                {/* Age */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={styles.inputLabel}>Age</Text>
                    {user?.is_verified && (
                      <Ionicons name="lock-closed" size={11} color="#00C853" />
                    )}
                  </View>
                  <TextInput
                    style={[
                      styles.modalInput,
                      user?.is_verified && { opacity: 0.65, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }
                    ]}
                    value={editAge}
                    onChangeText={setEditAge}
                    editable={!user?.is_verified}
                    keyboardType="numeric"
                    placeholder="Age"
                    placeholderTextColor={theme.textFaint}
                  />
                </View>

                {/* Job / Profession */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Job / Profession</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editJob}
                    onChangeText={setEditJob}
                    placeholder="Job Title"
                    placeholderTextColor={theme.textFaint}
                  />
                </View>
              </View>

              {/* Gender (Locked on Aadhaar Verification) */}
              <View style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={styles.inputLabel}>Gender</Text>
                  {user?.is_verified && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="lock-closed" size={11} color="#00C853" style={{ marginRight: 3 }} />
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#00C853' }}>Verified (Locked)</Text>
                    </View>
                  )}
                </View>
                {user?.is_verified ? (
                  <View style={[styles.modalInput, { opacity: 0.65, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', justifyContent: 'center' }]}>
                    <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '600' }}>{user?.gender || editGender}</Text>
                  </View>
                ) : (
                  <View style={styles.relChipRow}>
                    {['Male', 'Female'].map(g => (
                      <TouchableOpacity
                        key={g}
                        style={[styles.relChip, editGender === g && styles.relChipActive]}
                        onPress={() => setEditGender(g)}
                      >
                        <Text style={[styles.relChipText, editGender === g && styles.relChipTextActive]}>{g}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Location */}
              <View style={styles.rowTwo}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editCity}
                    onChangeText={setEditCity}
                    placeholder="City"
                    placeholderTextColor={theme.textFaint}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>State</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editState}
                    onChangeText={setEditState}
                    placeholder="State"
                    placeholderTextColor={theme.textFaint}
                  />
                </View>
              </View>

              {/* Select Your Primary Vibe */}
              <Text style={styles.inputLabel}>Select Your Primary Vibe</Text>
              <View style={styles.relChipRow}>
                {ALL_VIBE_NODES.map(v => (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.relChip, editVibe === v.name && styles.relChipActive]}
                    onPress={() => setEditVibe(v.name)}
                  >
                    <Ionicons name={v.icon} size={12} color={editVibe === v.name ? '#FFF' : theme.textSec} style={{ marginRight: 4 }} />
                    <Text style={[styles.relChipText, editVibe === v.name && styles.relChipTextActive]}>{v.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Relationship Goal */}
              <Text style={styles.inputLabel}>Looking For</Text>
              <View style={styles.relChipRow}>
                {RELATIONSHIP_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.relChip, editRelType === opt && styles.relChipActive]}
                    onPress={() => setEditRelType(opt)}
                  >
                    <Text style={[styles.relChipText, editRelType === opt && styles.relChipTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Marital Status */}
              <Text style={styles.inputLabel}>Marital Status</Text>
              <View style={styles.relChipRow}>
                {MARITAL_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.relChip, editMaritalStatus === opt && styles.relChipActive]}
                    onPress={() => setEditMaritalStatus(opt)}
                  >
                    <Text style={[styles.relChipText, editMaritalStatus === opt && styles.relChipTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Mother Tongue */}
              <Text style={styles.inputLabel}>Mother Tongue</Text>
              <TextInput
                style={styles.modalInput}
                value={editMotherTongue}
                onChangeText={setEditMotherTongue}
                placeholder="e.g. Hindi, English, Marathi"
                placeholderTextColor={theme.textFaint}
              />

              {/* Religion */}
              <Text style={styles.inputLabel}>Religion & Faith</Text>
              <View style={styles.relChipRow}>
                {RELIGION_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.relChip, editReligion === opt && styles.relChipActive]}
                    onPress={() => setEditReligion(opt)}
                  >
                    <Text style={[styles.relChipText, editReligion === opt && styles.relChipTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Education Level */}
              <Text style={styles.inputLabel}>Education Level</Text>
              <View style={styles.relChipRow}>
                {EDUCATION_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.relChip, editEducation === opt && styles.relChipActive]}
                    onPress={() => setEditEducation(opt)}
                  >
                    <Text style={[styles.relChipText, editEducation === opt && styles.relChipTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Diet */}
              <Text style={styles.inputLabel}>Diet Preference</Text>
              <View style={styles.relChipRow}>
                {DIET_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.relChip, editDiet === opt && styles.relChipActive]}
                    onPress={() => setEditDiet(opt)}
                  >
                    <Text style={[styles.relChipText, editDiet === opt && styles.relChipTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Habits: Smoking, Drinking, Clubbing */}
              <Text style={styles.inputLabel}>Smoking Habit</Text>
              <View style={styles.relChipRow}>
                {HABIT_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.relChip, editSmoking === opt && styles.relChipActive]}
                    onPress={() => setEditSmoking(opt)}
                  >
                    <Text style={[styles.relChipText, editSmoking === opt && styles.relChipTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Drinking Habit</Text>
              <View style={styles.relChipRow}>
                {HABIT_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.relChip, editDrinking === opt && styles.relChipActive]}
                    onPress={() => setEditDrinking(opt)}
                  >
                    <Text style={[styles.relChipText, editDrinking === opt && styles.relChipTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Clubbing Habit</Text>
              <View style={styles.relChipRow}>
                {HABIT_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.relChip, editClubbing === opt && styles.relChipActive]}
                    onPress={() => setEditClubbing(opt)}
                  >
                    <Text style={[styles.relChipText, editClubbing === opt && styles.relChipTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Bio */}
              <Text style={styles.inputLabel}>About Me (Bio)</Text>
              <TextInput
                style={[styles.modalInput, styles.multilineInput]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Write something about yourself..."
                placeholderTextColor={theme.textFaint}
                multiline
                numberOfLines={3}
              />

              {/* Interests */}
              <Text style={styles.inputLabel}>Interests & Hobbies</Text>
              <View style={styles.tagInputRow}>
                <TextInput
                  style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                  value={editTagInput}
                  onChangeText={setEditTagInput}
                  placeholder="Add an interest (e.g. Hiking)"
                  placeholderTextColor={theme.textFaint}
                />
                <TouchableOpacity style={styles.addTagBtn} onPress={handleAddInterest}>
                  <Text style={styles.addTagBtnText}>Add</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.editInterestsRow}>
                {editInterests.map((t, idx) => (
                  <View key={idx} style={styles.editableTag}>
                    <Text style={styles.editableTagText}>{t}</Text>
                    <TouchableOpacity onPress={() => handleRemoveInterest(t)}>
                      <Ionicons name="close-circle" size={16} color="#FF007F" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Save Button */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={theme.gradientAccent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtnGrad}>
                <Text style={styles.saveBtnText}>{saving ? 'Saving Changes...' : 'Save Profile Changes'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 3. Dynamic Morphing Hero Photo (Above background shield, morphs into circle) */}
      <Animated.View
        style={[
          styles.morphPhotoWrapper,
          {
            width: morphWidth,
            height: morphHeight,
            borderRadius: morphRadius,
            left: morphLeft,
            top: morphTop,
            borderWidth: morphBorderWidth,
          },
        ]}
      >
        <View style={StyleSheet.absoluteFill}>
          <Animated.Image
            source={{ uri: user?.avatar || profileUser?.avatar || allPhotos[0] }}
            style={[styles.heroImg, { height: heroImgHeight }]}
            onLoadStart={() => setHeroLoading(true)}
            onLoadEnd={() => setHeroLoading(false)}
          />
        </View>
        {(heroLoading || uploadingPhoto) && (
          <View style={styles.heroLoadingOverlay}>
            <ActivityIndicator size="large" color="#FF007F" />
          </View>
        )}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: heroControlsOpacity }]} pointerEvents="box-none">
          <LinearGradient colors={['rgba(0,0,0,0.22)', 'transparent']} style={styles.heroTopGrad} />
          <LinearGradient colors={['transparent', theme.isDark ? '#0D0F1A' : '#F6F5FA']} style={styles.heroBottomGrad} />

          {/* Change Photo Floating Badge */}
          <TouchableOpacity
            style={styles.changePhotoBtn}
            onPress={() => setPhotoPickerVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.changePhotoTxt}>Change Photo</Text>
          </TouchableOpacity>

          {/* Photo Indicator Dots */}
          {allPhotos.length > 1 && (
            <View style={styles.photoIndicatorRow}>
              {allPhotos.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setPhotoIdx(i)}
                  style={[styles.indicatorBar, i === photoIdx && styles.indicatorBarActive]}
                />
              ))}
            </View>
          )}
        </Animated.View>
      </Animated.View>

      {/* 4. Fixed Sticky Top Header Controls (Top Layer - Back button, Title, Settings gear) */}
      <View style={styles.fixedHeaderContainer} pointerEvents="box-none">
        <View style={styles.fixedHeaderContent}>
          <TouchableOpacity
            style={styles.solidControlBtn}
            onPress={handleBack}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color={isDark ? "#FFFFFF" : "#000000"} />
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.fixedHeaderNameWrap,
              {
                opacity: headerNameOpacity,
                transform: [{ translateY: headerNameTranslateY }],
              },
            ]}
            pointerEvents="none"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text
                style={[
                  styles.fixedHeaderName,
                  { color: isDark ? '#FFFFFF' : '#000000' },
                ]}
                numberOfLines={1}
              >
                {profileUser.name}
              </Text>
              {renderVerifiedBadge(user, 16, { marginLeft: 4 })}
            </View>
          </Animated.View>

          <TouchableOpacity
            style={styles.solidControlBtn}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="settings-outline" size={20} color={isDark ? "#FFFFFF" : "#000000"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Custom Alert Modals */}
      <CustomAlertModal
        visible={logoutAlertVisible}
        title="Logout"
        message="Are you sure you want to log out of HeartLink?"
        icon="log-out-outline"
        iconColor="#FF007F"
        confirmText="Logout"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={confirmLogout}
        onCancel={() => setLogoutAlertVisible(false)}
      />

      <CustomAlertModal
        visible={successAlertVisible}
        title="Profile Updated!"
        message="Your profile details have been saved to your account."
        icon="checkmark-circle-outline"
        iconColor="#30D158"
        confirmText="Awesome"
        onConfirm={() => setSuccessAlertVisible(false)}
      />

      <CustomAlertModal
        visible={errorAlertVisible}
        title="Notice"
        message={errorMsg}
        icon="alert-circle-outline"
        iconColor="#FF007F"
        confirmText="Got it"
        onConfirm={() => setErrorAlertVisible(false)}
      />

      <CustomAlertModal
        visible={mainPhotoSuccessAlertVisible}
        title="Main Profile Photo Set!"
        message="This photo is now set as your primary profile photo visible to other users across HeartLink."
        icon="star"
        iconColor="#FFD700"
        confirmText="Awesome"
        onConfirm={() => setMainPhotoSuccessAlertVisible(false)}
      />

      <CustomAlertModal
        visible={deleteAlertVisible}
        title="Delete Photo?"
        message="Are you sure you want to remove this photo from your profile?"
        icon="trash-outline"
        iconColor="#FF375F"
        confirmText="Delete Photo"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={confirmDeletePhoto}
        onCancel={() => setDeleteAlertVisible(false)}
      />

      {/* Photo Picker & Crop Choice Sheet */}
      <Modal
        visible={photoPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setPhotoPickerVisible(false)}
        >
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Set Profile Picture</Text>
            <Text style={styles.pickerSub}>Select an option to choose and crop your photo</Text>

            <TouchableOpacity
              style={styles.pickerOption}
              onPress={() => handlePickPhoto('camera')}
            >
              <View style={[styles.pickerIconWrap, { backgroundColor: 'rgba(255, 0, 127, 0.12)' }]}>
                <Ionicons name="camera-outline" size={22} color="#FF007F" />
              </View>
              <View style={styles.pickerOptionTxtWrap}>
                <Text style={styles.pickerOptionTitle}>Take Photo</Text>
                <Text style={styles.pickerOptionSub}>Use camera & crop picture</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textFaint} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerOption}
              onPress={() => handlePickPhoto('gallery')}
            >
              <View style={[styles.pickerIconWrap, { backgroundColor: 'rgba(0, 191, 255, 0.12)' }]}>
                <Ionicons name="images-outline" size={22} color="#00BFFF" />
              </View>
              <View style={styles.pickerOptionTxtWrap}>
                <Text style={styles.pickerOptionTitle}>Choose from Gallery</Text>
                <Text style={styles.pickerOptionSub}>Select from photos & crop to fit</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textFaint} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerCancelBtn}
              onPress={() => setPhotoPickerVisible(false)}
            >
              <Text style={styles.pickerCancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Full Screen Photo Viewer Modal */}
      <Modal
        visible={isFullScreenViewerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFullScreenViewerOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#000000', position: 'relative', justifyContent: 'center', alignItems: 'center' }}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />

          {/* Full Screen Photo Backdrop */}
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFill}
            onPress={(e) => {
              const touchX = e.nativeEvent.locationX;
              if (allPhotos.length > 1) {
                if (touchX < width / 2) {
                  setPhotoIdx(prev => (prev > 0 ? prev - 1 : allPhotos.length - 1));
                } else {
                  setPhotoIdx(prev => (prev < allPhotos.length - 1 ? prev + 1 : 0));
                }
              }
            }}
          >
            <Image
              source={{ uri: allPhotos[photoIdx] || allPhotos[0] }}
              style={{ width: width, height: height * 0.85, resizeMode: 'contain', backgroundColor: '#000000' }}
            />
          </TouchableOpacity>

          {/* Top Ambient Black Gradient */}
          <LinearGradient
            colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.3)', 'transparent']}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: safeTopSpacing + 75,
              zIndex: 40,
            }}
            pointerEvents="none"
          />

          {/* Bottom Ambient Black Gradient */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)']}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 140,
              zIndex: 40,
            }}
            pointerEvents="none"
          />

          {/* Close (X) Button */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: safeTopSpacing + 10,
              right: 20,
              zIndex: 60,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.3)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => setIsFullScreenViewerOpen(false)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Previous Photo Button (Left Side) */}
          {allPhotos.length > 1 && (
            <TouchableOpacity
              style={{
                position: 'absolute',
                left: 16,
                top: height / 2 - 26,
                zIndex: 60,
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                borderWidth: 1.5,
                borderColor: 'rgba(255, 255, 255, 0.3)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => setPhotoIdx(prev => (prev > 0 ? prev - 1 : allPhotos.length - 1))}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={30} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* Next Photo Button (Right Side) */}
          {allPhotos.length > 1 && (
            <TouchableOpacity
              style={{
                position: 'absolute',
                right: 16,
                top: height / 2 - 26,
                zIndex: 60,
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                borderWidth: 1.5,
                borderColor: 'rgba(255, 255, 255, 0.3)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => setPhotoIdx(prev => (prev < allPhotos.length - 1 ? prev + 1 : 0))}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={30} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* Bottom Actions Container */}
          <View
            style={{
              position: 'absolute',
              bottom: safeTopSpacing + 18,
              alignSelf: 'center',
              alignItems: 'center',
              gap: 10,
              zIndex: 60,
              width: '90%',
            }}
          >
            {/* Separate Option Button to Set Profile Photo */}
            {isCurrentMainPhoto ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255, 215, 0, 0.25)',
                  borderWidth: 1.5,
                  borderColor: '#FFD700',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 25,
                  gap: 8,
                }}
              >
                <Ionicons name="star" size={18} color="#FFD700" />
                <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: 13 }}>
                  Main Profile Photo
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FF007F',
                  paddingHorizontal: 20,
                  paddingVertical: 11,
                  borderRadius: 25,
                  gap: 8,
                  shadowColor: '#FF007F',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                  elevation: 6,
                }}
                onPress={() => handleSetMainPhoto(allPhotos[photoIdx])}
                disabled={settingMainPhoto}
                activeOpacity={0.8}
              >
                {settingMainPhoto ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="person-circle-outline" size={20} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 }}>
                      Set as Main Profile Photo
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Photo Indicator Dots */}
            {allPhotos.length > 1 && (
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                }}
              >
                {allPhotos.map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setPhotoIdx(i)}
                    style={{
                      width: i === photoIdx ? 24 : 10,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: i === photoIdx ? '#FF007F' : 'rgba(255, 255, 255, 0.45)',
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const getStyles = (theme, safeTopSpacing = 44) => StyleSheet.create({
  flex: { flex: 1 },
  scrollContainer: {
    paddingTop: height * 0.42 + safeTopSpacing + 10,
    paddingBottom: 110,
  },

  // Dynamic Morphing Hero Photo
  morphPhotoWrapper: {
    position: 'absolute',
    zIndex: 105,
    elevation: 105,
    overflow: 'hidden',
    borderColor: '#FF007F',
    backgroundColor: '#1E1938',
  },

  fixedHeaderBgShield: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: safeTopSpacing + 54,
    zIndex: 90,
    elevation: 90,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
  },
  fixedHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 110,
    elevation: 110,
    paddingTop: safeTopSpacing + 6,
    paddingBottom: 8,
  },
  fixedHeaderBg: {
    ...StyleSheet.absoluteFillObject,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
  },
  fixedHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 40,
    position: 'relative',
  },
  fixedHeaderNameWrap: {
    position: 'absolute',
    left: 112,
    right: 60,
    alignItems: 'flex-start',
  },
  fixedHeaderName: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  solidControlBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 110,
    zIndex: 110,
  },

  coverBgWrapper: {
    height: height * 0.42,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },

  // Background Glowing Orbs
  glowBlobPurple: {
    position: 'absolute',
    top: height * 0.35,
    right: -85,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(168, 85, 247, 0.14)',
    opacity: 0.8,
    zIndex: 0,
  },
  glowBlobCyan: {
    position: 'absolute',
    bottom: height * 0.1,
    left: -85,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    opacity: 0.7,
    zIndex: 0,
  },

  // Hero Photo Wrapper
  heroPhotoWrapper: {
    height: height * 0.44,
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
  },
  heroLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  heroLoadingText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  thumbLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    resizeMode: 'cover',
  },
  heroTopGrad: {
    position: 'absolute',
    left: 0, right: 0, top: 0,
    height: 70,
  },
  heroBottomGrad: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: 140,
  },

  // Header Nav Bar
  headerBar: {
    position: 'absolute',
    left: 0, right: 0, top: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 35,
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: 10,
  },
  glassBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Photo Dots
  photoIndicatorRow: {
    position: 'absolute',
    bottom: 28,
    left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    zIndex: 10,
  },
  indicatorBar: {
    width: 14,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  indicatorBarActive: {
    width: 28,
    backgroundColor: '#fff',
  },

  // Profile Body
  profileBody: {
    paddingHorizontal: 20,
    marginTop: -20,
    zIndex: 20,
  },
  topInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  nameContainer: {
    flex: 1,
    paddingRight: 10,
    marginTop: 20,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.textPrimary,
    letterSpacing: -0.5,
  },
  subInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  profileSubtext: {
    fontSize: 13,
    color: theme.textSec,
    fontWeight: '500',
  },
  dotSeparator: {
    color: theme.textFaint,
    marginHorizontal: 6,
  },

  editBtn: {
    borderRadius: 50,
    overflow: 'hidden',
  },
  editBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 9,
  },
  editBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },

  // Section Box
  sectionBox: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
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
  videoActiveRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(48,209,88,0.1)', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: '#30D158' },
  videoActiveText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#30D158' },
  videoChangeBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: '#30D158' },
  videoChangeBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  uploadVideoIntroBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,0,127,0.08)', paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,0,127,0.3)', borderStyle: 'dashed' },
  uploadVideoIntroText: { color: '#FF007F', fontSize: 13, fontWeight: '800' },
  attributesGrid: { gap: 8, marginTop: 4 },
  attributePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: theme.border },
  attributeText: { fontSize: 13, fontWeight: '600', color: theme.textPrimary },

  // Relationship goal chip
  goalChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 0, 127, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 127, 0.3)',
    marginTop: 4,
  },
  goalChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF007F',
  },

  // Interests Tags
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
    borderWidth: 1,
    borderColor: theme.border,
  },
  interestTagText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: theme.textPrimary,
  },

  // Gallery
  galleryContainer: {
    marginTop: 4,
    marginBottom: 14,
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  galleryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  addPhotoHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 0, 127, 0.1)',
  },
  addPhotoHeaderTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF007F',
  },
  galleryList: {
    gap: 12,
  },
  addPhotoCardTile: {
    width: 110,
    height: 140,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#FF007F',
    backgroundColor: theme.isDark ? 'rgba(255, 0, 127, 0.08)' : 'rgba(255, 0, 127, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoTileTxt: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FF007F',
    marginTop: 4,
  },
  galleryThumb: {
    width: 110,
    height: 140,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: theme.border,
  },
  galleryThumbActive: {
    borderColor: '#FF007F',
    borderWidth: 2.5,
  },
  galleryThumbImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbDeleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 55, 95, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  avatarBadgeOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 0, 127, 0.85)',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  avatarBadgeTxt: {
    color: '#FFF',
    fontSize: 9.5,
    fontWeight: '800',
  },

  // ─── Edit Modal Styling ─────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  editModalContainer: {
    maxHeight: '90%',
    height: '85%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    padding: 22,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.isDark ? '#0F0921' : '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.textPrimary,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    paddingBottom: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textSec,
    marginBottom: 6,
    marginTop: 12,
  },
  modalInput: {
    backgroundColor: theme.cardBg,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: theme.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 4,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 12,
  },
  relChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  relChip: {
    backgroundColor: theme.cardBg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  relChipActive: {
    backgroundColor: 'rgba(255, 0, 127, 0.15)',
    borderColor: '#FF007F',
  },
  relChipText: {
    fontSize: 12.5,
    color: theme.textSec,
    fontWeight: '600',
  },
  relChipTextActive: {
    color: '#FF007F',
    fontWeight: '800',
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addTagBtn: {
    backgroundColor: '#FF007F',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  addTagBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  editInterestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  editableTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.cardBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  editableTagText: {
    fontSize: 12,
    color: theme.textPrimary,
    fontWeight: '600',
  },
  saveBtn: {
    marginTop: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  saveBtnGrad: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },

  // Floating Change Photo Button
  changePhotoBtn: {
    position: 'absolute',
    bottom: 22,
    right: 18,
    backgroundColor: 'rgba(5, 2, 12, 0.82)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    zIndex: 40,
  },
  changePhotoTxt: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Photo Picker Choice Sheet
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 2, 12, 0.85)',
    justifyContent: 'flex-end',
  },
  pickerCard: {
    backgroundColor: theme.isDark ? '#1C1433' : '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.08)',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.textPrimary,
    letterSpacing: -0.3,
  },
  pickerSub: {
    fontSize: 13,
    color: theme.textSec,
    marginTop: 4,
    marginBottom: 20,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  pickerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  pickerOptionTxtWrap: {
    flex: 1,
  },
  pickerOptionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  pickerOptionSub: {
    fontSize: 12,
    color: theme.textSec,
    marginTop: 2,
  },
  pickerCancelBtn: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
  },
  pickerCancelTxt: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.textPrimary,
  },
});