// src/components/RadarLoader.jsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Radar geometry ─────────────────────────────────────────────────────────
const RADAR_SIZE = Math.min(SCREEN_W * 0.88, 360); // Square radar canvas
const CENTER = RADAR_SIZE / 2;

const RING_RADII = [
  RADAR_SIZE * 0.18,  // inner
  RADAR_SIZE * 0.30,  // mid
  RADAR_SIZE * 0.43,  // outer
];

const PROFILE_SIZE = 80;
const BORDER_GAP = 3;

// ─── Nearby user avatars placed on each ring ──────────────────────────────
const RING_DOTS = [
  [{ angle: 315, src: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&q=80' }],
  [
    { angle: 60, src: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80' },
    { angle: 220, src: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&q=80' },
  ],
  [
    { angle: 30, src: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&q=80' },
    { angle: 160, src: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&q=80' },
    { angle: 290, src: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=80&q=80' },
  ],
];

// ─── Helper: pixel position from center at given radius + angle ────────────
function polarToXY(radius, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180; // 0° = top
  return {
    x: CENTER + Math.cos(rad) * radius,
    y: CENTER + Math.sin(rad) * radius,
  };
}

// ─── Static ring (guide circle) ──────────────────────────────────────────
function StaticRing({ radius, opacity, isDark }) {
  const size = radius * 2;
  return (
    <View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: radius,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)',
        opacity,
        left: CENTER - radius,
        top: CENTER - radius,
      }}
    />
  );
}

// ─── Animated pulsing ring ────────────────────────────────────────────────
function PulseRing({ radius, delay, color }) {
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 2600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.9, duration: 300, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 2300, useNativeDriver: true }),
          ]),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.4, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  const size = radius * 2;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: radius,
        borderWidth: 1.5,
        borderColor: color,
        left: CENTER - radius,
        top: CENTER - radius,
        transform: [{ scale }],
        opacity,
      }}
    />
  );
}

// ─── Avatar dot on ring ───────────────────────────────────────────────────
function AvatarDot({ x, y, src, delay, theme, isDark }) {
  const DOT = 32;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: DOT,
        height: DOT,
        left: x - DOT / 2,
        top: y - DOT / 2,
        opacity,
        transform: [{ scale }],
      }}
    >
      <LinearGradient
        colors={theme?.gradientAccent || ['#FF007F', '#B5179E']}
        style={{
          width: DOT,
          height: DOT,
          borderRadius: DOT / 2,
          padding: 2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          source={{ uri: src }}
          style={{
            width: DOT - 4,
            height: DOT - 4,
            borderRadius: (DOT - 4) / 2,
            borderWidth: 1.5,
            borderColor: isDark ? '#0D0214' : '#FFFFFF',
          }}
        />
      </LinearGradient>
    </Animated.View>
  );
}

// ─── Radar sweep arm ─────────────────────────────────────────────────────
function SweepArm() {
  const rotate = useRef(new Animated.Value(0)).current;
  const ARM = RING_RADII[2];
  const BOX = ARM * 2; // Square: its center sits on radar center

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 3200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: BOX,
        height: BOX,
        left: CENTER - ARM,   // center the square on radar center
        top: CENTER - ARM,
        transform: [{ rotate: spin }],
      }}
    >
      {/* Arm extends from the square's center to its right edge */}
      <LinearGradient
        colors={['rgba(255,0,127,0.0)', 'rgba(255,0,127,0.55)', 'rgba(255,0,127,0.0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          position: 'absolute',
          left: ARM,         // starts at horizontal center
          top: ARM - 1,      // vertically centered
          width: ARM,
          height: 2,
          borderRadius: 1,
        }}
      />
    </Animated.View>
  );
}

// ─── Cycling status text ──────────────────────────────────────────────────
const STATUSES = [
  'Finding your matches…',
  'Scanning nearby profiles…',
  'Discovering people near you…',
  'Almost ready…',
];

