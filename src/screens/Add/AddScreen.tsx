const ReactNative = require('react-native');
const { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Modal, TouchableWithoutFeedback } = ReactNative;
import React, { useState, useCallback, useEffect } from 'react'
import LinearGradient from 'react-native-linear-gradient'
import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { sendTransactionAddedNotification } from '../../services/notificationService';
import { auth, firestore } from '../../services/firebase';
import CategoryPickerModal from '../../components/CategoryPickerModal';
import { Picker } from '@react-native-picker/picker';

const categories = [
  { label: 'Food & Dining', value: 'Food & Dining', icon: 'restaurant' },
  { label: 'Salary', value: 'Salary', icon: 'work' },
  { label: 'Transport', value: 'Transport', icon: 'directions-car' },
  { label: 'Shopping', value: 'Shopping', icon: 'shopping-bag' },
  { label: 'Health & Medical', value: 'Health & Medical', icon: 'local-hospital' },
  { label: 'Entertainment', value: 'Entertainment', icon: 'movie' },
  { label: 'Bills & Utilities', value: 'Bills & Utilities', icon: 'receipt' },
  { label: 'Education', value: 'Education', icon: 'school' },
  { label: 'Investment', value: 'Investment', icon: 'trending-up' },
  { label: 'Gift & Donation', value: 'Gift & Donation', icon: 'card-giftcard' },
  { label: 'Other', value: 'Other', icon: 'category' },
];

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

