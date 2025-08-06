import React from 'react';
import { View, TouchableOpacity, Text, Alert, StyleSheet } from 'react-native';
import { DeviceEventEmitter } from 'react-native';

export default function SimpleNotificationTest() {
  const testDirectEvent = () => {
    console.log('🧪 Testing direct event emission...');
    
    // Create mock transaction data
    const mockTransaction = {
      amount: 150000,
      type: 'expense',
      description: 'GRAB*TRIP Ho Chi Minh',
      category: 'Transport',
      currency: 'VND',
    };
    
    // Directly emit the event that ChatScreen is listening for
    DeviceEventEmitter.emit('TransactionAutoAdded', mockTransaction);
    
    Alert.alert(
      'Test Event Emitted',
      'Check your ChatScreen - the preview modal should appear!\n\nTransaction: -150,000 VND for Grab ride'
    );
  };

  const testIncomeEvent = () => {
    console.log('🧪 Testing income transaction...');
    
    const mockTransaction = {
      amount: 5000000,
      type: 'income',
      description: 'Salary transfer from COMPANY ABC',
      category: 'Salary',
      currency: 'VND',
    };
    
    DeviceEventEmitter.emit('TransactionAutoAdded', mockTransaction);
    
    Alert.alert(
      'Income Test Emitted',
      'Check your ChatScreen - the preview modal should appear!\n\nTransaction: +5,000,000 VND salary'
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚀 Direct Event Test</Text>
      <Text style={styles.subtitle}>
        These buttons will directly trigger the preview modal
      </Text>
      
      <TouchableOpacity style={styles.testButton} onPress={testDirectEvent}>
        <Text style={styles.buttonText}>🚗 Test Expense (Grab)</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.testButton} onPress={testIncomeEvent}>
        <Text style={styles.buttonText}>💰 Test Income (Salary)</Text>
      </TouchableOpacity>
      
      <Text style={styles.instructions}>
        Instructions:{'\n'}
        1. Tap a test button{'\n'}
        2. Go to ChatScreen{'\n'}
        3. Preview modal should appear{'\n'}
        4. Review and save the transaction
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#7f8c8d',
  },
  testButton: {
    backgroundColor: '#3498db',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  instructions: {
    marginTop: 30,
    padding: 15,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: 10,
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
});
