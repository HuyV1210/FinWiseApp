import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { auth, firestore } from '../../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { getSpendingAnalysis } from '../Chat/chat';
import { formatCurrencyShort } from '../../utils/currencyFormatter';

const { width, height } = Dimensions.get('window');

interface ChartData {
  label: string;
  value: number;
  color: string;
}

interface RouteParams {
  statType: string;
}

export default function StatsChartScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { statType } = route.params as RouteParams;
  
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [totalAmount, setTotalAmount] = useState(0);
  const [currency, setCurrency] = useState('VND');

  const categoryColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];

  useEffect(() => {
    fetchChartData();
  }, [period]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const statsData = await getSpendingAnalysis(user.uid, period);
      
      if (statType === 'Total Expenses') {
        // Show expense categories
        const categoryData = Object.entries(statsData.categories)
          .map(([name, amount], index) => ({
            label: name,
            value: amount,
            color: categoryColors[index % categoryColors.length]
          }))
          .sort((a, b) => b.value - a.value);
        
        setChartData(categoryData);
        setTotalAmount(statsData.totalExpenses);
      } else if (statType === 'Total Income') {
        // Show income vs expenses comparison
        const comparisonData = [
          { label: 'Income', value: statsData.totalIncome, color: '#4CAF50' },
          { label: 'Expenses', value: statsData.totalExpenses, color: '#FF6B6B' }
        ];
        setChartData(comparisonData);
        setTotalAmount(statsData.totalIncome);
      } else if (statType === 'Balance') {
        // Show balance breakdown
        const balance = statsData.totalIncome - statsData.totalExpenses;
        const balanceData = [
          { label: 'Income', value: statsData.totalIncome, color: '#4CAF50' },
          { label: 'Expenses', value: statsData.totalExpenses, color: '#FF6B6B' },
          { label: 'Balance', value: Math.abs(balance), color: balance >= 0 ? '#00B88D' : '#FF6B6B' }
        ];
        setChartData(balanceData);
        setTotalAmount(balance);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setLoading(false);
    }
  };

  const PeriodButton = ({ label, value }: { label: string; value: 'week' | 'month' | 'year' }) => (
    <TouchableOpacity
      style={[styles.periodButton, period === value && styles.activePeriodButton]}
      onPress={() => setPeriod(value)}
    >
      <Text style={[styles.periodButtonText, period === value && styles.activePeriodButtonText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const PieChart = ({ data }: { data: ChartData[] }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const centerX = 150;
    const centerY = 150;
    const radius = 120;
    
    let currentAngle = 0;
    
    const slices = data.map((item, index) => {
      const percentage = (item.value / total) * 100;
      const angle = (item.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      
      // Calculate path for pie slice
      const startAngleRad = (startAngle * Math.PI) / 180;
      const endAngleRad = (endAngle * Math.PI) / 180;
      
      const x1 = centerX + radius * Math.cos(startAngleRad);
      const y1 = centerY + radius * Math.sin(startAngleRad);
      const x2 = centerX + radius * Math.cos(endAngleRad);
      const y2 = centerY + radius * Math.sin(endAngleRad);
      
      const largeArcFlag = angle > 180 ? 1 : 0;
      
      const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
      
      currentAngle += angle;
      
      return (
        <View key={index} style={styles.pieSlice}>
          {/* This is a simplified representation - in a real app you'd use react-native-svg */}
          <View 
            style={[
              styles.pieSliceView,
              { 
                backgroundColor: item.color,
                transform: [{ rotate: `${startAngle}deg` }]
              }
            ]} 
          />
        </View>
      );
    });
    
    return (
      <View style={styles.pieChartContainer}>
        <View style={styles.pieChart}>
          {slices}
          <View style={styles.pieCenter}>
            <Text style={styles.pieCenterText}>{formatCurrencyShort(totalAmount, currency)}</Text>
            <Text style={styles.pieCenterCurrency}>{currency}</Text>
          </View>
        </View>
      </View>
    );
  };

  const BarChart = ({ data }: { data: ChartData[] }) => {
    const maxValue = Math.max(...data.map(item => item.value));
    
    return (
      <View style={styles.barChartContainer}>
        {data.map((item, index) => {
          const height = (item.value / maxValue) * 200;
          return (
            <View key={index} style={styles.barItem}>
              <View style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar,
                    { 
                      height: height,
                      backgroundColor: item.color 
                    }
                  ]} 
                />
              </View>
              <Text style={styles.barLabel}>{item.label}</Text>
              <Text style={styles.barValue}>
                {formatCurrencyShort(item.value, currency)} {currency}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const Legend = ({ data }: { data: ChartData[] }) => (
    <View style={styles.legendContainer}>
      {data.map((item, index) => (
        <View key={index} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: item.color }]} />
          <Text style={styles.legendLabel}>{item.label}</Text>
          <Text style={styles.legendValue}>
            {formatCurrencyShort(item.value, currency)} {currency}
          </Text>
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00B88D" />
        <Text style={styles.loadingText}>Loading chart data...</Text>
      </View>
    );
  }

  return (
    <LinearGradient 
      colors={['#00D09E', '#FFFFFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{statType}</Text>
            <Text style={styles.headerSubtitle}>Detailed Analysis</Text>
          </View>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <PeriodButton label="Week" value="week" />
          <PeriodButton label="Month" value="month" />
          <PeriodButton label="Year" value="year" />
        </View>

        {/* Total Amount Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>{statType}</Text>
          <Text style={styles.totalAmount}>
            {formatCurrencyShort(totalAmount, currency)} {currency}
          </Text>
          <Text style={styles.totalPeriod}>For the selected {period}</Text>
        </View>

        {/* Chart Section */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Visual Breakdown</Text>
          
          {statType === 'Total Expenses' ? (
            <PieChart data={chartData} />
          ) : (
            <BarChart data={chartData} />
          )}
          
          <Legend data={chartData} />
        </View>

        {/* Insights Section */}
        <View style={styles.insightsSection}>
          <Text style={styles.sectionTitle}>Insights</Text>
          {chartData.length > 0 && (
            <View style={styles.insightCard}>
              <Icon name="trending-up" size={24} color="#00B88D" />
              <Text style={styles.insightText}>
                {statType === 'Total Expenses' 
                  ? `Your biggest expense category is "${chartData[0].label}" accounting for ${((chartData[0].value / totalAmount) * 100).toFixed(1)}% of total expenses.`
                  : statType === 'Total Income'
                  ? `Your income is ${totalAmount > chartData[1].value ? 'higher' : 'lower'} than your expenses this ${period}.`
                  : `Your ${totalAmount >= 0 ? 'positive' : 'negative'} balance shows you're ${totalAmount >= 0 ? 'saving' : 'overspending'} this ${period}.`
                }
              </Text>
            </View>
          )}
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    fontFamily: 'Poppins-Regular',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activePeriodButton: {
    backgroundColor: '#00B88D',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins-SemiBold',
  },
  activePeriodButtonText: {
    color: '#FFFFFF',
  },
  totalCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Poppins-Regular',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Poppins-Bold',
    marginBottom: 4,
  },
  totalPeriod: {
    fontSize: 14,
    color: '#888',
    fontFamily: 'Poppins-Regular',
  },
  chartSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 16,
  },
  pieChartContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  pieChart: {
    width: 300,
    height: 300,
    borderRadius: 150,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieSlice: {
    position: 'absolute',
  },
  pieSliceView: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  pieCenter: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  pieCenterText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Poppins-SemiBold',
  },
  pieCenterCurrency: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Poppins-Regular',
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 250,
    marginVertical: 20,
  },
  barItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  barContainer: {
    height: 200,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    width: 40,
    borderRadius: 4,
    minHeight: 10,
  },
  barLabel: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginBottom: 4,
  },
  barValue: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
  legendContainer: {
    marginTop: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontFamily: 'Poppins-Regular',
  },
  legendValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Poppins-SemiBold',
  },
  insightsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 100,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#00B88D',
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontFamily: 'Poppins-Regular',
    lineHeight: 20,
    marginLeft: 12,
  },
});