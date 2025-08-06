// Chat service for FinWise app
// This file provides functions to send and receive chat messages, and can be extended for AI/chatbot integration.

import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { firestore, auth } from '../../services/firebase';
import { sendNotification } from '../../services/notificationService';
import { GEMINI_API_KEY } from '@env';


// Simple test function to check basic Firebase access
export async function testBasicFirebaseAccess(): Promise<boolean> {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log('No user authenticated for Firebase test');
      return false;
    }
    
    console.log('Testing Firebase access for user:', user.uid);
    console.log('User email:', user.email);
    console.log('User emailVerified:', user.emailVerified);
    
    // Try to read a simple document
    const testDoc = await getDoc(doc(firestore, 'users', user.uid));
    console.log('User document exists:', testDoc.exists());
    
    // Try to read from transactions collection
    console.log('Testing transactions collection access...');
    const transactionsQuery = query(
      collection(firestore, 'transactions'),
      where('userId', '==', user.uid)
    );
    const transactionsSnapshot = await getDocs(transactionsQuery);
    console.log('Transactions query successful, found:', transactionsSnapshot.size, 'documents');
    
    return true;
  } catch (error) {
    console.error('Firebase access test failed:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    return false;
  }
}

export type ChatMessage = {
  id?: string;
  text: string;
  createdAt: Date;
  userId: string;
  sender: 'user' | 'bot';
};

export type ParsedTransactionData = {
  amount: number;
  category: string;
  type: 'income' | 'expense';
  description?: string;
  currency?: string;
};

export type BotResponse = {
  message: string;
  parsedTransaction?: ParsedTransactionData;
};

// Firestore chat message data interface
interface FirestoreChatData {
  text: string;
  createdAt: any; // Firestore Timestamp
  userId: string;
  sender?: 'user' | 'bot';
}

// Transaction type for analysis
interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: Date;
  userId: string;
  currency?: string;
}

// Firestore transaction data interface
interface FirestoreTransactionData {
  title?: string;
  price: string | number;
  type: 'income' | 'expense';
  category?: string;
  date: any; // Firestore Timestamp
  userId: string;
  currency?: string;
}

// Function to get transactions for current user
export async function getUserTransactions(userId: string, periodDays?: number): Promise<Transaction[]> {
  try {
    console.log('Getting transactions for userId:', userId, 'periodDays:', periodDays); // Debug log
    
    let q;
    if (periodDays) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);
      console.log('Filtering transactions from date:', startDate); // Debug log
      
      q = query(
        collection(firestore, 'transactions'),
        where('userId', '==', userId),
        where('date', '>=', startDate),
        orderBy('date', 'desc')
      );
    } else {
      q = query(
        collection(firestore, 'transactions'),
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );
    }

    console.log('Executing Firestore query...'); // Debug log
    const snapshot = await getDocs(q);
    console.log('Query successful, found', snapshot.size, 'documents'); // Debug log
    const transactions: Transaction[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data() as FirestoreTransactionData;
      const price = typeof data.price === 'string'
        ? Number(data.price.replace(/,/g, ''))
        : Number(data.price) || 0;
      
      transactions.push({
        id: doc.id,
        title: data.title || 'Untitled',
        amount: price,
        type: data.type,
        category: data.category || 'Other',
        date: data.date.toDate(),
        userId: data.userId,
        currency: data.currency || 'VND', // Include currency info
      });
    });

    //
    console.log('Returning', transactions.length, 'transactions'); // Debug log
    return transactions;
  } catch (error) {
    console.error('Error in getUserTransactions:', error); // Debug log
    return [];
  }
}

// Function to convert currency amounts
function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return amount;
  
  // Simple conversion rates (in a real app, you'd fetch these from an API)
  const ratesFromVND: { [key: string]: number } = {
    USD: 0.000041,
    EUR: 0.000038,
    GBP: 0.000032,
    JPY: 0.0061,
    VND: 1,
    INR: 0.00049,
    CAD: 0.000056,
    AUD: 0.000062,
    CHF: 0.000037,
    SGD: 0.000050,
  };
  
  // Convert to VND first, then to target currency
  const amountInVND = amount / (ratesFromVND[fromCurrency] || 1);
  const convertedAmount = amountInVND * (ratesFromVND[toCurrency] || 1);
  
  return convertedAmount;
}

