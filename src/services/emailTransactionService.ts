import { DeviceEventEmitter, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addTransactionToDatabase } from './database';

interface BankEmailTransaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  category: string;
  bankName: string;
  accountNumber?: string;
  currency: string;
  timestamp: Date;
  balance?: number;
  transactionId?: string;
}

interface SmartWalletTransaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  category: string;
  walletProvider: string; // MoMo, ZaloPay, ViettelPay, etc.
  currency: string;
  timestamp: Date;
  balance?: number;
  transactionId?: string;
}

class EmailTransactionService {
  private readonly PROCESSED_EMAILS_KEY = 'processedEmailIds';
  private processedEmailIds = new Set<string>();

  constructor() {
    console.log('💳 Email Transaction Service initialized');
    console.log('🚀 Service will monitor emails in REAL-TIME, not just when chat opens!');
    this.loadProcessedEmails();
    this.startListening();
  }

  // Load previously processed email IDs to avoid duplicates
  private async loadProcessedEmails() {
    try {
      const stored = await AsyncStorage.getItem(this.PROCESSED_EMAILS_KEY);
      if (stored) {
        this.processedEmailIds = new Set(JSON.parse(stored));
        console.log(`📧 Loaded ${this.processedEmailIds.size} processed email IDs`);
      }
    } catch (error) {
      console.error('Error loading processed emails:', error);
    }
  }

  // Save processed email ID
  private async saveProcessedEmail(emailId: string) {
    this.processedEmailIds.add(emailId);
    try {
      await AsyncStorage.setItem(
        this.PROCESSED_EMAILS_KEY, 
        JSON.stringify(Array.from(this.processedEmailIds))
      );
    } catch (error) {
      console.error('Error saving processed email:', error);
    }
  }

  // Start listening for email notifications
  private startListening() {
    console.log('🔊 Starting email notification listener...');
    
    // Listen for incoming email notifications
    DeviceEventEmitter.addListener('EmailNotification', this.handleEmailNotification.bind(this));
    
    // For testing - simulate bank emails every 30 seconds
    this.simulateBankEmails();
  }

  // Handle incoming email notification
  private async handleEmailNotification(emailData: any) {
    const emailId = this.generateEmailId(emailData);
    
    // Skip if already processed
    if (this.processedEmailIds.has(emailId)) {
      console.log('📧 Email already processed, skipping...');
      return;
    }

    console.log('📧 Processing new email notification:', emailData.subject);

    // Parse bank transaction
    const bankTransaction = this.parseBankEmail(emailData);
    if (bankTransaction) {
      await this.sendTransactionToChat(bankTransaction, 'bank');
      await this.saveProcessedEmail(emailId);
      return;
    }

    // Parse smart wallet transaction
    const walletTransaction = this.parseSmartWalletEmail(emailData);
    if (walletTransaction) {
      await this.sendTransactionToChat(walletTransaction, 'wallet');
      await this.saveProcessedEmail(emailId);
      return;
    }

    console.log('📧 Email not recognized as bank/wallet transaction');
  }

