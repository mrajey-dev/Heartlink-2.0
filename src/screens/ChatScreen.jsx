// src/screens/ChatScreen.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, StatusBar, TextInput, ScrollView, Dimensions, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { apiGetConversations } from '../services/api';
import { formatImageUrl, renderVerifiedBadge, formatMessagePreview } from '../utils/helpers';
import { eventEmitter, EVENTS } from '../utils/eventEmitter';

const { width, height } = Dimensions.get('window');

export const SUPPORT_USER_ID = 16;

export const SUPPORT_USER = {
  id: 16,
  name: 'HeartLink Support',
  display_name: 'HeartLink Support',
  is_support: true,
  is_verified: true,
  isVerified: true,
  subscription_plan: 'Official Support',
  age: null,
  job: 'Customer Support & Safety Team',
  location: 'HeartLink HQ',
  bio: 'Official 24/7 Support & Helpdesk.',
  image: null,
  online: true,
};

export default function ChatScreen() {
  const navigation = useNavigation();
  const { user: currentUser } = useAuth();
  const isCurrentUserSupport = currentUser?.id === 16 || currentUser?.id === '16';

  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  const { theme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const isFetchingRef = React.useRef(false);

  const fetchConversations = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      // Fetch API conversations from database
      let apiList = [];
      try {
        const res = await apiGetConversations();
        if (res?.conversations && Array.isArray(res.conversations)) {
          apiList = res.conversations.map(c => ({
            id: c.id,
            name: (c.id === 16 || c.id === '16') ? 'HeartLink Support' : c.name,
            display_name: (c.id === 16 || c.id === '16') ? 'HeartLink Support' : (c.display_name || c.user?.display_name || c.name),
            time: c.last_time || 'Now',
            unread: c.unread_count || 0,
            online: (bool => bool)(c.online),
            is_verified: (c.id === 16 || c.id === '16') ? true : (c.is_verified || c.user?.is_verified),
            isVerified: (c.id === 16 || c.id === '16') ? true : (c.is_verified || c.user?.is_verified),
            is_support: (c.id === 16 || c.id === '16') || c.is_support,
            subscription_plan: (c.id === 16 || c.id === '16') ? 'Official Support' : (c.subscription_plan || c.user?.subscription_plan),
            lastMsg: formatMessagePreview(c.last_msg) || 'Matched! Start chatting now.',
            image: formatImageUrl(c.avatar),
            user: c.user || c,
            lastTimestamp: c.last_timestamp || 0,
          }));

          // Sort descending so the most recent messaged user appears at the top
          apiList.sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));
        }
      } catch (err) {
        console.warn('Fetch conversations API error:', err?.message);
      }

      if (isCurrentUserSupport) {
        // User 16 is Support Admin — sees all user chats
        setChats(apiList);
      } else {
        // Regular user — HeartLink Support (id: 16) is ALWAYS pinned at index 0
        const user16Conv = apiList.find(c => c.id === 16 || c.id === '16');
        const regularList = apiList.filter(c => c.id !== 16 && c.id !== '16');

        const supportChat = {
          id: 16,
          name: 'HeartLink Support',
          display_name: 'HeartLink Support',
          time: user16Conv?.time || '24/7',
          unread: user16Conv?.unread || 0,
          online: true,
          is_verified: true,
          isVerified: true,
          is_support: true,
          subscription_plan: 'Official Support',
          lastMsg: formatMessagePreview(user16Conv?.lastMsg) || "We're here to help! Tap to message our support team.",
          image: null,
          user: user16Conv?.user
            ? { ...SUPPORT_USER, ...user16Conv.user, id: 16, is_support: true, is_verified: true, display_name: 'HeartLink Support' }
            : SUPPORT_USER,
          lastTimestamp: Infinity, // Always pinned first
        };

        setChats([supportChat, ...regularList]);
      }
    } catch (e) {
      console.warn('Fetch conversations error:', e?.message);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchConversations();

      const interval = setInterval(fetchConversations, 6000);

      const unsubChat = eventEmitter.on(EVENTS.CHAT_UPDATED, fetchConversations);
      const unsubMatch = eventEmitter.on(EVENTS.MATCH_UPDATED, fetchConversations);

      return () => {
        clearInterval(interval);
        unsubChat();
        unsubMatch();
      };
    }, [])
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return chats;
    const q = search.toLowerCase().trim();
    return chats.filter(c => {
      if (c.is_support || c.id === 16 || c.id === '16') {
        return (
          'heartlink support'.includes(q) ||
          'customer support'.includes(q) ||
          'help'.includes(q) ||
          'support'.includes(q) ||
          'heart link'.includes(q) ||
          c.lastMsg?.toLowerCase().includes(q)
        );
      }
      return (
        c.name?.toLowerCase().includes(q) ||
        c.display_name?.toLowerCase().includes(q) ||
        c.lastMsg?.toLowerCase().includes(q)
      );
    });
  }, [chats, search]);

  const renderChat = ({ item }) => {
    const isSupportItem = item.is_support || item.id === 16 || item.id === '16';

    if (isSupportItem && !isCurrentUserSupport) {
      return (
        <TouchableOpacity
          style={[styles.chatCard, styles.supportCard]}
          onPress={() => navigation.navigate('SupportChat')}
          activeOpacity={0.80}
        >
          {/* Support Avatar / Official Icon */}
          <View style={styles.avatarWrap}>
            <LinearGradient
              colors={theme.gradientAccent || ['#FF007F', '#B5179E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.supportAvatarBox}
            >
              <Ionicons name="headset" size={26} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.supportOnlineDot} />
          </View>

          {/* Info */}
          <View style={styles.chatInfo}>
            <View style={styles.chatRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Text style={[styles.chatName, styles.supportName]}>{item.display_name || item.name}</Text>
                {renderVerifiedBadge(item.user || item, 15)}
                <View style={styles.officialBadge}>
                  <Text style={styles.officialBadgeText}>OFFICIAL</Text>
                </View>
              </View>
              <View style={styles.pinnedRow}>
                <Ionicons name="pin" size={12} color={theme.accent || '#FF007F'} style={{ marginRight: 3 }} />
                <Text style={[styles.chatTime, { color: theme.accent || '#FF007F', fontWeight: '700' }]}>{item.time}</Text>
              </View>
            </View>
            <View style={styles.chatRow}>
              <Text style={[styles.chatMsg, styles.supportMsg, item.unread > 0 && { fontWeight: '700', color: theme.textPrimary }]} numberOfLines={1}>
                {item.lastMsg}
              </Text>
              {item.unread > 0 && (
                <LinearGradient colors={theme.gradientAccent} style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unread}</Text>
                </LinearGradient>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.chatCard}
        onPress={() => navigation.navigate('ChatDetail', { userId: item.id, user: item.user })}
        activeOpacity={0.80}
      >
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <Image source={{ uri: item.image }} style={styles.avatar} />
        </View>

        {/* Info */}
        <View style={styles.chatInfo}>
          <View style={styles.chatRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.chatName}>{item.display_name || item.name}</Text>
              {renderVerifiedBadge(item.user || item, 15)}
            </View>
            <Text style={[styles.chatTime, item.unread > 0 && { color: theme.accent }]}>{item.time}</Text>
          </View>
          <View style={styles.chatRow}>
            <Text style={[styles.chatMsg, item.unread > 0 && { color: theme.textSec, fontWeight: '700' }]} numberOfLines={1}>
              {item.lastMsg}
            </Text>
            {item.unread > 0 && (
              <LinearGradient colors={theme.gradientAccent} style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unread}</Text>
              </LinearGradient>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={{ zIndex: 10 }}>
      <Text style={styles.sectionLabel}>{filtered.length} conversation{filtered.length !== 1 ? 's' : ''}</Text>
    </View>
  );

  return (
    <LinearGradient colors={theme.bgGrad} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Glowing background depth blobs */}
      <View style={styles.glowBlobFuchsia} pointerEvents="none" />
      <View style={styles.glowBlobCyan} pointerEvents="none" />

      <SafeAreaView style={styles.flex}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setSearchOpen(p => !p)}>
              <Ionicons name={searchOpen ? 'close' : 'search'} size={19} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar */}
        {searchOpen && (
          <View style={styles.searchWrap}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={15} color={theme.textFaint} />
              <TextInput
                autoFocus style={styles.searchInput}
                placeholder="Search conversations…"
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
        ) : (
          <FlatList
            data={filtered}
            renderItem={renderChat}
            keyExtractor={i => i.id?.toString()}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={styles.emptyCard}>
                  <Ionicons name="chatbubbles-outline" size={60} color={theme.textFaint} />
                  <Text style={styles.emptyTitle}>No messages yet</Text>
                  <Text style={styles.emptySub}>When you match with someone, your conversations will appear here</Text>
                </View>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const getStyles = (theme) => StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, position: 'relative' },

  // Glowing background blobs for glassmorphic depth
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
  headerRight: { flexDirection: 'row', gap: 8 },
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
  sectionLabel: { fontSize: 11, fontWeight: '800', color: theme.textFaint, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 12, paddingLeft: 4 },

  // Chat conversation rows (Solid cardStrips)
  chatCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.isDark ? '#191130' : '#FFFFFF',
    borderRadius: 22, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: theme.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  supportCard: {
    backgroundColor: theme.isDark ? 'rgba(255, 0, 127, 0.08)' : '#FFF7FC',
    borderColor: theme.isDark ? 'rgba(255, 0, 127, 0.35)' : 'rgba(255, 0, 127, 0.25)',
    borderWidth: 1.2,
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  supportAvatarBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  supportOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#30D158',
    borderWidth: 2.2,
    borderColor: theme.isDark ? '#150A2E' : '#FFFFFF',
  },
  supportName: {
    color: theme.textPrimary,
    fontWeight: '900',
  },
  officialBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderColor: 'rgba(0, 229, 255, 0.5)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    marginLeft: 6,
  },
  officialBadgeText: {
    color: '#00E5FF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pinnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supportMsg: {
    color: theme.isDark ? 'rgba(255,255,255,0.85)' : '#444',
  },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: 6.5,
    backgroundColor: theme.accentGreen, borderWidth: 2, borderColor: theme.isDark ? '#150A2E' : '#FFFFFF',
  },
  chatInfo: { flex: 1 },
  chatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatName: { fontSize: 15, fontWeight: '800', color: theme.textPrimary, letterSpacing: -0.2 },
  chatTime: { fontSize: 11, color: theme.textFaint },
  chatMsg: { fontSize: 13, color: theme.textSec, flex: 1, paddingRight: 10 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  unreadText: { color: '#fff', fontSize: 10, fontWeight: '900' },

  // Premium empty state (matches RequestsScreen pattern)
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, paddingTop: 60 },
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