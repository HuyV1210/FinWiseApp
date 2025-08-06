import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { auth, firestore, app } from './firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

export class FCMService {
  private static instance: FCMService;
  private fcmToken: string | null = null;
  private isInitialized = false;
  private hasValidConfiguration = false;

  static getInstance(): FCMService {
    if (!FCMService.instance) {
      FCMService.instance = new FCMService();
    }
    return FCMService.instance;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('📱 Starting FCM initialization...');
      
      // Check if React Native Firebase is properly configured
      const configurationValid = await this.checkFirebaseConfiguration();
      if (!configurationValid) {
        console.warn('⚠️ FCM configuration not available, skipping FCM setup');
        this.isInitialized = true;
        return;
      }
      
      // Wait for auth state to be ready
      await this.waitForAuth();
      console.log('📱 Auth ready, proceeding...');
      
      // Request permission for notifications (this should work even if Firebase isn't ready)
      const permissionGranted = await this.requestUserPermission();
      console.log('📱 Permission granted:', permissionGranted);
      
      // Try to get FCM token with simple retry logic
      try {
        await this.getFCMTokenWithRetry();
      } catch (tokenError) {
        console.warn('⚠️ FCM token retrieval failed, but continuing:', tokenError.message);
      }
      
      // Try to set up message handlers with simple retry logic
      try {
        this.setupMessageHandlers();
      } catch (handlerError) {
        console.warn('⚠️ Message handler setup failed, but continuing:', handlerError.message);
      }
      
      this.isInitialized = true;
      console.log('📱 FCM Service initialization completed (some features may be limited)');
    } catch (error) {
      console.error('❌ FCM Service initialization failed:', error);
      // Still mark as initialized to prevent infinite retries
      this.isInitialized = true;
    }
  }

  private async checkFirebaseConfiguration(): Promise<boolean> {
    try {
      // Simple test to see if React Native Firebase is configured
      const testInstance = messaging();
      
      // Try to check if the app is configured properly
      await testInstance.hasPermission();
      
      this.hasValidConfiguration = true;
      console.log('✅ Firebase configuration appears valid');
      return true;
    } catch (error) {
      console.warn('⚠️ Firebase configuration check failed:', error.message);
      this.hasValidConfiguration = false;
      return false;
    }
  }

  private async getFCMTokenWithRetry(): Promise<string | null> {
    if (!this.hasValidConfiguration) {
      console.log('📱 Skipping FCM token retrieval - configuration not valid');
      return null;
    }

    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`📱 Attempting to get FCM token (attempt ${attempts}/${maxAttempts})...`);
        
        const messagingInstance = messaging();
        const token = await messagingInstance.getToken();
        
        if (token) {
          this.fcmToken = token;
          console.log('� FCM Token received successfully');
          await this.saveTokenToFirestore(token);
          return token;
        } else {
          console.log('⚠️ No FCM token received');
        }
        
        return token;
      } catch (error) {
        console.log(`� FCM token attempt ${attempts} failed:`, error.message);
        
        if (attempts >= maxAttempts) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
      }
    }
    
    return null;
  }

  private async waitForAuth(): Promise<void> {
    return new Promise((resolve) => {
      if (auth.currentUser) {
        resolve();
        return;
      }

      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          unsubscribe();
          resolve();
        }
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        unsubscribe();
        resolve(); // Continue even without auth
      }, 10000);
    });
  }

  async requestUserPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        // Request notification permission for Android 13+
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true; // Android 12 and below don't need explicit permission
      }

      // iOS permission request
      const messagingInstance = messaging();
      const authStatus = await messagingInstance.requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        Alert.alert(
          'Notification Permission',
          'Please enable notifications in Settings to receive important updates about your finances.',
          [{ text: 'OK' }]
        );
      }

      return enabled;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async saveTokenToFirestore(token: string) {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('⚠️ No authenticated user, FCM token not saved');
        return;
      }

      const userRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        await updateDoc(userRef, {
          fcmToken: token,
          fcmTokenUpdatedAt: new Date(),
        });
      } else {
        await setDoc(userRef, {
          fcmToken: token,
          fcmTokenUpdatedAt: new Date(),
          userId: user.uid,
          email: user.email,
        }, { merge: true });
      }

      console.log('💾 FCM token saved to Firestore');
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  }

  setupMessageHandlers() {
    if (!this.hasValidConfiguration) {
      console.log('📱 Skipping message handlers setup - configuration not valid');
      return;
    }

    try {
      // Direct messaging setup with try-catch
      const messagingInstance = messaging();
      
      // Handle messages when app is in background/quit state
      messagingInstance.setBackgroundMessageHandler(async (remoteMessage) => {
        console.log('📱 Background message received:', remoteMessage);
        // You can handle background actions here if needed
      });

      // Handle messages when app is in foreground
      messagingInstance.onMessage(async (remoteMessage) => {
        console.log('📱 Foreground message received:', remoteMessage);
        
        // Show local notification or update UI
        if (remoteMessage.notification) {
          Alert.alert(
            remoteMessage.notification.title || 'FinWise',
            remoteMessage.notification.body || '',
            [{ text: 'OK' }]
          );
        }
      });

      // Handle notification open when app is in background
      messagingInstance.onNotificationOpenedApp((remoteMessage) => {
        console.log('📱 Notification opened app:', remoteMessage);
        this.handleNotificationNavigation(remoteMessage);
      });

      // Handle notification open when app is killed
      messagingInstance
        .getInitialNotification()
        .then((remoteMessage) => {
          if (remoteMessage) {
            console.log('📱 App opened from killed state:', remoteMessage);
            this.handleNotificationNavigation(remoteMessage);
          }
        });

      // Listen for token refresh
      messagingInstance.onTokenRefresh((token) => {
        console.log('📱 FCM Token refreshed:', token);
        this.fcmToken = token;
        this.saveTokenToFirestore(token);
      });
      
      console.log('📱 Message handlers set up successfully');
    } catch (error) {
      console.error('❌ Error setting up message handlers:', error);
      // Don't fail completely, just log the error
    }
  }

  handleNotificationNavigation(remoteMessage: any) {
    // Handle navigation based on notification data
    const { data } = remoteMessage;
    
    if (data?.navigationTarget) {
      // You can implement navigation logic here
      console.log('📱 Navigate to:', data.navigationTarget);
      // Example: NavigationService.navigate(data.navigationTarget);
    }
  }

  async sendPushNotification(
    targetUserId: string,
    title: string,
    body: string,
    data?: any
  ): Promise<boolean> {
    try {
      // Get the target user's FCM token
      const userRef = doc(firestore, 'users', targetUserId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.log('User document not found for FCM');
        return false;
      }

      const userData = userDoc.data();
      const fcmToken = userData.fcmToken;

      if (!fcmToken) {
        console.log('No FCM token found for user');
        return false;
      }

      // In a real app, you would send this to your backend server
      // which would then send the push notification via FCM Admin SDK
      console.log('📱 Would send push notification:', {
        token: fcmToken,
        title,
        body,
        data
      });

      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  getFCMTokenValue(): string | null {
    return this.fcmToken;
  }

  async refreshToken(): Promise<string | null> {
    try {
      await messaging().deleteToken();
      return await this.getFCMTokenWithRetry();
    } catch (error) {
      console.error('Error refreshing FCM token:', error);
      return null;
    }
  }

  async reinitialize(): Promise<void> {
    this.isInitialized = false;
    this.fcmToken = null;
    await this.initialize();
  }

  getInitializationStatus(): boolean {
    return this.isInitialized;
  }

  getConfigurationStatus(): boolean {
    return this.hasValidConfiguration;
  }

  getStatusDetails(): { initialized: boolean; configured: boolean; hasToken: boolean } {
    return {
      initialized: this.isInitialized,
      configured: this.hasValidConfiguration,
      hasToken: !!this.fcmToken
    };
  }
}

export const fcmService = FCMService.getInstance();
