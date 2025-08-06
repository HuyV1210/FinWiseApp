// utils/transactionUtils.ts

import { Transaction } from '../types/transaction';
import { Timestamp } from 'firebase/firestore';

// Filter transactions by selected period
export const filterTransactionsByPeriod = (
  transactions: Transaction[],
  selectedPeriod: 'day' | 'week' | 'month'
): Transaction[] => {
  const now = new Date();

  return transactions.filter((transaction) => {
    const transactionDate = transaction.date.toDate();

    switch (selectedPeriod) {
      case 'day':
        return (
          transactionDate.getDate() === now.getDate() &&
          transactionDate.getMonth() === now.getMonth() &&
          transactionDate.getFullYear() === now.getFullYear()
        );
      case 'week': {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return transactionDate >= oneWeekAgo;
      }
      case 'month':
        return (
          transactionDate.getMonth() === now.getMonth() &&
          transactionDate.getFullYear() === now.getFullYear()
        );
      default:
        return true;
    }
  });
};

// Paginate a list of transactions
export const paginateTransactions = (
  filteredTransactions: Transaction[],
  currentPage: number,
  pageSize: number
): Transaction[] => {
  const startIndex = 0;
  const endIndex = currentPage * pageSize;
  return filteredTransactions.slice(startIndex, endIndex);
};
