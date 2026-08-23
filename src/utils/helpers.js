import React from 'react';
import { Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getActiveServerBaseUrl } from '../services/api';

export const formatName = (name, maxLength = 22) => {
  if (!name || typeof name !== 'string') return 'Member';
  const trimmed = name.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.substring(0, maxLength)}...`;
};

export const getVerifiedBadgeInfo = (item) => {
  if (!item) return { isVerified: false, iconName: 'shield-checkmark', iconLibrary: 'Ionicons', color: '#2B7FFF', planName: 'None' };

  const userObj = item.user || item;

  const isVerified =
    userObj.is_verified === true ||
    userObj.is_verified === 1 ||
    userObj.is_verified === '1' ||
    userObj.is_verified === 'true' ||
    userObj.isVerified === true ||
    userObj.isVerified === 1 ||
    userObj.isVerified === '1' ||
    userObj.isVerified === 'true' ||
    item.is_verified === true ||
    item.is_verified === 1 ||
    item.is_verified === '1' ||
    item.is_verified === 'true' ||
    item.isVerified === true ||
    item.isVerified === 1 ||
    item.isVerified === '1' ||
    item.isVerified === 'true';

  const rawPlan = (
    userObj.subscription_plan ||
    userObj.plan_name ||
    userObj.activeSubscription?.plan_name ||
    userObj.active_subscription?.plan_name ||
    item.subscription_plan ||
    item.plan_name ||
    item.activeSubscription?.plan_name ||
    item.active_subscription?.plan_name ||
    ''
  ).toString().toLowerCase();

  const isPremiumPlan =
    rawPlan.includes('premium') ||
    rawPlan.includes('black') ||
    rawPlan.includes('platinum') ||
    userObj.isGoldenTick === true ||
    item.isGoldenTick === true;

  const isPlusPlan =
    rawPlan.includes('plus') ||
    rawPlan.includes('access') ||
    rawPlan.includes('gold');

  // Tier badges for users who purchased paid plans:
  if (isPremiumPlan) {
    return {
      isVerified: true,
      iconName: 'check-decagram',
      iconLibrary: 'MaterialCommunityIcons',
      color: '#B8860B',
      planName: 'Premium',
    };
  } else if (isPlusPlan) {
    return {
      isVerified: true,
      iconName: 'check-decagram',
      iconLibrary: 'MaterialCommunityIcons',
      color: '#9D4EDD',
      planName: 'Plus',
    };
  } else if (isVerified) {
    // Only Aadhaar verified (Free/Basic user who completed Aadhaar identity verification):
    // Use official Blue Shield Checkmark badge!
    return {
      isVerified: true,
      iconName: 'shield-checkmark',
      iconLibrary: 'Ionicons',
      color: '#2B7FFF',
      planName: 'Aadhaar Verified',
    };
  }

  return {
    isVerified: false,
    iconName: 'shield-checkmark',
    iconLibrary: 'Ionicons',
    color: '#2B7FFF',
    planName: 'None',
  };
};

export const renderVerifiedBadge = (item, size = 16, style = {}) => {
  const badgeInfo = getVerifiedBadgeInfo(item);
  if (!badgeInfo.isVerified) return null;

  if (badgeInfo.iconLibrary === 'Ionicons') {
    return (
      <Ionicons
        name={badgeInfo.iconName}
        size={size}
        color={badgeInfo.color}
        style={[{ marginLeft: 4, alignSelf: 'center' }, style]}
      />
    );
  }

  return (
    <MaterialCommunityIcons
      name={badgeInfo.iconName}
      size={size}
      color={badgeInfo.color}
      style={[{ marginLeft: 4, alignSelf: 'center' }, style]}
    />
  );
};

export const formatImageUrl = (url, fallback = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900') => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return fallback;
  }

  const cleanUrl = url.trim();

  // Already a full absolute URL with /uploads/ → return as-is (no stripping/rebuilding)
  if ((cleanUrl.startsWith('https://') || cleanUrl.startsWith('http://')) && cleanUrl.includes('/uploads/')) {
    return cleanUrl;
  }

  // Relative path /uploads/user_xxx/photo.jpg → prepend server base URL
  if (cleanUrl.startsWith('/uploads/')) {
    const baseUrl = getActiveServerBaseUrl();
    return `${baseUrl}${cleanUrl}`;
  }

  // Any other string containing /uploads/ (edge case: domain-stripped) → reconstruct
  if (cleanUrl.includes('/uploads/')) {
    const relativePath = cleanUrl.substring(cleanUrl.indexOf('/uploads/'));
    const baseUrl = getActiveServerBaseUrl();
    return `${baseUrl}${relativePath}`;
  }

  // Local device files → can't display, use fallback
  if (cleanUrl.startsWith('file://') || cleanUrl.startsWith('content://')) {
    return fallback;
  }

  return cleanUrl;
};

export const formatDistance = (km) => {
  if (km < 1) return `${Math.round(km * 1000)}m away`;
  return `${km}km away`;
};

export const formatTime = (date) => {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d`;
};

