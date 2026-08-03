// src/navigation/AuthNavigator.jsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LandingScreen  from '../screens/LandingScreen';
import LoginScreen    from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

const Stack = createStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Landing"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#080010' },
        cardStyleInterpolator: ({ current, next, layouts }) => ({
          cardStyle: {
            opacity: current.progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
            transform: [{
              translateX: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [layouts.screen.width * 0.15, 0],
              }),
            }],
          },
          overlayStyle: {
            opacity: current.progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }),
          },
        }),
      }}
    >
      <Stack.Screen name="Landing"  component={LandingScreen} />
      <Stack.Screen name="Login"    component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
