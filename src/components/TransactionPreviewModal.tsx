import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { addDoc, collection } from 'firebase/firestore';
import { auth, firestore } from '../services/firebase';
import CategoryPickerModal from './CategoryPickerModal';
import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface ParsedTransactionData {
  amount: number;
  type: 'income' | 'expense';
  description: string;
  category?: string;
  currency?: string;
}

interface TransactionPreviewModalProps {
  visible: boolean;
  parsedData: ParsedTransactionData | null;
  onClose: () => void;
  onSaved: () => void;
}

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

export default function TransactionPreviewModal({
  visible,
  parsedData,
  onClose,
  onSaved,
}: TransactionPreviewModalProps) {
  console.log('🎭 TransactionPreviewModal render - visible:', visible, 'parsedData:', parsedData);
  
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    type: 'expense' as 'income' | 'expense',
    date: new Date(),
    title: '',
    note: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  React.useEffect(() => {
    if (parsedData && visible) {
      setFormData({
        amount: parsedData.amount.toString(),
        category: parsedData.category || '',
        type: parsedData.type,
        date: new Date(),
        title: parsedData.description,
        note: 'Added via chat',
      });
    }
  }, [parsedData, visible]);

  const handleSave = async () => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (!formData.amount || !formData.category || !formData.title) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(firestore, 'transactions'), {
        type: formData.type,
        price: parseFloat(formData.amount),
        category: formData.category,
        date: formData.date,
        title: formData.title,
        note: formData.note,
        userId: auth.currentUser.uid,
        createdAt: new Date(),
        currency: parsedData?.currency || 'VND',
        source: 'chat_auto_fill'
      });

      Alert.alert('Success', 'Transaction added successfully!');
      onSaved();
      onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
      Alert.alert('Error', 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = categories.find(cat => cat.value === formData.category);

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Add a bright background to make sure it's visible */}
        <View style={{ backgroundColor: 'red', padding: 20, margin: 20 }}>
          <Text style={{ fontSize: 24, color: 'white', textAlign: 'center' }}>
            🎯 TEST MODAL IS VISIBLE! 🎯
          </Text>
          <Text style={{ fontSize: 16, color: 'white', textAlign: 'center', marginTop: 10 }}>
            Amount: {parsedData?.amount} {parsedData?.currency}
          </Text>
          <Text style={{ fontSize: 16, color: 'white', textAlign: 'center' }}>
            Type: {parsedData?.type}
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: 'white', padding: 15, marginTop: 20, borderRadius: 8 }}
            onPress={onClose}
          >
            <Text style={{ color: 'red', textAlign: 'center', fontSize: 18, fontWeight: 'bold' }}>
              CLOSE TEST MODAL
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Review Transaction</Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#00D09E" />
            ) : (
              <Text style={styles.saveButton}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Auto-filled from your message:</Text>
          
          {/* Transaction Type */}
          <View style={styles.row}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                formData.type === 'income' && styles.typeButtonActiveIncome,
              ]}
              onPress={() => setFormData(prev => ({ ...prev, type: 'income' }))}
            >
              <Text style={[
                styles.typeButtonText,
                formData.type === 'income' && styles.typeButtonTextActive,
              ]}>
                Income
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                formData.type === 'expense' && styles.typeButtonActiveExpense,
              ]}
              onPress={() => setFormData(prev => ({ ...prev, type: 'expense' }))}
            >
              <Text style={[
                styles.typeButtonText,
                formData.type === 'expense' && styles.typeButtonTextActive,
              ]}>
                Expense
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount *</Text>
            <TextInput
              style={styles.input}
              value={formData.amount}
              onChangeText={(text) => setFormData(prev => ({ ...prev, amount: text }))}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>

          {/* Category */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category *</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowCategoryPicker(true)}
            >
              <View style={styles.categoryContainer}>
                {selectedCategory && (
                  <MaterialIcons name={selectedCategory.icon} size={20} color="#666" />
                )}
                <Text style={[styles.inputText, !formData.category && styles.placeholder]}>
                  {formData.category || 'Select category'}
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={20} color="#666" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              placeholder="Transaction title"
            />
          </View>

          {/* Date */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.inputText}>
                {formData.date.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Note */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Note</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              value={formData.note}
              onChangeText={(text) => setFormData(prev => ({ ...prev, note: text }))}
              placeholder="Optional note"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Category Picker Modal */}
        <CategoryPickerModal
          visible={showCategoryPicker}
          onSelect={(category) => {
            setFormData(prev => ({ ...prev, category }));
            setShowCategoryPicker(false);
          }}
          onClose={() => setShowCategoryPicker(false)}
        />

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={formData.date}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) {
                setFormData(prev => ({ ...prev, date }));
              }
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    color: '#00D09E',
    fontWeight: 'bold',
    fontSize: 16,
  },
  form: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  typeButtonActiveIncome: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  typeButtonActiveExpense: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  typeButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputText: {
    fontSize: 16,
    color: '#333',
  },
  placeholder: {
    color: '#999',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteInput: {
    height: 80,
    textAlignVertical: 'top',
  },
});
