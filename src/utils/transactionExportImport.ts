import RNFS from 'react-native-fs';
import DocumentPicker from 'react-native-document-picker';
import { firestore } from '../services/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';

export async function exportTransactionsToCSV(userId: string): Promise<string> {
  const q = query(collection(firestore, 'transactions'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const rows = snapshot.docs.map(doc => doc.data());

  const header = 'Date,Type,Amount,Category,Description\n';
  const csv = rows.map(row =>
    `${row.date},${row.type},${row.price},${row.category},${row.title || row.note || ''}`
  ).join('\n');
  const csvContent = header + csv;

  const path = `${RNFS.DocumentDirectoryPath}/transactions.csv`;
  await RNFS.writeFile(path, csvContent, 'utf8');
  return path;
}

export async function importTransactionsFromCSV(userId: string) {
  const res = await DocumentPicker.pickSingle({ type: [DocumentPicker.types.plainText] });
  const csvContent = await RNFS.readFile(res.uri, 'utf8');
  const lines = csvContent.split('\n').slice(1); // Skip header
  for (const line of lines) {
    if (!line.trim()) continue;
    const [date, type, price, category, description] = line.split(',');
    await addDoc(collection(firestore, 'transactions'), {
      userId,
      date,
      type,
      price: Number(price),
      category,
      title: description,
      createdAt: new Date(),
      source: 'Import',
    });
  }
}