// src/screens/LoginScreen.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Animated, Dimensions, KeyboardAvoidingView, Platform,
  StatusBar, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../theme/ThemeContext';
import { loginUser } from '../services/authService';
import CustomAlertModal from '../components/CustomAlertModal';

import { scale, verticalScale, fs, SCREEN } from '../utils/responsive';

const { width, height } = SCREEN;

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const { theme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const logoAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(50)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.spring(logoAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 9 }),
      Animated.parallel([
        Animated.spring(cardAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 10 }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(Animated.sequence([
      Animated.timing(float1, { toValue: 1, duration: 3000, useNativeDriver: true }),
      Animated.timing(float1, { toValue: 0, duration: 3000, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(float2, { toValue: 1, duration: 4200, useNativeDriver: true }),
      Animated.timing(float2, { toValue: 0, duration: 4200, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0, duration: 1200, useNativeDriver: true }),
    ])).start();
  }, []);

  const float1Y = float1.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });
  const float2Y = float2.interpolate({ inputRange: [0, 1], outputRange: [0, 18] });
  const heartScale = shimmer.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMsg, setAlertMsg] = useState('');

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPass = password.trim();

    if (!trimmedEmail || !trimmedPass) {
      setAlertTitle('Missing Credentials');
      setAlertMsg('Please enter both your email address and password to sign in.');
      setAlertVisible(true);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setAlertTitle('Invalid Email');
      setAlertMsg('Please enter a valid email address (e.g. name@example.com).');
      setAlertVisible(true);
      return;
    }

    if (trimmedPass.length < 6) {
      setAlertTitle('Invalid Password');
      setAlertMsg('Password must be at least 6 characters long.');
      setAlertVisible(true);
      return;
    }

    setLoading(true);
    try {
      const res = await loginUser(trimmedEmail, trimmedPass);
      setLoading(false);
      login(res.user, res.access_token);
    } catch (err) {
      setLoading(false);
      setAlertTitle('Login Failed');
      setAlertMsg(err.message || 'Invalid email or password. Please check your credentials and try again.');
      setAlertVisible(true);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />

      {/* Background */}
      <LinearGradient
        colors={theme.bgGrad}
        start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Orbs — clipped so they don't cause horizontal overflow */}
      <View style={styles.orbsClip} pointerEvents="none">
        <Animated.View style={[styles.orb, styles.orb1, { transform: [{ translateY: float1Y }] }]}>
          <LinearGradient colors={['rgba(255,0,127,0.25)', 'transparent']} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View style={[styles.orb, styles.orb2, { transform: [{ translateY: float2Y }] }]}>
          <LinearGradient colors={['rgba(94,92,230,0.20)', 'transparent']} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View style={[styles.orb, styles.orb3, { transform: [{ translateY: float1Y }] }]}>
          <LinearGradient colors={['rgba(191,90,242,0.15)', 'transparent']} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </View>

      {/* All content in one flex column — no ScrollView needed */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Back Button to Landing Screen */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate('Landing')}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>

          {/* Logo */}
          <Animated.View style={[styles.logoSection, { opacity: logoAnim, transform: [{ scale: logoAnim }] }]}>
            <Animated.View style={{ transform: [{ scale: heartScale }], marginBottom: 6 }}>
              <Image
                source={require('../../assets/logo.png')}
                style={{ width: 84, height: 84 }}
                resizeMode="contain"
              />
            </Animated.View>
            <Text style={styles.logoTitle}>HeartLink</Text>
            <Text style={styles.logoSub}>Find your perfect match in absolute style</Text>
          </Animated.View>

          {/* Login Card */}
          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardOpacity,
                transform: [{ translateY: cardAnim }],
                backgroundColor: theme.glass,
              },
            ]}
          >
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardSub}>Sign in to discover matches around you</Text>

            {/* Email input */}
            <View
              style={[
                styles.inputWrap,
                focusedField === 'email' && styles.inputWrapFocused,
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={focusedField === 'email' ? '#FF007F' : theme.textFaint}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor={theme.textFaint}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Password input */}
            <View
              style={[
                styles.inputWrap,
                focusedField === 'password' && styles.inputWrapFocused,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={focusedField === 'password' ? '#FF007F' : theme.textFaint}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={theme.textFaint}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPass ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={theme.textFaint}
                />
              </TouchableOpacity>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => navigation.navigate('ForgotPassword', { email })}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              style={styles.loginBtnWrap}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FBBF24', '#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.loginBtn}
              >
                {loading ? (
                  <Text style={styles.loginBtnText}>Signing In...</Text>
                ) : (
                  <>
                    <Text style={styles.loginBtnText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Social login divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Footer - Sign Up link */}
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerText}>
              New to HeartLink? <Text style={styles.registerLink}>Sign Up</Text>
            </Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>

      <CustomAlertModal
        visible={alertVisible}
        title={alertTitle}
        message={alertMsg}
        icon="alert-circle-outline"
        iconColor="#FF007F"
        confirmText="Got it"
        onConfirm={() => setAlertVisible(false)}
      />
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bgDark },
  flex: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(30),
    paddingBottom: verticalScale(24),
  },
  backBtn: { position: 'absolute', top: verticalScale(16), left: scale(16), zIndex: 10, padding: scale(8), borderRadius: scale(20), backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },

  // Orbs
  orbsClip: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: 999 },
  orb1: { width: scale(260), height: scale(260), top: -verticalScale(50), left: -scale(70), opacity: 0.8 },
  orb2: { width: scale(220), height: scale(220), bottom: verticalScale(70), right: -scale(50), opacity: 0.7 },
  orb3: { width: scale(160), height: scale(160), top: height * 0.4, left: -scale(40), opacity: 0.6 },

  // Logo
  logoSection: { alignItems: 'center', marginBottom: verticalScale(20) },
  heartGrad: {
    width: scale(66), height: scale(66), borderRadius: scale(33),
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#FF007F', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6, shadowRadius: 20, elevation: 12,
  },
  heartEmoji: { fontSize: fs(30) },
  logoTitle: { fontSize: fs(26), fontWeight: '900', color: theme.textPrimary, letterSpacing: -0.5, marginTop: verticalScale(6) },
  logoSub: { fontSize: fs(13), color: theme.textSec, marginTop: verticalScale(3), textAlign: 'center' },

  // Card
  card: {
    borderRadius: scale(24),
    padding: scale(20),
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: verticalScale(18),
    overflow: 'hidden',
  },
  cardTitle: { fontSize: fs(20), fontWeight: '800', color: theme.textPrimary, marginBottom: verticalScale(4) },
  cardSub: { fontSize: fs(12.5), color: theme.textSec, marginBottom: verticalScale(18) },

  // Inputs
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
    borderRadius: scale(14), borderWidth: 1.5, borderColor: theme.border,
    paddingHorizontal: scale(14), paddingVertical: verticalScale(10), marginBottom: verticalScale(10),
  },
  inputWrapFocused: { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.06)' },
  inputIcon: { marginRight: scale(10) },
  input: { flex: 1, color: theme.textPrimary, fontSize: fs(14.5), padding: 0 },
  eyeBtn: { padding: scale(4) },

  // Forgot
  forgotBtn: { alignSelf: 'flex-end', marginBottom: verticalScale(16) },
  forgotText: { color: '#F59E0B', fontSize: fs(12.5), fontWeight: '600' },

  // Sign In
  loginBtnWrap: {
    borderRadius: scale(16),
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: scale(8), paddingVertical: verticalScale(13) },
  loginBtnText: { color: '#fff', fontSize: fs(15.5), fontWeight: '800' },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(14) },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.border },
  dividerText: { color: theme.textFaint, fontSize: fs(12), paddingHorizontal: scale(10) },

  // Register
  registerBtn: { alignItems: 'center' },
  registerText: { color: theme.textSec, fontSize: fs(13.5) },
  registerLink: { color: '#F59E0B', fontWeight: '700' },
});
