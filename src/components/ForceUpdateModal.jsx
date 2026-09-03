// src/components/ForceUpdateModal.jsx — Compulsory App Update Modal
import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Linking,
  AppState,
  Platform,
  ScrollView,
  BackHandler,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { apiCheckAppUpdate } from '../services/api';

const { width } = Dimensions.get('window');

// Detect current app build info
const CURRENT_VERSION_NAME =
  Constants.expoConfig?.version ||
  Constants.nativeAppVersion ||
  '1.0.44';

const CURRENT_VERSION_CODE =
  Constants.expoConfig?.android?.versionCode ||
  (Constants.nativeBuildVersion ? parseInt(Constants.nativeBuildVersion, 10) : 44);

export default function ForceUpdateModal() {
  const [visible, setVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isOpeningStore, setIsOpeningStore] = useState(false);

  // Check update status against backend API
  const performUpdateCheck = useCallback(async () => {
    try {
      const res = await apiCheckAppUpdate({
        platform: Platform.OS,
        versionCode: CURRENT_VERSION_CODE,
        versionName: CURRENT_VERSION_NAME,
      });

      if (res && res.success) {
        // Strict compulsory check: if update is required by backend
        if (res.update_required || (res.force_update && res.client_version_code < res.min_version_code)) {
          setUpdateInfo(res);
          setVisible(true);
        } else {
          setVisible(false);
        }
      }
    } catch (err) {
      console.warn('[ForceUpdateModal] Check error:', err?.message);
    }
  }, []);

  useEffect(() => {
    performUpdateCheck();

    // Re-check update when app is brought to foreground (user comes back from Play Store)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        performUpdateCheck();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [performUpdateCheck]);

  // Lock Android hardware back button when compulsory modal is visible
  useEffect(() => {
    if (!visible) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Return true to prevent default back action (locks the user on update screen)
      return true;
    });

    return () => backHandler.remove();
  }, [visible]);

  const handleUpdatePress = async () => {
    setIsOpeningStore(true);
    const marketUrl =
      updateInfo?.market_url ||
      'market://details?id=com.heartlinkdatingapp.app';
    const webUrl =
      updateInfo?.play_store_url ||
      'https://play.google.com/store/apps/details?id=com.heartlinkdatingapp.app';

    try {
      const canOpenMarket = await Linking.canOpenURL(marketUrl);
      if (canOpenMarket) {
        await Linking.openURL(marketUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch (err) {
      console.warn('[ForceUpdateModal] Failed to open market URL, falling back to web:', err?.message);
      try {
        await Linking.openURL(webUrl);
      } catch (webErr) {
        console.error('[ForceUpdateModal] Could not open store link:', webErr?.message);
      }
    } finally {
      setTimeout(() => setIsOpeningStore(false), 1500);
    }
  };

  if (!visible) return null;

  const title = updateInfo?.title || 'Update Required';
  const message =
    updateInfo?.message ||
    'A new version of HeartLink is ready with critical security updates, improved chat, and new matchmaking features. Please update to continue.';
  const latestVersion = updateInfo?.latest_version_name || '1.0.44';
  const releaseNotes = updateInfo?.release_notes || [
    '⚡ Faster real-time messaging & instant chat',
    '🔒 Enhanced account safety & verification',
    '✨ Smoother swiping and vibe matchmaking',
    '🛠️ Critical performance & stability fixes',
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        // Intercept Android back button — do nothing (compulsory)
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.cardContainer}>
          {/* Glowing Gradient Background Card */}
          <LinearGradient
            colors={['#24123E', '#140A28', '#0D051C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Top Glowing Badge */}
            <View style={styles.badgeContainer}>
              <View style={styles.badge}>
                <Ionicons name="sparkles" size={13} color="#FF007F" />
                <Text style={styles.badgeText}>COMPULSORY UPDATE</Text>
              </View>
            </View>

            {/* Glowing Icon Header */}
            <View style={styles.iconWrapper}>
              <LinearGradient
                colors={['#FF007F', '#7928CA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconCircle}
              >
                <Ionicons name="cloud-download-outline" size={38} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.iconHalo} />
            </View>

            {/* Main Titles */}
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.versionTag}>
              Version {latestVersion} is now available
            </Text>

            {/* Description */}
            <Text style={styles.description}>{message}</Text>

            {/* Release Highlights / What's New Box */}
            <View style={styles.notesBox}>
              <Text style={styles.notesHeader}>What's New in this Release</Text>
              <ScrollView
                style={styles.notesScroll}
                showsVerticalScrollIndicator={false}
              >
                {releaseNotes.map((note, index) => (
                  <View key={index} style={styles.noteItem}>
                    <View style={styles.noteBullet}>
                      <Ionicons name="checkmark-circle" size={16} color="#30D158" />
                    </View>
                    <Text style={styles.noteText}>{note}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Compulsory Update Button */}
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.btnWrapper}
              onPress={handleUpdatePress}
              disabled={isOpeningStore}
            >
              <LinearGradient
                colors={['#FF007F', '#B5179E', '#7928CA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.updateBtn}
              >
                <Ionicons
                  name="logo-google-playstore"
                  size={20}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.updateBtnText}>
                  {isOpeningStore ? 'Opening Play Store...' : 'Update on Google Play'}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color="#FFFFFF"
                  style={{ marginLeft: 6 }}
                />
              </LinearGradient>
            </TouchableOpacity>

            {/* Security Guarantee Notice */}
            <View style={styles.securityNoticeRow}>
              <Ionicons name="shield-checkmark" size={13} color="rgba(255,255,255,0.45)" />
              <Text style={styles.securityNoticeText}>
                Safe & Verified Google Play Update • Seamless install
              </Text>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 2, 12, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 28,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 0, 127, 0.35)',
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 20,
    overflow: 'hidden',
  },
  card: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: 'center',
  },
  badgeContainer: {
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 127, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 127, 0.35)',
  },
  badgeText: {
    color: '#FF4D94',
    fontSize: 11,
    fontFamily: 'BricolageGrotesque_700Bold',
    marginLeft: 5,
    letterSpacing: 0.8,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 12,
  },
  iconHalo: {
    position: 'absolute',
    width: 94,
    height: 94,
    borderRadius: 47,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 0, 127, 0.25)',
  },
  title: {
    fontSize: 23,
    fontFamily: 'BricolageGrotesque_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  versionTag: {
    fontSize: 13,
    fontFamily: 'BricolageGrotesque_600SemiBold',
    color: '#FF007F',
    marginTop: 4,
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 13.5,
    lineHeight: 19.5,
    fontFamily: 'BricolageGrotesque_400Regular',
    color: 'rgba(255, 255, 255, 0.72)',
    textAlign: 'center',
    marginBottom: 18,
    paddingHorizontal: 6,
  },
  notesBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    padding: 14,
    marginBottom: 20,
  },
  notesHeader: {
    fontSize: 12,
    fontFamily: 'BricolageGrotesque_700Bold',
    color: 'rgba(255, 255, 255, 0.85)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  notesScroll: {
    maxHeight: 120,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  noteBullet: {
    marginRight: 8,
    marginTop: 1,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'BricolageGrotesque_400Regular',
    color: 'rgba(255, 255, 255, 0.90)',
    lineHeight: 17,
  },
  btnWrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  updateBtnText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontFamily: 'BricolageGrotesque_700Bold',
    letterSpacing: 0.2,
  },
  securityNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  securityNoticeText: {
    fontSize: 11,
    fontFamily: 'BricolageGrotesque_400Regular',
    color: 'rgba(255, 255, 255, 0.45)',
    marginLeft: 6,
  },
});
