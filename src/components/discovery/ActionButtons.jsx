// src/components/discovery/ActionButtons.js
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ActionButtons({ onLike, onPass, onSuperLike }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, styles.passButton]} 
        onPress={onPass}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={30} color="#FF6B6B" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.superLikeButton]} 
        onPress={onSuperLike}
        activeOpacity={0.7}
      >
        <Ionicons name="star" size={26} color="#4A90E2" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.likeButton]} 
        onPress={onLike}
        activeOpacity={0.7}
      >
        <Ionicons name="heart" size={30} color="#4CAF50" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 20,
    backgroundColor: '#f5f5f5',
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  passButton: {
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  likeButton: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  superLikeButton: {
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
});