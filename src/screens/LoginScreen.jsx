import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Animated, KeyboardAvoidingView, Platform,
  StatusBar, Image, ScrollView, ActivityIndicator, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../theme/ThemeContext';
import { loginUser } from '../services/authService';
import CustomAlertModal from '../components/CustomAlertModal';

import { scale, verticalScale, fs, SCREEN } from '../utils/responsive';

const { height } = SCREEN;

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef(null);

  const { theme, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setIsKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const [logoAnim] = useState(() => new Animated.Value(0));
  const [cardAnim] = useState(() => new Animated.Value(40));
  const [cardOpacity] = useState(() => new Animated.Value(0));
  const [float1] = useState(() => new Animated.Value(0));
  const [float2] = useState(() => new Animated.Value(0));
  const [pulseAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    Animated.stagger(120, [
      Animated.spring(logoAnim, { toValue: 1, useNativeDriver: true, tension: 45, friction: 8 }),
      Animated.parallel([
        Animated.spring(cardAnim, { toValue: 0, useNativeDriver: true, tension: 45, friction: 9 }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(Animated.sequence([
      Animated.timing(float1, { toValue: 1, duration: 3200, useNativeDriver: true }),
      Animated.timing(float1, { toValue: 0, duration: 3200, useNativeDriver: true }),
    ])).start();

    Animated.loop(Animated.sequence([
      Animated.timing(float2, { toValue: 1, duration: 4400, useNativeDriver: true }),
      Animated.timing(float2, { toValue: 0, duration: 4400, useNativeDriver: true }),
    ])).start();

    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.06, duration: 1600, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
    ])).start();
  }, [cardAnim, cardOpacity, float1, float2, logoAnim, pulseAnim]);

  const float1Y = useMemo(() => float1.interpolate({ inputRange: [0, 1], outputRange: [0, -22] }), [float1]);
  const float2Y = useMemo(() => float2.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }), [float2]);

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

      {/* Dynamic Background Gradient */}
      <LinearGradient
        colors={theme.bgGrad}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating Glowing Neon Ambient Orbs */}
      <View style={styles.orbsClip} pointerEvents="none">
        <Animated.View style={[styles.orb, styles.orb1, { transform: [{ translateY: float1Y }] }]}>
          <LinearGradient
            colors={['rgba(255, 0, 127, 0.32)', 'rgba(181, 23, 158, 0.12)', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View style={[styles.orb, styles.orb2, { transform: [{ translateY: float2Y }] }]}>
          <LinearGradient
            colors={['rgba(121, 40, 202, 0.28)', 'rgba(94, 92, 230, 0.10)', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View style={[styles.orb, styles.orb3, { transform: [{ translateY: float1Y }] }]}>
          <LinearGradient
            colors={['rgba(255, 101, 132, 0.20)', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>

      <SafeAreaView style={styles.safeArea}>
        {/* Navigation Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.navRoundBtn}
            onPress={() => navigation.navigate('Landing')}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={scale(20)} color={theme.textPrimary} />
          </TouchableOpacity>

          <View style={styles.brandPill}>
            <Ionicons name="sparkles" size={scale(11)} color="#FF007F" style={{ marginRight: scale(4) }} />
            <Text style={styles.brandPillText}>VERIFIED SINGLES</Text>
          </View>

          <TouchableOpacity
            style={styles.navRoundBtn}
            onPress={toggleTheme}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isDark ? "sunny-outline" : "moon-outline"}
              size={scale(18)}
              color={theme.textPrimary}
            />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.flex}
            contentContainerStyle={[
              styles.scrollContent,
              isKeyboardVisible && { paddingBottom: keyboardHeight + verticalScale(30) },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
            scrollEnabled={true}
            nestedScrollEnabled={true}
            bounces={true}
            alwaysBounceVertical={true}
            overScrollMode="always"
          >
            {/* Header Brand Section */}
            <Animated.View style={[styles.logoSection, { opacity: logoAnim, transform: [{ scale: logoAnim }] }]}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }], marginBottom: verticalScale(6) }}>
                <Image
                  source={require('../../assets/logo.png')}
                  style={styles.logoImg}
                  resizeMode="contain"
                />
              </Animated.View>
              <Text style={styles.logoTitle}>HeartLink</Text>
              <Text style={styles.logoSub}>Find your authentic match with verified vibes</Text>
            </Animated.View>

            {/* Glassmorphism Auth Card */}
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: cardOpacity,
                  transform: [{ translateY: cardAnim }],
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Sign In</Text>
                {/* <Text style={styles.cardSub}>Sign in to continue connecting with matches</Text> */}
              </View>

              {/* Email Input Field */}
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <View
                style={[
                  styles.inputWrap,
                  focusedField === 'email' && styles.inputWrapFocused,
                ]}
              >
                <View style={styles.inputIconBox}>
                  <Ionicons
                    name="mail-outline"
                    size={scale(18)}
                    color={focusedField === 'email' ? '#FF007F' : theme.textSec}
                  />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor={theme.textFaint}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  onFocus={() => {
                    setFocusedField('email');
                    setTimeout(() => scrollViewRef.current?.scrollTo({ y: verticalScale(60), animated: true }), 150);
                  }}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              {/* Password Input Field */}
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View
                style={[
                  styles.inputWrap,
                  focusedField === 'password' && styles.inputWrapFocused,
                ]}
              >
                <View style={styles.inputIconBox}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={scale(18)}
                    color={focusedField === 'password' ? '#FF007F' : theme.textSec}
                  />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={theme.textFaint}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  onFocus={() => {
                    setFocusedField('password');
                    setTimeout(() => scrollViewRef.current?.scrollTo({ y: verticalScale(130), animated: true }), 150);
                  }}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity
                  onPress={() => setShowPass(s => !s)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPass ? 'eye-outline' : 'eye-off-outline'}
                    size={scale(18)}
                    color={showPass ? '#FF007F' : theme.textSec}
                  />
                </TouchableOpacity>
              </View>

              {/* Forgot Password Link */}
              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={() => navigation.navigate('ForgotPassword', { email })}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              {/* Sign In CTA Button */}
              <TouchableOpacity
                onPress={handleLogin}
                style={styles.loginBtnWrap}
                activeOpacity={0.88}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#FF007F', '#E0006C', '#8A2BE2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginBtn}
                >
                  {loading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: scale(8) }} />
                      <Text style={styles.loginBtnText}>Signing In...</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.loginBtnText}>Sign In</Text>
                      <Ionicons name="arrow-forward" size={scale(17)} color="#FFFFFF" style={{ marginLeft: scale(6) }} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Registration CTA Footer */}
            <View style={styles.footerSection}>
              <TouchableOpacity
                style={styles.registerBtn}
                onPress={() => navigation.navigate('Register')}
                activeOpacity={0.75}
              >
                <Text style={styles.registerText}>
                  Don&apos;t have an account yet?{' '}
                  <Text style={styles.registerLink}>Sign Up</Text>
                </Text>
              </TouchableOpacity>

              <View style={styles.securityPill}>
                <Ionicons name="shield-checkmark" size={scale(12)} color="#30D158" style={{ marginRight: scale(5) }} />
                <Text style={styles.securityText}>256-bit Encrypted • Verified Profiles Only</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

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

