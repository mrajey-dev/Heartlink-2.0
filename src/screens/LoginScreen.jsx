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

const { width, height } = Dimensions.get('window');

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
                style={{ width: 84, height: 84, resizeMode: 'contain' }}
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
            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              style={styles.loginBtnWrap}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FF007F', '#B5179E']}
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
    paddingHorizontal: 22,
    paddingTop: 40,
    paddingBottom: 30,
  },
  backBtn: { position: 'absolute', top: 16, left: 16, zIndex: 10, padding: 8, borderRadius: 20, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },

  // Orbs
  orbsClip: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: 999 },
  orb1: { width: 280, height: 280, top: -60, left: -80, opacity: 0.8 },
  orb2: { width: 240, height: 240, bottom: 80, right: -60, opacity: 0.7 },
  orb3: { width: 180, height: 180, top: height * 0.4, left: -50, opacity: 0.6 },

  // Logo
  logoSection: { alignItems: 'center', marginBottom: 24 },
  heartGrad: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#FF007F', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6, shadowRadius: 20, elevation: 12,
  },
  heartEmoji: { fontSize: 34 },
  logoTitle: { fontSize: 30, fontWeight: '900', color: theme.textPrimary, letterSpacing: -0.5, marginTop: 8 },
  logoSub: { fontSize: 14, color: theme.textSec, marginTop: 3, textAlign: 'center' },

  // Card
  card: {
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 20,
    overflow: 'hidden',
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: theme.textPrimary, marginBottom: 5 },
  cardSub: { fontSize: 13, color: theme.textSec, marginBottom: 22 },

  // Inputs
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
    borderRadius: 14, borderWidth: 1.5, borderColor: theme.border,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  inputWrapFocused: { borderColor: '#FF007F', backgroundColor: 'rgba(255,0,127,0.06)' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: theme.textPrimary, fontSize: 15, padding: 0 },
  eyeBtn: { padding: 4 },

  // Forgot
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 18 },
  forgotText: { color: '#FF4D94', fontSize: 13, fontWeight: '600' },

  // Sign In
  loginBtnWrap: { borderRadius: 16, overflow: 'hidden' },
  loginBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 15 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.border },
  dividerText: { color: theme.textFaint, fontSize: 13, paddingHorizontal: 12 },

  // Register
  registerBtn: { alignItems: 'center' },
  registerText: { color: theme.textSec, fontSize: 14 },
  registerLink: { color: '#FF007F', fontWeight: '700' },
});
