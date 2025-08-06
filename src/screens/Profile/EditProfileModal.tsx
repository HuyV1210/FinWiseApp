import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Pressable, Alert, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { auth, firestore } from '../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { launchImageLibrary, ImageLibraryOptions } from 'react-native-image-picker';
import { Platform, PermissionsAndroid } from 'react-native';

export default function EditProfileModal({ visible, onClose, userInfo, onProfileUpdated }: {
  visible: boolean;
  onClose: () => void;
  userInfo: { username: string; email: string; joinDate: string; avatar?: string; avatarUrl?: string; currency?: string } | null;
  onProfileUpdated: (newUsername: string, newAvatar?: string, newAvatarUrl?: string, newCurrency?: string) => void;
}) {
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('person');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  // Update states when modal opens or userInfo changes
  useEffect(() => {
    if (visible && userInfo) {
      setUsername(userInfo.username || '');
      setAvatar(userInfo.avatar || 'person');
      setAvatarUrl(userInfo.avatarUrl || '');
      setCurrency(userInfo.currency || 'USD');
    }
  }, [visible, userInfo]);

  const currencyOptions = [
    { label: 'US Dollar (USD)', value: 'USD' },
    { label: 'Euro (EUR)', value: 'EUR' },
    { label: 'British Pound (GBP)', value: 'GBP' },
    { label: 'Japanese Yen (JPY)', value: 'JPY' },
    { label: 'Vietnamese Dong (VND)', value: 'VND' },
    { label: 'Indian Rupee (INR)', value: 'INR' },
    { label: 'Canadian Dollar (CAD)', value: 'CAD' },
    { label: 'Australian Dollar (AUD)', value: 'AUD' },
    { label: 'Swiss Franc (CHF)', value: 'CHF' },
    { label: 'Singapore Dollar (SGD)', value: 'SGD' },
  ];

  // Preset avatar icon names (MaterialIcons)
  const avatarOptions = ['person', 'face', 'emoji-emotions', 'account-circle', 'pets', 'star', 'emoji-nature'];

  // Pick image from gallery (react-native-image-picker) with permissions
  const pickImage = async () => {
    openRealPicker();
  };

  const openRealPicker = async () => {
    try {
      let hasPermission = true;
      if (Platform.OS === 'android') {
        // Check for different permissions based on Android version
        const androidVersion = Platform.Version as number;
        let permissionToCheck;
        
        if (androidVersion >= 33) {
          // Android 13 and above
          permissionToCheck = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
        } else {
          // Android 12 and below
          permissionToCheck = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        }

        // Check if permission is already granted
        const checkResult = await PermissionsAndroid.check(permissionToCheck);
        
        if (!checkResult) {
          // Request permission if not granted
          const granted = await PermissionsAndroid.request(
            permissionToCheck,
            {
              title: 'Gallery Access Permission',
              message: 'This app needs access to your photo gallery to set your profile avatar.',
              buttonPositive: 'Allow',
              buttonNegative: 'Deny',
            }
          );
          hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
          
          if (!hasPermission) {
            Alert.alert(
              'Permission Required', 
              'Gallery access is needed to select a profile picture. Please enable it in app settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Settings', onPress: () => {
                  // You can implement opening app settings here if needed
                }}
              ]
            );
            return;
          }
        }
      }
      
      const options: ImageLibraryOptions = {
        mediaType: 'photo',
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.7,
        selectionLimit: 1,
      };
      
      launchImageLibrary(options, (response) => {
        console.log('Image library response:', response);
        if (response.didCancel) {
          console.log('User cancelled image picker');
          return;
        }
        if (response.errorCode) {
          console.log('ImagePicker Error: ', response.errorMessage);
          Alert.alert('Error', response.errorMessage || 'Failed to pick image');
          return;
        }
        if (response.assets && response.assets.length > 0) {
          const imageUri = response.assets[0].uri;
          console.log('Selected image URI:', imageUri);
          setAvatarUrl(imageUri || '');
        }
      });
    } catch (error) {
      console.log('Error in openRealPicker:', error);
      Alert.alert('Error', 'Failed to open image picker');
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('Validation', 'Username cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (user) {
        // Only send fields that should be updated
        const updateData: any = { username, currency };
        if (avatarUrl) {
          updateData.avatarUrl = avatarUrl;
          updateData.avatar = null; // clear icon if using image
        } else {
          updateData.avatar = avatar;
          updateData.avatarUrl = null; // clear image if using icon
        }
        await updateDoc(doc(firestore, 'users', user.uid), updateData);
        onProfileUpdated(username, avatar, avatarUrl, currency);
        onClose();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Edit Profile</Text>

          {/* Avatar selection and upload */}
          <View style={styles.avatarSection}>
            <Text style={styles.label}>Avatar</Text>
            <View style={styles.avatarPreviewRow}>
              <View style={styles.avatarCircle}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={{ width: 60, height: 60, borderRadius: 30 }} resizeMode="cover" />
                ) : (
                  <Icon name={avatar} size={44} color={'#00B88D'} />
                )}
              </View>
              <Pressable style={styles.uploadBtn} onPress={pickImage} disabled={saving}>
                <Icon name="photo-camera" size={20} color="#fff" />
                <Text style={styles.uploadText}>Upload</Text>
              </Pressable>
              {!!avatarUrl && (
                <Pressable style={styles.removeBtn} onPress={() => setAvatarUrl('')} disabled={saving}>
                  <Icon name="close" size={18} color="#888" />
                </Pressable>
              )}
            </View>
            <Text style={styles.avatarOrText}>or choose an icon below</Text>
            <View style={styles.avatarOptionsRow}>
              {avatarOptions.map((iconName) => (
                <Pressable
                  key={iconName}
                  style={[styles.avatarOption, avatar === iconName && !avatarUrl && styles.avatarOptionSelected]}
                  onPress={() => { setAvatar(iconName); setAvatarUrl(''); }}
                  disabled={saving}
                >
                  <Icon name={iconName} size={32} color={avatar === iconName && !avatarUrl ? '#00B88D' : '#888'} />
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your username"
              editable={!saving}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.email}>{userInfo?.email}</Text>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Currency</Text>
            <TouchableOpacity
              style={styles.currencySelector}
              onPress={() => setShowCurrencyPicker(true)}
            >
              <Text style={styles.currencySelectorText}>
                {currencyOptions.find(c => c.value === currency)?.label || 'Select Currency'}
              </Text>
              <Text style={styles.currencyArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          <Modal
            visible={showCurrencyPicker}
            transparent={true}
            animationType="slide"
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Currency</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowCurrencyPicker(false)}
                  >
                    <Text style={styles.closeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.optionsList}>
                  {currencyOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.option,
                        currency === option.value && styles.selectedOption
                      ]}
                      onPress={() => {
                        setCurrency(option.value);
                        setShowCurrencyPicker(false);
                      }}
                    >
                      <Text style={[
                        styles.optionText,
                        currency === option.value && styles.selectedOptionText
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
          <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            <Icon name="save" size={18} color="#fff" style={{marginRight: 6}} />
            <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
          </Pressable>
          <Pressable style={styles.closeBtn} onPress={onClose} disabled={saving}>
            <Text style={styles.closeText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    marginTop: 2,
    marginBottom: 2,
    overflow: 'hidden',
    minHeight: 60,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  picker: {
    height: 60,
    width: '100%',
    color: '#333',
    // fontFamily removed for better cross-platform support
  },
  pickerItem: {
    fontSize: 16,
    // fontFamily removed for better cross-platform support
  },
  avatarSection: {
    marginBottom: 18,
  },
  avatarPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#00B88D',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginRight: 10,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B88D',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 6,
  },
  uploadText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    marginLeft: 4,
  },
  removeBtn: {
    backgroundColor: '#eee',
    borderRadius: 16,
    padding: 4,
    marginLeft: 2,
  },
  avatarOrText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 13,
    marginBottom: 2,
    fontFamily: 'Poppins-Regular',
  },
  avatarOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  avatarOption: {
    padding: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#F8F9FA',
  },
  avatarOptionSelected: {
    borderColor: '#00B88D',
    backgroundColor: '#E6FAF4',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '88%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#00B88D',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Poppins-SemiBold',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    fontFamily: 'Poppins-SemiBold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: '#333',
    fontFamily: 'Poppins-Regular',
    backgroundColor: '#F8F9FA',
  },
  email: {
    fontSize: 15,
    color: '#666',
    fontFamily: 'Poppins-Regular',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 10,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B88D',
    borderRadius: 8,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 32,
    marginTop: 8,
    marginBottom: 4,
    opacity: 1,
  },
  saveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'Poppins-SemiBold',
  },
  closeBtn: {
    marginTop: 4,
    backgroundColor: '#eee',
    borderRadius: 8,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 32,
  },
  closeText: {
    color: '#333',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'Poppins-SemiBold',
  },
  currencySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    padding: 12,
    marginTop: 2,
  },
  currencySelectorText: {
    fontSize: 15,
    color: '#333',
    fontFamily: 'Poppins-Regular',
    flex: 1,
  },
  currencyArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Poppins-SemiBold',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold',
  },
  optionsList: {
    maxHeight: 300,
  },
  option: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedOption: {
    backgroundColor: '#E8F5E8',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Poppins-Regular',
  },
  selectedOptionText: {
    color: '#00B88D',
    fontWeight: 'bold',
  },
});