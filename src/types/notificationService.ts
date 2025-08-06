import { firestore } from '../services/firebase';
import { collection, addDoc, Timestamp, query, where, getDocs, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';

export async function sendNotification(userId: string, title: string, message: string) {
  try {
    await addDoc(collection(firestore, 'notifications'), {
      userId,
      title,
      message,
      date: Timestamp.now(),
      read: false,
    });
    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
}

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
