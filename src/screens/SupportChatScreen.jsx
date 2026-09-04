// src/screens/SupportChatScreen.jsx — Dedicated HeartLink Customer Support & Helpdesk Window with Image Attachment Support
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Dimensions,
  Animated,
  ActivityIndicator,
  Keyboard,
  Modal,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { apiGetMessages, apiSendMessage, apiClearChat, apiUploadImage } from '../services/api';
import { getEcho } from '../services/echo';
import { eventEmitter, EVENTS } from '../utils/eventEmitter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateSupportAutoReply } from '../utils/supportAutoReply';
import { SUPPORT_CATEGORIES, SUPPORT_QUESTIONS } from '../utils/supportTopics';

const { width, height } = Dimensions.get('window');
const SUPPORT_USER_ID = 16;

export const CONCIERGE_CATEGORIES = [
  { id: 'verify', label: 'Aadhaar & KYC Verification', icon: 'shield-checkmark', badge: 'Blue Shield' },
  { id: 'plans', label: 'Plans & Premium Subscriptions', icon: 'diamond', badge: 'VIP' },
  { id: 'billing', label: 'Billing & Payment Queries', icon: 'card', badge: 'Razorpay' },
  { id: 'matches', label: 'Matches, Swipes & Boost', icon: 'sparkles', badge: 'Tips' },
  { id: 'safety', label: 'Safety, Fake Profiles & Report', icon: 'alert-circle', badge: 'Priority' },
  { id: 'account', label: 'Account, Privacy & Settings', icon: 'settings-outline', badge: 'Security' },
  { id: 'specialist', label: 'Connect with Live Specialist', icon: 'headset', badge: 'Live Agent' },
];

