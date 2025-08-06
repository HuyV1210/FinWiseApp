import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function AppInfo() {
  return (
    <View style={styles.appInfo}>
      <Text style={[styles.appInfoText, {fontWeight: 'bold', fontSize: 16, color: '#00B88D'}]}>FinWise</Text>
      <Text style={[styles.appInfoText, {fontSize: 13, color: '#333', marginBottom: 2}]}>Smarter Money. Better Life.</Text>
      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 2}}>
        <Icon name="verified-user" size={16} color="#00B88D" style={{marginRight: 4}} />
        <Text style={[styles.versionText, {color: '#00B88D'}]}>v2.0.0</Text>
      </View>
      <Text style={[styles.versionText, {color: '#666'}]}>© 2025 FinWise. All rights reserved.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  appInfo: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  appInfoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: 'Poppins-Regular',
  },
  versionText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
});