export const compatibilityColor = (pct) => {
  if (pct >= 85) return '#30D158';
  if (pct >= 70) return '#FFD60A';
  return '#FF375F';
};

export const ensureArray = (val, fallback = []) => {
  if (Array.isArray(val) && val.length > 0) return val;
  if (Array.isArray(val) && val.length === 0) return fallback;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return fallback;
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) { }
    }
    if (trimmed.includes(',')) {
      const split = trimmed.split(',').map(s => s.trim()).filter(Boolean);
      if (split.length > 0) return split;
    }
    return [trimmed];
  }
  if (val && typeof val === 'object') {
    try {
      const vals = Object.values(val).filter(v => typeof v === 'string' && v.trim().length > 0);
      if (vals.length > 0) return vals;
    } catch (e) { }
  }
  return fallback;
};

/**
 * Calculates a dynamic overall compatibility match percentage (68% to 98%)
 * based on user attributes: Interests, Lifestyle (Smoking, Drinking, Nightlife),
 * Religion, Education, Marital Status, and Baseline Chemistry.
 */
export const calculateMatchPercentage = (user1, user2) => {
  if (!user2) return 88;

  const u1 = user1 || {};
  const u2 = user2 || {};

  // 1. Interests Overlap (35%)
  let interestsScore = 75;
  const int1 = ensureArray(u1.interests, []);
  const int2 = ensureArray(u2.interests, []);
  if (int1.length > 0 && int2.length > 0) {
    const common = int1.filter(i => int2.some(j => String(i).toLowerCase().trim() === String(j).toLowerCase().trim()));
    const ratio = common.length / Math.max(1, Math.min(int1.length, int2.length));
    interestsScore = Math.round(65 + ratio * 32);
  } else {
    interestsScore = 76 + (((u1.id || 1) * 31 + (u2.id || 2) * 17) % 20);
  }

  // 2. Lifestyle Alignment (35%)
  let lifestyleScore = 80;
  let matches = 0, total = 0;
  if (u1.smoking && u2.smoking) { total++; if (String(u1.smoking).toLowerCase() === String(u2.smoking).toLowerCase()) matches++; }
  if (u1.drinking && u2.drinking) { total++; if (String(u1.drinking).toLowerCase() === String(u2.drinking).toLowerCase()) matches++; }
  if (u1.clubbing && u2.clubbing) { total++; if (String(u1.clubbing).toLowerCase() === String(u2.clubbing).toLowerCase()) matches++; }
  if (total > 0) {
    lifestyleScore = Math.round(68 + (matches / total) * 30);
  } else {
    lifestyleScore = 78 + (((u1.id || 1) * 13 + (u2.id || 2) * 29) % 18);
  }

  // 3. Values & Religion (30%)
  let valuesScore = 76;
  if (u1.religion && u2.religion && String(u1.religion).toLowerCase() === String(u2.religion).toLowerCase()) valuesScore += 10;
  if (u1.education && u2.education && String(u1.education).toLowerCase() === String(u2.education).toLowerCase()) valuesScore += 6;
  valuesScore += (((u1.id || 1) * 7 + (u2.id || 2) * 41) % 12);

  const overall = Math.round(interestsScore * 0.35 + lifestyleScore * 0.35 + valuesScore * 0.30);
  return Math.min(98, Math.max(68, overall));
};