  // Parse bank email notifications
  private parseBankEmail(emailData: any): BankEmailTransaction | null {
    const subject = emailData.subject?.toLowerCase() || '';
    const body = emailData.body || '';
    const sender = emailData.sender?.toLowerCase() || '';

    // Bank detection patterns
    const bankPatterns = {
      vietcombank: /vietcombank|vcb/i,
      techcombank: /techcombank|tcb/i,
      acb: /acb|asia commercial bank/i,
      bidv: /bidv|bank for investment/i,
      vietinbank: /vietinbank|vietin bank/i,
      sacombank: /sacombank|sai gon commercial/i,
      mbbank: /mb bank|military bank/i,
      vpbank: /vp bank|vietnam prosperity/i,
      agribank: /agribank|agriculture bank/i,
      hdbank: /hd bank|ho chi minh development/i
    };

    let bankName = 'Unknown Bank';
    for (const [bank, pattern] of Object.entries(bankPatterns)) {
      if (pattern.test(subject) || pattern.test(sender)) {
        bankName = bank.charAt(0).toUpperCase() + bank.slice(1);
        break;
      }
    }

    // Amount parsing patterns
    const amountPatterns = [
      /(?:số tiền|amount|so tien)[::\s]*([+-]?)[\s]*([0-9,.]+)\s*(VND|USD|EUR|đ)/gi,
      /([+-]?)[\s]*([0-9,.]+)\s*(VND|USD|EUR|đ)/gi,
      /([+-]?)[\s]*(\d{1,3}(?:[,.]\d{3})*(?:[,.]\d{2})?)\s*(VND|USD|EUR|đ)/gi
    ];

    let amount = 0;
    let currency = 'VND';
    let type: 'income' | 'expense' = 'expense';

    for (const pattern of amountPatterns) {
      const match = pattern.exec(body);
      if (match) {
        const sign = match[1];
        const amountStr = match[2].replace(/[,.]/g, '');
        amount = parseFloat(amountStr);
        currency = match[3] || 'VND';
        type = sign === '+' || body.includes('nhận được') || body.includes('credit') ? 'income' : 'expense';
        break;
      }
    }

    if (amount === 0) return null;

    // Description parsing
    let description = 'Bank Transaction';
    const descPatterns = [
      /(?:nội dung|content|description)[::\s]*(.+?)(?:\n|$)/gi,
      /(?:merchant|shop|store)[::\s]*(.+?)(?:\n|$)/gi,
      /(?:giao dịch|transaction)[::\s]*(.+?)(?:\n|$)/gi
    ];

    for (const pattern of descPatterns) {
      const match = pattern.exec(body);
      if (match && match[1]) {
        description = match[1].trim();
        break;
      }
    }

    // Category determination
    const category = this.determineBankCategory(description, body);

    // Balance parsing
    let balance: number | undefined;
    const balanceMatch = /(?:số dư|balance)[::\s]*([0-9,.]+)/gi.exec(body);
    if (balanceMatch) {
      balance = parseFloat(balanceMatch[1].replace(/[,.]/g, ''));
    }

    // Transaction ID parsing
    let transactionId: string | undefined;
    const idMatch = /(?:mã giao dịch|transaction id|ref)[::\s]*([A-Z0-9]+)/gi.exec(body);
    if (idMatch) {
      transactionId = idMatch[1];
    }

    return {
      id: this.generateTransactionId(),
      amount,
      type,
      description,
      category,
      bankName,
      currency,
      timestamp: new Date(),
      balance,
      transactionId
    };
  }

  // Parse smart wallet email notifications
  private parseSmartWalletEmail(emailData: any): SmartWalletTransaction | null {
    const subject = emailData.subject?.toLowerCase() || '';
    const body = emailData.body || '';
    const sender = emailData.sender?.toLowerCase() || '';

    // Smart wallet detection patterns
    const walletPatterns = {
      momo: /momo|m_service/i,
      zalopay: /zalopay|zalo pay|zalo/i,
      viettelpay: /viettel pay|viettelpay/i,
      vnpay: /vnpay|vn pay/i,
      airpay: /airpay|air pay/i,
      shopeepay: /shopee pay|shopeepay/i,
      grabpay: /grab pay|grabpay/i,
      vietqr: /vietqr|viet qr/i
    };

    let walletProvider = 'Unknown Wallet';
    for (const [wallet, pattern] of Object.entries(walletPatterns)) {
      if (pattern.test(subject) || pattern.test(sender)) {
        walletProvider = wallet.toUpperCase();
        break;
      }
    }

    // If not a wallet provider, return null
    if (walletProvider === 'Unknown Wallet') return null;

    // Amount parsing (similar to bank parsing)
    const amountPatterns = [
      /(?:số tiền|amount|so tien)[::\s]*([+-]?)[\s]*([0-9,.]+)\s*(VND|USD|EUR|đ)/gi,
      /([+-]?)[\s]*([0-9,.]+)\s*(VND|USD|EUR|đ)/gi
    ];

    let amount = 0;
    let currency = 'VND';
    let type: 'income' | 'expense' = 'expense';

    for (const pattern of amountPatterns) {
      const match = pattern.exec(body);
      if (match) {
        const sign = match[1];
        const amountStr = match[2].replace(/[,.]/g, '');
        amount = parseFloat(amountStr);
        currency = match[3] || 'VND';
        type = sign === '+' || body.includes('nhận tiền') || body.includes('received') ? 'income' : 'expense';
        break;
      }
    }

    if (amount === 0) return null;

    // Description parsing
    let description = `${walletProvider} Transaction`;
    const descPatterns = [
      /(?:nội dung|description|merchant)[::\s]*(.+?)(?:\n|$)/gi,
      /(?:thanh toán|payment)[::\s]*(.+?)(?:\n|$)/gi
    ];

    for (const pattern of descPatterns) {
      const match = pattern.exec(body);
      if (match && match[1]) {
        description = match[1].trim();
        break;
      }
    }

    return {
      id: this.generateTransactionId(),
      amount,
      type,
      description,
      category: this.determineWalletCategory(description, body),
      walletProvider,
      currency,
      timestamp: new Date()
    };
  }