function StatusText({ theme }) {
  const [idx, setIdx] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const iv = setInterval(() => {
      Animated.sequence([
        Animated.timing(fade, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
      setIdx(p => (p + 1) % STATUSES.length);
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  return (
    <Animated.Text style={[s.statusText, { opacity: fade, color: theme?.textSec || 'rgba(255,255,255,0.65)' }]}>
      {STATUSES[idx]}
    </Animated.Text>
  );
}

// ─── Bouncing loading dots ────────────────────────────────────────────────
function LoadingDots({ theme }) {
  const anims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = anims.map((a, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(a, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      )
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);

  return (
    <View style={s.dotsRow}>
      {anims.map((a, i) => (
        <Animated.View key={i} style={[s.dot, { transform: [{ translateY: a }], backgroundColor: theme?.accent || '#FF007F' }]} />
      ))}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────
export default function RadarLoader() {
  const { theme, isDark } = useTheme();
  const [profilePic, setProfilePic] = useState(null);
  const [userName, setUserName] = useState('');

  const profileScale = useRef(new Animated.Value(0.5)).current;
  const profileOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Load cached user
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('@heartlink_user_session');
        if (raw) {
          const u = JSON.parse(raw);
          const pic =
            u.avatar ||
            (Array.isArray(u.photos) && typeof u.photos[0] === 'string' && u.photos[0]) ||
            (Array.isArray(u.images) && typeof u.images[0] === 'string' && u.images[0]) ||
            null;
          setProfilePic(pic);
          setUserName(u.name || u.first_name || '');
        }
      } catch (_) { }
    })();

    // Profile entrance
    Animated.parallel([
      Animated.spring(profileScale, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
      Animated.timing(profileOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    // Pulsing glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowScale, { toValue: 1.15, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={[s.root, { backgroundColor: theme.bgGrad?.[0] || '#0A0118' }]}>
      {/* Background */}
      <LinearGradient
        colors={theme.bgGrad}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Radar canvas ─────────────────────────────────────── */}
      <View style={[s.radar, { width: RADAR_SIZE, height: RADAR_SIZE }]}>

        {/* Ambient glow — centered in radar canvas using pixel math */}
        <View
          style={{
            position: 'absolute',
            width: RADAR_SIZE * 0.92,
            height: RADAR_SIZE * 0.92,
            borderRadius: RADAR_SIZE * 0.46,
            backgroundColor: isDark ? 'rgba(120,10,180,0.14)' : 'rgba(255,0,127,0.08)',
            left: CENTER - RADAR_SIZE * 0.46,
            top: CENTER - RADAR_SIZE * 0.46,
          }}
        />

        {/* Static guide rings */}
        {RING_RADII.map((r, i) => (
          <StaticRing key={`s${i}`} radius={r} opacity={0.4 - i * 0.08} isDark={isDark} />
        ))}

        {/* Pulse rings */}
        {RING_RADII.map((r, i) => (
          <PulseRing
            key={`p${i}`}
            radius={r}
            delay={i * 850}
            color={[theme.accent || '#FF007F', '#C0139A', '#7B12C4'][i]}
          />
        ))}

        {/* Sweep arm */}
        <SweepArm />

        {/* Avatar dots on each ring */}
        {RING_DOTS.map((ring, ri) =>
          ring.map((dot, di) => {
            const pos = polarToXY(RING_RADII[ri], dot.angle);
            return (
              <AvatarDot
                key={`d${ri}-${di}`}
                x={pos.x}
                y={pos.y}
                src={dot.src}
                delay={800 + ri * 400 + di * 200}
                theme={theme}
                isDark={isDark}
              />
            );
          })
        )}

        {/* ── Center profile ─────────────────────────── */}
        <Animated.View
          style={[
            s.profileAnchor,
            {
              left: CENTER - (PROFILE_SIZE / 2 + BORDER_GAP + 2),
              top: CENTER - (PROFILE_SIZE / 2 + BORDER_GAP + 2),
              opacity: profileOpacity,
              transform: [{ scale: profileScale }],
            },
          ]}
        >
          {/* Pulsing glow halo */}
          <Animated.View
            style={[
              s.halo,
              {
                backgroundColor: isDark ? 'rgba(255,0,127,0.22)' : 'rgba(255,0,127,0.14)',
                transform: [{ scale: glowScale }],
              },
            ]}
          />

          {/* Gradient ring border */}
          <LinearGradient
            colors={theme.gradientAccent || ['#FF007F', '#C413C4', '#5E5CE6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.gradBorder}
          >
            <View style={[s.imgClip, { backgroundColor: isDark ? '#1D052A' : '#F0ECFC' }]}>
              {profilePic ? (
                <Image source={{ uri: profilePic }} style={s.profileImg} />
              ) : (
                <LinearGradient colors={theme.gradientAccent || ['#FF4D94', '#B5179E']} style={s.profileImg}>
                  <Text style={s.initial}>
                    {userName ? userName[0].toUpperCase() : '♥'}
                  </Text>
                </LinearGradient>
              )}
            </View>
          </LinearGradient>

          {/* Online green dot */}
          <View style={[s.onlineDot, { borderColor: isDark ? '#0A0118' : '#FFFFFF' }]} />
        </Animated.View>

      </View>
      {/* ── End radar canvas ──────────────────────────────────── */}

      {/* ── Bottom info ─────────────────────────────────────── */}
      <View style={s.info}>
        {/* Gradient app name — text only, no box */}
        <Text style={s.appName}>
          <Text style={[s.appNameHeart, { color: theme.accent || '#FF007F' }]}>Heart</Text>
          <Text style={[s.appNameLink, { color: theme.textPrimary }]}>Link</Text>
        </Text>

        <StatusText theme={theme} />
        <LoadingDots theme={theme} />

        {userName ? (
          <Text style={[s.welcome, { color: theme.textFaint }]}>
            {'Welcome back, ' + userName.split(' ')[0]}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0118',
  },

  // Radar canvas — fixed square, children use absolute pixel coords
  radar: {
    position: 'relative',
  },

  // Profile anchor — absolutely placed at pixel center
  profileAnchor: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: PROFILE_SIZE + 36,
    height: PROFILE_SIZE + 36,
    borderRadius: (PROFILE_SIZE + 36) / 2,
    backgroundColor: 'rgba(255,0,127,0.22)',
  },
  gradBorder: {
    width: PROFILE_SIZE + BORDER_GAP * 2 + 4,
    height: PROFILE_SIZE + BORDER_GAP * 2 + 4,
    borderRadius: (PROFILE_SIZE + BORDER_GAP * 2 + 4) / 2,
    padding: BORDER_GAP + 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 18,
    elevation: 16,
  },
  imgClip: {
    width: PROFILE_SIZE,
    height: PROFILE_SIZE,
    borderRadius: PROFILE_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#1D052A',
  },
  profileImg: {
    width: PROFILE_SIZE,
    height: PROFILE_SIZE,
    borderRadius: PROFILE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#30D158',
    borderWidth: 2,
    borderColor: '#0A0118',
  },

  // Info section
  info: {
    marginTop: 40,
    alignItems: 'center',
    gap: 8,
  },
  appName: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  appNameHeart: {
    color: '#FF007F',
  },
  appNameLink: {
    color: '#ffffff',
  },
  statusText: {
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.50)',
    letterSpacing: 0.2,
    marginTop: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    height: 18,
    marginTop: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FF007F',
  },
  welcome: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 4,
  },
});