// Function to get user's currency
async function getUserCurrency(userId: string): Promise<string> {
  try {
    console.log('Getting user currency for userId:', userId); // Debug log
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (userDoc.exists()) {
      const currency = userDoc.data().currency || 'VND';
      console.log('User currency found:', currency); // Debug log
      return currency;
    }
    console.log('User document not found, defaulting to VND'); // Debug log
    return 'VND';
  } catch (error) {
    console.error('Error getting user currency:', error);
    return 'VND';
  }
}

// Function to format currency amount
function formatCurrency(amount: number, currency: string): string {
  const currencySymbols: { [key: string]: string } = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    VND: '₫',
    INR: '₹',
    CAD: 'C$',
    AUD: 'A$',
    CHF: 'CHF',
    SGD: 'S$',
  };
  
  const symbol = currencySymbols[currency] || currency;
  if (currency === 'VND') {
    return `${amount.toLocaleString()} ${symbol}`;
  }
  return `${symbol}${amount.toLocaleString()}`;
}

// Function to analyze spending for today
export async function getTodaysSpending(userId: string): Promise<{ totalSpending: number, transactions: Transaction[] }> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const userCurrency = await getUserCurrency(userId);

    const q = query(
      collection(firestore, 'transactions'),
      where('userId', '==', userId),
      where('type', '==', 'expense'),
      where('date', '>=', today),
      where('date', '<', tomorrow),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    const transactions: Transaction[] = [];
    let totalSpending = 0;

    snapshot.forEach((doc) => {
      const data = doc.data() as FirestoreTransactionData;
      const amount = typeof data.price === 'string'
        ? Number(data.price.replace(/,/g, ''))
        : Number(data.price) || 0;
      
      const transaction: Transaction = {
        id: doc.id,
        title: data.title || 'Untitled',
        amount,
        type: data.type,
        category: data.category || 'Other',
        date: data.date.toDate(),
        userId: data.userId,
        currency: data.currency || 'VND',
      };
      
      // Convert to user's preferred currency for total calculation
      const convertedAmount = convertCurrency(
        amount, 
        data.currency || 'VND', 
        userCurrency
      );
      
      transactions.push(transaction);
      totalSpending += convertedAmount;
    });

    return { totalSpending, transactions };
  } catch (error) {
    console.error('Error getting today\'s spending:', error);
    return { totalSpending: 0, transactions: [] };
  }
}

// Function to get spending analysis for different periods
export async function getSpendingAnalysis(userId: string, period: 'week' | 'month' | 'year'): Promise<{
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactions: Transaction[];
  categories: { [key: string]: number };
}> {
  try {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    const transactions = await getUserTransactions(userId, days);
    const userCurrency = await getUserCurrency(userId);
    
    let totalIncome = 0;
    let totalExpenses = 0;
    const categories: { [key: string]: number } = {};

    transactions.forEach(transaction => {
      // Convert transaction amount to user's preferred currency
      const convertedAmount = convertCurrency(
        transaction.amount, 
        transaction.currency || 'VND', 
        userCurrency
      );
      
      if (transaction.type === 'income') {
        totalIncome += convertedAmount;
      } else {
        totalExpenses += convertedAmount;
        categories[transaction.category] = (categories[transaction.category] || 0) + convertedAmount;
      }
    });

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      transactions,
      categories,
    };
  } catch (error) {
    console.error('Error getting spending analysis:', error);
    return {
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      transactions: [],
      categories: {},
    };
  }
}

// Send a chat message (from user or bot)
export async function sendMessage(userId: string, text: string, sender: 'user' | 'bot' = 'user') {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }
    
    const docRef = await addDoc(collection(firestore, 'chats'), {
      text,
      createdAt: Timestamp.now(),
      userId,
      sender,
    });
    
    //
  } catch (error) {
    //
    throw error;
  }
}

