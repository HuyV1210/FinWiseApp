import { AppState, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Singleton instance tracker
let singletonInstance: BankNotificationService | null = null;

class BankNotificationService {
  private static instance: BankNotificationService | null = null;
  private processedTransactions: Set<string> = new Set();
  private lastProcessedTimestamps: Record<string, number> = {};
  private DUPLICATE_WINDOW_MS = 60000; // 1 min cooldown
  private listeners: { [event: string]: Function[] } = {};
  private isInitialized = false;

  constructor() {
    if (singletonInstance) {
      return singletonInstance;
    }
    
    console.log('🆕 Creating new BankNotificationService instance');
    singletonInstance = this;
    this.initializeService();
  }

  private async initializeService() {
    if (this.isInitialized) return;
    
    console.log('🔧 Initializing BankNotificationService...');
    await this.loadProcessedTransactions();
    this.setupDeviceEventListener();
    this.isInitialized = true;
    console.log('✅ BankNotificationService initialized successfully');
  }

  private setupDeviceEventListener() {
    // Remove any existing listeners first
    DeviceEventEmitter.removeAllListeners('BankNotificationReceived');
    
    // Add our listener - using the correct event name from Kotlin
    DeviceEventEmitter.addListener('BankNotificationReceived', (notification) => {
      console.log('📨 Received DeviceEventEmitter BankNotificationReceived:', notification);
      this.handleBankNotification(notification);
    });
    
    console.log('👂 DeviceEventEmitter listener set up for BankNotificationReceived');
  }

  // Simple event emitter implementation for React Native
  public on(event: string, listener: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  public emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => listener(data));
    }
  }

  public off(event: string, listener: Function) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(l => l !== listener);
    }
  }

  private async loadProcessedTransactions() {
    try {
      const stored = await AsyncStorage.getItem('processedTransactions');
      if (stored) {
        this.processedTransactions = new Set(JSON.parse(stored));
      }
    } catch (error) {
      console.error('❌ Error loading processed transactions:', error);
    }
  }

  private async saveProcessedTransactions() {
    try {
      await AsyncStorage.setItem(
        'processedTransactions',
        JSON.stringify([...this.processedTransactions])
      );
    } catch (error) {
      console.error('❌ Error saving processed transactions:', error);
    }
  }

  private isBankApp(packageName: string): boolean {
    const bankPackages = [
      // Vietnamese banks
      'com.vietcombank',
      'com.techcombank', 
      'com.mb.mbanking',
      'com.vnpay.mbanking',
      'com.acb',
      'com.bidv',
      'com.vietinbank',
      'com.sacombank',
      'com.vpbank',
      'com.agribank',
      
      // International banks
      'com.chase.sig.android',
      'com.bankofamerica.digitalbanking',
      'com.wellsfargo.mobile',
      'com.citibank.mobile',
      
      // For testing
      'com.syslab.notigenerator',
      'com.test',
      'com.finwiseapp'
    ];
    
    return bankPackages.some(bank => packageName.includes(bank));
  }

  private generateNotificationHash(packageName: string, text: string): string {
    const stableText = (text || '')
      .replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '') // remove dates
      .replace(/so du.*$/i, '')                  // remove balance info
      .replace(/\s+/g, ' ')                      // normalize spaces
      .trim()
      .toLowerCase();

    // Simple hash function that works in React Native
    const combined = packageName + stableText;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private isGroupedNotification(text: string): boolean {
    return /transactions?\s+\d+\s+items?/i.test(text) ||
           /summary\s+of\s+\d+\s+transactions?/i.test(text) ||
           /multiple\s+transactions?/i.test(text);
  }

  private parseNotificationText(text: string) {
    try {
      console.log('🔍 Parsing notification text:', text);
      
      // ACB Bank specific pattern: "ACB: TK 123456789 (-1,500,000 VND) luc 09/08/2025 19:55:12."
      const acbPattern = /ACB:\s*TK\s*\d+\s*\(([+-]?)([0-9,]+)\s*VND\)/i;
      const acbMatch = text.match(acbPattern);
      if (acbMatch) {
        const sign = acbMatch[1];
        const amount = parseFloat(acbMatch[2].replace(/,/g, ''));
        
        if (amount > 0) {
          const transaction = {
            type: sign === '-' ? 'debit' : 'credit',
            amount,
            rawText: text,
            date: new Date().toISOString(),
            description: this.extractDescription(text),
            category: this.guessCategory(text),
            currency: 'VND'
          };
          
          console.log('✅ Successfully parsed ACB transaction:', transaction);
          return transaction;
        }
      }
      
      // Common patterns for bank notifications
      const patterns = [
        // Vietnamese banks - updated patterns
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
            const transaction = {
              type: sign === '-' ? 'debit' : 'credit',
              amount,
              rawText: text,
              date: new Date().toISOString(),
              description: this.extractDescription(text),
              category: this.guessCategory(text),
              currency: this.extractCurrency(text)
            };
            
            console.log('✅ Successfully parsed transaction:', transaction);
            return transaction;
          }
        }
      }

      console.log('❌ Could not parse transaction from text');
      return null;
    } catch (error) {
      console.error('❌ Error parsing notification text:', error);
      return null;
    }
  }

  private extractDescription(text: string): string {
    // Try to extract meaningful description from notification
    
    // ACB specific: Extract content after "ND:"
    const acbContentMatch = text.match(/ND:\s*(.+?)(?:\.|$)/i);
    if (acbContentMatch) {
      return acbContentMatch[1].trim();
    }
    
    const cleanText = text
      .replace(/GD:|Transaction:|TXN:|Payment:/gi, '')
      .replace(/ACB:\s*TK\s*\d+\s*\([^)]+\)\s*luc\s*[\d\/\s:]+\./gi, '') // Remove ACB header
      .replace(/[0-9,]+\s*(VND|USD|EUR|GBP)/gi, '')
      .replace(/So du:.*?VND/gi, '') // Remove balance info
      .replace(/tai\s+\w+\./gi, '') // Remove "tai ACB." etc
      .replace(/Noi dung:\s*/gi, '') // Remove "Noi dung:" prefix
      .replace(/[-:]\s*/g, '') // Remove leading dashes and colons
      .trim();
    
    return cleanText.length > 5 ? cleanText : 'Bank Transaction';
  }

  private guessCategory(text: string): string {
    const categoryKeywords = {
      'Food & Dining': ['restaurant', 'food', 'cafe', 'dining', 'eat', 'com', 'an', 'quan an', 'nha hang'],
      'Transport': ['taxi', 'uber', 'grab', 'bus', 'transport', 'fuel', 'gas', 'xe', 'xang', 'di chuyen'],
      'Shopping': ['shop', 'market', 'store', 'mall', 'purchase', 'mua sam', 'sieu thi', 'cua hang'],
      'Bills & Utilities': ['electric', 'water', 'internet', 'phone', 'bill', 'hoa don', 'dien', 'nuoc', 'tien dien', 'tien nuoc', 'internet', 'dien thoai'],
      'Entertainment': ['cinema', 'movie', 'game', 'entertainment', 'rap chieu phim', 'game', 'giai tri'],
      'Health & Medical': ['hospital', 'clinic', 'pharmacy', 'medical', 'benh vien', 'phong kham', 'thuoc'],
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

  private parseGroupedTransactions(text: string) {
    const lines = text.split(/\n|;/).map(l => l.trim()).filter(Boolean);
    const transactions = [];

    for (const line of lines) {
      const parsed = this.parseNotificationText(line);
      if (parsed) {
        transactions.push(parsed);
      }
    }
    return transactions;
  }

  public async handleBankNotification(notification: any) {
    try {
      const { title, text, packageName } = notification;
      const messageText = text || title || '';
      const currentTime = Date.now();

      console.log('🔔 [HANDLER] Received bank notification:', { packageName, title, text });

      if (!this.isBankApp(packageName)) {
        console.log('❌ [HANDLER] Not a bank app, ignoring:', packageName);
        return;
      }

      console.log('✅ [HANDLER] Bank app detected, processing...');

      const notificationId =
        notification.notificationId ||
        this.generateNotificationHash(packageName, messageText);

      console.log('🆔 [HANDLER] Generated notification ID:', notificationId);

      // Enhanced duplicate check with timestamp
      if (this.processedTransactions.has(notificationId)) {
        const lastTime = this.lastProcessedTimestamps[notificationId] || 0;
        const timeDiff = currentTime - lastTime;
        
        console.log(`⚠️ [HANDLER] Duplicate detected. Last processed: ${timeDiff}ms ago`);
        
        if (timeDiff < this.DUPLICATE_WINDOW_MS) {
          console.log('⏭️ [HANDLER] Within duplicate window, skipping');
          return;
        } else {
          console.log('🔄 [HANDLER] Outside duplicate window, processing as new');
        }
      }

      // Mark as processed immediately to prevent race conditions
      this.processedTransactions.add(notificationId);
      this.lastProcessedTimestamps[notificationId] = currentTime;
      await this.saveProcessedTransactions();

      console.log('💾 [HANDLER] Transaction marked as processed. Total:', this.processedTransactions.size);

      // Grouped notification handling
      if (this.isGroupedNotification(messageText)) {
        console.log('📊 [HANDLER] Processing grouped notification');
        const transactions = this.parseGroupedTransactions(messageText);
        transactions.forEach(tx => this.emit('transaction', tx));
        return;
      }

      // Single transaction
      const parsedTransaction = this.parseNotificationText(messageText);
      if (parsedTransaction) {
        console.log('💰 [HANDLER] Transaction parsed successfully:', parsedTransaction);
        
        // Emit both for EventEmitter listeners and DeviceEventEmitter (for ChatScreen)
        this.emit('transaction', parsedTransaction);
        
        // Also emit in format that ChatScreen expects
        const transactionMessage = {
          id: `tx_${currentTime}`,
          text: `💳 ${parsedTransaction.type === 'debit' ? '-' : '+'}${parsedTransaction.amount.toLocaleString()} ${parsedTransaction.currency}\n${parsedTransaction.description}`,
          sender: 'bot',
          timestamp: new Date(),
          isTransaction: true,
          transactionData: {
            ...parsedTransaction,
            source: 'Bank Notification',
          },
        };
        
        console.log('📤 [HANDLER] Emitting TransactionChatMessage:', transactionMessage);
        
        // Try both event emission methods to ensure one works
        DeviceEventEmitter.emit('TransactionChatMessage', transactionMessage);
        
        // Also try a simple test emission
        console.log('🧪 [HANDLER] Testing DeviceEventEmitter...');
        DeviceEventEmitter.emit('TestEvent', { test: 'Hello from service!' });
      } else {
        console.log('❌ [HANDLER] Could not parse transaction from notification');
      }

    } catch (error) {
      console.error('❌ [HANDLER] Error handling bank notification:', error);
    }
  }

  // Helper method to clear processed transactions (for testing)
  public async clearProcessedTransactions() {
    try {
      this.processedTransactions.clear();
      this.lastProcessedTimestamps = {};
      await AsyncStorage.removeItem('processedTransactions');
      console.log('🧹 Cleared all processed transactions');
    } catch (error) {
      console.error('❌ Error clearing processed transactions:', error);
    }
  }

  // Helper method to get status
  public getStatus() {
    return {
      processedCount: this.processedTransactions.size,
      recentIds: Array.from(this.processedTransactions).slice(-3),
      duplicateWindowMs: this.DUPLICATE_WINDOW_MS
    };
  }

  // Test method to simulate a notification
  public async testNotification(text: string, packageName: string = 'com.syslab.notigenerator') {
    console.log('🧪 Testing notification:', { text, packageName });
    await this.handleBankNotification({
      title: 'Test Bank Notification',
      text,
      packageName,
      notificationId: `test_${Date.now()}`
    });
  }

  // Optional methods for compatibility (no-op implementations)
  public async initialize(): Promise<boolean> {
    console.log('✅ Bank notification service is ready');
    return true;
  }

  public stopListening() {
    console.log('ℹ️ Bank notification service continues running');
    // Service stays active for potential notifications
  }
}

// Create singleton instance
const bankNotificationServiceInstance = new BankNotificationService();

// Export the singleton instance
export default bankNotificationServiceInstance;
