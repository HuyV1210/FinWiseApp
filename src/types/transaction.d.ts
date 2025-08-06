import { Timestamp } from 'firebase/firestore';

export type Transaction = {
  id: string;
  type: 'income' | 'expense';
  title: string;
  category: string;
  date: Timestamp;
  price: string | number;
  currency?: string;
};