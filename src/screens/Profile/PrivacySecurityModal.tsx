import React from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable, StyleSheet, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function PrivacySecurityModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Privacy & Security</Text>
          <Text style={styles.subtitle}>Your data is always protected.</Text>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Data</Text>
            <Text style={styles.text}>• All your financial data is encrypted in transit and at rest.</Text>
            <Text style={styles.text}>• Only you have access to your personal information.</Text>
            <Text style={styles.text}>• We never sell or share your data without your consent.</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security Features</Text>
            <Text style={styles.text}>• Secure authentication with Firebase.</Text>
            <Text style={styles.text}>• Automatic logout after inactivity.</Text>
            <Text style={styles.text}>• Regular security updates and monitoring.</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Learn More</Text>
            <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openURL('https://finwise.app/privacy')}>
              <Icon name="lock" size={18} color="#00B88D" style={{marginRight: 8}} />
              <Text style={styles.linkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openURL('https://finwise.app/security')}>
              <Icon name="security" size={18} color="#00B88D" style={{marginRight: 8}} />
              <Text style={styles.linkText}>Security Practices</Text>
            </TouchableOpacity>
          </View>
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
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#00B88D',
    marginBottom: 6,
    fontFamily: 'Poppins-SemiBold',
  },
  text: {
    fontSize: 13,
    color: '#333',
    marginBottom: 2,
    fontFamily: 'Poppins-Regular',
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#00B88D',
    textDecorationLine: 'underline',
    fontFamily: 'Poppins-Regular',
  },
  closeBtn: {
    marginTop: 10,
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