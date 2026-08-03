import React from 'react';
import { View } from 'react-native';
export default function Card({ children, style }) {
  return <View style={style}>{children}</View>;
}
