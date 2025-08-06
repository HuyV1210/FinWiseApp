import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { auth, firestore } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { sendNotification, markAllNotificationsAsRead } from '../../services/notificationService';

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



  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>

      </View>
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.notificationItem, !item.read && styles.unreadItem]}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            <Text style={styles.notificationMessage}>{item.message}</Text>
            <Text style={styles.notificationDate}>{item.date?.toDate?.().toLocaleString?.() ?? ''}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>{loading ? 'Loading...' : 'No notifications.'}</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1FFF3',
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
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
  },
  notificationItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  unreadItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#00B88D',
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
});

export default NotificationScreen;