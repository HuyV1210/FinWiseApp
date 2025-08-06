import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { bankNotificationService } from '../services/bankNotificationService';

export default function WorkingNotificationTester() {
  const [pendingCount, setPendingCount] = useState(0);
  const [serviceStatus, setServiceStatus] = useState<any>({});

  useEffect(() => {
    updateStatus();
    const interval = setInterval(updateStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async () => {
    const status = bankNotificationService.getStatus();
    const pending = await bankNotificationService.getPendingNotificationsCount();
    setServiceStatus(status);
    setPendingCount(pending);
  };

  const testScenarios = [
    {
      title: '🚗 Grab Ride (-150k VND)',
      description: 'Expense transaction with transport category',
      mockData: {
        amount: 150000,
        type: 'expense' as const,
        description: 'GRAB*TRIP Ho Chi Minh',
        category: 'Transport',
        currency: 'VND',
      }
    },
    {
      title: '☕ Coffee Shop (-85k VND)',
      description: 'Expense transaction with food category',
      mockData: {
        amount: 85000,
        type: 'expense' as const,
        description: 'HIGHLANDS COFFEE',
        category: 'Food & Dining',
        currency: 'VND',
      }
    },
    {
      title: '💰 Salary (+5M VND)',
      description: 'Income transaction',
      mockData: {
        amount: 5000000,
        type: 'income' as const,
        description: 'Salary transfer from COMPANY ABC',
        category: 'Salary',
        currency: 'VND',
      }
    },
    {
      title: '🇺🇸 Starbucks (-$25.50)',
      description: 'US dollar transaction',
      mockData: {
        amount: 25.50,
        type: 'expense' as const,
        description: 'STARBUCKS #1234',
        category: 'Food & Dining',
        currency: 'USD',
      }
    },
  ];

  const simulateNotification = (mockData: any) => {
    console.log('🧪 Simulating notification with data:', mockData);
    
    // Directly trigger the preview modal by emitting the event
    const { DeviceEventEmitter } = require('react-native');
    DeviceEventEmitter.emit('TransactionAutoAdded', mockData);
    
    Alert.alert(
      '✅ Notification Simulated',
      `${mockData.type === 'income' ? 'Income' : 'Expense'} of ${mockData.amount} ${mockData.currency}\n\nLook for the preview modal!`,
      [{ text: 'OK' }]
    );
  };

  return (
    <LinearGradient
      colors={['#00D09E', '#FFFFFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>🧪 Working Notification Tester</Text>
        
        {/* Service Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>📊 Service Status</Text>
          <Text style={styles.statusText}>
            Status: {serviceStatus.statusMessage || 'Unknown'}
          </Text>
          <Text style={styles.statusText}>
            Listening: {serviceStatus.isListening ? '✅ Yes' : '❌ No'}
          </Text>
          <Text style={styles.statusText}>
            App Active: {serviceStatus.isAppActive ? '✅ Yes' : '❌ No'}
          </Text>
          <Text style={styles.statusText}>
            Pending Notifications: {pendingCount}
          </Text>
        </View>

        {/* Test Scenarios */}
        <View style={styles.scenariosContainer}>
          <Text style={styles.sectionTitle}>🎯 Test Scenarios</Text>
          <Text style={styles.subtitle}>
            These will directly trigger the preview modal
          </Text>
          
          {testScenarios.map((scenario, index) => (
            <TouchableOpacity
              key={index}
              style={styles.scenarioButton}
              onPress={() => simulateNotification(scenario.mockData)}
            >
              <Text style={styles.scenarioTitle}>{scenario.title}</Text>
              <Text style={styles.scenarioDescription}>{scenario.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Real Implementation Notes */}
        <View style={styles.notesContainer}>
          <Text style={styles.notesTitle}>⚠️ Why Original Listener Doesn't Work</Text>
          <Text style={styles.noteText}>
            • React Native can't directly access system notifications
          </Text>
          <Text style={styles.noteText}>
            • Need native Android NotificationListenerService
          </Text>
          <Text style={styles.noteText}>
            • Current tests simulate what real notifications would do
          </Text>
          <Text style={styles.noteText}>
            • See BACKGROUND_MONITORING_SETUP.md for native implementation
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={async () => {
              await bankNotificationService.initialize();
              updateStatus();
              Alert.alert('Service Initialized', 'Bank notification service has been initialized');
            }}
          >
            <Text style={styles.actionButtonText}>🚀 Initialize Service</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              bankNotificationService.stopListening();
              updateStatus();
              Alert.alert('Service Stopped', 'Bank notification service has been stopped');
            }}
          >
            <Text style={styles.actionButtonText}>⏹️ Stop Service</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 20,
  },
  statusContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 208, 158, 0.3)',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#34495E',
    marginBottom: 5,
  },
  scenariosContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  scenarioButton: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  scenarioTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  scenarioDescription: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  notesContainer: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F39C12',
    marginBottom: 10,
  },
  noteText: {
    fontSize: 13,
    color: '#8B7300',
    marginBottom: 5,
    paddingLeft: 10,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  actionButton: {
    backgroundColor: '#3498DB',
    padding: 15,
    borderRadius: 10,
    flex: 0.48,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
