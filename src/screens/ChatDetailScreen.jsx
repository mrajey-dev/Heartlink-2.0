import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Dimensions,
  Modal,
  Animated,
  ActivityIndicator,
  Keyboard,
  AppState,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { renderVerifiedBadge } from '../utils/helpers';
import ProfileDetail from '../components/discovery/ProfileDetail';
import { getEcho } from '../services/echo';
import {
  apiSendMessage,
  apiReactMessage,
  apiBlockUser,
  apiUnblockUser,
  apiReportUser,
  apiGetMessages,
  apiDeleteMessage,
  apiClearChat,
  apiUploadImage,
} from '../services/api';
import { ensureArray, formatImageUrl, parseMessageContent } from '../utils/helpers';
import { eventEmitter, EVENTS } from '../utils/eventEmitter';
import { useAuth } from '../hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

const formatMessageDateHeader = (dateObj) => {
  if (!dateObj || isNaN(dateObj.getTime())) return null;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateObj.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (dateObj.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
};

const DEFAULT_USER = {
  id: null,
  name: 'Match User',
  age: 24,
  job: 'Member',
  location: 'Nearby',
  bio: 'Connected on HeartLink.',
  image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
  online: true,
  compatibility: 85,
  distance: '3 km away',
  interests: ['Travel', 'Music', 'Photography'],
};

const REPORT_REASONS = [
  'Inappropriate or offensive messages',
  'Spam or fake profile',
  'Harassment or unwanted behavior',
  'Scam or commercial activity',
  'Other reason',
];

const EMOJI_CATEGORIES = [
  {
    name: 'Love',
    icon: '❤️',
    emojis: ['❤️', '💕', '✨', '😍', '🔥', '😘', '💖', '🥰', '🌹', '💫', '🥂', '💘', '💗', '💓', '👩‍❤️‍👨', '💋'],
  },
  {
    name: 'Vibes',
    icon: '😂',
    emojis: ['😂', '😊', '🙈', '😜', '🙌', '😎', '🤩', '💃', '🕺', '🥳', '🎉', '💯', '😇', '😋', '👻', '🥳'],
  },
  {
    name: 'Hearts',
    icon: '🫶',
    emojis: ['👍', '🙏', '🫶', '✌️', '🤝', '💜', '💙', '💚', '💛', '🤍', '💝', '💖', '❤️‍🔥', '👏', '👌', '⚡'],
  },
  {
    name: 'Life',
    icon: '☕',
    emojis: ['☕', '🍕', '🍦', '🍷', '🎵', '✈️', '🌟', '🎈', '🌸', '🌈', '🌙', '💌', '🍾', '🍿', '🎸', '🏖️'],
  },
];



const SAMPLE_MESSAGES = [];

// How close to the bottom (in px) counts as "already at the bottom"
const NEAR_BOTTOM_THRESHOLD = 120;

// Lightweight equality check — compares text, reactions, read status & replies
const messagesAreEqual = (a, b) => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.isRead !== y.isRead ||
      x.text !== y.text ||
      x.reaction !== y.reaction ||
      x.replyToText !== y.replyToText ||
      x.replyToSender !== y.replyToSender
    ) {
      return false;
    }
  }
  return true;
};

const REACTION_EMOJIS = ['❤️'];

// Memoized message bubble with PanResponder Swipe-to-Reply, Double-Tap & Long-Press reaction bar
const MessageBubble = React.memo(function MessageBubble({
  item,
  theme,
  styles,
  avatarUri,
  onAvatarPress,
  onReact,
  onDeleteMsg,
  activeReactionMsgId,
  onOpenReactionMenu,
  onCloseReactionMenu,
  onReplyMessage,
  onScrollToReplyOriginal,
  isHighlighted,
  onImagePress,
}) {
  const isMe = item.sender === 'me';
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(10)).current;
  const heartPop = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef(0);

  const isMenuOpen = activeReactionMsgId === item.id;
  const highlightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isHighlighted) {
      Animated.sequence([
        Animated.timing(highlightAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: false,
        }),
        Animated.delay(1200),
        Animated.timing(highlightAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      highlightAnim.setValue(0);
    }
  }, [isHighlighted, highlightAnim]);

  const highlightBgColor = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      'rgba(0, 0, 0, 0)',
      theme.isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 0, 127, 0.16)',
    ],
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 12 && Math.abs(gestureState.dy) < 12;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          translateX.setValue(Math.min(gestureState.dx, 75));
        } else {
          translateX.setValue(Math.max(gestureState.dx, -75));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 35 && onReplyMessage) {
          onReplyMessage(item);
        }
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 7,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(rise, {
        toValue: 0,
        useNativeDriver: true,
        damping: 16,
        mass: 0.6,
        stiffness: 180,
      }),
    ]).start();
  }, []);

  const handleBubblePress = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Instagram style double-tap: react with Heart ❤️
      onReact(item.id, '❤️');
      heartPop.setValue(0);
      Animated.sequence([
        Animated.spring(heartPop, { toValue: 1.4, friction: 3, useNativeDriver: true }),
        Animated.timing(heartPop, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    } else {
      if (isMenuOpen) onCloseReactionMenu();
    }
    lastTapRef.current = now;
  };

  const handleLongPress = () => {
    onOpenReactionMenu(item.id);
  };

  return (
    <Animated.View
      style={[
        styles.msgContainer,
        isMe && styles.msgContainerMe,
        isMenuOpen && { zIndex: 10000, elevation: 10000 },
        { backgroundColor: highlightBgColor, borderRadius: 18, paddingHorizontal: 6, paddingVertical: 2 },
      ]}
    >
      {/* Like button — long press shows ❤️ like + delete only */}
      {isMenuOpen && (
        <View style={[styles.reactionBarPill, isMe ? styles.reactionBarMe : styles.reactionBarOther]}>
          {/* Single heart like button */}
          <TouchableOpacity
            style={[
              styles.reactionEmojiBtn,
              item.reaction === '❤️' && styles.reactionEmojiBtnSelected,
              { paddingHorizontal: 14, paddingVertical: 6 },
            ]}
            onPress={() => {
              onReact(item.id, '❤️');
              onCloseReactionMenu();
            }}
            activeOpacity={0.6}
          >
            <Text style={[styles.reactionEmojiText, { fontSize: 26 }]}>❤️</Text>
            {item.reaction === '❤️' && (
              <Text style={styles.likedLabel}>Liked</Text>
            )}
          </TouchableOpacity>

          {/* Delete button */}
          <TouchableOpacity
            style={styles.reactionTrashBtn}
            onPress={() => {
              onDeleteMsg(item.id);
              onCloseReactionMenu();
            }}
            activeOpacity={0.6}
          >
            <Ionicons name="trash-outline" size={17} color="#FF375F" />
          </TouchableOpacity>
        </View>
      )}

      {/* Heart Pop Overlay for Double-Tap */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.doubleTapHeartWrap,
          {
            opacity: heartPop,
            transform: [{ scale: heartPop }],
          },
        ]}
      >
        <Text style={{ fontSize: 38 }}>❤️</Text>
      </Animated.View>

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.msgRow,
          isMe && styles.msgRowMe,
          { opacity: fade, transform: [{ translateY: rise }, { translateX }] },
        ]}
      >
        {!isMe && (
          <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.8}>
            <Image source={{ uri: avatarUri }} style={styles.msgAvatar} />
          </TouchableOpacity>
        )}

        <View style={styles.bubbleWrapper}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleBubblePress}
            onLongPress={handleLongPress}
            delayLongPress={300}
          >
            {isMe ? (
              <LinearGradient
                colors={theme.gradientAccent}
                style={[styles.bubble, styles.bubbleMe]}
              >
                {!!(item.replyToText || item.reply_to_text) && (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={(e) => {
                      if (e && e.stopPropagation) e.stopPropagation();
                      if (onScrollToReplyOriginal) {
                        onScrollToReplyOriginal(item.replyToId || item.reply_to_id, item.replyToText || item.reply_to_text);
                      }
                    }}
                    style={[styles.replyQuoteBox, styles.replyQuoteBoxMe]}
                  >
                    <View style={styles.replyQuoteBar} />
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <Text style={[styles.replyQuoteSender, styles.replyQuoteSenderMe]} numberOfLines={1}>
                        {item.replyToSender || item.reply_to_sender || 'Replying'}
                      </Text>
                      <Text style={[styles.replyQuoteText, styles.replyQuoteTextMe]} numberOfLines={2}>
                        {item.replyToText || item.reply_to_text}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Render attached image if present */}
                {Boolean(item.imageUrl) && (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => onImagePress && onImagePress(item.imageUrl)}
                    style={styles.bubbleImageContainer}
                  >
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.bubbleImage}
                      resizeMode="cover"
                    />
                    <View style={styles.bubbleImageExpandBadge}>
                      <Ionicons name="expand-outline" size={13} color="#FFF" />
                    </View>
                  </TouchableOpacity>
                )}

                {Boolean(item.text) && (
                  <Text style={styles.bubbleTextMe}>{item.text}</Text>
                )}

                <View style={styles.timeRowMe}>
                  <Text style={styles.bubbleTimeMe}>{item.time}</Text>
                  <Ionicons
                    name={item.isRead ? 'checkmark-done' : 'checkmark'}
                    size={13}
                    color={item.isRead ? '#00E5FF' : 'rgba(255,255,255,0.7)'}
                    style={{ marginLeft: 4 }}
                  />
                </View>
              </LinearGradient>
            ) : (
              <View style={[styles.bubble, styles.bubbleOther]}>
                {!!(item.replyToText || item.reply_to_text) && (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={(e) => {
                      if (e && e.stopPropagation) e.stopPropagation();
                      if (onScrollToReplyOriginal) {
                        onScrollToReplyOriginal(item.replyToId || item.reply_to_id, item.replyToText || item.reply_to_text);
                      }
                    }}
                    style={[styles.replyQuoteBox, styles.replyQuoteBoxOther]}
                  >
                    <View style={styles.replyQuoteBar} />
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <Text style={[styles.replyQuoteSender, styles.replyQuoteSenderOther]} numberOfLines={1}>
                        {item.replyToSender || item.reply_to_sender || 'Replying'}
                      </Text>
                      <Text style={[styles.replyQuoteText, styles.replyQuoteTextOther]} numberOfLines={2}>
                        {item.replyToText || item.reply_to_text}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Render attached image if present */}
                {Boolean(item.imageUrl) && (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => onImagePress && onImagePress(item.imageUrl)}
                    style={styles.bubbleImageContainer}
                  >
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.bubbleImage}
                      resizeMode="cover"
                    />
                    <View style={styles.bubbleImageExpandBadge}>
                      <Ionicons name="expand-outline" size={13} color="#FFF" />
                    </View>
                  </TouchableOpacity>
                )}

                {Boolean(item.text) && (
                  <Text style={styles.bubbleTextOther}>{item.text}</Text>
                )}

                <Text style={styles.bubbleTimeOther}>{item.time}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Reaction Badge on Message Corner */}
          {!!item.reaction && (
            <TouchableOpacity
              style={[styles.reactionBadge, isMe ? styles.reactionBadgeMe : styles.reactionBadgeOther]}
              onPress={() => onReact(item.id, item.reaction)}
              activeOpacity={0.7}
            >
              <Text style={styles.reactionBadgeText}>{item.reaction}</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
});

