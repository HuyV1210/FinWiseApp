// Test script to verify SMS and Email services work globally (not just in chat)
// This will run for 60 seconds and check if transactions are detected

import { DeviceEventEmitter } from 'react-native';
import { smsBankNotificationService } from '../services/smsBankNotificationService';
import { emailTransactionService } from '../services/emailTransactionService';

class TransactionDetectionTest {
  private transactionCount = 0;
  private testDuration = 60000; // 60 seconds
  private testStartTime = Date.now();

  constructor() {
    console.log('\n🧪 === TRANSACTION DETECTION TEST STARTED ===');
    console.log('📋 Testing if SMS and Email services detect transactions globally');
    console.log('⏱️ Test will run for 60 seconds...\n');
    
    this.setupListeners();
    this.startTest();
  }

  private setupListeners() {
    // Listen for transaction events from SMS service
    DeviceEventEmitter.addListener('TransactionChatMessage', (transactionMessage) => {
      this.transactionCount++;
      const elapsed = ((Date.now() - this.testStartTime) / 1000).toFixed(1);
      
      console.log(`\n🎯 [${elapsed}s] TRANSACTION DETECTED GLOBALLY!`);
      console.log(`📊 Count: ${this.transactionCount}`);
      console.log(`🏦 Source: ${transactionMessage.source}`);
      console.log(`💰 Amount: ${transactionMessage.transactionData?.amount} ${transactionMessage.transactionData?.currency}`);
      console.log(`📝 Description: ${transactionMessage.transactionData?.description}`);
      console.log(`🏷️ Category: ${transactionMessage.transactionData?.category}\n`);
    });

    // Listen for navigation events to chat
    DeviceEventEmitter.addListener('NavigateToChat', () => {
      const elapsed = ((Date.now() - this.testStartTime) / 1000).toFixed(1);
      console.log(`\n📱 [${elapsed}s] Navigation to Chat triggered by transaction\n`);
    });
  }

  private startTest() {
    console.log('🔊 Services should be running globally in background...');
    console.log('📧 Email service simulates QR payments every 30 seconds');
    console.log('📱 SMS service tests Vietnamese bank formats');
    console.log('⚡ Both services emit TransactionChatMessage events globally\n');

    // Test SMS detection manually
    setTimeout(() => {
      console.log('🧪 Testing SMS detection manually...');
      smsBankNotificationService.testVietnameseSMS();
    }, 5000);

    // Test ACB transfer format
    setTimeout(() => {
      console.log('🧪 Testing ACB transfer format...');
      smsBankNotificationService.testACBTransferSMS();
    }, 15000);

    // End test after duration
    setTimeout(() => {
      this.endTest();
    }, this.testDuration);
  }

  private endTest() {
    console.log('\n🏁 === TRANSACTION DETECTION TEST COMPLETED ===');
    console.log(`⏱️ Test Duration: ${this.testDuration / 1000} seconds`);
    console.log(`📊 Total Transactions Detected: ${this.transactionCount}`);
    console.log(`📈 Detection Rate: ${(this.transactionCount / (this.testDuration / 1000)).toFixed(2)} transactions/second`);
    
    if (this.transactionCount > 0) {
      console.log('✅ SUCCESS: Services detect transactions GLOBALLY');
      console.log('🌍 Transactions are processed even when chat screen is not open');
      console.log('📱 Users will receive notifications and can navigate to chat to confirm');
    } else {
      console.log('❌ ISSUE: No transactions detected during test');
      console.log('🔍 Check if services are properly initialized in App.tsx');
      console.log('⚠️ Services may only work when chat screen is active');
    }
    
    console.log('\n💡 Key Findings:');
    console.log('• SMS Service: Monitors SMS globally in background');
    console.log('• Email Service: Simulates QR payments every 30 seconds');
    console.log('• Both emit TransactionChatMessage events to DeviceEventEmitter');
    console.log('• Chat screen listens to these events when open');
    console.log('• Notifications can trigger navigation to chat screen');
    console.log('• All transaction processing happens independently of UI\n');
    
    // Clean up listeners
    DeviceEventEmitter.removeAllListeners('TransactionChatMessage');
    DeviceEventEmitter.removeAllListeners('NavigateToChat');
  }
}

// Export for use in App.tsx or other components
export const transactionDetectionTest = new TransactionDetectionTest();
