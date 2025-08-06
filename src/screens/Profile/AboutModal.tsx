import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function AboutModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>About FinWise</Text>
          <Text style={styles.desc}>FinWise helps you master your money with smart insights, intuitive tracking, and AI-powered financial guidance.</Text>
          <View style={styles.infoRow}>
            <Icon name="verified-user" size={18} color="#00B88D" style={{marginRight: 6}} />
            <Text style={styles.version}>Version 2.0.0 (2025)</Text>
          </View>
          <Text style={styles.feature}>• Secure, private, and always improving</Text>
          <Text style={styles.feature}>• Built for your financial wellness</Text>
          <Text style={styles.thank}>Thank you for being part of the FinWise community! 💚</Text>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '88%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#00B88D',
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: 'Poppins-SemiBold',
  },
  desc: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  version: {
    fontSize: 14,
    color: '#00B88D',
    fontFamily: 'Poppins-SemiBold',
  },
  feature: {
    fontSize: 13,
    color: '#333',
    marginBottom: 2,
    fontFamily: 'Poppins-Regular',
  },
  thank: {
    fontSize: 13,
    color: '#00B88D',
    marginTop: 10,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Poppins-SemiBold',
  },
  closeBtn: {
    marginTop: 4,
    backgroundColor: '#00B88D',
    borderRadius: 8,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 32,
  },
  closeText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'Poppins-SemiBold',
  },
});