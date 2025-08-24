package com.finwiseapp

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import android.content.Context
import android.provider.Settings
import android.text.TextUtils
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import android.util.Log

class BankNotificationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    init {
        Companion.reactContext = reactContext
    }

    override fun getName(): String = "BankNotificationModule"

    companion object {
        var reactContext: ReactApplicationContext? = null
    }

    @ReactMethod
    fun isNotificationListenerEnabled(promise: Promise) {
        val enabled = isNotificationServiceEnabled(reactContext!!)
        promise.resolve(enabled)
    }
}

fun isNotificationServiceEnabled(context: Context): Boolean {
    val pkgName = context.packageName
    val serviceName = "com.finwiseapp.BankNotificationListenerService"
    val flat = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
    Log.d("BankNotification", "pkgName: $pkgName, serviceName: $serviceName")
    Log.d("BankNotification", "enabled_notification_listeners: $flat")
    
    if (!TextUtils.isEmpty(flat)) {
        val names = flat.split(":")
        for (name in names) {
            Log.d("BankNotification", "Checking: $name")
            // Check for exact service match or package match
            if (name == serviceName || name.startsWith("$pkgName/")) {
                Log.d("BankNotification", "Found matching service!")
                return true
            }
        }
    }
    Log.d("BankNotification", "No matching service found")
    return false
}