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
import LinearGradient from 'react-native-linear-gradient';

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
    <LinearGradient
      colors={['#00D09E', '#FFFFFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
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
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 16,
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
    marginBottom: 16,
    paddingTop: 20, // Optional: for top spacing like NotificationScreen
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
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
});
