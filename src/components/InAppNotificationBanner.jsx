// src/components/InAppNotificationBanner.jsx — Solid, User-Friendly Top In-App Notification Banner
import React, { useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Animated, Easing, Dimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function InAppNotificationBanner({ visible, data, onDismiss }) {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const translateY = useRef(new Animated.Value(-140)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const dismissTimerRef = useRef(null);

  useEffect(() => {
    if (visible && data) {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: Platform.OS === 'ios' ? 44 : 32,
          tension: 65,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      dismissTimerRef.current = setTimeout(() => {
        dismissBanner();
      }, 4000);
    } else {
      dismissBanner();
    }

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [visible, data]);

  const dismissBanner = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -140,
        duration: 250,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDismiss) onDismiss();
    });
  };

  const handlePress = () => {
    dismissBanner();
    if (data?.onPress) {
      data.onPress(navigation);
      return;
    }

    const type = data?.type || '';
    const userId = data?.userId || data?.from_user_id || data?.from_user?.id || data?.fromUser?.id;

    if ((type === 'chat' || type === 'message' || type === 'message_reaction') && userId) {
      navigation.navigate('ChatDetail', { userId, user: data?.user || data?.fromUser });
    } else if (type === 'request_accepted' && userId) {
      navigation.navigate('ChatDetail', { userId, user: data?.user || data?.fromUser });
    } else if (['request', 'date_proposal', 'like', 'super_like', 'date_accepted', 'date_declined', 'date_response', 'request_declined'].includes(type)) {
      navigation.navigate('Requests');
    } else if (userId && (type.includes('chat') || type.includes('message') || type.includes('reaction'))) {
      navigation.navigate('ChatDetail', { userId, user: data?.user || data?.fromUser });
    } else {
      navigation.navigate('Requests');
    }
  };

  if (!visible && opacity._value === 0) return null;

  const isChat = data?.type === 'chat';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={handlePress}
        style={styles.touchable}
      >
        {/* Solid Non-Transparent Background Gradient */}
        <LinearGradient
          colors={
            isDark
              ? (isChat ? ['#1B2436', '#171E2D'] : ['#2D1B2D', '#221424'])
              : (isChat ? ['#F0F7FF', '#FFFFFF'] : ['#FFF5F9', '#FFFFFF'])
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Left Avatar */}
        <View style={styles.avatarWrap}>
          {data?.avatar ? (
            <Image source={{ uri: data.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name={isChat ? "chatbubble" : "flash"} size={18} color="#fff" />
            </View>
          )}
          <View style={[styles.iconBadge, { backgroundColor: isChat ? '#06B6D4' : '#FF007F' }]}>
            <Ionicons name={isChat ? "chatbubble-ellipses" : "heart"} size={10} color="#fff" />
          </View>
        </View>

        {/* Content Details */}
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>{data?.title || 'Notification'}</Text>
            <Text style={styles.timeTxt}>Just now</Text>
          </View>
          <Text style={styles.message} numberOfLines={1}>
            {data?.message || (isChat ? 'New message received' : '⚡ New match request received!')}
          </Text>
        </View>

        {/* Dismiss Close Icon */}
        <TouchableOpacity
          onPress={dismissBanner}
          style={styles.closeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={16} color={isDark ? '#94A3B8' : '#64748B'} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
  },
  touchable: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: theme.isDark ? '#3B315B' : '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.isDark ? '#1C162E' : '#FFFFFF', // Solid opaque fallback
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.isDark ? '#1C162E' : '#FFFFFF',
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.isDark ? '#FFFFFF' : '#0F172A',
    flex: 1,
    marginRight: 6,
  },
  timeTxt: {
    fontSize: 10.5,
    fontWeight: '700',
    color: theme.isDark ? '#94A3B8' : '#64748B',
  },
  message: {
    fontSize: 12.5,
    fontWeight: '500',
    color: theme.isDark ? '#CBD5E1' : '#334155',
  },
  closeBtn: {
    padding: 4,
  },
});
