import { NativeModules, DeviceEventEmitter, PermissionsAndroid, Platform, AppState, Alert, Linking } from 'react-native';
import { addDoc, collection } from 'firebase/firestore';
import { auth, firestore } from './firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ParsedTransaction {
  amount: number;
  type: 'income' | 'expense';
  description: string;
  category?: string;
  bankName?: string;
  currency?: string;
}

class BankNotificationService {
  private isListening = false;
  private eventListener: any = null;
  private appStateListener: any = null;
  private static STORAGE_KEY = 'pending_bank_notifications';
  private openAppSettings() {
    Linking.openSettings();
  }

  async initialize(): Promise<boolean> {
    try {
      // Process any notifications that were missed while app was closed
      await this.processPendingNotifications();
      
      // Set up app state monitoring
      this.setupAppStateMonitoring();
      
      if (Platform.OS === 'android') {
        const enabled = await NativeModules.BankNotificationModule.isNotificationListenerEnabled();
        if (enabled) {
          this.startListening();
          return true;
        } else {
          Alert.alert(
            'Permission Required',
            'Please enable notification access for FinWise in system settings to track bank transactions.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => this.openAppSettings() },
            ]
          );
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error('Error initializing bank notification service:', error);
      return false;
    }
  }

  private setupAppStateMonitoring() {
    this.appStateListener = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        this.processPendingNotifications();
      } else if (nextAppState === 'background') {
        return;
      }
    });
  }

  private async processPendingNotifications() {
    try {
      const pending = await AsyncStorage.getItem(BankNotificationService.STORAGE_KEY);
      if (pending) {
        const notifications = JSON.parse(pending);
        
        console.log(`Processing ${notifications.length} pending bank notifications`);
        
        // Process each notification
        for (const notification of notifications) {
          await this.handleBankNotification(notification);
        }
        
        // Clear processed notifications
        await AsyncStorage.removeItem(BankNotificationService.STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error processing pending notifications:', error);
    }
  }

  private async storePendingNotification(notification: any) {
    try {
      const existing = await AsyncStorage.getItem(BankNotificationService.STORAGE_KEY);
      const notifications = existing ? JSON.parse(existing) : [];
      notifications.push({
        ...notification,
        receivedAt: new Date().toISOString()
      });
      await AsyncStorage.setItem(BankNotificationService.STORAGE_KEY, JSON.stringify(notifications));
      console.log('Stored pending bank notification for later processing');
    } catch (error) {
      console.error('Error storing pending notification:', error);
    }
  }

  startListening() {
    if (this.isListening) return;

    this.isListening = true;
    
    // Listen for bank notifications
    this.eventListener = DeviceEventEmitter.addListener(
      'BankNotificationReceived',
      this.handleBankNotification.bind(this)
    );

    console.log('Bank notification service started listening');
  }

  stopListening() {
    if (!this.isListening) return;

    this.isListening = false;
    
    if (this.eventListener) {
      this.eventListener.remove();
      this.eventListener = null;
    }

    if (this.appStateListener) {
      this.appStateListener.remove();
      this.appStateListener = null;
    }

    console.log('Bank notification service stopped listening');
  }

  private async handleBankNotification(notification: any) {
    try {
      console.log('Received bank notification:', notification);
      
      const { title, text, packageName } = notification;
      
      // Check if it's from a recognized bank app
      if (!this.isBankApp(packageName)) {
        return;
      }

      // Parse the notification text
      const parsedTransaction = this.parseNotificationText(text || title);
      
      if (parsedTransaction) {
        // Check if app is in foreground
        if (AppState.currentState === 'active') {
          // App is active - show preview modal immediately
          await this.processDetectedTransaction(parsedTransaction);
        } else {
          // App is backgrounded - store for later processing
          await this.storePendingNotification({
            ...notification,
            parsedTransaction
          });
        }
      }
    } catch (error) {
      console.error('Error handling bank notification:', error);
    }
  }

  private isBankApp(packageName: string): boolean {
    const bankApps = [
      'com.vietcombank',
      'com.techcombank',
      'com.mb.mbanking',
      'com.vnpay.mbanking',
      'com.chase.sig.android',
      'com.bankofamerica.digitalbanking',
      'com.wellsfargo.mobile',
      'com.citibank.mobile',
      // Add more bank package names as needed
    ];

    return bankApps.some(app => packageName.includes(app));
  }

  private parseNotificationText(text: string): ParsedTransaction | null {
    try {
      // Common patterns for bank notifications
      const patterns = [
        // Vietnamese banks
        /(?:Giao dich|GD)\s*[-:]?\s*([+-]?)([0-9,]+)\s*VND/i,
        /(?:Transaction|TXN)\s*[-:]?\s*([+-]?)([0-9,]+)\s*VND/i,
        // International patterns
        /(?:Transaction|Payment|Debit|Credit)\s*[-:]?\s*([+-]?)\$([0-9,]+\.?\d*)/i,
        /(?:Transaction|Payment|Debit|Credit)\s*[-:]?\s*([+-]?)€([0-9,]+\.?\d*)/i,
        /(?:Transaction|Payment|Debit|Credit)\s*[-:]?\s*([+-]?)£([0-9,]+\.?\d*)/i,
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          const sign = match[1];
          const amount = parseFloat(match[2].replace(/,/g, ''));
          
          if (amount > 0) {
            return {
              amount,
              type: sign === '-' ? 'expense' : 'income',
              description: this.extractDescription(text),
              category: this.guessCategory(text),
              currency: this.extractCurrency(text),
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error parsing notification text:', error);
      return null;
    }
  }

  private extractDescription(text: string): string {
    // Try to extract meaningful description from notification
    const cleanText = text
      .replace(/GD:|Transaction:|TXN:|Payment:/gi, '')
      .replace(/[0-9,]+\s*(VND|USD|EUR|GBP)/gi, '')
      .trim();
    
    return cleanText.length > 5 ? cleanText : 'Bank Transaction';
  }

  private guessCategory(text: string): string {
    const categoryKeywords = {
      'Food & Dining': ['restaurant', 'food', 'cafe', 'dining', 'eat'],
      'Transport': ['taxi', 'uber', 'grab', 'bus', 'transport', 'fuel', 'gas'],
      'Shopping': ['shop', 'market', 'store', 'mall', 'purchase'],
      'Bills & Utilities': ['electric', 'water', 'internet', 'phone', 'bill'],
      'Entertainment': ['cinema', 'movie', 'game', 'entertainment'],
      'Health & Medical': ['hospital', 'clinic', 'pharmacy', 'medical'],
    };

    const lowerText = text.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return category;
      }
    }

    return 'Other';
  }

  private extractCurrency(text: string): string {
    if (text.includes('VND')) return 'VND';
    if (text.includes('USD') || text.includes('$')) return 'USD';
    if (text.includes('EUR') || text.includes('€')) return 'EUR';
    if (text.includes('GBP') || text.includes('£')) return 'GBP';
    
    return 'VND'; // Default
  }

  private async processDetectedTransaction(transaction: ParsedTransaction) {
    try {
      const user = auth.currentUser;
      if (!user) return;

      console.log('Processing detected transaction:', transaction);
      
      // Emit event to show preview modal instead of auto-saving
      DeviceEventEmitter.emit('TransactionAutoAdded', transaction);

    } catch (error) {
      console.error('Error processing detected transaction:', error);
    }
  }

  // Get monitoring status for UI display
  getStatus() {
    return {
      isListening: this.isListening,
      isAppActive: AppState.currentState === 'active',
      canMonitorBackground: Platform.OS === 'android',
      statusMessage: this.getStatusMessage()
    };
  }

  private getStatusMessage(): string {
    if (!this.isListening) {
      return 'Bank monitoring is disabled';
    }
    
    if (AppState.currentState === 'active') {
      return 'Actively monitoring bank notifications';
    } else {
      return 'Will monitor when app is active';
    }
  }

  // Check for pending notifications count
  async getPendingNotificationsCount(): Promise<number> {
    try {
      const pending = await AsyncStorage.getItem(BankNotificationService.STORAGE_KEY);
      if (pending) {
        const notifications = JSON.parse(pending);
        return notifications.length;
      }
      return 0;
    } catch (error) {
      console.error('Error getting pending notifications count:', error);
      return 0;
    }
  }
}
export const bankNotificationService = new BankNotificationService();
