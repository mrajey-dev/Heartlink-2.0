// src/screens/DatePlannerScreen.jsx — Ultra-Modern Gen-Z Date Planner & Spot Curator
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  FlatList,
  TextInput,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BlurView from '../components/SafeBlurView';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { apiGetRestaurants } from '../services/api';

const { width, height } = Dimensions.get('window');
const STORAGE_KEY_SAVED_SPOTS = 'heartlink_saved_spots';

// Curated Real Date Spots: Top Cafes & Luxury Hotels/Vineyards in Nashik, Maharashtra
export const NASHIK_DATE_SPOTS = [
  {
    id: 'nsk-1',
    name: 'The Source at Sula (Sula Vineyards)',
    category: 'Vineyard Resort & Tuscan Dining',
    rating: '4.95',
    location: 'Gangapur Dam, Nashik',
    price_range: '$$$$',
    image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800',
    description: 'Tuscan-style heritage vineyard resort overlooking lush grape vines and Gangapur lake. Fine wine tasting, lakeside Italian dinners, and romantic sunsets.',
    map_url: 'https://maps.google.com/?q=The+Source+at+Sula+Vineyards+Nashik',
    is_boosted: true,
  },
  {
    id: 'nsk-2',
    name: 'Radisson Blu Hotel & Spa',
    category: '5-Star Luxury Hotel & Lounge',
    rating: '4.9',
    location: 'Pathardi Phata, Nashik',
    price_range: '$$$$',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    description: 'Ultra-luxe 5-star getaway with stunning Pandav Leni hill views, sunset poolside dining, crafted mixology, and romantic candlelight ambiance.',
    map_url: 'https://maps.google.com/?q=Radisson+Blu+Hotel+Nashik',
    is_boosted: true,
  },
  {
    id: 'nsk-3',
    name: 'The Gateway Hotel Ambad (Taj)',
    category: '5-Star Heritage Luxury Hotel',
    rating: '4.85',
    location: 'Ambad, Nashik',
    price_range: '$$$$',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
    description: '20 acres of lush landscaped royal gardens. Candlelit romantic dinners at Panchratna with royal ambiance and live classical music.',
    map_url: 'https://maps.google.com/?q=The+Gateway+Hotel+Ambad+Taj+Nashik',
    is_boosted: true,
  },
  {
    id: 'nsk-4',
    name: 'Cafe Bliss',
    category: 'Aesthetic Artisan Cafe',
    rating: '4.8',
    location: 'College Road, Nashik',
    price_range: '$$',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800',
    description: 'Nashik’s favorite aesthetic date cafe. Artisan espresso, blueberry cheesecakes, wood-fired thin crust pizza, and warm cozy lighting.',
    map_url: 'https://maps.google.com/?q=Cafe+Bliss+College+Road+Nashik',
    is_boosted: false,
  },
  {
    id: 'nsk-5',
    name: 'The Cobble Street Cafe',
    category: 'European Bistro & Coffee Bar',
    rating: '4.75',
    location: 'Gangapur Road, Nashik',
    price_range: '$$',
    image: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800',
    description: 'European cobblestone street aesthetic with rustic brick arches, specialty pour-overs, handmade pastas, and cozy date tables.',
    map_url: 'https://maps.google.com/?q=The+Cobble+Street+Cafe+Gangapur+Road+Nashik',
    is_boosted: false,
  },
  {
    id: 'nsk-6',
    name: 'Soma Vine Village & Resort',
    category: 'Boutique Wine Resort & Lake Bistro',
    rating: '4.8',
    location: 'Gangapur Backwaters, Nashik',
    price_range: '$$$$',
    image: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800',
    description: 'Serene lakeside resort nestled against the Sahyadri mountains. Sunset infinity pool dining with wine tours and gourmet wood-fired pizza.',
    map_url: 'https://maps.google.com/?q=Soma+Vine+Village+Resort+Nashik',
    is_boosted: false,
  },
  {
    id: 'nsk-7',
    name: 'Woodside Cafe & Bistro',
    category: 'Garden Cafe & Pizzeria',
    rating: '4.8',
    location: 'Gangapur Road, Nashik',
    price_range: '$$',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
    description: 'Lush green open-air canopy seating surrounded by fairy lights and potted plants. Romantic wood-fired oven pizzas and artisan shakes.',
    map_url: 'https://maps.google.com/?q=Woodside+Cafe+Gangapur+Road+Nashik',
    is_boosted: false,
  },
  {
    id: 'nsk-8',
    name: 'Courtyard by Marriott Nashik',
    category: 'Premium Luxury Hotel & Lounge',
    rating: '4.8',
    location: 'Mumbai Naka, Nashik',
    price_range: '$$$$',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
    description: 'Chic contemporary 5-star hotel with romantic date atmospheres. Features the Coffee & Crust lounge and curated international cuisines.',
    map_url: 'https://maps.google.com/?q=Courtyard+by+Marriott+Nashik',
    is_boosted: false,
  },
  {
    id: 'nsk-9',
    name: 'Tales & Spirits Cafe',
    category: 'Youth Cafe & Rooftop',
    rating: '4.65',
    location: 'College Road, Nashik',
    price_range: '$$',
    image: 'https://images.unsplash.com/photo-1525610553991-2bede1a236e2?w=800',
    description: 'Trendy rooftop hotspot with fairy lights, outdoor breezes, signature coolers, loaded nachos, and lively upbeat acoustic music.',
    map_url: 'https://maps.google.com/?q=Tales+and+Spirits+Cafe+College+Road+Nashik',
    is_boosted: false,
  },
  {
    id: 'nsk-10',
    name: 'River Dine Restaurant & Banquet',
    category: 'Riverside Open-Air Dining',
    rating: '4.7',
    location: 'Gangapur Road, Nashik',
    price_range: '$$$',
    image: 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?w=800',
    description: 'Romantic open-air seating beside the Godavari riverbanks with canopy lights, cool breezes, and North Indian & tandoori delights.',
    map_url: 'https://maps.google.com/?q=River+Dine+Restaurant+Gangapur+Road+Nashik',
    is_boosted: false,
  },
  {
    id: 'nsk-11',
    name: 'Coffee Nation',
    category: 'Specialty Coffee House',
    rating: '4.6',
    location: 'Mahatma Nagar, Nashik',
    price_range: '$',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',
    description: 'Cozy first-date spot with fresh-brewed artisan coffee, dark hot chocolate, and board games in a relaxed intimate ambiance.',
    map_url: 'https://maps.google.com/?q=Coffee+Nation+Mahatma+Nagar+Nashik',
    is_boosted: false,
  },
  {
    id: 'nsk-12',
    name: 'L’Attitude Cafe & Kitchen',
    category: 'Rooftop Cafe & Bakery',
    rating: '4.7',
    location: 'Canada Corner, Nashik',
    price_range: '$$',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
    description: 'Elevated rooftop terrace cafe overlooking the city. Fresh baked buttery croissants, iced lattes, and golden hour views.',
    map_url: 'https://maps.google.com/?q=L+Attitude+Cafe+Canada+Corner+Nashik',
    is_boosted: false,
  },
];

