import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Transaction } from '../../types/transaction';
import { auth, firestore } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import LinearGradient from 'react-native-linear-gradient';

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
        <View style={styles.searchBar}>
          <Icon name="search" size={22} color="#00D09E" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title or category..."
            value={queryText}
            onChangeText={setQueryText}
            autoFocus
            placeholderTextColor="#00D09E"
          />
        </View>
      </View>
      <FlatList
        data={results}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.resultItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Icon
                name={item.type === 'income' ? 'trending-up' : 'trending-down'}
                size={20}
                color={item.type === 'income' ? '#00B88D' : '#FF6B6B'}
                style={{ marginRight: 8 }}
              />
              <Text
                style={styles.resultTitle}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.title}
              </Text>
            </View>
            <Text style={styles.resultCategory}>{item.category}</Text>
            <Text
              style={[
                styles.resultAmount,
                { color: item.type === 'income' ? '#00B88D' : '#FF6B6B' }
              ]}
            >
              {item.type === 'income' ? '+' : '-'}
              {item.price} VND
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>{loading ? 'Searching...' : 'No results found.'}</Text>}
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
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00D09E',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
    color: '#222',
    backgroundColor: 'transparent',
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
    maxWidth: 200, // adjust as needed
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