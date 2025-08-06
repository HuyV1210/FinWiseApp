# Background Bank Notification Setup

## Android Background Service Implementation

To enable true background bank notification monitoring, you need:

### 1. Android Notification Listener Service
Create a native Android service that runs independently of your React Native app.

### 2. Foreground Service
Keep the service running even when the app is closed.

### 3. Auto-start on Boot
Restart monitoring when the device reboots.

## Implementation Steps

### Step 1: Create Native Android Module
```java
// android/app/src/main/java/com/finwiseapp/BankNotificationModule.java
package com.finwiseapp;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import androidx.core.app.NotificationCompat;

public class BankNotificationListenerService extends NotificationListenerService {
    private static final String CHANNEL_ID = "BankMonitoringChannel";
    private static final int NOTIFICATION_ID = 1001;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        startForeground(NOTIFICATION_ID, createForegroundNotification());
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        String packageName = sbn.getPackageName();
        String title = "";
        String text = "";
        
        if (sbn.getNotification().extras != null) {
            title = sbn.getNotification().extras.getString(Notification.EXTRA_TITLE, "");
            text = sbn.getNotification().extras.getString(Notification.EXTRA_TEXT, "");
        }
        
        // Check if it's from a bank app
        if (isBankApp(packageName)) {
            // Process bank notification
            processBankNotification(packageName, title, text);
        }
    }

    private boolean isBankApp(String packageName) {
        String[] bankApps = {
            "com.vietcombank",
            "com.techcombank", 
            "com.mb.mbanking",
            "com.chase.sig.android",
            "com.bankofamerica.digitalbanking"
        };
        
        for (String bankApp : bankApps) {
            if (packageName.contains(bankApp)) {
                return true;
            }
        }
        return false;
    }

    private void processBankNotification(String packageName, String title, String text) {
        // Send to React Native or store locally
        Intent intent = new Intent("BANK_NOTIFICATION_RECEIVED");
        intent.putExtra("packageName", packageName);
        intent.putExtra("title", title);
        intent.putExtra("text", text);
        sendBroadcast(intent);
    }

    private void createNotificationChannel() {
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Bank Transaction Monitoring",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Monitors bank notifications for automatic transaction tracking");
        
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.createNotificationChannel(channel);
    }

    private Notification createForegroundNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("FinWise Bank Monitor")
            .setContentText("Monitoring bank notifications...")
            .setSmallIcon(R.drawable.ic_notification)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build();
    }
}
```

### Step 2: Update AndroidManifest.xml
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

<application>
    <!-- Notification Listener Service -->
    <service
        android:name=".BankNotificationListenerService"
        android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
        android:exported="true">
        <intent-filter>
            <action android:name="android.service.notification.NotificationListenerService" />
        </intent-filter>
    </service>

    <!-- Boot Receiver -->
    <receiver android:name=".BootReceiver" android:enabled="true" android:exported="true">
        <intent-filter android:priority="1000">
            <action android:name="android.intent.action.BOOT_COMPLETED" />
            <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
            <action android:name="android.intent.action.PACKAGE_REPLACED" />
            <category android:name="android.intent.category.DEFAULT" />
        </intent-filter>
    </receiver>
</application>
```

### Step 3: Create Boot Receiver
```java
// android/app/src/main/java/com/finwiseapp/BootReceiver.java
package com.finwiseapp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            // Restart the notification listener service
            Intent serviceIntent = new Intent(context, BankNotificationListenerService.class);
            context.startForegroundService(serviceIntent);
        }
    }
}
```

## Simplified React Native Solution

For a simpler approach without native code, here's what you can do:

### Background Task Manager
```typescript
// Enhanced bankNotificationService.ts with background support
import BackgroundTask from 'react-native-background-task';
import { AppState } from 'react-native';

class EnhancedBankNotificationService extends BankNotificationService {
  private backgroundTask: any = null;

  async initializeWithBackground(): Promise<boolean> {
    // Start background task
    this.startBackgroundTask();
    
    // Listen for app state changes
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
    
    return await this.initialize();
  }

  private startBackgroundTask() {
    this.backgroundTask = BackgroundTask.define(() => {
      console.log('Background task running - monitoring notifications');
      
      // Keep the service alive
      setTimeout(() => {
        if (this.backgroundTask) {
          BackgroundTask.finish(this.backgroundTask);
        }
      }, 30000); // Run for 30 seconds
    });
  }

  private handleAppStateChange(nextAppState: string) {
    if (nextAppState === 'background') {
      // App going to background - start background monitoring
      BackgroundTask.start(this.backgroundTask);
    } else if (nextAppState === 'active') {
      // App coming to foreground - resume normal operation
      if (this.backgroundTask) {
        BackgroundTask.finish(this.backgroundTask);
      }
    }
  }
}
```

### Local Storage Queue
```typescript
// Store notifications when app is closed
import AsyncStorage from '@react-native-async-storage/async-storage';

class PersistentNotificationService {
  private static STORAGE_KEY = 'pending_bank_notifications';

  static async storePendingNotification(notification: any) {
    try {
      const existing = await AsyncStorage.getItem(this.STORAGE_KEY);
      const notifications = existing ? JSON.parse(existing) : [];
      notifications.push({
        ...notification,
        timestamp: new Date().toISOString()
      });
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error('Error storing notification:', error);
    }
  }

  static async processPendingNotifications() {
    try {
      const pending = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (pending) {
        const notifications = JSON.parse(pending);
        
        // Process each notification
        for (const notification of notifications) {
          await bankNotificationService.handleBankNotification(notification);
        }
        
        // Clear processed notifications
        await AsyncStorage.removeItem(this.STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error processing pending notifications:', error);
    }
  }
}
```

## Usage Instructions

### For Background Monitoring:
1. **Install dependencies**:
   ```bash
   npm install react-native-background-task
   npm install @react-native-async-storage/async-storage
   ```

2. **Enable notification listener** in Android settings:
   - Settings → Apps → Special Access → Notification Access
   - Enable FinWise

3. **Initialize service** in your app:
   ```typescript
   useEffect(() => {
     enhancedBankNotificationService.initializeWithBackground();
     
     // Process any notifications received while app was closed
     PersistentNotificationService.processPendingNotifications();
   }, []);
   ```

## Limitations & Considerations

### Android Doze Mode
- Modern Android versions may still kill background processes
- Users need to disable battery optimization for your app
- Add to "Never sleeping apps" list

### iOS Restrictions
- iOS is much more restrictive with background processing
- May require push notifications through Apple's servers
- Consider using Notification Service Extensions

### Battery Impact
- Background monitoring will use more battery
- Be transparent with users about this
- Provide option to disable background monitoring

---

**Bottom Line**: For full background support, you'll need native Android code. The current React Native implementation works great when the app is active, but has limitations when completely closed.
