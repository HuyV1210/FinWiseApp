import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { DeviceEventEmitter } from 'react-native';
import CategoryPickerModal from '../../components/CategoryPickerModal';
import { firestore, auth } from '../../services/firebase';
import { doc, setDoc, serverTimestamp, collection, addDoc, updateDoc } from 'firebase/firestore';
import { GEMINI_API_KEY } from '@env';
import { listenForMessages, ChatMessage } from './chat';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getBotResponse, sendMessage } from './chat';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isTransaction?: boolean;
  transactionData?: any;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [enhancedTexts, setEnhancedTexts] = useState<{[key: string]: string}>({});
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    // Listen for chat messages (user/bot)
    const user = auth.currentUser;
    if (user) {
      const unsubscribe = listenForMessages(user.uid, (chatMessages: ChatMessage[]) => {
        setMessages(chatMessages.map(msg => ({
          id: msg.id || '',
          text: msg.text,
          sender: msg.sender,
          timestamp: msg.createdAt,
          isTransaction: msg.isTransaction, 
          transactionData: msg.transactionData, 
        })));
      });
      return () => unsubscribe();
    }
  }, []);

  useEffect(() => {
    const handleTransactionMessage = (transactionMessage: any) => {
      // Remove auto category assignment if present
      const cleanTransaction = {
        ...transactionMessage,
        transactionData: {
          ...transactionMessage.transactionData,
          category: undefined,
        },
      };
      setMessages(prev => {
        const newTransactions = [cleanTransaction, ...prev];
        // Generate AI-enhanced text for the new transaction
        generateEnhancedText(cleanTransaction);
        return newTransactions;
      });
    };

    // Listen for the TransactionChatMessage events from the bank notification service
    const transactionSubscription = DeviceEventEmitter.addListener('TransactionChatMessage', handleTransactionMessage);

    return () => {
      transactionSubscription.remove();
    };
  }, []);

  async function generateEnhancedText(item: any) {
    if (!GEMINI_API_KEY || !item.id) return;
    
    try {
      const prompt = `Transform this bank transaction notification into a friendly, conversational message. Keep it concise but engaging.

Original: "${item.text}"
Transaction details: ${item.transactionData.type} of ${item.transactionData.amount} ${item.transactionData.currency}
Description: ${item.transactionData.description}

Make it sound natural and add appropriate emojis. Focus on the key information but make it feel like a friendly notification.
Response should be 1-2 sentences maximum.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { 
              temperature: 0.7, 
              maxOutputTokens: 100,
              topK: 20,
              topP: 0.9
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const enhancedText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        
        if (enhancedText) {
          setEnhancedTexts(prev => ({
            ...prev,
            [item.id]: enhancedText
          }));
        }
      }
    } catch (error) {
      console.error('Error generating enhanced text:', error);
    }
  }

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'Please log in to send messages');
      return;
    }

    const userMessage = inputText.trim();

    // Add user message to UI immediately
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        text: userMessage,
        sender: 'user',
        timestamp: new Date(),
      }
    ]);

    setInputText('');

    try {
      // Send user message to Firestore
      await sendMessage(user.uid, userMessage, 'user', undefined);

      // Get bot response (call your bot API)
      const botResponse = await getBotResponse(userMessage);

      // If botResponse contains a parsedTransaction, add as a transaction message
      if (botResponse.parsedTransaction) {
        const cleanedTransactionData = { ...botResponse.parsedTransaction };
        Object.keys(cleanedTransactionData).forEach(
          key => cleanedTransactionData[key] === undefined && delete cleanedTransactionData[key]
        );

        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: botResponse.message,
            sender: 'bot',
            timestamp: new Date(),
            isTransaction: true,
            transactionData: cleanedTransactionData,
          }
        ]);
        // Optionally: Send bot reply to Firestore as a transaction message
        await sendMessage(user.uid, botResponse.message, 'bot', cleanedTransactionData);
      } else {
        // Add bot reply as a normal message
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: botResponse.message,
            sender: 'bot',
            timestamp: new Date(),
          }
        ]);
        await sendMessage(user.uid, botResponse.message, 'bot');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const handleCategoryPress = (index: number) => {
    setSelectedIndex(index);
    setPickerVisible(true);
  };

  const handleCategorySelect = async (category: string) => {
    if (selectedIndex === null) return;
    
    const selectedTransaction = messages[selectedIndex];
    
    try {
      // Only try to update chat document if it's not a bank notification transaction
      if (selectedTransaction?.id && !selectedTransaction.id.startsWith('tx_')) {
        try {
          const chatRef = doc(firestore, 'chats', selectedTransaction.id);
          await updateDoc(chatRef, {
            'transactionData.category': category,
          });
          console.log('✅ Updated category in chats collection');
        } catch (chatError) {
          console.log('ℹ️ Chat document not found (expected for bank notifications):', chatError);
        }
      }

      // Update local state immediately for better UX
      setMessages(prev =>
        prev.map((item, i) =>
          i === selectedIndex
            ? {
                ...item,
                transactionData: {
                  ...item.transactionData,
                  category,
                },
              }
            : item
        )
      );

      // Save to Firestore database
      const userId = auth.currentUser?.uid;
      if (userId && selectedTransaction?.id) {
        console.log('💾 Saving transaction to database:', {
          userId,
          transactionId: selectedTransaction.id,
          category,
          transactionData: selectedTransaction.transactionData
        });
        
        // Save to the main transactions collection (same structure as AddScreen)
        const transactionRef = doc(firestore, 'transactions', selectedTransaction.id);
        await setDoc(transactionRef, {
          type: selectedTransaction.transactionData.type === 'debit' ? 'expense' : 'income',
          price: selectedTransaction.transactionData.amount,
          category: category,
          date: new Date(selectedTransaction.timestamp),
          title: selectedTransaction.transactionData.description || 'Bank Transaction',
          note: selectedTransaction.transactionData.description || '',
          userId: userId,
          createdAt: serverTimestamp(),
          currency: selectedTransaction.transactionData.currency || 'VND',
          source: 'Bank Notification',
        }, { merge: true });
        
        console.log('✅ Transaction saved to main collection:', { 
          transactionId: selectedTransaction.id, 
          category,
          collection: 'transactions'
        });
      } else {
        console.warn('⚠️ Missing data for database save:', {
          hasUser: !!userId,
          hasTransactionId: !!selectedTransaction?.id,
          authState: auth.currentUser ? 'authenticated' : 'not authenticated',
          selectedTransaction
        });
        
        // If user is not authenticated, still update UI but show warning
        if (!userId) {
          Alert.alert(
            'Authentication Required', 
            'Please sign in to save category changes to the database. The change will only be saved locally.'
          );
        }
      }

      setPickerVisible(false);
      setSelectedIndex(null);
    } catch (error) {
      console.error('❌ Error updating category in database:', error);
      
      // Revert local state on error
      setMessages(prev =>
        prev.map((item, i) =>
          i === selectedIndex
            ? {
                ...item,
                transactionData: {
                  ...item.transactionData,
                  category: item.transactionData.category, // Keep original category
                },
              }
            : item
        )
      );
      
      // Show error to user
      Alert.alert('Error', 'Failed to save category. Please try again.');
    }
  };

  const handleNewChat = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'Please log in to start a new chat');
      return;
    }
    Alert.alert(
      'Start New Chat',
      'Are you sure you want to clear the chat history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // Dynamically import Firestore functions to avoid circular deps
              const { collection, query, where, getDocs, deleteDoc } = await import('firebase/firestore');
              const { firestore } = await import('../../services/firebase');
              // Query all chat docs for this user
              const q = query(collection(firestore, 'chats'), where('userId', '==', user.uid));
              const snapshot = await getDocs(q);
              const batchDeletes: Promise<void>[] = [];
              snapshot.forEach(docSnap => {
                batchDeletes.push(deleteDoc(docSnap.ref));
              });
              await Promise.all(batchDeletes);
            } catch (err) {
              Alert.alert('Error', 'Failed to clear chat history.');
            }
            setMessages([]);
          },
        },
      ]
    );
  };

  return (
    <LinearGradient
      colors={['#00D09E', '#FFFFFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <View style={styles.headerContent}>
              {/* Bot Avatar */}
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>🤖</Text>
              </View>
              {/* Name and Status */}
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>FinWise Bot</Text>
                <Text style={styles.headerStatus}>Active now</Text>
              </View>
              {/* (Optional) Add action buttons here */}
              <TouchableOpacity style={styles.newChatButton} onPress={handleNewChat}>
                <Ionicons name="chatbubble-ellipses-outline" size={28} color="#00B88D" />
              </TouchableOpacity>
            </View>
          </View>
          
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                👋 Hi! I'm FinWise Bot. Ask me anything about personal finance, budgeting, saving, or investing!
              </Text>
            </View>
          )}
          
          <FlatList
            data={messages}
            keyExtractor={(item, i) => item.id || i.toString()}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => {
              const isUser = item.sender === 'user';
              const isTransaction = item.isTransaction && item.transactionData;
              const enhancedText = isTransaction ? enhancedTexts[item.id] : undefined;
              const displayText = isTransaction && enhancedText ? enhancedText : item.text;

              return (
                <View
                  style={[
                    styles.messageBubbleContainer,
                    isUser ? styles.userMessageContainer : styles.botMessageContainer,
                  ]}
                >
                  {/* Bot avatar on the left for bot messages */}
                  {!isUser && (
                    <View style={{ marginRight: 8, alignSelf: 'flex-end' }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: '#E6F0FF',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginBottom: 2,
                        }}
                      >
                        <Text style={{ fontSize: 22 }}>🤖</Text>
                      </View>
                    </View>
                  )}
                  <View
                    style={[
                      styles.messageBubble,
                      isUser ? styles.userMessageBubble : styles.botMessageBubble,
                      isTransaction && styles.transactionBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        isUser ? styles.userMessageText : styles.botMessageText,
                      ]}
                    >
                      {displayText}
                    </Text>
                    {isTransaction && (
                      <View style={styles.details}>
                        <Text style={styles.amount}>
                          {item.transactionData.type.toUpperCase()}: {item.transactionData.amount.toLocaleString()} {item.transactionData.currency}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleCategoryPress(index)}
                          disabled={!!item.transactionData.category}
                          style={item.transactionData.category ? { opacity: 0.5 } : {}}
                        >
                          <Text style={styles.category}>
                            Category:{' '}
                            <Text
                              style={{
                                textDecorationLine: 'underline',
                                color: '#1976d2',
                              }}
                            >
                              {item.transactionData.category
                                ? item.transactionData.category
                                : 'Choose category'}
                            </Text>
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  <Text style={styles.date}>
                    {new Date(item.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              );
            }}
          />
          <CategoryPickerModal
            visible={pickerVisible}
            onClose={() => setPickerVisible(false)}
            onSelect={handleCategorySelect}
          />
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask me about finances..."
                placeholderTextColor="#999"
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !inputText.trim() && styles.sendButtonDisabled
                ]}
                onPress={handleSendMessage}
                disabled={!inputText.trim()}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Poppins-Medium',
    lineHeight: 24,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center'
  },
  transaction: { 
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#ddd',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8
  },
  transactionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8
  },
  details: {
    marginLeft: 10,
    marginBottom: 8
  },
  amount: {
    fontSize: 14,
    color: '#1976d2',
    marginBottom: 4
  },
  category: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  source: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic'
  },
  date: { 
    fontSize: 12, 
    color: '#666',
    textAlign: 'right'
  },
  messageBubbleContainer: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  botMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  userMessageBubble: {
    backgroundColor: '#00D09E',
    borderRadius: 16,
    alignSelf: 'flex-end',
  },
  botMessageBubble: {
    backgroundColor: '#F0F0F0',
    alignSelf: 'flex-start',
  },
  transactionBubble: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E4E7',
    borderRadius: 12,
    padding: 16,
    margin: 8,
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#222',
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.08)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  botMessageText: {
    color: '#1A237E',
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    backgroundColor: 'transparent',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    justifyContent: 'flex-start',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E6F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00B88D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    fontSize: 28,
  },
  headerTextContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    fontFamily: 'Poppins-Bold',
  },
  headerStatus: {
    fontSize: 14,
    color: '#00B88D',
    fontFamily: 'Poppins-Medium',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  newChatButton: {
    marginLeft: 12,
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingBottom: 90,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    backgroundColor: '#fff',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#333',
    maxHeight: 100,
    paddingVertical: 8,
    paddingRight: 12,
  },
  sendButton: {
    backgroundColor: '#00B88D',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
});
