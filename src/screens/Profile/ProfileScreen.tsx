const ReactNative = require('react-native');
const { StyleSheet, Text, TouchableOpacity, View, ScrollView, Alert, ActivityIndicator, Image } = ReactNative;
import HelpSupportModal from './HelpSupportModal';
import AppInfo from './AppInfo';
import AboutModal from './AboutModal';
import PrivacySecurityModal from './PrivacySecurityModal';
import EditProfileModal from './EditProfileModal';
import React, { useState, useEffect, useMemo, useContext } from 'react'
import { CommonActions, useNavigation } from '@react-navigation/native';
import { auth, firestore } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { AuthContext } from '../../context/AuthContext';

const MenuItem = ({ icon, title, subtitle, onPress }: { icon: string; title: string; subtitle: string; onPress: () => void }) => (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={onPress}
  >
    <View style={styles.menuIconContainer}>
      <Icon name={icon} size={24} color="#00B88D" />
    </View>
    <View style={styles.menuContent}>
      <Text style={styles.menuTitle}>{title}</Text>
      <Text style={styles.menuSubtitle}>{subtitle}</Text>
    </View>
    <Icon name="chevron-right" size={20} color="#999" />
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const [helpVisible, setHelpVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const navigation = useNavigation();
  const { clearTokens } = useContext(AuthContext);
  const [userInfo, setUserInfo] = useState<{
    username: string;
    email: string;
    joinDate: string;
    avatar?: string;
    avatarUrl?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserInfo({
            username: userData.username || 'User',
            email: userData.email || user.email || '',
            joinDate: userData.createdAt?.toDate?.() ? userData.createdAt.toDate().toLocaleDateString() : 'Unknown',
            avatar: userData.avatar,
            avatarUrl: userData.avatarUrl,
          });
        } else {
          setUserInfo({
            username: user.email?.split('@')[0] || 'User',
            email: user.email || '',
            joinDate: user.metadata.creationTime 
              ? new Date(user.metadata.creationTime).toLocaleDateString()
              : 'Unknown',
            avatar: 'person',
            avatarUrl: '',
          });
        }
      }
    } catch (error: unknown) {
      let msg = 'Failed to load user information';
      if (error instanceof Error) msg = error.message;
      console.error('Error fetching user info:', error);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await clearTokens();
              await auth.signOut();
              
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Welcome' }],
                })
              );
            } catch (error: unknown) {
              let msg = 'Failed to logout';
              if (error instanceof Error) msg = error.message;
              Alert.alert('Error', msg);
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const menuItems = useMemo(() => [
    {
      icon: 'person-outline',
      title: 'Edit Profile',
      subtitle: 'Update your personal information',
      onPress: () => setEditProfileVisible(true),
    },
    {
      icon: 'notifications',
      title: 'Notification Settings',
      subtitle: 'Manage your notification preferences',
      onPress: () => navigation.navigate('NotificationSettings' as never),
    },
    {
      icon: 'security',
      title: 'Privacy & Security',
      subtitle: 'Manage your account security',
      onPress: () => setPrivacyVisible(true),
    },
    {
      icon: 'help-outline',
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      onPress: () => setHelpVisible(true),
    },
    {
      icon: 'info-outline',
      title: 'About FinWise',
      subtitle: 'App version and information',
      onPress: () => setAboutVisible(true),
    },
  ], [navigation]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00B88D" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }
  return (
    <>
      <LinearGradient 
        colors={['#00D09E', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Profile</Text>
          </View>

          {/* User Info Card */}
          <View style={styles.userCard}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={['#00B88D', '#00D09E']}
                style={styles.avatar}
              >
                {userInfo?.avatarUrl ? (
                  <Image source={{ uri: userInfo.avatarUrl }} style={{ width: 64, height: 64, borderRadius: 32 }} />
                ) : (
                  <Icon name={userInfo?.avatar || 'person'} size={40} color="#FFFFFF" />
                )}
              </LinearGradient>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userInfo?.username}</Text>
              <Text style={styles.userEmail}>{userInfo?.email}</Text>
              <Text style={styles.joinDate}>Member since {userInfo?.joinDate}</Text>
            </View>
          </View>

          {/* Menu Items */}
          <View style={styles.menuContainer}>
            {menuItems.map((item, index) => (
              <View key={index} style={index === menuItems.length - 1 ? styles.lastMenuItem : undefined}>
                <MenuItem {...item} />
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="logout" size={20} color="#fff" />
                <Text style={styles.logoutText}>Logout</Text>
              </>
            )}
          </TouchableOpacity>
          <AppInfo />
        </ScrollView>
      </LinearGradient>

      <EditProfileModal
        visible={editProfileVisible}
        onClose={() => setEditProfileVisible(false)}
        userInfo={userInfo}
        onProfileUpdated={(newUsername: string, newAvatar?: string, newAvatarUrl?: string) => {
          setUserInfo((prev) => prev ? { ...prev, username: newUsername, avatar: newAvatar, avatarUrl: newAvatarUrl } : prev);
        }}
      />

      <HelpSupportModal visible={helpVisible} onClose={() => setHelpVisible(false)} />

      <PrivacySecurityModal visible={privacyVisible} onClose={() => setPrivacyVisible(false)} />

      <AboutModal visible={aboutVisible} onClose={() => setAboutVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    fontFamily: 'Poppins-Regular',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    fontFamily: 'Poppins-SemiBold',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'Poppins-Regular',
  },
  joinDate: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Poppins-Regular',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
    fontFamily: 'Poppins-SemiBold',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Poppins-Regular',
  },
  logoutButton: {
    backgroundColor: '#FF6B6B',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    fontFamily: 'Poppins-SemiBold',
  },
});