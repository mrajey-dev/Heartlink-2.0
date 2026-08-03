// src/hooks/useSwipe.js
import { useRef } from 'react';
import { Animated, PanResponder, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export default function useSwipe({ onSwipeLeft, onSwipeRight, onSwipeUp, threshold = 100 } = {}) {
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      if (g.dy < -30 && Math.abs(g.dy) > Math.abs(g.dx) * 1.4) return;
      pan.setValue({ x: g.dx, y: 0 });
    },
    onPanResponderRelease: (_, g) => {
      if (g.dy < -threshold && Math.abs(g.dy) > Math.abs(g.dx)) {
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        onSwipeUp?.();
      } else if (g.dx > threshold) {
        Animated.timing(pan, { toValue: { x: width * 1.5, y: 0 }, duration: 320, useNativeDriver: false })
          .start(() => { pan.setValue({ x: 0, y: 0 }); onSwipeRight?.(); });
      } else if (g.dx < -threshold) {
        Animated.timing(pan, { toValue: { x: -width * 1.5, y: 0 }, duration: 320, useNativeDriver: false })
          .start(() => { pan.setValue({ x: 0, y: 0 }); onSwipeLeft?.(); });
      } else {
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 5 }).start();
      }
    },
  })).current;

  const rotate = pan.x.interpolate({ inputRange: [-width, 0, width], outputRange: ['-14deg', '0deg', '14deg'] });

  return { pan, panResponder, rotate };
}
