import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { auth, firestore } from '../../services/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { fcmService } from '../../services/fcmService';

interface NotificationSettings {
  budgetAlerts: boolean;
  goalAchievements: boolean;
  transactionConfirmations: boolean;
  dailyReminders: boolean;
  weeklySummaries: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
}

const defaultSettings: NotificationSettings = {
  budgetAlerts: true,
  goalAchievements: true,
  transactionConfirmations: true,
  dailyReminders: false,
  weeklySummaries: true,
  pushNotifications: true,
  inAppNotifications: true,
};

export default function NotificationSettingsScreen() {
  const navigation = useNavigation();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [fcmInitialized, setFcmInitialized] = useState(false);
  const [fcmConfigured, setFcmConfigured] = useState(false);

  useEffect(() => {
    loadSettings();
    loadFCMToken();
    checkFCMStatus();
  }, []);

  const checkFCMStatus = () => {
    const status = fcmService.getStatusDetails();
    setFcmInitialized(status.initialized);
    setFcmConfigured(status.configured);
    console.log('🔍 FCM Status Check:', status);
  };

  const loadFCMToken = async () => {
    try {
      const token = fcmService.getFCMTokenValue();
      setFcmToken(token);
      console.log('🔍 FCM Token Check - Token exists:', !!token);
    } catch (error) {
      console.error('Error loading FCM token:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const settingsRef = doc(firestore, 'userSettings', user.uid);
      const settingsDoc = await getDoc(settingsRef);

      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        if (data.notifications) {
          setSettings({ ...defaultSettings, ...data.notifications });
        }
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const settingsRef = doc(firestore, 'userSettings', user.uid);
      const settingsDoc = await getDoc(settingsRef);

      if (settingsDoc.exists()) {
        await updateDoc(settingsRef, {
          notifications: newSettings,
          updatedAt: new Date(),
        });
      } else {
        await setDoc(settingsRef, {
          userId: user.uid,
          notifications: newSettings,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      Alert.alert('Success', 'Notification settings saved successfully!');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      Alert.alert('Error', 'Failed to save notification settings. Please try again.');
    }
  };

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const SettingItem = ({ 
    title, 
    description, 
    value, 
    onValueChange, 
    icon 
  }: {
    title: string;
    description: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    icon: string;
  }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Icon name={icon} size={24} color="#00B88D" style={styles.settingIcon} />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E0E0E0', true: '#00B88D' }}
        thumbColor={value ? '#FFFFFF' : '#F4F4F4'}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Alert Types</Text>
        
        <SettingItem
          title="Budget Alerts"
          description="Get notified when you exceed your budget limits"
          value={settings.budgetAlerts}
          onValueChange={(value) => updateSetting('budgetAlerts', value)}
          icon="account-balance-wallet"
        />

        <SettingItem
          title="Goal Achievements"
          description="Celebrate when you reach your savings goals"
          value={settings.goalAchievements}
          onValueChange={(value) => updateSetting('goalAchievements', value)}
          icon="emoji-events"
        />

        <SettingItem
          title="Transaction Confirmations"
          description="Confirm when transactions are added successfully"
          value={settings.transactionConfirmations}
          onValueChange={(value) => updateSetting('transactionConfirmations', value)}
          icon="receipt-long"
        />

        <SettingItem
          title="Daily Reminders"
          description="Daily tips and reminders about your finances"
          value={settings.dailyReminders}
          onValueChange={(value) => updateSetting('dailyReminders', value)}
          icon="today"
        />

        <SettingItem
          title="Weekly Summaries"
          description="Weekly spending reports and insights"
          value={settings.weeklySummaries}
          onValueChange={(value) => updateSetting('weeklySummaries', value)}
          icon="assessment"
        />

        <Text style={styles.sectionTitle}>Delivery Methods</Text>

        <SettingItem
          title="Push Notifications"
          description="Receive notifications even when app is closed"
          value={settings.pushNotifications}
          onValueChange={(value) => updateSetting('pushNotifications', value)}
          icon="notifications"
        />

        <SettingItem
          title="In-App Notifications"
          description="Show notifications within the app"
          value={settings.inAppNotifications}
          onValueChange={(value) => updateSetting('inAppNotifications', value)}
          icon="notifications-none"
        />

        {/* FCM Debug Section */}
        <Text style={styles.sectionTitle}>Push Notification Debug</Text>
        
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>FCM Service Status</Text>
          <Text style={styles.debugText}>
            Initialization: {fcmInitialized ? '✅ Initialized' : '❌ Not initialized'}
          </Text>
          <Text style={styles.debugText}>
            Configuration: {fcmConfigured ? '✅ Valid' : '❌ Missing'}
          </Text>
          <Text style={styles.debugText}>
            Token: {fcmToken ? '✅ Token received' : '❌ No token'}
          </Text>
          
          {/* Status explanation */}
          {!fcmConfigured && (
            <Text style={styles.debugWarningText}>
              ⚠️ FCM configuration missing. This is expected for development without google-services.json. In-app notifications will still work.
            </Text>
          )}
          
          {fcmConfigured && !fcmInitialized && (
            <Text style={styles.debugWarningText}>
              ⚠️ FCM not initialized. Try the "Reinitialize FCM" button below.
            </Text>
          )}
          
          {fcmConfigured && fcmInitialized && !fcmToken && (
            <Text style={styles.debugWarningText}>
              ⚠️ FCM initialized but no token received. Check network connection and Firebase configuration.
            </Text>
          )}
          
          {fcmToken && (
            <>
              <Text style={styles.debugText}>✅ Push notifications should work!</Text>
              <Text style={styles.debugTokenText} numberOfLines={3}>
                Token: {fcmToken.substring(0, 50)}...
              </Text>
            </>
          )}
          
          <TouchableOpacity 
            style={styles.debugButton}
            onPress={async () => {
              try {
                console.log('🔄 Manual FCM reinitialization started...');
                await fcmService.reinitialize();
                await loadFCMToken();
                checkFCMStatus();
                Alert.alert('Success', 'FCM service reinitialized! Check status above.');
              } catch (error) {
                console.error('Reinitialize error:', error);
                Alert.alert('Error', 'Failed to reinitialize FCM service: ' + error.message);
              }
            }}
          >
            <Text style={styles.debugButtonText}>Reinitialize FCM</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.debugButton, { marginTop: 8, backgroundColor: '#4CAF50' }]}
            onPress={async () => {
              try {
                const user = auth.currentUser;
                if (user) {
                  // Test notification by adding directly to Firestore
                  const { addDoc, collection } = await import('firebase/firestore');
                  await addDoc(collection(firestore, 'notifications'), {
                    userId: user.uid,
                    type: 'test',
                    title: 'Test Notification 🚀',
                    message: 'This is a test push notification from FinWise!',
                    data: { navigationTarget: 'Home' },
                    read: false,
                    createdAt: new Date(),
                  });
                  Alert.alert('Success', 'Test notification sent! Check your notifications.');
                }
              } catch (error) {
                console.error('Test notification error:', error);
                Alert.alert('Error', 'Failed to send test notification');
              }
            }}
          >
            <Text style={styles.debugButtonText}>Send Test Notification</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    marginTop: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  debugContainer: {
    backgroundColor: '#F8F9FA',
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  debugWarningText: {
    fontSize: 14,
    color: '#F57C00',
    marginBottom: 12,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  debugTokenText: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  debugButton: {
    backgroundColor: '#00B88D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  debugButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
