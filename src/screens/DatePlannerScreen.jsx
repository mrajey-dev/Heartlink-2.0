// src/screens/DatePlannerScreen.jsx — Plan a Date with Curated Restaurant Spots & Top Boosted Spot
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, SafeAreaView, StatusBar, ScrollView, Dimensions, Platform,
  ActivityIndicator,FlatList,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { apiGetRestaurants } from '../services/api';

const { width, height } = Dimensions.get('window');

export default function DatePlannerScreen() {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const res = await apiGetRestaurants();
        if (res?.restaurants && Array.isArray(res.restaurants)) {
          setRestaurants(res.restaurants);
        }
      } catch (e) {
        console.warn('Restaurants fetch error:', e?.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurants();
  }, []);

  const [boostedIndex, setBoostedIndex] = useState(0);
  const flatListRef = useRef(null);

  const boostedList = useMemo(() => {
    const list = restaurants.filter(r => r.is_boosted);
    if (list.length > 0) return list;
    return restaurants[0] ? [restaurants[0]] : [];
  }, [restaurants]);

  const boostedIds = useMemo(() => new Set(boostedList.map(r => r.id)), [boostedList]);
  const curated = useMemo(() => restaurants.filter(r => !boostedIds.has(r.id)), [restaurants, boostedIds]);

  // Auto-swipe carousel slider every 3.5 seconds when multiple boosted restaurants exist
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
    }, 3500);

    return () => clearInterval(timer);
  }, [boostedList.length]);

  const renderBoostedRestaurant = () => {
    if (boostedList.length === 0) return null;

    const renderCard = (spot) => (
      <TouchableOpacity
        key={spot.id}
        style={[styles.boostCard, boostedList.length > 1 && { width: width - 40 }]}
        onPress={() => navigation.navigate('RestaurantDetail', { spot })}
        activeOpacity={0.9}
      >
        <Image source={{ uri: spot.image }} style={styles.boostCardImg} />
        <LinearGradient colors={['transparent', 'rgba(10, 5, 28, 0.25)', 'rgba(10, 5, 28, 0.90)']} style={styles.boostCardOverlay} />

        <View style={styles.boostTagPill}>
          <Ionicons name="flash" size={11} color="#FFF" style={{ marginRight: 3 }} />
          <Text style={styles.boostTagText}>Boosted</Text>
        </View>

        <View style={styles.boostDetails}>
          <Text style={styles.boostName}>{spot.name}</Text>
          <Text style={styles.boostCuisine}>{spot.category} · {spot.price_range}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Ionicons name="location-sharp" size={13} color="#FF007F" />
            <Text style={styles.boostLoc}>{spot.location}</Text>
            <Text style={styles.boostLoc}>·</Text>
            <Ionicons name="star" size={13} color="#FFD700" />
            <Text style={styles.boostLoc}>{spot.rating}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );

    return (
      <View style={styles.boostSection}>
        <View style={styles.boostHeader}>
          <LinearGradient
            colors={['#A78BFA', '#F472B6']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.boostHeaderIconGrad}
          >
            <Ionicons name="flash" size={10} color="#fff" />
          </LinearGradient>
          <Text style={styles.boostHeaderTitle}>
            {boostedList.length > 1 ? `FEATURED BOOSTED SPOTS (${boostedList.length})` : 'COSMIC BOOST SPOT'}
          </Text>
        </View>

        {boostedList.length > 1 ? (
          <View>
            <FlatList
              ref={flatListRef}
              data={boostedList}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              pagingEnabled
              snapToInterval={width - 40}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              getItemLayout={(data, index) => ({ length: width - 40, offset: (width - 40) * index, index })}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / (width - 40));
                setBoostedIndex(idx);
              }}
              renderItem={({ item }) => renderCard(item)}
            />
            {/* Slider Dots */}
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
          renderCard(boostedList[0])
        )}
      </View>
    );
  };

  return (
    <LinearGradient colors={theme.bgGrad} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Glowing background depth blobs */}
      <View style={styles.glowBlobPurple} pointerEvents="none" />
      <View style={styles.glowBlobCyan} pointerEvents="none" />

      <SafeAreaView style={styles.flex}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Date Planner</Text>
          <Text style={styles.sub}>Plan an unforgettable spot connection with your matches</Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#FF007F" />
            <Text style={styles.loadingText}>Finding the best spots for you…</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Top Boosted Restaurant */}
            {renderBoostedRestaurant()}

            {curated.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Curated Restaurant Spots</Text>
                <View style={styles.spotGrid}>
                  {curated.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.spotCard}
                      onPress={() => navigation.navigate('RestaurantDetail', { spot: item })}
                      activeOpacity={0.9}
                    >
                      <BlurView
                        intensity={isDark ? 40 : 60}
                        tint={isDark ? "dark" : "light"}
                        style={StyleSheet.absoluteFill}
                      />
                      <Image source={{ uri: item.image }} style={styles.spotImg} />
                      <View style={styles.spotOverlay} />

                      {item.is_boosted && (
                        <View style={styles.spotTag}>
                          <Text style={styles.spotTagText}>Featured</Text>
                        </View>
                      )}

                      <View style={styles.spotTextWrap}>
                        <Text style={styles.spotName}>{item.name}</Text>
                        <Text style={styles.spotCuisine}>{item.category} · {item.price_range}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                          <Ionicons name="location-sharp" size={12} color="#FF007F" />
                          <Text style={styles.spotLoc}>{item.location}</Text>
                          <Text style={styles.spotLoc}>·</Text>
                          <Ionicons name="star" size={12} color="#FFD700" />
                          <Text style={styles.spotLoc}>{item.rating}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {restaurants.length === 0 && !loading && (
              <View style={styles.emptyWrap}>
                <Ionicons name="restaurant-outline" size={48} color={theme.textFaint} />
                <Text style={styles.emptyTitle}>No spots yet</Text>
                <Text style={styles.emptySub}>Date spots will appear here once the team adds them.</Text>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const getStyles = (theme) => StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, position: 'relative' },

  // Glowing background faders
  glowBlobPurple: {
    position: 'absolute',
    top: height * 0.15,
    right: -85,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(168, 85, 247, 0.16)',
    opacity: 0.8,
    zIndex: 0,
  },
  glowBlobCyan: {
    position: 'absolute',
    bottom: height * 0.25,
    left: -85,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(6, 182, 212, 0.14)',
    opacity: 0.7,
    zIndex: 0,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 14 : 14,
    paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '900', color: theme.textPrimary, letterSpacing: -0.6 },
  sub: { fontSize: 13, color: theme.textSec, marginTop: 4 },

  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  loadingText: {
    fontSize: 14,
    color: theme.textSec,
    fontWeight: '500',
  },

  scroll: {
    paddingBottom: 110,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.textFaint,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 18,
    paddingHorizontal: 20,
  },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  emptySub: {
    fontSize: 13,
    color: theme.textSec,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Cosmic Boost Spot Card
  boostSection: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 6,
  },
  boostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  boostHeaderIconGrad: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boostHeaderTitle: {
    fontSize: 10.5,
    fontWeight: '900',
    color: theme.textPrimary,
    letterSpacing: 0.8,
  },
  boostCard: {
    height: 180,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  boostCardImg: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    width: '100%', height: '100%',
    resizeMode: 'cover',
  },
  boostCardOverlay: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
  },
  boostTagPill: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF375F',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    shadowColor: '#FF375F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  boostTagText: {
    color: '#fff',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  boostDetails: {
    position: 'absolute',
    bottom: 16,
    left: 18,
    right: 18,
  },
  boostName: {
    fontSize: 19,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.2,
  },
  boostCuisine: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  boostLoc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
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
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  sliderDotActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF007F',
  },

  // Spot selection grid
  spotGrid: {
    paddingHorizontal: 20,
    gap: 12,
  },
  spotCard: {
    height: 125,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: theme.glass,
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    position: 'relative',
  },
  spotImg: {
    width: 100,
    height: 100,
    borderRadius: 16,
  },
  spotOverlay: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  spotTextWrap: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  spotName: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  spotCuisine: {
    fontSize: 12.5,
    color: theme.textSec,
    marginBottom: 4,
  },
  spotLoc: {
    fontSize: 11,
    color: theme.textFaint,
  },
  spotTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 55, 95, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  spotTagText: {
    color: '#FF375F',
    fontSize: 8,
    fontWeight: '700',
  },
});
