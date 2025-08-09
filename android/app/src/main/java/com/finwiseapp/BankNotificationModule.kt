package com.finwiseapp

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import android.content.Context
import android.provider.Settings
import android.text.TextUtils

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
    val flat = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
    if (!TextUtils.isEmpty(flat)) {
        val names = flat.split(":")
        for (name in names) {
            if (name.contains(pkgName)) {
                return true
            }
        }
    }
    return false
}