import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { auth, firestore } from '../../services/firebase';
import { collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { sendNotification, markAllNotificationsAsRead } from '../../services/notificationService';
import LinearGradient from 'react-native-linear-gradient';

interface Notification {
  id: string;
  title: string;
  message: string;
  date: any;
  read: boolean;
}

const NotificationScreen: React.FC = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    try {
      const q = query(
        collection(firestore, 'notifications'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const list: Notification[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        list.push({
          id: doc.id,
          title: data.title ?? 'Notification',
          message: data.message ?? '',
          date: data.date,
          read: data.read ?? false,
        });
      });
      setNotifications(list);
    } catch (error) {
      setNotifications([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  function formatNotificationDate(dateObj: any) {
    if (!dateObj?.toDate) return '';
    const date = dateObj.toDate();
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    if (isToday) return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (isYesterday) return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return date.toLocaleString();
  }

  // Mark all notifications as read when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const markAsRead = async () => {
        const user = auth.currentUser;
        if (user) {
          await markAllNotificationsAsRead(user.uid);
          // Refetch to update the UI
          fetchNotifications();
        }
      };
      markAsRead();
    }, [])
  );

  const clearAllNotifications = async () => {
    const user = auth.currentUser;
    if (!user) return;

    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const q = query(
                collection(firestore, 'notifications'),
                where('userId', '==', user.uid)
              );
              const snapshot = await getDocs(q);
              const batch = [];
              snapshot.forEach(docSnap => {
                batch.push(deleteDoc(docSnap.ref));
              });
              await Promise.all(batch);
              fetchNotifications(); // Refresh UI
            } catch (error) {
              Alert.alert('Error', 'Failed to clear notifications.');
            }
          }
        }
      ]
    );
  };

  return (
    <LinearGradient
      colors={['#00D09E', '#FFFFFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <TouchableOpacity onPress={clearAllNotifications} style={styles.clearButton}>
            <Icon name="delete-sweep" size={24} color="#d32f2f" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[
              styles.notificationItem,
              !item.read && styles.unreadItem
            ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Icon
                  name={item.read ? 'notifications-none' : 'notifications-active'}
                  size={22}
                  color={item.read ? '#bbb' : '#00B88D'}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.notificationTitle}>{item.title}</Text>
                {!item.read && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.notificationMessage}>{item.message}</Text>
              <Text style={styles.notificationDate}>
                {formatNotificationDate(item.date)}
              </Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>{loading ? 'Loading...' : 'No notifications.'}</Text>}
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  testButton: {
    marginLeft: 12,
    padding: 4,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  headerTitle: {
    flex: 1, 
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  notificationMessage: {
    fontSize: 13,
    color: '#777',
    marginBottom: 2,
  },
  notificationDate: {
    fontSize: 12,
    color: '#aaa',
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 40,
    fontSize: 16,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00B88D',
    marginLeft: 6,
  },
  notificationItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
    borderLeftWidth: 0, // Remove default border, handled by unreadItem
  },
  unreadItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#00B88D',
    backgroundColor: '#E6FFF5', // subtle highlight for unread
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
});

export default NotificationScreen;