  // Determine transaction category for bank transactions
  private determineBankCategory(description: string, body: string): string {
    const desc = description.toLowerCase();
    const bodyText = body.toLowerCase();

    if (desc.includes('atm') || bodyText.includes('cash withdrawal')) return 'Cash & ATM';
    if (desc.includes('transfer') || desc.includes('chuyển khoản')) return 'Transfer';
    if (desc.includes('salary') || desc.includes('lương')) return 'Salary';
    if (desc.includes('coffee') || desc.includes('restaurant') || desc.includes('food')) return 'Food & Dining';
    if (desc.includes('gas') || desc.includes('fuel') || desc.includes('xăng')) return 'Transportation';
    if (desc.includes('electricity') || desc.includes('điện') || desc.includes('bill')) return 'Bills & Utilities';
    if (desc.includes('shopping') || desc.includes('store') || desc.includes('shop')) return 'Shopping';
    if (desc.includes('medical') || desc.includes('hospital') || desc.includes('pharmacy')) return 'Healthcare';
    
    return 'Other';
  }

  // Determine transaction category for wallet transactions
  private determineWalletCategory(description: string, body: string): string {
    const desc = description.toLowerCase();
    
    if (desc.includes('grab') || desc.includes('taxi') || desc.includes('xe')) return 'Transportation';
    if (desc.includes('shopee') || desc.includes('lazada') || desc.includes('tiki')) return 'Shopping';
    if (desc.includes('food') || desc.includes('baemin') || desc.includes('now')) return 'Food & Dining';
    if (desc.includes('mobile') || desc.includes('phone') || desc.includes('data')) return 'Bills & Utilities';
    if (desc.includes('game') || desc.includes('entertainment')) return 'Entertainment';
    
    return 'Digital Payment';
  }

  // Send transaction to chat screen for category selection (like SMS flow)
  private async sendTransactionToChat(transaction: BankEmailTransaction | SmartWalletTransaction, source: 'bank' | 'wallet') {
    try {
      const transactionData = {
        amount: transaction.amount,
        type: transaction.type,
        description: transaction.description,
        category: transaction.category,
        currency: transaction.currency,
        bankName: 'bankName' in transaction ? transaction.bankName : undefined,
        walletProvider: 'walletProvider' in transaction ? transaction.walletProvider : undefined,
        source: source === 'bank' ? 'email-bank' : 'email-wallet',
        timestamp: transaction.timestamp,
        id: transaction.id
      };

      console.log(`📤 Sending ${source} transaction to chat:`, transactionData);
      
      // Show immediate notification
      const provider = 'bankName' in transaction ? transaction.bankName : transaction.walletProvider;
      const amountStr = transaction.amount.toLocaleString();
      const typeIcon = transaction.type === 'income' ? '💰' : '💸';
      
      Alert.alert(
        `${source === 'bank' ? '🏦' : '📱'} Payment Detected`,
        `${typeIcon} ${transaction.type === 'income' ? '+' : '-'}${amountStr} ${transaction.currency}\n📝 ${transaction.description}\n\nTransaction sent to Chat for confirmation!`,
        [
          {
            text: 'View in Chat',
            onPress: () => {
              // Emit navigation event to open chat
              DeviceEventEmitter.emit('NavigateToChat');
            }
          },
          {
            text: 'OK',
            style: 'default'
          }
        ]
      );
      
      // Emit event that chat screen listens to (same as SMS service)
      DeviceEventEmitter.emit('TransactionChatMessage', {
        transactionData,
        source: `email-${source}`,
        message: this.createChatMessage(transaction, source)
      });

    } catch (error) {
      console.error(`Error sending ${source} transaction to chat:`, error);
    }
  }

  // Create chat message for transaction (like SMS format)
  private createChatMessage(transaction: BankEmailTransaction | SmartWalletTransaction, source: 'bank' | 'wallet'): string {
    const provider = 'bankName' in transaction ? transaction.bankName : transaction.walletProvider;
    const icon = source === 'bank' ? '🏦' : '📱';
    const amountStr = transaction.amount.toLocaleString();
    const typeIcon = transaction.type === 'income' ? '💰' : '💸';
    
    return `${icon} ${provider} Transaction
${typeIcon} ${transaction.type === 'income' ? '+' : '-'}${amountStr} ${transaction.currency}
📝 ${transaction.description}
🏷️ Category: ${transaction.category}
⏰ ${transaction.timestamp.toLocaleString()}

Would you like to confirm this transaction?`;
  }

