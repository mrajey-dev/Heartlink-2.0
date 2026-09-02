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

const { width, height } = Dimensions.get('window');
const SUPPORT_USER_ID = 16;

const QUICK_TOPICS = [
  { id: 'verify', icon: 'shield-checkmark', label: 'Verification Help', text: 'How do I complete Aadhaar profile verification to get the Blue Shield badge?' },
  { id: 'plans', icon: 'diamond', label: 'Plans & Premium', text: 'What benefits do I get with Plus and Premium subscriptions?' },
  { id: 'safety', icon: 'alert-circle', label: 'Safety & Report', text: 'How do I report a suspicious or fake profile?' },
  { id: 'matches', icon: 'sparkles', label: 'Match Tips', text: 'How can I get more matches and boost my profile visibility?' },
  { id: 'billing', icon: 'card', label: 'Billing Support', text: 'I have a question regarding my subscription payment or billing.' },
];

const formatMessageDateHeader = (dateObj) => {
  if (!dateObj || isNaN(dateObj.getTime())) return null;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateObj.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (dateObj.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return dateObj.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: dateObj.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
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

  const listRef = useRef(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const prevCountRef = useRef(0);
  const prevLastIdRef = useRef(null);
  const localSupportRepliesRef = useRef([]);
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

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

      let serverFormatted = [];
      if (Array.isArray(messagesData) && messagesData.length > 0) {
        serverFormatted = messagesData.map((m) => {
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

      // Merge server messages with any local auto-replies
      const combined = [...serverFormatted];
      const localReplies = localSupportRepliesRef.current || [];
      for (const localMsg of localReplies) {
        const exists = combined.some(m => m.id === localMsg.id || (m.sender === 'support' && m.text === localMsg.text));
        if (!exists) {
          combined.push(localMsg);
        }
      }

      if (combined.length > 0) {
        // Sort chronologically by created_at
        combined.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

        let lastDateHeader = null;
        const withHeaders = combined.map((m) => {
          const dateObj = m.created_at ? new Date(m.created_at) : new Date();
          const dateHeader = formatMessageDateHeader(dateObj);
          let showDateHeader = false;
          if (dateHeader && dateHeader !== lastDateHeader) {
            showDateHeader = true;
            lastDateHeader = dateHeader;
          }
          return { ...m, dateHeader: showDateHeader ? dateHeader : null };
        });

        setMessages(withHeaders);

        const newLastId = withHeaders[withHeaders.length - 1]?.id ?? null;
        const hasNew = withHeaders.length !== prevCountRef.current || newLastId !== prevLastIdRef.current;
        if (hasNew) {
          scrollToBottom(true);
        }
        prevCountRef.current = withHeaders.length;
        prevLastIdRef.current = newLastId;
      } else if (isFirst) {
        // Initial friendly support welcome greeting personalized with user name
        const user = currentUserRef.current;
        const firstName = (user?.display_name || user?.name || '').trim().split(' ')[0] || 'there';
        const initialSupportMsg = {
          id: 'support-welcome-1',
          text: `👋 Welcome to HeartLink Customer Support, ${firstName}! Our dedicated safety and support team is here 24/7 to help you with profile verification, subscription plans, safety reports, or any technical assistance.\n\nYou can also attach and send screenshots or photos directly in this chat. How can we help you today?`,
          imageUrl: null,
          sender: 'support',
          time: 'Now',
          dateHeader: 'Today',
          isRead: true,
          created_at: new Date().toISOString(),
        };
        setMessages([initialSupportMsg]);
        prevCountRef.current = 1;
        prevLastIdRef.current = initialSupportMsg.id;
      }
    } catch (err) {
      console.warn('Support history fetch error:', err?.message);
    } finally {
      if (isFirst) setIsLoading(false);
    }
  }, [scrollToBottom]);

  // Load saved local support replies on startup
  useEffect(() => {
    const userId = currentUser?.id;
    if (!userId) return;
    const storageKey = `@heartlink_support_replies_${userId}`;
    AsyncStorage.getItem(storageKey).then((val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localSupportRepliesRef.current = parsed;
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

      // Simulate natural typing duration (1200ms) before the response appears
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
      }, 1200);

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

    return (
      <View style={styles.msgWrapper}>
        {item.dateHeader && (
          <View style={styles.dateHeaderBox}>
            <Text style={styles.dateHeaderText}>{item.dateHeader}</Text>
          </View>
        )}

        <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowSupport]}>
          {!isMe && (
            <LinearGradient
              colors={theme.gradientAccent || ['#FF007F', '#B5179E']}
              style={styles.supportMsgAvatar}
            >
              <Ionicons name="headset" size={14} color="#FFF" />
            </LinearGradient>
          )}

          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleSupport]}>
            {!isMe && (
              <View style={styles.supportLabelRow}>
                <Text style={styles.supportSenderTitle}>HeartLink Support</Text>
                <Ionicons name="shield-checkmark" size={12} color="#00E5FF" style={{ marginLeft: 3 }} />
                <View style={styles.agentPill}>
                  <Text style={styles.agentPillText}>TEAM</Text>
                </View>
              </View>
            )}

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
              <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextSupport]}>
                {item.text}
              </Text>
            )}

            <View style={[styles.msgMeta, isMe ? styles.msgMetaMe : styles.msgMetaSupport]}>
              <Text style={[styles.msgTime, isMe ? styles.msgTimeMe : styles.msgTimeSupport]}>
                {item.time}
              </Text>
              {isMe && (
                <Ionicons
                  name={item.pending ? 'time-outline' : (item.isRead ? 'checkmark-done' : 'checkmark')}
                  size={13}
                  color={item.isRead ? '#00E5FF' : 'rgba(255,255,255,0.7)'}
                  style={{ marginLeft: 3 }}
                />
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={theme.bgGrad} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.root}>
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
              <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerCenter}
              onPress={() => setShowInfoModal(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FF007F', '#7928CA', '#00E5FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerAvatarWrap}
              >
                <Ionicons name="headset" size={20} color="#FFF" />
                <View style={styles.onlineBadge} />
              </LinearGradient>

              <View style={styles.headerTitleBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.headerTitle}>HeartLink Support</Text>
                  <Ionicons name="shield-checkmark" size={15} color="#00E5FF" style={{ marginLeft: 4 }} />
                </View>
                <Text style={styles.headerSub}>24/7 Official Helpdesk • Active</Text>
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

          {/* Quick Help Topics Bar */}
          <View style={styles.quickTopicsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickTopicsScroll}
              keyboardShouldPersistTaps="handled"
            >
              {QUICK_TOPICS.map((topic) => (
                <TouchableOpacity
                  key={topic.id}
                  style={styles.quickTopicChip}
                  onPress={() => sendSupportMessage(topic.text)}
                  activeOpacity={0.75}
                >
                  <Ionicons name={topic.icon} size={14} color="#FF007F" style={{ marginRight: 6 }} />
                  <Text style={styles.quickTopicText}>{topic.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Message Stream */}
          {isLoading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#FF007F" />
              <Text style={styles.loaderText}>Connecting to Customer Support...</Text>
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
                      colors={theme.gradientAccent || ['#FF007F', '#B5179E']}
                      style={styles.supportMsgAvatar}
                    >
                      <Ionicons name="headset" size={14} color="#FFF" />
                    </LinearGradient>
                    <View style={[styles.bubble, styles.bubbleSupport, styles.typingBubble]}>
                      <View style={styles.supportLabelRow}>
                        <Text style={styles.supportSenderTitle}>HeartLink Support</Text>
                        <Ionicons name="shield-checkmark" size={12} color="#00E5FF" style={{ marginLeft: 3 }} />
                      </View>
                      <View style={styles.typingIndicatorRow}>
                        <ActivityIndicator size="small" color="#FF007F" style={{ marginRight: 6 }} />
                        <Text style={styles.typingIndicatorText}>Support is typing...</Text>
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

          {/* Input Bar */}
          <View style={styles.inputBarWrap}>
            <SafeAreaView edges={['bottom']} style={styles.inputSafeArea}>
              <View style={styles.inputRow}>
                {/* Media Attachment Buttons */}
                <TouchableOpacity
                  style={styles.mediaBtn}
                  onPress={handlePickImage}
                  activeOpacity={0.7}
                >
                  <Ionicons name="image-outline" size={21} color="#FF007F" />
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
                  placeholder={selectedImage ? "Add an optional message..." : "Type your question or issue here..."}
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
                    colors={theme.gradientAccent || ['#FF007F', '#B5179E']}
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
                  <Ionicons name="shield-checkmark" size={22} color="#00E5FF" style={{ marginRight: 8 }} />
                  <Text style={styles.infoModalTitle}>HeartLink Helpdesk</Text>
                </View>
                <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                  <Ionicons name="close-circle" size={24} color={theme.textFaint} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: height * 0.5 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.infoSectionTitle}>Official 24/7 Support Team</Text>
                <Text style={styles.infoSectionBody}>
                  Our safety and moderation team is available around the clock to support all HeartLink members. You can attach screenshots of payment receipts, verification documents, or suspicious profiles.
                </Text>

                <View style={styles.infoBullet}>
                  <Ionicons name="checkmark-circle" size={16} color="#30D158" style={{ marginRight: 8, marginTop: 2 }} />
                  <Text style={styles.infoBulletText}>
                    <Text style={{ fontWeight: '700', color: theme.textPrimary }}>Profile Verification:</Text> Fast Aadhaar ID verification with official Blue Shield badge.
                  </Text>
                </View>

                <View style={styles.infoBullet}>
                  <Ionicons name="checkmark-circle" size={16} color="#30D158" style={{ marginRight: 8, marginTop: 2 }} />
                  <Text style={styles.infoBulletText}>
                    <Text style={{ fontWeight: '700', color: theme.textPrimary }}>Subscriptions & Billing:</Text> Instant assistance with Plus and Premium subscriptions.
                  </Text>
                </View>

                <View style={styles.infoBullet}>
                  <Ionicons name="checkmark-circle" size={16} color="#30D158" style={{ marginRight: 8, marginTop: 2 }} />
                  <Text style={styles.infoBulletText}>
                    <Text style={{ fontWeight: '700', color: theme.textPrimary }}>Zero-Tolerance Safety:</Text> Immediate investigation and account bans for fake or harassing profiles.
                  </Text>
                </View>

                <View style={styles.infoEmailCard}>
                  <Ionicons name="mail" size={20} color="#FF007F" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoEmailLabel}>Direct Email Inquiries</Text>
                    <Text style={styles.infoEmailValue}>support@heartlink.app</Text>
                  </View>
                </View>
              </ScrollView>
              <TouchableOpacity style={styles.infoCloseBtn} onPress={() => setShowInfoModal(false)}>
                <Text style={styles.infoCloseBtnTxt}>Got It</Text>
              </TouchableOpacity>
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
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 0, 127, 0.18)',
    zIndex: 0,
  },
  glowBlob2: {
    position: 'absolute',
    bottom: 100,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    zIndex: 0,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    zIndex: 20,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.glass,
    borderWidth: 1,
    borderColor: theme.border,
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
    shadowColor: '#FF007F',
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
    backgroundColor: '#30D158',
    borderWidth: 2,
    borderColor: theme.isDark ? '#150A2E' : '#FFFFFF',
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
    color: '#00E5FF',
    fontWeight: '600',
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
    backgroundColor: theme.isDark ? 'rgba(255, 0, 127, 0.12)' : '#FFF0F7',
    borderColor: theme.isDark ? 'rgba(255, 0, 127, 0.3)' : 'rgba(255, 0, 127, 0.2)',
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
    marginBottom: 12,
  },
  dateHeaderBox: {
    alignSelf: 'center',
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 10,
  },
  dateHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textFaint,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  msgRowMe: {
    alignSelf: 'flex-end',
  },
  msgRowSupport: {
    alignSelf: 'flex-start',
  },
  supportMsgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 80,
  },
  bubbleMe: {
    backgroundColor: '#FF007F',
    borderBottomRightRadius: 4,
  },
  bubbleSupport: {
    backgroundColor: theme.isDark ? '#23153C' : '#F2EEF9',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
  },
  supportLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  supportSenderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF007F',
  },
  agentPill: {
    backgroundColor: 'rgba(0, 229, 255, 0.18)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 5,
  },
  agentPillText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#00E5FF',
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
    backgroundColor: theme.isDark ? '#1B1032' : '#FFF',
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
    borderColor: theme.border,
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
    color: '#FF007F',
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
    backgroundColor: theme.isDark ? 'rgba(255, 0, 127, 0.1)' : '#FFF0F7',
    borderRadius: 14,
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 127, 0.25)',
  },
  infoEmailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textFaint,
  },
  infoEmailValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FF007F',
    marginTop: 2,
  },
  infoCloseBtn: {
    backgroundColor: '#FF007F',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  infoCloseBtnTxt: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },

  toastContainer: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: '#1E1235',
    borderColor: '#FF007F',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
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