export default function ChatDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showClearChatModal, setShowClearChatModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState(0);

  // Reply message state
  const [replyingTo, setReplyingTo] = useState(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState(null);

  // Male free message limit state
  const [freeMessagesLeft, setFreeMessagesLeft] = useState(null);
  const [isMaleUser, setIsMaleUser] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);




  const handleAddEmoji = (emoji) => {
    if (input.length >= 2000) return;
    setInput((prev) => (prev + emoji).slice(0, 2000));
  };

  // Custom toast notification state
  const [toastText, setToastText] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        triggerCustomToast('Photo library permission is required to send images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setSelectedImage(result.assets[0].uri);
        setTimeout(() => scrollToBottom(true), 100);
      }
    } catch (err) {
      console.warn('Pick image error:', err);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        triggerCustomToast('Camera permission is required to take photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setSelectedImage(result.assets[0].uri);
        setTimeout(() => scrollToBottom(true), 100);
      }
    } catch (err) {
      console.warn('Take photo error:', err);
    }
  };

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  // --- Scroll tracking -----------------------------------------------
  const isNearBottomRef = useRef(true);
  const currentScrollYRef = useRef(0);
  const listContentHeightRef = useRef(0);
  const listLayoutHeightRef = useRef(0);
  const prevMessageCountRef = useRef(0);
  const prevLastMessageIdRef = useRef(null);

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const handleScroll = useCallback((e) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    currentScrollYRef.current = contentOffset.y;
    listContentHeightRef.current = contentSize.height;
    listLayoutHeightRef.current = layoutMeasurement.height;
    const distanceFromBottom =
      contentSize.height - contentOffset.y - layoutMeasurement.height;
    const nearBottom = distanceFromBottom < NEAR_BOTTOM_THRESHOLD;
    isNearBottomRef.current = nearBottom;
    setShowJumpToBottom((prev) => (prev === !nearBottom ? prev : !nearBottom));
  }, []);

  const handleContentSizeChange = useCallback((w, h) => {
    if (isNearBottomRef.current && h > listLayoutHeightRef.current) {
      scrollToBottom(true);
    }
  }, [scrollToBottom]);

  // Dynamic state for active chat recipient user details
  const [activeUser, setActiveUser] = useState(() => {
    if (route.params?.user) {
      const u = route.params.user;
      return {
        ...DEFAULT_USER,
        ...u,
        display_name: u.display_name || u.name,
        is_verified: u.is_verified || u.isVerified,
        isVerified: u.is_verified || u.isVerified,
        user: u,
      };
    }
    if (route.params?.name) {
      return {
        ...DEFAULT_USER,
        name: route.params.name,
        display_name: route.params.display_name || route.params.name,
        image: route.params.image || DEFAULT_USER.image,
      };
    }
    return DEFAULT_USER;
  });

  useEffect(() => {
    if (route.params?.user) {
      const u = route.params.user;
      setActiveUser((prev) => ({
        ...prev,
        ...u,
        display_name: u.display_name || u.name || prev.display_name,
        is_verified: u.is_verified !== undefined ? u.is_verified : (u.isVerified !== undefined ? u.isVerified : prev.is_verified),
        isVerified: u.is_verified !== undefined ? u.is_verified : (u.isVerified !== undefined ? u.isVerified : prev.isVerified),
        user: u,
      }));
    } else if (route.params?.name) {
      setActiveUser((prev) => ({
        ...prev,
        name: route.params.name,
        display_name: route.params.display_name || route.params.name || prev.display_name,
        image: route.params.image || prev.image,
      }));
    }
  }, [route.params]);

  const [isOtherTyping, setIsOtherTyping] = useState(false);

  // Animated dots for typing bubble
  const typingDot1 = useRef(new Animated.Value(0.3)).current;
  const typingDot2 = useRef(new Animated.Value(0.3)).current;
  const typingDot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    let anim;
    if (isOtherTyping) {
      const createDotAnim = (dotVal, delay) => {
        return Animated.sequence([
          Animated.delay(delay),
          Animated.loop(
            Animated.sequence([
              Animated.timing(dotVal, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(dotVal, {
                toValue: 0.3,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.delay(300),
            ])
          ),
        ]);
      };
      anim = Animated.parallel([
        createDotAnim(typingDot1, 0),
        createDotAnim(typingDot2, 150),
        createDotAnim(typingDot3, 300),
      ]);
      anim.start();
      if (isNearBottomRef.current) {
        scrollToBottom(true);
      }
    }
    return () => anim && anim.stop();
  }, [isOtherTyping, scrollToBottom]);

  const { user: currentUser } = useAuth();

  const targetId = useMemo(() => {
    return route.params?.userId || route.params?.user?.id || activeUser?.id;
  }, [route.params, activeUser]);

  const isCurrentUserSupport = useMemo(() => {
    return currentUser?.id === 16 || currentUser?.id === '16';
  }, [currentUser]);

  const isTargetSupport = useMemo(() => {
    return (
      targetId === 16 ||
      targetId === '16' ||
      targetId === 'support' ||
      activeUser?.id === 16 ||
      activeUser?.id === '16' ||
      activeUser?.id === 'support' ||
      activeUser?.is_support === true
    );
  }, [targetId, activeUser]);

  const isSupportChat = isTargetSupport && !isCurrentUserSupport;
  const resolvedTargetId = isTargetSupport ? 16 : targetId;

  const fetchHistory = useCallback(
    async (isFirst = false) => {
      if (isFirst) setIsLoading(true);

      const actualId = isTargetSupport ? 16 : targetId;

      if (!actualId) {
        if (isFirst) {
          setMessages(SAMPLE_MESSAGES);
          prevMessageCountRef.current = SAMPLE_MESSAGES.length;
          prevLastMessageIdRef.current =
            SAMPLE_MESSAGES[SAMPLE_MESSAGES.length - 1]?.id ?? null;
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await apiGetMessages(actualId);
        if (response?.is_blocked_by_me) {
          setIsBlocked(true);
        }

        if (response?.free_messages_left !== undefined && !isSupportChat && !isCurrentUserSupport) {
          setFreeMessagesLeft(response.free_messages_left);
        } else if (isSupportChat || isCurrentUserSupport) {
          setFreeMessagesLeft(null);
        }

        if (response?.is_male !== undefined) {
          setIsMaleUser(Boolean(response.is_male));
        }
        if (response?.is_premium !== undefined) {
          setIsPremiumUser(Boolean(response.is_premium));
        }

        const recipientObj =
          response?.other_user || response?.user || response?.recipient;
        if (recipientObj && recipientObj.name) {
          const rawAvatar = recipientObj.avatar || (recipientObj.photos && recipientObj.photos[0]?.photo_url) || '';
          const rawPhotos = ensureArray(recipientObj.photos?.map(p => (typeof p === 'string' ? p : (p ? (p.photo_url || p.uri) : null))).filter(Boolean));
          if (recipientObj.avatar && !rawPhotos.includes(recipientObj.avatar)) rawPhotos.unshift(recipientObj.avatar);
          const formattedPhotos = rawPhotos.map(p => formatImageUrl(p)).filter(Boolean);

          setActiveUser((prev) => ({
            ...prev,
            id: recipientObj.id || prev.id,
            name: isSupportChat ? 'HeartLink Support' : (recipientObj.name || prev.name),
            display_name: isSupportChat ? 'HeartLink Support' : (recipientObj.display_name || recipientObj.name || prev.display_name || prev.name),
            is_verified: isSupportChat ? true : (recipientObj.is_verified !== undefined ? Boolean(recipientObj.is_verified) : (recipientObj.isVerified !== undefined ? Boolean(recipientObj.isVerified) : prev.is_verified)),
            isVerified: isSupportChat ? true : (recipientObj.is_verified !== undefined ? Boolean(recipientObj.is_verified) : (recipientObj.isVerified !== undefined ? Boolean(recipientObj.isVerified) : prev.isVerified)),
            is_support: isSupportChat || Boolean(recipientObj.is_support),
            subscription_plan: isSupportChat ? 'Official Support' : (recipientObj.subscription_plan || prev.subscription_plan),
            age: isSupportChat ? null : (recipientObj.age || prev.age || 24),
            job: isSupportChat ? 'Customer Support & Safety Team' : (recipientObj.job || prev.job || 'Member'),
            bio: isSupportChat ? 'Official 24/7 HeartLink Support. Available round-the-clock to help you with account verification, subscriptions, profile safety, date planner queries, and technical assistance.' : (recipientObj.bio || prev.bio || 'Connected on HeartLink.'),
            city: isSupportChat ? 'Official Support' : (recipientObj.city || prev.city || 'Nearby'),
            location: isSupportChat ? 'HeartLink Official HQ' : (recipientObj.city ? `${recipientObj.city}${recipientObj.state ? ', ' + recipientObj.state : ''}` : ((prev.location && prev.location !== 'Nearby') ? prev.location : 'Nearby')),
            distance: isSupportChat ? 'Online 24/7' : (prev.distance || 'Recently matched'),
            compatibility: isSupportChat ? 100 : (recipientObj.compatibility_score || prev.compatibility || 90),
            image: formatImageUrl(rawAvatar) || prev.image,
            images: formattedPhotos.length > 0 ? formattedPhotos : [formatImageUrl(rawAvatar) || prev.image],
            interests: isSupportChat ? ['Customer Care', 'Safety & Security', 'Verification Help', '24/7 Support'] : ensureArray(recipientObj.interests, prev.interests || ['Travel', 'Music', 'Photography']),
            online: isSupportChat ? true : (recipientObj.is_online !== undefined ? Boolean(recipientObj.is_online) : (recipientObj.online !== undefined ? recipientObj.online : prev.online)),
            user: recipientObj,
          }));
        }

        let messagesData = [];
        if (response && response.data) messagesData = response.data;
        else if (response && response.messages) messagesData = response.messages;
        else if (Array.isArray(response)) messagesData = response;
        else if (response && response.success && response.data)
          messagesData = response.data;

        if (Array.isArray(messagesData) && messagesData.length > 0) {
          let lastDateHeader = null;
          const formatted = messagesData.map((m) => {
            const rawContent = m.message || m.text || m.content || '';
            const { text: cleanText, imageUrl } = parseMessageContent(rawContent);

            const dateObj = m.created_at ? new Date(m.created_at) : new Date();
            const dateHeader = formatMessageDateHeader(dateObj);
            let showDateHeader = false;
            if (dateHeader && dateHeader !== lastDateHeader) {
              showDateHeader = true;
              lastDateHeader = dateHeader;
            }

            let reactionVal = m.reaction || null;
            if (!reactionVal) {
              if (m.sender_reaction && m.receiver_reaction) {
                reactionVal = `${m.sender_reaction} ${m.receiver_reaction}`;
              } else if (m.sender_reaction) {
                reactionVal = m.sender_reaction;
              } else if (m.receiver_reaction) {
                reactionVal = m.receiver_reaction;
              }
            }

            return {
              id: m.id?.toString() || Date.now().toString(),
              text: cleanText,
              imageUrl: imageUrl || m.image_url || null,
              sender: m.sender_id == actualId ? 'other' : 'me',
              time: m.created_at
                ? new Date(m.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                : 'Now',
              dateHeader: showDateHeader ? dateHeader : null,
              isRead: Boolean(m.is_read),
              created_at: m.created_at,
              reaction: reactionVal,
              replyToText: m.reply_to_text || m.replyToText || null,
              replyToSender: m.reply_to_sender || m.replyToSender || null,
              replyToId: m.reply_to_id || m.replyToId || null,
            };
          });

          const newLastId = formatted[formatted.length - 1]?.id ?? null;
          const hasNewMessage =
            formatted.length !== prevMessageCountRef.current ||
            newLastId !== prevLastMessageIdRef.current;

          // Only update if messages are different to avoid re-renders
          if (!messagesAreEqual(messages, formatted)) {
            setMessages(formatted);
          }

          // Only scroll if it's the first load OR we're near bottom AND there's a new message
          if (!isFirst && hasNewMessage && isNearBottomRef.current) {
            requestAnimationFrame(() => {
              scrollToBottom(true);
            });
          }

          prevMessageCountRef.current = formatted.length;
          prevLastMessageIdRef.current = newLastId;
        } else if (isFirst) {
          if (isSupportChat) {
            const initialSupportMsg = {
              id: 'support-welcome-1',
              text: '👋 Welcome to HeartLink Customer Support! How can we assist you today? Feel free to ask about verification, subscriptions, profile safety, or report any issue.',
              sender: 'other',
              time: 'Now',
              dateHeader: 'Today',
              isRead: true,
              created_at: new Date().toISOString(),
            };
            setMessages([initialSupportMsg]);
            prevMessageCountRef.current = 1;
            prevLastMessageIdRef.current = initialSupportMsg.id;
          } else {
            setMessages(SAMPLE_MESSAGES);
            prevMessageCountRef.current = SAMPLE_MESSAGES.length;
            prevLastMessageIdRef.current =
              SAMPLE_MESSAGES[SAMPLE_MESSAGES.length - 1]?.id ?? null;
          }
        }
      } catch (error) {
        console.log('Error fetching messages:', error);
        if (isFirst) {
          setMessages(SAMPLE_MESSAGES);
          prevMessageCountRef.current = SAMPLE_MESSAGES.length;
          prevLastMessageIdRef.current =
            SAMPLE_MESSAGES[SAMPLE_MESSAGES.length - 1]?.id ?? null;
        }
      } finally {
        if (isFirst) {
          setIsLoading(false);
        }
      }
    },
    [targetId, isTargetSupport, isSupportChat, isCurrentUserSupport, scrollToBottom]
  );

  // Connect Echo WebSockets & 2-Second Fast Polling on mount
  useEffect(() => {
    fetchHistory(true);

    // Fast 2-second background poll so all new messages & reactions appear instantly without page reload
    const pollTimer = setInterval(() => {
      fetchHistory(false);
    }, 2000);

    let echoSub = null;
    const currentUserId = resolvedTargetId || activeUser?.id || activeUser?.user?.id;

    getEcho().then((echo) => {
      if (echo && currentUserId && typeof echo.private === 'function') {
        try {
          console.log(`[ChatDetailScreen] Subscribing to Echo channel: chat.${currentUserId}`);
          echoSub = echo.private(`chat.${currentUserId}`);
          if (echoSub && typeof echoSub.listen === 'function') {
            echoSub.listen('.message.sent', (e) => {
              console.log('[ChatDetailScreen] Instant message.sent via Echo:', e);
              fetchHistory(false);
            });
          }
        } catch (err) {
          console.warn('[ChatDetailScreen Echo Error]:', err?.message);
        }
      }
    }).catch(() => { });

    const unsubChat = eventEmitter.on(EVENTS.CHAT_UPDATED, () => fetchHistory(false));

    return () => {
      clearInterval(pollTimer);
      unsubChat();
      if (echoSub) {
        try { echoSub.stopListening('.message.sent'); } catch (err) { }
      }
    };
  }, [fetchHistory, resolvedTargetId, activeUser?.id]);

  // Delete message handler
  const handleDeleteSingleMessage = useCallback(async (msgId) => {
    try {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      triggerCustomToast('Message deleted');
      await apiDeleteMessage(msgId);
      eventEmitter.emit(EVENTS.CHAT_UPDATED);
    } catch (e) {
      console.log('Error deleting message:', e);
    }
  }, []);

  // Clear chat handler
  const handleConfirmClearChat = async () => {
    setShowClearChatModal(false);
    try {
      setMessages([]);
      triggerCustomToast('Chat cleared');
      const actualId = isTargetSupport ? 16 : targetId;
      if (actualId) {
        await apiClearChat(actualId);
      }
      eventEmitter.emit(EVENTS.CHAT_UPDATED);
    } catch (e) {
      console.log('Error clearing chat:', e);
    }
  };

  // Auto scroll to latest message when keyboard pops up or closes
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      if (isNearBottomRef.current) {
        setTimeout(() => scrollToBottom(true), 100);
      }
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      if (isNearBottomRef.current) {
        setTimeout(() => scrollToBottom(false), 50);
      }
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToBottom]);

  // Custom Toast Trigger
  const triggerCustomToast = (msg) => {
    setToastText(msg);
    setToastVisible(true);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.delay(2600),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => setToastVisible(false));
  };



  const send = async () => {
    if (isBlocked) return;
    const textToSend = input.trim();
    const imageUri = selectedImage;
    if (!textToSend && !imageUri) return;
    if (isSending) return;

    if (textToSend.length > 2000) {
      triggerCustomToast('Message limit is 2000 characters');
      return;
    }

    if (!isSupportChat && !isCurrentUserSupport && isMaleUser && !isPremiumUser && freeMessagesLeft === 0) {
      triggerCustomToast('Free limit reached (5/5). Upgrade to Premium to keep chatting!');
      return;
    }

    setIsSending(true);

    const tempId = `temp-${Date.now()}`;
    const now = new Date();
    const dateHeader = formatMessageDateHeader(now);
    let showDateHeader = false;
    if (dateHeader && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const lastDate = lastMsg.created_at ? new Date(lastMsg.created_at) : null;
      const lastHeader = lastDate ? formatMessageDateHeader(lastDate) : null;
      if (lastHeader !== dateHeader) {
        showDateHeader = true;
      }
    } else if (dateHeader) {
      showDateHeader = true;
    }

    const extraData = replyingTo
      ? {
        reply_to_id: replyingTo.id,
        reply_to_text: replyingTo.text,
        reply_to_sender: replyingTo.senderName,
      }
      : {};

    const newMessage = {
      id: tempId,
      text: textToSend,
      imageUrl: imageUri || null,
      sender: 'me',
      time: now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      dateHeader: showDateHeader ? dateHeader : null,
      isRead: false,
      pending: true,
      created_at: now.toISOString(),
      replyToText: replyingTo?.text,
      replyToSender: replyingTo?.senderName,
    };

    setReplyingTo(null);
    setInput('');
    setSelectedImage(null);
    setMessages((p) => {
      const next = [...p, newMessage];
      prevMessageCountRef.current = next.length;
      prevLastMessageIdRef.current = newMessage.id;
      return next;
    });

    // Force scroll to bottom immediately after adding message
    isNearBottomRef.current = true;
    setShowJumpToBottom(false);

    requestAnimationFrame(() => {
      scrollToBottom(true);
    });

    const actualId = isTargetSupport ? 16 : targetId;

    if (actualId) {
      try {
        let finalPayloadText = textToSend;
        if (imageUri) {
          const uploadedUrl = await apiUploadImage(imageUri);
          if (uploadedUrl) {
            finalPayloadText = textToSend ? `[image]${uploadedUrl}[/image] ${textToSend}` : `[image]${uploadedUrl}[/image]`;
          } else {
            if (!textToSend) throw new Error('Image upload failed');
          }
        }

        // Send via API directly to User 16 or targeted user in backend DB
        const res = await apiSendMessage(actualId, finalPayloadText, extraData);
        if (res?.free_messages_left !== undefined && !isSupportChat && !isCurrentUserSupport) {
          setFreeMessagesLeft(res.free_messages_left);
        }

        eventEmitter.emit(EVENTS.CHAT_UPDATED);
        eventEmitter.emit(EVENTS.MESSAGE_SENT, {
          title: `Message Sent to ${activeUser?.display_name || activeUser?.name || 'User'}`,
          message: finalPayloadText,
          avatar: activeUser?.avatar || activeUser?.image,
          userId: actualId,
        });

        // Update with server response
        if (res && res.id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? { ...m, id: res.id.toString(), pending: false }
                : m
            )
          );
        } else if (res?.data && res.data.id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? { ...m, id: res.data.id.toString(), pending: false }
                : m
            )
          );
        }

        await fetchHistory(false);
        scrollToBottom(true);
      } catch (error) {
        console.log('Error sending message:', error);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        triggerCustomToast('Failed to send image or message');
      } finally {
        setIsSending(false);
      }
    } else {
      setIsSending(false);
    }
  };

  // Handle input change
  const handleInputChange = (text) => {
    setInput(text.slice(0, 2000));
  };

  // Input timeout ref
  const inputTimeout = useRef(null);

  // Spring-based press feedback for the send button — makes tapping feel
  // responsive instead of a flat opacity toggle.
  const sendScale = useRef(new Animated.Value(1)).current;
  const onSendPressIn = () => {
    Animated.spring(sendScale, {
      toValue: 0.88,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };
  const onSendPressOut = () => {
    Animated.spring(sendScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 24,
      bounciness: 9,
    }).start();
  };

  // Jump-to-bottom pill fades/scales in and out instead of hard-mounting,
  // so it doesn't pop abruptly when the scroll position crosses the
  // threshold.
  const jumpAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(jumpAnim, {
      toValue: showJumpToBottom ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 80,
    }).start();
  }, [showJumpToBottom, jumpAnim]);

  const handleConfirmBlock = () => {
    setShowBlockModal(false);
    setIsBlocked(true);
    triggerCustomToast(`${activeUser.name} has been blocked and unmatched.`);

    if (activeUser && activeUser.id) {
      apiBlockUser(activeUser.id).then(() => {
        setTimeout(() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }, 1000);
      }).catch((error) => {
        console.log('Block API error:', error);
      });
    }
  };

  const handleConfirmUnblock = async () => {
    setShowMenu(false);
    if (activeUser && activeUser.id) {
      try {
        await apiUnblockUser(activeUser.id);
        setIsBlocked(false);
        triggerCustomToast(`${activeUser.name} has been unblocked.`);
        fetchHistory(false);
      } catch (error) {
        console.log('Unblock API error:', error);
      }
    }
  };

  const handleConfirmReport = () => {
    setShowReportModal(false);
    triggerCustomToast(`Report submitted for ${activeUser.name}. Thank you!`);

    if (activeUser && activeUser.id) {
      apiReportUser(activeUser.id, selectedReason || 'Inappropriate behavior').catch(
        (error) => {
          console.log('Report API error:', error);
        }
      );
    }
  };

  const openProfile = useCallback(() => setShowProfileModal(true), []);

  const [activeReactionMsgId, setActiveReactionMsgId] = useState(null);

  const handleToggleReaction = useCallback((msgId, emoji) => {
    setMessages((prev) => {
      const targetMsg = prev.find((m) => m.id === msgId);
      const newReaction = targetMsg?.reaction === emoji ? null : emoji;

      if (targetId) {
        apiReactMessage(targetId, newReaction, msgId).catch((err) => {
          console.warn('React message error:', err?.message);
        });
      }

      return prev.map((m) =>
        m.id === msgId
          ? { ...m, reaction: newReaction }
          : m
      );
    });
  }, [targetId]);

  const handleScrollToReplyOriginal = useCallback(
    (replyToId, replyToText) => {
      if (!messages || messages.length === 0) return;
      const index = messages.findIndex(
        (m) =>
          (replyToId && (m.id === replyToId || m.id?.toString() === replyToId?.toString())) ||
          (replyToText && m.text && m.text.trim() === replyToText.trim())
      );
      if (index !== -1) {
        const targetId = messages[index].id;
        const currentScrollY = currentScrollYRef.current;
        const visibleHeight = listLayoutHeightRef.current || 500;
        const itemY = index * 76;

        // Check if the original message is ALREADY visible in current viewport
        const isVisible =
          itemY >= (currentScrollY - 20) &&
          (itemY + 50) <= (currentScrollY + visibleHeight + 20);

        // Only scroll if it's NOT already visible on screen!
        if (!isVisible && listRef.current) {
          try {
            listRef.current.scrollToIndex({
              index,
              animated: true,
              viewPosition: 0.5,
            });
          } catch (e) {
            listRef.current.scrollToOffset({
              offset: Math.max(0, index * 76),
              animated: true,
            });
          }
        }

        // Always highlight the background color
        setHighlightedMsgId(targetId);
        setTimeout(() => {
          setHighlightedMsgId((prev) => (prev === targetId ? null : prev));
        }, 2000);
      }
    },
    [messages]
  );

  const renderMsg = useCallback(
    ({ item }) => (
      <View key={item.id}>
        {!!item.dateHeader && (
          <View style={styles.dateHeaderContainer}>
            <View style={styles.dateHeaderLine} />
            <Text style={styles.dateHeaderText}>{item.dateHeader}</Text>
            <View style={styles.dateHeaderLine} />
          </View>
        )}
        <MessageBubble
          item={item}
          theme={theme}
          styles={styles}
          avatarUri={activeUser.image}
          onAvatarPress={openProfile}
          onReact={handleToggleReaction}
          onDeleteMsg={handleDeleteSingleMessage}
          activeReactionMsgId={activeReactionMsgId}
          onOpenReactionMenu={(id) => setActiveReactionMsgId(id)}
          onCloseReactionMenu={() => setActiveReactionMsgId(null)}
          onScrollToReplyOriginal={handleScrollToReplyOriginal}
          isHighlighted={highlightedMsgId === item.id}
          onImagePress={(imgUrl) => setViewingImage(imgUrl)}
          onReplyMessage={(msg) =>
            setReplyingTo({
              id: msg.id,
              text: msg.text,
              sender: msg.sender,
              senderName: msg.sender === 'me' ? 'yourself' : (activeUser.display_name || activeUser.name || 'User'),
            })
          }
        />
      </View>
    ),
    [theme, styles, activeUser.image, activeUser.display_name, activeUser.name, openProfile, handleToggleReaction, handleDeleteSingleMessage, activeReactionMsgId, handleScrollToReplyOriginal, highlightedMsgId]
  );

  const activeMsg = useMemo(
    () => messages.find((m) => m.id === activeReactionMsgId),
    [messages, activeReactionMsgId]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  if (isLoading) {
    return (
      <LinearGradient
        colors={theme.bgGrad}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.root}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent || '#FF007F'} />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={theme.bgGrad}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.root}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Background blobs */}
      <View style={styles.glowBlobCyan} pointerEvents="none" />
      <View style={styles.glowBlobFuchsia} pointerEvents="none" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.headerProfileTouch}
                onPress={openProfile}
                activeOpacity={0.75}
              >
                {isSupportChat ? (
                  <View style={styles.headerSupportAvatarBox}>
                    <LinearGradient
                      colors={theme.gradientAccent || ['#FF007F', '#B5179E']}
                      style={StyleSheet.absoluteFill}
                    />
                    <Ionicons name="headset" size={20} color="#fff" />
                  </View>
                ) : (
                  <Image source={{ uri: activeUser.image }} style={styles.headerAvatar} />
                )}

                <View style={styles.headerInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.headerName}>{activeUser.display_name || activeUser.name}</Text>
                    {renderVerifiedBadge(activeUser.user || activeUser, 16)}
                  </View>
                  {isOtherTyping ? (
                    <Text style={[styles.onlineText, { color: '#30D158', fontWeight: '700' }]}>
                      typing...
                    </Text>
                  ) : (isSupportChat ? (
                    <Text style={[styles.onlineText, { color: '#00E5FF', fontWeight: '600' }]}>
                      24/7 Official Support • Active
                    </Text>
                  ) : null)}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuBtn}
                onPress={() => setShowMenu((p) => !p)}
                activeOpacity={0.7}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* Floating 3-Dots Dropdown Menu */}
        {showMenu && (
          <TouchableOpacity
            style={styles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => setShowMenu(false)}
          >
            {isSupportChat ? (
              <View style={styles.dropdownCard}>
                <TouchableOpacity
                  style={styles.dropdownOption}
                  onPress={() => {
                    setShowMenu(false);
                    setShowClearChatModal(true);
                  }}
                >
                  <Ionicons name="trash-bin-outline" size={18} color="#FF375F" />
                  <Text style={[styles.dropdownOptionText, { color: '#FF375F' }]}>Clear Chat</Text>
                </TouchableOpacity>

                <View style={styles.dropdownDivider} />

                <TouchableOpacity
                  style={styles.dropdownOption}
                  onPress={() => {
                    setShowMenu(false);
                    triggerCustomToast('HeartLink Support: support@heartlink.app');
                  }}
                >
                  <Ionicons name="mail-outline" size={18} color={theme.textPrimary} />
                  <Text style={styles.dropdownOptionText}>Email Support</Text>
                </TouchableOpacity>

                <View style={styles.dropdownDivider} />

                <TouchableOpacity
                  style={styles.dropdownOption}
                  onPress={() => {
                    setShowMenu(false);
                    openProfile();
                  }}
                >
                  <Ionicons name="information-circle-outline" size={18} color={theme.textPrimary} />
                  <Text style={styles.dropdownOptionText}>Support & Help Info</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.dropdownCard}>
                <TouchableOpacity
                  style={styles.dropdownOption}
                  onPress={() => {
                    setShowMenu(false);
                    setShowClearChatModal(true);
                  }}
                >
                  <Ionicons name="trash-bin-outline" size={18} color="#FF375F" />
                  <Text style={[styles.dropdownOptionText, { color: '#FF375F' }]}>Clear Chat</Text>
                </TouchableOpacity>

                <View style={styles.dropdownDivider} />

                <TouchableOpacity
                  style={styles.dropdownOption}
                  onPress={() => {
                    setShowMenu(false);
                    setShowReportModal(true);
                  }}
                >
                  <Ionicons name="flag-outline" size={18} color={theme.textPrimary} />
                  <Text style={styles.dropdownOptionText}>Report User</Text>
                </TouchableOpacity>

                <View style={styles.dropdownDivider} />

                {isBlocked ? (
                  <TouchableOpacity
                    style={styles.dropdownOption}
                    onPress={handleConfirmUnblock}
                  >
                    <Ionicons name="lock-open-outline" size={18} color="#30D158" />
                    <Text style={[styles.dropdownOptionText, { color: '#30D158' }]}>
                      Unblock User
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.dropdownOption}
                    onPress={() => {
                      setShowMenu(false);
                      setShowBlockModal(true);
                    }}
                  >
                    <Ionicons name="ban-outline" size={18} color="#FF375F" />
                    <Text style={[styles.dropdownOptionText, { color: '#FF375F' }]}>
                      Block User
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Full-screen backdrop to close floating reaction box on clicking ANY blank screen or area outside */}
        {activeReactionMsgId !== null && (
          <TouchableOpacity
            style={[StyleSheet.absoluteFillObject, { zIndex: 9999 }]}
            activeOpacity={1}
            onPress={() => setActiveReactionMsgId(null)}
          />
        )}

        {/* Messages log — with optional wallpaper background */}
        <View
          style={[styles.messagesArea]}
          onTouchStart={() => {
            if (activeReactionMsgId !== null) setActiveReactionMsgId(null);
          }}
        >

          <FlatList
            ref={listRef}
            data={messages}
            renderItem={renderMsg}
            keyExtractor={keyExtractor}
            contentContainerStyle={[
              styles.msgList,
              { flexGrow: 1, justifyContent: 'flex-start' },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onContentSizeChange={handleContentSizeChange}
            onScrollToIndexFailed={(info) => {
              listRef.current?.scrollToOffset({
                offset: Math.max(0, info.index * 76),
                animated: true,
              });
            }}
            initialNumToRender={20}
            maxToRenderPerBatch={15}
            windowSize={15}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews={false}
            ListFooterComponent={
              isOtherTyping ? (
                <View style={[styles.msgRow, { marginBottom: 6 }]}>
                  <TouchableOpacity onPress={openProfile} activeOpacity={0.8}>
                    <Image source={{ uri: activeUser.image }} style={styles.msgAvatar} />
                  </TouchableOpacity>
                  <View style={[styles.bubble, styles.bubbleOther, styles.typingBubble]}>
                    <View style={styles.typingDotsRow}>
                      <Animated.View style={[styles.typingDot, { opacity: typingDot1 }]} />
                      <Animated.View style={[styles.typingDot, { opacity: typingDot2 }]} />
                      <Animated.View style={[styles.typingDot, { opacity: typingDot3 }]} />
                    </View>
                  </View>
                </View>
              ) : null
            }
          />

          {/* "Jump to latest" pill — animates in/out smoothly */}
          <Animated.View
            pointerEvents={showJumpToBottom ? 'auto' : 'none'}
            style={[
              styles.jumpToBottomBtn,
              {
                opacity: jumpAnim,
                transform: [
                  {
                    scale: jumpAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 1],
                    }),
                  },
                  {
                    translateY: jumpAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                isNearBottomRef.current = true;
                setShowJumpToBottom(false);
                scrollToBottom(true);
              }}
            >
              <LinearGradient colors={theme.gradientAccent} style={styles.jumpToBottomGrad}>
                <Ionicons name="chevron-down" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Input deck or Blocked Banner */}
        <View style={styles.inputContainer}>
          <SafeAreaView edges={['bottom']} style={styles.inputSafeArea}>
            {/* Male 5 free messages limit indicator banner */}
            {!isSupportChat && !isCurrentUserSupport && isMaleUser && !isPremiumUser && freeMessagesLeft !== null && (
              <View style={[styles.freeBanner, freeMessagesLeft === 0 && styles.freeBannerExhausted]}>
                <Ionicons
                  name={freeMessagesLeft === 0 ? 'lock-closed' : 'sparkles'}
                  size={13}
                  color={freeMessagesLeft === 0 ? '#FF375F' : '#FF007F'}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.freeBannerTxt, freeMessagesLeft === 0 && styles.freeBannerTxtExhausted]}>
                  {freeMessagesLeft === 0
                    ? 'Free limit reached (5/5). Upgrade to Premium to keep chatting!'
                    : `${freeMessagesLeft} of 5 free messages remaining for this chat`}
                </Text>
                {freeMessagesLeft === 0 && (
                  <TouchableOpacity
                    style={styles.upgradeMiniBtn}
                    onPress={() => navigation.navigate('Plans')}
                  >
                    <Text style={styles.upgradeMiniTxt}>Upgrade</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {isBlocked ? (
              <View style={styles.blockedBannerRow}>
                <Text style={styles.blockedBannerText}>
                  You blocked this user.
                </Text>
                <TouchableOpacity onPress={handleConfirmUnblock} style={styles.unblockBannerBtn}>
                  <Text style={styles.unblockBannerBtnText}>Unblock</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Reply Preview Bar */}
                {!!replyingTo && (
                  <View style={styles.replyPreviewContainer}>
                    <View style={styles.replyPreviewBar} />
                    <View style={styles.replyPreviewContent}>
                      <Text style={styles.replyPreviewTitle} numberOfLines={1}>
                        Replying to {replyingTo.senderName}
                      </Text>
                      <Text style={styles.replyPreviewText} numberOfLines={1}>
                        {replyingTo.text}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setReplyingTo(null)}
                      style={styles.replyPreviewCloseBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close-circle" size={20} color={theme.textSec || '#8E8E93'} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Attached Image Preview Bar */}
                {selectedImage && (
                  <View style={styles.imagePreviewBar}>
                    <View style={styles.imagePreviewWrap}>
                      <Image source={{ uri: selectedImage }} style={styles.previewThumb} />
                      <TouchableOpacity
                        style={styles.removeImageBtn}
                        onPress={() => setSelectedImage(null)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close" size={14} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.previewTitle}>Image attached</Text>
                      <Text style={styles.previewSub}>Tap send to submit photo</Text>
                    </View>
                  </View>
                )}

                <View style={styles.inputRow}>
                  {/* Photo & Camera Attachment Buttons */}
                  <TouchableOpacity
                    style={styles.mediaBtn}
                    onPress={handlePickImage}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="image-outline" size={22} color="#FF007F" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.mediaBtn}
                    onPress={handleTakePhoto}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="camera-outline" size={22} color={theme.textPrimary} />
                  </TouchableOpacity>

                  <View style={styles.inputWrap}>
                    <TextInput
                      ref={inputRef}
                      style={styles.input}
                      placeholder={selectedImage ? "Add an optional message…" : "Type a message…"}
                      placeholderTextColor={theme.textFaint}
                      value={input}
                      onChangeText={handleInputChange}
                      maxLength={2000}
                      multiline
                    />
                  </View>

                  <TouchableOpacity
                    onPress={send}
                    onPressIn={onSendPressIn}
                    onPressOut={onSendPressOut}
                    activeOpacity={0.9}
                    style={styles.sendBtn}
                    disabled={isSending || (!input.trim() && !selectedImage) || (!isSupportChat && !isCurrentUserSupport && isMaleUser && !isPremiumUser && freeMessagesLeft === 0)}
                  >
                    <Animated.View style={{ flex: 1, transform: [{ scale: sendScale }] }}>
                      <LinearGradient
                        colors={theme.gradientAccent}
                        style={[
                          styles.sendGrad,
                          ((!input.trim() && !selectedImage) || isSending || (!isSupportChat && !isCurrentUserSupport && isMaleUser && !isPremiumUser && freeMessagesLeft === 0)) && styles.sendGradDisabled,
                        ]}
                      >
                        {isSending ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Ionicons name="send" size={15} color="#fff" />
                        )}
                      </LinearGradient>
                    </Animated.View>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>


      {/* Unified Profile Detail Modal (Identical popup to Matches & Requests screens) */}
      <ProfileDetail
        visible={showProfileModal}
        profile={activeUser}
        isMatch={true}
        onClose={() => setShowProfileModal(false)}
        onLike={() => {
          setShowProfileModal(false);
        }}
        onPass={() => {
          setShowProfileModal(false);
          setShowBlockModal(true);
        }}
      />

      {/* Clear Chat Confirmation Modal */}
      <Modal
        visible={showClearChatModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearChatModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.customAlertCard}>
            <View style={styles.alertIconCircleDanger}>
              <Ionicons name="trash-bin" size={30} color="#FF375F" />
            </View>
            <Text style={styles.alertTitle}>Clear Conversation</Text>
            <Text style={styles.alertText}>
              Are you sure you want to delete all messages in this chat? This action cannot be undone.
            </Text>

            <View style={styles.alertButtonsRow}>
              <TouchableOpacity
                style={styles.alertCancelBtn}
                onPress={() => setShowClearChatModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.alertCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.alertConfirmBtnDanger}
                onPress={handleConfirmClearChat}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['#FF375F', '#D00040']} style={styles.alertBtnGrad}>
                  <Text style={styles.alertConfirmTxt}>Clear Chat</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Block Confirmation Modal */}
      <Modal
        visible={showBlockModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBlockModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.customAlertCard}>
            <View style={styles.alertIconCircleDanger}>
              <Ionicons name="ban" size={30} color="#FF375F" />
            </View>
            <Text style={styles.alertTitle}>Block User</Text>
            <Text style={styles.alertText}>
              Do you really want to block {activeUser.name}?
            </Text>

            <View style={styles.alertButtonsRow}>
              <TouchableOpacity
                style={styles.alertCancelBtn}
                onPress={() => setShowBlockModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.alertCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.alertConfirmBtnDanger}
                onPress={handleConfirmBlock}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['#FF375F', '#D00040']} style={styles.alertBtnGrad}>
                  <Text style={styles.alertConfirmTxt}>Block</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Report Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.customReportCard}>
            <View style={styles.alertIconCircleWarning}>
              <Ionicons name="flag" size={26} color="#FF9500" />
            </View>
            <Text style={styles.alertTitle}>Report {activeUser.name}</Text>
            <Text style={styles.alertSubTitle}>
              Select a reason for reporting this user:
            </Text>

            <View style={styles.reportReasonsList}>
              {REPORT_REASONS.map((reason, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.reportReasonItem,
                    selectedReason === reason && styles.reportReasonSelected,
                  ]}
                  onPress={() => setSelectedReason(reason)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={
                      selectedReason === reason ? 'radio-button-on' : 'radio-button-off'
                    }
                    size={18}
                    color={selectedReason === reason ? '#FF007F' : theme.textFaint}
                  />
                  <Text
                    style={[
                      styles.reportReasonTxt,
                      selectedReason === reason && styles.reportReasonTxtSelected,
                    ]}
                  >
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.alertButtonsRow}>
              <TouchableOpacity
                style={styles.alertCancelBtn}
                onPress={() => setShowReportModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.alertCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.alertConfirmBtn}
                onPress={handleConfirmReport}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['#FF007F', '#B5179E']} style={styles.alertBtnGrad}>
                  <Text style={styles.alertConfirmTxt}>Submit Report</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>



      {/* Full-Screen Image Viewer Modal */}
      <Modal visible={Boolean(viewingImage)} transparent animationType="fade" onRequestClose={() => setViewingImage(null)}>
        <View style={styles.imageViewerOverlay}>
          <SafeAreaView style={styles.imageViewerHeader} edges={['top']}>
            <TouchableOpacity
              style={styles.imageViewerCloseBtn}
              onPress={() => setViewingImage(null)}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={26} color="#FFF" />
            </TouchableOpacity>
          </SafeAreaView>

          <View style={styles.imageViewerBody}>
            {viewingImage && (
              <Image
                source={{ uri: viewingImage }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Custom Tailored Notification Toast */}
      {toastVisible && (
        <Animated.View
          style={[
            styles.customToastWrap,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-40, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Ionicons name="checkmark-circle" size={22} color="#30D158" />
          <Text style={styles.customToastTxt}>{toastText}</Text>
        </Animated.View>
      )}
    </LinearGradient>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    flex: { flex: 1 },
    root: { flex: 1, position: 'relative' },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      color: theme.textSec,
      fontSize: 16,
      marginTop: 12,
    },

    glowBlobCyan: {
      position: 'absolute',
      top: height * 0.15,
      left: -80,
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: 'rgba(0, 191, 255, 0.12)',
      opacity: theme.isDark ? 0.35 : 0.04,
      zIndex: 0,
    },
    glowBlobFuchsia: {
      position: 'absolute',
      bottom: height * 0.3,
      right: -80,
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: 'rgba(255, 0, 127, 0.12)',
      opacity: theme.isDark ? 0.4 : 0.04,
      zIndex: 0,
    },

    // Header
    headerContainer: {
      backgroundColor: theme.isDark ? '#160F2B' : '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: theme.isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
      overflow: 'hidden',
      zIndex: 10,
    },
    headerSafeArea: {
      width: '100%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 14,
      gap: 10,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
      borderWidth: 1,
      borderColor: theme.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerProfileTouch: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    headerInfo: { flex: 1 },
    headerName: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.textPrimary,
      letterSpacing: -0.2,
    },
    onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
    onlineDot: { width: 6.5, height: 6.5, borderRadius: 3.25, backgroundColor: '#34C759' },
    onlineText: { fontSize: 11, color: theme.textSec, fontWeight: '600' },
    menuBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
      borderWidth: 1,
      borderColor: theme.border,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Dropdown menu
    dropdownOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 100,
    },
    dropdownCard: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 100 : 85,
      right: 18,
      width: 170,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: theme.isDark ? '#1D1338' : '#FFFFFF',
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 10,
    },
    dropdownOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    dropdownOptionText: {
      color: theme.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    dropdownDivider: {
      height: 1,
      backgroundColor: theme.border,
    },

    // Messages log
    messagesArea: { flex: 1, position: 'relative' },
    msgList: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 16, gap: 10 },
    msgContainer: {
      position: 'relative',
      marginVertical: 4,
    },
    msgContainerMe: {
      alignItems: 'flex-end',
    },
    reactionBarPill: {
      position: 'absolute',
      top: -46,
      zIndex: 10000,
      elevation: 10000,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.isDark ? '#2D224C' : '#FFFFFF',
      borderRadius: 24,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.1)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    },
    reactionBarMe: {
      right: 0,
    },
    reactionBarOther: {
      left: 36,
    },
    reactionModalPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.isDark ? '#261B42' : '#FFFFFF',
      borderRadius: 30,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.12)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 12,
    },
    reactionDivider: {
      width: 1,
      height: 24,
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.1)',
      marginHorizontal: 6,
    },
    reactionEmojiBtn: {
      paddingHorizontal: 6,
      paddingVertical: 4,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    reactionEmojiBtnSelected: {
      backgroundColor: theme.isDark ? 'rgba(255, 0, 127, 0.25)' : 'rgba(255, 0, 127, 0.15)',
    },
    reactionEmojiText: {
      fontSize: 20,
    },
    reactionTrashBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 55, 95, 0.12)',
      marginLeft: 2,
    },
    doubleTapHeartWrap: {
      position: 'absolute',
      alignSelf: 'center',
      top: '10%',
      zIndex: 90,
    },
    msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    msgRowMe: { flexDirection: 'row-reverse' },
    msgAvatar: { width: 30, height: 30, borderRadius: 15, marginBottom: 2 },
    bubbleWrapper: {
      position: 'relative',
      maxWidth: '78%',
    },
    reactionBadge: {
      position: 'absolute',
      bottom: -10,
      backgroundColor: theme.isDark ? '#2D224C' : '#FFFFFF',
      borderRadius: 12,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
      zIndex: 10,
    },
    reactionBadgeMe: {
      right: 10,
    },
    reactionBadgeOther: {
      left: 10,
    },
    reactionBadgeText: {
      fontSize: 13,
    },

    bubble: {
      maxWidth: '100%',
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 10,
      overflow: 'hidden',
    },
    bubbleOther: {
      backgroundColor: theme.isDark ? '#261C44' : '#EAE7F6',
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.06)',
    },
    bubbleMe: {
      borderBottomRightRadius: 4,
    },
    bubbleTextOther: { fontSize: 14.5, color: theme.textPrimary, lineHeight: 21 },
    bubbleTextMe: { fontSize: 14.5, color: '#fff', lineHeight: 21 },
    bubbleTimeOther: {
      fontSize: 9.5,
      color: theme.textFaint,
      marginTop: 4,
      alignSelf: 'flex-end',
    },
    bubbleTimeMe: {
      fontSize: 9.5,
      color: 'rgba(255,255,255,0.75)',
      marginTop: 4,
      alignSelf: 'flex-end',
    },

    // Jump-to-bottom pill
    jumpToBottomBtn: {
      position: 'absolute',
      right: 16,
      bottom: 16,
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    jumpToBottomGrad: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Input deck
    inputContainer: {
      backgroundColor: theme.isDark ? '#160F2B' : '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: theme.isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
      overflow: 'hidden',
    },
    inputSafeArea: {
      width: '100%',
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    emojiToggleBtn: {
      paddingHorizontal: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emojiPickerContainer: {
      height: 200,
      backgroundColor: theme.isDark ? '#1C1535' : '#F9F8FC',
      borderTopWidth: 1,
      borderTopColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    emojiCategoryRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    emojiCategoryTab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 16,
      marginRight: 6,
    },
    emojiCategoryTabActive: {
      backgroundColor: theme.isDark ? 'rgba(255,0,127,0.22)' : 'rgba(255,0,127,0.12)',
    },
    emojiCategoryIcon: {
      fontSize: 13,
      marginRight: 4,
    },
    emojiCategoryName: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textFaint,
    },
    emojiCategoryNameActive: {
      color: '#FF007F',
      fontWeight: '800',
    },
    emojiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 8,
      justifyContent: 'flex-start',
    },
    emojiItem: {
      width: (width - 16) / 8,
      height: 42,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emojiText: {
      fontSize: 23,
    },
    inputWrap: {
      flex: 1,
      backgroundColor: theme.isDark ? '#231B3D' : '#F4F2FA',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.08)',
      paddingHorizontal: 16,
      paddingVertical: 4,
      maxHeight: 110,
    },
    input: {
      color: theme.textPrimary,
      fontSize: 15,
      padding: 0,
      paddingVertical: 8,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      overflow: 'hidden',
    },
    sendGrad: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendGradDisabled: {
      opacity: 0.5,
    },

    // Modal Backdrop & Cards
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(5, 2, 12, 0.88)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    customAlertCard: {
      width: '100%',
      borderRadius: 28,
      padding: 24,
      alignItems: 'center',
      backgroundColor: theme.isDark ? '#1C1433' : '#FFFFFF',
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 12,
    },
    customReportCard: {
      width: '100%',
      borderRadius: 28,
      padding: 24,
      alignItems: 'center',
      backgroundColor: theme.isDark ? '#1C1433' : '#FFFFFF',
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 12,
    },
    alertIconCircleDanger: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: 'rgba(255, 55, 95, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 14,
      borderWidth: 1,
      borderColor: 'rgba(255, 55, 95, 0.3)',
    },
    alertIconCircleWarning: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: 'rgba(255, 149, 0, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: 'rgba(255, 149, 0, 0.3)',
    },
    alertTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: theme.textPrimary,
      marginBottom: 6,
      textAlign: 'center',
    },
    alertSubTitle: {
      fontSize: 13,
      color: theme.textSec,
      marginBottom: 16,
      textAlign: 'center',
    },
    alertText: {
      fontSize: 15,
      color: theme.textSec,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    alertButtonsRow: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
      marginTop: 8,
    },
    alertCancelBtn: {
      flex: 1,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    alertCancelTxt: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.textSec,
    },
    alertConfirmBtn: {
      flex: 1,
      height: 48,
      borderRadius: 24,
      overflow: 'hidden',
    },
    alertConfirmBtnDanger: {
      flex: 1,
      height: 48,
      borderRadius: 24,
      overflow: 'hidden',
    },
    alertBtnGrad: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    alertConfirmTxt: {
      fontSize: 15,
      fontWeight: '800',
      color: '#fff',
    },

    // Report Reasons List
    reportReasonsList: {
      width: '100%',
      marginBottom: 16,
      gap: 8,
    },
    reportReasonItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    reportReasonSelected: {
      backgroundColor: 'rgba(255, 0, 127, 0.12)',
      borderColor: 'rgba(255, 0, 127, 0.4)',
    },
    reportReasonTxt: {
      fontSize: 13.5,
      color: theme.textSec,
      fontWeight: '500',
      flex: 1,
    },
    reportReasonTxtSelected: {
      color: theme.textPrimary,
      fontWeight: '700',
    },

    // Toast Notification
    customToastWrap: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 54 : 36,
      left: 20,
      right: 20,
      borderRadius: 24,
      backgroundColor: theme.isDark ? '#1C1433' : '#FFFFFF',
      paddingHorizontal: 18,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: 'rgba(48, 209, 88, 0.4)',
      overflow: 'hidden',
      zIndex: 999,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    customToastTxt: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textPrimary,
      flex: 1,
    },

    // Checkmarks & Typing Dots
    timeRowMe: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: 3,
    },
    typingBubble: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 18,
      borderBottomLeftRadius: 4,
    },
    typingDotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    typingDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: theme.accent || '#FF007F',
    },

    // Blocked Banner Styles
    blockedBannerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    blockedBannerText: {
      fontSize: 14,
      color: theme.textSec,
      fontWeight: '600',
    },
    unblockBannerBtn: {
      backgroundColor: 'rgba(48, 209, 88, 0.15)',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(48, 209, 88, 0.4)',
    },
    unblockBannerBtnText: {
      color: '#30D158',
      fontWeight: '800',
      fontSize: 13.5,
    },

    // Date Header Styles
    dateHeaderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 14,
      paddingHorizontal: 20,
    },
    dateHeaderLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
    },
    dateHeaderText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: theme.textSec,
      marginHorizontal: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    // Male Free Messages Limit Banner Styles
    freeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.isDark ? 'rgba(255, 0, 127, 0.12)' : 'rgba(255, 0, 127, 0.08)',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255, 0, 127, 0.3)' : 'rgba(255, 0, 127, 0.2)',
    },
    freeBannerExhausted: {
      backgroundColor: 'rgba(255, 55, 95, 0.14)',
      borderColor: 'rgba(255, 55, 95, 0.35)',
    },
    freeBannerTxt: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FF007F',
      flex: 1,
    },
    freeBannerTxtExhausted: {
      color: '#FF375F',
    },
    upgradeMiniBtn: {
      backgroundColor: '#FF007F',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 6,
    },
    upgradeMiniTxt: {
      color: '#FFF',
      fontSize: 11,
      fontWeight: '800',
    },

    // Character Counter Styles
    charCountTxt: {
      fontSize: 10.5,
      fontWeight: '700',
      color: theme.textFaint,
      alignSelf: 'flex-end',
      marginBottom: 4,
      marginRight: 4,
    },
    charCountTxtMax: {
      color: '#FF375F',
    },

    // Quoted Reply inside Message Bubble (WhatsApp layout)
    replyQuoteBox: {
      flexDirection: 'row',
      alignItems: 'stretch',
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 6,
      minWidth: 170,
      width: '100%',
    },
    replyQuoteBoxMe: {
      backgroundColor: 'rgba(0, 0, 0, 0.25)',
    },
    replyQuoteBoxOther: {
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.07)',
    },
    replyQuoteBar: {
      width: 3.5,
      alignSelf: 'stretch',
      borderRadius: 2,
      backgroundColor: '#FF007F',
      marginRight: 8,
    },
    replyQuoteSender: {
      fontSize: 12,
      fontWeight: '800',
      marginBottom: 2,
    },
    replyQuoteSenderMe: {
      color: '#00E5FF',
    },
    replyQuoteSenderOther: {
      color: '#FF007F',
    },
    replyQuoteText: {
      fontSize: 12.5,
      fontWeight: '400',
      lineHeight: 16,
    },
    replyQuoteTextMe: {
      color: 'rgba(255, 255, 255, 0.9)',
    },
    replyQuoteTextOther: {
      color: theme.textPrimary,
    },

    // Reply Preview bar above input deck
    replyPreviewContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.04)',
      borderTopLeftRadius: 14,
      borderTopRightRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
    },
    replyPreviewBar: {
      width: 3.5,
      height: '100%',
      minHeight: 24,
      borderRadius: 2,
      backgroundColor: '#FF007F',
      marginRight: 10,
    },
    replyPreviewContent: {
      flex: 1,
      justifyContent: 'center',
    },
    replyPreviewTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FF007F',
      marginBottom: 2,
    },
    replyPreviewText: {
      fontSize: 12.5,
      color: theme.textSec || '#8E8E93',
    },
    replyPreviewCloseBtn: {
      padding: 4,
      marginLeft: 8,
    },

    headerSupportAvatarBox: {
      width: 38,
      height: 38,
      borderRadius: 19,
      marginRight: 10,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      backgroundColor: '#FF007F',
    },

    // Image Bubble & Full-Screen Viewer Styles
    bubbleImageContainer: {
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 6,
      position: 'relative',
      backgroundColor: 'rgba(0,0,0,0.1)',
    },
    bubbleImage: {
      width: width * 0.62,
      height: width * 0.62 * 0.75,
      borderRadius: 14,
    },
    bubbleImageExpandBadge: {
      position: 'absolute',
      right: 8,
      bottom: 8,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 12,
      padding: 4,
    },
    imageViewerOverlay: {
      flex: 1,
      backgroundColor: '#000000',
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageViewerHeader: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      paddingHorizontal: 16,
      paddingVertical: 10,
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    imageViewerCloseBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageViewerBody: {
      width: width,
      height: height * 0.8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fullScreenImage: {
      width: width,
      height: '100%',
    },

    // Attached Image Preview Bar
    imagePreviewBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.isDark ? '#1C1236' : '#FFF0F7',
      borderTopWidth: 1,
      borderTopColor: theme.isDark ? 'rgba(255, 0, 127, 0.3)' : 'rgba(255, 0, 127, 0.2)',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    imagePreviewWrap: {
      position: 'relative',
    },
    previewThumb: {
      width: 48,
      height: 48,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#FF007F',
    },
    removeImageBtn: {
      position: 'absolute',
      top: -4,
      right: -4,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: '#FF375F',
      justifyContent: 'center',
      alignItems: 'center',
    },
    previewTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FF007F',
    },
    previewSub: {
      fontSize: 11,
      color: theme.textSec,
    },
    mediaBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });