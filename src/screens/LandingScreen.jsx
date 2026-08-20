// src/screens/LandingScreen.jsx — Ultra-Attractive Animated Onboarding Experience
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  FlatList,
  Image,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { scale, verticalScale, fs, SCREEN } from '../utils/responsive';

const { width, height } = SCREEN;

const SLIDES = [
  {
    id: '1',
    key: 'matches',
    badgeIcon: 'flame',
    badgeText: '98% Compatibility',
    titlePrefix: 'Find Your ',
    titleHighlight: 'Ideal Match',
    titleSuffix: '',
    description: 'Swipe through verified profiles curated to your vibe, interests, and location.',
  },
  {
    id: '2',
    key: 'chat',
    badgeIcon: 'flash',
    badgeText: 'Real-Time Connection',
    titlePrefix: 'Interact & ',
    titleHighlight: 'Chat Instantly',
    titleSuffix: '',
    description: 'Connect over real-time messages, voice notes, and instant reactions.',
  },
  {
    id: '3',
    key: 'date_planner',
    badgeIcon: 'wine',
    badgeText: 'Date Planner & Invites',
    titlePrefix: 'Plan An ',
    titleHighlight: 'Unforgettable Date',
    titleSuffix: '',
    description: 'Invite your match to curated date spots and confirm plans with ease.',
  },
  {
    id: '4',
    key: 'logo',
    badgeIcon: 'sparkles',
    badgeText: 'Official HeartLink',
    titlePrefix: 'More Profiles,\nMore ',
    titleHighlight: 'Dates',
    titleSuffix: '',
    description: 'Join thousands of authentic singles finding real connection with intention.',
  },
];

