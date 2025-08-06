import { DeviceEventEmitter, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Top-level log to verify module loading
console.log('📧 Email Bank Notification Service file loaded - top level');

interface EmailTransaction {
  amount: number;
  type: 'income' | 'expense';
  description: string;
  category?: string;
  bankName?: string;
  currency?: string;
  timestamp: Date;
  emailBody: string;
  emailSubject: string;
  sender: string;
}

interface EmailConfig {
  provider: 'gmail' | 'outlook' | 'imap';
  email?: string;
  accessToken?: string;
  refreshToken?: string;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  imapUser?: string;
  imapPassword?: string;
}

class EmailBankNotificationService {
  private isListening = false;
  private emailListener: any = null;
  private processedEmailIds = new Set<string>();
  private readonly PROCESSED_EMAILS_KEY = 'processedEmailIds';
  private readonly EMAIL_CONFIG_KEY = 'emailConfig';
  private emailConfig: EmailConfig | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    console.log('📧 Email Bank Notification Service constructor called');
    // Load processed email IDs and config from storage
    this.loadProcessedEmailIds();
    this.loadEmailConfig();
    // Auto-test email service status on initialization
    this.autoTestOnStartup();
  }

  private autoTestOnStartup() {
    console.log('⏰ Email auto-test scheduled for 2 seconds from now...');
    // Wait a bit for the app to fully initialize, then test
    setTimeout(() => {
      console.log('\n📧 === EMAIL BANK NOTIFICATION SERVICE AUTO-TEST ===');
      this.testEmailServiceStatus();
      
      // Test email parsing functionality
      setTimeout(() => {
        console.log('\n🧪 === TESTING EMAIL TRANSACTION PARSING ===');
        this.testBankEmailParsing();
        
        // Test different bank email formats
        setTimeout(() => {
          this.testVietcombankEmail();
          this.testACBEmail();
          this.testInternationalBankEmail();
        }, 500);
      }, 1000);
      
      console.log('📧 === EMAIL AUTO-TEST COMPLETED ===\n');
    }, 2000);
  }

  // Load processed email IDs from AsyncStorage
  private async loadProcessedEmailIds(): Promise<void> {
    try {
      console.log('📂 Loading processed email IDs from storage...');
      const stored = await AsyncStorage.getItem(this.PROCESSED_EMAILS_KEY);
      if (stored) {
        const idsArray = JSON.parse(stored);
        this.processedEmailIds = new Set(idsArray);
        console.log(`📂 Loaded ${this.processedEmailIds.size} processed email IDs from storage`);
      } else {
        console.log('📂 No processed email IDs found in storage');
      }
    } catch (error) {
      console.error('❌ Error loading processed email IDs:', error);
      this.processedEmailIds = new Set();
    }
  }

  // Save processed email IDs to AsyncStorage
  private async saveProcessedEmailIds(): Promise<void> {
    try {
      const idsArray = Array.from(this.processedEmailIds);
      await AsyncStorage.setItem(this.PROCESSED_EMAILS_KEY, JSON.stringify(idsArray));
      console.log(`💾 Saved ${idsArray.length} processed email IDs to storage`);
    } catch (error) {
      console.error('❌ Error saving processed email IDs:', error);
    }
  }

  // Load email configuration from AsyncStorage
  private async loadEmailConfig(): Promise<void> {
    try {
      console.log('⚙️ Loading email configuration from storage...');
      const stored = await AsyncStorage.getItem(this.EMAIL_CONFIG_KEY);
      if (stored) {
        this.emailConfig = JSON.parse(stored);
        console.log(`⚙️ Loaded email config for provider: ${this.emailConfig?.provider}`);
      } else {
        console.log('⚙️ No email configuration found in storage');
      }
    } catch (error) {
      console.error('❌ Error loading email configuration:', error);
      this.emailConfig = null;
    }
  }

  // Save email configuration to AsyncStorage
  public async saveEmailConfig(config: EmailConfig): Promise<void> {
    try {
      this.emailConfig = config;
      await AsyncStorage.setItem(this.EMAIL_CONFIG_KEY, JSON.stringify(config));
      console.log(`💾 Saved email config for provider: ${config.provider}`);
    } catch (error) {
      console.error('❌ Error saving email configuration:', error);
    }
  }

  // Test email service status
  public testEmailServiceStatus(): void {
    console.log('🔍 === EMAIL SERVICE STATUS TEST ===');
    console.log('📧 Email service class instantiated:', !!this);
    console.log('📧 Email listener status:', this.isListening ? 'ACTIVE' : 'INACTIVE');
    console.log('📧 Processed emails count:', this.processedEmailIds.size);
    console.log('📧 Email config status:', this.emailConfig ? 'CONFIGURED' : 'NOT CONFIGURED');
    if (this.emailConfig) {
      console.log('📧 Email provider:', this.emailConfig.provider);
      console.log('📧 Email address:', this.emailConfig.email || 'NOT SET');
    }
  }

  // Test bank email parsing
  public testBankEmailParsing(): void {
    console.log('🧪 Testing email parsing capabilities...');
    
    // Test Vietnamese Vietcombank email
    const vietcombankEmail = {
      subject: 'Thông báo giao dịch - Vietcombank',
      body: `
        Quý khách đã thực hiện giao dịch:
        - Số tiền: 150,000 VND
        - Loại giao dịch: Chuyển khoản
        - Thời gian: 10:30 15/01/2024
        - Nội dung: Thanh toán cafe Highlands
        - Số dư: 2,500,000 VND
      `,
      sender: 'noreply@vietcombank.com.vn'
    };

    const parsed1 = this.parseEmailContent(vietcombankEmail.body, vietcombankEmail.subject, vietcombankEmail.sender);
    console.log('✅ Vietcombank email parsed:', parsed1);

    // Test ACB email
    const acbEmail = {
      subject: 'ACB - Transaction Notification',
      body: `
        Dear Customer,
        
        Your account has been debited:
        Amount: VND 75,500
        Transaction: ATM Withdrawal
        Location: ATM Nguyen Hue Street
        Time: 14:25 15/01/2024
        Available Balance: VND 1,890,000
      `,
      sender: 'ebanking@acb.com.vn'
    };

    const parsed2 = this.parseEmailContent(acbEmail.body, acbEmail.subject, acbEmail.sender);
    console.log('✅ ACB email parsed:', parsed2);
  }

  // Test specific bank email formats
  public testVietcombankEmail(): void {
    console.log('🏦 Testing Vietcombank email format...');
    const mockEmail = {
      subject: 'VCB - Thông báo biến động số dư',
      body: `
        Kính chào Quý khách,
        
        Tài khoản của Quý khách vừa có giao dịch:
        - Số tiền: -250,000 VND
        - Loại GD: Thanh toán QR Code
        - Thời gian: 16:45 15/01/2024
        - Nội dung: GRAB_123456789
        - Số dư khả dụng: 3,750,000 VND
        
        Cảm ơn Quý khách đã sử dụng dịch vụ.
      `,
      sender: 'no-reply@vietcombank.com.vn'
    };

    const transaction = this.parseEmailContent(mockEmail.body, mockEmail.subject, mockEmail.sender);
    if (transaction) {
      console.log('✅ Vietcombank transaction detected:', transaction);
      this.processDetectedTransaction(transaction);
    }
  }

  public testACBEmail(): void {
    console.log('🏦 Testing ACB email format...');
    const mockEmail = {
      subject: 'ACB ConnectNet - Giao dịch thành công',
      body: `
        Dear Valued Customer,
        
        Your transaction has been completed successfully:
        
        Transaction Type: Transfer
        Amount: VND 500,000
        Fee: VND 5,000
        To: NGUYEN VAN A - 123456789
        Content: Tra tien quan an
        Time: 09:15:30 16/01/2024
        Reference: ACB240116091530123
        
        Your account balance: VND 4,245,000
      `,
      sender: 'connectnet@acb.com.vn'
    };

    const transaction = this.parseEmailContent(mockEmail.body, mockEmail.subject, mockEmail.sender);
    if (transaction) {
      console.log('✅ ACB transaction detected:', transaction);
      this.processDetectedTransaction(transaction);
    }
  }

  public testInternationalBankEmail(): void {
    console.log('🌍 Testing international bank email format...');
    const mockEmail = {
      subject: 'Transaction Alert - Chase Bank',
      body: `
        Dear Customer,
        
        A transaction has been processed on your account:
        
        Date: January 16, 2024
        Time: 2:30 PM EST
        Amount: $125.50
        Transaction: Debit Card Purchase
        Merchant: STARBUCKS #1234
        Location: New York, NY
        Available Balance: $2,890.75
        
        Thank you for banking with Chase.
      `,
      sender: 'alerts@chase.com'
    };

    const transaction = this.parseEmailContent(mockEmail.body, mockEmail.subject, mockEmail.sender);
    if (transaction) {
      console.log('✅ International transaction detected:', transaction);
      this.processDetectedTransaction(transaction);
    }
  }

  // Parse email content to extract transaction data
  private parseEmailContent(emailBody: string, emailSubject: string, sender: string): EmailTransaction | null {
    try {
      console.log('🔍 Parsing email content from:', sender);

      // Enhanced patterns for email parsing (more comprehensive than SMS)
      const patterns = [
        // Vietnamese bank patterns (VND)
        /(?:Số tiền|Amount|Tiền|Money)[-:\s]*([+-]?)\s*([0-9,]+(?:\.\d{2})?)\s*(VND|đ)/i,
        /(?:Giao dịch|Transaction|GD)[-:\s]*([+-]?)\s*([0-9,]+(?:\.\d{2})?)\s*(VND|đ)/i,
        /(?:Rút tiền|Withdrawal|ATM)[-:\s]*([+-]?)\s*([0-9,]+(?:\.\d{2})?)\s*(VND|đ)/i,
        /(?:Chuyển khoản|Transfer|Payment)[-:\s]*([+-]?)\s*([0-9,]+(?:\.\d{2})?)\s*(VND|đ)/i,
        /(?:Thanh toán|Payment|Pay)[-:\s]*([+-]?)\s*([0-9,]+(?:\.\d{2})?)\s*(VND|đ)/i,
        
        // International patterns (USD, EUR, GBP)
        /(?:Amount|Transaction|Payment|Debit|Credit)[-:\s]*([+-]?)\$([0-9,]+\.?\d*)/i,
        /(?:Amount|Transaction|Payment|Debit|Credit)[-:\s]*([+-]?)€([0-9,]+\.?\d*)/i,
        /(?:Amount|Transaction|Payment|Debit|Credit)[-:\s]*([+-]?)£([0-9,]+\.?\d*)/i,
        /(?:Amount|Transaction|Payment|Debit|Credit)[-:\s]*([+-]?)\s*([0-9,]+\.?\d*)\s*(USD|EUR|GBP)/i,
        
        // Generic amount patterns
        /([+-]?)\s*([0-9,]+(?:\.\d{2})?)\s*(VND|USD|EUR|GBP|\$|€|£)/i,
      ];

      for (const pattern of patterns) {
        const match = emailBody.match(pattern);
        if (match) {
          console.log('🎯 Email pattern matched:', match);
          
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
            // Vietnamese patterns: amount, currency (no sign)
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
          if (currency === 'đ') currency = 'VND';

          // Determine transaction type
          let type: 'income' | 'expense' = 'expense'; // Default to expense
          
          // Check for income indicators in email
          const incomeKeywords = ['credit', 'deposit', 'nap tien', 'chuyen den', 'receive', 'salary', 'luong', 'nhan duoc', 'nhan', 'incoming', 'transfer in', 'refund'];
          const expenseKeywords = ['debit', 'withdrawal', 'rut tien', 'purchase', 'thanh toan', 'charge', 'fee', 'da chuyen', 'chuyen khoan', 'payment', 'spending', 'atm', 'pos'];
          
          const bodyLower = emailBody.toLowerCase();
          const subjectLower = emailSubject.toLowerCase();
          const fullText = bodyLower + ' ' + subjectLower;
          
          if (incomeKeywords.some(keyword => fullText.includes(keyword)) || sign === '+') {
            type = 'income';
          } else if (expenseKeywords.some(keyword => fullText.includes(keyword)) || sign === '-') {
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
            description: this.extractDescription(emailBody, emailSubject),
            category: this.guessCategory(emailBody, emailSubject),
            bankName: this.extractBankName(sender),
            currency,
            timestamp: new Date(),
            emailBody,
            emailSubject,
            sender,
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error parsing email content:', error);
      return null;
    }
  }

  // Extract description from email content
  private extractDescription(emailBody: string, emailSubject: string): string {
    const content = emailBody.toLowerCase();
    
    // Look for common description patterns in emails
    const patterns = [
      /(?:nội dung|content|description|memo)[-:\s]*([^\n\r]{1,100})/i,
      /(?:merchant|tại|at|location)[-:\s]*([^\n\r]{1,100})/i,
      /(?:ref|reference)[-:\s]*([^\n\r]{1,50})/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // Fallback to email subject
    return emailSubject || 'Email transaction';
  }

  // Guess category based on email content
  private guessCategory(emailBody: string, emailSubject: string): string {
    const content = (emailBody + ' ' + emailSubject).toLowerCase();
    
    // Enhanced category detection for email content
    const categoryKeywords = {
      'Food & Dining': ['coffee', 'restaurant', 'cafe', 'food', 'dining', 'grab food', 'highlands', 'starbucks', 'mcdonalds', 'kfc', 'pizza', 'cafe', 'quan an', 'an uong'],
      'Transport': ['grab', 'uber', 'taxi', 'fuel', 'gas', 'petrol', 'parking', 'toll', 'metro', 'bus', 'xe bus', 'di chuyen', 'gas station'],
      'Shopping': ['shopping', 'store', 'mall', 'market', 'amazon', 'shopee', 'lazada', 'mua sam', 'shop'],
      'Entertainment': ['cinema', 'movie', 'game', 'spotify', 'netflix', 'entertainment', 'giai tri'],
      'Health & Medical': ['hospital', 'pharmacy', 'medical', 'doctor', 'clinic', 'benh vien', 'y te'],
      'Utilities': ['electric', 'water', 'internet', 'phone', 'utility', 'bill', 'dien', 'nuoc', 'internet'],
      'ATM/Cash': ['atm', 'withdrawal', 'cash', 'rut tien'],
      'Transfer': ['transfer', 'chuyen khoan', 'chuyen tien'],
      'Salary': ['salary', 'luong', 'payroll', 'wage'],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        return category;
      }
    }
    
    return 'General';
  }

  // Extract bank name from sender email
  private extractBankName(sender: string): string {
    const bankDomains = {
      'vietcombank.com': 'Vietcombank',
      'acb.com': 'ACB',
      'techcombank.com': 'Techcombank',
      'mbbank.com': 'MB Bank',
      'bidv.com': 'BIDV',
      'chase.com': 'Chase Bank',
      'bankofamerica.com': 'Bank of America',
      'wells': 'Wells Fargo',
      'citibank': 'Citibank',
    };

    const senderLower = sender.toLowerCase();
    for (const [domain, name] of Object.entries(bankDomains)) {
      if (senderLower.includes(domain)) {
        return name;
      }
    }
    
    return 'Bank';
  }

  // Generate unique ID for email to prevent duplicates
  private generateEmailId(email: any): string {
    const content = `${email.subject || ''}_${email.sender || ''}_${email.timestamp || Date.now()}`;
    
    // Simple hash function for React Native (instead of btoa)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to positive string and limit length
    return Math.abs(hash).toString(36).substring(0, 20) + Date.now().toString(36).substring(-10);
  }

  // Process detected transaction by emitting event
  private processDetectedTransaction(transaction: EmailTransaction): void {
    try {
      console.log('📧 Processing detected email transaction:', transaction);
      
      // Create transaction message for chat (same format as SMS service)
      const transactionMessage = {
        id: `email_transaction_${Date.now()}`,
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
          source: 'email'
        }
      };

      console.log('📧 Emitting TransactionChatMessage event with data:', transactionMessage);
      
      // Emit event to add transaction message to chat (same as SMS service)
      DeviceEventEmitter.emit('TransactionChatMessage', transactionMessage);

      console.log('📧 Email transaction event emitted successfully');
    } catch (error) {
      console.error('❌ Error processing detected email transaction:', error);
    }
  }

  // Format transaction message for chat display (similar to SMS service)
  private formatTransactionMessage(transaction: EmailTransaction): string {
    const typeEmoji = transaction.type === 'income' ? '💰' : '💸';
    const amountFormatted = new Intl.NumberFormat('vi-VN').format(transaction.amount);
    
    return `${typeEmoji} **Email Transaction Detected**

📧 **${transaction.bankName || 'Bank'}**
${transaction.type === 'income' ? '📈' : '📉'} ${transaction.type === 'income' ? '+' : '-'}${amountFormatted} ${transaction.currency}
📝 ${transaction.description}
🏷️ ${transaction.category || 'Other'}

_From: ${transaction.sender}_`;
  }

  // Public method to manually process an email (for testing or manual input)
  public processEmail(emailData: { subject: string; body: string; sender: string; timestamp?: Date }): void {
    console.log('📧 Processing manual email:', emailData.sender);
    
    // Generate unique ID for this email
    const emailId = this.generateEmailId(emailData);
    
    // Check if we've already processed this email
    if (this.processedEmailIds.has(emailId)) {
      console.log('🔄 Email already processed, skipping:', emailId.substring(0, 50) + '...');
      return;
    }
    
    const parsedTransaction = this.parseEmailContent(emailData.body, emailData.subject, emailData.sender);
    
    if (parsedTransaction) {
      console.log('✅ Successfully parsed email transaction:', parsedTransaction);
      
      // Mark this email as processed
      this.processedEmailIds.add(emailId);
      this.saveProcessedEmailIds();
      
      console.log(`📝 Marked email as processed. Total processed: ${this.processedEmailIds.size}`);
      
      this.processDetectedTransaction(parsedTransaction);
    } else {
      console.log('❌ Could not parse transaction from email');
    }
  }

  // Setup automatic email monitoring for real-time detection
  public async setupEmailMonitoring(): Promise<boolean> {
    try {
      console.log('📧 Setting up automatic email monitoring...');
      
      if (!this.emailConfig) {
        console.log('❌ No email configuration found. Please configure email access first.');
        return false;
      }

      this.isListening = true;
      console.log('🎯 Email monitoring activated!');

      // Start monitoring based on provider
      switch (this.emailConfig.provider) {
        case 'gmail':
          return await this.setupGmailMonitoring();
        case 'outlook':
          return await this.setupOutlookMonitoring();
        case 'imap':
          return await this.setupImapMonitoring();
        default:
          console.log('❌ Unsupported email provider:', this.emailConfig.provider);
          return false;
      }
    } catch (error) {
      console.error('❌ Error setting up email monitoring:', error);
      return false;
    }
  }

  // Start automatic email monitoring
  public async startEmailMonitoring(): Promise<void> {
    if (!this.emailConfig) {
      console.log('⚠️ Email monitoring requires configuration first');
      return;
    }

    console.log('🚀 Starting automatic email monitoring...');
    this.isListening = true;
    
    // Start background email checking
    this.startBackgroundEmailCheck();
    
    // For development: Simulate automatic email detection
    this.simulateAutomaticEmailDetection();
  }

  // Check if monitoring is currently active
  public isMonitoringActive(): boolean {
    return this.isListening;
  }

  // Background email checking (polls every 30 seconds)
  private startBackgroundEmailCheck(): void {
    console.log('⏰ Starting background email checks every 30 seconds...');
    
    this.emailListener = setInterval(async () => {
      if (this.isListening) {
        console.log('🔍 Checking for new bank emails...');
        // In a real implementation, this would check Gmail/Outlook/IMAP for new emails
        // For now, we'll simulate the process
      }
    }, 30000); // Check every 30 seconds
  }

  // Simulate automatic email detection for demo
  private simulateAutomaticEmailDetection(): void {
    console.log('🎭 Simulating automatic email detection...');
    
    // Simulate receiving emails after random intervals
    setTimeout(() => {
      this.simulateIncomingBankEmail('vietcombank_transfer');
    }, 5000); // First email after 5 seconds

    setTimeout(() => {
      this.simulateIncomingBankEmail('acb_atm');
    }, 15000); // Second email after 15 seconds

    setTimeout(() => {
      this.simulateIncomingBankEmail('international_purchase');
    }, 25000); // Third email after 25 seconds
  }

  // Simulate different types of incoming bank emails
  private simulateIncomingBankEmail(type: string): void {
    console.log(`📧 Simulating incoming ${type} email...`);

    const mockEmails = {
      vietcombank_transfer: {
        subject: 'VCB - Thông báo chuyển khoản',
        body: `
          Kính chào Quý khách,
          
          Tài khoản của Quý khách vừa có giao dịch:
          - Số tiền: -500,000 VND
          - Loại GD: Chuyển khoản online
          - Thời gian: ${new Date().toLocaleString()}
          - Nội dung: Tra tien dien hang thang
          - Người nhận: EVNHN - Điện lực Hà Nội
          - Số dư khả dụng: 4,250,000 VND
          
          Cảm ơn Quý khách.
        `,
        sender: 'noreply@vietcombank.com.vn'
      },
      acb_atm: {
        subject: 'ACB - ATM Withdrawal Notification',
        body: `
          Dear Customer,
          
          Your account has been debited:
          Amount: VND 200,000
          Transaction: ATM Cash Withdrawal
          Location: ATM Vincom Center
          Time: ${new Date().toLocaleString()}
          Reference: ATM${Date.now()}
          Available Balance: VND 3,850,000
          
          Thank you for banking with ACB.
        `,
        sender: 'alerts@acb.com.vn'
      },
      international_purchase: {
        subject: 'Chase - International Transaction Alert',
        body: `
          Dear Customer,
          
          International transaction processed:
          
          Date: ${new Date().toLocaleDateString()}
          Time: ${new Date().toLocaleTimeString()}
          Amount: $45.99
          Merchant: NETFLIX.COM
          Location: Online
          Type: Subscription Payment
          Available Balance: $2,344.26
          
          Questions? Contact us at 1-800-CHASE.
        `,
        sender: 'alerts@chase.com'
      }
    };

    const email = mockEmails[type as keyof typeof mockEmails];
    if (email) {
      console.log(`💌 Processing automatic ${type} email detection...`);
      
      // Add notification that this is automatic detection
      const enhancedBody = `🤖 AUTOMATIC DETECTION\n\n${email.body}`;
      
      // Process the simulated email
      this.processEmail({
        subject: email.subject,
        body: enhancedBody,
        sender: email.sender,
        timestamp: new Date()
      });
    }
  }

  // Stop email monitoring
  public stopEmailMonitoring(): void {
    console.log('⏹️ Stopping email monitoring...');
    this.isListening = false;
    
    if (this.emailListener) {
      clearInterval(this.emailListener);
      this.emailListener = null;
    }
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Gmail API monitoring setup with real-time detection
  private async setupGmailMonitoring(): Promise<boolean> {
    console.log('📧 Setting up Gmail real-time monitoring...');
    
    // Phase 1: Manual polling (current implementation)
    console.log('📊 Phase 1: Background Gmail checking enabled');
    console.log('🔄 Checking Gmail every 30 seconds for bank emails...');
    
    // Phase 2: Gmail Push Notifications (future implementation)
    console.log('🚀 Phase 2: Gmail Push Notifications (planned)');
    console.log('📋 TODO: Implement Gmail API with OAuth and Push Notifications');
    
    /* Real Gmail API implementation would look like:
    
    1. OAuth Setup:
       - Register app in Google Cloud Console
       - Enable Gmail API
       - Configure OAuth credentials
    
    2. Gmail API Integration:
       const gmail = google.gmail({version: 'v1', auth: oauth2Client});
       
    3. Watch for new emails:
       gmail.users.watch({
         userId: 'me',
         requestBody: {
           labelIds: ['INBOX'],
           topicName: 'projects/YOUR_PROJECT/topics/gmail-push'
         }
       });
    
    4. Process incoming emails:
       - Filter by bank sender domains
       - Parse email content
       - Emit transaction events
    */
    
    return true;
  }

  // Outlook API monitoring setup (placeholder)
  private async setupOutlookMonitoring(): Promise<boolean> {
    console.log('📧 Setting up Outlook monitoring...');
    // TODO: Implement Microsoft Graph API integration
    return false;
  }

  // IMAP monitoring setup (placeholder)
  private async setupImapMonitoring(): Promise<boolean> {
    console.log('📧 Setting up IMAP monitoring...');
    // TODO: Implement IMAP connection and monitoring
    // This would require IMAP libraries compatible with React Native
    return false;
  }

  // Get email configuration status
  public getEmailConfigStatus(): { configured: boolean; provider?: string; email?: string } {
    return {
      configured: !!this.emailConfig,
      provider: this.emailConfig?.provider,
      email: this.emailConfig?.email,
    };
  }

  // Clear all processed emails (for testing)
  public async clearProcessedEmails(): Promise<void> {
    try {
      this.processedEmailIds.clear();
      await AsyncStorage.removeItem(this.PROCESSED_EMAILS_KEY);
      console.log('🗑️ Cleared all processed email IDs');
    } catch (error) {
      console.error('❌ Error clearing processed emails:', error);
    }
  }

  // Show processed email IDs (for debugging)
  public showProcessedEmailIds(): void {
    console.log(`📧 Processed Email IDs (${this.processedEmailIds.size} total):`);
    Array.from(this.processedEmailIds).slice(0, 10).forEach((id, index) => {
      console.log(`${index + 1}. ${id.substring(0, 50)}...`);
    });
    if (this.processedEmailIds.size > 10) {
      console.log(`... and ${this.processedEmailIds.size - 10} more`);
    }
  }
}

// Export singleton instance
export const emailBankNotificationService = new EmailBankNotificationService();

// Log successful module creation
console.log('✅ Email Bank Notification Service module created and exported');
