import React from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable, Linking, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function HelpSupportModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.helpModalOverlay}>
        <View style={styles.helpModalContent}>
          <Text style={styles.helpTitle}>Help & Support</Text>
          <Text style={styles.helpSubtitle}>How can we assist you?</Text>
          <View style={styles.helpSection}>
            <Text style={styles.helpSectionTitle}>Contact Us</Text>
            <TouchableOpacity style={styles.helpContactBtn} onPress={() => Linking.openURL('mailto:support@finwise.app')}>
              <Icon name="email" size={18} color="#00B88D" style={{marginRight: 8}} />
              <Text style={styles.helpContactText}>support@finwise.app</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.helpContactBtn} onPress={() => Linking.openURL('https://finwise.app/support')}>
              <Icon name="language" size={18} color="#00B88D" style={{marginRight: 8}} />
              <Text style={styles.helpContactText}>finwise.app/support</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.helpSection}>
            <Text style={styles.helpSectionTitle}>FAQ</Text>
            <Text style={styles.helpFaqQ}>• How do I add a transaction?</Text>
            <Text style={styles.helpFaqA}>Just chat with FinWise or use the Add Transaction on the Add screen.</Text>
            <Text style={styles.helpFaqQ}>• Is my data secure?</Text>
            <Text style={styles.helpFaqA}>Yes, your data is encrypted and never shared without your consent.</Text>
            <Text style={styles.helpFaqQ}>• How do I reset my password?</Text>
            <Text style={styles.helpFaqA}>Go to Login → Forgot Password and follow the instructions.</Text>
          </View>
          <Pressable style={styles.helpCloseBtn} onPress={onClose}>
            <Text style={styles.helpCloseText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  helpModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpModalContent: {
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
  helpTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#00B88D',
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: 'Poppins-SemiBold',
  },
  helpSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
  helpSection: {
    marginBottom: 18,
  },
  helpSectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#00B88D',
    marginBottom: 6,
    fontFamily: 'Poppins-SemiBold',
  },
  helpContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  helpContactText: {
    fontSize: 14,
    color: '#00B88D',
    textDecorationLine: 'underline',
    fontFamily: 'Poppins-Regular',
  },
  helpFaqQ: {
    fontSize: 13,
    color: '#333',
    marginTop: 4,
    fontFamily: 'Poppins-SemiBold',
  },
  helpFaqA: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    fontFamily: 'Poppins-Regular',
  },
  helpCloseBtn: {
    marginTop: 10,
    backgroundColor: '#00B88D',
    borderRadius: 8,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 32,
  },
  helpCloseText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'Poppins-SemiBold',
  },
});