// ─── Interactive Chat Graphic Component for Slide 2 ─────────────────────────
function InteractiveChatGraphic({ isActive, floatAnim, dotAnim1, dotAnim2, dotAnim3, isDark, styles }) {
  const [chatStep, setChatStep] = useState(0);

  const msg1Anim = useRef(new Animated.Value(0)).current;
  const msg2Anim = useRef(new Animated.Value(0)).current;
  const msg3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isActive) {
      setChatStep(0);
      msg1Anim.setValue(0);
      msg2Anim.setValue(0);
      msg3Anim.setValue(0);
      return;
    }

    let timer1, timer2, timer3, timer4, timer5, timer6;

    const startChatLoop = () => {
      setChatStep(0);
      msg1Anim.setValue(0);
      msg2Anim.setValue(0);
      msg3Anim.setValue(0);

      // Step 0: Receiver typing dots (1.2s)
      timer1 = setTimeout(() => {
        // Step 1: Receiver sends "Hey! Up for coffee today? ☕"
        setChatStep(1);
        Animated.spring(msg1Anim, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }).start();

        // Step 2: Sender typing dots (1.2s)
        timer2 = setTimeout(() => {
          setChatStep(2);

          // Step 3: Sender sends "I'd love to! Let's pick a spot 🌸"
          timer3 = setTimeout(() => {
            setChatStep(3);
            Animated.spring(msg2Anim, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }).start();

            // Step 4: Receiver typing dots (1.2s)
            timer4 = setTimeout(() => {
              setChatStep(4);

              // Step 5: Receiver sends "Check out the HeartLink Date Planner ✨"
              timer5 = setTimeout(() => {
                setChatStep(5);
                Animated.spring(msg3Anim, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }).start();

                // Loop pause (3.5s)
                timer6 = setTimeout(() => {
                  startChatLoop();
                }, 3500);
              }, 1200);
            }, 1200);
          }, 1200);
        }, 1200);
      }, 1200);
    };

    startChatLoop();

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
      clearTimeout(timer6);
    };
  }, [isActive]);

  return (
    <Animated.View
      style={[
        styles.chatGraphicContainer,
        { transform: [{ translateY: floatAnim }] },
      ]}
    >
      {/* ─── Receiver Message 1 ─── */}
      {chatStep >= 1 && (
        <Animated.View
          style={[
            styles.bubbleReceiver,
            {
              opacity: msg1Anim,
              transform: [{ scale: msg1Anim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) }],
            },
          ]}
        >
          <Text style={styles.bubbleTxtReceiver}>Hey! Up for coffee today? ☕</Text>
        </Animated.View>
      )}

      {/* Receiver Typing Dots (Step 0) */}
      {chatStep === 0 && (
        <View style={[styles.typingBubble, { alignSelf: 'flex-start', marginBottom: 14 }]}>
          <Animated.View style={[styles.typingDot, { opacity: dotAnim1 }]} />
          <Animated.View style={[styles.typingDot, { opacity: dotAnim2 }]} />
          <Animated.View style={[styles.typingDot, { opacity: dotAnim3 }]} />
        </View>
      )}

      {/* ─── Sender Message 2 ─── */}
      {chatStep >= 3 && (
        <Animated.View
          style={[
            styles.bubbleSender,
            {
              opacity: msg2Anim,
              transform: [{ scale: msg2Anim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) }],
            },
          ]}
        >
          <LinearGradient
            colors={['#FF007F', '#8A2BE2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bubbleSenderGrad}
          >
            <Text style={styles.bubbleTxtSender}>I'd love to! Let's pick a spot 🌸</Text>
          </LinearGradient>
        </Animated.View>
      )}

      {/* Sender Typing Dots (Step 2) */}
      {chatStep === 2 && (
        <View style={[styles.typingBubble, { alignSelf: 'flex-end', backgroundColor: 'rgba(255, 0, 127, 0.18)', marginBottom: 14 }]}>
          <Animated.View style={[styles.typingDot, { opacity: dotAnim1, backgroundColor: '#FF007F' }]} />
          <Animated.View style={[styles.typingDot, { opacity: dotAnim2, backgroundColor: '#FF007F' }]} />
          <Animated.View style={[styles.typingDot, { opacity: dotAnim3, backgroundColor: '#FF007F' }]} />
        </View>
      )}

      {/* ─── Receiver Message 3 ─── */}
      {chatStep >= 5 && (
        <Animated.View
          style={[
            styles.bubbleReceiver,
            {
              opacity: msg3Anim,
              transform: [{ scale: msg3Anim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) }],
            },
          ]}
        >
          <Text style={styles.bubbleTxtReceiver}>Check out the HeartLink Date Planner ✨</Text>
        </Animated.View>
      )}

      {/* Receiver Typing Dots (Step 4) */}
      {chatStep === 4 && (
        <View style={[styles.typingBubble, { alignSelf: 'flex-start', marginBottom: 14 }]}>
          <Animated.View style={[styles.typingDot, { opacity: dotAnim1 }]} />
          <Animated.View style={[styles.typingDot, { opacity: dotAnim2 }]} />
          <Animated.View style={[styles.typingDot, { opacity: dotAnim3 }]} />
        </View>
      )}
    </Animated.View>
  );
}

