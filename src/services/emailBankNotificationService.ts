import { DeviceEventEmitter, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    this.loadProcessedEmailIds();
    this.loadEmailConfig();
  }

  // Load processed email IDs from AsyncStorage
  private async loadProcessedEmailIds(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.PROCESSED_EMAILS_KEY);
      if (stored) {
        const idsArray = JSON.parse(stored);
        this.processedEmailIds = new Set(idsArray);
      } 
    } catch (error) {
      this.processedEmailIds = new Set();
    }
  }

  // Save processed email IDs to AsyncStorage
  private async saveProcessedEmailIds(): Promise<void> {
    try {
      const idsArray = Array.from(this.processedEmailIds);
      await AsyncStorage.setItem(this.PROCESSED_EMAILS_KEY, JSON.stringify(idsArray));
    } catch (error) {
      console.error('❌ Error saving processed email IDs:', error);
    }
  }

  // Load email configuration from AsyncStorage
  private async loadEmailConfig(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.EMAIL_CONFIG_KEY);
      if (stored) {
        this.emailConfig = JSON.parse(stored);
      } else {
        // log removed
      }
    } catch (error) {
      this.emailConfig = null;
    }
  }

  // Save email configuration to AsyncStorage
  public async saveEmailConfig(config: EmailConfig): Promise<void> {
    try {
      this.emailConfig = config;
      await AsyncStorage.setItem(this.EMAIL_CONFIG_KEY, JSON.stringify(config));
      // log removed
    } catch (error) {
      console.error('❌ Error saving email configuration:', error);
    }
  }

  // Parse email content to extract transaction data
  private parseEmailContent(emailBody: string, emailSubject: string, sender: string): EmailTransaction | null {
    try {

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
          // log removed
          
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
      
      // Emit event to add transaction message to chat (same as SMS service)
      DeviceEventEmitter.emit('TransactionChatMessage', transactionMessage);

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
    
    // Generate unique ID for this email
    const emailId = this.generateEmailId(emailData);
    
    // Check if we've already processed this email
    if (this.processedEmailIds.has(emailId)) {
      return;
    }
    
    const parsedTransaction = this.parseEmailContent(emailData.body, emailData.subject, emailData.sender);
    
    if (parsedTransaction) {
      
      // Mark this email as processed
      this.processedEmailIds.add(emailId);
      this.saveProcessedEmailIds();
      
      this.processDetectedTransaction(parsedTransaction);
    } 
  }

  // Setup automatic email monitoring for real-time detection
  public async setupEmailMonitoring(): Promise<boolean> {
    try {
      
      if (!this.emailConfig) {
        return false;
      }

      this.isListening = true;

      // Start monitoring based on provider
      switch (this.emailConfig.provider) {
        case 'outlook':
          return await this.setupOutlookMonitoring();
        case 'imap':
          return await this.setupImapMonitoring();
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  // Start automatic email monitoring
  public async startEmailMonitoring(): Promise<void> {
    if (!this.emailConfig) {
      return;
    }

    this.isListening = true;
    
    // Start background email checking
    this.startBackgroundEmailCheck();
  }

  // Check if monitoring is currently active
  public isMonitoringActive(): boolean {
    return this.isListening;
  }

  // Background email checking (polls every 30 seconds)
  private startBackgroundEmailCheck(): void {
    
    this.emailListener = setInterval(async () => {
      if (this.isListening) {
      }
    }, 30000); // Check every 30 seconds
  }

  // Stop email monitoring
  public stopEmailMonitoring(): void {
    // log removed
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

  // Outlook API monitoring setup (placeholder)
  private async setupOutlookMonitoring(): Promise<boolean> {
    return false;
  }

  // IMAP monitoring setup (placeholder)
  private async setupImapMonitoring(): Promise<boolean> {
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
      // log removed
    } catch (error) {
      console.error('❌ Error clearing processed emails:', error);
    }
  }

}

// Export singleton instance
export const emailBankNotificationService = new EmailBankNotificationService();

