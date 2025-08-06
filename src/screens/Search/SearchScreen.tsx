import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Transaction } from '../../types/transaction';
import { auth, firestore } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const SearchScreen: React.FC = () => {
  const navigation = useNavigation();
  const [queryText, setQueryText] = useState('');
  const [results, setResults] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      const user = auth.currentUser;
      if (!user || !queryText.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }
      try {
        const q = query(
          collection(firestore, 'transactions'),
          where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        const filtered: Transaction[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (
            (data.title && data.title.toLowerCase().includes(queryText.toLowerCase())) ||
            (data.category && data.category.toLowerCase().includes(queryText.toLowerCase()))
          ) {
            filtered.push({
              id: doc.id,
              type: data.type ?? 'expense',
              title: data.title ?? '',
              category: data.category ?? '',
              date: data.date,
              price: data.price ?? 0,
            });
          }
        });
        setResults(filtered);
      } catch (error) {
        setResults([]);
      }
      setLoading(false);
    };
    fetchResults();
  }, [queryText]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title or category..."
          value={queryText}
          onChangeText={setQueryText}
          autoFocus
        />
      </View>
      <FlatList
        data={results}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.resultItem}>
            <Text style={styles.resultTitle}>{item.title}</Text>
            <Text style={styles.resultCategory}>{item.category}</Text>
            <Text style={styles.resultAmount}>{item.type === 'income' ? '+' : '-'}{item.price} VND</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>{loading ? 'Searching...' : 'No results found.'}</Text>}
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
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#00D09E',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  resultItem: {
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
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  resultCategory: {
    fontSize: 13,
    color: '#777',
    marginBottom: 2,
  },
  resultAmount: {
    fontSize: 15,
    color: '#00B88D',
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 40,
    fontSize: 16,
  },
});

export default SearchScreen;