export default function LandingScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // --- Animation Hooks & Loops ---
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const auraScale = useRef(new Animated.Value(1)).current;
  const dotAnim1 = useRef(new Animated.Value(0.3)).current;
  const dotAnim2 = useRef(new Animated.Value(0.3)).current;
  const dotAnim3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Floating Cards Loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim1, { toValue: -12, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim1, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Floating Chat Bubbles & Date Card Loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim2, { toValue: 10, duration: 3200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim2, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Pulse & Glowing Aura Loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(auraScale, { toValue: 1.22, duration: 2000, useNativeDriver: true }),
        Animated.timing(auraScale, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    // Typing Dots Animation
    const createDotAnim = (dotVal, delay) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(dotVal, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(dotVal, { toValue: 0.3, duration: 300, useNativeDriver: true }),
            Animated.delay(300),
          ])
        ),
      ]);
    };

    Animated.parallel([
      createDotAnim(dotAnim1, 0),
      createDotAnim(dotAnim2, 150),
      createDotAnim(dotAnim3, 300),
    ]).start();
  }, []);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const goToNextSlide = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  // --- Render Individual Custom Visual Slide ---
  const renderSlideItem = ({ item, index }) => {
    return (
      <View style={styles.slideContainer}>
        {/* Custom Visual Graphic Header for Each Slide */}
        <View style={styles.visualGraphicWrapper}>
          {item.key === 'matches' && (
            <Animated.View
              style={[
                styles.cardsDeckContainer,
                { transform: [{ translateY: floatAnim1 }] },
              ]}
            >
              {/* Deepest Back Card 2 */}
              <View style={styles.backCardShape2}>
                <LinearGradient
                  colors={['#8A2BE2', '#4A00E0']}
                  style={StyleSheet.absoluteFill}
                />
              </View>

              {/* Middle Back Profile Card 1 */}
              <View style={styles.backCardShape1}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80' }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(15, 12, 27, 0.75)']}
                  style={StyleSheet.absoluteFill}
                />
              </View>

              {/* Front Main Glassmorphic Profile Card (Tilted Right) */}
              <View style={styles.frontMatchCard}>
                <Image
                  source={{ uri: 'https://i.pinimg.com/1200x/a2/e4/72/a2e4721c8e277b4527bcbd05ec5c622d.jpg' }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(15, 12, 27, 0.4)']}
                  style={styles.frontCardGradient}
                >
                  <View style={styles.cardAvatarRow}>
                    <Image
                      source={{ uri: 'https://i.pinimg.com/1200x/a2/e4/72/a2e4721c8e277b4527bcbd05ec5c622d.jpg' }}
                      style={styles.cardAvatarPhoto}
                    />
                    <View style={styles.cardProfileInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.cardProfileName}>Ananya, 23</Text>
                        <Ionicons name="checkmark-circle" size={12} color="#3897F0" />
                      </View>
                      <Text style={styles.cardProfileSub}>Fashion Stylist</Text>
                    </View>
                  </View>

                  {/* Floating Action Heart Button */}
                  <View style={styles.floatingHeartBtn}>
                    <LinearGradient
                      colors={['#FF007F', '#8A2BE2']}
                      style={styles.heartBtnGrad}
                    >
                      <Ionicons name="heart" size={18} color="#FFF" />
                    </LinearGradient>
                  </View>
                </LinearGradient>
              </View>
            </Animated.View>
          )}

          {item.key === 'chat' && (
            <InteractiveChatGraphic
              isActive={currentIndex === index}
              floatAnim={floatAnim2}
              dotAnim1={dotAnim1}
              dotAnim2={dotAnim2}
              dotAnim3={dotAnim3}
              isDark={isDark}
              styles={styles}
            />
          )}

          {item.key === 'date_planner' && (
            <Animated.View
              style={[
                styles.dateGraphicContainer,
                { transform: [{ translateY: floatAnim1 }] },
              ]}
            >
              {/* Main Animated Date Proposal Card */}
              <View style={styles.mainDateProposalCard}>
                <LinearGradient
                  colors={['#1E1B2E', '#0F0C1B']}
                  style={styles.dateCardGradient}
                >
                  <View style={styles.dateCardHeader}>
                    <LinearGradient
                      colors={['#FF007F', '#8A2BE2']}
                      style={styles.dateIconCircle}
                    >
                      <Ionicons name="wine" size={22} color="#FFF" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dateCardTitle}>Date Proposal Received</Text>
                      <Text style={styles.dateCardVenue}>Bastian · Bandra</Text>
                    </View>
                  </View>

                  <View style={styles.dateDetailsBox}>
                    <View style={styles.dateDetailRow}>
                      <Ionicons name="calendar-outline" size={16} color="#FF007F" style={{ marginRight: 6 }} />
                      <Text style={styles.dateDetailTxt}>Friday, 8:00 PM</Text>
                    </View>
                    <View style={styles.dateDetailRow}>
                      <Ionicons name="restaurant-outline" size={16} color="#8A2BE2" style={{ marginRight: 6 }} />
                      <Text style={styles.dateDetailTxt}>Cocktails & Dinner</Text>
                    </View>
                  </View>

                  {/* Accept CTA Button */}
                  <TouchableOpacity activeOpacity={0.85} style={styles.dateCardAcceptBtn}>
                    <LinearGradient
                      colors={['#FF007F', '#E0006C']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.dateCardAcceptGrad}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={styles.dateCardAcceptTxt}>Accept Proposal</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </Animated.View>
          )}

          {item.key === 'logo' && (
            <View style={styles.logoVisualContainer}>
              {/* Animated Glowing Aura Ring */}
              <Animated.View
                style={[
                  styles.auraRing,
                  {
                    transform: [{ scale: auraScale }],
                  },
                ]}
              >
                <LinearGradient
                  colors={['rgba(255, 0, 127, 0.35)', 'rgba(138, 43, 226, 0.05)']}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>

              {/* Official HeartLink Logo Container */}
              <Animated.View
                style={[
                  styles.logoImageHolder,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <Image
                  source={require('../../assets/logo.png')}
                  style={styles.officialHeartLinkLogo}
                  resizeMode="contain"
                />
              </Animated.View>

              {/* Floating Vector Sparkle Elements */}
              <View style={[styles.sparkleTag, { top: -10, left: 10 }]}>
                <Ionicons name="sparkles" size={20} color="#FF007F" />
              </View>
              <View style={[styles.sparkleTag, { top: 20, right: 0 }]}>
                <Ionicons name="heart" size={22} color="#FF007F" />
              </View>
              <View style={[styles.sparkleTag, { bottom: 0, left: 20 }]}>
                <Ionicons name="wine" size={20} color="#8A2BE2" />
              </View>
            </View>
          )}


        </View>

        {/* Text Copy Section */}
        <View style={styles.textSection}>
          <Text style={styles.titleText}>
            {item.titlePrefix}
            <Text style={styles.titleHighlightText}>{item.titleHighlight}</Text>
            {item.titleSuffix}
          </Text>
          <Text style={styles.descriptionText}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      {/* Dynamic Ambient Background Orbs */}
      <View style={styles.ambientOrb1} pointerEvents="none">
        <LinearGradient
          colors={['rgba(255, 0, 127, 0.28)', 'rgba(157, 0, 255, 0.03)']}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={styles.ambientOrb2} pointerEvents="none">
        <LinearGradient
          colors={['rgba(138, 43, 226, 0.22)', 'rgba(255, 105, 180, 0.02)']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        {/* Top Header Navigation (No Skip Button) */}
        <View style={styles.headerBar}>
          <View style={styles.brandGroup}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.headerMiniLogo}
              resizeMode="contain"
            />
            <Text style={styles.headerTitle}>HeartLink</Text>
          </View>
        </View>

        {/* Paging Carousel FlatList */}
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderSlideItem}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={viewConfig}
          scrollEventThrottle={16}
          bounces={false}
        />

        {/* Bottom Navigation & Actions */}
        <View style={styles.bottomBarContainer}>
          {/* Animated Indicator Dots */}
          <View style={styles.dotsRow}>
            {SLIDES.map((_, idx) => {
              const inputRange = [(idx - 1) * width, idx * width, (idx + 1) * width];
              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [8, 28, 8],
                extrapolate: 'clamp',
              });
              const dotOpacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.3, 1, 0.3],
                extrapolate: 'clamp',
              });

              return (
                <Animated.View
                  key={idx}
                  style={[
                    styles.dot,
                    {
                      width: dotWidth,
                      opacity: dotOpacity,
                      backgroundColor: idx === currentIndex ? '#FF007F' : (isDark ? '#FFF' : '#000'),
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Action Control Buttons */}
          <View style={styles.actionsArea}>
            {currentIndex < SLIDES.length - 1 ? (
              <View style={styles.nextCircleRow}>
                <TouchableOpacity
                  style={styles.nextCircleBtn}
                  activeOpacity={0.85}
                  onPress={goToNextSlide}
                >
                  <LinearGradient
                    colors={['#FF007F', '#8A2BE2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.nextCircleGrad}
                  >
                    <Ionicons name="arrow-forward" size={24} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.fullActionGroup}>
                {/* Primary Action: Log In */}
                <TouchableOpacity
                  style={styles.primaryBtnShadow}
                  activeOpacity={0.88}
                  onPress={() => navigation.navigate('Login')}
                >
                  <LinearGradient
                    colors={['#FF007F', '#E0006C', '#8A2BE2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryBtn}
                  >
                    <Ionicons name="log-in-outline" size={22} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryBtnText}>Log In</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Secondary Action: Create Account */}
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  activeOpacity={0.80}
                  onPress={() => navigation.navigate('Register')}
                >
                  <View style={styles.secondaryBtnInner}>
                    <Ionicons
                      name="person-add-outline"
                      size={20}
                      color={isDark ? '#FFF' : '#1A1D2E'}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.secondaryBtnText}>Create Account</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Terms Footer */}
          <Text style={styles.termsNotice}>
            By continuing, you agree to HeartLink's{' '}
            <Text style={styles.termsLink}>Terms</Text> &{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const getStyles = (theme, isDark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#080010' : '#FAFAFD',
    },
    safeArea: {
      flex: 1,
    },
    ambientOrb1: {
      position: 'absolute',
      top: -90,
      right: -70,
      width: 320,
      height: 320,
      borderRadius: 160,
      overflow: 'hidden',
    },
    ambientOrb2: {
      position: 'absolute',
      bottom: 70,
      left: -100,
      width: 360,
      height: 360,
      borderRadius: 180,
      overflow: 'hidden',
    },

    // Header Bar
    headerBar: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 4,
      zIndex: 10,
    },
    brandGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerMiniLogo: {
      width: 30,
      height: 30,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#111827',
      letterSpacing: -0.3,
    },

    // Slide Container
    slideContainer: {
      width: width,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
    },

    // Visual Hero Graphic Section
    visualGraphicWrapper: {
      height: height * 0.44,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      marginBottom: 20,
      paddingTop: 16,
    },

    // Slide 1: 3D Stacked Match Cards Deck (Front Card Tilted Right)
    cardsDeckContainer: {
      width: width * 0.76,
      height: 320,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 10,
    },
    backCardShape2: {
      position: 'absolute',
      width: '90%',
      height: '92%',
      borderRadius: 28,
      transform: [{ rotate: '-8deg' }],
      opacity: 0.5,
    },
    backCardShape1: {
      position: 'absolute',
      width: '95%',
      height: '96%',
      borderRadius: 30,
      overflow: 'hidden',
      transform: [{ rotate: '-3deg' }],
      opacity: 0.8,
      borderWidth: 1.5,
      borderColor: 'rgba(255, 255, 255, 0.25)',
    },
    frontMatchCard: {
      width: '98%',
      height: '98%',
      borderRadius: 32,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: '#FF007F',
      transform: [{ rotate: '5deg' }],
      elevation: 20,
      shadowColor: '#FF007F',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.45,
      shadowRadius: 24,
    },
    frontCardGradient: {
      flex: 1,
      padding: 18,
      justifyContent: 'space-between',
    },
    cardAvatarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 'auto',
      gap: 14,
    },
    cardAvatarPhoto: {
      width: 40,
      height: 40,
      borderRadius: 25,
      borderWidth: 2.5,
      borderColor: '#FF007F',
    },
    cardProfileInfo: {
      flex: 1,
    },
    cardProfileName: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
      letterSpacing: -0.3,
    },
    cardProfileSub: {
      fontSize: 10,
      color: '#E2E8F0',
      fontWeight: '300',
      marginTop: 2,
    },
    floatingMatchBadge: {
      position: 'absolute',
      top: 16,
      right: 16,
      borderRadius: 16,
      overflow: 'hidden',
    },
    badgeGrad: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    badgeTxt: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '800',
    },
    floatingHeartBtn: {
      position: 'absolute',
      bottom: 16,
      right: 16,
      width: 44,
      height: 44,
      borderRadius: 22,
      overflow: 'hidden',
      elevation: 10,
    },
    heartBtnGrad: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Slide 2: Chat Graphic
    chatGraphicContainer: {
      width: width * 0.82,
      height: 220,
      justifyContent: 'center',
    },
    bubbleReceiver: {
      alignSelf: 'flex-start',
      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 20,
      borderBottomLeftRadius: 4,
      maxWidth: '82%',
      marginBottom: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
    },
    bubbleTxtReceiver: {
      fontSize: 14,
      fontWeight: '500',
      color: isDark ? '#FFF' : '#1F2937',
    },
    bubbleSender: {
      alignSelf: 'flex-end',
      borderRadius: 20,
      borderBottomRightRadius: 4,
      maxWidth: '85%',
      overflow: 'hidden',
      marginBottom: 12,
      elevation: 6,
      shadowColor: '#FF007F',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    bubbleSenderGrad: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    bubbleTxtSender: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    typingBubble: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 16,
      gap: 5,
    },
    typingDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#FF007F',
    },

    // Slide 3: Dedicated Date Planner Card Graphic
    dateGraphicContainer: {
      width: width * 0.82,
      height: 220,
      justifyContent: 'center',
      alignItems: 'center',
    },
    mainDateProposalCard: {
      width: '100%',
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 0, 127, 0.22)',
      elevation: 12,
      shadowColor: '#FF007F',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
    },
    dateCardGradient: {
      padding: 18,
    },
    dateCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
    },
    dateIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    dateCardTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    dateCardVenue: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.75)',
      marginTop: 2,
    },
    dateDetailsBox: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      borderRadius: 14,
      padding: 12,
      gap: 6,
      marginBottom: 14,
    },
    dateDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dateDetailTxt: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#F1F5F9' : '#dcdddeff',
    },
    dateCardAcceptBtn: {
      borderRadius: 14,
      overflow: 'hidden',
    },
    dateCardAcceptGrad: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 12,
    },
    dateCardAcceptTxt: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },

    // Slide 4: Logo Visual
    logoVisualContainer: {
      width: 190,
      height: 190,
      justifyContent: 'center',
      alignItems: 'center',
    },
    auraRing: {
      position: 'absolute',
      width: 210,
      height: 210,
      borderRadius: 105,
      overflow: 'hidden',
    },
    logoImageHolder: {
      width: 140,
      height: 140,
      borderRadius: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    officialHeartLinkLogo: {
      width: 140,
      height: 140,
    },
    sparkleTag: {
      position: 'absolute',
      fontSize: 22,
    },

    // Badge Pill Header
    badgePillContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 0, 127, 0.06)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 0, 127, 0.18)',
      paddingHorizontal: scale(14),
      paddingVertical: verticalScale(5),
      borderRadius: scale(20),
      marginTop: verticalScale(8),
    },
    badgePillText: {
      fontSize: fs(11.5),
      fontWeight: '700',
      color: '#FF007F',
    },

    // Text Section
    textSection: {
      alignItems: 'center',
      maxWidth: width * 0.85,
      marginTop: verticalScale(14),
    },
    titleText: {
      fontSize: fs(26),
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#111827',
      textAlign: 'center',
      lineHeight: verticalScale(34),
      letterSpacing: -0.4,
    },
    titleHighlightText: {
      color: '#FF007F',
    },
    descriptionText: {
      fontSize: fs(13.5),
      fontWeight: '400',
      color: isDark ? '#94A3B8' : '#6B7280',
      textAlign: 'center',
      marginTop: verticalScale(8),
      lineHeight: verticalScale(21),
    },

    // Bottom Controls
    bottomBarContainer: {
      paddingHorizontal: scale(24),
      paddingBottom: verticalScale(18),
    },
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: verticalScale(16),
      gap: scale(6),
    },
    dot: {
      height: verticalScale(8),
      borderRadius: scale(4),
    },
    actionsArea: {
      minHeight: verticalScale(100),
      justifyContent: 'center',
    },
    nextCircleRow: {
      alignItems: 'center',
      marginVertical: verticalScale(8),
    },
    nextCircleBtn: {
      width: scale(60),
      height: scale(60),
      borderRadius: scale(30),
      elevation: 10,
      shadowColor: '#FF007F',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
    },
    nextCircleGrad: {
      flex: 1,
      borderRadius: scale(30),
      justifyContent: 'center',
      alignItems: 'center',
    },
    fullActionGroup: {
      width: '100%',
    },
    primaryBtnShadow: {
      borderRadius: scale(16),
      shadowColor: '#FF007F',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
      elevation: 10,
      marginBottom: verticalScale(10),
    },
    primaryBtn: {
      height: verticalScale(50),
      borderRadius: scale(16),
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    primaryBtnText: {
      color: '#FFFFFF',
      fontSize: fs(15.5),
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    secondaryBtn: {
      height: verticalScale(50),
      borderRadius: scale(16),
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.15)',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.85)',
      marginBottom: verticalScale(8),
    },
    secondaryBtnInner: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    secondaryBtnText: {
      color: isDark ? '#FFFFFF' : '#111827',
      fontSize: fs(15.5),
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    termsNotice: {
      fontSize: fs(10.5),
      color: isDark ? '#64748B' : '#9CA3AF',
      textAlign: 'center',
      marginTop: verticalScale(4),
      lineHeight: verticalScale(15),
    },
    termsLink: {
      color: '#FF007F',
      fontWeight: '600',
    },
  });