// Listen for chat messages (real-time updates)
export function listenForMessages(userId: string, onUpdate: (messages: ChatMessage[]) => void) {
  try {
    //
    
    // FIXED: Query with user filter to match security rules
    // Note: Using where + orderBy may require a composite index
    const q = query(
      collection(firestore, 'chats'),
      where('userId', '==', userId),
      orderBy('createdAt', 'asc')
    );
    
    //
    
    return onSnapshot(q, (snapshot) => {
      //
      const messages: ChatMessage[] = [];
      snapshot.forEach(doc => {
        const data = doc.data() as FirestoreChatData;
        //
        // No need to filter again since query already filters by userId
        messages.push({
          id: doc.id,
          text: data.text,
          createdAt: data.createdAt.toDate(),
          userId: data.userId,
          sender: data.sender || 'user',
        });
      });
      //
      onUpdate(messages);
    }, (error) => {
    //
      // Call onUpdate with empty array so loading stops
      onUpdate([]);
    });
  } catch (error) {
    //
    // Call onUpdate with empty array so loading stops
    onUpdate([]);
    throw error;
  }
}

// Simple fallback responses for when Gemini API is not available
function getFallbackResponse(userMessage: string): string {
  const message = userMessage.toLowerCase();
  
  if (message.includes('budget') || message.includes('spending')) {
    return "Here are some budgeting tips: 1) Track your expenses for a month, 2) Use the 50/30/20 rule (50% needs, 30% wants, 20% savings), 3) Set specific savings goals, 4) Review and adjust monthly.";
  }
  
  if (message.includes('save') || message.includes('saving')) {
    return "Great question about saving! Try these strategies: 1) Start with an emergency fund (3-6 months expenses), 2) Automate your savings, 3) Cut unnecessary subscriptions, 4) Consider high-yield savings accounts.";
  }
  
  if (message.includes('invest') || message.includes('investment')) {
    return "Investment basics: 1) Start early to benefit from compound interest, 2) Diversify your portfolio, 3) Consider index funds for beginners, 4) Only invest money you won't need for 5+ years. Always do your research!";
  }
  
  if (message.includes('debt') || message.includes('loan')) {
    return "For debt management: 1) List all debts with interest rates, 2) Pay minimums on all, extra on highest rate debt, 3) Consider debt consolidation if beneficial, 4) Avoid taking on new debt.";
  }
  
  return "Hi there! I'm here to help with anything related to your money—whether it's budgeting, saving, investing, or managing debt. What would you like to talk about today?";
}