// Interactive Vibe Filter Chips for Nashik (kept for reference)
export const VIBE_CATEGORIES = [
  { id: 'all', label: 'All Nashik Spots 📍', icon: 'sparkles' },
  { id: 'cafe', label: 'Aesthetic Cafes ☕', icon: 'cafe' },
  { id: 'hotel', label: 'Luxury Hotels 🏨', icon: 'business' },
  { id: 'vineyard', label: 'Vineyard Resorts 🍷', icon: 'wine' },
  { id: 'rooftop', label: 'Rooftops & Views 🌃', icon: 'moon' },
  { id: 'casual', label: 'Garden & Casual 🍕', icon: 'pizza' },
  { id: 'saved', label: 'Saved Vibes 💖', icon: 'heart' },
];

// Curated Gen-Z Date Hacks for Nashik
const DATE_HACKS = [
  {
    id: '1',
    emoji: '🍷',
    tag: 'NASHIK VIBE',
    title: 'Vineyard Sunset Dates',
    desc: 'Sula & Soma backwaters have the most romantic golden hour lighting in Nashik for memorable photos.',
  },
  {
    id: '2',
    emoji: '☕',
    tag: 'FIRST DATE CODE',
    title: 'College Road Hangouts',
    desc: 'Cafe Bliss or Cobble Street are unmatched for relaxed, low-pressure afternoon coffee & banter.',
  },
  {
    id: '3',
    emoji: '🏨',
    tag: '5-STAR LUXURY',
    title: 'Grand Celebrations',
    desc: 'Radisson Blu or Taj Gateway are perfect for anniversaries, fine dining, and candlelight dates.',
  },
  {
    id: '4',
    emoji: '🌊',
    tag: 'RIVERSIDE CHILL',
    title: 'Godavari River Dine',
    desc: 'River Dine on Gangapur Road offers cool evening river breezes and open-sky canopy dining.',
  },
];

// Helper to generate a contextual Gen-Z sticker badge for a Nashik spot
const getGenZVibeTag = (spot) => {
  const name = (spot.name || '').toLowerCase();
  const cat = (spot.category || '').toLowerCase();
  const desc = (spot.description || '').toLowerCase();

  if (name.includes('sula') || name.includes('soma') || cat.includes('vineyard') || desc.includes('wine')) {
    return { label: 'Vineyard Romance 🍷', color: '#A855F7' };
  }
  if (cat.includes('5-star') || name.includes('radisson') || name.includes('marriott') || name.includes('taj') || name.includes('gateway')) {
    return { label: '5-Star Luxury 🏨', color: '#F59E0B' };
  }
  if (cat.includes('cafe') || cat.includes('coffee') || name.includes('bliss') || name.includes('cobble')) {
    return { label: 'Artisan Coffee & Vibe ☕', color: '#10B981' };
  }
  if (name.includes('river') || desc.includes('godavari') || desc.includes('backwater')) {
    return { label: 'Riverside Date 🌊', color: '#06B6D4' };
  }
  if (cat.includes('rooftop') || desc.includes('rooftop') || desc.includes('skyline')) {
    return { label: 'Skyline Sunset 🌇', color: '#F59E0B' };
  }
  return { label: 'Nashik Certified ✨', color: '#6366F1' };
};

