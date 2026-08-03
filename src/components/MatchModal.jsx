//src/components/MatchModal.jsx — Festive "It's a Match!" Celebration Screen
import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, Image, Animated, Easing, Dimensions, Platform, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { formatImageUrl, renderVerifiedBadge } from '../utils/helpers';

import { useTheme } from '../theme/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function MatchModal({
  visible,
  currentUser,
  matchedUser,
  onClose,
  onSendMessage,
}) {
  const { theme, isDark } = useTheme();

  // Animation refs
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const heartPulseAnim = useRef(new Animated.Value(1)).current;
  
  // Floating particle animations
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;
  const floatAnim3 = useRef(new Animated.Value(0)).current;
  const floatAnim4 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous pulse for the center heart
      Animated.loop(
        Animated.sequence([
          Animated.timing(heartPulseAnim, {
            toValue: 1.25,
            duration: 750,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(heartPulseAnim, {
            toValue: 1.0,
            duration: 750,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Floating party popper / heart particles
      const animateFloat = (anim, duration, delay) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ).start();
      };

      animateFloat(floatAnim1, 2400, 0);
      animateFloat(floatAnim2, 3000, 400);
      animateFloat(floatAnim3, 2600, 200);
      animateFloat(floatAnim4, 3200, 600);
    }
  }, [visible]);

  if (!visible || !matchedUser) return null;

  // Prepare images
  const myPhotoRaw = currentUser?.avatar || (Array.isArray(currentUser?.photos) && currentUser.photos.length > 0 ? (typeof currentUser.photos[0] === 'string' ? currentUser.photos[0] : currentUser.photos[0]?.photo_url) : '');
  const myPhoto = formatImageUrl(myPhotoRaw) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';

  const matchPhotoRaw = matchedUser?.image || matchedUser?.avatar || (Array.isArray(matchedUser?.photos) && matchedUser.photos.length > 0 ? (typeof matchedUser.photos[0] === 'string' ? matchedUser.photos[0] : matchedUser.photos[0]?.photo_url) : '');
  const matchPhoto = formatImageUrl(matchPhotoRaw) || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80';

  const matchName = matchedUser?.name || 'Your Match';
  const matchAge = matchedUser?.age ? `, ${matchedUser.age}` : '';
  const compatScore = matchedUser?.match || matchedUser?.compatibility_score || 92;

  return (
    <Modal visible={visible} transparent statusBarTranslucent={true} animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <BlurView intensity={85} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={
            isDark
              ? ['rgba(15, 6, 25, 0.95)', 'rgba(38, 9, 54, 0.95)', 'rgba(7, 3, 14, 0.98)']
              : ['rgba(240, 236, 252, 0.95)', 'rgba(253, 240, 246, 0.95)', 'rgba(250, 250, 253, 0.98)']
          }
          style={StyleSheet.absoluteFill}
        />

        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: isDark ? 'rgba(25, 12, 38, 0.88)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 0, 127, 0.35)' : 'rgba(255, 0, 127, 0.20)',
              shadowColor: isDark ? '#FF007F' : '#000000',
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Badge Header */}
          <View style={styles.headerBadgeCapsule}>
            <LinearGradient
              colors={['#FF007F', '#B5179E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.headerBadgeGrad}
            >
              <Ionicons name="sparkles" size={14} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.headerBadgeText}>COSMIC MATCH</Text>
            </LinearGradient>
          </View>

          {/* Main Title */}
          <Text style={[styles.matchTitle, { color: theme.textPrimary }]}>It's a Match!</Text>
          <Text style={[styles.matchSubtitle, { color: theme.textSec }]}>
            You and <Text style={[styles.highlightName, { color: theme.accentBright || '#FF4D94' }]}>{matchName}</Text> liked each other!
          </Text>

          {/* Tilted Photo Cards */}
          <View style={styles.cardsRow}>
            {/* Left Card - User */}
            <View style={[styles.photoCard, styles.leftCard]}>
              <Image source={{ uri: myPhoto }} style={styles.cardImage} resizeMode="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)']}
                style={styles.cardOverlay}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={styles.cardUserTag}>You</Text>
                {renderVerifiedBadge(currentUser, 14)}
              </View>
            </View>

            {/* Right Card - Matched Person */}
            <View style={[styles.photoCard, styles.rightCard]}>
              <Image source={{ uri: matchPhoto }} style={styles.cardImage} resizeMode="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)']}
                style={styles.cardOverlay}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={styles.cardUserTag} numberOfLines={1}>{matchName}</Text>
                {renderVerifiedBadge(matchedUser, 14)}
              </View>
            </View>

            {/* Central Pulsing Heart Badge */}
            <Animated.View
              style={[
                styles.centerHeartCircle,
                { transform: [{ scale: heartPulseAnim }] },
              ]}
            >
              <LinearGradient
                colors={['#34C759', '#30D158']}
                style={styles.centerHeartGrad}
              >
                <Ionicons name="heart" size={26} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>
          </View>

          {/* Compatibility Pill */}
          <View
            style={[
              styles.compatPill,
              {
                backgroundColor: isDark ? 'rgba(255, 0, 127, 0.15)' : 'rgba(255, 0, 127, 0.08)',
                borderColor: isDark ? 'rgba(255, 0, 127, 0.3)' : 'rgba(255, 0, 127, 0.2)',
              },
            ]}
          >
            <Ionicons name="heart-circle" size={16} color="#FF007F" />
            <Text style={[styles.compatText, { color: theme.accentBright || '#FF4D94' }]}>
              {compatScore}% Compatibility Match
            </Text>
          </View>

          {/* Details */}
          <Text style={[styles.personNameAge, { color: theme.textPrimary }]}>
            {matchName}
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            {!!onSendMessage && (
              <TouchableOpacity
                style={styles.primaryBtn}
                activeOpacity={0.85}
                onPress={() => {
                  onClose();
                  onSendMessage(matchedUser);
                }}
              >
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.12)',
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                },
              ]}
              activeOpacity={0.8}
              onPress={onClose}
            >
              <Text style={[styles.secondaryBtnText, { color: theme.textPrimary }]}>Keep Swiping</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  particle: {
    position: 'absolute',
    zIndex: 5,
  },
  particleEmoji: {
    fontSize: 28,
  },
  container: {
    width: width * 0.88,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 28,
    backgroundColor: 'rgba(25, 12, 38, 0.75)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 0, 127, 0.35)',
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  headerBadgeCapsule: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
  },
  headerBadgeGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  matchTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
    textShadowColor: 'rgba(255, 0, 127, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  matchSubtitle: {
    fontSize: 14,
    color: '#E0E0E0',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  highlightName: {
    color: '#FF4D94',
    fontWeight: '700',
  },

  // Tilted Overlapping Photo Cards Layout
  cardsRow: {
    width: '100%',
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    position: 'relative',
  },
  photoCard: {
    width: 140,
    height: 190,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 3,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  leftCard: {
    left: width * 0.1,
    transform: [{ rotate: '-8deg' }],
    borderColor: '#00F0FF',
    zIndex: 1,
  },
  rightCard: {
    right: width * 0.1,
    transform: [{ rotate: '8deg' }],
    borderColor: '#FF007F',
    zIndex: 2,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 8,
  },
  cardUserTag: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    position: 'absolute',
    bottom: 10,
    left: 10,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 4,
  },

  // Center pulsing heart overlap
  centerHeartCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  centerHeartGrad: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  compatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 127, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 127, 0.3)',
    marginBottom: 8,
    gap: 6,
  },
  compatText: {
    color: '#FF4D94',
    fontSize: 12,
    fontWeight: '700',
  },
  personNameAge: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 20,
  },

  buttonsContainer: {
    width: '100%',
    gap: 12,
  },

  primaryGrad: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtn: {
    width: '100%',
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  secondaryBtnText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '700',
  },
});