// Gemini-powered AI/bot response with access to user's financial data
export async function getBotResponse(userMessage: string): Promise<BotResponse> {
  try {
    if (!GEMINI_API_KEY) return { message: getFallbackResponse(userMessage) };
    const user = auth.currentUser;
    if (!user) {
      console.log('No authenticated user found'); // Debug log
      return { message: getFallbackResponse(userMessage) };
    }
    
    console.log('User authenticated:', user.uid); // Debug log
    
    // Run Firebase connectivity test
    console.log('Running Firebase connectivity test...');
    await testBasicFirebaseAccess();

    // 1. AI-powered transaction parsing - let the AI understand the intent
    const transactionParsingPrompt = `Analyze this message to see if the user wants to add a financial transaction.

Message: "${userMessage}"

You MUST respond with ONLY a valid JSON object. Do not include any other text, explanations, or formatting.

If this is a request to add a transaction, respond with:
{"isTransaction": true, "type": "income", "amount": 100, "currency": "USD", "category": "Category Name", "description": "brief description"}

If this is NOT a transaction request, respond with:
{"isTransaction": false}

IMPORTANT: 
- Use double quotes around ALL property names and string values
- Ensure the JSON is valid and parseable
- Only use "income" or "expense" for type
- Amount should be a number without currency symbols
- ALWAYS detect and include the currency from the message (USD, EUR, VND, etc.)
- Look for currency symbols like $, €, £, ¥, ₫, etc. and convert them to currency codes

Currency Detection Rules:
- $ = USD (unless specified otherwise like A$, C$, S$)
- € = EUR
- £ = GBP
- ¥ = JPY
- ₫ = VND
- ₹ = INR
- A$ = AUD
- C$ = CAD
- S$ = SGD
- CHF = CHF
- If no currency symbol found, look for currency codes (USD, EUR, VND, etc.)
- If still no currency found, use "VND" as default

Examples:
- "my mom just gave me $10 for lunch" → {"isTransaction": true, "type": "income", "amount": 10, "currency": "USD", "category": "Gift from family", "description": "lunch money from mom"}
- "I spent 50000₫ on groceries" → {"isTransaction": true, "type": "expense", "amount": 50000, "currency": "VND", "category": "Groceries", "description": "groceries"}
- "add me €100 expense buying clothes" → {"isTransaction": true, "type": "expense", "amount": 100, "currency": "EUR", "category": "Shopping", "description": "buying clothes"}
- "received 1000 VND from friend" → {"isTransaction": true, "type": "income", "amount": 1000, "currency": "VND", "category": "Gift from friends", "description": "from friend"}
- "How much did I spend this month?" → {"isTransaction": false}

Respond with ONLY the JSON object:`;

    const parseResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: transactionParsingPrompt }] }],
          generationConfig: { 
            temperature: 0.1, 
            maxOutputTokens: 150,
            topK: 1,
            topP: 0.8
          }
        })
      }
    );

    if (parseResponse.ok) {
      const parseData = await parseResponse.json();
      const aiResponse = parseData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      
      console.log('AI Response for transaction parsing:', aiResponse); // Debug log
      
      if (aiResponse) {
        try {
          // Clean up the AI response to ensure valid JSON
          let cleanedResponse = aiResponse.trim();
          
          // Remove any potential markdown code blocks
          cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
          
          console.log('Cleaned AI Response:', cleanedResponse); // Debug log
          
          const parsedTransaction = JSON.parse(cleanedResponse);
          
          console.log('Parsed transaction:', parsedTransaction); // Debug log
          
          if (parsedTransaction.isTransaction && parsedTransaction.amount > 0) {
            const userCurrency = await getUserCurrency(user.uid);
            
            // Use the detected currency from AI or fall back to user's default currency
            const transactionCurrency = parsedTransaction.currency || userCurrency;
            
            console.log('User currency:', userCurrency); // Debug log
            console.log('Transaction currency:', transactionCurrency); // Debug log
            
            // Return transaction data for preview instead of saving directly
            const parsedTransactionData: ParsedTransactionData = {
              amount: parsedTransaction.amount,
              category: parsedTransaction.category || (parsedTransaction.type === 'income' ? 'General Income' : 'General Expense'),
              type: parsedTransaction.type,
              description: parsedTransaction.description || parsedTransaction.category,
              currency: transactionCurrency,
            };
            
            return {
              message: `I found a ${parsedTransaction.type} transaction. Please review the details below and confirm if you want to save it.`,
              parsedTransaction: parsedTransactionData,
            };
          }
        } catch (e) {
          console.error('JSON parsing failed:', e, 'AI Response:', aiResponse); // Debug log
          // JSON parsing failed, continue to regular chat
        }
      }
    } else {
      console.error('AI parse response not ok:', parseResponse.status, parseResponse.statusText); // Debug log
    }

    // 2. Personal finance queries (existing logic)
    const isPersonalFinanceQuery = /\b(my|total|spending|spent|income|balance|expense|transaction|today|week|month|year|category|budget)\b/i.test(userMessage);
    console.log('Is personal finance query:', isPersonalFinanceQuery, 'for message:', userMessage); // Debug log
    let financialContext = '';
    if (isPersonalFinanceQuery) {
      console.log('Processing personal finance query...'); // Debug log
      // Get user's currency for financial context
      const userCurrency = await getUserCurrency(user.uid);
      
      try {
        console.log('Fetching financial data for user:', user.uid); // Debug log
        if (/\b(today|today's)\b/i.test(userMessage)) {
          const todaysData = await getTodaysSpending(user.uid);
          financialContext = `\n\nUser's actual financial data for TODAY:\n- Total spending today: ${formatCurrency(todaysData.totalSpending, userCurrency)}\n- Number of transactions: ${todaysData.transactions.length}\n`;
          if (todaysData.transactions.length > 0) {
            financialContext += '- Today\'s expenses breakdown:\n';
            todaysData.transactions.forEach(t => {
              const originalCurrency = t.currency || 'VND';
              financialContext += `  • ${t.title}: ${formatCurrency(t.amount, originalCurrency)} (${t.category})\n`;
            });
          }
        } else if (/\b(week|weekly)\b/i.test(userMessage)) {
          const weekData = await getSpendingAnalysis(user.uid, 'week');
          financialContext = `\n\nUser's actual financial data for this WEEK:\n- Total income: ${formatCurrency(weekData.totalIncome, userCurrency)}\n- Total expenses: ${formatCurrency(weekData.totalExpenses, userCurrency)}\n- Balance: ${formatCurrency(weekData.balance, userCurrency)}\n- Number of transactions: ${weekData.transactions.length}\n`;
          const topCategories = Object.entries(weekData.categories)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);
          if (topCategories.length > 0) {
            financialContext += '- Top spending categories:\n';
            topCategories.forEach(([category, amount]) => {
              financialContext += `  • ${category}: ${formatCurrency(amount, userCurrency)}\n`;
            });
          }
        } else if (/\b(month|monthly)\b/i.test(userMessage)) {
          const monthData = await getSpendingAnalysis(user.uid, 'month');
          const userCurrency = await getUserCurrency(user.uid);
          financialContext = `\n\nUser's actual financial data for this MONTH:\n- Total income: ${formatCurrency(monthData.totalIncome, userCurrency)}\n- Total expenses: ${formatCurrency(monthData.totalExpenses, userCurrency)}\n- Balance: ${formatCurrency(monthData.balance, userCurrency)}\n- Number of transactions: ${monthData.transactions.length}\n`;
          const topCategories = Object.entries(monthData.categories)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
          if (topCategories.length > 0) {
            financialContext += '- Top spending categories:\n';
            topCategories.forEach(([category, amount]) => {
              financialContext += `  • ${category}: ${formatCurrency(amount, userCurrency)}\n`;
            });
          }
        } else {
          const recentData = await getSpendingAnalysis(user.uid, 'month');
          const userCurrency = await getUserCurrency(user.uid);
          financialContext = `\n\nUser's recent financial data (last 30 days):\n- Total income: ${formatCurrency(recentData.totalIncome, userCurrency)}\n- Total expenses: ${formatCurrency(recentData.totalExpenses, userCurrency)}\n- Balance: ${formatCurrency(recentData.balance, userCurrency)}\n- Number of transactions: ${recentData.transactions.length}\n`;
        }
      } catch (error) {
        console.error('Error fetching financial data:', error); // Debug log
        financialContext = '\n\nNote: Unable to fetch your current financial data. Please make sure you are logged in and have proper permissions.';
      }
    }

    // 3. Default: AI response
    const systemPrompt = `You are FinWise Bot, a helpful financial assistant for the FinWise app. You help users with personal finance questions, budgeting advice, and analyzing their spending patterns.

IMPORTANT: When users ask about "my spending", "my income", "my transactions", or similar personal finance questions, use the actual financial data provided below to give specific, accurate answers.

Key guidelines:
1. Always use the actual financial data when available to answer questions about the user's finances
2. Be specific with amounts and provide actionable insights
3. If asking about spending/income for specific periods, reference the exact amounts
4. Suggest practical tips based on their actual spending patterns
5. Be encouraging and supportive about their financial goals
6. Keep responses concise but informative (2-3 sentences max)
7. Use currency formatting for amounts (e.g., $123.45)
8. If no financial data is available for the requested period, explain that clearly

User's question: "${userMessage}"${financialContext}

Provide a helpful, specific response based on the user's actual financial data when available.`;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: systemPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        }),
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      return { message: getFallbackResponse(userMessage) };
    }
    const data = await response.json();
    const botResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!botResponse) {
      return { message: getFallbackResponse(userMessage) };
    }
    return { message: botResponse.trim() };
  } catch (error) {
    return { message: getFallbackResponse(userMessage) };
  }
}