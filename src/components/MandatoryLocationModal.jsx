// src/components/MandatoryLocationModal.jsx — Compulsory Real-Time Location Access Guard
import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  AppState,
  Platform,
  ScrollView,
  BackHandler,
  Animated,
  ActivityIndicator,
  PermissionsAndroid,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../hooks/useAuth';
import { apiUpdateProfile } from '../services/api';
import { eventEmitter, EVENTS } from '../utils/eventEmitter';

export default function MandatoryLocationModal() {
  const { updateUser } = useAuth();
  const [visible, setVisible] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [gpsServicesDisabled, setGpsServicesDisabled] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionDeniedOnce, setPermissionDeniedOnce] = useState(false);
  const lastSyncRef = React.useRef(0);

  // Sync current device coordinates and city to backend and local session
  const syncCoordinates = useCallback(async () => {
    const now = Date.now();
    if (now - lastSyncRef.current < 45000) return; // At most once every 45s
    lastSyncRef.current = now;

    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (loc?.coords) {
        const { latitude, longitude } = loc.coords;
        let city = '';
        let state = '';
        try {
          const geocodes = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (geocodes && geocodes.length > 0) {
            const g = geocodes[0];
            city = g.city || g.subregion || g.district || '';
            state = g.region || '';
          }
        } catch (_geoErr) {
          // Geocode is optional; coordinates are primary
        }

        const updatePayload = { latitude, longitude };
        if (city) updatePayload.city = city;
        if (state) updatePayload.state = state;

        updateUser(updatePayload);
        await apiUpdateProfile(updatePayload).catch(() => {});
        eventEmitter.emit(EVENTS.LOCATION_UPDATED, updatePayload);
      }
    } catch (locErr) {
      console.warn('[MandatoryLocationModal] sync error:', locErr?.message);
    }
  }, [updateUser]);

  // Concentric radar pulsing animation
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [pulseOpacity] = useState(() => new Animated.Value(0.7));

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.35,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.7,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim, pulseOpacity]);

  // Strict verification: checks both OS permission AND device GPS hardware state
  const verifyLocationStatus = useCallback(async () => {
    try {
      // 1. Check OS Location permissions
      let isGranted = false;
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        isGranted = status === 'granted';
      } catch (_e) {
        if (Platform.OS === 'android') {
          isGranted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
        }
      }
      setHasPermission(isGranted);

      // 2. Check if device-level GPS/location provider is enabled
      let isGpsOn = true;
      try {
        isGpsOn = await Location.hasServicesEnabledAsync();
      } catch (_e) {
        isGpsOn = true;
      }
      setGpsServicesDisabled(!isGpsOn);

      // Compulsory Lock: If either permission is missing OR GPS is off, lock app immediately
      if (!isGranted || !isGpsOn) {
        setVisible(true);
      } else {
        setVisible(false);
        setPermissionDeniedOnce(false);
        syncCoordinates();
      }
    } catch (err) {
      console.warn('[MandatoryLocationModal] verify error:', err?.message);
    }
  }, [syncCoordinates]);

  // Handle Primary CTA (Turn On GPS or Request Permission)
  const handlePrimaryAction = async () => {
    setIsRequesting(true);
    try {
      // Case A: Permission is already granted, but device GPS toggle is turned OFF
      if (hasPermission && gpsServicesDisabled) {
        if (Platform.OS === 'android') {
          try {
            await Location.enableNetworkProviderAsync();
            const isGpsOn = await Location.hasServicesEnabledAsync();
            if (isGpsOn) {
              setGpsServicesDisabled(false);
              verifyLocationStatus();
              return;
            }
          } catch (_e) {
            // User cancelled Google Play Services dialog, open location settings directly
            try {
              await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
            } catch (_err) {
              await Linking.openSettings();
            }
          }
        } else {
          await Linking.openSettings();
        }
        return;
      }

      // Case B: Permission is not yet granted — request from system
      let granted = false;
      try {
        const { status, canAskAgain } =
          await Location.requestForegroundPermissionsAsync();
        granted = status === 'granted';
        if (!granted && !canAskAgain) {
          setPermissionDeniedOnce(true);
        }
      } catch (_e) {
        if (Platform.OS === 'android') {
          const res = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'HeartLink Location Permission',
              message:
                'HeartLink needs access to your location to discover matches near you.',
              buttonPositive: 'Allow',
            }
          );
          granted = res === PermissionsAndroid.RESULTS.GRANTED;
          if (res === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            setPermissionDeniedOnce(true);
          }
        }
      }

      // After permission dialog, also check if device GPS needs enabling
      if (granted) {
        let isGpsOn = true;
        try {
          isGpsOn = await Location.hasServicesEnabledAsync();
        } catch (_e) {
          isGpsOn = true;
        }
        setGpsServicesDisabled(!isGpsOn);

        if (!isGpsOn && Platform.OS === 'android') {
          try {
            await Location.enableNetworkProviderAsync();
          } catch (_e) {
            // User cancelled GPS dialog
          }
        }
      }

      verifyLocationStatus();
    } catch (err) {
      console.warn('[MandatoryLocationModal] action error:', err?.message);
      setPermissionDeniedOnce(true);
    } finally {
      setIsRequesting(false);
    }
  };

  // Open Direct Settings (Location source on Android or App settings)
  const handleOpenSettings = async () => {
    try {
      if (gpsServicesDisabled && Platform.OS === 'android') {
        try {
          await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
          return;
        } catch (_e) {
          await Linking.openSettings();
          return;
        }
      }

      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (_e) {
      try {
        await Linking.openSettings();
      } catch (err) {
        console.warn('Cannot open settings:', err);
      }
    }
  };

  // Continuous monitoring: Check immediately on mount, every 1.5s in foreground, and on AppState change
  useEffect(() => {
    // 1. Initial verification on mount
    const initialTimer = setTimeout(() => {
      verifyLocationStatus();
    }, 50);

    // 2. Real-time liveness check: If user turns off location via quick settings, immediately catch it
    const interval = setInterval(() => {
      verifyLocationStatus();
    }, 1500);

    // 3. Instant resume check when returning from Settings or background
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        verifyLocationStatus();
      }
    });

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      subscription.remove();
    };
  }, [verifyLocationStatus]);

  // Lock Android hardware back button when compulsory modal is visible
  useEffect(() => {
    if (!visible) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Strictly prevent bypassing modal via hardware back button
      return true;
    });

    return () => backHandler.remove();
  }, [visible]);

  if (!visible) return null;

  const isGpsOnlyOff = hasPermission && gpsServicesDisabled;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={styles.container}>
        {/* Deep romantic gradient atmosphere */}
        <LinearGradient
          colors={['#0F021B', '#1D052E', '#090111']}
          style={StyleSheet.absoluteFill}
        />

        {/* Ambient subtle background glows */}
        <View style={styles.glowBlobAmber} pointerEvents="none" />
        <View style={styles.glowBlobPurple} pointerEvents="none" />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Concentric & Mathematically Circular Beacon Centerpiece */}
          <View style={styles.beaconWrapper}>
            {/* Soft Ambient Halo */}
            <View style={styles.beaconHalo} />

            {/* Outer Animated Pulse Radar Ring */}
            <Animated.View
              style={[
                styles.pulseRingOuter,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseOpacity,
                },
              ]}
            />

            {/* Inner Animated Pulse Radar Ring */}
            <Animated.View
              style={[
                styles.pulseRingInner,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseOpacity,
                },
              ]}
            />

            {/* Concentric Static Guide Ring */}
            <View style={styles.radarOrbitRing} />

            {/* Center Gradient Beacon Disc */}
            <LinearGradient
              colors={['#FF007F', '#EC4899', '#F59E0B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.beaconCenter}
            >
              <Ionicons name="location" size={36} color="#FFFFFF" />
              <View style={styles.heartMiniBadge}>
                <Ionicons name="heart" size={13} color="#FF007F" />
              </View>
            </LinearGradient>
          </View>

          {/* Eyebrow Badge */}
          <View style={styles.eyebrowBadge}>
            <LinearGradient
              colors={['rgba(245, 158, 11, 0.25)', 'rgba(251, 191, 36, 0.1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.eyebrowGrad}
            >
              <Ionicons name="sparkles" size={11} color="#FBBF24" style={{ marginRight: 5 }} />
              <Text style={styles.eyebrowText}>
                {isGpsOnlyOff ? 'LOCATION TURNED OFF ⚠️' : 'MANDATORY REQUIREMENT 📍'}
              </Text>
            </LinearGradient>
          </View>

          {/* Dynamic Headline & Subtitle */}
          <Text style={styles.title}>
            {isGpsOnlyOff ? 'Turn On Device Location' : 'Enable Location Access'}
          </Text>
          <Text style={styles.subtitle}>
            {isGpsOnlyOff
              ? 'Device GPS / Location is turned off. HeartLink is not usable without active location to calculate distance and curate local date spots.'
              : 'HeartLink is built on real proximity. Location access is mandatory to connect you with authentic singles nearby and curate local date experiences.'}
          </Text>

          {/* Alert Banner for Disabled GPS */}
          {gpsServicesDisabled && (
            <View style={styles.alertBannerGps}>
              <Ionicons name="navigate-circle" size={18} color="#F59E0B" style={{ marginRight: 8 }} />
              <Text style={styles.alertTextGps}>
                Device GPS is turned off. Please enable Location in quick settings to continue.
              </Text>
            </View>
          )}

          {/* Alert Banner if Permission was Denied */}
          {!hasPermission && permissionDeniedOnce && (
            <View style={styles.alertBanner}>
              <Ionicons name="alert-circle" size={18} color="#FF007F" style={{ marginRight: 8 }} />
              <Text style={styles.alertText}>
                Location permission was denied. Please allow location in your device settings to unlock the app.
              </Text>
            </View>
          )}

          {/* 3 Compact Glassmorphism Benefit Cards */}
          <View style={styles.benefitsList}>
            {/* Card 1 */}
            <View style={styles.benefitCard}>
              <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[styles.benefitIconBox, { backgroundColor: 'rgba(255, 0, 127, 0.16)' }]}>
                <Ionicons name="people" size={18} color="#FF007F" />
              </View>
              <View style={styles.benefitTextBox}>
                <Text style={styles.benefitTitle}>Accurate Nearby Matches</Text>
                <Text style={styles.benefitDesc}>
                  Discover real singles in your exact radius without endless distance guessing.
                </Text>
              </View>
            </View>

            {/* Card 2 */}
            <View style={styles.benefitCard}>
              <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[styles.benefitIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.16)' }]}>
                <Ionicons name="cafe" size={18} color="#F59E0B" />
              </View>
              <View style={styles.benefitTextBox}>
                <Text style={styles.benefitTitle}>Curated Date Planner</Text>
                <Text style={styles.benefitDesc}>
                  Personalized cafes, vineyard resorts, and romantic skyline spots around your city.
                </Text>
              </View>
            </View>

            {/* Card 3 */}
            <View style={styles.benefitCard}>
              <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[styles.benefitIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.16)' }]}>
                <Ionicons name="shield-checkmark" size={18} color="#10B981" />
              </View>
              <View style={styles.benefitTextBox}>
                <Text style={styles.benefitTitle}>Safety & Fraud Protection</Text>
                <Text style={styles.benefitDesc}>
                  Eliminates ghost profiles and spoofers for verified, transparent local dating.
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionWrap}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handlePrimaryAction}
              disabled={isRequesting}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={['#FF007F', '#EC4899', '#F59E0B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryGrad}
              >
                {isRequesting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name={isGpsOnlyOff ? 'location-sharp' : 'navigate'}
                      size={17}
                      color="#FFFFFF"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.primaryBtnText}>
                      {isGpsOnlyOff ? 'Turn On Device Location' : 'Allow Location Access'}
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Secondary Settings Button (shown if GPS is off or permission was denied) */}
            {(isGpsOnlyOff || permissionDeniedOnce) && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleOpenSettings}
                activeOpacity={0.8}
              >
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                <Ionicons name="settings-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.secondaryBtnText}>
                  {isGpsOnlyOff ? 'Open Location Settings' : 'Open Device Settings'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Privacy Reassurance Footer */}
          <View style={styles.privacyFooter}>
            <Ionicons name="lock-closed" size={12} color="rgba(255, 255, 255, 0.45)" style={{ marginRight: 5 }} />
            <Text style={styles.privacyText}>
              Your exact GPS coordinates are never shared publicly. Only approximate distance is shown.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090111',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 44 : 54,
    paddingBottom: 28,
    alignItems: 'center',
  },

  // Subtle background ambient glows (away from center icon)
  glowBlobAmber: {
    position: 'absolute',
    bottom: 80,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    opacity: 0.7,
    zIndex: 0,
  },
  glowBlobPurple: {
    position: 'absolute',
    top: 100,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    opacity: 0.65,
    zIndex: 0,
  },

  // Concentric & Mathematically Circular Beacon Centerpiece
  beaconWrapper: {
    width: 156,
    height: 156,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  beaconHalo: {
    position: 'absolute',
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: 'rgba(255, 0, 127, 0.12)',
  },
  pulseRingOuter: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 0, 127, 0.32)',
    backgroundColor: 'rgba(255, 0, 127, 0.04)',
  },
  pulseRingInner: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  radarOrbitRing: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  beaconCenter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    position: 'relative',
  },
  heartMiniBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#180424',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },

  // Eyebrow Badge
  eyebrowBadge: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  eyebrowGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
  },
  eyebrowText: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  // Titles
  title: {
    fontSize: 23,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 17.5,
    paddingHorizontal: 8,
    marginBottom: 14,
  },

  // Alert Banners
  alertBannerGps: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    marginBottom: 10,
  },
  alertTextGps: {
    flex: 1,
    color: '#FDE68A',
    fontSize: 11.5,
    fontWeight: '600',
    lineHeight: 16,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(255, 0, 127, 0.15)',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 127, 0.45)',
    marginBottom: 10,
  },
  alertText: {
    flex: 1,
    color: '#FBCFE8',
    fontSize: 11.5,
    fontWeight: '600',
    lineHeight: 16,
  },

  // Benefits List
  benefitsList: {
    width: '100%',
    gap: 7,
    marginBottom: 16,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    overflow: 'hidden',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  benefitIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },
  benefitTextBox: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: 15,
  },

  // Action Buttons
  actionWrap: {
    width: '100%',
    gap: 10,
    marginBottom: 14,
  },
  primaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryGrad: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    width: '100%',
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Privacy Footer
  privacyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  privacyText: {
    fontSize: 10.5,
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 14.5,
    textAlign: 'center',
    flex: 1,
  },
});
