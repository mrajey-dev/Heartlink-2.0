// src/screens/SettingsScreen.jsx — Settings, Privacy & Preferences
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Switch, Modal, FlatList, Image, Alert, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import CustomAlertModal from '../components/CustomAlertModal';
import AadhaarVerificationModal from '../components/AadhaarVerificationModal';
import SearchableDropdownModal from '../components/common/SearchableDropdownModal';
import {
  apiGetBlockedUsers, apiUnblockUser,
  apiDeactivateAccount, apiDeleteAccount,
  apiGetUserSettings, apiUpdateUserSettings,
  apiVerifyUserProfile, apiGetProfile,
} from '../services/api';
import { formatImageUrl, renderVerifiedBadge } from '../utils/helpers';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { theme, isDark, toggleTheme } = useTheme();
  const { user, logout, updateUser } = useAuth();
  const styles = useMemo(() => getStyles(theme), [theme]);

  // ─── 0. Loading & Verification State ──────────────────────────────────────
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [aadhaarModalVisible, setAadhaarModalVisible] = useState(false);

  // ─── 1. Notifications State ───────────────────────────────────────────────
  const [notificationsOn, setNotificationsOn] = useState(true);

  // ─── 2. Privacy & Profile Visibility Toggles ─────────────────────────────
  const [showAge, setShowAge] = useState(true);
  const [showDistance, setShowDistance] = useState(true);
  const [showOccupation, setShowOccupation] = useState(true);
  const [hideEducation, setHideEducation] = useState(false);

  // ─── 4. Match & Discovery Preference Filters ──────────────────────────────
  const [distanceFilter, setDistanceFilter] = useState('50 km');
  const [ageRangeFilter, setAgeRangeFilter] = useState('18 - 35');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [hasBioOnly, setHasBioOnly] = useState(false);
  const [commonInterestsOnly, setCommonInterestsOnly] = useState(false);
  const [educationFilter, setEducationFilter] = useState('Any');
  const [religionFilter, setReligionFilter] = useState('Any');
  const [languageFilter, setLanguageFilter] = useState('Any');

  // ─── 5. Blocked Users Modal ───────────────────────────────────────────────
  const [blockedModalVisible, setBlockedModalVisible] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  // ─── 6. Privacy Policy & Disclaimer Modals ───────────────────────────────
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [disclaimerModalVisible, setDisclaimerModalVisible] = useState(false);

  // ─── 7. Account Action Modals ─────────────────────────────────────────────
  const [deactivateAlertVisible, setDeactivateAlertVisible] = useState(false);
  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  };

  const handleVerifyProfile = () => {
    setAadhaarModalVisible(true);
  };

  // Helper to persist individual toggle or preference updates to backend
  const updateSettingField = async (key, val, stateSetter, label) => {
    stateSetter(val);
    try {
      await apiUpdateUserSettings({ [key]: val });
      if (label) {
        triggerToast(`${label} updated`);
      }
    } catch (err) {
      console.warn(`Failed to update ${key}:`, err);
      Alert.alert('Error', 'Failed to save setting to server.');
    }
  };

  // Load user settings from backend on component mount
  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      try {
        const profileRes = await apiGetProfile().catch(() => null);
        if (profileRes?.user && isMounted) {
          updateUser(profileRes.user);
        }

        const res = await apiGetUserSettings();
        if (res?.settings && isMounted) {
          const s = res.settings;
          if (s.notifications_on !== undefined) setNotificationsOn(!!s.notifications_on);
          if (s.show_age !== undefined) setShowAge(!!s.show_age);
          if (s.show_distance !== undefined) setShowDistance(!!s.show_distance);
          if (s.show_occupation !== undefined) setShowOccupation(!!s.show_occupation);
          if (s.hide_education !== undefined) setHideEducation(!!s.hide_education);
          if (s.distance_filter) setDistanceFilter(s.distance_filter);
          if (s.age_range_filter) setAgeRangeFilter(s.age_range_filter);
          if (s.verified_only !== undefined) setVerifiedOnly(!!s.verified_only);
          if (s.has_bio_only !== undefined) setHasBioOnly(!!s.has_bio_only);
          if (s.common_interests_only !== undefined) setCommonInterestsOnly(!!s.common_interests_only);
          if (s.education_filter) setEducationFilter(s.education_filter);
          if (s.religion_filter) setReligionFilter(s.religion_filter);
          if (s.language_filter) setLanguageFilter(s.language_filter);
        }
      } catch (err) {
        console.warn('Failed to load user settings from backend:', err);
      } finally {
        if (isMounted) setLoadingSettings(false);
      }
    };
    loadSettings();
    return () => { isMounted = false; };
  }, []);

  // Active subscription plan name detection (Strict Backend DB Check)
  const activePlanName = useMemo(() => {
    if (!user) return null;
    const plan = user.subscription_plan || user.activeSubscription?.plan_name || user.active_subscription?.plan_name || user.plan;
    if (!plan || typeof plan !== 'string') return null;
    const lower = plan.trim().toLowerCase();
    if (!lower || lower === 'free' || lower === 'null' || lower === 'none' || lower === 'basic_free') return null;
    return plan;
  }, [user]);

  // Dynamic Plan Theme: Golden for Premium, Blue for Basic, Purple for Plus
  const planTheme = useMemo(() => {
    if (!activePlanName) return null;
    const lower = activePlanName.toLowerCase();

    // 1. Premium Plan -> Radiant Metallic Gold
    if (lower.includes('premium')) {
      return {
        key: 'premium',
        name: 'HeartLink Premium',
        gradient: ['#D97706', '#B45309', '#78350F'], // Smooth Radiant Gold
        accent: '#F59E0B',
        shadowColor: '#D97706',
        borderColor: 'rgba(251, 191, 36, 0.45)',
        icon: 'diamond',
        iconBg: 'rgba(255, 255, 255, 0.22)',
        perks: ['Unlimited Likes', '10x Matches', 'Golden Tick'],
      };
    }

    // 2. Plus Plan -> Royal Purple
    if (lower.includes('plus') || lower.includes('plue')) {
      return {
        key: 'plus',
        name: 'HeartLink Plus',
        gradient: ['#9333EA', '#7E22CE', '#3B0764'], // Smooth Royal Purple
        accent: '#A855F7',
        shadowColor: '#9333EA',
        borderColor: 'rgba(192, 132, 252, 0.45)',
        icon: 'star',
        iconBg: 'rgba(255, 255, 255, 0.22)',
        perks: ['Unlimited Likes', 'See Who Liked You', 'Passport'],
      };
    }

    // 3. Basic Plan -> Oceanic Sapphire Blue
    if (lower.includes('basic')) {
      return {
        key: 'basic',
        name: 'HeartLink Basic',
        gradient: ['#0284C7', '#0369A1', '#075985'], // Smooth Oceanic Blue
        accent: '#0284C7',
        shadowColor: '#0284C7',
        borderColor: 'rgba(56, 189, 248, 0.45)',
        icon: 'flash',
        iconBg: 'rgba(255, 255, 255, 0.22)',
        perks: ['Verified Blue Tick', 'Rewind Swipes', 'Daily Boosts'],
      };
    }

    // Default Fallback
    return {
      key: 'active',
      name: activePlanName,
      gradient: ['#E11D48', '#BE123C', '#881337'], // Deep Rose
      accent: '#FF007F',
      shadowColor: '#FF007F',
      borderColor: 'rgba(255, 0, 127, 0.45)',
      icon: 'sparkles',
      iconBg: 'rgba(255, 255, 255, 0.22)',
      perks: ['Full Access', 'Verified Status', 'Active Perks'],
    };
  }, [activePlanName]);

  // Subscription expiry date extraction from backend DB user object
  const expiryDate = useMemo(() => {
    if (!user) return null;
    const activeSub = user.active_subscription || user.activeSubscription || user.subscription;
    const raw = activeSub?.expires_at || user.expires_at || user.subscription_expires_at || null;

    if (raw) {
      const safeStr = typeof raw === 'string' ? raw.replace(' ', 'T') : raw;
      const date = new Date(safeStr);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    }

    // Fallback: If user has an active subscription plan, calculate 30 days from activation/update
    if (activePlanName) {
      const baseRaw = user.updated_at || user.created_at || new Date();
      const safeBase = typeof baseRaw === 'string' ? baseRaw.replace(' ', 'T') : baseRaw;
      const d = new Date(safeBase);
      const validBase = isNaN(d.getTime()) ? new Date() : d;
      const expDate = new Date(validBase);
      expDate.setDate(expDate.getDate() + 30);
      return expDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    return null;
  }, [user, activePlanName]);

  const loadBlockedUsers = async () => {
    setLoadingBlocked(true);
    try {
      const res = await apiGetBlockedUsers();
      if (res?.blocked_users) {
        setBlockedUsers(res.blocked_users);
      }
    } catch (e) {
      console.warn('Failed to fetch blocked users:', e);
    } finally {
      setLoadingBlocked(false);
    }
  };

  const handleUnblock = async (blockedUserId, name) => {
    try {
      await apiUnblockUser(blockedUserId);
      setBlockedUsers(prev => prev.filter(u => u.id !== blockedUserId));
      triggerToast(`${name} has been unblocked.`);
    } catch (e) {
      Alert.alert('Error', 'Could not unblock user.');
    }
  };

  const handleConfirmDeactivate = async () => {
    setDeactivateAlertVisible(false);
    try {
      await apiDeactivateAccount();
      logout();
    } catch (e) {
      logout();
    }
  };

  const handleConfirmDelete = async () => {
    setDeleteAlertVisible(false);
    try {
      await apiDeleteAccount();
      logout();
    } catch (e) {
      logout();
    }
  };


  return (
    <LinearGradient colors={theme.bgGrad} style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      {/* Header Bar */}
      <SafeAreaView style={styles.safeHeader}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings & Preferences</Text>
          <View style={{ width: 38 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ─── 3. Subscription Status Section ────────────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons 
                name={activePlanName ? (planTheme?.icon || 'diamond') : 'diamond-outline'} 
                size={18} 
                color={activePlanName ? planTheme.accent : '#FF007F'} 
                style={{ marginRight: 8 }} 
              />
              <Text style={styles.sectionTitle}>Subscription & Status</Text>
            </View>
            <TouchableOpacity
              style={styles.allPlansBtn}
              onPress={() => navigation.navigate('Plans')}
              activeOpacity={0.7}
            >
              <Text style={styles.allPlansBtnTxt}>All Plans</Text>
              <Ionicons name="chevron-forward" size={13} color="#FF007F" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>

          {activePlanName && planTheme ? (
            <TouchableOpacity 
              style={[styles.cleanPlanCard, { shadowColor: planTheme.shadowColor, borderColor: planTheme.borderColor }]}
              onPress={() => navigation.navigate('Plans')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={planTheme.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cleanPlanGrad}
              >
                {/* Main Row: Icon + Title + Expiry + Active Pill */}
                <View style={styles.cleanMainRow}>
                  <View style={styles.cleanLeftCol}>
                    <View style={[styles.cleanIconCircle, { backgroundColor: planTheme.iconBg }]}>
                      <Ionicons name={planTheme.icon} size={22} color="#FFFFFF" />
                    </View>
                    <View style={styles.cleanTextWrap}>
                      <Text style={styles.cleanPlanTitle}>{activePlanName}</Text>
                      <Text style={styles.cleanExpiryTxt}>
                        Expires: <Text style={styles.cleanExpiryDate}>{expiryDate || '30 Days From Activation'}</Text>
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cleanActivePill}>
                    <View style={styles.cleanGreenDot} />
                    <Text style={styles.cleanActiveTxt}>Active</Text>
                    <Ionicons name="chevron-forward" size={11} color="#FFFFFF" style={{ marginLeft: 2, opacity: 0.7 }} />
                  </View>
                </View>

                {/* Sub Perks Row */}
                <View style={styles.cleanPerksRow}>
                  {planTheme.perks.map((perk, i) => (
                    <View key={i} style={styles.cleanPerkItem}>
                      <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" style={{ marginRight: 4, opacity: 0.9 }} />
                      <Text style={styles.cleanPerkTxt}>{perk}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={styles.subFreeBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.subFreeTitle}>Free Membership</Text>
                <Text style={styles.subFreeSub}>Upgrade to unlock rewinds, passport & 10x matches!</Text>
              </View>
              <TouchableOpacity style={styles.upgradeBtn} onPress={() => navigation.navigate('Plans')} activeOpacity={0.85}>
                <LinearGradient colors={['#FF007F', '#B5179E']} style={styles.upgradeBtnGrad}>
                  <Text style={styles.upgradeBtnTxt}>Upgrade Plan</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ─── 1. Notifications Section ─────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="notifications-outline" size={18} color="#FF007F" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowLabel}>App Notifications</Text>
              <Text style={styles.rowSub}>Receive instant alerts for new matches, likes & messages</Text>
            </View>
            <Switch
              value={notificationsOn}
              onValueChange={(val) => updateSettingField('notifications_on', val, setNotificationsOn, 'App notifications')}
              trackColor={{ false: 'rgba(0,0,0,0.15)', true: '#FF007F' }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        {/* ─── 2. Profile Verification Section ───────────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#FF007F" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Profile Verification</Text>
          </View>

          {(user?.is_verified === true || user?.is_verified === 1 || user?.is_verified === '1' || user?.is_verified === 'true') ? (
            <View style={styles.verifiedActiveBox}>
              {renderVerifiedBadge(user, 26, { marginRight: 10, marginLeft: 0 })}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.verifiedActiveTitle}>Verified Profile</Text>
                  {/* {renderVerifiedBadge(user, 17, { marginLeft: 4 })} */}
                </View>
                <Text style={styles.verifiedActiveSub}>
                  Your profile identity is verified! Your official checkmark badge ({user?.subscription_plan?.toLowerCase().includes('premium') ? 'Dark Golden' : user?.subscription_plan?.toLowerCase().includes('plus') ? 'Purple' : 'Blue'}) is active on your profile cards.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.verifyPromptBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.verifyPromptTitle}>Get Verified Checkmark</Text>
                <Text style={styles.verifyPromptSub}>Verify your identity to get the blue checkmark badge and get up to 3x more matches!</Text>
              </View>
              <TouchableOpacity
                style={styles.verifyNowBtn}
                onPress={handleVerifyProfile}
                disabled={verifying}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#3897F0', '#0072E3']} style={styles.verifyBtnGrad}>
                  <Ionicons name="checkmark-circle" size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.verifyBtnTxt}>{verifying ? 'Verifying...' : 'Verify Now'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ─── 3. Privacy & Profile Visibility ───────────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#FF007F" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Privacy & Profile Display</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Show My Age</Text>
            <Switch
              value={showAge}
              onValueChange={(val) => updateSettingField('show_age', val, setShowAge, 'Age visibility')}
              trackColor={{ false: 'rgba(0,0,0,0.15)', true: '#FF007F' }}
              thumbColor="#FFF"
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Show Distance Away</Text>
            <Switch
              value={showDistance}
              onValueChange={(val) => updateSettingField('show_distance', val, setShowDistance, 'Distance visibility')}
              trackColor={{ false: 'rgba(0,0,0,0.15)', true: '#FF007F' }}
              thumbColor="#FFF"
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Show Occupation / Profession</Text>
            <Switch
              value={showOccupation}
              onValueChange={(val) => updateSettingField('show_occupation', val, setShowOccupation, 'Occupation display')}
              trackColor={{ false: 'rgba(0,0,0,0.15)', true: '#FF007F' }}
              thumbColor="#FFF"
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Hide Education Level</Text>
            <Switch
              value={hideEducation}
              onValueChange={(val) => updateSettingField('hide_education', val, setHideEducation, 'Education visibility')}
              trackColor={{ false: 'rgba(0,0,0,0.15)', true: '#FF007F' }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        {/* ─── 4. Discovery & Match Filters ──────────────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="options-outline" size={18} color="#FF007F" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Discovery & Preference Filters</Text>
          </View>

          {/* Age Range Selector */}
          <Text style={styles.subHeaderLabel}>Target Age Range</Text>
          <View style={styles.pillSelectorRow}>
            {['18 - 25', '18 - 35', '22 - 40', '25 - 50', 'Any'].map(a => (
              <TouchableOpacity
                key={a}
                style={[styles.selectorPill, ageRangeFilter === a && styles.selectorPillActive]}
                onPress={() => updateSettingField('age_range_filter', a, setAgeRangeFilter, 'Age range filter')}
              >
                <Text style={[styles.selectorPillTxt, ageRangeFilter === a && styles.selectorPillTxtActive]}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Verified Profiles Only</Text>
            <Switch
              value={verifiedOnly}
              onValueChange={(val) => updateSettingField('verified_only', val, setVerifiedOnly, 'Verified profiles filter')}
              trackColor={{ false: 'rgba(0,0,0,0.15)', true: '#FF007F' }}
              thumbColor="#FFF"
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Must Have Profile Bio</Text>
            <Switch
              value={hasBioOnly}
              onValueChange={(val) => updateSettingField('has_bio_only', val, setHasBioOnly, 'Bio requirement')}
              trackColor={{ false: 'rgba(0,0,0,0.15)', true: '#FF007F' }}
              thumbColor="#FFF"
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Prioritize Common Interests</Text>
            <Switch
              value={commonInterestsOnly}
              onValueChange={(val) => updateSettingField('common_interests_only', val, setCommonInterestsOnly, 'Common interests filter')}
              trackColor={{ false: 'rgba(0,0,0,0.15)', true: '#FF007F' }}
              thumbColor="#FFF"
            />
          </View>

          {/* Dropdown Filters */}
          <SearchableDropdownModal
            label="Education Filter"
            placeholder="Select Education Requirement"
            value={educationFilter}
            items={['Any', "Bachelor's Degree", "Master's Degree", "Doctorate / Ph.D"]}
            icon="school-outline"
            onSelect={(val) => updateSettingField('education_filter', val, setEducationFilter, 'Education filter')}
          />

          <SearchableDropdownModal
            label="Religion Filter"
            placeholder="Select Religion Requirement"
            value={religionFilter}
            items={['Any', 'Hinduism', 'Islam', 'Christianity', 'Sikhism', 'Buddhism', 'Jainism', 'Spiritual', 'Other']}
            icon="sparkles-outline"
            onSelect={(val) => updateSettingField('religion_filter', val, setReligionFilter, 'Religion filter')}
          />

          <SearchableDropdownModal
            label="Languages Spoken Filter"
            placeholder="Select Language Preference"
            value={languageFilter}
            items={['Any', 'Hindi', 'English', 'Marathi', 'Bengali', 'Gujarati', 'Tamil', 'Telugu', 'Other']}
            icon="language-outline"
            onSelect={(val) => updateSettingField('language_filter', val, setLanguageFilter, 'Language filter')}
          />
        </View>

        {/* ─── 5. Blocked Profiles ────────────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              loadBlockedUsers();
              setBlockedModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="ban-outline" size={18} color="#FF007F" style={{ marginRight: 10 }} />
              <Text style={styles.menuRowTxt}>Blocked Profiles</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textFaint} />
          </TouchableOpacity>
        </View>

        {/* ─── 6. Support & Legal ─────────────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate('SupportChat')} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="headset-outline" size={18} color="#FF007F" style={{ marginRight: 10 }} />
              <Text style={[styles.menuRowTxt, { fontWeight: '700' }]}>24/7 Customer Support & Help</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textFaint} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuRow} onPress={() => setPrivacyModalVisible(true)} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="document-text-outline" size={18} color={theme.textPrimary} style={{ marginRight: 10 }} />
              <Text style={styles.menuRowTxt}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textFaint} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuRow} onPress={() => setDisclaimerModalVisible(true)} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="information-circle-outline" size={18} color={theme.textPrimary} style={{ marginRight: 10 }} />
              <Text style={styles.menuRowTxt}>Disclaimer & Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textFaint} />
          </TouchableOpacity>
        </View>

        {/* ─── 8. Dark & Light Theme Toggle ───────────────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name={isDark ? "moon-outline" : "sunny-outline"} size={18} color="#FF007F" style={{ marginRight: 10 }} />
              <Text style={styles.rowLabel}>Dark Theme Mode</Text>
            </View>
            <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: 'rgba(0,0,0,0.15)', true: '#FF007F' }} thumbColor="#FFF" />
          </View>
        </View>

        {/* ─── 9. Logout Button ──────────────────────────────────────────── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#FF375F" style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnTxt}>Log Out of Account</Text>
        </TouchableOpacity>

        {/* ─── 7. Account Management (Deactivate & Delete) ───────────────── */}
        <View style={styles.accountActionWrap}>
          <TouchableOpacity style={styles.deactivateBtn} onPress={() => setDeactivateAlertVisible(true)} activeOpacity={0.7}>
            <Text style={styles.deactivateBtnTxt}>Deactivate Account</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteBtn} onPress={() => setDeleteAlertVisible(true)} activeOpacity={0.7}>
            <Text style={styles.deleteBtnTxt}>Delete Account Permanently</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ─── Toast Banner ────────────────────────────────────────────────── */}
      {toastVisible && (
        <View style={styles.toastBanner}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.toastTxt}>{toastMsg}</Text>
        </View>
      )}

      {/* ─── Blocked Users Modal ─────────────────────────────────────────── */}
      <Modal visible={blockedModalVisible} animationType="slide" transparent={false} onRequestClose={() => setBlockedModalVisible(false)}>
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bgDark }]}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setBlockedModalVisible(false)}>
              <Ionicons name="close" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Blocked Profiles</Text>
            <View style={{ width: 38 }} />
          </View>

          {blockedUsers.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="shield-checkmark-outline" size={54} color="#FF007F" />
              <Text style={styles.emptyTitle}>No Blocked Profiles</Text>
              <Text style={styles.emptySub}>You haven't blocked any users yet. Blocked users will appear here and will be prevented from contacting you.</Text>
            </View>
          ) : (
            <FlatList
              data={blockedUsers}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <View style={styles.blockedCard}>
                  <Image source={{ uri: formatImageUrl(item.avatar || (item.photos && item.photos[0]?.photo_url)) }} style={styles.blockedAv} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.blockedName}>{item.name}</Text>
                    <Text style={styles.blockedSub}>{item.city || 'Blocked user'}</Text>
                  </View>
                  <TouchableOpacity style={styles.unblockBtn} onPress={() => handleUnblock(item.id, item.name)} activeOpacity={0.8}>
                    <Text style={styles.unblockBtnTxt}>Unblock</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* ─── Privacy Policy Modal ────────────────────────────────────────── */}
      <Modal visible={privacyModalVisible} animationType="slide" transparent={false} onRequestClose={() => setPrivacyModalVisible(false)}>
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bgDark }]}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setPrivacyModalVisible(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Privacy Policy</Text>
            <View style={{ width: 38 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.privacyScrollContent}>
            {/* Branded Hero Header */}
            <LinearGradient
              colors={theme.isDark ? ['#2D103D', '#1A1233'] : ['#FFF5F9', '#F5EFFC']}
              style={styles.privacyHeroCard}
            >
              <View style={styles.logoBadgeContainer}>
                <Image
                  source={require('../../assets/logo.png')}
                  style={styles.privacyLogoImage}
                />
              </View>
              <Text style={styles.privacyBrandTitle}>HeartLink</Text>
              <Text style={styles.privacyHeroSubtitle}>Your Privacy & Trust Are Our Top Priority</Text>
              <View style={styles.privacyTagBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#FF007F" style={{ marginRight: 4 }} />
                <Text style={styles.privacyTagTxt}>End-to-End Protection • Version 2.0</Text>
              </View>
            </LinearGradient>

            {/* Quick Pillars Row */}
            <View style={styles.pillarsGrid}>
              <View style={styles.pillarBox}>
                <View style={[styles.pillarIconWrap, { backgroundColor: 'rgba(255, 0, 127, 0.12)' }]}>
                  <Ionicons name="lock-closed" size={18} color="#FF007F" />
                </View>
                <Text style={styles.pillarTitle}>AES-256 Encrypted</Text>
                <Text style={styles.pillarSub}>Private chats & data</Text>
              </View>

              <View style={styles.pillarBox}>
                <View style={[styles.pillarIconWrap, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
                  <Ionicons name="eye-off" size={18} color="#8B5CF6" />
                </View>
                <Text style={styles.pillarTitle}>Zero Data Sale</Text>
                <Text style={styles.pillarSub}>We never sell info</Text>
              </View>

              <View style={styles.pillarBox}>
                <View style={[styles.pillarIconWrap, { backgroundColor: 'rgba(56, 151, 240, 0.12)' }]}>
                  <Ionicons name="options" size={18} color="#3897F0" />
                </View>
                <Text style={styles.pillarTitle}>Full Control</Text>
                <Text style={styles.pillarSub}>Manage visibility</Text>
              </View>
            </View>

            {/* Detailed Policy Sections */}
            <View style={styles.policyCard}>
              <View style={styles.policyHeaderRow}>
                <View style={[styles.policyIconCircle, { backgroundColor: 'rgba(255, 0, 127, 0.1)' }]}>
                  <Ionicons name="person-outline" size={18} color="#FF007F" />
                </View>
                <Text style={styles.policySectionHeading}>1. Information We Collect</Text>
              </View>
              <Text style={styles.policyBodyText}>
                To provide you with meaningful matches and a safe dating experience, HeartLink collects essential information:
              </Text>
              <View style={styles.bulletRow}>
                <Ionicons name="checkmark-circle" size={14} color="#FF007F" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>Account Profile: Name, age, gender, photos, bio, and dating preferences.</Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="checkmark-circle" size={14} color="#FF007F" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>Location Services: Approximate distance to recommend nearby profiles.</Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="checkmark-circle" size={14} color="#FF007F" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>Activity & Likes: Match connections and chat messages.</Text>
              </View>
            </View>

            <View style={styles.policyCard}>
              <View style={styles.policyHeaderRow}>
                <View style={[styles.policyIconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                  <Ionicons name="sparkles-outline" size={18} color="#8B5CF6" />
                </View>
                <Text style={styles.policySectionHeading}>2. How We Use Your Data</Text>
              </View>
              <Text style={styles.policyBodyText}>
                Your data is strictly utilized to enhance your matchmaking experience:
              </Text>
              <View style={styles.bulletRow}>
                <Ionicons name="checkmark-circle" size={14} color="#8B5CF6" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>Calculating match compatibility scores and curated recommendations.</Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="checkmark-circle" size={14} color="#8B5CF6" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>Verifying profile authenticity (Aadhaar & identity checkmarks).</Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="checkmark-circle" size={14} color="#8B5CF6" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>Preventing spam, fake accounts, and community harassment.</Text>
              </View>
            </View>

            <View style={styles.policyCard}>
              <View style={styles.policyHeaderRow}>
                <View style={[styles.policyIconCircle, { backgroundColor: 'rgba(56, 151, 240, 0.1)' }]}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#3897F0" />
                </View>
                <Text style={styles.policySectionHeading}>3. Security & Data Protection</Text>
              </View>
              <Text style={styles.policyBodyText}>
                We employ industry-standard encryption protocols (TLS/SSL in transit, AES-256 at rest) to safeguard your personal messages and credentials from unauthorized access.
              </Text>
            </View>

            <View style={styles.policyCard}>
              <View style={styles.policyHeaderRow}>
                <View style={[styles.policyIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Ionicons name="key-outline" size={18} color="#10B981" />
                </View>
                <Text style={styles.policySectionHeading}>4. Your Rights & Controls</Text>
              </View>
              <Text style={styles.policyBodyText}>
                You retain complete control over your profile and personal data at all times:
              </Text>
              <View style={styles.bulletRow}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>Hide distance, age, or education level whenever you prefer.</Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>Block or report any unwanted user instantly.</Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>Deactivate or permanently delete your account with 1-click in Settings.</Text>
              </View>
            </View>

            {/* Contact Box */}
            <View style={styles.privacyContactBox}>
              <Ionicons name="mail" size={24} color="#FF007F" style={{ marginBottom: 6 }} />
              <Text style={styles.contactTitle}>Questions About Privacy?</Text>
              <Text style={styles.contactSub}>Reach out to our dedicated Data Protection Officer at privacy@heartlink.app</Text>
            </View>

            <Text style={styles.privacyFooterNote}>
              HeartLink Dating App • Designed with ❤️ for secure, meaningful connections.
            </Text>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ─── Disclaimer Modal ───────────────────────────────────────────── */}
      <Modal visible={disclaimerModalVisible} animationType="slide" transparent={false} onRequestClose={() => setDisclaimerModalVisible(false)}>
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bgDark }]}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setDisclaimerModalVisible(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Disclaimer & Terms</Text>
            <View style={{ width: 38 }} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.privacyScrollContent}>
            <LinearGradient
              colors={theme.isDark ? ['#2D103D', '#1A1233'] : ['#FFF5F9', '#F5EFFC']}
              style={styles.privacyHeroCard}
            >
              <View style={styles.logoBadgeContainer}>
                <Image
                  source={require('../../assets/logo.png')}
                  style={styles.privacyLogoImage}
                />
              </View>
              <Text style={styles.privacyBrandTitle}>HeartLink</Text>
              <Text style={styles.privacyHeroSubtitle}>Disclaimer & Safety Terms of Service</Text>
            </LinearGradient>

            <View style={styles.policyCard}>
              <View style={styles.policyHeaderRow}>
                <View style={[styles.policyIconCircle, { backgroundColor: 'rgba(255, 0, 127, 0.1)' }]}>
                  <Ionicons name="information-circle-outline" size={18} color="#FF007F" />
                </View>
                <Text style={styles.policySectionHeading}>General Disclaimer</Text>
              </View>
              <Text style={styles.policyBodyText}>
                HeartLink provides matchmaking and social discovery services for entertainment and personal connections. Users must be at least 18 years of age to create an account and use our platform services.
              </Text>
            </View>

            <View style={styles.policyCard}>
              <View style={styles.policyHeaderRow}>
                <View style={[styles.policyIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                  <Ionicons name="warning-outline" size={18} color="#F59E0B" />
                </View>
                <Text style={styles.policySectionHeading}>User Safety & Responsibility</Text>
              </View>
              <Text style={styles.policyBodyText}>
                Always exercise caution when sharing personal contact details or meeting matches in person. Meet in public places and notify friends or family of your plans. HeartLink does not conduct background checks on all users.
              </Text>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <AadhaarVerificationModal
        visible={aadhaarModalVisible}
        onClose={() => setAadhaarModalVisible(false)}
        initialStep="verify"
        onVerifiedSuccess={() => triggerToast('Profile verified successfully!')}
      />

      {/* ─── Deactivate Alert Modal ────────────────────────────────────── */}
      <CustomAlertModal
        visible={deactivateAlertVisible}
        title="Deactivate Account?"
        message="Your profile will be hidden from discovery until you log in again. You can return anytime!"
        icon="pause-circle-outline"
        iconColor="#F59E0B"
        confirmText="Deactivate"
        cancelText="Cancel"
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setDeactivateAlertVisible(false)}
      />

      {/* ─── Delete Alert Modal ────────────────────────────────────────── */}
      <CustomAlertModal
        visible={deleteAlertVisible}
        title="Delete Account Permanently?"
        message="This action CANNOT be undone. All your matches, messages, photos, and preferences will be permanently deleted."
        icon="trash-bin-outline"
        iconColor="#FF375F"
        isDanger={true}
        confirmText="Delete Account"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteAlertVisible(false)}
      />

    </LinearGradient>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1 },
  safeHeader: { paddingTop: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.textPrimary,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  sectionCard: {
    backgroundColor: theme.isDark ? '#1A1233' : '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border || 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  allPlansBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 0, 127, 0.08)',
  },
  allPlansBtnTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF007F',
  },

  // Clean, Modern Subscription Card Styles
  cleanPlanCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    elevation: 5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    marginTop: 2,
  },
  cleanPlanGrad: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 15,
  },
  cleanMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cleanLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  cleanIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cleanTextWrap: {
    flex: 1,
  },
  cleanPlanTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  cleanExpiryTxt: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2.5,
  },
  cleanExpiryDate: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cleanActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  cleanGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
    marginRight: 5,
  },
  cleanActiveTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  cleanPerksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.18)',
  },
  cleanPerkItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cleanPerkTxt: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.92)',
  },
  subFreeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    marginTop: 4,
    gap: 12,
  },
  subFreeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  subFreeSub: {
    fontSize: 11.5,
    color: theme.textSec,
    marginTop: 2,
    lineHeight: 15,
  },
  upgradeBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  upgradeBtnGrad: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBtnTxt: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },
  rowTextWrap: { flex: 1, paddingRight: 10 },
  rowLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  rowSub: {
    fontSize: 11.5,
    color: theme.textSec,
    marginTop: 2,
  },

  subHeaderLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSec,
    marginTop: 12,
    marginBottom: 6,
  },
  pillSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  selectorPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: theme.border || 'rgba(0,0,0,0.08)',
  },
  selectorPillActive: {
    backgroundColor: 'rgba(255,0,127,0.12)',
    borderColor: '#FF007F',
  },
  selectorPillTxt: {
    fontSize: 12,
    color: theme.textSec,
  },
  selectorPillTxtActive: {
    color: '#FF007F',
    fontWeight: '700',
  },

  subActiveBox: { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  subActiveGrad: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  subActiveName: { fontSize: 16, fontWeight: '900', color: '#FFF' },
  subActiveStatus: { fontSize: 11.5, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  subFreeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    borderWidth: 1,
    borderColor: theme.border || 'rgba(0,0,0,0.06)',
  },
  subFreeTitle: { fontSize: 14, fontWeight: '800', color: theme.textPrimary },
  subFreeSub: { fontSize: 11, color: theme.textSec, marginTop: 2 },
  upgradeBtn: { borderRadius: 14, overflow: 'hidden', marginLeft: 8 },
  upgradeBtnGrad: { paddingHorizontal: 12, paddingVertical: 8 },
  upgradeBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  menuRowTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.border || 'rgba(0,0,0,0.06)',
    marginVertical: 4,
  },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,55,95,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,55,95,0.25)',
    marginVertical: 10,
  },
  logoutBtnTxt: {
    color: '#FF375F',
    fontSize: 14,
    fontWeight: '800',
  },

  accountActionWrap: {
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  deactivateBtn: { paddingVertical: 6 },
  deactivateBtnTxt: { fontSize: 12.5, fontWeight: '700', color: theme.textSec },
  deleteBtn: { paddingVertical: 6 },
  deleteBtnTxt: { fontSize: 12.5, fontWeight: '700', color: '#FF375F' },

  toastBanner: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#30D158',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  toastTxt: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  blockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: theme.isDark ? '#1A1233' : '#FFFFFF',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.border || 'rgba(0,0,0,0.06)',
  },
  blockedAv: { width: 44, height: 44, borderRadius: 22 },
  blockedName: { fontSize: 14, fontWeight: '800', color: theme.textPrimary },
  blockedSub: { fontSize: 11.5, color: theme.textSec, marginTop: 2 },
  unblockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,0,127,0.1)',
    borderWidth: 1,
    borderColor: '#FF007F',
  },
  unblockBtnTxt: { color: '#FF007F', fontSize: 12, fontWeight: '800' },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: theme.textPrimary, marginTop: 12 },
  emptySub: { fontSize: 13, color: theme.textSec, textAlign: 'center', marginTop: 6, lineHeight: 18 },

  legalHeading: { fontSize: 20, fontWeight: '900', color: theme.textPrimary, marginBottom: 12 },
  legalSubHeading: { fontSize: 15, fontWeight: '800', color: theme.textPrimary, marginTop: 16, marginBottom: 6 },
  legalBody: { fontSize: 13, color: theme.textSec, lineHeight: 20 },

  privacyScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  privacyHeroCard: {
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255,0,127,0.25)' : 'rgba(255,0,127,0.12)',
  },
  logoBadgeContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,0,127,0.2)',
  },
  privacyLogoImage: {
    width: 52,
    height: 52,
    resizeMode: 'contain',
  },
  privacyBrandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.textPrimary,
    letterSpacing: 0.5,
  },
  privacyHeroSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSec,
    marginTop: 4,
    textAlign: 'center',
  },
  privacyTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,0,127,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 12,
  },
  privacyTagTxt: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FF007F',
  },

  pillarsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  pillarBox: {
    flex: 1,
    backgroundColor: theme.isDark ? '#1A1233' : '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border || 'rgba(0,0,0,0.06)',
  },
  pillarIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  pillarTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.textPrimary,
    textAlign: 'center',
  },
  pillarSub: {
    fontSize: 9.5,
    color: theme.textSec,
    marginTop: 2,
    textAlign: 'center',
  },

  policyCard: {
    backgroundColor: theme.isDark ? '#1A1233' : '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border || 'rgba(0,0,0,0.06)',
  },
  policyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  policyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  policySectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  policyBodyText: {
    fontSize: 13,
    color: theme.textSec,
    lineHeight: 19,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  bulletIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 12.5,
    color: theme.textPrimary,
    lineHeight: 18,
  },

  privacyContactBox: {
    backgroundColor: theme.isDark ? 'rgba(255,0,127,0.08)' : 'rgba(255,0,127,0.04)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,0,127,0.2)',
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  contactSub: {
    fontSize: 12,
    color: theme.textSec,
    textAlign: 'center',
    marginTop: 4,
  },

  privacyFooterNote: {
    fontSize: 11,
    color: theme.textSec,
    textAlign: 'center',
    marginTop: 8,
  },

  verifiedActiveBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: theme.isDark ? 'rgba(56,151,240,0.12)' : 'rgba(56,151,240,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56,151,240,0.3)',
    marginTop: 6,
  },
  verifiedActiveTitle: { fontSize: 14, fontWeight: '800', color: '#3897F0' },
  verifiedActiveSub: { fontSize: 12, color: theme.textSec, marginTop: 2, lineHeight: 16 },

  verifyPromptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
    marginTop: 6,
    gap: 12,
  },
  verifyPromptTitle: { fontSize: 14, fontWeight: '800', color: theme.textPrimary },
  verifyPromptSub: { fontSize: 11.5, color: theme.textSec, marginTop: 2, lineHeight: 15 },
  verifyNowBtn: { overflow: 'hidden', borderRadius: 20 },
  verifyBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  verifyBtnTxt: { color: '#FFF', fontSize: 12.5, fontWeight: '800' },
});