const formatMessageDateHeader = (dateObj) => {
  if (!dateObj || isNaN(dateObj.getTime()) || dateObj.getFullYear() <= 1970) return 'Today';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateObj.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (dateObj.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return 'Today';
};

// Parser to extract image and text from message content
const parseMessageContent = (rawText) => {
  if (!rawText) return { text: '', imageUrl: null };
  const imageRegex = /\[image\](.*?)\[\/image\]/i;
  const match = rawText.match(imageRegex);
  if (match) {
    const imageUrl = match[1];
    const cleanText = rawText.replace(imageRegex, '').trim();
    return { text: cleanText, imageUrl };
  }
  // If message itself is a direct image URL
  if (/^https?:\/\/.*\.(jpeg|jpg|png|webp|gif)(\?.*)?$/i.test(rawText.trim())) {
    return { text: '', imageUrl: rawText.trim() };
  }
  return { text: rawText, imageUrl: null };
};

export default function SupportChatScreen() {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { user: currentUser } = useAuth();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const supportBgGrad = useMemo(() => {
    return isDark
      ? ['#181208', '#0F0B05', '#060402']
      : ['#FFFDF9', '#FAF5EB', '#F5EBD8'];
  }, [isDark]);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSupportTyping, setIsSupportTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const [toastText, setToastText] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // Expert & Questions States
  const [isExpertMode, setIsExpertMode] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [faqSearch, setFaqSearch] = useState('');

  const listRef = useRef(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const prevCountRef = useRef(0);
  const prevLastIdRef = useRef(null);
  const localSupportRepliesRef = useRef([]);
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const modalFilteredQuestions = useMemo(() => {
    if (!faqSearch.trim()) return SUPPORT_QUESTIONS;
    const query = faqSearch.toLowerCase().trim();
    return SUPPORT_QUESTIONS.filter(q =>
      q.label.toLowerCase().includes(query) ||
      q.question.toLowerCase().includes(query)
    );
  }, [faqSearch]);

  const handleConfirmConsent = () => {
    setShowConsentModal(false);
    setIsExpertMode(true);

    const user = currentUserRef.current;
    const firstName = (user?.display_name || user?.name || '').trim().split(' ')[0] || 'there';

    const connectNoticeMsg = {
      id: `expert-notice-${Date.now()}`,
      text: `👨‍💼 Live Support Specialist Connected\n\nHello ${firstName}! You have consented to connect with our live human support team. A specialist has joined this chat.\n\nYou can now type your message, describe your concern in detail, or attach screenshots below. How can we help you?`,
      imageUrl: null,
      sender: 'support',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateHeader: null,
      isRead: true,
      created_at: new Date().toISOString(),
      isExpertNotification: true,
    };

    setMessages(prev => [...prev, connectNoticeMsg]);
    localSupportRepliesRef.current = [...(localSupportRepliesRef.current || []), connectNoticeMsg];
    const userId = currentUserRef.current?.id;
    if (userId) {
      AsyncStorage.setItem(`@heartlink_support_replies_${userId}`, JSON.stringify(localSupportRepliesRef.current)).catch(() => {});
    }

    scrollToBottom(true);
    triggerToast('Live Expert Chat unlocked');
  };

  const triggerToast = (msg) => {
    setToastText(msg);
    setToastVisible(true);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setToastVisible(false));
  };

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  // Fetch real messages from database with user 16 and merge with persistent support replies
  const fetchHistory = useCallback(async (isFirst = false) => {
    if (isFirst) setIsLoading(true);
    try {
      const response = await apiGetMessages(SUPPORT_USER_ID);
      let messagesData = [];
      if (response && response.data) messagesData = response.data;
      else if (response && response.messages) messagesData = response.messages;
      else if (Array.isArray(response)) messagesData = response;

      // 24 hours ephemeral window: delete/exclude messages older than 24 hours
      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
      const nowMs = Date.now();

      let serverFormatted = [];
      if (Array.isArray(messagesData) && messagesData.length > 0) {
        serverFormatted = messagesData
          .filter((m) => {
            if (!m.created_at) return true;
            const t = new Date(m.created_at).getTime();
            return !isNaN(t) && (nowMs - t <= TWENTY_FOUR_HOURS_MS);
          })
          .map((m) => {
            const rawContent = m.message || m.text || m.content || '';
            const { text: cleanText, imageUrl } = parseMessageContent(rawContent);

            return {
              id: m.id?.toString() || Date.now().toString(),
              text: cleanText,
              imageUrl: imageUrl || m.image_url || null,
              sender: m.sender_id == SUPPORT_USER_ID ? 'support' : 'me',
              time: m.created_at
                ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Now',
              dateHeader: null,
              isRead: Boolean(m.is_read),
              created_at: m.created_at || new Date().toISOString(),
            };
          });
      }

      setMessages((prev) => {
        // Merge server messages with persistent local support auto-replies (filtered to 24h)
        const combined = [...serverFormatted];
        const localReplies = (localSupportRepliesRef.current || []).filter((m) => {
          if (!m.created_at) return true;
          const t = new Date(m.created_at).getTime();
          return !isNaN(t) && (nowMs - t <= TWENTY_FOUR_HOURS_MS);
        });
        localSupportRepliesRef.current = localReplies;
        const userId = currentUserRef.current?.id;
        if (userId) {
          AsyncStorage.setItem(`@heartlink_support_replies_${userId}`, JSON.stringify(localReplies)).catch(() => {});
        }

        for (const localMsg of localReplies) {
          const exists = combined.some(m => m.id === localMsg.id || (m.sender === 'support' && m.text === localMsg.text));
          if (!exists) {
            combined.push(localMsg);
          }
        }

        // Also preserve any in-memory interactive, menu, or pending messages from current state (within 24h)
        if (Array.isArray(prev)) {
          for (const p of prev) {
            if (p.id === 'support-welcome-1') continue;
            if (p.created_at) {
              const pTime = new Date(p.created_at).getTime();
              if (!isNaN(pTime) && (nowMs - pTime > TWENTY_FOUR_HOURS_MS)) {
                continue; // Ephemeral: automatically deleted after 24 hrs
              }
            }
            if (p.interactiveType || p.id?.startsWith('support-') || p.id?.startsWith('temp-') || p.pending) {
              const exists = combined.some(m => m.id === p.id || (m.sender === p.sender && m.text === p.text));
              if (!exists) {
                combined.push(p);
              }
            }
          }
        }

        // Always ensure welcome message with category menu is available
        const hasWelcome = combined.some(m => m.id === 'support-welcome-1' || m.interactiveType === 'category_menu');
        if (!hasWelcome) {
          const user = currentUserRef.current;
          const firstName = (user?.display_name || user?.name || '').trim().split(' ')[0] || 'there';
          const initialSupportMsg = {
            id: 'support-welcome-1',
            text: `👋 Welcome to HeartLink Customer Support, ${firstName}!\n\nOur 24/7 dedicated concierge assistance team is online to help you. Select an assistance category below to view instant solutions, or connect with our live specialists:`,
            imageUrl: null,
            sender: 'support',
            time: 'Now',
            dateHeader: 'Today',
            isRead: true,
            created_at: new Date().toISOString(),
            interactiveType: 'category_menu',
          };
          combined.unshift(initialSupportMsg);
        }

        // Sort chronologically by created_at, keeping the welcome message pinned at the top
        combined.sort((a, b) => {
          if (a.id === 'support-welcome-1') return -1;
          if (b.id === 'support-welcome-1') return 1;
          return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        });

        let lastDateHeader = null;
        const withHeaders = combined.map((m) => {
          const dateObj = (m.created_at && !m.created_at.startsWith('1970')) ? new Date(m.created_at) : new Date();
          const dateHeader = formatMessageDateHeader(dateObj) || 'Today';
          let showDateHeader = false;
          if (dateHeader && dateHeader !== lastDateHeader) {
            showDateHeader = true;
            lastDateHeader = dateHeader;
          }
          return { ...m, dateHeader: showDateHeader ? dateHeader : null };
        });

        const newLastId = withHeaders[withHeaders.length - 1]?.id ?? null;
        const hasNew = withHeaders.length !== prevCountRef.current || newLastId !== prevLastIdRef.current;
        if (hasNew) {
          scrollToBottom(true);
        }
        prevCountRef.current = withHeaders.length;
        prevLastIdRef.current = newLastId;

        return withHeaders;
      });
    } catch (err) {
      console.warn('Support history fetch error:', err?.message);
    } finally {
      if (isFirst) setIsLoading(false);
    }
  }, [scrollToBottom]);

  // Load saved local support replies on startup, pruning anything > 24 hours
  useEffect(() => {
    const userId = currentUser?.id;
    if (!userId) return;
    const storageKey = `@heartlink_support_replies_${userId}`;
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    const nowMs = Date.now();
    AsyncStorage.getItem(storageKey).then((val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const validReplies = parsed.filter((m) => {
              if (!m.created_at) return true;
              const t = new Date(m.created_at).getTime();
              return !isNaN(t) && (nowMs - t <= TWENTY_FOUR_HOURS_MS);
            });
            localSupportRepliesRef.current = validReplies;
            if (validReplies.length !== parsed.length) {
              AsyncStorage.setItem(storageKey, JSON.stringify(validReplies)).catch(() => {});
            }
            fetchHistory(false);
          }
        } catch (e) {}
      }
    }).catch(() => {});
  }, [currentUser?.id, fetchHistory]);

  // Connect WebSockets Echo + 2s polling
  useEffect(() => {
    fetchHistory(true);

    const pollTimer = setInterval(() => {
      fetchHistory(false);
    }, 2000);

    let echoSub = null;
    const currentUserId = currentUser?.id;

    getEcho().then((echo) => {
      if (echo && currentUserId && typeof echo.private === 'function') {
        try {
          echoSub = echo.private(`chat.${currentUserId}`);
          if (echoSub && typeof echoSub.listen === 'function') {
            echoSub.listen('.message.sent', () => {
              fetchHistory(false);
            });
          }
        } catch (err) {
          console.warn('Support Echo Error:', err?.message);
        }
      }
    }).catch(() => {});

    const unsubChat = eventEmitter.on(EVENTS.CHAT_UPDATED, () => fetchHistory(false));

    return () => {
      clearInterval(pollTimer);
      unsubChat();
      if (echoSub) {
        try { echoSub.stopListening('.message.sent'); } catch (err) {}
      }
    };
  }, [fetchHistory, currentUser?.id]);

  // Auto scroll when keyboard opens on iOS & Android
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setTimeout(() => scrollToBottom(true), 80);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setTimeout(() => scrollToBottom(false), 50);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToBottom]);

  // Pick Image from Photo Library
  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow access to your photos to attach screenshots and images for Customer Support.');
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

  // Take photo with Camera
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera Permission Needed', 'Please allow camera access to take and attach photos for Customer Support.');
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
      console.warn('Camera photo error:', err);
    }
  };

  const sendSupportMessage = async (textToSend) => {
    const txt = (textToSend || input).trim();
    const imageUri = selectedImage;
    if (!txt && !imageUri) return;
    if (isSending) return;

    setIsSending(true);
    const tempId = `temp-${Date.now()}`;
    const now = new Date();
    const dateHeader = formatMessageDateHeader(now);

    // Optimistic local state update for user's message
    const newMsg = {
      id: tempId,
      text: txt,
      imageUrl: imageUri || null,
      sender: 'me',
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateHeader: messages.length === 0 ? 'Today' : null,
      isRead: false,
      pending: true,
      created_at: now.toISOString(),
    };

    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setSelectedImage(null);
    scrollToBottom(true);

    // Show support typing indicator immediately
    setIsSupportTyping(true);

    try {
      let finalPayloadText = txt;

      // If an image was selected, upload it first to get the hosted URL
      if (imageUri) {
        const uploadedUrl = await apiUploadImage(imageUri);
        if (uploadedUrl) {
          finalPayloadText = txt ? `[image]${uploadedUrl}[/image] ${txt}` : `[image]${uploadedUrl}[/image]`;
        } else {
          if (!txt) {
            throw new Error('Image upload failed. Please try again.');
          }
        }
      }

      // Send to server
      const res = await apiSendMessage(SUPPORT_USER_ID, finalPayloadText);
      eventEmitter.emit(EVENTS.CHAT_UPDATED);

      if (res && res.id) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: res.id.toString(), pending: false } : m));
      } else if (res?.data && res.data.id) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: res.data.id.toString(), pending: false } : m));
      }

      // Determine the support auto-reply message text
      let replyContent = null;
      if (res?.auto_reply?.message) {
        replyContent = res.auto_reply.message;
      } else {
        replyContent = generateSupportAutoReply(currentUserRef.current, finalPayloadText);
      }

      // Check if this query matches a known question to provide contextual follow-ups
      const matchedQ = SUPPORT_QUESTIONS.find(
        q => q.question.toLowerCase().trim() === txt.toLowerCase().trim() ||
             q.label.toLowerCase().trim() === txt.toLowerCase().trim()
      );
      const answeredCategoryId = matchedQ?.categoryId || null;
      const answeredCategoryTitle = answeredCategoryId
        ? (CONCIERGE_CATEGORIES.find(c => c.id === answeredCategoryId)?.label || 'Topic')
        : null;

      // Simulate natural typing duration (1000ms) before the response appears
      setTimeout(() => {
        setIsSupportTyping(false);

        if (replyContent) {
          const replyTime = new Date();
          const replyMsg = {
            id: `support-reply-${Date.now()}`,
            text: replyContent,
            imageUrl: null,
            sender: 'support',
            time: replyTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            dateHeader: null,
            isRead: true,
            created_at: replyTime.toISOString(),
            isLocalAutoReply: true,
            answeredCategoryId,
            answeredCategoryTitle,
          };

          const updatedReplies = [...(localSupportRepliesRef.current || []), replyMsg];
          localSupportRepliesRef.current = updatedReplies;
          const userId = currentUserRef.current?.id;
          if (userId) {
            AsyncStorage.setItem(`@heartlink_support_replies_${userId}`, JSON.stringify(updatedReplies)).catch(() => {});
          }

          setMessages(prev => {
            if (prev.some(m => m.id === replyMsg.id || (m.sender === 'support' && m.text === replyMsg.text))) {
              return prev;
            }
            return [...prev, replyMsg];
          });
          scrollToBottom(true);
        }
      }, 1000);

      await fetchHistory(false);
      scrollToBottom(true);
    } catch (error) {
      setIsSupportTyping(false);
      console.warn('Error sending to support:', error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      triggerToast('Failed to send image or message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectCategory = (cat) => {
    if (!cat) return;
    if (cat.id === 'specialist') {
      setShowConsentModal(true);
      return;
    }
    const catQuestions = SUPPORT_QUESTIONS.filter(q => q.categoryId === cat.id);
    sendSupportCategoryChoice(cat.label, cat.id, catQuestions);
  };

  const sendSupportCategoryChoice = async (categoryLabel, categoryId, questions) => {
    const userMsgText = categoryLabel;
    setIsSending(true);
    const tempId = `temp-${Date.now()}`;
    const now = new Date();

    const userMsg = {
      id: tempId,
      text: userMsgText,
      imageUrl: null,
      sender: 'me',
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateHeader: null,
      isRead: false,
      pending: true,
      created_at: now.toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    scrollToBottom(true);
    setIsSupportTyping(true);

    try {
      apiSendMessage(SUPPORT_USER_ID, userMsgText).then(res => {
        if (res?.id || res?.data?.id) {
          const realId = (res.id || res.data.id).toString();
          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: realId, pending: false } : m));
        } else {
          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, pending: false } : m));
        }
      }).catch(() => {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, pending: false } : m));
      });

      setTimeout(() => {
        setIsSupportTyping(false);
        const replyTime = new Date();
        const replyMsg = {
          id: `support-cat-${Date.now()}`,
          text: `Here are the top questions for ${categoryLabel}. Tap any question below for an instant step-by-step resolution:`,
          imageUrl: null,
          sender: 'support',
          time: replyTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dateHeader: null,
          isRead: true,
          created_at: replyTime.toISOString(),
          interactiveType: 'questions_list',
          categoryId: categoryId,
          categoryTitle: categoryLabel,
          questionOptions: questions || [],
        };

        const updatedReplies = [...(localSupportRepliesRef.current || []), replyMsg];
        localSupportRepliesRef.current = updatedReplies;
        const userId = currentUserRef.current?.id;
        if (userId) {
          AsyncStorage.setItem(`@heartlink_support_replies_${userId}`, JSON.stringify(updatedReplies)).catch(() => {});
        }

        setMessages(prev => [...prev, replyMsg]);
        scrollToBottom(true);
      }, 700);
    } catch (err) {
      setIsSupportTyping(false);
    } finally {
      setIsSending(false);
    }
  };

  const sendSupportShowAllCategories = () => {
    const replyTime = new Date();
    const replyMsg = {
      id: `support-menu-${Date.now()}`,
      text: `Select an assistance category below to view instant solutions:`,
      imageUrl: null,
      sender: 'support',
      time: replyTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateHeader: null,
      isRead: true,
      created_at: replyTime.toISOString(),
      interactiveType: 'category_menu',
    };

    const updatedReplies = [...(localSupportRepliesRef.current || []), replyMsg];
    localSupportRepliesRef.current = updatedReplies;
    const userId = currentUserRef.current?.id;
    if (userId) {
      AsyncStorage.setItem(`@heartlink_support_replies_${userId}`, JSON.stringify(updatedReplies)).catch(() => {});
    }

    setMessages(prev => [...prev, replyMsg]);
    scrollToBottom(true);
  };

  const handleSelectQuestion = (q) => {
    sendSupportMessage(q.question);
  };

  const handleClearChat = async () => {
    setShowClearModal(false);
    try {
      setMessages([]);
      localSupportRepliesRef.current = [];
      const userId = currentUser?.id;
      if (userId) {
        await AsyncStorage.removeItem(`@heartlink_support_replies_${userId}`);
      }
      await apiClearChat(SUPPORT_USER_ID);
      triggerToast('Support chat cleared');
      eventEmitter.emit(EVENTS.CHAT_UPDATED);
      fetchHistory(true);
    } catch (e) {
      console.warn('Error clearing support chat:', e);
    }
  };

  const renderMessageItem = ({ item }) => {
    const isMe = item.sender === 'me';
    const isWelcome = item.id === 'support-welcome-1';

    return (
      <View style={styles.msgWrapper}>
        {item.dateHeader && (
          <View style={styles.dateSeparatorWrap}>
            <View style={styles.dateSeparatorLine} />
            <View style={styles.dateHeaderBox}>
              <Ionicons name="calendar-outline" size={11} color={theme.textFaint} style={{ marginRight: 5 }} />
              <Text style={styles.dateHeaderText}>{item.dateHeader}</Text>
            </View>
            <View style={styles.dateSeparatorLine} />
          </View>
        )}

        <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowSupport]}>
          {!isMe && (
            <LinearGradient
              colors={['#FBBF24', '#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.supportMsgAvatar}
            >
              <Ionicons name="headset" size={14} color="#FFF" />
            </LinearGradient>
          )}

          {isMe ? (
            <LinearGradient
              colors={['#FBBF24', '#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.bubble, styles.bubbleMe]}
            >
              {/* Attached Image (if present) */}
              {item.imageUrl && (
                <TouchableOpacity
                  onPress={() => setViewingImage(item.imageUrl)}
                  activeOpacity={0.9}
                  style={styles.msgImageContainer}
                >
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.msgImage}
                    resizeMode="cover"
                  />
                  <View style={styles.imageExpandBadge}>
                    <Ionicons name="expand-outline" size={14} color="#FFF" />
                  </View>
                </TouchableOpacity>
              )}

              {/* Text Message */}
              {Boolean(item.text) && (
                <Text style={[styles.msgText, styles.msgTextMe]}>
                  {item.text}
                </Text>
              )}

              <View style={[styles.msgMeta, styles.msgMetaMe]}>
                <Text style={[styles.msgTime, styles.msgTimeMe]}>
                  {item.time}
                </Text>
                <Ionicons
                  name={item.pending ? 'time-outline' : (item.isRead ? 'checkmark-done' : 'checkmark')}
                  size={13}
                  color={item.isRead ? '#FFFFFF' : 'rgba(255,255,255,0.75)'}
                  style={{ marginLeft: 4 }}
                />
              </View>
            </LinearGradient>
          ) : (
            <View style={[styles.bubble, styles.bubbleSupport, isWelcome && styles.bubbleWelcomeDossier]}>
              <View style={styles.supportLabelRow}>
                <Text style={styles.supportSenderTitle}>HeartLink Concierge</Text>
                <Ionicons name="shield-checkmark" size={12} color="#F59E0B" style={{ marginLeft: 3 }} />
                <View style={styles.agentPill}>
                  <Text style={styles.agentPillText}>OFFICIAL</Text>
                </View>
              </View>

              {/* Attached Image (if present) */}
              {item.imageUrl && (
                <TouchableOpacity
                  onPress={() => setViewingImage(item.imageUrl)}
                  activeOpacity={0.9}
                  style={styles.msgImageContainer}
                >
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.msgImage}
                    resizeMode="cover"
                  />
                  <View style={styles.imageExpandBadge}>
                    <Ionicons name="expand-outline" size={14} color="#FFF" />
                  </View>
                </TouchableOpacity>
              )}

              {/* Text Message */}
              {Boolean(item.text) && (
                <Text style={[styles.msgText, styles.msgTextSupport]}>
                  {item.text}
                </Text>
              )}

              {/* 1. In-Message Category Menu */}
              {(item.interactiveType === 'category_menu' || isWelcome) && (
                <View style={styles.interactiveMenuWrap}>
                  <View style={styles.interactiveMenuHeader}>
                    <Ionicons name="sparkles" size={12} color="#F59E0B" style={{ marginRight: 5 }} />
                    <Text style={styles.interactiveMenuTitle}>Select a Topic for Instant Answers</Text>
                  </View>
                  <View style={styles.categoryGrid}>
                    {CONCIERGE_CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={styles.categoryCardBtn}
                        onPress={() => handleSelectCategory(cat)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.categoryCardIconBox}>
                          <Ionicons name={cat.icon} size={15} color="#F59E0B" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.categoryCardLabel}>{cat.label}</Text>
                          {Boolean(cat.badge) && (
                            <Text style={styles.categoryCardBadge}>{cat.badge}</Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={14} color={theme.textFaint} />
                      </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                      style={styles.browseAllModalCardBtn}
                      onPress={() => setShowQuestionsModal(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="search" size={13} color="#F59E0B" style={{ marginRight: 6 }} />
                      <Text style={styles.browseAllModalCardTxt}>Search All 18 Help Topics</Text>
                      <Ionicons name="arrow-forward" size={12} color="#F59E0B" style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* 2. In-Message Questions List for Selected Category */}
              {item.interactiveType === 'questions_list' && Array.isArray(item.questionOptions) && (
                <View style={styles.interactiveQuestionsWrap}>
                  <View style={styles.interactiveMenuHeader}>
                    <Ionicons name="help-circle" size={13} color="#F59E0B" style={{ marginRight: 5 }} />
                    <Text style={styles.interactiveMenuTitle}>
                      {item.categoryTitle || 'Topics'}: Tap a Question
                    </Text>
                  </View>

                  <View style={styles.questionsListCol}>
                    {item.questionOptions.map((q) => (
                      <TouchableOpacity
                        key={q.id}
                        style={styles.questionOptionCard}
                        onPress={() => handleSelectQuestion(q)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.questionOptionIconBox}>
                          <Ionicons name={q.icon || 'help-outline'} size={14} color="#F59E0B" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.questionOptionTitle}>{q.label}</Text>
                          <Text style={styles.questionOptionSub} numberOfLines={1}>{q.question}</Text>
                        </View>
                        <Ionicons name="paper-plane-outline" size={13} color="#F59E0B" style={{ marginLeft: 6 }} />
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Navigation Buttons below questions */}
                  <View style={styles.questionNavRow}>
                    <TouchableOpacity
                      style={styles.navActionPill}
                      onPress={sendSupportShowAllCategories}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="grid-outline" size={12} color="#F59E0B" style={{ marginRight: 4 }} />
                      <Text style={styles.navActionPillText}>All Topics</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.navActionPill}
                      onPress={() => setShowQuestionsModal(true)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="search-outline" size={12} color="#F59E0B" style={{ marginRight: 4 }} />
                      <Text style={styles.navActionPillText}>Search All</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.navActionPill}
                      onPress={() => setShowConsentModal(true)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="headset-outline" size={12} color="#F59E0B" style={{ marginRight: 4 }} />
                      <Text style={styles.navActionPillText}>Live Agent</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* 3. Follow-up Navigation Strip under Answers */}
              {Boolean(item.answeredCategoryId) && (
                <View style={styles.answerFollowupRow}>
                  <TouchableOpacity
                    style={styles.followupActionBtn}
                    onPress={() => {
                      const cat = CONCIERGE_CATEGORIES.find(c => c.id === item.answeredCategoryId);
                      if (cat) handleSelectCategory(cat);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="list" size={11} color="#F59E0B" style={{ marginRight: 4 }} />
                    <Text style={styles.followupActionTxt}>More {item.answeredCategoryTitle || ''} Topics</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.followupActionBtn}
                    onPress={sendSupportShowAllCategories}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="grid-outline" size={11} color="#F59E0B" style={{ marginRight: 4 }} />
                    <Text style={styles.followupActionTxt}>All Topics</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.followupActionBtn}
                    onPress={() => setShowQuestionsModal(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="search-outline" size={11} color="#F59E0B" style={{ marginRight: 4 }} />
                    <Text style={styles.followupActionTxt}>Search All</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={[styles.msgMeta, styles.msgMetaSupport]}>
                <Text style={[styles.msgTime, styles.msgTimeSupport]}>
                  {item.time}
                </Text>
              </View>

              {/* Subtle Feedback Pill for General Support Responses */}
              {!isWelcome && !item.isExpertNotification && !item.interactiveType && (
                <View style={styles.supportMessageFooter}>
                  <Text style={styles.supportTicketLabel}>Official Verified Assistance</Text>
                  <View style={styles.helpfulPillRow}>
                    <TouchableOpacity
                      style={styles.helpfulIconBtn}
                      onPress={() => triggerToast('Thank you for your feedback!')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="thumbs-up-outline" size={11} color={theme.textFaint} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.helpfulIconBtn}
                      onPress={() => triggerToast('Thank you. We will improve this answer.')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="thumbs-down-outline" size={11} color={theme.textFaint} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={supportBgGrad} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Background blobs */}
      <View style={styles.glowBlob1} pointerEvents="none" />
      <View style={styles.glowBlob2} pointerEvents="none" />

      <SafeAreaView style={styles.flex} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Support Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerCenter}
              onPress={() => setShowInfoModal(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FBBF24', '#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerAvatarWrap}
              >
                <Ionicons name="headset" size={20} color="#FFF" />
                <View style={styles.onlineBadge} />
              </LinearGradient>

              <View style={styles.headerTitleBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.headerTitle}>HeartLink Concierge</Text>
                  <Ionicons name="shield-checkmark" size={15} color="#F59E0B" style={{ marginLeft: 4 }} />
                </View>
                <Text style={styles.headerSub}>Official 24/7 Support • Online</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => setShowMenu(p => !p)}
              activeOpacity={0.7}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Floating Dropdown Menu */}
          {showMenu && (
            <TouchableOpacity
              style={styles.dropdownOverlay}
              activeOpacity={1}
              onPress={() => setShowMenu(false)}
            >
              <View style={styles.dropdownCard}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setShowMenu(false);
                    setShowInfoModal(true);
                  }}
                >
                  <Ionicons name="information-circle-outline" size={18} color={theme.textPrimary} />
                  <Text style={styles.dropdownItemText}>Support & Help Info</Text>
                </TouchableOpacity>

                <View style={styles.dropdownDivider} />

                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setShowMenu(false);
                    triggerToast('Official Email: support@heartlink.app');
                  }}
                >
                  <Ionicons name="mail-outline" size={18} color={theme.textPrimary} />
                  <Text style={styles.dropdownItemText}>Email Support</Text>
                </TouchableOpacity>

                <View style={styles.dropdownDivider} />

                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setShowMenu(false);
                    setShowClearModal(true);
                  }}
                >
                  <Ionicons name="trash-bin-outline" size={18} color="#FF375F" />
                  <Text style={[styles.dropdownItemText, { color: '#FF375F' }]}>Clear Support Chat</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}

          {/* Executive Security & Trust Strip */}
          <View style={styles.trustStrip}>
            <View style={styles.trustItem}>
              <Ionicons name="lock-closed" size={11} color="#F59E0B" style={{ marginRight: 4 }} />
              <Text style={styles.trustText}>256-Bit SSL Encrypted</Text>
            </View>
            <View style={styles.trustDot} />
            <View style={styles.trustItem}>
              <Ionicons name="flash" size={11} color="#10B981" style={{ marginRight: 4 }} />
              <Text style={styles.trustText}>Avg Reply: &lt; 2m</Text>
            </View>
            <View style={styles.trustDot} />
            <View style={styles.trustItem}>
              <Ionicons name="shield-checkmark" size={11} color="#F59E0B" style={{ marginRight: 4 }} />
              <Text style={styles.trustText}>Official Helpdesk</Text>
            </View>
          </View>

          {/* Message Stream */}
          {isLoading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#F59E0B" />
              <Text style={styles.loaderText}>Connecting to Concierge Support...</Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              renderItem={renderMessageItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              onContentSizeChange={() => scrollToBottom(false)}
              ListFooterComponent={
                isSupportTyping ? (
                  <View style={styles.typingRow}>
                    <LinearGradient
                      colors={['#FBBF24', '#F59E0B', '#D97706']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.supportMsgAvatar}
                    >
                      <Ionicons name="headset" size={14} color="#FFF" />
                    </LinearGradient>
                    <View style={[styles.bubble, styles.bubbleSupport, styles.typingBubble]}>
                      <View style={styles.supportLabelRow}>
                        <Text style={styles.supportSenderTitle}>HeartLink Concierge</Text>
                        <Ionicons name="shield-checkmark" size={12} color="#F59E0B" style={{ marginLeft: 3 }} />
                      </View>
                      <View style={styles.typingIndicatorRow}>
                        <ActivityIndicator size="small" color="#F59E0B" style={{ marginRight: 6 }} />
                        <Text style={styles.typingIndicatorText}>Concierge is typing...</Text>
                      </View>
                    </View>
                  </View>
                ) : null
              }
            />
          )}

          {/* Image Attachment Preview (if an image is selected) */}
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
                <Text style={styles.previewSub}>Tap send to submit screenshot to support</Text>
              </View>
            </View>
          )}

          {/* Bottom Bar: Manual Input ONLY if Expert Mode active, otherwise Talk to Expert CTA */}
          {isExpertMode ? (
            <View style={styles.inputBarWrap}>
              {/* Live Expert Active Indicator Banner */}
              <View style={styles.expertActiveBanner}>
                <View style={styles.expertActiveLeft}>
                  <View style={styles.expertOnlinePulse} />
                  <View>
                    <Text style={styles.expertActiveTitle}>Live Specialist Connected</Text>
                    <Text style={styles.expertActiveCase}>Session #{currentUser?.id ? `HL-${currentUser.id}` : 'HL-8492'} • Priority Direct Line</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.exitExpertPill}
                  onPress={() => setIsExpertMode(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle-outline" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
                  <Text style={styles.exitExpertPillText}>Close Session</Text>
                </TouchableOpacity>
              </View>

              <SafeAreaView edges={['bottom']} style={styles.inputSafeArea}>
                <View style={styles.inputRow}>
                  {/* Media Attachment Buttons */}
                  <TouchableOpacity
                    style={styles.mediaBtn}
                    onPress={handlePickImage}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="image-outline" size={21} color="#F59E0B" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.mediaBtn}
                    onPress={handleTakePhoto}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="camera-outline" size={21} color={theme.textPrimary} />
                  </TouchableOpacity>

                  <TextInput
                    style={styles.textInput}
                    placeholder={selectedImage ? "Add an optional message..." : "Type message to our live expert..."}
                    placeholderTextColor={theme.textFaint || '#8E8E93'}
                    value={input}
                    onChangeText={setInput}
                    multiline
                    maxLength={2000}
                    onFocus={() => {
                      setTimeout(() => scrollToBottom(true), 120);
                    }}
                  />

                  <TouchableOpacity
                    style={[styles.sendButton, (!input.trim() && !selectedImage || isSending) && styles.sendButtonDisabled]}
                    onPress={() => sendSupportMessage()}
                    disabled={(!input.trim() && !selectedImage) || isSending}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#FBBF24', '#F59E0B', '#D97706']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.sendButtonGrad}
                    >
                      {isSending ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Ionicons name="send" size={16} color="#FFF" style={{ marginLeft: 2 }} />
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </View>
          ) : (
            /* Default Automated Mode Bottom Action Bar (Manual typing hidden) */
            <View style={styles.expertCtaBarWrap}>
              <SafeAreaView edges={['bottom']} style={styles.expertCtaSafeArea}>
                <View style={styles.conciergeDeskCard}>
                  <View style={styles.conciergeDeskTopRow}>
                    {/* Multi-Agent Avatar Stack */}
                    <View style={styles.agentAvatarStack}>
                      <View style={[styles.agentMiniAvatar, { zIndex: 3, backgroundColor: '#D97706' }]}>
                        <Text style={styles.agentMiniText}>HL</Text>
                      </View>
                      <View style={[styles.agentMiniAvatar, { zIndex: 2, marginLeft: -8, backgroundColor: '#F59E0B' }]}>
                        <Text style={styles.agentMiniText}>VIP</Text>
                      </View>
                      <View style={[styles.agentMiniAvatar, { zIndex: 1, marginLeft: -8, backgroundColor: '#B45309' }]}>
                        <Ionicons name="headset" size={11} color="#FFF" />
                      </View>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View style={styles.expertAgentDotRow}>
                        <View style={styles.expertOnlineDot} />
                        <Text style={styles.expertCtaHeading}>Priority Concierge Available</Text>
                      </View>
                      <Text style={styles.expertCtaSub}>
                        Estimated response time: &lt; 2 minutes
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.talkToExpertBtn}
                    onPress={() => setShowConsentModal(true)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['#FBBF24', '#F59E0B', '#D97706']}
                      style={styles.talkToExpertGrad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Ionicons name="headset" size={16} color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={styles.talkToExpertBtnText}>Connect with Live Concierge</Text>
                      <Ionicons name="chevron-forward" size={16} color="#FFF" style={{ marginLeft: 6 }} />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </View>
          )}
        </KeyboardAvoidingView>

        {/* Clear Chat Modal */}
        <Modal visible={showClearModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalIconCircle}>
                <Ionicons name="trash-outline" size={28} color="#FF375F" />
              </View>
              <Text style={styles.modalTitle}>Clear Support Chat?</Text>
              <Text style={styles.modalSub}>This will clear all messages in your customer support chat history.</Text>
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowClearModal(false)}>
                  <Text style={styles.modalCancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleClearChat}>
                  <Text style={styles.modalConfirmTxt}>Clear Chat</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Full-Screen Image Viewer Modal */}
        <Modal visible={Boolean(viewingImage)} transparent animationType="fade">
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

        {/* Info & Safety Modal */}
        <Modal visible={showInfoModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.infoModalCard}>
              <View style={styles.infoModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="shield-checkmark" size={22} color="#F59E0B" style={{ marginRight: 8 }} />
                  <Text style={styles.infoModalTitle}>HeartLink Concierge</Text>
                </View>
                <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                  <Ionicons name="close-circle" size={24} color={theme.textFaint} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: height * 0.5 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.infoSectionTitle}>Official 24/7 Support Team</Text>
                <Text style={styles.infoSectionBody}>
                  Our safety and concierge team is available around the clock to assist all HeartLink members. You can attach screenshots of payment receipts, verification documents, or suspicious profiles.
                </Text>

                <View style={styles.infoBullet}>
                  <Ionicons name="checkmark-circle" size={16} color="#F59E0B" style={{ marginRight: 8, marginTop: 2 }} />
                  <Text style={styles.infoBulletText}>
                    <Text style={{ fontWeight: '700', color: theme.textPrimary }}>Profile Verification:</Text> Fast Aadhaar ID verification with official Blue Shield badge.
                  </Text>
                </View>

                <View style={styles.infoBullet}>
                  <Ionicons name="checkmark-circle" size={16} color="#F59E0B" style={{ marginRight: 8, marginTop: 2 }} />
                  <Text style={styles.infoBulletText}>
                    <Text style={{ fontWeight: '700', color: theme.textPrimary }}>Subscriptions & Billing:</Text> Instant assistance with Plus and Premium subscriptions.
                  </Text>
                </View>

                <View style={styles.infoBullet}>
                  <Ionicons name="checkmark-circle" size={16} color="#F59E0B" style={{ marginRight: 8, marginTop: 2 }} />
                  <Text style={styles.infoBulletText}>
                    <Text style={{ fontWeight: '700', color: theme.textPrimary }}>Zero-Tolerance Safety:</Text> Immediate investigation and account bans for fake or harassing profiles.
                  </Text>
                </View>

                <View style={styles.infoEmailCard}>
                  <Ionicons name="mail" size={20} color="#F59E0B" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoEmailLabel}>Direct Email Inquiries</Text>
                    <Text style={styles.infoEmailValue}>support@heartlink.app</Text>
                  </View>
                </View>
              </ScrollView>
              <TouchableOpacity style={styles.infoCloseBtn} onPress={() => setShowInfoModal(false)} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#FBBF24', '#F59E0B', '#D97706']}
                  style={styles.infoCloseBtnGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.infoCloseBtnTxt}>Got It</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Consent Modal for Live Human Expert Chat */}
        <Modal
          visible={showConsentModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowConsentModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.consentModalCard}>
              <View style={styles.consentIconWrap}>
                <LinearGradient
                  colors={['#FBBF24', '#F59E0B', '#D97706']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.consentIconGrad}
                >
                  <Ionicons name="shield-checkmark" size={28} color="#FFF" />
                </LinearGradient>
              </View>

              <Text style={styles.consentTitle}>Connect with Support Concierge</Text>
              <Text style={styles.consentSubtitle}>
                Please review and consent to live agent assistance
              </Text>

              <View style={styles.consentBox}>
                <View style={styles.consentItemRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#F59E0B" style={styles.consentItemIcon} />
                  <Text style={styles.consentItemText}>
                    <Text style={{ fontWeight: '700', color: theme.textPrimary }}>Context Sharing: </Text>
                    You consent to share this support chat history and your user profile with our executive so they can resolve your issue accurately.
                  </Text>
                </View>

                <View style={styles.consentItemRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#F59E0B" style={styles.consentItemIcon} />
                  <Text style={styles.consentItemText}>
                    <Text style={{ fontWeight: '700', color: theme.textPrimary }}>Priority Assistance: </Text>
                    Ideal for manual Aadhaar KYC, payment discrepancies, safety disputes, or personalized help.
                  </Text>
                </View>

                <View style={styles.consentItemRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#F59E0B" style={styles.consentItemIcon} />
                  <Text style={styles.consentItemText}>
                    <Text style={{ fontWeight: '700', color: theme.textPrimary }}>Guidelines: </Text>
                    Respectful communication is strictly enforced in accordance with HeartLink Community Guidelines.
                  </Text>
                </View>
              </View>

              <View style={styles.consentActionsRow}>
                <TouchableOpacity
                  style={styles.consentCancelBtn}
                  onPress={() => setShowConsentModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.consentCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.consentAgreeBtn}
                  onPress={handleConfirmConsent}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#FBBF24', '#F59E0B', '#D97706']}
                    style={styles.consentAgreeGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="chatbubbles" size={16} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.consentAgreeBtnText}>I Consent & Connect</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Browse All FAQs Modal */}
        <Modal
          visible={showQuestionsModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowQuestionsModal(false)}
        >
          <View style={styles.faqModalOverlay}>
            <View style={styles.faqModalCard}>
              <View style={styles.faqModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="help-circle" size={22} color="#F59E0B" style={{ marginRight: 8 }} />
                  <Text style={styles.faqModalTitle}>HeartLink Help Center ({SUPPORT_QUESTIONS.length} Topics)</Text>
                </View>
                <TouchableOpacity onPress={() => setShowQuestionsModal(false)}>
                  <Ionicons name="close-circle" size={24} color={theme.textFaint} />
                </TouchableOpacity>
              </View>

              {/* Search Bar in Modal */}
              <View style={styles.faqSearchWrap}>
                <Ionicons name="search" size={16} color="#F59E0B" />
                <TextInput
                  style={styles.faqSearchInput}
                  placeholder="Search questions (e.g. Aadhaar, Plans, Refund, Photos)..."
                  placeholderTextColor={theme.textFaint}
                  value={faqSearch}
                  onChangeText={setFaqSearch}
                  clearButtonMode="while-editing"
                />
              </View>

              {/* Questions List */}
              <FlatList
                data={modalFilteredQuestions}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 30 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.faqItemCard}
                    onPress={() => {
                      setShowQuestionsModal(false);
                      setFaqSearch('');
                      sendSupportMessage(item.question);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.faqItemIconCircle}>
                      <Ionicons name={item.icon} size={16} color="#F59E0B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.faqItemLabel}>{item.label}</Text>
                      <Text style={styles.faqItemQuestion} numberOfLines={2}>
                        {item.question}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.textFaint} />
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* Custom Toast Banner */}
        {toastVisible && (
          <Animated.View style={[styles.toastContainer, { opacity: toastAnim }]}>
            <Ionicons name="information-circle" size={18} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.toastText}>{toastText}</Text>
          </Animated.View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const getStyles = (theme) => StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, position: 'relative' },

  glowBlob1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: theme.isDark ? 'rgba(245, 158, 11, 0.14)' : 'rgba(245, 158, 11, 0.08)',
    zIndex: 0,
  },
  glowBlob2: {
    position: 'absolute',
    bottom: 100,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: theme.isDark ? 'rgba(217, 119, 6, 0.11)' : 'rgba(217, 119, 6, 0.06)',
    zIndex: 0,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.isDark ? 'rgba(245, 158, 11, 0.16)' : 'rgba(0,0,0,0.06)',
    zIndex: 20,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(245, 158, 11, 0.22)' : 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    position: 'relative',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: theme.isDark ? '#181208' : '#FFFFFF',
  },
  headerTitleBox: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.textPrimary,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11,
    color: theme.isDark ? '#FDE68A' : '#D97706',
    fontWeight: '700',
    marginTop: 1,
  },

  dropdownOverlay: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    alignItems: 'flex-end',
    paddingRight: 16,
  },
  dropdownCard: {
    width: 220,
    backgroundColor: theme.isDark ? '#1F1235' : '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: theme.border,
    marginHorizontal: 12,
  },

  quickTopicsContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
  },
  quickTopicsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickTopicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? 'rgba(245, 158, 11, 0.10)' : '#FFFBEB',
    borderColor: theme.isDark ? 'rgba(245, 158, 11, 0.28)' : 'rgba(245, 158, 11, 0.18)',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  quickTopicText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.textPrimary,
  },

  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 13,
    color: theme.textSec,
    fontWeight: '600',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  msgWrapper: {
    marginBottom: 14,
  },
  dateSeparatorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    paddingHorizontal: 10,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(0,0,0,0.06)',
  },
  dateHeaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: theme.isDark ? 'rgba(24, 18, 10, 0.90)' : 'rgba(0,0,0,0.04)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(245, 158, 11, 0.22)' : 'rgba(0,0,0,0.06)',
  },
  dateHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textFaint,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '86%',
  },
  msgRowMe: {
    alignSelf: 'flex-end',
  },
  msgRowSupport: {
    alignSelf: 'flex-start',
  },
  supportMsgAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  bubble: {
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 11,
    minWidth: 80,
  },
  bubbleMe: {
    borderBottomRightRadius: 4,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.30,
    shadowRadius: 6,
    elevation: 3,
  },
  bubbleSupport: {
    backgroundColor: theme.isDark ? 'rgba(28, 20, 10, 0.92)' : 'rgba(255, 255, 255, 0.96)',
    borderBottomLeftRadius: 4,
    borderWidth: 1.2,
    borderColor: theme.isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  bubbleWelcomeDossier: {
    borderWidth: 1.5,
    borderColor: theme.isDark ? 'rgba(245, 158, 11, 0.38)' : 'rgba(245, 158, 11, 0.25)',
    backgroundColor: theme.isDark ? 'rgba(25, 18, 9, 0.96)' : '#FFFFFF',
    paddingVertical: 13,
  },
  welcomeActionsGrid: {
    marginTop: 12,
    gap: 7,
  },
  welcomeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? 'rgba(245, 158, 11, 0.10)' : '#FFFBEB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.18)',
  },
  welcomeActionTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.isDark ? '#FDE68A' : '#92400E',
  },
  supportMessageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0,0,0,0.05)',
    paddingTop: 7,
    marginTop: 8,
  },
  supportTicketLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: theme.isDark ? 'rgba(245, 158, 11, 0.65)' : '#B45309',
  },
  helpfulPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  helpfulIconBtn: {
    padding: 3,
    borderRadius: 6,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
  },
  supportLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  supportSenderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
  },
  agentPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    marginLeft: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  agentPillText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  msgTextMe: {
    color: '#FFFFFF',
  },
  msgTextSupport: {
    color: theme.textPrimary,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: 12,
  },
  typingBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typingIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  typingIndicatorText: {
    fontSize: 12,
    color: theme.textFaint || '#8E8E93',
    fontStyle: 'italic',
  },

  // Message Image Card
  msgImageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 6,
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  msgImage: {
    width: width * 0.62,
    height: width * 0.62 * 0.75,
    borderRadius: 12,
  },
  imageExpandBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },

  msgMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  msgMetaMe: {
    justifyContent: 'flex-end',
  },
  msgMetaSupport: {
    justifyContent: 'flex-start',
  },
  msgTime: {
    fontSize: 10,
  },
  msgTimeMe: {
    color: 'rgba(255,255,255,0.7)',
  },
  msgTimeSupport: {
    color: theme.textFaint,
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

  inputBarWrap: {
    backgroundColor: theme.isDark ? '#140A28' : '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  inputSafeArea: {
    paddingBottom: Platform.OS === 'ios' ? 4 : 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.glass,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mediaBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2,
  },
  textInput: {
    flex: 1,
    color: theme.textPrimary,
    fontSize: 14,
    maxHeight: 90,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    marginLeft: 6,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonGrad: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: theme.isDark ? '#1E1235' : '#FFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 55, 95, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.textPrimary,
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 13,
    color: theme.textSec,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: theme.glass,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  modalCancelTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FF375F',
    alignItems: 'center',
  },
  modalConfirmTxt: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },

  // Full-Screen Image Viewer
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

  infoModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: theme.isDark ? '#191309' : '#FFFFFF',
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  infoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.textPrimary,
  },
  infoSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F59E0B',
    marginBottom: 6,
  },
  infoSectionBody: {
    fontSize: 13,
    color: theme.textSec,
    lineHeight: 18,
    marginBottom: 14,
  },
  infoBullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoBulletText: {
    fontSize: 12.5,
    color: theme.textSec,
    lineHeight: 17,
    flex: 1,
  },
  infoEmailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB',
    borderRadius: 14,
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  infoEmailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textFaint,
  },
  infoEmailValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F59E0B',
    marginTop: 2,
  },
  infoCloseBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 14,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  infoCloseBtnGrad: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCloseBtnTxt: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },

  // Executive Security & Trust Strip
  trustStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: theme.isDark ? 'rgba(20, 15, 8, 0.88)' : 'rgba(245, 158, 11, 0.06)',
    borderBottomWidth: 1,
    borderBottomColor: theme.isDark ? 'rgba(245, 158, 11, 0.14)' : 'rgba(245, 158, 11, 0.10)',
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trustText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.isDark ? '#FDE68A' : '#78350F',
    letterSpacing: 0.2,
  },
  trustDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.isDark ? 'rgba(245, 158, 11, 0.45)' : 'rgba(0,0,0,0.2)',
    marginHorizontal: 8,
  },

  // In-Message Interactive Knowledge Base Styles
  interactiveMenuWrap: {
    marginTop: 10,
    width: '100%',
  },
  interactiveMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.isDark ? 'rgba(245, 158, 11, 0.22)' : 'rgba(245, 158, 11, 0.14)',
  },
  interactiveMenuTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.isDark ? '#FDE68A' : '#B45309',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  categoryGrid: {
    gap: 6,
  },
  categoryCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFBEB',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(245, 158, 11, 0.22)' : 'rgba(245, 158, 11, 0.18)',
  },
  categoryCardIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  categoryCardLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  categoryCardBadge: {
    fontSize: 9.5,
    fontWeight: '700',
    color: theme.isDark ? '#FDE68A' : '#92400E',
    marginTop: 1,
  },
  browseAllModalCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.28)',
    marginTop: 2,
  },
  browseAllModalCardTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F59E0B',
  },

  // Interactive Questions List
  interactiveQuestionsWrap: {
    marginTop: 10,
    width: '100%',
  },
  questionsListCol: {
    gap: 7,
  },
  questionOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFBEB',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(245, 158, 11, 0.22)' : 'rgba(245, 158, 11, 0.18)',
  },
  questionOptionIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 9,
  },
  questionOptionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  questionOptionSub: {
    fontSize: 10.5,
    color: theme.textFaint,
    marginTop: 1,
  },
  questionNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  navActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 0.8,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  navActionPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
  },

  // Answer Follow-up Navigation Strip
  answerFollowupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.isDark ? 'rgba(245, 158, 11, 0.16)' : 'rgba(245, 158, 11, 0.10)',
  },
  followupActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 0.8,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  followupActionTxt: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#F59E0B',
  },

  // Live Expert Chat Bar (Non-Expert Default CTA)
  expertCtaBarWrap: {
    backgroundColor: theme.isDark ? 'rgba(20, 15, 8, 0.95)' : 'rgba(255, 255, 255, 0.96)',
    borderTopWidth: 1,
    borderTopColor: theme.isDark ? 'rgba(245, 158, 11, 0.20)' : 'rgba(0,0,0,0.06)',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  expertCtaSafeArea: {
    paddingBottom: Platform.OS === 'ios' ? 4 : 8,
  },
  conciergeDeskCard: {
    backgroundColor: theme.isDark ? 'rgba(26, 19, 10, 0.95)' : '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(245, 158, 11, 0.28)' : 'rgba(245, 158, 11, 0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  conciergeDeskTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  agentAvatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentMiniAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.isDark ? '#191309' : '#FFFFFF',
  },
  agentMiniText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#FFF',
  },
  expertCtaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  expertCtaTextWrap: {
    flex: 1,
  },
  expertAgentDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1,
  },
  expertOnlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  expertCtaHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  expertCtaSub: {
    fontSize: 11,
    color: theme.textFaint,
    marginTop: 1,
  },
  talkToExpertBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  talkToExpertGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  talkToExpertBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.2,
  },

  // Expert Active Banner in Input Bar
  expertActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.28)',
  },
  expertActiveLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expertOnlinePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  expertActiveTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: theme.isDark ? '#FDE68A' : '#D97706',
  },
  expertActiveCase: {
    fontSize: 9.5,
    color: theme.isDark ? 'rgba(253, 230, 138, 0.7)' : '#92400E',
    marginTop: 1,
    fontWeight: '600',
  },
  exitExpertPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderWidth: 0.5,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  exitExpertPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },

  // Consent Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  consentModalCard: {
    backgroundColor: theme.isDark ? '#191309' : '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.20)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  consentIconWrap: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  consentIconGrad: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  consentTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  consentSubtitle: {
    fontSize: 12,
    color: theme.textSec,
    textAlign: 'center',
    marginBottom: 16,
  },
  consentBox: {
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0,0,0,0.05)',
  },
  consentItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  consentItemIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  consentItemText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: theme.textPrimary,
  },
  consentActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  consentCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  consentCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  consentAgreeBtn: {
    flex: 1.6,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  consentAgreeGrad: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  consentAgreeBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFF',
  },

  // FAQ Browse Modal
  faqModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  faqModalCard: {
    backgroundColor: theme.isDark ? '#191309' : '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    height: height * 0.78,
    borderTopWidth: 1.5,
    borderTopColor: theme.isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(0,0,0,0.08)',
  },
  faqModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  faqModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.textPrimary,
  },
  faqSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.18)',
  },
  faqSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: theme.textPrimary,
  },
  faqItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : '#FBFBFB',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0,0,0,0.06)',
  },
  faqItemIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  faqItemLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  faqItemQuestion: {
    fontSize: 11,
    color: theme.textFaint,
    marginTop: 2,
  },

  toastContainer: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: '#191309',
    borderColor: '#F59E0B',
    borderWidth: 1.2,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  toastText: {
    color: '#FFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
});
