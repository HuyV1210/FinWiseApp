import { 
  StyleSheet, 
  Text, 
  View, 
  Alert, 
  TouchableOpacity, 
  FlatList, 
  Platform, 
  UIManager, 
} from 'react-native';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import Header from '../../components/Header';
import { auth, firestore } from '../../services/firebase';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { collection, getDocs, onSnapshot, query, where, Timestamp, doc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { filterTransactionsByPeriod } from '../../utils/transactionUtils';
import { formatCurrencyShort } from '../../utils/currencyFormatter';
import LinearGradient from 'react-native-linear-gradient';
import type { Transaction } from '../../types/transaction';
import type { Budget, BudgetStatus } from '../../types/budget';
import { subscribeToNotificationCount } from '../../services/notificationService';
import { sendBudgetAlert } from '../../services/notificationService';

 type RootStackParamList = {
   Search: { transactions: Transaction[] };
   Budget: undefined;
 };

export const PERIODS = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
};

export default function Home () {
  const [selectedPeriod, setSelectedPeriod] = useState(PERIODS.DAILY);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expandedTitles, setExpandedTitles] = useState<{ [key: string]: boolean }>({});
  const [currency, setCurrency] = useState('VND');
  const [notificationCount, setNotificationCount] = useState(0);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const filterTimeout = useRef<NodeJS.Timeout | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handlePeriodPress = (period: string) => {
    setSelectedPeriod(period);
    throttledFilterTransactions(period, transactions);
  };

  const throttledFilterTransactions = useCallback((period: string, allTransactions: Transaction[]) => {
    if (filterTimeout.current) {
      clearTimeout(filterTimeout.current);
    }
    filterTimeout.current = setTimeout(() => {
      // Map PERIODS to utils period values
      let utilsPeriod: 'day' | 'week' | 'month' = 'day';
      if (period === PERIODS.DAILY) utilsPeriod = 'day';
      else if (period === PERIODS.WEEKLY) utilsPeriod = 'week';
      else if (period === PERIODS.MONTHLY) utilsPeriod = 'month';
      const filtered = filterTransactionsByPeriod(transactions, utilsPeriod);
      setFilteredTransactions(filtered);
    }, 200); // 200ms throttle
  }, [transactions]);

  const currencyRates: { [key: string]: number } = {
    VND: 1,
    USD: 24000,
    EUR: 26000,
    GBP: 30000,
    JPY: 160,
    INR: 290,
    CAD: 18000,
    AUD: 16000,
    CHF: 27000,
    SGD: 18000,
  };

  // Convert amount from one currency to another
  const convertCurrency = useCallback((amount: number, fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return amount;
    
    const amountInVND = amount * (currencyRates[fromCurrency] || 1);
    const convertedAmount = amountInVND / (currencyRates[toCurrency] || 1);
    
    return convertedAmount;
  }, []);

  const formatTransactionTitle = useCallback((title: string): string => {
    if (title.length > 80) {
      if (title.includes('ACB:') && title.includes('da chuyen den')) {
        const parts = title.split('Noi dung:');
        if (parts.length > 1) {
          const description = parts[1].split('.')[0].trim();
          return description || 'Bank Transfer';
        }
      }
      
      return title.length > 60 ? title.substring(0, 60) + '...' : title;
    }
    
    return title;
  }, []);

  const renderTransactionItem = useCallback(({ item }: { item: any }) => {
    const price = typeof item.price === 'string'
      ? Number(item.price.replace(/,/g, ''))
      : Number(item.price) || 0;

    const isIncome = item.type === 'income';
    const transactionDate = item.date.toDate();
    const transactionCurrency = item.currency || currency; 
    
    // Convert transaction amount to user's preferred currency for display
    const convertedAmount = convertCurrency(price, transactionCurrency, currency);
    
    const isExpanded = expandedTitles[item.id];
    const shouldShowExpandButton = item.title.length > 60;
    const displayTitle = isExpanded ? item.title : formatTransactionTitle(item.title);

    return (
      <View style={styles.transactionItem}>
        <View style={styles.transactionLeft}>
          <View style={[styles.transactionIcon, { backgroundColor: isIncome ? '#E8F5E8' : '#FFE8E8' }]}> 
            <Icon 
              name={isIncome ? 'trending-up' : 'trending-down'} 
              size={20} 
              color={isIncome ? '#00B88D' : '#FF5A5F'} 
            />
          </View>
          <View style={styles.transactionDetails}>
            <TouchableOpacity
              onPress={() => {
                if (shouldShowExpandButton) {
                  setExpandedTitles(prev => ({
                    ...prev,
                    [item.id]: !prev[item.id]
                  }));
                }
              }}
              activeOpacity={shouldShowExpandButton ? 0.7 : 1}
            >
              <Text 
                style={styles.transactionTitle}
                numberOfLines={isExpanded ? undefined : 2}
                ellipsizeMode="tail"
              >
                {displayTitle}
              </Text>
              {shouldShowExpandButton && (
                <Text style={styles.expandText}>
                  {isExpanded ? 'Show less' : 'Show more'}
                </Text>
              )}
            </TouchableOpacity>
            <Text style={styles.transactionCategory}>{item.category}</Text>
            <Text style={styles.transactionDate}>
              {transactionDate.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        </View>
        <View style={styles.transactionRight}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.transactionAmount, { color: isIncome ? '#00B88D' : '#FF5A5F' }]}> 
              {isIncome ? '+' : '-'}{formatCurrencyShort(convertedAmount, currency)}
            </Text>
            <Text style={[styles.transactionCurrency, { marginLeft: 4 }]}>{currency}</Text>
          </View>
          {transactionCurrency !== currency && (
            <Text style={[styles.transactionCurrency, { fontSize: 10, color: '#aaa', marginTop: 2 }]}> (from {transactionCurrency})</Text>
          )}
        </View>
      </View>
    );
  }, [currency, convertCurrency, formatTransactionTitle, expandedTitles]);

  const handleNotificationPress = () => {
    Alert.alert('Notifications', 'No new notifications');
  };

  const handleSearchPress = () => {
    navigation.navigate('Search', { transactions });
  };

  // Memoized totalIncome and totalExpense with currency conversion
  const totalIncome = React.useMemo(() => {
    return transactions.reduce((sum, t) => {
      if (t.type === 'income') {
        const price = typeof t.price === 'string' ? Number(t.price.replace(/,/g, '')) : Number(t.price) || 0;
        const transactionCurrency = t.currency || currency;
        const convertedPrice = convertCurrency(price, transactionCurrency, currency);
        return sum + convertedPrice;
      }
      return sum;
    }, 0);
  }, [transactions, currency, convertCurrency]);

  const totalExpense = React.useMemo(() => {
    return transactions.reduce((sum, t) => {
      if (t.type === 'expense') {
        const price = typeof t.price === 'string' ? Number(t.price.replace(/,/g, '')) : Number(t.price) || 0;
        const transactionCurrency = t.currency || currency;
        const convertedPrice = convertCurrency(price, transactionCurrency, currency);
        return sum + convertedPrice;
      }
      return sum;
    }, 0);
  }, [transactions, currency, convertCurrency]);

  // Calculate current month expenses for budget
  const currentMonthExpenses = React.useMemo(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return transactions.reduce((sum, t) => {
      if (t.type === 'expense') {
        const transactionDate = t.date.toDate();
        if (transactionDate >= firstDayOfMonth) {
          const price = typeof t.price === 'string' ? Number(t.price.replace(/,/g, '')) : Number(t.price) || 0;
          const transactionCurrency = t.currency || currency;
          const convertedPrice = convertCurrency(price, transactionCurrency, currency);
          return sum + convertedPrice;
        }
      }
      return sum;
    }, 0);
  }, [transactions, currency, convertCurrency]);

  // Calculate budget status
  const calculateBudgetStatus = useCallback((budget: Budget, expenses: number): BudgetStatus => {
    const totalBudget = budget.totalBudget;
    const totalSpent = expenses;
    const remainingBudget = totalBudget - totalSpent;
    const percentageUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    const isOverBudget = totalSpent > totalBudget;

    return {
      totalBudget,
      totalSpent,
      remainingBudget,
      percentageUsed,
      isOverBudget
    };
  }, []);

  // Update budget status when budget or current month expenses change
  useEffect(() => {
    if (budget) {
      const status = calculateBudgetStatus(budget, currentMonthExpenses);
      setBudgetStatus(status);
      
      // Check for budget alerts
      if (status.isOverBudget && currentMonthExpenses > 0) {
        const user = auth.currentUser;
        if (user) {
          // Send budget alert notification
          const currentMonth = new Date().toLocaleString('default', { month: 'long' });
          sendBudgetAlert(
            user.uid, 
            `${currentMonth} Budget`,
            status.totalSpent,
            status.totalBudget
          ).then(() => {
            console.log('🚨 Budget alert notification sent');
          }).catch((error) => {
            console.error('Failed to send budget alert:', error);
          });
        }
      }
    } else {
      setBudgetStatus(null);
    }
  }, [budget, currentMonthExpenses, calculateBudgetStatus, currency]);

  const handleBudgetPress = () => {
    if (budget) {
      // Navigate to budget details/edit
      navigation.navigate('Budget');
    } else {
      // Navigate to create budget
      navigation.navigate('Budget');
    }
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      return;
    }

    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }

    // Listen for user currency changes
    const userDocRef = doc(firestore, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrency(data.currency || 'VND');
      }
    });

    const q = query(
      collection(firestore, 'transactions'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transactionList: Transaction[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const transactionData: Transaction = {
          id: doc.id,
          type: data.type ?? 'expense',
          title: data.title ?? '',
          category: data.category ?? '',
          date: data.date ?? Timestamp.now(),
          price: data.price ?? 0,
          currency: data.currency, // Include currency field
        };
        transactionList.push(transactionData);
      });
      setTransactions(transactionList);
      // Throttled filter for large data
      throttledFilterTransactions(selectedPeriod, transactionList);
    });

    // Listen for budget changes
    const budgetQuery = query(
      collection(firestore, 'budgets'),
      where('userId', '==', user.uid)
    );

    const unsubscribeBudget = onSnapshot(budgetQuery, (snapshot) => {
      if (!snapshot.empty) {
        const budgetDoc = snapshot.docs[0];
        const budgetData = budgetDoc.data() as Budget;
        const fullBudget = { ...budgetData, id: budgetDoc.id };
        setBudget(fullBudget);
      } else {
        setBudget(null);
      }
    }, (error) => {
      console.error('❌ Budget access denied. Please check Firebase rules:', error.message);
      setBudget(null);
    });

    // Subscribe to notification count
    const unsubscribeNotifications = subscribeToNotificationCount(user.uid, (count) => {
      setNotificationCount(count);
    });

    return () => {
      unsubscribe(); // Cleanup listener on unmount
      unsubscribeBudget();
      unsubscribeUser();
      unsubscribeNotifications();
      if (filterTimeout.current) {
        clearTimeout(filterTimeout.current);
      }
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    const user = auth.currentUser;
    if (!user) {
      setRefreshing(false);
      return;
    }

    const q = query(
      collection(firestore, 'transactions'),
      where('userId', '==', user.uid)
    );

    getDocs(q)
      .then((snapshot) => {
        const transactionList: Transaction[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          transactionList.push({
            id: doc.id,
            type: data.type ?? 'expense',
            title: data.title ?? '',
            category: data.category ?? '',
            date: data.date ?? Timestamp.now(),
            price: data.price ?? 0,
            currency: data.currency, // Include currency field
          });
        });
        setTransactions(transactionList);
        throttledFilterTransactions(selectedPeriod, transactionList);
      })
      .catch((error) => {
        console.error("Error refreshing transactions:", error);
      })
      .finally(() => {
        setRefreshing(false);
      });
  };

  return (
    <LinearGradient 
      colors={['#00D09E', '#FFFFFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Header 
        onNotificationPress={handleNotificationPress}
        onSearchPress={handleSearchPress}
        notificationCount={notificationCount}
      />
      <View style={styles.content}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryTitle}>
              <Icon name="pin-invoke" size={22} color="black" style={styles.icon} />
              <Text style={styles.summaryLabel}>Total Income</Text>
            </View>
            <Text style={styles.incomeValue}>+{formatCurrencyShort(totalIncome, currency)}</Text>
            <Text style={styles.summaryCurrency}>{currency}</Text>
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.summaryBox}>
            <View style={styles.summaryTitle}>
              <Icon name="pin-end" size={22} color="black" style={styles.icon} />
              <Text style={styles.summaryLabel}>Total Expense</Text>
            </View>
            <Text style={styles.expenseValue}>-{formatCurrencyShort(totalExpense, currency)}</Text>
            <Text style={styles.summaryCurrency}>{currency}</Text>
          </View>
        </View>
        
        {/* Budget Status Bar */}
        <TouchableOpacity 
          style={styles.budgetContainer}
          onPress={handleBudgetPress}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={budgetStatus?.isOverBudget ? ['#FF6B6B', '#FF8E8E'] : ['#00B88D', '#00D09E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.budgetCard}
          >
            {budget && budgetStatus ? (
              <View style={styles.budgetContent}>
                <View style={styles.budgetHeader}>
                  <View style={styles.budgetTitleRow}>
                    <Icon name="account-balance-wallet" size={20} color="#fff" />
                    <Text style={styles.budgetTitle}>
                      {new Date().toLocaleString('default', { month: 'long' })} Budget
                    </Text>
                  </View>
                  <Text style={styles.budgetPercentage}>
                    {Math.round(budgetStatus.percentageUsed)}%
                  </Text>
                </View>
                
                <View style={styles.budgetProgressContainer}>
                  <View style={styles.budgetProgressBar}>
                    <View 
                      style={[
                        styles.budgetProgressFill, 
                        { 
                          width: `${Math.min(budgetStatus.percentageUsed, 100)}%`,
                          backgroundColor: budgetStatus.isOverBudget ? '#FFE5E5' : '#E6F9EC'
                        }
                      ]} 
                    />
                  </View>
                </View>
                
                <View style={styles.budgetAmounts}>
                  <Text style={styles.budgetSpent}>
                    Spent: {formatCurrencyShort(budgetStatus.totalSpent, currency)} {currency}
                  </Text>
                  <Text style={styles.budgetTotal}>
                    of {formatCurrencyShort(budgetStatus.totalBudget, currency)} {currency}
                  </Text>
                </View>
                
                {budgetStatus.isOverBudget && (
                  <Text style={styles.budgetWarning}>
                    ⚠️ Over budget by {formatCurrencyShort(Math.abs(budgetStatus.remainingBudget), currency)} {currency}
                  </Text>
                )}
                
                {!budgetStatus.isOverBudget && budgetStatus.remainingBudget > 0 && (
                  <Text style={styles.budgetRemaining}>
                    💰 {formatCurrencyShort(budgetStatus.remainingBudget, currency)} {currency} remaining this month
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.noBudgetContent}>
                <Icon name="add-circle-outline" size={24} color="#fff" />
                <Text style={styles.noBudgetTitle}>Create Your Budget</Text>
                <Text style={styles.noBudgetSubtitle}>
                  Set spending limits and track your progress
                </Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
      <View style={styles.subContainer}>
        <View style={styles.dateBox}>
          <TouchableOpacity
            style={[
              styles.dateButton,
              selectedPeriod === PERIODS.DAILY ? styles.activeBox : styles.inactiveBox,
            ]}
            onPress={() => handlePeriodPress(PERIODS.DAILY)}
          >
            <Text
              style={[
                styles.summaryLabel,
                selectedPeriod === PERIODS.DAILY ? styles.activeLabel : styles.inactiveLabel,
              ]}
            >
              Daily
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.dateButton,
              selectedPeriod === PERIODS.WEEKLY ? styles.activeBox : styles.inactiveBox,
            ]}
            onPress={() => handlePeriodPress(PERIODS.WEEKLY)}
          >
            <Text
              style={[
                styles.summaryLabel,
                selectedPeriod === PERIODS.WEEKLY ? styles.activeLabel : styles.inactiveLabel,
              ]}
            >
              Weekly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.dateButton,
              selectedPeriod === PERIODS.MONTHLY ? styles.activeBox : styles.inactiveBox,
            ]}
            onPress={() => handlePeriodPress(PERIODS.MONTHLY)}
          >
            <Text
              style={[
                styles.summaryLabel,
                selectedPeriod === PERIODS.MONTHLY ? styles.activeLabel : styles.inactiveLabel,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Transactions List */}
        <View style={styles.transactionsContainer}>
          <View style={styles.transactionsHeaderRow}>
            <Text style={styles.transactionsTitle}>
              {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Transactions
            </Text>
            <Text style={styles.transactionCount}>
              {filteredTransactions.length} {filteredTransactions.length === 1 ? 'transaction' : 'transactions'}
            </Text>
          </View>
          {filteredTransactions.length > 0 ? (
            <FlatList
              data={filteredTransactions}
              renderItem={renderTransactionItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              style={styles.transactionsList}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              removeClippedSubviews={false}
              nestedScrollEnabled={true}
            />
          ) : (
            <View style={styles.emptyState}>
              <Icon name="receipt-long" size={48} color="#999" />
              <Text style={styles.emptyStateText}>No transactions found</Text>
              <Text style={styles.emptyStateSubtext}>
                Add some transactions to see them here
              </Text>
            </View>
          )}
        </View>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  transactionsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  icon: {
    marginRight: 6,
  },
  container: {
    flex: 1,
    backgroundColor: '#00D09E',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
    marginBottom: 5,
  },
  summaryBox: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  dateButton: {
    paddingHorizontal: 10,
  },
  verticalDivider: {
    width: 0.5,
    backgroundColor: '#ccc',
  },
  summaryTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  incomeValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00B88D',
  },
  expenseValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF5A5F',
  },
  summaryCurrency: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginTop: 2,
  },
  subContainer: {
    backgroundColor: '#F1FFF3',
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    flex: 1,
    paddingTop: 28,
    paddingHorizontal: 20,
  },
  dateBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E6F9EC',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activeBox: {
    backgroundColor: '#00D09E',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  inactiveBox: {
    borderWidth: 0,
  },
  activeLabel: {
    color: '#fff',
    fontWeight: '700',
    paddingHorizontal: 14,
  },
  inactiveLabel: {
    color: '#333',
    fontWeight: '700',
    paddingHorizontal: 10,
  },
  transactionsContainer: {
    flex: 1,
    minHeight: 0, // Ensures proper flex behavior
  },
  transactionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 0, // Remove extra margin
  },
  transactionsList: {
    flex: 1,
    paddingBottom: 20, // Add bottom padding for better scrolling
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Changed from default to prevent stretching
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
    minHeight: 70, // Ensure consistent minimum height
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align to top for long text
    flex: 1,
    marginRight: 8, // Add some margin to separate from right side
  },
  transactionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
    marginRight: 8, // Add margin to prevent overlap with amount
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    lineHeight: 20, // Better line spacing for multi-line text
    marginBottom: 2, // Small margin between title and category
  },
  transactionCategory: {
    fontSize: 13,
    color: '#777',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#aaa',
  },
  transactionRight: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start', // Align amount to top
    minWidth: 80, // Ensure minimum width for amounts
    marginLeft: 8, // Add margin from left content
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  transactionCurrency: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
    paddingHorizontal: 24,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#888',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 4,
  },
  transactionCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  expandText: {
    fontSize: 12,
    color: '#00B88D',
    fontWeight: '500',
    marginTop: 2,
  },
  budgetContainer: {
    marginHorizontal: 0, // Changed from 20 to 0 to prevent potential overflow
    marginTop: 15,
    marginBottom: 10,
    paddingHorizontal: 20, // Add padding instead of margin
  },
  budgetCard: {
    borderRadius: 15,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  budgetContent: {
    width: '100%',
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  budgetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  budgetPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  budgetProgressContainer: {
    marginBottom: 12,
  },
  budgetProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  budgetProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetSpent: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  budgetTotal: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
  budgetWarning: {
    fontSize: 12,
    color: '#FFE5E5',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  budgetRemaining: {
    fontSize: 12,
    color: '#E6F9EC',
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  noBudgetContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  noBudgetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  noBudgetSubtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    textAlign: 'center',
  },
});