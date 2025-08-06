import { Timestamp } from 'firebase/firestore';

export type Budget = {
  id: string;
  userId: string;
  monthlyIncome: number;
  period: 'weekly' | 'monthly' | 'yearly';
  categoryLimits: {
    [category: string]: number;
  };
  totalBudget: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type BudgetStatus = {
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  percentageUsed: number;
  isOverBudget: boolean;
};

export type SavingsGoal = {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Timestamp;
  category: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isCompleted: boolean;
};
