// src/screens/SnapMapScreen.jsx — Snapchat-Style Snap Map with Registered Users & Profile Photos
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  PanResponder,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { apiGetMapUsers } from '../services/api';
import { formatImageUrl, renderVerifiedBadge } from '../utils/helpers';
import ProfileDetail from '../components/discovery/ProfileDetail';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TILE_SIZE = 256;

// Web Mercator conversions
const lon2x = (lon, zoom) => ((lon + 180) / 360) * Math.pow(2, zoom) * TILE_SIZE;
const lat2y = (lat, zoom) => {
  const sin = Math.sin((lat * Math.PI) / 180);
  const clamped = Math.min(Math.max(sin, -0.9999), 0.9999);
  return (
    (0.5 - Math.log((1 + clamped) / (1 - clamped)) / (4 * Math.PI)) *
    Math.pow(2, zoom) *
    TILE_SIZE
  );
};

export default function SnapMapScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isDark, theme } = useTheme();
  const { user } = useAuth();

  // Map state
  const [zoom, setZoom] = useState(13); // Zoom levels: 11 (wide), 13 (city), 15 (street)
  const [centerCoords, setCenterCoords] = useState({
    latitude: user?.latitude ? Number(user.latitude) : 19.9975,
    longitude: user?.longitude ? Number(user.longitude) : 73.7898,
    city: user?.city || 'Nashik',
  });

  // Users data
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [profileModalUser, setProfileModalUser] = useState(null);
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'list'
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'verified' | 'nearby' | 'online'

  // Toast feedback
  const [toastMessage, setToastMessage] = useState('');
  const toastAnim = useRef(new Animated.Value(0)).current;

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [toastAnim]);

  // Animated Pan Values for Interactive Dragging
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const panOffset = useRef({ x: 0, y: 0 });

  // Radar wave pulsing animation for user's beacon
  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 2200,
        useNativeDriver: true,
      })
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim]);

  // Card slide-in animation when a user is selected
  const cardSlideAnim = useRef(new Animated.Value(180)).current;
  useEffect(() => {
    if (selectedUser) {
      Animated.spring(cardSlideAnim, {
        toValue: 0,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(cardSlideAnim, {
        toValue: 200,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedUser, cardSlideAnim]);

  // Fetch registered users for map
  const fetchMapUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiGetMapUsers({
        latitude: centerCoords.latitude,
        longitude: centerCoords.longitude,
        city: centerCoords.city,
      }).catch(() => null);

      if (res?.users && Array.isArray(res.users)) {
        setUsers(res.users);
      }
      if (res?.current_user?.latitude && res?.current_user?.longitude) {
        setCenterCoords((prev) => ({
          ...prev,
          latitude: Number(res.current_user.latitude),
          longitude: Number(res.current_user.longitude),
          city: res.current_user.city || prev.city,
        }));
      }
    } catch (err) {
      console.warn('Failed to load map users:', err);
    } finally {
      setLoading(false);
    }
  }, [centerCoords.latitude, centerCoords.longitude, centerCoords.city]);

  useEffect(() => {
    fetchMapUsers();
  }, []);

  // Sync Live GPS Location
  const handleRecenterGPS = async () => {
    try {
      showToast('📍 Centering on your location...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (loc?.coords) {
          const { latitude, longitude } = loc.coords;
          setCenterCoords((prev) => ({ ...prev, latitude, longitude }));
          // Reset pan smoothly
          panOffset.current = { x: 0, y: 0 };
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 6,
            useNativeDriver: false,
          }).start();
        }
      }
    } catch (_e) {
      // Fallback: reset pan to center
      panOffset.current = { x: 0, y: 0 };
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        friction: 6,
        useNativeDriver: false,
      }).start();
    }
  };

  // PanResponder for smooth free drag in all directions
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4;
      },
      onPanResponderGrant: () => {
        pan.setOffset({ x: panOffset.current.x, y: panOffset.current.y });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gesture) => {
        panOffset.current.x += gesture.dx;
        panOffset.current.y += gesture.dy;
        pan.flattenOffset();
      },
    })
  ).current;

  // Zoom in / out
  const handleZoomIn = () => {
    if (zoom < 16) {
      setZoom((z) => z + 1);
      panOffset.current = { x: 0, y: 0 };
      pan.setValue({ x: 0, y: 0 });
    }
  };

  const handleZoomOut = () => {
    if (zoom > 10) {
      setZoom((z) => z - 1);
      panOffset.current = { x: 0, y: 0 };
      pan.setValue({ x: 0, y: 0 });
    }
  };

  // World center projection
  const centerWorldX = useMemo(() => lon2x(centerCoords.longitude, zoom), [centerCoords.longitude, zoom]);
  const centerWorldY = useMemo(() => lat2y(centerCoords.latitude, zoom), [centerCoords.latitude, zoom]);

  // Compute visible tile grid around center (5x5 grid)
  const tiles = useMemo(() => {
    const centerTileX = Math.floor(centerWorldX / TILE_SIZE);
    const centerTileY = Math.floor(centerWorldY / TILE_SIZE);

    const tileList = [];
    const radius = 2; // -2 to +2 (5x5 grid)
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const tx = centerTileX + dx;
        const ty = centerTileY + dy;
        const maxTiles = Math.pow(2, zoom);
        if (ty >= 0 && ty < maxTiles) {
          const wrappedTx = ((tx % maxTiles) + maxTiles) % maxTiles;
          const pixelX = tx * TILE_SIZE - centerWorldX + SCREEN_WIDTH / 2;
          const pixelY = ty * TILE_SIZE - centerWorldY + SCREEN_HEIGHT / 2;
          tileList.push({
            key: `${zoom}-${wrappedTx}-${ty}`,
            url: `https://a.basemaps.cartocdn.com/dark_all/${zoom}/${wrappedTx}/${ty}.png`,
            left: pixelX,
            top: pixelY,
          });
        }
      }
    }
    return tileList;
  }, [centerWorldX, centerWorldY, zoom]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    if (activeFilter === 'verified') {
      return users.filter((u) => u.is_verified);
    }
    if (activeFilter === 'nearby') {
      return users.filter((u) => (u.distance_km || 999) <= 15);
    }
    if (activeFilter === 'online') {
      return users.filter((u) => u.is_online);
    }
    return users;
  }, [users, activeFilter]);

  // Render Pin for Each Registered User
  const renderUserMarker = (u) => {
    if (!u.latitude || !u.longitude) return null;

    const uWorldX = lon2x(Number(u.longitude), zoom);
    const uWorldY = lat2y(Number(u.latitude), zoom);

    const markerLeft = uWorldX - centerWorldX + SCREEN_WIDTH / 2;
    const markerTop = uWorldY - centerWorldY + SCREEN_HEIGHT / 2;

    const isSelected = selectedUser?.id === u.id;
    const isFemale = String(u.gender || '').toLowerCase() === 'female';

    return (
      <View
        key={`marker-${u.id}`}
        style={[
          styles.markerContainer,
          {
            left: markerLeft - 28,
            top: markerTop - 64,
            zIndex: isSelected ? 999 : 50,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setSelectedUser(u)}
          style={styles.markerTouchTarget}
        >
          {/* Avatar Outer Bubble with Neon Glow */}
          <View
            style={[
              styles.markerAvatarWrapper,
              isSelected && styles.markerAvatarSelected,
              isFemale ? styles.markerFemaleBorder : styles.markerMaleBorder,
            ]}
          >
            <Image
              source={{ uri: formatImageUrl(u.image) }}
              style={styles.markerAvatarImage}
              resizeMode="cover"
            />

            {/* Verified Badge */}
            {u.is_verified && (
              <View style={styles.markerVerifiedBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#00E5FF" />
              </View>
            )}

            {/* Online Indicator */}
            {u.is_online && <View style={styles.markerOnlineDot} />}
          </View>

          {/* Pin Pointer Stem */}
          <View
            style={[
              styles.markerPinStem,
              isFemale ? { backgroundColor: '#FF007F' } : { backgroundColor: '#8B5CF6' },
            ]}
          />
          <View
            style={[
              styles.markerPinPoint,
              isFemale ? { backgroundColor: '#FF007F' } : { backgroundColor: '#8B5CF6' },
            ]}
          />

          {/* Name & Distance Capsule Tag */}
          <View
            style={[
              styles.markerLabelPill,
              isSelected && styles.markerLabelPillSelected,
            ]}
          >
            <Text style={styles.markerLabelName} numberOfLines={1}>
              {u.display_name || u.name}
            </Text>
            <Text style={styles.markerLabelDistance}>
              {u.distance_km ? `${u.distance_km}km` : 'Nearby'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // User beacon marker ("You are here")
  const renderUserBeacon = () => {
    const beaconLeft = SCREEN_WIDTH / 2;
    const beaconTop = SCREEN_HEIGHT / 2;

    const waveScale = pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 2.4],
    });
    const waveOpacity = pulseAnim.interpolate({
      inputRange: [0, 0.4, 1],
      outputRange: [0.8, 0.4, 0],
    });

    return (
      <View
        style={[
          styles.beaconContainer,
          {
            left: beaconLeft - 30,
            top: beaconTop - 30,
            zIndex: 40,
          },
        ]}
        pointerEvents="none"
      >
        {/* Pulsing Radar Ring */}
        <Animated.View
          style={[
            styles.beaconPulseRing,
            {
              transform: [{ scale: waveScale }],
              opacity: waveOpacity,
            },
          ]}
        />

        {/* Core Glowing Orb */}
        <LinearGradient
          colors={['#00E5FF', '#0072FF']}
          style={styles.beaconCore}
        >
          {user?.avatar ? (
            <Image
              source={{ uri: formatImageUrl(user.avatar) }}
              style={styles.beaconAvatar}
            />
          ) : (
            <Ionicons name="heart" size={16} color="#FFFFFF" />
          )}
        </LinearGradient>

        {/* You label */}
        <View style={styles.beaconLabel}>
          <Text style={styles.beaconLabelText}>You</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ─── MAP VIEW MODE ─── */}
      {viewMode === 'map' ? (
        <View style={styles.mapCanvas} {...panResponder.panHandlers}>
          {/* Draggable Layer containing Tiles + Markers */}
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                transform: [{ translateX: pan.x }, { translateY: pan.y }],
              },
            ]}
          >
            {/* Map Tiles Background */}
            {tiles.map((t) => (
              <Image
                key={t.key}
                source={{ uri: t.url }}
                style={[
                  styles.mapTile,
                  {
                    left: t.left,
                    top: t.top,
                  },
                ]}
                resizeMode="cover"
              />
            ))}

            {/* Ambient Dark Neon Overlay to match Snapchat aesthetic */}
            <View style={styles.mapAmbientTint} pointerEvents="none" />

            {/* Current User Live Location Radar Beacon */}
            {renderUserBeacon()}

            {/* Markers for All Registered People */}
            {filteredUsers.map(renderUserMarker)}
          </Animated.View>
        </View>
      ) : (
        /* ─── NEARBY LIST VIEW MODE ─── */
        <View style={[styles.listViewContainer, { paddingTop: insets.top + 80 }]}>
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => `list-${item.id}`}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.listCard}
                activeOpacity={0.88}
                onPress={() => setSelectedUser(item)}
              >
                <Image source={{ uri: formatImageUrl(item.image) }} style={styles.listCardImage} />
                <View style={styles.listCardInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.listCardName}>{item.display_name || item.name}, {item.age}</Text>
                    {item.is_verified && <Ionicons name="checkmark-circle" size={15} color="#00E5FF" />}
                  </View>
                  <Text style={styles.listCardCity}>{item.city || 'Nearby'} • {item.distance_km ? `${item.distance_km} km away` : 'Close by'}</Text>
                  <Text style={styles.listCardBio} numberOfLines={1}>{item.bio}</Text>
                </View>

                <TouchableOpacity
                  style={styles.listCardChatBtn}
                  onPress={() => {
                    navigation.navigate('ChatDetail', {
                      userId: item.id,
                      user: {
                        id: item.id,
                        name: item.name,
                        display_name: item.display_name,
                        image: formatImageUrl(item.image),
                      },
                    });
                  }}
                >
                  <Ionicons name="chatbubble-ellipses" size={18} color="#FF007F" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* ─── TOP HEADER BAR ─── */}
      <SafeAreaView edges={['top']} style={styles.topHeaderWrap}>
        <View style={styles.topHeaderPill}>
          {/* Back button */}
          <TouchableOpacity
            style={styles.headerGlassBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Title with live active indicator */}
          <View style={styles.headerTitleBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={styles.liveGreenDot} />
              <Text style={styles.headerTitleText}>Snap Map</Text>
            </View>
            <Text style={styles.headerSubText}>
              {loading ? 'Locating singles...' : `${filteredUsers.length} People on Map`}
            </Text>
          </View>

          {/* Map / List View Toggle */}
          <TouchableOpacity
            style={[styles.headerGlassBtn, viewMode === 'list' && styles.headerBtnActive]}
            onPress={() => setViewMode((m) => (m === 'map' ? 'list' : 'map'))}
            activeOpacity={0.7}
          >
            <Ionicons
              name={viewMode === 'map' ? 'list' : 'map'}
              size={18}
              color={viewMode === 'list' ? '#FF007F' : '#FFFFFF'}
            />
          </TouchableOpacity>
        </View>

        {/* Filter Chips Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsRow}
        >
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}>
              🔥 All Singles
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'nearby' && styles.filterChipActive]}
            onPress={() => setActiveFilter('nearby')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'nearby' && styles.filterChipTextActive]}>
              📍 Nearby (&lt;15 km)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'verified' && styles.filterChipActive]}
            onPress={() => setActiveFilter('verified')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'verified' && styles.filterChipTextActive]}>
              🛡️ Verified Only
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'online' && styles.filterChipActive]}
            onPress={() => setActiveFilter('online')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'online' && styles.filterChipTextActive]}>
              🟢 Online Now
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* ─── FLOATING MAP CONTROLS (Right Edge) ─── */}
      {viewMode === 'map' && (
        <View style={[styles.controlsColumn, { bottom: selectedUser ? 240 : 40 }]}>
          {/* Zoom In */}
          <TouchableOpacity style={styles.controlPill} onPress={handleZoomIn} activeOpacity={0.75}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Zoom Out */}
          <TouchableOpacity style={styles.controlPill} onPress={handleZoomOut} activeOpacity={0.75}>
            <Ionicons name="remove" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Recenter GPS */}
          <TouchableOpacity
            style={[styles.controlPill, styles.recenterPill]}
            onPress={handleRecenterGPS}
            activeOpacity={0.75}
          >
            <LinearGradient
              colors={['#FF007F', '#8B5CF6']}
              style={StyleSheet.absoluteFillObject}
            />
            <Ionicons name="navigate" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* ─── SNAPCHAT-STYLE BOTTOM GLASS CARD (When user selected) ─── */}
      {selectedUser && (
        <Animated.View
          style={[
            styles.bottomCardWrapper,
            {
              transform: [{ translateY: cardSlideAnim }],
            },
          ]}
        >
          <View style={styles.bottomCard}>
            {/* Close button */}
            <TouchableOpacity
              style={styles.cardCloseBtn}
              onPress={() => setSelectedUser(null)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color="#A0AEC0" />
            </TouchableOpacity>

            <View style={styles.cardTopRow}>
              {/* Profile Image with Glow Ring */}
              <TouchableOpacity
                onPress={() => setProfileModalUser(selectedUser)}
                activeOpacity={0.88}
              >
                <View style={styles.cardAvatarBorder}>
                  <Image
                    source={{ uri: formatImageUrl(selectedUser.image) }}
                    style={styles.cardAvatarImage}
                  />
                  {selectedUser.is_online && <View style={styles.cardOnlineDot} />}
                </View>
              </TouchableOpacity>

              {/* Info Details */}
              <View style={styles.cardInfoWrap}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.cardUserName} numberOfLines={1}>
                    {selectedUser.display_name || selectedUser.name}, {selectedUser.age}
                  </Text>
                  {selectedUser.is_verified && (
                    <Ionicons name="checkmark-circle" size={16} color="#00E5FF" />
                  )}
                </View>

                <Text style={styles.cardUserJob} numberOfLines={1}>
                  {selectedUser.job || 'HeartLink Member'} • {selectedUser.city || 'Nashik'}
                </Text>

                <View style={styles.cardDistanceRow}>
                  <Ionicons name="location-sharp" size={13} color="#FF007F" />
                  <Text style={styles.cardDistanceText}>
                    {selectedUser.distance_km ? `${selectedUser.distance_km} km away from you` : 'Very Close'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Bio snippet */}
            {selectedUser.bio ? (
              <Text style={styles.cardBioText} numberOfLines={2}>
                "{selectedUser.bio}"
              </Text>
            ) : null}

            {/* Quick Action Buttons */}
            <View style={styles.cardActionRow}>
              {/* Wave Button */}
              <TouchableOpacity
                style={styles.cardWaveBtn}
                onPress={() => {
                  showToast(`👋 You sent a wave to ${selectedUser.display_name || selectedUser.name}!`);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.cardWaveBtnText}>Say Hi 👋</Text>
              </TouchableOpacity>

              {/* Chat Button */}
              <TouchableOpacity
                style={styles.cardChatBtn}
                onPress={() => {
                  const targetUser = selectedUser;
                  setSelectedUser(null);
                  navigation.navigate('ChatDetail', {
                    userId: targetUser.id,
                    user: {
                      id: targetUser.id,
                      name: targetUser.name,
                      display_name: targetUser.display_name,
                      image: formatImageUrl(targetUser.image),
                    },
                  });
                }}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={['#FF007F', '#E1006A', '#9333EA']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.cardChatBtnGrad}
                >
                  <Ionicons name="chatbubble" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.cardChatBtnText}>Chat Now</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* View Full Profile */}
              <TouchableOpacity
                style={styles.cardProfileBtn}
                onPress={() => setProfileModalUser(selectedUser)}
                activeOpacity={0.8}
              >
                <Ionicons name="person" size={17} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

      {/* ─── TOAST NOTIFICATION ─── */}
      <Animated.View
        style={[
          styles.toastContainer,
          {
            opacity: toastAnim,
            transform: [
              {
                translateY: toastAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-30, 0],
                }),
              },
            ],
          },
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['#1F1635', '#2A1B4E']}
          style={styles.toastPill}
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </LinearGradient>
      </Animated.View>

      {/* ─── FULL PROFILE DETAIL MODAL ─── */}
      {profileModalUser && (
        <ProfileDetail
          profile={profileModalUser}
          visible={!!profileModalUser}
          onClose={() => setProfileModalUser(null)}
          onLike={() => {
            showToast(`💖 Liked ${profileModalUser.name}!`);
            setProfileModalUser(null);
          }}
          onPass={() => {
            setProfileModalUser(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  mapCanvas: {
    flex: 1,
    backgroundColor: '#090D16',
    overflow: 'hidden',
  },
  mapTile: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  mapAmbientTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 14, 26, 0.15)',
  },

  // ─── TOP HEADER ───
  topHeaderWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 14 : 6,
  },
  topHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(18, 24, 38, 0.85)',
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  headerGlassBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnActive: {
    backgroundColor: 'rgba(255, 0, 127, 0.2)',
    borderWidth: 1,
    borderColor: '#FF007F',
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  liveGreenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#34C759',
  },
  headerTitleText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerSubText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },

  // Filter Chips Row
  filterChipsRow: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: 'rgba(18, 24, 38, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  filterChipActive: {
    backgroundColor: '#FF007F',
    borderColor: '#FF007F',
  },
  filterChipText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // ─── USER PIN MARKERS ───
  markerContainer: {
    position: 'absolute',
    alignItems: 'center',
    width: 60,
  },
  markerTouchTarget: {
    alignItems: 'center',
  },
  markerAvatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: '#FF007F',
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  markerAvatarSelected: {
    transform: [{ scale: 1.15 }],
    borderColor: '#00E5FF',
    shadowColor: '#00E5FF',
  },
  markerFemaleBorder: {
    borderColor: '#FF007F',
  },
  markerMaleBorder: {
    borderColor: '#8B5CF6',
  },
  markerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  markerVerifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    backgroundColor: '#0F172A',
    borderRadius: 7,
    padding: 1,
  },
  markerOnlineDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  markerPinStem: {
    width: 3,
    height: 10,
    marginTop: -2,
    borderRadius: 1.5,
  },
  markerPinPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: -1,
  },
  markerLabelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 4,
  },
  markerLabelPillSelected: {
    backgroundColor: '#FF007F',
    borderColor: '#FF007F',
  },
  markerLabelName: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    maxWidth: 55,
  },
  markerLabelDistance: {
    color: '#FDE68A',
    fontSize: 9,
    fontWeight: '700',
  },

  // ─── USER BEACON ("You are here") ───
  beaconContainer: {
    position: 'absolute',
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  beaconPulseRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#00E5FF',
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
  },
  beaconCore: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  beaconAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  beaconLabel: {
    position: 'absolute',
    bottom: -16,
    backgroundColor: 'rgba(0, 114, 255, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  beaconLabelText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },

  // ─── FLOATING CONTROLS COLUMN ───
  controlsColumn: {
    position: 'absolute',
    right: 16,
    gap: 10,
    zIndex: 90,
  },
  controlPill: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(18, 24, 38, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  recenterPill: {
    overflow: 'hidden',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  // ─── BOTTOM CARD ───
  bottomCardWrapper: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    zIndex: 150,
  },
  bottomCard: {
    backgroundColor: 'rgba(18, 24, 38, 0.94)',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  cardCloseBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardAvatarBorder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FF007F',
    overflow: 'hidden',
  },
  cardAvatarImage: {
    width: '100%',
    height: '100%',
  },
  cardOnlineDot: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#121826',
  },
  cardInfoWrap: {
    flex: 1,
  },
  cardUserName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  cardUserJob: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  cardDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  cardDistanceText: {
    color: '#FF007F',
    fontSize: 11,
    fontWeight: '700',
  },
  cardBioText: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
    fontStyle: 'italic',
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  cardWaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  cardWaveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardChatBtn: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  cardChatBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  cardChatBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  cardProfileBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── LIST VIEW ───
  listViewContainer: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121826',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  listCardImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  listCardInfo: {
    flex: 1,
  },
  listCardName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  listCardCity: {
    color: '#FF007F',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  listCardBio: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
  },
  listCardChatBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 0, 127, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── TOAST ───
  toastContainer: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    zIndex: 200,
  },
  toastPill: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 127, 0.4)',
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
