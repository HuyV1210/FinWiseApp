import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';
import { Budget, BudgetStatus, SavingsGoal } from '../../types/budget';
import { auth, firestore } from '../../services/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  query, 
  where, 
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { formatCurrencyShort } from '../../utils/currencyFormatter';
import { sendGoalAchievedNotification } from '../../services/notificationService';

type BudgetScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Budget'>;
};

const DEFAULT_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Travel',
  'Education',
  'Other'
];

export default function BudgetScreen({ navigation }: BudgetScreenProps) {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  const [categorySpending, setCategorySpending] = useState<{[key: string]: number}>({});
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [monthlySpending, setMonthlySpending] = useState<{[key: string]: number}>({});
  const [isEditing, setIsEditing] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');
  const [newGoalDate, setNewGoalDate] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [categoryLimits, setCategoryLimits] = useState<{[key: string]: string}>({});
  const [totalBudget, setTotalBudget] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(auth.currentUser);
  const [showCategoryDetails, setShowCategoryDetails] = useState(false);

  const currency = 'VND'; // You can make this dynamic based on user preference

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        // Navigate back if no user
        navigation.goBack();
      }
    });

    return unsubscribeAuth;
  }, [navigation]);

  useEffect(() => {
    if (!user) return;

    console.log('Setting up budget listener for user:', user.uid);

    // Listen to budget changes
    const budgetRef = doc(firestore, 'budgets', user.uid);
    const unsubscribeBudget = onSnapshot(
      budgetRef, 
      (doc) => {
        console.log('Budget snapshot received, exists:', doc.exists());
        if (doc.exists()) {
          const budgetData = { id: doc.id, ...doc.data() } as Budget;
          console.log('Budget data:', budgetData);
          setBudget(budgetData);
          
          // Initialize form data with existing budget
          setMonthlyIncome(budgetData.monthlyIncome.toString());
          setTotalBudget(budgetData.totalBudget.toString());
          
          const categoryStrings: {[key: string]: string} = {};
          Object.entries(budgetData.categoryLimits).forEach(([key, value]) => {
            categoryStrings[key] = value.toString();
          });
          setCategoryLimits(categoryStrings);
        } else {
          console.log('No budget found, setting editing mode');
          setBudget(null);
          // Initialize with empty values for new budget
          setIsEditing(true);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching budget:', error);
        // Handle permission errors gracefully
        if (error.code === 'permission-denied') {
          console.log('Permission denied, user can still create budget');
          setBudget(null);
          setIsEditing(true);
        }
        setLoading(false);
      }
    );

    // Calculate budget status by listening to transactions
    const calculateBudgetStatus = (currentBudget: Budget) => {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const transactionsRef = collection(firestore, 'transactions');
      const monthlyQuery = query(
        transactionsRef,
        where('userId', '==', user.uid),
        where('date', '>=', Timestamp.fromDate(firstDayOfMonth))
      );

      return onSnapshot(
        monthlyQuery, 
        (snapshot) => {
          let totalSpent = 0;
          const categoryTotals: {[key: string]: number} = {};
          
          console.log(`📊 Budget calculation: Found ${snapshot.docs.length} transactions this month`);
          
          snapshot.docs.forEach((doc) => {
            const transaction = doc.data();
            console.log('Transaction data:', {
              type: transaction.type,
              price: transaction.price,
              category: transaction.category,
              title: transaction.title,
              date: transaction.date?.toDate?.()?.toDateString()
            });
            
            if (transaction.type === 'expense') {
              // Use 'price' field instead of 'amount' to match transaction structure
              const price = typeof transaction.price === 'string' 
                ? Number(transaction.price.replace(/,/g, '')) 
                : Number(transaction.price) || 0;
              
              const category = transaction.category || 'Other';
              categoryTotals[category] = (categoryTotals[category] || 0) + price;
              totalSpent += price;
              console.log(`Added expense: ${price} to ${category}, Total so far: ${totalSpent}`);
            }
          });

          console.log(`📊 Final calculation: Total spent: ${totalSpent}, Budget: ${currentBudget.totalBudget}`);
          console.log('📊 Category breakdown:', categoryTotals);

          setCategorySpending(categoryTotals);

          const remainingBudget = currentBudget.totalBudget - totalSpent;
          const percentageUsed = (totalSpent / currentBudget.totalBudget) * 100;
          const isOverBudget = totalSpent > currentBudget.totalBudget;

          const budgetStatus = {
            totalBudget: currentBudget.totalBudget,
            totalSpent,
            remainingBudget,
            percentageUsed,
            isOverBudget,
          };

          console.log('📊 Budget Status:', budgetStatus);
          setBudgetStatus(budgetStatus);
        },
        (error) => {
          console.error('Error fetching transactions for budget:', error);
          // Set default budget status if transactions can't be fetched
          setBudgetStatus({
            totalBudget: currentBudget.totalBudget,
            totalSpent: 0,
            remainingBudget: currentBudget.totalBudget,
            percentageUsed: 0,
            isOverBudget: false,
          });
        }
      );
    };

    let unsubscribeTransactions: (() => void) | null = null;
    if (budget) {
      unsubscribeTransactions = calculateBudgetStatus(budget);
    }

    // Listen to savings goals
    const goalsRef = collection(firestore, 'savingsGoals');
    const goalsQuery = query(goalsRef, where('userId', '==', user.uid));
    const unsubscribeGoals = onSnapshot(goalsQuery, (snapshot) => {
      const goalsList: SavingsGoal[] = [];
      snapshot.forEach((doc) => {
        goalsList.push({ id: doc.id, ...doc.data() } as SavingsGoal);
      });
      setSavingsGoals(goalsList);
    });

    // Calculate last 3 months spending for analytics
    const calculateMonthlyAnalytics = () => {
      const now = new Date();
      const months = ['Current', 'Last Month', '2 Months Ago'];
      const monthlyTotals: {[key: string]: number} = {};

      months.forEach((monthLabel, index) => {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - index, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - index + 1, 1);
        
        const monthQuery = query(
          collection(firestore, 'transactions'),
          where('userId', '==', user.uid),
          where('date', '>=', Timestamp.fromDate(monthDate)),
          where('date', '<', Timestamp.fromDate(nextMonth)),
          where('type', '==', 'expense')
        );

        onSnapshot(monthQuery, (snapshot) => {
          let monthTotal = 0;
          snapshot.docs.forEach((doc) => {
            const transaction = doc.data();
            const price = typeof transaction.price === 'string' 
              ? Number(transaction.price.replace(/,/g, '')) 
              : Number(transaction.price) || 0;
            monthTotal += price;
          });
          
          monthlyTotals[monthLabel] = monthTotal;
          setMonthlySpending({...monthlyTotals});
        });
      });
    };

    calculateMonthlyAnalytics();

    return () => {
      unsubscribeBudget();
      unsubscribeGoals();
      if (unsubscribeTransactions) {
        unsubscribeTransactions();
      }
    };
  }, [user, budget?.id]);

  const handleSaveBudget = async () => {
    if (!user) return;

    try {
      const income = parseFloat(monthlyIncome) || 0;
      const total = parseFloat(totalBudget) || 0;
      
      const categoryLimitsNumbers: {[key: string]: number} = {};
      Object.entries(categoryLimits).forEach(([key, value]) => {
        categoryLimitsNumbers[key] = parseFloat(value) || 0;
      });

      const budgetData: Omit<Budget, 'id'> = {
        userId: user.uid,
        monthlyIncome: income,
        period: 'monthly',
        categoryLimits: categoryLimitsNumbers,
        totalBudget: total,
        createdAt: budget?.createdAt || Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const budgetRef = doc(firestore, 'budgets', user.uid);
      await setDoc(budgetRef, budgetData, { merge: true });
      
      setIsEditing(false);
      Alert.alert('Success', 'Budget saved successfully!');
    } catch (error) {
      console.error('Error saving budget:', error);
      Alert.alert('Error', 'Failed to save budget. Please try again.');
    }
  };

  const handleCategoryLimitChange = (category: string, value: string) => {
    setCategoryLimits(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const handleAddSavingsGoal = async () => {
    if (!user || !newGoalTitle || !newGoalAmount || !newGoalDate) {
      Alert.alert('Error', 'Please fill in all goal details.');
      return;
    }

    try {
      const goalData: Omit<SavingsGoal, 'id'> = {
        userId: user.uid,
        title: newGoalTitle,
        targetAmount: parseFloat(newGoalAmount) || 0,
        currentAmount: 0,
        targetDate: Timestamp.fromDate(new Date(newGoalDate)),
        category: 'Savings',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isCompleted: false,
      };

      const goalsRef = collection(firestore, 'savingsGoals');
      await setDoc(doc(goalsRef), goalData);
      
      setNewGoalTitle('');
      setNewGoalAmount('');
      setNewGoalDate('');
      setShowAddGoal(false);
      Alert.alert('Success', 'Savings goal added successfully!');
    } catch (error) {
      console.error('Error adding savings goal:', error);
      Alert.alert('Error', 'Failed to add savings goal. Please try again.');
    }
  };

  const handleMarkGoalComplete = async (goal: SavingsGoal) => {
    if (!user) return;

    try {
      const goalRef = doc(firestore, 'savingsGoals', goal.id);
      await updateDoc(goalRef, {
        isCompleted: true,
        currentAmount: goal.targetAmount, // Set to target amount
        updatedAt: Timestamp.now(),
      });

      // Send achievement notification
      await sendGoalAchievedNotification(user.uid, goal.title, goal.targetAmount);

      Alert.alert(
        '🎉 Goal Completed!',
        `Congratulations! You've achieved your "${goal.title}" goal!`,
        [{ text: 'Awesome!', style: 'default' }]
      );
    } catch (error) {
      console.error('Error marking goal as complete:', error);
      Alert.alert('Error', 'Failed to mark goal as complete. Please try again.');
    }
  };

  const handleUpdateGoalProgress = async (goal: SavingsGoal, newAmount: string) => {
    if (!user || !newAmount) return;

    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount < 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }

    try {
      const goalRef = doc(firestore, 'savingsGoals', goal.id);
      const wasCompleted = goal.isCompleted;
      const isNowCompleted = amount >= goal.targetAmount;

      await updateDoc(goalRef, {
        currentAmount: amount,
        isCompleted: isNowCompleted,
        updatedAt: Timestamp.now(),
      });

      // Send achievement notification if goal was just completed
      if (!wasCompleted && isNowCompleted) {
        await sendGoalAchievedNotification(user.uid, goal.title, goal.targetAmount);
        Alert.alert(
          '🎉 Goal Achieved!',
          `Congratulations! You've reached your "${goal.title}" goal!`,
          [{ text: 'Celebrate!', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Error updating goal progress:', error);
      Alert.alert('Error', 'Failed to update goal progress. Please try again.');
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#00D09E', '#00B88D']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#00D09E', '#00B88D']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Budget Management</Text>
        <TouchableOpacity 
          onPress={() => isEditing ? handleSaveBudget() : setIsEditing(true)}
          style={styles.actionButton}
        >
          <Icon name={isEditing ? "save" : "edit"} size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {budget && budgetStatus && !isEditing && (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>
              {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} Status
            </Text>
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Budget</Text>
                <Text style={styles.statusValue}>{formatCurrencyShort(budgetStatus.totalBudget, currency)} {currency}</Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Spent</Text>
                <Text style={[styles.statusValue, budgetStatus.isOverBudget && styles.overBudget]}>
                  {formatCurrencyShort(budgetStatus.totalSpent, currency)} {currency}
                </Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>
                  {budgetStatus.isOverBudget ? 'Over Budget' : 'Remaining'}
                </Text>
                <Text style={[styles.statusValue, budgetStatus.isOverBudget && styles.overBudget]}>
                  {formatCurrencyShort(Math.abs(budgetStatus.remainingBudget), currency)} {currency}
                </Text>
              </View>
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${Math.min(budgetStatus.percentageUsed, 100)}%`,
                      backgroundColor: budgetStatus.isOverBudget ? '#FF6B6B' : '#fff'
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {budgetStatus.totalSpent === 0 
                  ? "No expenses this month yet" 
                  : `${Math.round(budgetStatus.percentageUsed)}% of budget used`
                }
              </Text>
              {budgetStatus.isOverBudget && (
                <Text style={[styles.progressText, { color: '#FFE5E5', marginTop: 5 }]}>
                  ⚠️ You're {Math.round(budgetStatus.percentageUsed - 100)}% over budget
                </Text>
              )}
              {budgetStatus.totalSpent > 0 && !budgetStatus.isOverBudget && budgetStatus.remainingBudget > 0 && (
                <Text style={[styles.progressText, { color: '#E6F9EC', marginTop: 5 }]}>
                  💰 {formatCurrencyShort(budgetStatus.remainingBudget, currency)} {currency} left to spend
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Category Breakdown Section */}
        {budget && !isEditing && (
          <View style={styles.formCard}>
            <View style={styles.categoryBreakdownHeader}>
              <Text style={styles.sectionTitle}>Category Spending</Text>
              <TouchableOpacity 
                onPress={() => setShowCategoryDetails(!showCategoryDetails)}
                style={styles.toggleButton}
              >
                <Text style={styles.toggleButtonText}>
                  {showCategoryDetails ? 'Hide Details' : 'View Details'}
                </Text>
                <Icon 
                  name={showCategoryDetails ? "expand-less" : "expand-more"} 
                  size={20} 
                  color="#00B88D" 
                />
              </TouchableOpacity>
            </View>
            
            {showCategoryDetails && (
              <View style={styles.categoryBreakdown}>
                {DEFAULT_CATEGORIES.map((category) => {
                  const spent = categorySpending[category] || 0;
                  const limit = budget.categoryLimits[category] || 0;
                  const percentage = limit > 0 ? (spent / limit) * 100 : 0;
                  const isOverLimit = spent > limit && limit > 0;
                  
                  return (
                    <View key={category} style={styles.categoryBreakdownRow}>
                      <View style={styles.categoryBreakdownInfo}>
                        <Text style={styles.categoryBreakdownName}>{category}</Text>
                        <Text style={[
                          styles.categoryBreakdownAmount,
                          isOverLimit && styles.overBudgetText
                        ]}>
                          {formatCurrencyShort(spent, currency)} / {formatCurrencyShort(limit, currency)} {currency}
                        </Text>
                      </View>
                      
                      {limit > 0 && (
                        <View style={styles.categoryProgressContainer}>
                          <View style={styles.categoryProgressBar}>
                            <View 
                              style={[
                                styles.categoryProgressFill,
                                {
                                  width: `${Math.min(percentage, 100)}%`,
                                  backgroundColor: isOverLimit ? '#FF6B6B' : '#00B88D'
                                }
                              ]}
                            />
                          </View>
                          <Text style={[
                            styles.categoryPercentage,
                            isOverLimit && styles.overBudgetText
                          ]}>
                            {Math.round(percentage)}%
                          </Text>
                        </View>
                      )}
                      
                      {limit === 0 && (
                        <Text style={styles.noLimitText}>No limit set</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Savings Goals Section */}
        {!isEditing && (
          <View style={styles.formCard}>
            <View style={styles.categoryBreakdownHeader}>
              <Text style={styles.sectionTitle}>Savings Goals</Text>
              <TouchableOpacity 
                onPress={() => setShowAddGoal(!showAddGoal)}
                style={styles.toggleButton}
              >
                <Text style={styles.toggleButtonText}>
                  {showAddGoal ? 'Cancel' : 'Add Goal'}
                </Text>
                <Icon 
                  name={showAddGoal ? "close" : "add"} 
                  size={20} 
                  color="#00B88D" 
                />
              </TouchableOpacity>
            </View>

            {showAddGoal && (
              <View style={styles.addGoalForm}>
                <TextInput
                  style={styles.input}
                  value={newGoalTitle}
                  onChangeText={setNewGoalTitle}
                  placeholder="Goal title (e.g., Emergency Fund)"
                />
                <TextInput
                  style={styles.input}
                  value={newGoalAmount}
                  onChangeText={setNewGoalAmount}
                  placeholder="Target amount"
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  value={newGoalDate}
                  onChangeText={setNewGoalDate}
                  placeholder="Target date (YYYY-MM-DD)"
                />
                <TouchableOpacity onPress={handleAddSavingsGoal} style={styles.addGoalButton}>
                  <Text style={styles.saveButtonText}>Add Goal</Text>
                </TouchableOpacity>
              </View>
            )}

            {savingsGoals.length > 0 ? (
              <View style={styles.goalsContainer}>
                {savingsGoals.map((goal) => {
                  const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
                  const daysRemaining = Math.ceil((goal.targetDate.toDate().getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <View key={goal.id} style={[styles.goalCard, goal.isCompleted && styles.completedGoalCard]}>
                      <View style={styles.goalHeader}>
                        <Text style={[styles.goalTitle, goal.isCompleted && styles.completedGoalTitle]}>
                          {goal.isCompleted && '✅ '}{goal.title}
                        </Text>
                        <Text style={styles.goalAmount}>
                          {formatCurrencyShort(goal.currentAmount, currency)} / {formatCurrencyShort(goal.targetAmount, currency)} {currency}
                        </Text>
                      </View>
                      
                      <View style={styles.categoryProgressContainer}>
                        <View style={styles.categoryProgressBar}>
                          <View 
                            style={[
                              styles.categoryProgressFill,
                              {
                                width: `${Math.min(progress, 100)}%`,
                                backgroundColor: goal.isCompleted ? '#00B88D' : progress >= 100 ? '#00B88D' : '#4CAF50'
                              }
                            ]}
                          />
                        </View>
                        <Text style={styles.categoryPercentage}>
                          {Math.round(progress)}%
                        </Text>
                      </View>
                      
                      <Text style={styles.goalDeadline}>
                        {goal.isCompleted 
                          ? 'Goal Completed! 🎉' 
                          : daysRemaining > 0 
                            ? `${daysRemaining} days remaining` 
                            : 'Deadline passed'
                        }
                      </Text>

                      {!goal.isCompleted && (
                        <View style={styles.goalActions}>
                          <TextInput
                            style={styles.goalAmountInput}
                            placeholder="Update amount"
                            keyboardType="numeric"
                            onSubmitEditing={(e) => {
                              const newAmount = e.nativeEvent.text;
                              if (newAmount) {
                                handleUpdateGoalProgress(goal, newAmount);
                                // Clear the input by setting the value
                                e.currentTarget.setNativeProps({ text: '' });
                              }
                            }}
                          />
                          
                          {progress >= 100 && (
                            <TouchableOpacity 
                              style={styles.completeGoalButton}
                              onPress={() => handleMarkGoalComplete(goal)}
                            >
                              <Icon name="check-circle" size={20} color="#FFF" />
                              <Text style={styles.completeGoalButtonText}>Mark Complete</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.noGoalsText}>
                No savings goals yet. Add your first goal to start saving!
              </Text>
            )}
          </View>
        )}

        {/* Spending Analytics Section */}
        {!isEditing && Object.keys(monthlySpending).length > 0 && (
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Spending Trends</Text>
            <View style={styles.analyticsContainer}>
              {Object.entries(monthlySpending).map(([month, amount]) => (
                <View key={month} style={styles.analyticsRow}>
                  <Text style={styles.analyticsMonth}>{month}</Text>
                  <Text style={styles.analyticsAmount}>
                    {formatCurrencyShort(amount, currency)} {currency}
                  </Text>
                  {budget && (
                    <View style={styles.analyticsBar}>
                      <View 
                        style={[
                          styles.analyticsBarFill,
                          {
                            width: `${Math.min((amount / budget.totalBudget) * 100, 100)}%`,
                            backgroundColor: amount > budget.totalBudget ? '#FF6B6B' : '#00B88D'
                          }
                        ]}
                      />
                    </View>
                  )}
                </View>
              ))}
            </View>
            
            {budget && monthlySpending['Current'] && monthlySpending['Last Month'] && (
              <View style={styles.insightContainer}>
                <Text style={styles.insightTitle}>💡 Insight</Text>
                <Text style={styles.insightText}>
                  {monthlySpending['Current'] > monthlySpending['Last Month'] 
                    ? `You're spending ${Math.round(((monthlySpending['Current'] - monthlySpending['Last Month']) / monthlySpending['Last Month']) * 100)}% more than last month`
                    : `You're spending ${Math.round(((monthlySpending['Last Month'] - monthlySpending['Current']) / monthlySpending['Last Month']) * 100)}% less than last month 🎉`
                  }
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Monthly Income</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.disabledInput]}
            value={monthlyIncome}
            onChangeText={setMonthlyIncome}
            placeholder="Enter your monthly income"
            keyboardType="numeric"
            editable={isEditing}
          />

          <Text style={styles.sectionTitle}>Total Monthly Budget</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.disabledInput]}
            value={totalBudget}
            onChangeText={setTotalBudget}
            placeholder="Enter your total monthly budget"
            keyboardType="numeric"
            editable={isEditing}
          />

          <Text style={styles.sectionTitle}>Category Limits</Text>
          {DEFAULT_CATEGORIES.map((category) => (
            <View key={category} style={styles.categoryRow}>
              <Text style={styles.categoryLabel}>{category}</Text>
              <TextInput
                style={[styles.categoryInput, !isEditing && styles.disabledInput]}
                value={categoryLimits[category] || ''}
                onChangeText={(value) => handleCategoryLimitChange(category, value)}
                placeholder="0"
                keyboardType="numeric"
                editable={isEditing}
              />
            </View>
          ))}
        </View>

        {isEditing && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={() => setIsEditing(false)} style={[styles.button, styles.cancelButton]}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSaveBudget} style={[styles.button, styles.saveButton]}>
              <Text style={styles.saveButtonText}>Save Budget</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{height: 100}} />
      </ScrollView>
    </LinearGradient>
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
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  actionButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 5,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  overBudget: {
    color: '#FFE5E5',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  disabledInput: {
    backgroundColor: '#F5F5F5',
    color: '#666',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  categoryInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    width: 100,
    textAlign: 'right',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#fff',
  },
  saveButtonText: {
    color: '#00B88D',
    fontSize: 16,
    fontWeight: '600',
  },
  categoryBreakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  toggleButtonText: {
    color: '#00B88D',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 5,
  },
  categoryBreakdown: {
    gap: 12,
  },
  categoryBreakdownRow: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#E5E5E5',
  },
  categoryBreakdownInfo: {
    marginBottom: 8,
  },
  categoryBreakdownName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  categoryBreakdownAmount: {
    fontSize: 12,
    color: '#666',
  },
  overBudgetText: {
    color: '#FF6B6B',
  },
  categoryProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E5E5',
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    minWidth: 35,
    textAlign: 'right',
  },
  noLimitText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  addGoalForm: {
    marginBottom: 20,
    gap: 12,
  },
  addGoalButton: {
    backgroundColor: '#00B88D',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  goalsContainer: {
    gap: 12,
  },
  goalCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#00B88D',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  goalAmount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  goalDeadline: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    textAlign: 'center',
  },
  noGoalsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  analyticsContainer: {
    marginTop: 15,
  },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 5,
  },
  analyticsMonth: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    width: 100,
  },
  analyticsAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    flex: 1,
  },
  analyticsBar: {
    flex: 2,
    height: 8,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    overflow: 'hidden',
    marginLeft: 10,
  },
  analyticsBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  insightContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#00B88D',
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  insightText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  completedGoalCard: {
    backgroundColor: '#F0F9F5',
    borderColor: '#00B88D',
    borderWidth: 1,
  },
  completedGoalTitle: {
    color: '#00B88D',
    fontWeight: '700',
  },
  goalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  goalAmountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#FFF',
  },
  completeGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B88D',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  completeGoalButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
