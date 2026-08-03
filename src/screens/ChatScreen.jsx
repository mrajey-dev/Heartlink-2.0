// src/screens/ChatScreen.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, SafeAreaView, StatusBar, TextInput, ScrollView, Dimensions, Platform, ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { apiGetConversations } from '../services/api';
import { formatImageUrl, renderVerifiedBadge } from '../utils/helpers';
import { eventEmitter, EVENTS } from '../utils/eventEmitter';

const { width, height } = Dimensions.get('window');

export default function ChatScreen() {
  const navigation = useNavigation();
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
      const res = await apiGetConversations();
      if (res?.conversations && Array.isArray(res.conversations)) {
        const apiList = res.conversations.map(c => ({
          id: c.id,
          name: c.name,
          display_name: c.display_name || c.user?.display_name || c.name,
          time: c.last_time || 'Now',
          unread: c.unread_count || 0,
          online: (bool => bool)(c.online),
          is_verified: c.is_verified || c.user?.is_verified,
          isVerified: c.is_verified || c.user?.is_verified,
          subscription_plan: c.subscription_plan || c.user?.subscription_plan,
          lastMsg: c.last_msg || 'Matched! Start chatting now.',
          image: formatImageUrl(c.avatar),
          user: c.user || c,
          lastTimestamp: c.last_timestamp || 0,
        }));

        // Sort descending so the most recent messaged user appears at the top
        apiList.sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));
        setChats(apiList);
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

  const filtered = chats.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const activeSparks = chats.filter(c => c.online);

  const renderChat = ({ item }) => (
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
            {/* <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="create-outline" size={19} color={theme.textPrimary} />
            </TouchableOpacity> */}
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
            keyExtractor={i => i.id}
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 14 : 14,
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

  // Active Connection carousel
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
    width: 66,
  },
  sparkAvatarWrap: {
    position: 'relative',
    width: 58,
    height: 58,
  },
  sparkAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  sparkOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#30D158',
    borderWidth: 2.2,
    borderColor: '#150A2E',
  },
  sparkName: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textSec,
    marginTop: 6,
    textAlign: 'center',
  },

  // Chat conversation rows (Solid cardStrips)
  chatCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.isDark ? '#191130' : '#FFFFFF',
    borderRadius: 22, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: theme.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: 6.5,
    backgroundColor: theme.accentGreen, borderWidth: 2, borderColor: '#150A2E',
  },
  chatInfo: { flex: 1 },
  chatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatName: { fontSize: 15, fontWeight: '800', color: theme.textPrimary, letterSpacing: -0.2 },
  chatTime: { fontSize: 11, color: theme.textFaint },
  chatMsg: { fontSize: 13, color: theme.textSec, flex: 1, paddingRight: 10 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  unreadText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: theme.textSec, fontSize: 15 },

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