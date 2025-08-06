import { firestore } from './firebase';
import { addDoc, collection, query, where, orderBy, limit, getDocs, doc, getDoc, onSnapshot, updateDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { fcmService } from './fcmService';

export type NotificationType = 
  | 'budget_alert'
  | 'goal_achieved'
  | 'transaction_added'
  | 'daily_reminder'
  | 'weekly_summary';

export interface NotificationData {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any; // Additional data for navigation or context
  read: boolean;
  createdAt: Date;
}

interface NotificationSettings {
  budgetAlerts: boolean;
  goalAchievements: boolean;
  transactionConfirmations: boolean;
  dailyReminders: boolean;
  weeklySummaries: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
}

const defaultSettings: NotificationSettings = {
  budgetAlerts: true,
  goalAchievements: true,
  transactionConfirmations: true,
  dailyReminders: false,
  weeklySummaries: true,
  pushNotifications: true,
  inAppNotifications: true,
};

// Get user notification settings
async function getUserNotificationSettings(userId: string): Promise<NotificationSettings> {
  try {
    const settingsRef = doc(firestore, 'userSettings', userId);
    const settingsDoc = await getDoc(settingsRef);
    
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      return { ...defaultSettings, ...data.notifications };
    }
    
    return defaultSettings;
  } catch (error) {
    console.error('Error getting user notification settings:', error);
    return defaultSettings;
  }
}

// Check if notification type is enabled for user
async function isNotificationEnabled(userId: string, type: NotificationType): Promise<boolean> {
  const settings = await getUserNotificationSettings(userId);
  
  switch (type) {
    case 'budget_alert':
      return settings.budgetAlerts;
    case 'goal_achieved':
      return settings.goalAchievements;
    case 'transaction_added':
      return settings.transactionConfirmations;
    case 'daily_reminder':
      return settings.dailyReminders;
    case 'weekly_summary':
      return settings.weeklySummaries;
    default:
      return true;
  }
}

export const sendNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: any
): Promise<void> => {
  try {
    // Check if notifications are enabled for this type
    const isEnabled = await isNotificationEnabled(userId, type);
    if (!isEnabled) {
      console.log(`Notification type ${type} is disabled for user ${userId}`);
      return;
    }

    const notification: Omit<NotificationData, 'id'> = {
      userId,
      type,
      title,
      message,
      data,
      read: false,
      createdAt: new Date(),
    };

    // Save to Firestore for in-app notifications
    await addDoc(collection(firestore, 'notifications'), notification);
    console.log('📱 In-app notification saved successfully:', { type, title });

    // Check if push notifications are enabled
    const userSettings = await getUserNotificationSettings(userId);
    if (userSettings.pushNotifications) {
      // Send FCM push notification
      const pushSent = await fcmService.sendPushNotification(
        userId,
        title,
        message,
        data
      );
      
      if (pushSent) {
        console.log('🚀 Push notification sent successfully');
      } else {
        console.log('⚠️ Push notification failed to send');
      }
    }

  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

export const getNotifications = async (userId: string): Promise<NotificationData[]> => {
  try {
    const q = query(
      collection(firestore, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    const querySnapshot = await getDocs(q);
    const notifications: NotificationData[] = [];
    
    querySnapshot.forEach((doc) => {
      notifications.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      } as NotificationData);
    });
    
    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

// Specialized notification functions
export const sendBudgetAlert = async (
  userId: string,
  budgetName: string,
  spentAmount: number,
  budgetLimit: number
): Promise<void> => {
  const percentage = Math.round((spentAmount / budgetLimit) * 100);
  
  await sendNotification(
    userId,
    'budget_alert',
    'Budget Alert!',
    `You've spent ${percentage}% of your ${budgetName} budget ($${spentAmount.toFixed(2)} of $${budgetLimit.toFixed(2)})`,
    {
      budgetName,
      spentAmount,
      budgetLimit,
      percentage,
      navigationTarget: 'Budget'
    }
  );
};

export const sendGoalAchievedNotification = async (
  userId: string,
  goalName: string,
  targetAmount: number
): Promise<void> => {
  await sendNotification(
    userId,
    'goal_achieved',
    '🎉 Goal Achieved!',
    `Congratulations! You've reached your ${goalName} goal of $${targetAmount.toFixed(2)}!`,
    {
      goalName,
      targetAmount,
      navigationTarget: 'Goals'
    }
  );
};

export const sendTransactionAddedNotification = async (
  userId: string,
  transactionType: string,
  amount: number,
  category?: string
): Promise<void> => {
  const isExpense = transactionType === 'expense';
  const title = isExpense ? 'Expense Added' : 'Income Added';
  const message = category
    ? `${isExpense ? '-' : '+'}$${amount.toFixed(2)} for ${category}`
    : `${isExpense ? '-' : '+'}$${amount.toFixed(2)} transaction recorded`;

  await sendNotification(
    userId,
    'transaction_added',
    title,
    message,
    {
      transactionType,
      amount,
      category,
      navigationTarget: 'Transactions'
    }
  );
};

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const q = query(
      collection(firestore, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
}

export function subscribeToNotificationCount(userId: string, callback: (count: number) => void) {
  const q = query(
    collection(firestore, 'notifications'),
    where('userId', '==', userId),
    where('read', '==', false)
  );
  
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  }, (error) => {
    console.error('Error subscribing to notification count:', error);
    callback(0);
  });
}

export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const notificationRef = doc(firestore, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    const q = query(
      collection(firestore, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(firestore);
    snapshot.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
}
