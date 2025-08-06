import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

type BackButtonProps = {
  onPress: () => void;
  color?: string;
  style?: object;
};

export default function BackButton({ onPress, color = '#00B88D', style }: BackButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.backButton, style]}
      onPress={onPress}
      accessibilityLabel="Back"
      accessibilityRole="button"
    >
      <Ionicons name="arrow-back" size={24} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
});