export default function DatePlannerScreen() {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);

  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [savedSpotIds, setSavedSpotIds] = useState(new Set());

  // Date Roulette Modal state
  const [rouletteVisible, setRouletteVisible] = useState(false);
  const [rouletteSpot, setRouletteSpot] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinAnim] = useState(() => new Animated.Value(0));
  const spinRotation = useMemo(() => {
    return spinAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '720deg'],
    });
  }, [spinAnim]);

  // Carousel ref & state for Boosted list
  const [boostedIndex, setBoostedIndex] = useState(0);
  const flatListRef = useRef(null);

  // Load saved spot IDs from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_SAVED_SPOTS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setSavedSpotIds(new Set(parsed));
          }
        }
      } catch (e) {
        console.warn('Error loading saved spots:', e);
      }
    })();
  }, []);

  // Toggle saving spot to wishlist
  const toggleSaveSpot = useCallback(
    async (spotId) => {
      setSavedSpotIds((prev) => {
        const next = new Set(prev);
        if (next.has(spotId)) {
          next.delete(spotId);
        } else {
          next.add(spotId);
        }
        AsyncStorage.setItem(STORAGE_KEY_SAVED_SPOTS, JSON.stringify(Array.from(next))).catch(
          () => { }
        );
        return next;
      });
    },
    []
  );

  // Fetch restaurant spots from API
  // Fetch restaurant spots from API with strict Nashik prioritization
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const res = await apiGetRestaurants();
        if (res?.restaurants && Array.isArray(res.restaurants) && res.restaurants.length > 0) {
          // Strictly show spots in Nashik
          const nashikOnly = res.restaurants.filter((r) => {
            const loc = (r.location || '').toLowerCase();
            const name = (r.name || '').toLowerCase();
            return (
              loc.includes('nashik') ||
              name.includes('sula') ||
              name.includes('soma') ||
              name.includes('radisson') ||
              name.includes('taj') ||
              name.includes('bliss') ||
              name.includes('cobble') ||
              name.includes('woodside') ||
              name.includes('marriott') ||
              name.includes('nation')
            );
          });
          if (nashikOnly.length > 0) {
            setRestaurants(nashikOnly);
          } else {
            setRestaurants(NASHIK_DATE_SPOTS);
          }
        } else {
          setRestaurants(NASHIK_DATE_SPOTS);
        }
      } catch (e) {
        console.warn('Restaurants fetch error:', e?.message);
        setRestaurants(NASHIK_DATE_SPOTS);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurants();
  }, []);

  // Split boosted & curated
  const boostedList = useMemo(() => {
    const list = restaurants.filter((r) => r.is_boosted);
    if (list.length > 0) return list;
    return restaurants[0] ? [restaurants[0]] : [];
  }, [restaurants]);

  // Auto-scroll boosted hero carousel every 3.8 seconds
  useEffect(() => {
    if (boostedList.length <= 1) return;

    const timer = setInterval(() => {
      setBoostedIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % boostedList.length;
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, 3800);

    return () => clearInterval(timer);
  }, [boostedList.length]);

  // Filter curated spots based on search & Nashik categories
  const filteredSpots = useMemo(() => {
    return restaurants.filter((spot) => {
      // If "saved" filter is active, only show user saved spots
      if (activeCategory === 'saved' && !savedSpotIds.has(spot.id)) {
        return false;
      }

      // Nashik Category matching
      if (activeCategory !== 'all' && activeCategory !== 'saved') {
        const cat = (spot.category || '').toLowerCase();
        const name = (spot.name || '').toLowerCase();
        const desc = (spot.description || '').toLowerCase();

        if (activeCategory === 'cafe') {
          if (!cat.includes('cafe') && !cat.includes('coffee') && !cat.includes('bistro') && !desc.includes('cafe') && !name.includes('cafe') && !name.includes('bliss') && !name.includes('nation')) {
            return false;
          }
        }
        if (activeCategory === 'hotel') {
          if (!cat.includes('hotel') && !cat.includes('resort') && !name.includes('hotel') && !name.includes('marriott') && !name.includes('radisson') && !name.includes('gateway') && !name.includes('taj')) {
            return false;
          }
        }
        if (activeCategory === 'vineyard') {
          if (!name.includes('sula') && !name.includes('soma') && !cat.includes('vineyard') && !cat.includes('wine') && !desc.includes('vineyard') && !desc.includes('wine')) {
            return false;
          }
        }
        if (activeCategory === 'rooftop') {
          if (!cat.includes('rooftop') && !desc.includes('rooftop') && !desc.includes('skyline') && !name.includes('l’attitude') && !name.includes('tales')) {
            return false;
          }
        }
        if (activeCategory === 'casual') {
          if (!cat.includes('garden') && !cat.includes('casual') && !cat.includes('pizza') && !cat.includes('bistro') && !desc.includes('nachos') && !name.includes('woodside')) {
            return false;
          }
        }
      }

      // Search query matching (name, category, location, or description)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (spot.name || '').toLowerCase();
        const cat = (spot.category || '').toLowerCase();
        const loc = (spot.location || '').toLowerCase();
        const desc = (spot.description || '').toLowerCase();
        return name.includes(q) || cat.includes(q) || loc.includes(q) || desc.includes(q);
      }

      return true;
    });
  }, [restaurants, activeCategory, searchQuery, savedSpotIds]);

  // Date Roulette: Spin & Pick Random Spot
  const spinDateRoulette = () => {
    if (restaurants.length === 0) return;
    setIsSpinning(true);
    setRouletteSpot(null);
    setRouletteVisible(true);

    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Pick random spot after a short anticipation delay
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * restaurants.length);
      setRouletteSpot(restaurants[randomIndex]);
      setIsSpinning(false);
    }, 1100);
  };

  // Render Boosted Spotlight Hero Card
  const renderBoostedSpot = (spot) => {
    const isSaved = savedSpotIds.has(spot.id);
    const vibe = getGenZVibeTag(spot);

    return (
      <View key={spot.id} style={[styles.boostCard, boostedList.length > 1 && { width: width - 36 }]}>
        <Image source={{ uri: spot.image }} style={styles.boostCardImg} />

        {/* Deep layered glass gradient overlay */}
        <LinearGradient
          colors={['rgba(0,0,0,0.15)', 'rgba(10,5,28,0.45)', 'rgba(9,4,22,0.95)']}
          style={StyleSheet.absoluteFill}
        />

        {/* Top Badges Row */}
        <View style={styles.boostTopRow}>
          <LinearGradient
            colors={['#FBBF24', '#F59E0B', '#D97706']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mainCharacterBadge}
          >
            <Ionicons name="sparkles" size={12} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.mainCharacterText}>MAIN CHARACTER SPOT</Text>
          </LinearGradient>

          <TouchableOpacity
            style={styles.boostHeartBtn}
            onPress={() => toggleSaveSpot(spot.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isSaved ? 'heart' : 'heart-outline'}
              size={18}
              color={isSaved ? '#F59E0B' : '#FFF'}
            />
          </TouchableOpacity>
        </View>

        {/* Floating Vibe Match Pill */}
        <View style={styles.matchPill}>
          <Ionicons name="sparkles" size={11} color="#FFD700" style={{ marginRight: 4 }} />
          <Text style={styles.matchPillText}>98% Vibe Match</Text>
        </View>

        {/* Bottom Details Section */}
        <View style={styles.boostBottomDetails}>
          <View style={styles.vibeBadgeRow}>
            <View style={[styles.vibeMicroPill, { backgroundColor: `${vibe.color}30`, borderColor: vibe.color }]}>
              <Text style={[styles.vibeMicroText, { color: vibe.color }]}>{vibe.label}</Text>
            </View>
            <Text style={styles.boostPriceRange}>{spot.price_range || '$$$'}</Text>
          </View>

          <Text style={styles.boostName} numberOfLines={1}>{spot.name}</Text>
          <Text style={styles.boostCuisine} numberOfLines={1}>
            {spot.category} · {spot.location}
          </Text>

          {/* Action Row */}
          <View style={styles.boostActionRow}>
            <View style={styles.boostRatingBadge}>
              <Ionicons name="star" size={13} color="#FFD700" />
              <Text style={styles.boostRatingNum}>{spot.rating}</Text>
              <Text style={styles.boostRatingSub}>Rated 10/10</Text>
            </View>

            <TouchableOpacity
              style={styles.planDateHeroBtn}
              onPress={() => navigation.navigate('RestaurantDetail', { spot })}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FBBF24', '#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.planDateHeroGrad}
              >
                <Text style={styles.planDateHeroText}>Plan Date</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFF" style={{ marginLeft: 4 }} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={theme.bgGrad} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Modern Glowing Atmosphere Blobs */}
      <View style={styles.glowBlobGoldPrimary} pointerEvents="none" />
      <View style={styles.glowBlobAmber} pointerEvents="none" />
      <View style={styles.glowBlobHoney} pointerEvents="none" />

      <SafeAreaView style={styles.flex}>
        {/* Gen-Z Dynamic Top Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.title}>Date Planner</Text>

            </View>

            {/* Date Roulette Quick Launcher */}
            <TouchableOpacity
              style={styles.rouletteQuickBtn}
              onPress={spinDateRoulette}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FBBF24', '#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.rouletteQuickGrad}
              >
                <Text style={styles.rouletteDiceEmoji}>🎲</Text>
                <Text style={styles.rouletteQuickText}>Pick For Us</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Frosted Glass Search Bar */}
          <View style={styles.searchContainer}>
            <BlurView intensity={isDark ? 25 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            <Ionicons name="search-outline" size={18} color={theme.textFaint} style={{ marginLeft: 14 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search cafes & hotels in Nashik…"
              placeholderTextColor={theme.textFaint}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                <Ionicons name="close-circle" size={18} color={theme.textFaint} />
              </TouchableOpacity>
            )}
          </View>
        </View>


        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text style={styles.loadingText}>Cooking up aesthetic spots for you…</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Boosted "Main Character Energy" Carousel (only when not searching / on All) */}
            {searchQuery.length === 0 && activeCategory === 'all' && boostedList.length > 0 && (
              <View style={styles.boostSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionLabelBold}>TOP PICKS IN NASHIK TONIGHT</Text>
                  <View style={styles.livePulseWrap}>
                    <View style={styles.livePulseDot} />
                    <Text style={styles.livePulseText}>TRENDING</Text>
                  </View>
                </View>

                {boostedList.length > 1 ? (
                  <View>
                    <FlatList
                      ref={flatListRef}
                      data={boostedList}
                      keyExtractor={(item) => item.id.toString()}
                      horizontal
                      pagingEnabled
                      snapToInterval={width - 36}
                      decelerationRate="fast"
                      showsHorizontalScrollIndicator={false}
                      getItemLayout={(data, index) => ({
                        length: width - 36,
                        offset: (width - 36) * index,
                        index,
                      })}
                      onMomentumScrollEnd={(e) => {
                        const idx = Math.round(e.nativeEvent.contentOffset.x / (width - 36));
                        setBoostedIndex(idx);
                      }}
                      renderItem={({ item }) => renderBoostedSpot(item)}
                    />
                    {/* Modern Glowing Dot Indicators */}
                    <View style={styles.sliderDotsRow}>
                      {boostedList.map((_, i) => (
                        <View
                          key={i}
                          style={[styles.sliderDot, i === boostedIndex && styles.sliderDotActive]}
                        />
                      ))}
                    </View>
                  </View>
                ) : (
                  renderBoostedSpot(boostedList[0])
                )}
              </View>
            )}

            {/* Curated Spots Section */}
            <View style={styles.curatedSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabelBold}>
                  {activeCategory === 'saved'
                    ? `SAVED VIBES (${filteredSpots.length})`
                    : `CURATED NASHIK SPOTS `}
                </Text>
                {activeCategory !== 'all' && (
                  <TouchableOpacity onPress={() => setActiveCategory('all')}>
                    <Text style={styles.resetFilterText}>Clear Filter</Text>
                  </TouchableOpacity>
                )}
              </View>

              {filteredSpots.length > 0 ? (
                <View style={styles.spotGrid}>
                  {filteredSpots.map((item) => {
                    const isSaved = savedSpotIds.has(item.id);
                    const vibe = getGenZVibeTag(item);

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.modernCard}
                        onPress={() => navigation.navigate('RestaurantDetail', { spot: item })}
                        activeOpacity={0.88}
                      >
                        <BlurView
                          intensity={isDark ? 35 : 60}
                          tint={isDark ? 'dark' : 'light'}
                          style={StyleSheet.absoluteFill}
                        />

                        {/* Image Preview with Badges */}
                        <View style={styles.cardImageWrap}>
                          <Image source={{ uri: item.image }} style={styles.cardImg} />
                          <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.6)']}
                            style={StyleSheet.absoluteFill}
                          />

                          {/* Floating Price Pill */}
                          <View style={styles.cardPricePill}>
                            <Text style={styles.cardPriceText}>{item.price_range || '$$'}</Text>
                          </View>

                          {/* Favorite Heart Button */}
                          <TouchableOpacity
                            style={styles.cardHeartBtn}
                            onPress={() => toggleSaveSpot(item.id)}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={isSaved ? 'heart' : 'heart-outline'}
                              size={17}
                              color={isSaved ? '#F59E0B' : '#FFF'}
                            />
                          </TouchableOpacity>
                        </View>

                        {/* Card Info */}
                        <View style={styles.cardInfoWrap}>
                          {/* Gen-Z Vibe Tag & Rating */}
                          <View style={styles.cardMetaRow}>
                            <View style={[styles.cardVibeTag, { backgroundColor: `${vibe.color}20`, borderColor: vibe.color }]}>
                              <Text style={[styles.cardVibeTagText, { color: vibe.color }]}>
                                {vibe.label}
                              </Text>
                            </View>

                            <View style={styles.cardRatingRow}>
                              <Ionicons name="star" size={13} color="#FFD700" />
                              <Text style={styles.cardRatingText}>{item.rating}</Text>
                            </View>
                          </View>

                          <Text style={styles.cardTitle} numberOfLines={1}>
                            {item.name}
                          </Text>

                          <Text style={styles.cardCategory} numberOfLines={1}>
                            {item.category}
                          </Text>

                          {/* Location & CTA */}
                          <View style={styles.cardBottomRow}>
                            <View style={styles.cardLocationBox}>
                              <Ionicons name="location-sharp" size={13} color="#F59E0B" />
                              <Text style={styles.cardLocationText} numberOfLines={1}>
                                {item.location}
                              </Text>
                            </View>

                            <View style={styles.planDateMiniBtn}>
                              <Text style={styles.planDateMiniText}>Plan</Text>
                              <Ionicons name="chevron-forward" size={12} color="#D97706" />
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyStateWrap}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons
                      name={activeCategory === 'saved' ? 'heart-dislike-outline' : 'search-outline'}
                      size={36}
                      color="#F59E0B"
                    />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {activeCategory === 'saved' ? 'No Saved Vibes Yet' : 'No Spots Found in Nashik'}
                  </Text>
                  <Text style={styles.emptySub}>
                    {activeCategory === 'saved'
                      ? 'Tap the ❤️ icon on any Nashik cafe or hotel to save your dream date ideas here!'
                      : 'We couldn’t find any spots in Nashik matching that vibe. Try another search or reset filters.'}
                  </Text>
                  <TouchableOpacity
                    style={styles.resetBtn}
                    onPress={() => {
                      setActiveCategory('all');
                      setSearchQuery('');
                    }}
                  >
                    <Text style={styles.resetBtnText}>Show All Spots ✨</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Gen-Z Date Hacks Carousel */}
            <View style={styles.hacksSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabelBold}>GEN-Z DATE HACKS 💡</Text>
                <Text style={styles.hacksSwipeHint}>Swipe for tips</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hacksScroll}
              >
                {DATE_HACKS.map((hack) => (
                  <View key={hack.id} style={styles.hackCard}>
                    <BlurView
                      intensity={isDark ? 25 : 55}
                      tint={isDark ? 'dark' : 'light'}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.hackTopRow}>
                      <Text style={styles.hackEmoji}>{hack.emoji}</Text>
                      <View style={styles.hackTagPill}>
                        <Text style={styles.hackTagText}>{hack.tag}</Text>
                      </View>
                    </View>
                    <Text style={styles.hackTitle}>{hack.title}</Text>
                    <Text style={styles.hackDesc}>{hack.desc}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Date Roulette Modal (Gamified Spontaneity) */}
      <Modal
        visible={rouletteVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRouletteVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={isDark ? 70 : 80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />

          <View style={styles.modalCard}>
            <LinearGradient
              colors={isDark ? ['#24190C', '#120C06'] : ['#FFFDF5', '#FEF3C7']}
              style={styles.modalCardGrad}
            >
              {/* Close Button */}
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setRouletteVisible(false)}
              >
                <Ionicons name="close" size={20} color={theme.textSec} />
              </TouchableOpacity>

              {isSpinning ? (
                <View style={styles.spinningBox}>
                  <Animated.View
                    style={{
                      transform: [
                        {
                          rotate: spinRotation,
                        },
                      ],
                    }}
                  >
                    <Text style={{ fontSize: 52 }}>🎲</Text>
                  </Animated.View>
                  <Text style={styles.spinTitle}>Fate is choosing your spot…</Text>
                  <Text style={styles.spinSub}>Matching your shared aesthetic frequencies in Nashik 💫</Text>
                </View>
              ) : rouletteSpot ? (
                <View style={styles.rouletteResultWrap}>
                  <View style={styles.rouletteSuccessBadge}>
                    <Ionicons name="sparkles" size={13} color="#FFD700" style={{ marginRight: 4 }} />
                    <Text style={styles.rouletteSuccessText}>IT’S A DATE MATCH! 🎉</Text>
                  </View>

                  <Image source={{ uri: rouletteSpot.image }} style={styles.rouletteImg} />

                  <Text style={styles.rouletteName}>{rouletteSpot.name}</Text>
                  <Text style={styles.rouletteCategory}>
                    {rouletteSpot.category} · {rouletteSpot.price_range}
                  </Text>
                  <Text style={styles.rouletteLocation}>{rouletteSpot.location}</Text>
                  <Text style={styles.rouletteDesc} numberOfLines={2}>
                    {rouletteSpot.description}
                  </Text>

                  {/* Buttons */}
                  <View style={styles.rouletteBtnRow}>
                    <TouchableOpacity
                      style={styles.spinAgainBtn}
                      onPress={spinDateRoulette}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.spinAgainText}>Re-spin 🎲</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.confirmRouletteBtn}
                      onPress={() => {
                        setRouletteVisible(false);
                        navigation.navigate('RestaurantDetail', { spot: rouletteSpot });
                      }}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={['#FBBF24', '#F59E0B', '#D97706']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.confirmRouletteGrad}
                      >
                        <Text style={styles.confirmRouletteText}>Let’s Go! 🥂</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const getStyles = (theme, isDark) =>
  StyleSheet.create({
    flex: { flex: 1 },
    root: { flex: 1, position: 'relative' },

    // Ambient background golden glow blobs
    glowBlobGoldPrimary: {
      position: 'absolute',
      top: height * 0.10,
      right: -80,
      width: 270,
      height: 270,
      borderRadius: 135,
      backgroundColor: 'rgba(245, 158, 11, 0.20)',
      opacity: 0.85,
      zIndex: 0,
    },
    glowBlobAmber: {
      position: 'absolute',
      bottom: height * 0.28,
      left: -90,
      width: 260,
      height: 260,
      borderRadius: 130,
      backgroundColor: 'rgba(217, 119, 6, 0.17)',
      opacity: 0.75,
      zIndex: 0,
    },
    glowBlobHoney: {
      position: 'absolute',
      top: height * 0.45,
      right: 30,
      width: 210,
      height: 210,
      borderRadius: 105,
      backgroundColor: 'rgba(251, 191, 36, 0.14)',
      opacity: 0.7,
      zIndex: 0,
    },

    // Header section
    header: {
      paddingHorizontal: 18,
      paddingTop: 6,
      paddingBottom: 8,
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    vibeCheckBadge: {
      alignSelf: 'flex-start',
      borderRadius: 20,
      overflow: 'hidden',
      marginBottom: 4,
    },
    vibeCheckGrad: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    vibeCheckText: {
      color: '#FFF',
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.6,
    },
    title: {
      fontSize: 28,
      fontWeight: '900',
      color: theme.textPrimary,
      letterSpacing: -0.8,
    },
    sub: {
      fontSize: 12.5,
      color: theme.textSec,
      marginTop: 2,
    },

    // Roulette button
    rouletteQuickBtn: {
      borderRadius: 18,
      overflow: 'hidden',
      shadowColor: '#F59E0B',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 5,
    },
    rouletteQuickGrad: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 6,
    },
    rouletteDiceEmoji: {
      fontSize: 16,
    },
    rouletteQuickText: {
      color: '#FFF',
      fontSize: 11.5,
      fontWeight: '800',
      letterSpacing: 0.2,
    },

    // Frosted search
    searchContainer: {
      height: 44,
      borderRadius: 22,
      overflow: 'hidden',
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(245, 158, 11, 0.22)' : 'rgba(217, 119, 6, 0.18)',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.7)',
    },
    searchInput: {
      flex: 1,
      height: '100%',
      paddingHorizontal: 10,
      fontSize: 13.5,
      color: theme.textPrimary,
    },
    clearSearchBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
    },

    // Categories carousel
    categoriesWrapper: {
      marginBottom: 8,
    },
    categoriesScroll: {
      paddingHorizontal: 18,
      gap: 8,
      paddingVertical: 4,
    },
    categoryTouch: {
      borderRadius: 18,
      overflow: 'hidden',
    },
    categoryPillActive: {
      paddingHorizontal: 14,
      paddingVertical: 7.5,
      borderRadius: 18,
      backgroundColor: '#F59E0B',
    },
    categoryTextActive: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '800',
    },
    categoryPillInactive: {
      paddingHorizontal: 13,
      paddingVertical: 6.5,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.65)',
    },
    categoryTextInactive: {
      color: theme.textSec,
      fontSize: 12,
      fontWeight: '600',
    },

    // Loading & Empty state
    loadingWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 13.5,
      color: theme.textSec,
      fontWeight: '600',
    },
    emptyStateWrap: {
      alignItems: 'center',
      paddingVertical: 45,
      paddingHorizontal: 30,
      gap: 10,
    },
    emptyIconCircle: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    emptySub: {
      fontSize: 13,
      color: theme.textSec,
      textAlign: 'center',
      lineHeight: 19,
    },
    resetBtn: {
      marginTop: 8,
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 18,
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.4)',
    },
    resetBtnText: {
      color: '#F59E0B',
      fontSize: 12.5,
      fontWeight: '700',
    },

    scroll: {
      paddingBottom: 120,
    },

    // Boosted section
    boostSection: {
      paddingHorizontal: 18,
      marginTop: 6,
      marginBottom: 16,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    sectionLabelBold: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.textFaint,
      letterSpacing: 0.8,
    },
    livePulseWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(245, 158, 11, 0.16)',
      borderRadius: 10,
      paddingHorizontal: 7,
      paddingVertical: 2.5,
      gap: 5,
    },
    livePulseDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#F59E0B',
    },
    livePulseText: {
      color: '#F59E0B',
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    resetFilterText: {
      color: '#F59E0B',
      fontSize: 11,
      fontWeight: '700',
    },

    // Hero Boosted Card
    boostCard: {
      height: 225,
      borderRadius: 28,
      overflow: 'hidden',
      position: 'relative',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.35)',
      shadowColor: '#F59E0B',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.28,
      shadowRadius: 16,
      elevation: 8,
    },
    boostCardImg: {
      ...StyleSheet.absoluteFillObject,
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    boostTopRow: {
      position: 'absolute',
      top: 14,
      left: 14,
      right: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 2,
    },
    mainCharacterBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 10,
      paddingHorizontal: 9,
      paddingVertical: 4.5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    mainCharacterText: {
      color: '#FFF',
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.6,
    },
    boostHeartBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    matchPill: {
      position: 'absolute',
      top: 50,
      left: 14,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 3.5,
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.45)',
    },
    matchPillText: {
      color: '#FFD700',
      fontSize: 10,
      fontWeight: '800',
    },
    boostBottomDetails: {
      position: 'absolute',
      bottom: 14,
      left: 16,
      right: 16,
      zIndex: 2,
    },
    vibeBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    vibeMicroPill: {
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderWidth: 1,
    },
    vibeMicroText: {
      fontSize: 9.5,
      fontWeight: '800',
    },
    boostPriceRange: {
      color: '#FFF',
      fontSize: 11,
      fontWeight: '700',
    },
    boostName: {
      fontSize: 20,
      fontWeight: '900',
      color: '#FFF',
      letterSpacing: -0.4,
    },
    boostCuisine: {
      fontSize: 12,
      color: 'rgba(255, 255, 255, 0.8)',
      marginTop: 2,
    },
    boostActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    boostRatingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    boostRatingNum: {
      color: '#FFF',
      fontSize: 13,
      fontWeight: '800',
    },
    boostRatingSub: {
      color: 'rgba(255, 255, 255, 0.65)',
      fontSize: 11,
      marginLeft: 2,
    },
    planDateHeroBtn: {
      borderRadius: 16,
      overflow: 'hidden',
    },
    planDateHeroGrad: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 16,
    },
    planDateHeroText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '800',
    },

    sliderDotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
      gap: 6,
    },
    sliderDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },
    sliderDotActive: {
      width: 20,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#F59E0B',
    },

    // Curated spot cards
    curatedSection: {
      paddingHorizontal: 18,
      marginTop: 4,
    },
    spotGrid: {
      gap: 12,
    },
    modernCard: {
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.07)',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
      flexDirection: 'row',
      padding: 10,
      position: 'relative',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    cardImageWrap: {
      width: 105,
      height: 105,
      borderRadius: 18,
      overflow: 'hidden',
      position: 'relative',
    },
    cardImg: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    cardPricePill: {
      position: 'absolute',
      bottom: 6,
      left: 6,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    cardPriceText: {
      color: '#FFF',
      fontSize: 9.5,
      fontWeight: '800',
    },
    cardHeartBtn: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardInfoWrap: {
      flex: 1,
      marginLeft: 12,
      justifyContent: 'space-between',
      paddingVertical: 2,
    },
    cardMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardVibeTag: {
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderWidth: 0.8,
    },
    cardVibeTagText: {
      fontSize: 8.5,
      fontWeight: '800',
    },
    cardRatingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    cardRatingText: {
      fontSize: 11.5,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    cardTitle: {
      fontSize: 15.5,
      fontWeight: '800',
      color: theme.textPrimary,
      marginTop: 2,
    },
    cardCategory: {
      fontSize: 11.5,
      color: theme.textSec,
    },
    cardBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    cardLocationBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      flex: 1,
      marginRight: 8,
    },
    cardLocationText: {
      fontSize: 10.5,
      color: theme.textFaint,
      flex: 1,
    },
    planDateMiniBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(245, 158, 11, 0.14)',
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    planDateMiniText: {
      color: '#D97706',
      fontSize: 10.5,
      fontWeight: '800',
    },

    // Gen-Z Date Hacks
    hacksSection: {
      marginTop: 24,
      paddingHorizontal: 18,
    },
    hacksSwipeHint: {
      fontSize: 10,
      color: theme.textFaint,
    },
    hacksScroll: {
      gap: 10,
      paddingVertical: 6,
    },
    hackCard: {
      width: 200,
      borderRadius: 20,
      overflow: 'hidden',
      padding: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.75)',
    },
    hackTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    hackEmoji: {
      fontSize: 18,
    },
    hackTagPill: {
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    hackTagText: {
      color: '#D97706',
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 0.4,
    },
    hackTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.textPrimary,
      marginBottom: 4,
    },
    hackDesc: {
      fontSize: 11,
      color: theme.textSec,
      lineHeight: 16,
    },

    // Date Roulette Modal
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 22,
    },
    modalCard: {
      width: '100%',
      borderRadius: 28,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.35)',
      shadowColor: '#F59E0B',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 10,
    },
    modalCardGrad: {
      padding: 20,
      position: 'relative',
    },
    modalCloseBtn: {
      position: 'absolute',
      top: 14,
      right: 14,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    spinningBox: {
      alignItems: 'center',
      paddingVertical: 36,
      gap: 12,
    },
    spinTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: theme.textPrimary,
      marginTop: 8,
    },
    spinSub: {
      fontSize: 12.5,
      color: theme.textSec,
      textAlign: 'center',
    },
    rouletteResultWrap: {
      alignItems: 'center',
    },
    rouletteSuccessBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(245, 158, 11, 0.18)',
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.4)',
    },
    rouletteSuccessText: {
      color: '#F59E0B',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    rouletteImg: {
      width: '100%',
      height: 150,
      borderRadius: 20,
      resizeMode: 'cover',
      marginBottom: 12,
    },
    rouletteName: {
      fontSize: 20,
      fontWeight: '900',
      color: theme.textPrimary,
      textAlign: 'center',
    },
    rouletteCategory: {
      fontSize: 12.5,
      color: theme.textSec,
      marginTop: 2,
    },
    rouletteLocation: {
      fontSize: 11,
      color: theme.textFaint,
      marginTop: 2,
    },
    rouletteDesc: {
      fontSize: 11.5,
      color: theme.textSec,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 16,
      paddingHorizontal: 8,
    },
    rouletteBtnRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 18,
      width: '100%',
    },
    spinAgainBtn: {
      flex: 1,
      height: 44,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
    },
    spinAgainText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    confirmRouletteBtn: {
      flex: 1.4,
      height: 44,
      borderRadius: 18,
      overflow: 'hidden',
    },
    confirmRouletteGrad: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    confirmRouletteText: {
      color: '#FFF',
      fontSize: 13,
      fontWeight: '800',
    },
  });

