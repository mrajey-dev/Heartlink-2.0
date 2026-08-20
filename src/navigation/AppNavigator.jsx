// src/navigation/AppNavigator.jsx
import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import MainTabNavigator from './MainTabNavigator';
import AuthNavigator from './AuthNavigator';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RequestsScreen from '../screens/RequestsScreen';
import RestaurantDetailScreen from '../screens/RestaurantDetailScreen';
import PlansScreen from '../screens/PlansScreen';
import SettingsScreen from '../screens/SettingsScreen';
import RadarLoader from '../components/RadarLoader';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../theme/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import InAppNotificationBanner from '../components/InAppNotificationBanner';
import WelcomeOfferModal from '../components/WelcomeOfferModal';

import { navigationRef } from './navigationRef';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isDark, theme } = useTheme();
  const { bannerVisible, bannerData, dismissNotification } = useNotification();

  // 5-second RadarLoader display ONLY when user is authenticated (after login, account creation, or refresh)
  const [showRadar, setShowRadar] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setShowRadar(true);
      const timer = setTimeout(() => {
        setShowRadar(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowRadar(false);
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: theme.bgDark }} />;
  }

  if (isAuthenticated && showRadar) {
    return <RadarLoader />;
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />
      <NavigationContainer ref={navigationRef}>
        <InAppNotificationBanner
          visible={bannerVisible}
          data={bannerData}
          onDismiss={dismissNotification}
        />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: theme.bgDark },
          }}
        >
          {isAuthenticated ? (
            <>
              <Stack.Screen name="Main" component={MainTabNavigator} />
              <Stack.Screen
                name="ChatDetail"
                component={ChatDetailScreen}
                options={{ presentation: 'card' }}
              />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="Requests" component={RequestsScreen} />
              <Stack.Screen name="Notifications" component={RequestsScreen} />
              <Stack.Screen name="RestaurantDetail" component={RestaurantDetailScreen} />
              <Stack.Screen name="Plans" component={PlansScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
            </>
          ) : (
            <Stack.Screen
              name="Auth"
              component={AuthNavigator}
              options={{ animationTypeForReplace: 'pop' }}
            />
          )}
        </Stack.Navigator>
        {isAuthenticated && <WelcomeOfferModal />}
      </NavigationContainer>
    </>
  );
}