const getStyles = (theme, isDark) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: isDark ? '#080516' : '#F0ECFC',
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(40),
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(4),
    paddingBottom: verticalScale(8),
    zIndex: 10,
  },
  navRoundBtn: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(14),
    backgroundColor: 'rgba(255, 0, 127, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 127, 0.20)',
  },
  brandPillText: {
    color: '#FF007F',
    fontSize: fs(10),
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  // Glowing Ambient Background Orbs
  orbsClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    width: scale(280),
    height: scale(280),
    top: -verticalScale(40),
    left: -scale(60),
    opacity: 0.85,
  },
  orb2: {
    width: scale(240),
    height: scale(240),
    bottom: verticalScale(60),
    right: -scale(50),
    opacity: 0.8,
  },
  orb3: {
    width: scale(180),
    height: scale(180),
    top: height * 0.42,
    left: -scale(40),
    opacity: 0.65,
  },

  // Brand / Logo Section
  logoSection: {
    alignItems: 'center',
    marginBottom: verticalScale(16),
    marginTop: verticalScale(4),
  },
  logoImg: {
    width: scale(82),
    height: scale(82),
  },
  logoTitle: {
    fontSize: fs(25),
    fontWeight: '900',
    color: theme.textPrimary,
    letterSpacing: -0.4,
  },
  logoSub: {
    fontSize: fs(12),
    color: theme.textSec,
    marginTop: verticalScale(2),
    textAlign: 'center',
  },

  // Glass Auth Card
  card: {
    borderRadius: scale(24),
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(18),
    backgroundColor: isDark ? 'rgba(24, 17, 44, 0.82)' : 'rgba(255, 255, 255, 0.90)',
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 0, 127, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: isDark ? 0.35 : 0.08,
    shadowRadius: 20,
    elevation: 6,
    marginBottom: verticalScale(16),
  },
  cardHeader: {
    marginBottom: verticalScale(14),
  },
  cardTitle: {
    fontSize: fs(19),
    fontWeight: '800',
    color: theme.textPrimary,
    letterSpacing: -0.3,
  },
  cardSub: {
    fontSize: fs(12),
    color: theme.textSec,
    marginTop: verticalScale(2),
  },

  // Inputs
  inputLabel: {
    fontSize: fs(10.5),
    fontWeight: '800',
    color: theme.textSec,
    letterSpacing: 0.6,
    marginBottom: verticalScale(5),
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.04)',
    borderRadius: scale(14),
    borderWidth: 0,
    borderColor: 'transparent',
    paddingHorizontal: scale(14),
    height: verticalScale(50),
    marginBottom: verticalScale(14),
  },
  inputWrapFocused: {
    backgroundColor: isDark ? 'rgba(255, 0, 127, 0.12)' : 'rgba(255, 0, 127, 0.06)',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  inputIconBox: {
    marginRight: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
    color: theme.textPrimary,
    fontSize: fs(14.5),
    fontWeight: '500',
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlignVertical: 'center',
  },
  eyeBtn: {
    padding: scale(6),
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Forgot Password
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -verticalScale(4),
    marginBottom: verticalScale(16),
  },
  forgotText: {
    color: '#FF007F',
    fontSize: fs(12),
    fontWeight: '700',
  },

  // Sign In CTA
  loginBtnWrap: {
    borderRadius: scale(16),
    overflow: 'hidden',
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 5,
  },
  loginBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(13),
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: fs(15),
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Footer
  footerSection: {
    alignItems: 'center',
    marginTop: verticalScale(2),
  },
  registerBtn: {
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(12),
  },
  registerText: {
    color: theme.textSec,
    fontSize: fs(13),
  },
  registerLink: {
    color: '#FF007F',
    fontWeight: '800',
  },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(8),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
  },
  securityText: {
    color: theme.textFaint,
    fontSize: fs(10.5),
    fontWeight: '600',
  },
});
