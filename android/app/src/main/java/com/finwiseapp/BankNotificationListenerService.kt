package com.finwiseapp

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.bridge.Arguments

class BankNotificationListenerService : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification) {
        // Extract notification data here
        val packageName = sbn.packageName
        val extras = sbn.notification.extras
        val title = extras.getString("android.title") ?: ""
        val text = extras.getString("android.text") ?: ""

        // Send to JS via DeviceEventEmitter
        val reactContext = BankNotificationModule.reactContext ?: return
        val params = Arguments.createMap().apply {
            putString("packageName", packageName)
            putString("title", title)
            putString("text", text)
        }
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("BankNotificationReceived", params)
    }
}