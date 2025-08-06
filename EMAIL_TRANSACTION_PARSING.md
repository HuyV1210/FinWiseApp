# 📧 Email Bank Transaction Parsing - Feature Documentation

## Overview

The FinWise app now supports **email-based bank transaction parsing** as an alternative to SMS parsing. This feature allows users to automatically detect and parse bank transaction emails, making it easier to track spending when banks send notifications via email instead of SMS.

## 🆕 What's New

### Email Bank Notification Service
- **File**: `src/services/emailBankNotificationService.ts`
- **Purpose**: Parse bank transaction emails from various providers
- **Features**:
  - Vietnamese bank email parsing (Vietcombank, ACB, etc.)
  - International bank email parsing (Chase, Bank of America, etc.)
  - Automatic transaction categorization
  - Amount and currency detection
  - Expense vs income classification

### Email Configuration Screen
- **File**: `src/screens/EmailConfig/EmailConfigScreen.tsx`
- **Purpose**: Allow users to configure email access for transaction monitoring
- **Features**:
  - Support for Gmail, Outlook, and custom IMAP
  - OAuth authentication setup (placeholder)
  - IMAP configuration options
  - Manual email parsing testing

### Integration with Chat System
- Email transactions trigger the same preview modal as SMS transactions
- Users can review, edit, and save email-detected transactions
- Consistent user experience across SMS and email sources

## 🎯 Key Features

### 1. **Multi-Provider Support**
```typescript
interface EmailConfig {
  provider: 'gmail' | 'outlook' | 'imap';
  email?: string;
  accessToken?: string;    // For OAuth
  refreshToken?: string;   // For OAuth
  imapHost?: string;       // For IMAP
  imapPort?: number;       // For IMAP
  imapSecure?: boolean;    // For IMAP SSL/TLS
  imapUser?: string;       // For IMAP
  imapPassword?: string;   // For IMAP
}
```

### 2. **Comprehensive Email Parsing**
- **Vietnamese Banks**: Vietcombank, ACB, Techcombank, MB Bank, BIDV
- **International Banks**: Chase, Bank of America, Wells Fargo, Citibank
- **Amount Detection**: Supports VND, USD, EUR, GBP currencies
- **Transaction Types**: Income vs expense classification
- **Categories**: Automatic categorization (Food, Transport, Shopping, etc.)

### 3. **Smart Email Processing**
- **Duplicate Detection**: Prevents processing the same email twice
- **Pattern Matching**: Advanced regex patterns for different email formats
- **Context Analysis**: Uses both email subject and body for better accuracy
- **Error Handling**: Graceful handling of unparseable emails

## 🚀 How to Use

### 1. **Configure Email Access**
1. Go to **Profile → Email Configuration**
2. Choose your email provider (Gmail, Outlook, or Custom IMAP)
3. Enter your email credentials
4. Save configuration

### 2. **Test Email Parsing**
1. In the Email Configuration screen, tap "Test Email Parsing"
2. Or use the Chat screen debug menu: **[Debug] → Email Tests**
3. Choose from various test scenarios:
   - Vietcombank Email
   - ACB Email  
   - International Email
   - General Email Parser

### 3. **Process Real Emails**
Currently supports manual email processing. Future versions will include:
- Real-time email monitoring
- Background email checking
- OAuth integration for Gmail/Outlook

## 🧪 Testing

### Available Test Functions
```typescript
// Test specific bank formats
emailBankNotificationService.testVietcombankEmail();
emailBankNotificationService.testACBEmail();
emailBankNotificationService.testInternationalBankEmail();

// Test general parsing capabilities
emailBankNotificationService.testBankEmailParsing();

// Process custom email manually
emailBankNotificationService.processEmail({
  subject: "Bank Transaction Alert",
  body: "Your account was debited VND 150,000...",
  sender: "alerts@vietcombank.com.vn",
  timestamp: new Date()
});
```

### Debug Features
- **Chat Debug Menu**: Access email tests through chat interface
- **Configuration Status**: Check if email is properly configured
- **Processed Email Tracking**: View history of processed emails
- **Service Status**: Monitor email service initialization

## 📱 User Experience

### Email Transaction Flow
1. **Email Received**: Bank sends transaction notification email
2. **Parsing**: Service extracts amount, type, category, description
3. **Preview Modal**: User sees transaction preview (same as SMS)
4. **Review & Edit**: User can modify details before saving
5. **Save**: Transaction added to Firebase with email source tracking

### Integration Points
- **Profile Screen**: New "Email Configuration" menu item
- **Chat Screen**: Email service initialization and testing
- **Transaction Preview**: Unified modal for SMS and email transactions
- **Navigation**: Added EmailConfig route to app navigation

## 🔧 Technical Implementation

### Architecture
```
Email Service → Parser → Event Emitter → Chat Screen → Preview Modal → Firebase
```

### Key Components
1. **EmailBankNotificationService**: Core parsing and processing logic
2. **EmailConfigScreen**: User interface for configuration
3. **Chat Integration**: Event handling and user interaction
4. **Navigation Setup**: Route registration and screen access

### Data Flow
```typescript
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
```

## 🌟 Benefits

### For Users
- **More Transaction Sources**: Don't rely only on SMS notifications
- **Better Email Handling**: Banks increasingly use email over SMS
- **Consistent Experience**: Same interface as SMS transaction parsing
- **Manual Testing**: Can test and validate email parsing anytime

### For Developers
- **Modular Design**: Separate service following SMS service patterns
- **Extensible**: Easy to add new email providers and formats
- **Debuggable**: Comprehensive logging and testing capabilities
- **Maintainable**: Clear separation of concerns and well-documented code

## 🚧 Future Enhancements

### Phase 1 (Current)
- ✅ Email parsing service
- ✅ Configuration interface
- ✅ Manual testing capabilities
- ✅ Chat integration

### Phase 2 (Planned)
- 🔄 OAuth integration for Gmail/Outlook
- 🔄 Real-time email monitoring
- 🔄 Background email processing
- 🔄 Email forwarding rules setup

### Phase 3 (Future)
- 🔮 AI-powered email analysis
- 🔮 Multi-account email support
- 🔮 Email-based receipt parsing
- 🔮 Smart notification filtering

## 📋 Configuration Guide

### Gmail Setup
1. Enable 2-factor authentication
2. Generate app password
3. Use app password in IMAP settings
4. Host: `imap.gmail.com`, Port: `993`, SSL: `true`

### Outlook Setup
1. Enable IMAP in Outlook settings
2. Use account password or app password
3. Host: `outlook.office365.com`, Port: `993`, SSL: `true`

### Custom IMAP
1. Get IMAP settings from your email provider
2. Enter host, port, security settings
3. Use email credentials or app-specific passwords

## 🐛 Troubleshooting

### Common Issues
- **"Authentication Failed"**: Check email credentials and app passwords
- **"No Emails Parsed"**: Verify email format matches supported patterns
- **"Configuration Error"**: Ensure all required fields are filled
- **"Connection Timeout"**: Check internet connection and IMAP settings

### Debug Steps
1. Test with manual email parsing first
2. Check service status in chat debug menu
3. Verify email configuration in settings
4. Use test functions to validate parsing logic

## 📚 Related Documentation
- [SMS Bank Notification Setup](./TESTING_BANK_NOTIFICATIONS.md)
- [Background Monitoring Setup](./BACKGROUND_MONITORING_SETUP.md)
- [Chat System Integration](./src/screens/Chat/README.md)

---

**Note**: This email parsing feature complements the existing SMS parsing system, giving users more options for automatic transaction detection. The implementation follows the same architectural patterns as the SMS service for consistency and maintainability.
