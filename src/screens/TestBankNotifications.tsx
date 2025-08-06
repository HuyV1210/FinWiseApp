import React from 'react';
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

export default function TestBankNotifications() {
  const testScenarios = [
    {
      title: '🏧 Vietcombank - Coffee Purchase',
      description: 'Tests expense transaction from Grab ride',
      action: () => bankNotificationService.testVietcombankNotification(),
    },
    {
      title: '☕ Techcombank - Coffee Purchase',
      description: 'Tests expense transaction from coffee shop',
      action: () => bankNotificationService.testTechcombankNotification(),
    },
    {
      title: '🇺🇸 Chase Bank - Starbucks',
      description: 'Tests US dollar transaction',
      action: () => bankNotificationService.testUSBankNotification(),
    },
    {
      title: '💰 Salary Income',
      description: 'Tests income transaction detection',
      action: () => bankNotificationService.testIncomeNotification(),
    },
  ];

  const initializeService = async () => {
    const success = await bankNotificationService.initialize();
    Alert.alert(
      'Service Status',
      success ? 'Bank notification service initialized successfully!' : 'Failed to initialize service'
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
        <Text style={styles.title}>🧪 Bank Notification Testing</Text>
        <Text style={styles.subtitle}>
          Test different bank notification scenarios to see the preview modal in action
        </Text>

        <TouchableOpacity style={styles.initButton} onPress={initializeService}>
          <Text style={styles.initButtonText}>🚀 Initialize Service</Text>
        </TouchableOpacity>

        <View style={styles.scenariosContainer}>
          <Text style={styles.sectionTitle}>Test Scenarios</Text>
          
          {testScenarios.map((scenario, index) => (
            <TouchableOpacity
              key={index}
              style={styles.scenarioButton}
              onPress={() => {
                console.log(`Testing: ${scenario.title}`);
                scenario.action();
                Alert.alert(
                  'Test Triggered',
                  `${scenario.title}\n\nCheck the console and look for the transaction preview modal!`
                );
              }}
            >
              <Text style={styles.scenarioTitle}>{scenario.title}</Text>
              <Text style={styles.scenarioDescription}>{scenario.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>📋 How to Test</Text>
          <Text style={styles.instructionText}>
            1. Tap "Initialize Service" to start listening
          </Text>
          <Text style={styles.instructionText}>
            2. Choose a test scenario to simulate
          </Text>
          <Text style={styles.instructionText}>
            3. Watch for the transaction preview modal
          </Text>
          <Text style={styles.instructionText}>
            4. Confirm or cancel the transaction
          </Text>
          <Text style={styles.instructionText}>
            5. Check your transactions list
          </Text>
        </View>

        <View style={styles.realTestingContainer}>
          <Text style={styles.realTestingTitle}>🏦 Real Testing</Text>
          <Text style={styles.realTestingText}>
            For real bank notifications, you'll need to:
          </Text>
          <Text style={styles.instructionText}>
            • Enable notification access in Android settings
          </Text>
          <Text style={styles.instructionText}>
            • Make actual transactions with your bank apps
          </Text>
          <Text style={styles.instructionText}>
            • Check if your bank's package name is in the whitelist
          </Text>
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
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  initButton: {
    backgroundColor: '#3498DB',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignSelf: 'center',
    marginBottom: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  initButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scenariosContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
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
  instructionsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#34495E',
    marginBottom: 5,
    paddingLeft: 10,
  },
  realTestingContainer: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    padding: 20,
    borderRadius: 15,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.3)',
  },
  realTestingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
  },
  realTestingText: {
    fontSize: 14,
    color: '#34495E',
    marginBottom: 10,
  },
});
