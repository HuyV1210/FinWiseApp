import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const categories = [
  { label: 'Food', value: 'Food', icon: 'food' },
  { label: 'Salary', value: 'Salary', icon: 'cash' },
  { label: 'Transport', value: 'Transport', icon: 'bus' },
  { label: 'Shopping', value: 'Shopping', icon: 'shopping' },
  { label: 'Health', value: 'Health', icon: 'heart-pulse' },
  { label: 'Entertainment', value: 'Entertainment', icon: 'movie-open' },
  { label: 'Other', value: 'Other', icon: 'dots-horizontal' },
];

interface CategoryPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
}

export default function CategoryPickerModal({ visible, onClose, onSelect }: CategoryPickerModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                <Text style={styles.header}>Choose Category</Text>
                <FlatList
                    data={categories}
                    keyExtractor={(item) => item.value}
                    numColumns={3}
                    renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.categoryItem}
                        onPress={() => {
                        onSelect(item.value);
                        onClose();
                        }}
                    >
                        <Icon name={item.icon} size={28} color="#00B88D" />
                        <Text style={styles.label}>{item.label}</Text>
                    </TouchableOpacity>
                    )}
                />
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Text style={styles.closeText}>Cancel</Text>
                </TouchableOpacity>
                </View>
            </View>
        </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
    maxHeight: '60%',
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  categoryItem: {
    flex: 1,
    alignItems: 'center',
    marginVertical: 10,
  },
  label: {
    marginTop: 8,
    fontSize: 14,
    color: '#333',
  },
  closeButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  closeText: {
    color: '#FF5B5B',
    fontWeight: '600',
    fontSize: 16,
  },
});