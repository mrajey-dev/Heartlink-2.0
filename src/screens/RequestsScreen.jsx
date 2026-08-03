// src/screens/RequestsScreen.jsx — Swipeable Requests Deck with Top Boosted Inquiry
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Pressable,
  Image, SafeAreaView, StatusBar, Alert, Dimensions, FlatList, Platform, ActivityIndicator, PanResponder, Animated, Easing,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import ProfileDetail from '../components/discovery/ProfileDetail';
import CustomAlertModal from '../components/CustomAlertModal';
import MatchModal from '../components/MatchModal';
import { apiGetRequests, apiAcceptRequest, apiDeclineRequest, apiRespondDateProposal, apiUnmatchUser } from '../services/api';
import { ensureArray, formatImageUrl, renderVerifiedBadge } from '../utils/helpers';
import { eventEmitter, EVENTS } from '../utils/eventEmitter';

const { width, height } = Dimensions.get('window');

function SwipeableCard({ itemId, isSwiped, onSwipe, onDelete, children }) {
  const animX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animX, {
      toValue: isSwiped ? -85 : 0,
      tension: 55,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [isSwiped]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dy) < 12,
    onPanResponderGrant: () => {
      animX.stopAnimation();
    },
    onPanResponderMove: (_, g) => {
      const initialOffset = isSwiped ? -85 : 0;
      let newX = initialOffset + g.dx;

      // Smooth rubber-banding limits
      if (newX > 0) {
        newX = newX * 0.2;
      } else if (newX < -110) {
        const overflow = newX + 110;
        newX = -110 + overflow * 0.2;
      }

      animX.setValue(newX);
    },
    onPanResponderRelease: (_, g) => {
      const initialOffset = isSwiped ? -85 : 0;
      const finalX = initialOffset + g.dx;

      if (g.vx < -0.35 || finalX < -45) {
        onSwipe(itemId);
        Animated.spring(animX, {
          toValue: -85,
          tension: 55,
          friction: 8,
          useNativeDriver: true,
        }).start();
      } else {
        onSwipe(null);
        Animated.spring(animX, {
          toValue: 0,
          tension: 55,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }
    },
    onPanResponderTerminate: () => {
      Animated.spring(animX, {
        toValue: isSwiped ? -85 : 0,
        tension: 55,
        friction: 8,
        useNativeDriver: true,
      }).start();
    },
  }), [itemId, isSwiped, onSwipe]);

  const btnScale = animX.interpolate({
    inputRange: [-85, 0],
    outputRange: [1, 0.5],
    extrapolate: 'clamp',
  });

  const btnOpacity = animX.interpolate({
    inputRange: [-85, -30, 0],
    outputRange: [1, 0.2, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ marginBottom: 10, position: 'relative' }}>
      {/* Revealed Action Button behind card with smooth scale and opacity transition */}
      <Animated.View
        pointerEvents={isSwiped ? 'auto' : 'none'}
        style={[
          swipeDeleteStyles.swipeDeleteContainer,
          {
            opacity: btnOpacity,
            transform: [{ scale: btnScale }],
          },
        ]}
      >
        <TouchableOpacity
          style={swipeDeleteStyles.swipeDeleteTouch}
          onPress={() => onDelete(itemId)}
          disabled={!isSwiped}
          activeOpacity={0.8}
        >
          <LinearGradient colors={['#FF375F', '#D00040']} style={swipeDeleteStyles.swipeDeleteGrad}>
            <Ionicons name="trash-outline" size={20} color="#FFF" style={{ marginBottom: 2 }} />
            <Text style={swipeDeleteStyles.swipeDeleteTxt}>Delete</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Main Foreground Card smoothly tracked with fingers */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          zIndex: 2,
          transform: [{ translateX: animX }],
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const swipeDeleteStyles = StyleSheet.create({
  swipeDeleteContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 78,
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  swipeDeleteTouch: {
    width: '100%',
    height: '100%',
  },
  swipeDeleteGrad: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF375F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  swipeDeleteTxt: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

export default function RequestsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [expandedIds, setExpandedIds] = useState({});
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [acceptedMatchedUser, setAcceptedMatchedUser] = useState(null);

  const [swipedCardId, setSwipedCardId] = useState(null);

  const deleteNotification = (id) => {
    setRequests(prev => prev.filter(r => r.id !== id));
    setSwipedCardId(null);
  };

  const { theme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);

  const loadRequests = async (isBackground = false) => {
    try {
      if (!isBackground && requests.length === 0) setLoading(true);
      const res = await apiGetRequests();
      if (res?.requests && Array.isArray(res.requests)) {
        const apiList = res.requests.map(u => {
          const rawAvatar = u.avatar || (u.photos && u.photos[0]?.photo_url) || (u.user && u.user.avatar) || '';
          const rawPhotos = ensureArray(u.photos?.map(p => (typeof p === 'string' ? p : (p ? (p.photo_url || p.uri) : null))).filter(Boolean));
          if (rawAvatar && !rawPhotos.includes(rawAvatar)) rawPhotos.unshift(rawAvatar);
          const formattedPhotos = rawPhotos.map(p => formatImageUrl(p)).filter(Boolean);

          const isBoosted = !!(u.is_boosted || u.swipe_type === 'super_like');
          const dateStr = u.date_sent || 'Recently';
          const reqStatus = u.request_status || 'pending';

          return {
            id: u.id,
            user_id: u.user_id || u.user?.id,
            booking_id: u.booking_id,
            type: u.type || 'match_request',
            is_outgoing: !!u.is_outgoing,
            restaurant: u.restaurant,
            booking_date: u.booking_date,
            booking_time: u.booking_time,
            name: u.name,
            display_name: u.display_name || u.user?.display_name || u.name,
            age: u.user?.age || u.age || 24,
            is_verified: u.is_verified || u.user?.is_verified,
            isVerified: u.is_verified || u.user?.is_verified,
            subscription_plan: u.subscription_plan || u.user?.subscription_plan,
            user: u.user || u,
            job: u.user?.job || u.job || 'Member',
            image: formatImageUrl(rawAvatar),
            images: formattedPhotos.length > 0 ? formattedPhotos : ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600'],
            interests: ensureArray(u.user?.interests || u.interests, ['Travel', 'Music', 'Photography']),
            likedAt: dateStr,
            dateSent: dateStr,
            bio: u.user?.bio || u.bio || 'Interested in connecting with you!',
            compatibility: u.user?.compatibility_score || u.compatibility_score || 92,
            mutuals: [],
            is_boosted: isBoosted,
            status: reqStatus,
            message: u.message,
            timestamp: u.timestamp || 0,
          };
        });

        setRequests(sortRequestsList(apiList));
      }
    } catch (e) {
      console.warn('Load requests error:', e?.message);
    } finally {
      setLoading(false);
    }
  };

  const sortRequestsList = (list) => {
    return [...list].sort((a, b) => {
      const aPending = (a.status === 'pending');
      const bPending = (b.status === 'pending');

      if (aPending !== bPending) {
        return aPending ? -1 : 1;
      }

      if (aPending && bPending) {
        if (a.is_boosted !== b.is_boosted) {
          return a.is_boosted ? -1 : 1;
        }
      }

      return (b.timestamp || 0) - (a.timestamp || 0);
    });
  };

  useFocusEffect(
    useCallback(() => {
      loadRequests(false);

      const interval = setInterval(() => {
        loadRequests(true);
      }, 8000);

      const unsubEvent = eventEmitter.on(EVENTS.REQUEST_UPDATED, () => loadRequests(true));

      return () => {
        clearInterval(interval);
        unsubEvent();
      };
    }, [])
  );

  const accept = async (id) => {
    setActionLoadingId(id);
    const targetItem = requests.find(r => r.id === id);
    const targetUserId = targetItem?.user_id || (typeof id === 'string' ? parseInt(id.replace(/[^0-9]/g, ''), 10) : id);
    setRequests(prev => sortRequestsList(prev.map(r => r.id === id ? { ...r, status: 'accepted' } : r)));
    try {
      await apiAcceptRequest(targetUserId);
      eventEmitter.emit(EVENTS.REQUEST_UPDATED);
      eventEmitter.emit(EVENTS.CHAT_UPDATED);
    } catch (e) {
      console.warn('Accept error:', e?.message);
    } finally {
      setActionLoadingId(null);
    }
    if (targetItem) {
      setAcceptedMatchedUser(targetItem.user || targetItem);
      setMatchModalVisible(true);
    }
  };

  const decline = async (id) => {
    setActionLoadingId(id);
    const targetItem = requests.find(r => r.id === id);
    const targetUserId = targetItem?.user_id || (typeof id === 'string' ? parseInt(id.replace(/[^0-9]/g, ''), 10) : id);
    setRequests(prev => sortRequestsList(prev.map(r => r.id === id ? { ...r, status: 'declined' } : r)));
    try {
      await apiDeclineRequest(targetUserId);
      eventEmitter.emit(EVENTS.REQUEST_UPDATED);
    } catch (e) {
      console.warn('Decline error:', e?.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const openProfile = (profile) => {
    const formatted = {
      ...profile,
      images: [profile.image],
      distance: profile.likedAt,
    };
    setSelectedProfile(formatted);
    setDetailVisible(true);
  };

  const unmatchAndRemove = async (item) => {
    if (!item) return;
    const rawId = item.id;
    const targetUserId = item.user_id || (typeof rawId === 'string' ? rawId.replace('swipe_', '').replace('proposal_', '') : rawId);
    setRequests(prev => prev.filter(r => r.id !== item.id));
    try {
      await apiUnmatchUser(targetUserId);
      eventEmitter.emit(EVENTS.REQUEST_UPDATED);
    } catch (e) {
      console.warn('Unmatch error:', e?.message);
    }
  };

  const openChatForProfile = (item) => {
    if (!item) return;
    const rawId = item.id;
    const targetUserId = item.user_id || (typeof rawId === 'string' ? rawId.replace('swipe_', '').replace('proposal_', '') : rawId);
    navigation.navigate('ChatDetail', { userId: targetUserId });
  };

  const acceptDateProposal = async (item) => {
    setActionLoadingId(item.id);
    setExpandedIds(prev => ({ ...prev, [item.id]: false }));
    setRequests(prev => sortRequestsList(prev.map(r => r.id === item.id ? { ...r, status: 'accepted' } : r)));
    try {
      await apiRespondDateProposal(item.booking_id, 'accepted');
      eventEmitter.emit(EVENTS.REQUEST_UPDATED);
    } catch (e) {
      console.warn('Accept date proposal error:', e?.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const declineDateProposal = async (item) => {
    setActionLoadingId(item.id);
    setExpandedIds(prev => ({ ...prev, [item.id]: false }));
    setRequests(prev => sortRequestsList(prev.map(r => r.id === item.id ? { ...r, status: 'declined' } : r)));
    try {
      await apiRespondDateProposal(item.booking_id, 'declined');
      eventEmitter.emit(EVENTS.REQUEST_UPDATED);
    } catch (e) {
      console.warn('Decline date proposal error:', e?.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingCount = useMemo(() => {
    return requests.filter(r => (r.status || r.request_status || 'pending') === 'pending').length;
  }, [requests]);

  const firstHandledIndex = useMemo(() => {
    return requests.findIndex(r => (r.status || r.request_status || 'pending') !== 'pending');
  }, [requests]);

  const renderAdmirer = ({ item, index }) => {
    const isBoosted = item.is_boosted;
    const isPending = item.status === 'pending';
    const isAccepted = item.status === 'accepted';
    const isDeclined = item.status === 'declined' || item.status === 'rejected';

    const showPendingHeader = index === 0 && item.status === 'pending';
    const showHandledHeader = index === firstHandledIndex && firstHandledIndex !== -1;

    let cardElement = null;

    if (item.type === 'declined_notification' || item.status === 'declined_by_other' || item.request_status === 'declined_by_other') {
      cardElement = (
        <SwipeableCard itemId={item.id} isSwiped={swipedCardId === item.id} onSwipe={setSwipedCardId} onDelete={() => unmatchAndRemove(item)}>
          <View style={[styles.cardStrip, { borderColor: 'rgba(255, 55, 95, 0.3)', backgroundColor: isDark ? 'rgba(255, 55, 95, 0.08)' : 'rgba(255, 55, 95, 0.04)' }]}>
            <View style={[StyleSheet.absoluteFill, { borderRadius: 22, overflow: 'hidden' }]}>
              <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
            </View>

            <TouchableOpacity onPress={() => openProfile(item)} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Image source={{ uri: item.image }} style={styles.stripAvatar} />

              <View style={[styles.stripInfo, { flex: 1, paddingRight: 8 }]}>
                <View style={styles.stripTitleRow}>
                  <Text style={styles.stripName} numberOfLines={1}>{item.display_name || item.name}</Text>
                  {renderVerifiedBadge(item.user || item, 14)}
                </View>

                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#FF375F', marginTop: 3 }} numberOfLines={2}>
                  {item.message || `${item.display_name || item.name} has declined your match request.`}
                </Text>
                <Text style={[styles.stripDateText, { marginTop: 2 }]}>
                  {item.dateSent || item.likedAt || 'Recently'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ padding: 10, borderRadius: 20, backgroundColor: 'rgba(255, 55, 95, 0.12)', marginLeft: 8 }}
              onPress={() => unmatchAndRemove(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color="#FF375F" />
            </TouchableOpacity>
          </View>
        </SwipeableCard>
      );
    } else if (item.type === 'date_proposal') {
      const restName = item.restaurant?.name || 'Romantic Restaurant';
      const restImg = item.restaurant?.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600';
      const isExpanded = !!expandedIds[item.id];

      cardElement = (
        <SwipeableCard itemId={item.id} isSwiped={swipedCardId === item.id} onSwipe={setSwipedCardId} onDelete={deleteNotification}>
          <View style={[styles.dateProposalCard, !isPending && styles.cardHandled]}>
            {/* Inner background clip for smooth rounded corners */}
            <View style={[StyleSheet.absoluteFill, { borderRadius: 24, overflow: 'hidden' }]}>
              <BlurView intensity={isDark ? 55 : 85} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
              <LinearGradient
                colors={item.status === 'pending' ? ['rgba(245, 158, 11, 0.15)', 'rgba(255, 0, 127, 0.15)'] : ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)']}
                style={StyleSheet.absoluteFill}
              />
            </View>

            {/* Top Proposal Badge Banner */}
            <TouchableOpacity
              style={styles.dateProposalHeader}
              onPress={() => toggleExpand(item.id)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <LinearGradient colors={['#F59E0B', '#FF007F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.dateProposalBadge}>
                  <Ionicons name="wine" size={11} color="#FFF" style={{ marginRight: 4 }} />
                  <Text style={styles.dateProposalBadgeTxt}>DATE PROPOSAL</Text>
                </LinearGradient>
                <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textPrimary, marginLeft: 8 }} numberOfLines={1}>
                  {item.display_name || item.name}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.dateProposalTime}>{item.dateSent}</Text>
                <Ionicons
                  name={isExpanded ? "chevron-up-circle" : "chevron-down-circle"}
                  size={22}
                  color={item.status === 'pending' ? "#FF007F" : theme.textFaint}
                />
              </View>
            </TouchableOpacity>

            {/* Body: Person & Restaurant Info */}
            {isExpanded && (
              <View style={styles.dateProposalBody}>
                <TouchableOpacity onPress={() => openProfile(item)} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 4 }}>
                  <Image source={{ uri: item.image }} style={styles.dateProposalUserAvatar} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.dateProposalUserTitle}>
                      {item.is_outgoing ? `You proposed a date to ${item.display_name || item.name}` : `${item.display_name || item.name} invited you on a date!`}
                    </Text>
                    <Text style={styles.dateProposalSub}>{item.job} · {item.compatibility}% Match</Text>
                  </View>
                </TouchableOpacity>

                {/* Restaurant Box */}
                <View style={styles.dateRestaurantBox}>
                  <Image source={{ uri: formatImageUrl(restImg) }} style={styles.dateRestaurantImg} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.dateRestaurantName} numberOfLines={1}>{restName}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <Ionicons name="calendar-outline" size={12} color="#FF007F" style={{ marginRight: 4 }} />
                      <Text style={styles.dateDetailsTxt}>{item.booking_date} at {item.booking_time}</Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons / Status */}
                <View style={[styles.dateProposalFooter, { marginTop: 10 }]}>
                  {isAccepted ? (
                    <View style={styles.dateAcceptedPill}>
                      <Ionicons name="checkmark-circle" size={16} color="#30D158" style={{ marginRight: 6 }} />
                      <Text style={styles.dateAcceptedPillTxt}>Date Proposal Accepted!</Text>
                    </View>
                  ) : isDeclined ? (
                    <View style={styles.dateDeclinedPill}>
                      <Ionicons name="close-circle" size={16} color="#FF375F" style={{ marginRight: 6 }} />
                      <Text style={styles.dateDeclinedPillTxt}>Date Proposal Declined</Text>
                    </View>
                  ) : item.is_outgoing ? (
                    <View style={styles.datePendingPill}>
                      <Ionicons name="time-outline" size={14} color="#F59E0B" style={{ marginRight: 6 }} />
                      <Text style={styles.datePendingPillTxt}>Waiting for {item.display_name || item.name}'s response...</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 10, flex: 1, marginTop: 4 }}>
                      <TouchableOpacity style={styles.dateDeclineBtn} onPress={() => declineDateProposal(item)} disabled={actionLoadingId === item.id}>
                        {actionLoadingId === item.id ? (
                          <ActivityIndicator size="small" color="#FF375F" />
                        ) : (
                          <>
                            <Ionicons name="close-circle" size={15} color="#FF375F" style={{ marginRight: 4 }} />
                            <Text style={styles.dateDeclineBtnTxt}>Decline</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.dateAcceptBtn} onPress={() => acceptDateProposal(item)} disabled={actionLoadingId === item.id}>
                        <LinearGradient colors={['#30D158', '#10B981']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.dateAcceptGrad}>
                          {actionLoadingId === item.id ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <>
                              <Ionicons name="checkmark-circle" size={15} color="#FFF" style={{ marginRight: 4 }} />
                              <Text style={styles.dateAcceptBtnTxt}>Accept Date 🥂</Text>
                            </>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        </SwipeableCard>
      );
    } else {
      cardElement = (
        <SwipeableCard itemId={item.id} isSwiped={swipedCardId === item.id} onSwipe={setSwipedCardId} onDelete={deleteNotification}>
          <View
            style={[styles.cardStrip, isBoosted && styles.cardStripBoosted, !isPending && styles.cardHandled]}
          >
            {/* Inner background clip for smooth rounded corners */}
            <View style={[StyleSheet.absoluteFill, { borderRadius: 22, overflow: 'hidden' }]}>
              <BlurView
                intensity={isDark ? 40 : 60}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
              {isBoosted && (
                <LinearGradient
                  colors={['rgba(167, 139, 250, 0.25)', 'rgba(244, 114, 182, 0.25)']}
                  style={StyleSheet.absoluteFill}
                />
              )}
            </View>

            {/* Pressable avatar + info area to open profile */}
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
              onPress={() => openProfile(item)}
              activeOpacity={0.85}
            >
              {/* Asymmetric smaller avatar */}
              <Image source={{ uri: item.image }} style={[styles.stripAvatar, isBoosted && styles.stripAvatarBoosted]} />

              <View style={styles.stripInfo}>
                <View style={styles.stripTitleRow}>
                  <Text style={styles.stripName} numberOfLines={1}>{item.display_name || item.name}</Text>
                  {renderVerifiedBadge(item.user || item, 14)}
                  {isBoosted && (
                    <View style={styles.boostPillTag}>
                      <Ionicons name="flash" size={8} color="#FFF" style={{ marginRight: 2 }} />
                      <Text style={styles.boostPillTxt}>BOOSTED</Text>
                    </View>
                  )}
                </View>

                {/* Match % & Date Sent inline row - no overlap */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                  <View style={[styles.inlineCompatPill, isBoosted && styles.inlineCompatPillBoosted]}>
                    <Ionicons name={isBoosted ? "flash" : "heart"} size={8} color={isBoosted ? "#FFD700" : "#FF007F"} />
                    <Text style={[styles.inlineCompatText, isBoosted && { color: theme.textPrimary }]}>
                      {item.compatibility}% Match
                    </Text>
                  </View>
                  <Text style={styles.stripDateText} numberOfLines={1}>
                    · {item.dateSent || item.likedAt || 'Recently'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.stripActions}>
              {isAccepted ? (
                <View style={styles.acceptedPill}>
                  <Ionicons name="checkmark-circle" size={14} color="#30D158" style={{ marginRight: 4 }} />
                  <Text style={styles.acceptedPillTxt}>Accepted</Text>
                </View>
              ) : isDeclined ? (
                <View style={styles.declinedPill}>
                  <Ionicons name="close-circle" size={14} color="#8E8E93" style={{ marginRight: 4 }} />
                  <Text style={styles.declinedPillTxt}>Declined</Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity style={styles.stripDecline} onPress={() => decline(item.id)} disabled={actionLoadingId === item.id}>
                    {actionLoadingId === item.id ? (
                      <ActivityIndicator size="small" color={theme.textSec} />
                    ) : (
                      <Ionicons name="close" size={16} color={theme.textSec} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.stripAccept} onPress={() => accept(item.id)} disabled={actionLoadingId === item.id}>
                    <LinearGradient
                      colors={isBoosted ? ['#8B5CF6', '#D946EF'] : theme.gradientAccent}
                      style={styles.stripAcceptGrad}
                    >
                      {actionLoadingId === item.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </SwipeableCard>
      );
    }

    return (
      <View key={item.id}>
        {showPendingHeader && (
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="time-outline" size={14} color="#F59E0B" style={{ marginRight: 6 }} />
            <Text style={styles.listSectionTitle}>PENDING REQUESTS ({pendingCount})</Text>
          </View>
        )}
        {showHandledHeader && (
          <View style={[styles.sectionHeaderRow, { marginTop: 16 }]}>
            <Ionicons name="checkmark-done-circle-outline" size={16} color="#30D158" style={{ marginRight: 6 }} />
            <Text style={styles.listSectionTitle}>Accepted({requests.length - pendingCount})</Text>
          </View>
        )}
        {cardElement}
      </View>
    );
  };

  const renderHeader = () => (
    <View />
  );

  return (
    <LinearGradient colors={theme.bgGrad} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Glowing background depth blobs */}
      <View style={styles.glowBlobCyan} pointerEvents="none" />
      <View style={styles.glowBlobPurple} pointerEvents="none" />

      <SafeAreaView style={styles.flex}>
        {/* Header navigation bar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.sub}>{requests.length} notifications</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'Discover' })} style={styles.bellBtn} activeOpacity={0.75}>
            <Ionicons name="notifications" size={20} color="#FF007F" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="large" color="#FF007F" />
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyCard}>
              <Ionicons name="heart-half-outline" size={60} color={theme.textFaint} />
              <Text style={styles.emptyTitle}>Empty space</Text>
              <Text style={styles.emptySub}>When someone sends you cosmic likes, they'll appear here</Text>
            </View>
          </View>
        ) : (
          <Pressable style={{ flex: 1 }} onPress={() => { if (swipedCardId) setSwipedCardId(null); }}>
            <FlatList
              data={requests}
              renderItem={renderAdmirer}
              keyExtractor={i => i.id}
              ListHeaderComponent={renderHeader}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              onScrollBeginDrag={() => { if (swipedCardId) setSwipedCardId(null); }}
            />
          </Pressable>
        )}
      </SafeAreaView>

      {/* Details slide-up sheet */}
      <ProfileDetail
        visible={detailVisible}
        profile={selectedProfile}
        onClose={() => {
          setDetailVisible(false);
          setSelectedProfile(null);
        }}
        onLike={selectedProfile?.status === 'accepted' ? () => {
          const p = selectedProfile;
          setDetailVisible(false);
          setSelectedProfile(null);
          openChatForProfile(p);
        } : (id) => accept(id)}
        onPass={selectedProfile?.status === 'accepted' ? () => {
          const p = selectedProfile;
          setDetailVisible(false);
          setSelectedProfile(null);
          unmatchAndRemove(p);
        } : (id) => decline(id)}
        isMatch={selectedProfile?.status === 'accepted'}
      />

      <MatchModal
        visible={matchModalVisible}
        currentUser={user}
        matchedUser={acceptedMatchedUser}
        onClose={() => setMatchModalVisible(false)}
        onSendMessage={(targetUser) => {
          setMatchModalVisible(false);
          navigation.navigate('ChatDetail', {
            match: {
              id: targetUser.id,
              user_id: targetUser.id,
              name: targetUser.name,
              avatar: targetUser.image || targetUser.avatar,
            },
          });
        }}
      />
    </LinearGradient>
  );
}

const getStyles = (theme, isDark) => StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, position: 'relative' },

  // Glowing fader blobs
  glowBlobCyan: {
    position: 'absolute',
    top: height * 0.08,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(0, 191, 255, 0.16)',
    opacity: 0.7,
    zIndex: 0,
  },
  glowBlobPurple: {
    position: 'absolute',
    bottom: height * 0.18,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(123, 47, 190, 0.20)',
    opacity: 0.8,
    zIndex: 0,
  },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 14 : 14,
    paddingBottom: 16,
    zIndex: 10,
  },
  title: { fontSize: 28, fontWeight: '900', color: theme.textPrimary, letterSpacing: -0.6 },
  sub: { fontSize: 13, color: theme.textSec, marginTop: 3 },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.glass,
    justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  bellBadge: {
    position: 'absolute', top: -3, right: -3,
    backgroundColor: '#FF375F', borderRadius: 9,
    minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: isDark ? '#08080C' : '#fff',
  },
  bellBadgeText: { color: '#fff', fontSize: 8, fontWeight: '900' },

  list: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },

  // ── Boost Section at the Top ──────────────────────────────────────────
  boostSection: {
    marginBottom: 26,
  },
  boostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  boostHeaderIconGrad: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boostHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#A78BFA',
    letterSpacing: 1.2,
  },
  boostCard: {
    height: 230,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: theme.glass,
    position: 'relative',
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: isDark ? 0.35 : 0.15,
    shadowRadius: 14,
  },
  boostCardImg: { position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' },
  boostCardOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%' },
  boostCompatPill: {
    position: 'absolute', top: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.45)',
    borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 4,
    zIndex: 5,
  },
  boostCompatText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  boostDetails: { position: 'absolute', bottom: 20, left: 20 },
  boostName: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.2 },
  boostJob: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  boostTime: { fontSize: 11, color: '#A78BFA', fontWeight: '700', marginTop: 5 },
  boostActions: {
    position: 'absolute', bottom: 16, right: 16,
    flexDirection: 'row', gap: 10, alignItems: 'center',
  },
  boostDecline: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boostAccept: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden' },
  boostAcceptGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Standard List Section ──────────────────────────────────────────────
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  listSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.textSec,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cardStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.glass,
    borderRadius: 22,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'visible',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardStripBoosted: {
    borderColor: '#8B5CF6',
    borderWidth: 1.5,
    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.08)',
  },
  stripAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  stripAvatarBoosted: {
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  stripInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 6,
    justifyContent: 'center',
  },
  stripTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  stripName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: theme.textPrimary,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  boostPillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  boostPillTxt: {
    color: '#FFF',
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  stripDateText: {
    fontSize: 11,
    color: theme.textSec,
    fontWeight: '500',
  },
  inlineCompatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 0, 127, 0.10)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 127, 0.25)',
  },
  inlineCompatPillBoosted: {
    backgroundColor: 'rgba(139, 92, 246, 0.20)',
    borderColor: 'rgba(139, 92, 246, 0.45)',
  },
  inlineCompatText: {
    color: '#FF007F',
    fontSize: 9,
    fontWeight: '800',
  },
  stripCompatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 55, 95, 0.10)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  stripCompatBadgeBoosted: {
    backgroundColor: 'rgba(139, 92, 246, 0.20)',
  },
  stripCompatText: {
    color: '#FF375F',
    fontSize: 8.5,
    fontWeight: '800',
  },
  stripActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexShrink: 0,
  },
  acceptedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.3)',
  },
  acceptedPillTxt: {
    color: '#30D158',
    fontSize: 11,
    fontWeight: '800',
  },
  declinedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.3)',
  },
  declinedPillTxt: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '800',
  },
  stripDecline: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stripAccept: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  stripAcceptGrad: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty State
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

  // Date Proposal Card Styles
  dateProposalCard: {
    backgroundColor: theme.glass,
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    overflow: 'visible',
    position: 'relative',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDark ? 0.35 : 0.15,
    shadowRadius: 10,
  },
  dateProposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateProposalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateProposalBadgeTxt: {
    color: '#FFF',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dateProposalTime: {
    fontSize: 11,
    color: theme.textSec,
    fontWeight: '600',
  },
  dateProposalBody: {
    marginBottom: 10,
  },
  dateProposalUserAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#FF007F',
  },
  dateProposalUserTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  dateProposalSub: {
    fontSize: 11.5,
    color: theme.textSec,
    marginTop: 2,
  },
  dateRestaurantBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  dateRestaurantImg: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  dateRestaurantName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  dateDetailsTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF007F',
  },
  dateProposalFooter: {
    marginTop: 6,
  },
  dateAcceptedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    borderWidth: 1,
    borderColor: '#30D158',
  },
  dateAcceptedPillTxt: {
    color: '#30D158',
    fontSize: 12.5,
    fontWeight: '800',
  },
  dateDeclinedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 55, 95, 0.12)',
    borderWidth: 1,
    borderColor: '#FF375F',
  },
  dateDeclinedPillTxt: {
    color: '#FF375F',
    fontSize: 12.5,
    fontWeight: '800',
  },
  datePendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  datePendingPillTxt: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
  },
  dateDeclineBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 55, 95, 0.12)',
    borderWidth: 1,
    borderColor: '#FF375F',
  },
  dateDeclineBtnTxt: {
    color: '#FF375F',
    fontSize: 12.5,
    fontWeight: '800',
  },
  dateAcceptBtn: {
    flex: 1.4,
    borderRadius: 14,
    overflow: 'hidden',
  },
  dateAcceptGrad: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  dateAcceptBtnTxt: {
    color: '#FFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
});