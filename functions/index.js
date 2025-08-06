// This is an example Cloud Function for Firebase to send FCM push notifications
// You would deploy this to Firebase Functions

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.sendNotificationToUser = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    try {
      const notificationData = snap.data();
      const { userId, title, message, data } = notificationData;

      // Get user's FCM token from Firestore
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(userId)
        .get();

      if (!userDoc.exists) {
        console.log('User not found:', userId);
        return;
      }

      const userData = userDoc.data();
      const fcmToken = userData.fcmToken;

      if (!fcmToken) {
        console.log('No FCM token for user:', userId);
        return;
      }

      // Check if push notifications are enabled
      const userSettings = userData.notifications || {};
      if (!userSettings.pushNotifications) {
        console.log('Push notifications disabled for user:', userId);
        return;
      }

      // Prepare FCM message
      const fcmMessage = {
        token: fcmToken,
        notification: {
          title: title,
          body: message,
        },
        data: {
          ...data,
          notificationId: context.params.notificationId,
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#00B88D',
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default',
            },
          },
        },
      };

      // Send FCM message
      const response = await admin.messaging().send(fcmMessage);
      console.log('Push notification sent successfully:', response);

      // Update notification with FCM response
      await snap.ref.update({
        fcmMessageId: response,
        fcmSentAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  });

// Function to test sending notifications
exports.testNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const { title, message, userId } = data;
    
    // Create a test notification
    await admin.firestore().collection('notifications').add({
      userId: userId || context.auth.uid,
      type: 'test',
      title: title || 'Test Notification',
      message: message || 'This is a test notification from FinWise!',
      data: {
        navigationTarget: 'Home',
        testData: true,
      },
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: 'Test notification created' };
  } catch (error) {
    console.error('Error creating test notification:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create test notification');
  }
});
