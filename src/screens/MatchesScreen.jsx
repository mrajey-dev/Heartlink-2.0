// src/screens/MatchesScreen.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, StatusBar, Dimensions, TextInput, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import ProfileDetail from '../components/discovery/ProfileDetail';
import { apiGetMatches, apiGetRequests, apiUnmatchUser, apiBlockUser } from '../services/api';
import { ensureArray, formatImageUrl, renderVerifiedBadge } from '../utils/helpers';
import { eventEmitter, EVENTS } from '../utils/eventEmitter';

const { width, height } = Dimensions.get('window');

export default function MatchesScreen() {
  const navigation = useNavigation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [matches, setMatches] = useState([]);
  const [requestCount, setRequestCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchMatches = async (query = search, isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const [mRes, rRes] = await Promise.all([
        apiGetMatches(query).catch(() => null),
        apiGetRequests().catch(() => null),
      ]);

      if (rRes?.requests && Array.isArray(rRes.requests)) {
        const pendingCount = rRes.requests.filter(
          (r) => (r.status === 'pending' || r.request_status === 'pending')
        ).length;
        setRequestCount(pendingCount);
      }

      if (mRes?.matches && Array.isArray(mRes.matches)) {
        const apiList = mRes.matches.map(m => {
          const u = m.user || {};
          const rawImg = u.avatar || (u.photos && u.photos[0]?.photo_url) || '';
          const rawPhotos = ensureArray(u.photos?.map(p => (typeof p === 'string' ? p : (p ? (p.photo_url || p.uri) : null))).filter(Boolean));
          if (u.avatar && !rawPhotos.includes(u.avatar)) rawPhotos.unshift(u.avatar);
          const formattedPhotos = rawPhotos.map(p => formatImageUrl(p)).filter(Boolean);

          const userCity = u.city || u.user?.city || null;
          const userLoc = userCity ? `${userCity}${u.state ? ', ' + u.state : ''}` : 'Nearby';

          return {
            id: u.id,
            name: u.name || 'Match',
            display_name: u.display_name || u.name || 'Match',
            age: u.age || 24,
            is_verified: u.is_verified || u.isVerified,
            isVerified: u.is_verified || u.isVerified,
            subscription_plan: u.subscription_plan,
            city: userCity || 'Nearby',
            location: userLoc,
            image: formatImageUrl(rawImg),
            images: formattedPhotos.length > 0 ? formattedPhotos : ['https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=500'],
            interests: ensureArray(u.interests, ['Travel', 'Music', 'Photography']),
            matchedAt: m.matched_at ? m.matched_at : 'Recently',
            timestamp: m.matched_at ? new Date(m.matched_at).getTime() : 0,
            compatibility: u.compatibility_score || 90,
            online: (bool => bool)(u.is_online),
            user: u,
          };
        });
        setMatches(apiList);
      } else {
        setMatches([]);
      }
    } catch (e) {
      console.warn('Fetch matches error:', e?.message);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMatches(search, false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Smart active-screen cross-device sync (runs ONLY while viewing Matches tab)
  useFocusEffect(
    useCallback(() => {
      fetchMatches(search, true);

      const interval = setInterval(() => {
        fetchMatches(search, true);
      }, 8000);

      const unsubMatch = eventEmitter.on(EVENTS.MATCH_UPDATED, () => fetchMatches(search, true));
      const unsubReq = eventEmitter.on(EVENTS.REQUEST_UPDATED, () => fetchMatches(search, true));

      return () => {
        clearInterval(interval);
        unsubMatch();
        unsubReq();
      };
    }, [search])
  );

  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);

  const { theme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  // Server-side filtered matches
  const filtered = matches;

  const CARD_W = (width - 44) / 2;

  const openProfile = (profile) => {
    // Map properties to match DiscoverScreen schema
    const formatted = {
      ...profile,
      images: ensureArray(profile.images, [profile.image]),
      interests: ensureArray(profile.interests, ['Travel', 'Music', 'Photography']),
      job: 'Connections',
      distance: profile.matchedAt,
      bio: profile.user?.bio || 'You matched! Open chat to start sharing cosmic vibes.'
    };
    setSelectedProfile(formatted);
    setDetailVisible(true);
  };

  const unmatch = (id) => {
    setMatches(p => p.filter(m => m.id !== id));
    eventEmitter.emit(EVENTS.MATCH_UPDATED);
    eventEmitter.emit(EVENTS.CHAT_UPDATED);
    apiUnmatchUser(id).then(() => {
      eventEmitter.emit(EVENTS.MATCH_UPDATED);
      eventEmitter.emit(EVENTS.CHAT_UPDATED);
    }).catch(() => { });
  };

  const startChat = (id, targetUser) => {
    const u = targetUser || matches.find(m => m.id === id)?.user || matches.find(m => m.id === id);
    navigation.navigate('ChatDetail', { userId: id, user: u });
  };

  const renderCard = ({ item, index }) => {
    // Unique asymmetrical corner radius alternating
    const isEven = index % 2 === 0;
    const cardBorderRadiusStyles = isEven
      ? {
        borderTopLeftRadius: 36,
        borderBottomRightRadius: 36,
        borderTopRightRadius: 10,
        borderBottomLeftRadius: 10,
      }
      : {
        borderTopRightRadius: 36,
        borderBottomLeftRadius: 36,
        borderTopLeftRadius: 10,
        borderBottomRightRadius: 10,
      };

    return (
      <TouchableOpacity
        style={[styles.card, { width: CARD_W }, cardBorderRadiusStyles]}
        onPress={() => openProfile(item)}
        activeOpacity={0.85}
      >
        <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.75)']} style={styles.cardOverlay} />

        {/* Dynamic compat neon pill */}
        <View style={styles.compatBadge}>
          <Ionicons name="heart" size={9} color="#fff" />
          <Text style={styles.compatText}>{item.compatibility}%</Text>
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.cardName}>{item.display_name || item.name.split(' ')[0]}</Text>
                {renderVerifiedBadge(item.user || item, 15)}
              </View>
              <Text style={styles.cardSub}>{item.age} · {item.city || 'Nearby'}</Text>
            </View>

            {/* Quick message icon button */}
            <TouchableOpacity
              style={styles.msgBtnRound}
              onPress={() => startChat(item.id, item.user || item)}
              activeOpacity={0.7}
            >
              <LinearGradient colors={theme.gradientAccent} style={styles.msgBtnGrad}>
                <Ionicons name="chatbubble" size={14} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient colors={theme.bgGrad} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Glowing background depth blobs */}
      <View style={styles.glowBlobFuchsia} pointerEvents="none" />
      <View style={styles.glowBlobCyan} pointerEvents="none" />

      <SafeAreaView style={styles.flex}>
        {/* Header navigation bar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Matches</Text>
            <Text style={styles.sub}>{filtered.length} connections</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* Request Button with Badge on Top */}
            <TouchableOpacity
              style={styles.requestsHeaderBtn}
              onPress={() => navigation.navigate('Requests')}
              activeOpacity={0.8}
            >
              <LinearGradient colors={theme.gradientAccent} style={styles.requestsHeaderGrad}>
                <Text style={styles.requestsHeaderTxt}>Requests</Text>
              </LinearGradient>
              {requestCount > 0 && (
                <View style={styles.requestBadge}>
                  <Text style={styles.requestBadgeText}>
                    {requestCount > 99 ? '99+' : requestCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconBtn} onPress={() => setSearchOpen(p => !p)}>
              <Ionicons name={searchOpen ? 'close' : 'search'} size={19} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Glass search input */}
        {searchOpen && (
          <View style={styles.searchWrap}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={15} color={theme.textFaint} />
              <TextInput
                autoFocus style={styles.searchInput}
                placeholder="Search matches…"
                placeholderTextColor={theme.textFaint}
                value={search} onChangeText={setSearch}
              />
            </View>
          </View>
        )}

        {loading ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="large" color="#FF007F" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyCard}>
              <Ionicons name="heart-circle-outline" size={60} color={theme.textFaint} />
              <Text style={styles.emptyTitle}>No matches yet</Text>
              <Text style={styles.emptySub}>Start swiping on the Discover screen to find your cosmic connections</Text>
            </View>
          </View>
        ) : (
          <FlatList
            data={filtered}
            renderItem={renderCard}
            keyExtractor={i => i.id}
            numColumns={2}
            columnWrapperStyle={styles.colWrapper}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>

      {/* Match details slide-up */}
      <ProfileDetail
        visible={detailVisible}
        profile={selectedProfile}
        isMatch={true}
        onClose={() => {
          setDetailVisible(false);
          setSelectedProfile(null);
        }}
        onLike={(prof) => startChat(prof?.id || selectedProfile?.id, prof?.user || selectedProfile?.user || prof || selectedProfile)}
        onPass={unmatch}
      />
    </LinearGradient>
  );
}

const getStyles = (theme) => StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, position: 'relative' },

  // Glassmorphic depth blobs
  glowBlobFuchsia: {
    position: 'absolute',
    top: height * 0.1,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 0, 127, 0.20)',
    opacity: 0.8,
    zIndex: 0,
  },
  glowBlobCyan: {
    position: 'absolute',
    bottom: height * 0.2,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(0, 191, 255, 0.16)',
    opacity: 0.7,
    zIndex: 0,
  },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
    zIndex: 10,
  },
  title: { fontSize: 28, fontWeight: '900', color: theme.textPrimary, letterSpacing: -0.6 },
  sub: { fontSize: 13, color: theme.textSec, marginTop: 3 },
  requestsHeaderBtn: {
    borderRadius: 20,
    position: 'relative',
  },
  requestsHeaderGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  requestsHeaderTxt: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  requestBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF0055',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: theme.isDark ? '#140E2D' : '#FFFFFF',
    zIndex: 10,
    shadowColor: '#FF0055',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  requestBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.border,
    justifyContent: 'center', alignItems: 'center',
  },

  searchWrap: { paddingHorizontal: 20, marginBottom: 12, zIndex: 10 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.glass, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: theme.border,
  },
  searchInput: { flex: 1, color: theme.textPrimary, fontSize: 14, padding: 0 },

  list: { paddingHorizontal: 16, paddingBottom: 110 },
  colWrapper: { gap: 12, marginBottom: 12 },

  // Cosmic Sparks Featured Carousel
  sparksSection: {
    marginBottom: 22,
    paddingLeft: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  sparksList: {
    gap: 14,
    paddingRight: 20,
  },
  sparkItem: {
    alignItems: 'center',
    position: 'relative',
    width: 70,
  },
  sparkRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    padding: 2.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkPhotoInner: {
    width: '100%',
    height: '100%',
    borderRadius: 31,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  sparkPhoto: {
    width: '100%',
    height: '100%',
  },
  sparkCompatBadge: {
    position: 'absolute',
    bottom: 20,
    right: 0,
    backgroundColor: '#FF375F',
    borderRadius: 9,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderWidth: 1.2,
    borderColor: theme.isDark ? '#000' : '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  sparkCompatText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
  },
  sparkName: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSec,
    marginTop: 6,
    textAlign: 'center',
  },

  // Interactive Filter Tabs
  filterContainer: {
    gap: 8,
    marginBottom: 18,
    paddingLeft: 4,
  },
  filterPill: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.glass,
    height: 36,
  },
  filterPillActive: {
    borderColor: 'transparent',
  },
  filterPillGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: '100%',
    justifyContent: 'center',
  },
  filterPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: '100%',
    justifyContent: 'center',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSec,
  },
  filterPillTextActive: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },

  // Grid Card Items
  card: {
    height: 240,
    overflow: 'hidden',
    backgroundColor: theme.glass,
    borderWidth: 1,
    borderColor: theme.border,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardImage: { position: 'absolute', width: '100%', height: '100%' },
  cardOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' },
  onlineDot: {
    position: 'absolute', top: 12, left: 12,
    width: 11, height: 11, borderRadius: 5.5,
    backgroundColor: '#30D158', borderWidth: 2, borderColor: theme.isDark ? '#140E2D' : '#FFFFFF',
    zIndex: 5,
  },
  compatBadge: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255, 55, 95, 0.22)',
    borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#FF375F',
    zIndex: 5,
  },
  compatText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  cardInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLeft: { flex: 1, marginRight: 6 },
  cardName: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: -0.2 },
  cardSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  msgBtnRound: { width: 34, height: 34, borderRadius: 17, overflow: 'hidden' },
  msgBtnGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Premium empty state
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyCard: {
    backgroundColor: theme.glass, borderRadius: 24, padding: 32,
    alignItems: 'center', gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: theme.textPrimary },
  emptySub: { fontSize: 14, color: theme.textSec, textAlign: 'center', lineHeight: 21 },
});
