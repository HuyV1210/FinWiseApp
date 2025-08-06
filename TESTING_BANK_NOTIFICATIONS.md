# 🧪 Bank Notification Testing Guide

## Overview
This guide explains how to test the bank notification flow: **Bank sends notification → Service parses → Preview modal shows → User confirms → Saved**

## ⚠️ **Background Recording Limitations**

### **Current Behavior:**
- ✅ **App in foreground**: All notifications captured and processed immediately
- ✅ **App backgrounded briefly**: Notifications stored and processed when app returns to foreground
- ❌ **App completely closed**: Notifications will be missed (React Native limitation)
- ❌ **Device restarted**: Service needs manual restart

### **What Happens When App is Backgrounded:**
1. **Bank notification arrives** → Stored in local queue
2. **User opens app** → Queued notifications processed automatically
3. **Preview modals appear** for each missed transaction
4. **User can review and confirm** each one

### **For True Background Recording:**
You would need to implement a native Android Notification Listener Service (see `BACKGROUND_MONITORING_SETUP.md` for details).

## 🚀 Quick Testing Methods

### Method 1: Debug Button in ChatScreen
1. **Open the Chat screen** in your app
2. **Look for the bell icon** (🔔) next to the new chat button in the header
3. **Tap the bell icon** to see test options:
   - 🚗 **Grab Ride** (-150,000 VND) - Tests Vietnamese expense
   - ☕ **Coffee** (-85,000 VND) - Tests coffee shop expense  
   - 💰 **Salary** (+5,000,000 VND) - Tests income transaction
4. **Select any option** and watch for the preview modal to appear
5. **Review the auto-filled data** in the modal
6. **Confirm or cancel** the transaction

### Method 2: Test Console Commands
Open your React Native console and run these commands:

```javascript
// Test Vietnamese bank notification
bankNotificationService.testVietcombankNotification();

// Test coffee purchase
bankNotificationService.testTechcombankNotification();

// Test US bank notification
bankNotificationService.testUSBankNotification();

// Test income notification
bankNotificationService.testIncomeNotification();
```

### Method 4: Background Testing
1. **Trigger a test notification** using the bell icon
2. **Immediately minimize the app** (don't close completely)
3. **Wait 10 seconds**
4. **Reopen the app**
5. **Watch for the preview modal** to appear automatically

## 🔍 What to Verify

### ✅ Parsing Accuracy
- **Amount extraction**: Check if the correct amount is parsed
- **Transaction type**: Verify income vs expense detection
- **Category guessing**: See if the AI correctly categorizes (Food, Transport, etc.)
- **Currency detection**: Confirm VND, USD, EUR are detected properly

### ✅ Preview Modal Behavior
- **Auto-fill**: All fields should be populated with parsed data
- **Editability**: User should be able to modify any field
- **Validation**: Required fields should be validated
- **Save/Cancel**: Both actions should work correctly

### ✅ Data Flow
- **FireStore**: Confirmed transactions should appear in your transactions collection
- **UI Updates**: Transaction list should refresh with new entries
- **Error Handling**: Failed saves should show appropriate error messages

## 🏦 Real Bank Testing

### Prerequisites
1. **Android Device** (bank notifications work better on Android)
2. **Bank Apps Installed**: Vietcombank, Techcombank, Chase, etc.
3. **Notification Access**: Enable in Android Settings → Apps → FinWise → Notifications

### Bank Package Names to Test
The service recognizes these bank apps:
- `com.vietcombank` - Vietcombank
- `com.techcombank` - Techcombank  
- `com.mb.mbanking` - MB Bank
- `com.chase.sig.android` - Chase Bank
- `com.bankofamerica.digitalbanking` - Bank of America

### Real Transaction Flow
1. **Make a small transaction** with your bank app
2. **Wait for the bank notification** 
3. **Check if FinWise intercepts it** (look in console logs)
4. **Verify the preview modal appears**
5. **Confirm the transaction saves correctly**

## 🐛 Debugging Tips

### Console Logs to Watch
```
🧪 Testing [Bank] notification...
Received bank notification: [notification data]
Processing detected transaction: [parsed data]
```

### Common Issues
- **No modal appears**: Check if the bank app is in the whitelist
- **Wrong parsing**: The notification text format might be different
- **Permission errors**: Ensure notification access is enabled
- **Firebase errors**: Check user authentication and Firestore rules

### Adding New Banks
To support additional banks:
1. **Find the package name** of the bank app
2. **Add it to the `bankApps` array** in `isBankApp()` method
3. **Test the notification format** and update parsing patterns if needed

## 📱 Testing Different Scenarios

### Expense Transactions
- ☕ Coffee shops
- 🚗 Transportation (Grab, Uber)
- 🛒 Shopping
- ⚡ Utilities  
- 🏥 Medical expenses

### Income Transactions  
- 💰 Salary transfers
- 💼 Freelance payments
- 🏆 Bonuses
- 📈 Investment returns

### Edge Cases
- **Very large amounts** (millions)
- **Decimal amounts** ($25.50)
- **Multiple currencies** in one notification
- **Unclear descriptions**
- **Non-bank notifications** (should be ignored)

## 🎯 Success Criteria

Your bank notification system is working correctly when:

1. ✅ **Test notifications trigger the preview modal**
2. ✅ **Real bank notifications are intercepted and parsed**
3. ✅ **Users can review and modify transaction details**
4. ✅ **Confirmed transactions save to Firebase**
5. ✅ **Invalid notifications are ignored**
6. ✅ **Error handling works gracefully**

## 🔧 Advanced Testing

### Stress Testing
- Send multiple notifications quickly
- Test with malformed notification data
- Test with very long transaction descriptions

### Integration Testing  
- Test alongside chat-based transactions
- Verify both flows can work simultaneously
- Check transaction history shows all sources

### Performance Testing
- Monitor memory usage during notification parsing
- Check Firebase write performance
- Verify UI responsiveness during parsing

---

**Happy Testing! 🚀** Remember, the goal is to make transaction entry as seamless as possible for users while maintaining accuracy and user control.
