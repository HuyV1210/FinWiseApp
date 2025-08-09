import { PermissionsAndroid, Platform, DeviceEventEmitter } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SMSTransaction {
  amount: number;
  type: 'income' | 'expense';
  description: string;
  category?: string;
  bankName?: string;
  currency?: string;
  timestamp: Date;
  smsBody: string;
}

class SMSBankNotificationService {
  private isListening = false;
  private smsListener: any = null;
  private processedSMSIds = new Set<string>();
  private readonly PROCESSED_SMS_KEY = 'processedSMSIds';

  constructor() {
    // Load processed SMS IDs from storage
    this.loadProcessedSMSIds();
  }

  // Load processed SMS IDs from AsyncStorage
  private async loadProcessedSMSIds(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.PROCESSED_SMS_KEY);
      if (stored) {
        const idsArray = JSON.parse(stored);
        this.processedSMSIds = new Set(idsArray);
      } 
    } catch (error) {
      this.processedSMSIds = new Set();
    }
  }

  // Save processed SMS IDs to AsyncStorage
  private async saveProcessedSMSIds(): Promise<void> {
    try {
      const idsArray = Array.from(this.processedSMSIds);
      await AsyncStorage.setItem(this.PROCESSED_SMS_KEY, JSON.stringify(idsArray));
      console.log(`💾 Saved ${idsArray.length} processed SMS IDs to storage`);
    } catch (error) {
      console.error('❌ Error saving processed SMS IDs:', error);
    }
  }

  // Generate unique ID for SMS message
  private generateSMSId(sms: any): string {
    // Use SMS body + timestamp + sender for uniqueness
    const content = `${sms.address}_${sms.body}_${sms.date}`;
    return content.replace(/\s+/g, '').substring(0, 100); // Limit length for storage efficiency
  }

  async initialize(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        // Check if SMS module is available first
        if (!SmsAndroid) {
          console.log('⚠️ SMS module not available - SMS monitoring disabled');
          console.log('ℹ️ Test methods will still work for development');
          return false;
        }

        // Request SMS permissions
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_SMS,
          PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
        ]);

        if (
          granted['android.permission.READ_SMS'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.RECEIVE_SMS'] === PermissionsAndroid.RESULTS.GRANTED
        ) {
          console.log('✅ SMS permissions granted');
          this.startListening();
          return true;
        } else {
          console.log('❌ SMS permissions denied');
          return false;
        }
      }
      console.log('ℹ️ SMS monitoring only available on Android');
      return false;
    } catch (error) {
      console.error('Error initializing SMS bank notification service:', error);
      console.log('ℹ️ Continuing with test methods only');
      return false;
    }
  }

  startListening() {
    if (this.isListening) return;

    this.isListening = true;
    console.log('📱 Starting SMS bank notification monitoring...');

    // Listen for incoming SMS messages - try multiple event names for compatibility
    this.smsListener = DeviceEventEmitter.addListener('onSMSReceived', (message) => {
      console.log('📨 SMS received via onSMSReceived:', message);
      this.handleIncomingSMS(message);
    });

    // Also listen for the alternative event name used by react-native-get-sms-android
    const altListener = DeviceEventEmitter.addListener('sms_onDelivery', (message) => {
      console.log('📨 SMS received via sms_onDelivery:', message);
      this.handleIncomingSMS(message);
    });

    // Listen for any SMS-related events for debugging
    const debugListener = DeviceEventEmitter.addListener('smsReceived', (message) => {
      console.log('📨 SMS received via smsReceived:', message);
      this.handleIncomingSMS(message);
    });

    // Log that we're now listening for SMS events
    console.log('📻 SMS Event listeners registered:');
    console.log('   - onSMSReceived');
    console.log('   - sms_onDelivery');  
    console.log('   - smsReceived');
    console.log('📱 Waiting for SMS messages...');

    // Store all listeners for cleanup
    this.smsListener = {
      primary: this.smsListener,
      alternative: altListener,
      debug: debugListener,
      remove: () => {
        this.smsListener.primary?.remove();
        this.smsListener.alternative?.remove();
        this.smsListener.debug?.remove();
      }
    };

    // Also check recent SMS messages on startup
    this.checkRecentSMS();
  }

  stopListening() {
    if (!this.isListening) return;

    this.isListening = false;
    
    if (this.smsListener) {
      if (typeof this.smsListener.remove === 'function') {
        // New structure with multiple listeners
        this.smsListener.remove();
      } else {
        // Old structure with single listener
        this.smsListener.remove();
      }
      this.smsListener = null;
    }

    console.log('📱 SMS bank notification monitoring stopped');
    console.log('📻 All SMS event listeners removed');
  }

  private async checkRecentSMS() {
    try {
      console.log('🔍 Checking recent SMS messages...');
      console.log('🔍 SmsAndroid availability:', !!SmsAndroid);
      console.log('🔍 SmsAndroid.list function:', typeof SmsAndroid?.list);
      
      // Check if SmsAndroid is available
      if (!SmsAndroid || typeof SmsAndroid.list !== 'function') {
        console.log('⚠️ SMS module not available - skipping recent SMS check');
        console.log('ℹ️ SMS module state:', SmsAndroid);
        return;
      }
      
      // Get SMS messages from the last 2 hours to catch recent messages
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
      
      const filter = {
        box: 'inbox',
        minDate: twoHoursAgo,
        maxCount: 50, // Increased to catch more messages
      };

      console.log('🔍 SMS filter:', filter);
      console.log('🔍 Calling SmsAndroid.list...');

      SmsAndroid.list(
        JSON.stringify(filter),
        (fail) => {
          console.log('❌ Failed to get SMS list:', fail);
        },
        (count, smsList) => {
          console.log(`📱 Found ${count} recent SMS messages`);
          
          if (count > 0) {
            const messages = JSON.parse(smsList);
            console.log('📱 Sample SMS messages:');
            
            messages.forEach((sms: any, index: number) => {
              console.log(`📱 SMS ${index + 1}:`);
              console.log(`   From: ${sms.address}`);
              console.log(`   Body: ${sms.body.substring(0, 100)}...`);
              console.log(`   Date: ${new Date(parseInt(sms.date)).toLocaleString()}`);
              
              if (this.isBankSMS(sms.address, sms.body)) {
                console.log('🏦 Found bank SMS:', sms.body);
                this.handleBankSMS(sms);
              } else {
                console.log('   Not a bank SMS');
              }
            });
          } else {
            console.log('📱 No recent SMS messages found');
          }
        }
      );
    } catch (error) {
      console.error('Error checking recent SMS:', error);
      console.log('ℹ️ SMS functionality will work with test methods only');
    }
  }

  private handleIncomingSMS(message: any) {
    try {
      const { originatingAddress, messageBody } = message;
      
      if (this.isBankSMS(originatingAddress, messageBody)) {
        console.log('🏦 Bank SMS detected from:', originatingAddress);
        this.handleBankSMS({
          address: originatingAddress,
          body: messageBody,
          date: Date.now(),
        });
      }
    } catch (error) {
      console.error('Error handling incoming SMS:', error);
    }
  }

  private isBankSMS(sender: string, body: string): boolean {
    // Common bank SMS sender patterns
    const bankSenders = [
      // Vietnamese banks
      'VIETCOMBANK', 'VCB', 'TECHCOMBANK', 'TCB', 'MBBANK', 'MB',
      'ACBBANK', 'ACB', 'BIDV', 'VPBANK', 'SACOMBANK', 'STB',
      'AGRIBANK', 'VTB', 'EXIMBANK', 'EIB', 'HDBANK', 'LPB',
      // International banks
      'CHASE', 'BANKOFAMERICA', 'BOA', 'WELLS', 'CITI', 'CAPITAL',
      // Generic bank keywords
      'BANK', 'CREDIT', 'DEBIT', 'TRANSACTION', 'PAYMENT',
    ];

    const bankKeywords = [
      // Vietnamese
      'giao dich', 'gd:', 'tai khoan', 'so du', 'rut tien', 'chuyen khoan',
      'thanh toan', 'nap tien', 'phi dich vu',
      // English
      'transaction', 'balance', 'withdrawal', 'deposit', 'transfer',
      'payment', 'purchase', 'charge', 'fee', 'atm',
      // Currency indicators
      'vnd', 'usd', 'eur', 'gbp', '$', '€', '£',
    ];

    const senderUpper = sender.toUpperCase();
    const bodyLower = body.toLowerCase();

    // Check if sender looks like a bank
    const isBankSender = bankSenders.some(bank => 
      senderUpper.includes(bank) || senderUpper.includes(bank.replace('BANK', ''))
    );

    // Check if message contains bank transaction keywords
    const hasBankKeywords = bankKeywords.some(keyword => 
      bodyLower.includes(keyword)
    );

    return isBankSender || hasBankKeywords;
  }

  private handleBankSMS(sms: any) {
    try {
      console.log('🔍 Parsing bank SMS:', sms.body);
      
      // Generate unique ID for this SMS
      const smsId = this.generateSMSId(sms);
      
      // Check if we've already processed this SMS
      if (this.processedSMSIds.has(smsId)) {
        console.log('🔄 SMS already processed, skipping:', smsId.substring(0, 50) + '...');
        return;
      }
      
      const parsedTransaction = this.parseSMSContent(sms.body, sms.address);
      
      if (parsedTransaction) {
        console.log('✅ Successfully parsed SMS transaction:', parsedTransaction);
        
        // Mark this SMS as processed
        this.processedSMSIds.add(smsId);
        this.saveProcessedSMSIds(); // Save to storage
        
        console.log(`📝 Marked SMS as processed. Total processed: ${this.processedSMSIds.size}`);
        
        this.processDetectedTransaction(parsedTransaction);
      } else {
        console.log('❌ Could not parse transaction from SMS');
      }
    } catch (error) {
      console.error('Error handling bank SMS:', error);
    }
  }

  private parseSMSContent(smsBody: string, sender: string): SMSTransaction | null {
    try {
      console.log('🔍 Parsing SMS body:', smsBody);

      // Enhanced patterns for SMS parsing
      const patterns = [
        // Vietnamese bank patterns
        /(?:GD|Giao dich|Transaction)[-:\s]*([+-]?)\s*([0-9,]+(?:\.\d{2})?)\s*(VND|USD|EUR|GBP)/i,
        /(?:Rut tien|Withdrawal|ATM)[-:\s]*([+-]?)\s*([0-9,]+(?:\.\d{2})?)\s*(VND|USD|EUR|GBP)/i,
        /(?:Chuyen khoan|Transfer|Payment)[-:\s]*([+-]?)\s*([0-9,]+(?:\.\d{2})?)\s*(VND|USD|EUR|GBP)/i,
        /(?:Thanh toan|Purchase|Buy)[-:\s]*([+-]?)\s*([0-9,]+(?:\.\d{2})?)\s*(VND|USD|EUR|GBP)/i,
        /(?:Nap tien|Deposit|Credit)[-:\s]*([+-]?)\s*([0-9,]+(?:\.\d{2})?)\s*(VND|USD|EUR|GBP)/i,
        
        // Vietnamese transfer patterns (ACB, VCB, etc.)
        /(?:da chuyen|has transferred|chuyen)\s+([0-9,]+(?:\.\d{2})?)\s*(VND|USD|EUR|GBP)/i,
        /(?:nhan duoc|received|nhan)\s+([0-9,]+(?:\.\d{2})?)\s*(VND|USD|EUR|GBP)/i,
        /TK\s+\d+.*?(?:da chuyen|chuyen)\s+([0-9,]+(?:\.\d{2})?)\s*(VND|USD|EUR|GBP)/i,
        
        // International patterns
        /(?:Debit|Charge|Withdrawal)[-:\s]*([+-]?)\$([0-9,]+\.?\d*)/i,
        /(?:Credit|Deposit|Payment received)[-:\s]*([+-]?)\$([0-9,]+\.?\d*)/i,
        /(?:Purchase|Transaction)[-:\s]*([+-]?)\$([0-9,]+\.?\d*)/i,
        
        // Generic amount patterns
        /([+-]?)\s*([0-9,]+(?:\.\d{2})?)\s*(VND|USD|EUR|GBP|\$|€|£)/i,
      ];

      for (const pattern of patterns) {
        const match = smsBody.match(pattern);
        if (match) {
          console.log('🎯 Pattern matched:', match);
          
          let sign = '';
          let amount = 0;
          let currency = 'VND';

          // Handle different pattern structures
          if (match.length >= 4 && match[1] && match[2] && match[3]) {
            // Standard patterns: sign, amount, currency
            sign = match[1] || '';
            amount = parseFloat(match[2].replace(/,/g, ''));
            currency = match[3] || 'VND';
          } else if (match.length >= 3 && match[1] && match[2]) {
            // Vietnamese transfer patterns: amount, currency (no sign)
            sign = '';
            amount = parseFloat(match[1].replace(/,/g, ''));
            currency = match[2] || 'VND';
          } else if (match.length >= 3 && match[2]) {
            // Alternative patterns
            sign = match[1] || '';
            amount = parseFloat(match[2].replace(/,/g, ''));
            currency = match[3] || 'VND';
          }

          // Clean up currency
          if (currency === '$') currency = 'USD';
          if (currency === '€') currency = 'EUR';
          if (currency === '£') currency = 'GBP';

          // Determine transaction type
          let type: 'income' | 'expense' = 'expense'; // Default to expense
          
          // Check for income indicators
          const incomeKeywords = ['credit', 'deposit', 'nap tien', 'chuyen den', 'receive', 'salary', 'luong', 'nhan duoc', 'nhan'];
          const expenseKeywords = ['debit', 'withdrawal', 'rut tien', 'purchase', 'thanh toan', 'charge', 'fee', 'da chuyen', 'chuyen khoan'];
          
          const bodyLower = smsBody.toLowerCase();
          
          if (incomeKeywords.some(keyword => bodyLower.includes(keyword)) || sign === '+') {
            type = 'income';
          } else if (expenseKeywords.some(keyword => bodyLower.includes(keyword)) || sign === '-') {
            type = 'expense';
          }

          // If amount is detected as negative, it's definitely an expense
          if (amount < 0) {
            amount = Math.abs(amount);
            type = 'expense';
          }

          return {
            amount,
            type,
            description: this.extractDescription(smsBody),
            category: this.guessCategory(smsBody),
            bankName: this.extractBankName(sender),
            currency,
            timestamp: new Date(),
            smsBody,
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error parsing SMS content:', error);
      return null;
    }
  }

  private extractDescription(smsBody: string): string {
    // Remove common SMS noise and extract meaningful description
    let description = smsBody
      .replace(/GD:|Transaction:|Payment:|Debit:|Credit:/gi, '')
      .replace(/So du:|Balance:|Available:/gi, '')
      .replace(/[0-9,]+\s*(VND|USD|EUR|GBP|\$|€|£)/gi, '')
      .replace(/\d{2}\/\d{2}\/\d{4}/g, '') // Remove dates
      .replace(/\d{2}:\d{2}/g, '') // Remove times
      .replace(/\s+/g, ' ')
      .trim();

    // Extract merchant/location info
    const merchantPatterns = [
      /(?:tai|at|from)\s+([^.]+)/i,
      /(?:merchant|vendor)[-:\s]*([^.]+)/i,
    ];

    for (const pattern of merchantPatterns) {
      const match = description.match(pattern);
      if (match && match[1].trim().length > 3) {
        return match[1].trim();
      }
    }

    return description.length > 5 ? description : 'SMS Bank Transaction';
  }

  private guessCategory(smsBody: string): string {
    const categoryKeywords = {
      'Food & Dining': ['restaurant', 'food', 'cafe', 'coffee', 'dining', 'eat', 'grab food', 'delivery'],
      'Transport': ['taxi', 'uber', 'grab', 'bus', 'transport', 'fuel', 'gas', 'parking', 'toll'],
      'Shopping': ['shop', 'market', 'store', 'mall', 'purchase', 'buy', 'amazon', 'lazada'],
      'Bills & Utilities': ['electric', 'water', 'internet', 'phone', 'bill', 'utility', 'eva', 'vnpt'],
      'Entertainment': ['cinema', 'movie', 'game', 'entertainment', 'netflix', 'spotify'],
      'Health & Medical': ['hospital', 'clinic', 'pharmacy', 'medical', 'doctor', 'medicine'],
      'ATM': ['atm', 'rut tien', 'withdrawal', 'cash'],
      'Transfer': ['chuyen khoan', 'transfer', 'send money', 'remittance'],
      'Salary': ['salary', 'luong', 'wage', 'payroll', 'income'],
    };

    const bodyLower = smsBody.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => bodyLower.includes(keyword))) {
        return category;
      }
    }

    return 'Other';
  }

  private extractBankName(sender: string): string {
    const bankNames = {
      'VCB': 'Vietcombank',
      'VIETCOMBANK': 'Vietcombank',
      'TCB': 'Techcombank', 
      'TECHCOMBANK': 'Techcombank',
      'MB': 'MB Bank',
      'MBBANK': 'MB Bank',
      'ACB': 'ACB Bank',
      'ACBBANK': 'ACB Bank',
      'BIDV': 'BIDV',
      'CHASE': 'Chase Bank',
      'BOA': 'Bank of America',
      'WELLS': 'Wells Fargo',
    };

    const senderUpper = sender.toUpperCase();
    
    for (const [code, fullName] of Object.entries(bankNames)) {
      if (senderUpper.includes(code)) {
        return fullName;
      }
    }

    return sender;
  }

  private processDetectedTransaction(transaction: SMSTransaction) {
    try {
      console.log('📤 Processing SMS transaction:', transaction);
      
      // Create transaction message for chat
      const transactionMessage = {
        id: `transaction_${Date.now()}`,
        text: this.formatTransactionMessage(transaction),
        sender: 'bot',
        timestamp: new Date(),
        isTransaction: true,
        transactionData: {
          amount: transaction.amount,
          type: transaction.type,
          description: transaction.description,
          category: transaction.category || 'Other',
          currency: transaction.currency || 'VND',
          bankName: transaction.bankName,
          source: 'sms'
        }
      };

      console.log('� Emitting TransactionChatMessage event with data:', transactionMessage);
      
      // Emit event to add transaction message to chat
      DeviceEventEmitter.emit('TransactionChatMessage', transactionMessage);
      
      console.log('✅ SMS transaction chat message emitted successfully');
      
    } catch (error) {
      console.error('❌ Error processing SMS transaction:', error);
    }
  }

  private formatTransactionMessage(transaction: SMSTransaction): string {
    const typeEmoji = transaction.type === 'income' ? '💰' : '💸';
    const amountFormatted = new Intl.NumberFormat('vi-VN').format(transaction.amount);
    
    return `${typeEmoji} **Transaction Detected**

💳 **${transaction.bankName || 'Bank'}**
${transaction.type === 'income' ? '📈' : '📉'} ${transaction.type === 'income' ? '+' : '-'}${amountFormatted} ${transaction.currency}

📝 ${transaction.description}
🏷️ Category: ${transaction.category}

Would you like to save this transaction or change the category?

💡 Reply with:
• "Save" to confirm
• "Change category" to modify
• "Skip" to ignore`;
  }

  // TEST METHODS
  testVietnameseSMS() {
    console.log('\n🧪 =========================');
    console.log('🧪 Testing Vietnamese bank SMS...');
    console.log('🧪 =========================');
    
    const mockSMS = {
      address: 'VIETCOMBANK',
      body: 'GD: -150,000 VND tai GRAB*TRIP Ho Chi Minh luc 14:30 ngay 05/08/2025. So du: 2,500,000 VND.',
      date: Date.now(),
    };
    
    console.log('📱 Mock SMS data:', mockSMS);
    this.handleBankSMS(mockSMS);
    console.log('🧪 Vietnamese SMS test completed\n');
  }

  testACBTransferSMS() {
    console.log('\n🧪 =========================');
    console.log('🧪 Testing ACB transfer SMS...');
    console.log('🧪 =========================');
    
    const mockSMS = {
      address: 'ACB',
      body: 'ACB: TK 123456789 (NGUYEN VAN A) da chuyen 1,000,000 VND den TK 987654321 (TRAN THI B). Noi dung: Chuyen tien mua hang. So du: 5,000,000 VND. GD luc 06/08/2025 08:30:21.',
      date: Date.now(),
    };
    
    console.log('📱 Mock ACB SMS data:', mockSMS);
    this.handleBankSMS(mockSMS);
    console.log('🧪 ACB transfer SMS test completed\n');
  }

  testInternationalSMS() {
    console.log('\n🧪 =========================');
    console.log('🧪 Testing international bank SMS...');
    console.log('🧪 =========================');
    
    const mockSMS = {
      address: 'CHASE',
      body: 'CHASE: Debit $25.50 at STARBUCKS #1234 on 08/05/25 at 2:30PM. Available balance: $1,500.00',
      date: Date.now(),
    };
    
    console.log('📱 Mock SMS data:', mockSMS);
    this.handleBankSMS(mockSMS);
    console.log('🧪 International SMS test completed\n');
  }

  testSalarySMS() {
    console.log('\n🧪 =========================');
    console.log('🧪 Testing salary SMS...');
    console.log('🧪 =========================');
    
    const mockSMS = {
      address: 'TECHCOMBANK',
      body: 'TCB: Credit +5,000,000 VND - Salary transfer from COMPANY ABC on 05/08/2025. Balance: 8,500,000 VND',
      date: Date.now(),
    };
    
    console.log('📱 Mock SMS data:', mockSMS);
    this.handleBankSMS(mockSMS);
    console.log('🧪 Salary SMS test completed\n');
  }

  // Test method specifically for SMS module availability
  testSMSModuleStatus() {
    console.log('\n🔍 =========================');
    console.log('🔍 Testing SMS module status...');
    console.log('🔍 =========================');
    
    console.log('📱 Platform:', Platform.OS);
    console.log('📱 SmsAndroid module:', SmsAndroid);
    console.log('📱 SmsAndroid type:', typeof SmsAndroid);
    
    if (!SmsAndroid) {
      console.log('❌ SmsAndroid module is NULL - native module not linked properly');
      console.log('ℹ️ This is expected during development - test methods will still work');
      console.log('💡 To fix: Run "npx react-native unlink react-native-get-sms-android" then "npx react-native link react-native-get-sms-android"');
      console.log('🔧 Or rebuild the app completely: "cd android && ./gradlew clean" then rebuild');
      console.log('🧪 Testing fallback behavior...');
      
      // Test that our error handling works
      this.testVietnameseSMS(); // This should still work
      return false;
    } else {
      console.log('✅ SmsAndroid module is available!');
      console.log('📱 Module methods:', Object.keys(SmsAndroid));
      console.log('📱 Module functions:');
      Object.keys(SmsAndroid).forEach(key => {
        console.log(`   - ${key}: ${typeof SmsAndroid[key]}`);
      });
      
      // Test initialization
      console.log('🧪 Testing initialization...');
      this.initialize().then(result => {
        console.log('🔍 Initialization result:', result);
      }).catch(error => {
        console.log('❌ Initialization error:', error);
      });
      
      return true;
    }
  }

  // Manual test trigger for ChatScreen debugging
  testManualTransactionEvent() {
    console.log('\n🧪 =========================');
    console.log('🧪 Testing manual transaction event...');
    console.log('🧪 =========================');
    
    const testData = {
      amount: 1000000,
      type: 'expense',
      description: 'ACB Transfer Test',
      category: 'Transfer',
      currency: 'VND',
      source: 'manual_test'
    };

    console.log('🚀 Manually emitting TransactionAutoAdded event with data:', testData);
    DeviceEventEmitter.emit('TransactionAutoAdded', testData);
    console.log('✅ Manual event emitted successfully');
    
    // Also emit backup events for debugging
    setTimeout(() => {
      console.log('🔄 Emitting backup events for debugging...');
      DeviceEventEmitter.emit('bankTransactionDetected', testData);
      DeviceEventEmitter.emit('testTransactionEvent', testData);
    }, 100);
    
    console.log('🧪 Manual transaction event test completed\n');
  }

  // Force check recent SMS messages manually
  testForceCheckRecentSMS() {
    console.log('\n🔍 =========================');
    console.log('🔍 Force checking recent SMS messages...');
    console.log('🔍 =========================');
    
    // Force check recent SMS to see if our ACB message is there
    this.checkRecentSMS();
    
    console.log('🔍 Force check completed\n');
  }

  // Test your specific ACB message format
  testUserACBMessage() {
    console.log('\n🧪 =========================');
    console.log('🧪 Testing User\'s ACB Message Format...');
    console.log('🧪 =========================');
    
    // Test with a typical ACB transfer format that users might receive
    const mockSMS = {
      address: 'ACB',
      body: 'ACB: TK 1234567890 (NGUYEN VAN A) da chuyen 500,000 VND den TK 0987654321. Noi dung: Transfer money. So du: 2,500,000 VND. GD luc 06/08/2025 15:30:45.',
      date: Date.now(),
    };
    
    console.log('📱 Testing ACB SMS format:', mockSMS.body);
    
    // Test if it's detected as bank SMS
    const isBankSMS = this.isBankSMS(mockSMS.address, mockSMS.body);
    console.log('🏦 Is detected as bank SMS:', isBankSMS);
    
    if (isBankSMS) {
      this.handleBankSMS(mockSMS);
    } else {
      console.log('❌ SMS not detected as bank message');
      console.log('🔍 Sender:', mockSMS.address);
      console.log('🔍 Body keywords test...');
      
      // Test parsing directly
      const parsed = this.parseSMSContent(mockSMS.body, mockSMS.address);
      if (parsed) {
        console.log('✅ Manual parsing successful:', parsed);
        this.processDetectedTransaction(parsed);
      } else {
        console.log('❌ Manual parsing failed');
      }
    }
    
    console.log('🧪 User ACB message test completed\n');
  }

  // Debug method to clear processed SMS IDs
  clearProcessedSMSIds() {
    console.log('\n🧹 =========================');
    console.log(`🧹 Clearing ${this.processedSMSIds.size} processed SMS IDs...`);
    console.log('🧹 =========================');
    
    this.processedSMSIds.clear();
    this.saveProcessedSMSIds();
    
    console.log('✅ Processed SMS IDs cleared. Force check will now process all SMS again.');
    console.log('🧹 Clear operation completed\n');
  }

  // Debug method to show processed SMS IDs
  showProcessedSMSIds() {
    console.log('\n📊 =========================');
    console.log(`📊 Currently tracking ${this.processedSMSIds.size} processed SMS messages`);
    console.log('📊 =========================');
    
    if (this.processedSMSIds.size > 0) {
      const ids = Array.from(this.processedSMSIds);
      ids.slice(0, 5).forEach((id, index) => {
        console.log(`📊 ${index + 1}. ${id.substring(0, 60)}...`);
      });
      
      if (ids.length > 5) {
        console.log(`📊 ... and ${ids.length - 5} more`);
      }
    } else {
      console.log('📊 No processed SMS IDs found');
    }
    
    console.log('📊 Status check completed\n');
  }
}

export const smsBankNotificationService = new SMSBankNotificationService();

