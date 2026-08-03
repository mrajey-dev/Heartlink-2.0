// src/navigation/MainTabNavigator.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DiscoverScreen    from '../screens/DiscoverScreen';
import MatchesScreen     from '../screens/MatchesScreen';
import DatePlannerScreen from '../screens/DatePlannerScreen';
import VibesScreen       from '../screens/VibesScreen';
import ChatScreen        from '../screens/ChatScreen';
import { useTheme } from '../theme/ThemeContext';
import { apiGetRequests, apiGetConversations, apiGetUnreadCounts } from '../services/api';
import { eventEmitter, EVENTS } from '../utils/eventEmitter';

const { width } = Dimensions.get('window');
const TAB_BAR_WIDTH = width - 32; // left: 16, right: 16
const TAB_COUNT = 5;

// Subtract 2 * 6px padding horizontal from container
const TAB_WIDTH = (TAB_BAR_WIDTH - 12) / TAB_COUNT;

// Sliding indicator line configurations (34px width)
const INDICATOR_WIDTH = 34;
const INDICATOR_OFFSET = (TAB_WIDTH - INDICATOR_WIDTH) / 2;

const Tab = createBottomTabNavigator();

const ICONS = {
  Discover: { on: 'compass',       off: 'compass-outline'       },
  Matches:  { on: 'heart',         off: 'heart-outline'         },
  Date:     { on: 'calendar',      off: 'calendar-outline'      },
  Vibes:    { on: 'sparkles',      off: 'sparkles-outline'      },
  Chat:     { on: 'chatbubble',    off: 'chatbubble-outline'    },
};

function CustomTabBar({ state, descriptors, navigation }) {
  const { isDark, theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const slideAnim = useRef(new Animated.Value(state.index * TAB_WIDTH + INDICATOR_OFFSET)).current;

  const [requestCount, setRequestCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchBadgeCounts = async () => {
    try {
      const res = await apiGetUnreadCounts().catch(() => null);
      if (res) {
        if (typeof res.unread_chats === 'number') {
          setUnreadCount(res.unread_chats);
        }
        if (typeof res.pending_requests === 'number') {
          setRequestCount(res.pending_requests);
        }
      }
    } catch (e) {
      // ignore transient errors
    }
  };

  useEffect(() => {
    fetchBadgeCounts();
    const unsubChat = eventEmitter.on(EVENTS.CHAT_UPDATED, fetchBadgeCounts);
    const unsubReq = eventEmitter.on(EVENTS.REQUEST_UPDATED, fetchBadgeCounts);
    const unsubMatch = eventEmitter.on(EVENTS.MATCH_UPDATED, fetchBadgeCounts);
    return () => {
      unsubChat();
      unsubReq();
      unsubMatch();
    };
  }, []);

  useEffect(() => {
    fetchBadgeCounts();
    Animated.spring(slideAnim, {
      toValue: state.index * TAB_WIDTH + INDICATOR_OFFSET,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();
  }, [state.index]);

  return (
    <View style={styles.tabBarContainer}>
      {/* Sliding indicator line at the top, perfectly centered and offset to padding */}
      <Animated.View
        style={[
          styles.slidingIndicator,
          {
            width: INDICATOR_WIDTH,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={theme.gradientAccent}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const icons = ICONS[route.name];
        const iconName = isFocused ? icons.on : icons.off;

        const iconColor = isFocused 
          ? (isDark ? '#0D0F1A' : '#fff') 
          : (isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.35)');

        const labelColor = isFocused 
          ? (isDark ? '#fff' : '#0D0F1A') 
          : (isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.35)');

        const badgeNum = route.name === 'Chat' ? unreadCount : (route.name === 'Matches' ? requestCount : 0);

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.8}
          >
            {/* Icon wrapper — active states have a circular white/dark background */}
            <View style={[styles.iconContainer, isFocused && styles.iconContainerActive]}>
              <Ionicons
                name={iconName}
                size={18}
                color={iconColor}
              />
              {badgeNum > 0 && (
                <View style={styles.badgePill}>
                  <Text style={styles.badgeText}>{badgeNum > 99 ? '99+' : badgeNum}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, { color: labelColor }]}>
              {route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Discover"  component={DiscoverScreen}    />
      <Tab.Screen name="Matches"   component={MatchesScreen}     />
      <Tab.Screen name="Chat"      component={ChatScreen}        />
      <Tab.Screen name="Date"      component={DatePlannerScreen} />
      <Tab.Screen name="Vibes"     component={VibesScreen}       />
    </Tab.Navigator>
  );
}

const getStyles = (theme) => StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 20,
    left: 16,
    right: 16,
    height: 72,
    flexDirection: 'row',
    backgroundColor: theme.isDark ? 'rgba(14, 14, 20, 1)' : 'rgba(255, 255, 255, 0.96)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: theme.isDark ? 0.35 : 0.08,
    shadowRadius: 15,
    elevation: 10,
  },
  slidingIndicator: {
    position: 'absolute',
    top: 0,
    left: 6, // Match the paddingHorizontal offset of the container
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 8 : 6,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconContainerActive: {
    backgroundColor: theme.isDark ? '#fff' : '#0D0F1A',
    borderRadius:50,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  badgePill: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF007F',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: theme.isDark ? '#0D0F1A' : '#FFFFFF',
    zIndex: 99,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 11,
  },
});