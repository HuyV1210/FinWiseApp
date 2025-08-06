// Add this code to any screen or create a test button anywhere

import { DeviceEventEmitter, Alert } from 'react-native';

const testNotificationDirectly = () => {
  console.log('🧪 Direct test starting...');
  
  const mockTransaction = {
    amount: 150000,
    type: 'expense',
    description: 'GRAB*TRIP Ho Chi Minh',
    category: 'Transport',
    currency: 'VND',
  };
  
  console.log('🔄 Emitting event...');
  DeviceEventEmitter.emit('TransactionAutoAdded', mockTransaction);
  
  Alert.alert('Test Sent', 'Check ChatScreen for the preview modal!');
};

// Use this in any TouchableOpacity:
// <TouchableOpacity onPress={testNotificationDirectly}>
//   <Text>🧪 Test Notification</Text>
// </TouchableOpacity>