export default function AddScreen () {
  const [formData, setFormData] = useState({
    rawPrice: '', // new
    price: '',    // formatted (display)
    category: '',
    type: 'expense',
    date: new Date(),
    title: '',
    note: '',
  });
  const [currency, setCurrency] = useState('VND');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const navigation = useNavigation();

  // Fetch user currency on mount
  useEffect(() => {
    const fetchCurrency = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(firestore, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setCurrency(userDoc.data().currency || 'VND');
        }
      }
    };
    fetchCurrency();
  }, []);

  // Reset form when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setFormData({
        rawPrice: '',
        price: '',
        category: '',
        type: 'income',
        date: new Date(),
        title: '',
        note: '',
      });
      setErrors({});
      setShowDatePicker(false);
      setShowCategoryPicker(false);
      setLoading(false);
    }, [])
  );

  // Optimized amount formatter
  const formatAmount = useCallback((input: string): string => {
    if (!input) return '';
    const cleaned = input.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    
    // Handle multiple decimal points
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Format with commas
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }, []);

  // Validation functions
  const validateForm = useCallback((): boolean => {
    const newErrors: {[key: string]: string} = {};

    // Validate amount
    const numericPrice = parseFloat(formData.price.replace(/,/g, ''));
    if (!formData.price || isNaN(numericPrice) || numericPrice <= 0) {
      newErrors.price = 'Please enter a valid amount greater than 0';
    } else if (numericPrice > 999999999) {
      newErrors.price = 'Amount cannot exceed 999,999,999';
    }

    // Validate category
    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }

    // Validate title
    if (!formData.title.trim()) {
      newErrors.title = 'Please enter a title';
    } else if (formData.title.trim().length < 2) {
      newErrors.title = 'Title must be at least 2 characters';
    } else if (formData.title.trim().length > 50) {
      newErrors.title = 'Title cannot exceed 50 characters';
    }

    // Validate note length
    if (formData.note.length > 200) {
      newErrors.note = 'Note cannot exceed 200 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleChange = useCallback((field: string, value: string | Date) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const handleAmountChange = useCallback((text: string) => {
    const formatted = formatAmount(text);
    handleChange('price', formatted);
  }, [formatAmount, handleChange]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    if (!auth.currentUser) {
      return Alert.alert('Error', 'User not authenticated. Please login again.');
    }

    setLoading(true);
    try {
      const sanitizedPrice = parseFloat(formData.price.replace(/,/g, ''));
      

      await addDoc(collection(firestore, 'transactions'), {
        type: formData.type,
        price: sanitizedPrice,
        category: formData.category,
        date: formData.date,
        title: formData.title.trim(),
        note: formData.note.trim(),
        userId: auth.currentUser.uid,
        createdAt: new Date(),
        currency: currency,
      });

      // Send transaction confirmation notification
      await sendTransactionAddedNotification(
        auth.currentUser.uid,
        formData.type,
        sanitizedPrice,
        formData.category
      );

      Alert.alert('Success', 'Transaction added successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      console.error('Error adding transaction:', err);
      Alert.alert('Error', 'Failed to add transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [formData, validateForm, navigation]);

  return (
    <LinearGradient
      colors={['#00D09E', '#FFFFFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Text style={styles.welcomeText}>Add Transaction</Text>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, width: '100%' }}
      >
        <ScrollView
          style={styles.subContainer}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Transaction Type Selector */}
          <View style={styles.row}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                formData.type === 'income' && styles.typeButtonActiveIncome,
              ]}
              onPress={() => handleChange('type', 'income')}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  formData.type === 'income' && styles.typeButtonTextActive,
                ]}
              >
                Income
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                formData.type === 'expense' && styles.typeButtonActiveExpense,
              ]}
              onPress={() => handleChange('type', 'expense')}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  formData.type === 'expense' && styles.typeButtonTextActive,
                ]}
              >
                Expense
              </Text>
            </TouchableOpacity>
          </View>

          {/* Date Picker */}
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={[styles.input, styles.row, errors.date && styles.inputError]}
          >
            <Text style={styles.dateText}>{formData.date.toDateString()}</Text>
            <MaterialIcons name="calendar-today" size={20} color="#00B88D" />
          </TouchableOpacity>
          {Platform.OS === 'ios' && showDatePicker && (
            <DateTimePicker
              value={formData.date}
              mode="date"
              display="compact"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  handleChange('date', selectedDate);
                }
              }}
            />
          )}
          {Platform.OS === 'android' && showDatePicker && (
            <DateTimePicker
              value={formData.date}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  handleChange('date', selectedDate);
                }
              }}
            />
          )}

          {/* Amount */}
          <Text style={styles.label}>Amount</Text>
          <View style={styles.amountContainer}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}
              onPress={() => setShowCurrencyPicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.currencySymbol}>
                {currencyOptions.find(opt => opt.value === currency)?.value || currency}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={22} color="#00B88D" />
            </TouchableOpacity>
            <TextInput
              style={[styles.amountInput, errors.price && styles.inputError]}
              placeholder="0.00"
              value={formData.price}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
              maxLength={15}
            />
          </View>
          <Modal
            visible={showCurrencyPicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowCurrencyPicker(false)}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}>
              <TouchableWithoutFeedback onPress={() => setShowCurrencyPicker(false)}>
                <View style={{ flex: 1 }} />
              </TouchableWithoutFeedback>
              <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8, textAlign: 'center' }}>Select Currency</Text>
                <Picker
                  selectedValue={currency}
                  onValueChange={(value) => {
                    setCurrency(value);
                  }}
                >
                  {currencyOptions.map(opt => (
                    <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                  ))}
                </Picker>
                <TouchableOpacity
                  style={{ marginTop: 12, alignSelf: 'center', padding: 10, borderRadius: 8, backgroundColor: '#00B88D' }}
                  onPress={() => setShowCurrencyPicker(false)}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}

          {/* Category */}
          <Text style={styles.label}>Category</Text>
          <TouchableOpacity
            style={[styles.input, { flexDirection: 'row', alignItems: 'center' }, errors.category && styles.inputError]}
            onPress={() => setShowCategoryPicker(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              {formData.category ? (
                <>
                  <MaterialIcons
                    name={categories.find(cat => cat.value === formData.category)?.icon || 'category'}
                    size={20}
                    color="#00B88D"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={{ color: '#000', fontSize: 16 }}>{formData.category}</Text>
                </>
              ) : (
                <Text style={{ color: '#999', fontSize: 16 }}>Choose a category</Text>
              )}
            </View>
            <MaterialIcons name="arrow-drop-down" size={24} color="#00B88D" />
          </TouchableOpacity>
          {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}

          <CategoryPickerModal
            visible={showCategoryPicker}
            onClose={() => setShowCategoryPicker(false)}
            onSelect={(category) => {
              handleChange('category', category);
              setShowCategoryPicker(false);
            }}
          />

          {/* Title */}
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={[styles.input, errors.title && styles.inputError]}
            placeholder="e.g. Lunch, Paycheck"
            value={formData.title}
            onChangeText={(text) => handleChange('title', text)}
            maxLength={50}
          />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

          {/* Note */}
          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            style={[styles.input, styles.noteInput, errors.note && styles.inputError]}
            placeholder="Add a note (optional)"
            value={formData.note}
            onChangeText={(text) => handleChange('note', text)}
            multiline
            numberOfLines={3}
            maxLength={200}
            textAlignVertical="top"
          />
          {errors.note && <Text style={styles.errorText}>{errors.note}</Text>}
          <Text style={styles.characterCount}>{formData.note.length}/200</Text>

          <TouchableOpacity
            style={[styles.addButton, loading && styles.addButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.buttonContent}>
                <MaterialIcons name="add" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Transaction</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#00D09E',
  },
  subContainer: {
    backgroundColor: '#F1FFF3',
    borderTopRightRadius: 60,
    borderTopLeftRadius: 60,
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#222',
    fontFamily: 'Poppins-ExtraBold',
    paddingTop: 100,
    textAlign: 'center',
    paddingBottom: 60,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    color: '#333',
  },
  input: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#B6E2C8',
    fontSize: 16,
    color: '#222',
    marginBottom: 8,
  },
  inputError: {
    borderColor: '#FF5A5F',
    borderWidth: 2,
  },
  errorText: {
    color: '#FF5A5F',
    fontSize: 14,
    marginBottom: 8,
    marginTop: -4,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  dateText: {
    color: '#333',
    fontSize: 16,
    flex: 1,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#B6E2C8',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00B88D',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#222',
    fontWeight: '600',
  },
  noteInput: {
    height: 80,
    paddingTop: 12,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: -4,
    marginBottom: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
  },
  typeButtonActiveIncome: {
    backgroundColor: '#00B88D',
    shadowColor: '#00B88D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  typeButtonActiveExpense: {
    backgroundColor: '#FF5A5F',
    shadowColor: '#FF5A5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  typeButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  addButton: {
    marginTop: 32,
    backgroundColor: '#00B88D',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#00B88D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonDisabled: {
    opacity: 0.7,
    backgroundColor: '#999',
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});