import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { auth, firestore } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

interface HeaderProps {
  onNotificationPress?: () => void;
  onSearch?: (query: string) => void;
  onSearchPress?: () => void;
  notificationCount?: number;
}

const Header: React.FC<HeaderProps> = React.memo(({ 
  onNotificationPress,
  onSearch = () => {},
  onSearchPress,
  notificationCount = 0
}) => {
  const [userName, setUserName] = useState<string>('User');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarIcon, setAvatarIcon] = useState<string>('person');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const navigation = useNavigation<any>();

  // Fetch user info and avatar
  const fetchUserInfo = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserName(userData?.username || userData?.email?.split('@')[0] || 'User');
          setAvatarUrl(userData?.avatarUrl || null);
          setAvatarIcon(userData?.avatar || 'person');
        } else {
          setUserName(user.email?.split('@')[0] || 'User');
          setAvatarUrl(null);
          setAvatarIcon('person');
        }
      } catch (err: any) {
        setUserName(user.email?.split('@')[0] || 'User');
        setAvatarUrl(null);
        setAvatarIcon('person');
        setError('Could not fetch your profile. Showing default name.');
      }
    } else {
      setUserName('Guest');
      setAvatarUrl(null);
      setAvatarIcon('person');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUserInfo();
    // Listen for navigation focus to refresh header info after profile update
    const unsubscribe = navigation.addListener?.('focus', fetchUserInfo);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNotification = React.useCallback(() => {
    navigation.navigate('Notification');
  }, [navigation]);

  const handleSearchPress = React.useCallback(() => {
    if (onSearchPress) onSearchPress();
  }, [onSearchPress]);

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <View style={styles.avatarHeaderContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarHeader} />
          ) : (
            <Icon name={avatarIcon} size={40} color="#00B88D" style={styles.avatarHeader} />
          )}
        </View>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          {loading ? (
            <Text style={styles.userName}>Loading...</Text>
          ) : (
            <Text style={styles.userName}>{userName}</Text>
          )}
          {error ? (
            <Text style={{ color: '#FF4D4F', fontSize: 13, marginTop: 2 }}>{error}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.rightSection}>
        <TouchableOpacity 
          style={styles.iconButton} 
          onPress={handleSearchPress}
          accessibilityLabel="Search"
        >
          <Icon name="search" size={24} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.iconButton} 
          onPress={handleNotification}
          accessibilityLabel="Notifications"
        >
          <Icon name="notifications" size={24} color="#333" />
          {notificationCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>
                {notificationCount > 99 ? '99+' : notificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarHeaderContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E6FAF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
  },
  greeting: {
    fontSize: 16,
    color: '#666',
    fontWeight: '400',
  },
  userName: {
    fontSize: 24,
    color: '#333',
    fontWeight: 'bold',
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DFF7E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 1,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default Header;
