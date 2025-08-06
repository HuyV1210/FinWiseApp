# SMS Bank Notification Setup Guide

## 📱 SMS Transaction Monitoring

SMS monitoring is much more reliable than app notifications because:
- ✅ Works when app is closed (SMS are delivered to system)
- ✅ No special permissions beyond SMS access
- ✅ Banks always send SMS for transactions
- ✅ More reliable parsing patterns

## 🚀 How to Enable SMS Monitoring

### Step 1: Add to AuthContext
Add this to your AuthContext.tsx in the login function:

```typescript
// After successful login
if (user) {
  // Initialize SMS monitoring
  const smsInitialized = await smsBankNotificationService.initialize();
  if (smsInitialized) {
    console.log('✅ SMS bank monitoring enabled');
  } else {
    console.log('❌ SMS permissions denied - manual transactions only');
  }
}
```

### Step 2: Android Permissions
The app will automatically request these permissions:
- `READ_SMS`: To scan existing SMS for recent transactions
- `RECEIVE_SMS`: To monitor new incoming SMS messages

### Step 3: Testing SMS Parsing

Use the bell icon in ChatScreen and select:
- 📱 **SMS: Vietnamese Bank** - Tests VND transaction parsing
- 📱 **SMS: International Bank** - Tests USD transaction parsing  
- 📱 **SMS: Salary** - Tests income transaction parsing

## 📨 Supported SMS Formats

### Vietnamese Banks
```
GD: -150,000 VND tai GRAB*TRIP Ho Chi Minh luc 14:30. So du: 2,500,000 VND
TCB: Credit +5,000,000 VND - Salary transfer from COMPANY ABC
```

### International Banks
```
CHASE: Debit $25.50 at STARBUCKS #1234 on 08/05/25. Available balance: $1,500.00
BOA: Purchase $45.00 at AMAZON.COM on 08/05/25
```

### Supported Features
- ✅ **Multi-currency**: VND, USD, EUR, GBP
- ✅ **Transaction types**: Automatic income/expense detection
- ✅ **Smart categorization**: Food, Transport, Shopping, etc.
- ✅ **Merchant extraction**: Automatically finds store/service names
- ✅ **Bank identification**: Recognizes sender bank

## 🔧 Real-World Usage

### How it works:
1. **Bank sends SMS** → "GD: -50,000 VND tai COFFEE SHOP"
2. **Service detects bank SMS** → Parses amount, merchant, type
3. **Preview modal appears** → User can review and edit
4. **User confirms** → Transaction saved to Firebase

### Background Processing:
- **App active**: Immediate processing and preview modal
- **App background**: SMS queued, processed when app opens
- **App closed**: SMS stored by system, processed on next app launch

## 🧪 Test Results You Should See

When testing SMS scenarios:

```
🧪 Testing Vietnamese bank SMS...
🔍 Parsing bank SMS: GD: -150,000 VND tai GRAB*TRIP Ho Chi Minh...
🎯 Pattern matched: ["-", "150000", "VND"]
✅ Successfully parsed SMS transaction: {amount: 150000, type: "expense", ...}
📤 Processing SMS transaction: [transaction object]
✅ SMS transaction sent to preview modal
```

## 🎯 Advantages of SMS over App Notifications

| Feature | SMS Monitoring | App Notifications |
|---------|---------------|-------------------|
| **Background** | ✅ Always works | ❌ Limited |
| **Permissions** | ✅ Simple SMS access | ❌ Complex listener service |
| **Reliability** | ✅ 99% delivery | ❌ Can be blocked |
| **Bank Support** | ✅ All banks send SMS | ❌ App-specific |
| **Parsing** | ✅ Standardized formats | ❌ Varies by app |

SMS monitoring gives you the best real-world transaction automation experience! 🎉