  // Insert bank transaction into database (called after user confirms in chat)
  public async insertBankTransaction(transaction: BankEmailTransaction) {
    try {
      await addTransactionToDatabase({
        date: transaction.timestamp.toISOString(),
        title: `${transaction.bankName}: ${transaction.description}`,
        note: `${transaction.type} ${transaction.amount} ${transaction.currency} - Category: ${transaction.category}`,
        userId: 'user_001', // TODO: Get actual user ID from auth context
        createdAt: new Date()
      });

      console.log(`💳 Bank transaction inserted: ${transaction.bankName} ${transaction.type} ${transaction.amount} ${transaction.currency}`);
      
      // Emit event for UI updates
      DeviceEventEmitter.emit('TransactionAdded', {
        transaction,
        source: 'email-bank'
      });

    } catch (error) {
      console.error('Error inserting bank transaction:', error);
    }
  }

  // Insert wallet transaction into database (called after user confirms in chat)
  public async insertWalletTransaction(transaction: SmartWalletTransaction) {
    try {
      await addTransactionToDatabase({
        date: transaction.timestamp.toISOString(),
        title: `${transaction.walletProvider}: ${transaction.description}`,
        note: `${transaction.type} ${transaction.amount} ${transaction.currency} - Category: ${transaction.category}`,
        userId: 'user_001', // TODO: Get actual user ID from auth context
        createdAt: new Date()
      });

      console.log(`📱 Wallet transaction inserted: ${transaction.walletProvider} ${transaction.type} ${transaction.amount} ${transaction.currency}`);
      
      // Emit event for UI updates
      DeviceEventEmitter.emit('TransactionAdded', {
        transaction,
        source: 'email-wallet'
      });

    } catch (error) {
      console.error('Error inserting wallet transaction:', error);
    }
  }

  // Generate unique email ID
  private generateEmailId(emailData: any): string {
    const content = `${emailData.subject}-${emailData.sender}-${emailData.timestamp}`;
    // Simple hash function for React Native (btoa not available)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `EMAIL_${Math.abs(hash)}_${Date.now()}`.substring(0, 20);
  }

  // Generate unique transaction ID
  private generateTransactionId(): string {
    return `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Simulate bank and wallet emails for testing (QR code payment scenarios)
  private simulateBankEmails() {
    console.log('🎭 Starting QR code payment simulation...');

    // Simulate coffee shop QR payment via Vietcombank
    setTimeout(() => {
      this.handleEmailNotification({
        subject: 'VCB - Thông báo giao dịch QR Code',
        body: `
          Tài khoản của bạn vừa có giao dịch:
          Số tiền: -45,000 VND
          Nội dung: QR Payment - Highlands Coffee
          Loại GD: Thanh toán QR Code
          Thời gian: ${new Date().toLocaleString()}
          Số dư: 2,455,000 VND
        `,
        sender: 'noreply@vietcombank.com.vn',
        timestamp: Date.now()
      });
    }, 5000);

    // Simulate MoMo QR payment for grab food
    setTimeout(() => {
      this.handleEmailNotification({
        subject: 'MoMo - Thanh toán QR thành công',
        body: `
          Bạn đã thanh toán QR thành công:
          Số tiền: -85,000 VND
          Merchant: GrabFood - Bun Bo Hue Ngon
          Loại: QR Code Payment
          Thời gian: ${new Date().toLocaleString()}
          Số dư ví: 320,000 VND
        `,
        sender: 'noreply@momo.vn',
        timestamp: Date.now()
      });
    }, 15000);

    // Simulate ZaloPay QR payment for shopping
    setTimeout(() => {
      this.handleEmailNotification({
        subject: 'ZaloPay - Giao dịch thành công',
        body: `
          Giao dịch QR Code thành công:
          Số tiền: -250,000 VND
          Merchant: Circle K - Convenient Store
          Nội dung: QR Payment for drinks and snacks
          Thời gian: ${new Date().toLocaleString()}
        `,
        sender: 'noreply@zalopay.vn',
        timestamp: Date.now()
      });
    }, 25000);
  }

  // Stop listening
  public stop() {
    DeviceEventEmitter.removeAllListeners('EmailNotification');
    console.log('🔇 Email transaction service stopped');
  }

  // Confirm and save transaction from chat screen
  public async confirmTransaction(transactionData: any, finalCategory?: string) {
    try {
      console.log('✅ Confirming transaction from chat:', transactionData);
      
      // Update category if user changed it
      if (finalCategory) {
        transactionData.category = finalCategory;
      }

      // Insert to database based on source
      if (transactionData.source === 'email-bank') {
        await this.insertBankTransaction(transactionData);
      } else if (transactionData.source === 'email-wallet') {
        await this.insertWalletTransaction(transactionData);
      }

      return true;
    } catch (error) {
      console.error('Error confirming transaction:', error);
      return false;
    }
  }
}

export const emailTransactionService = new EmailTransactionService();
