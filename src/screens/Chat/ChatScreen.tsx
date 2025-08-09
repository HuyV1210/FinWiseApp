import { KeyboardAvoidingView, Platform, StyleSheet, Text, View, TouchableOpacity, Alert, FlatList, ActivityIndicator, TextInput, NativeSyntheticEvent, NativeScrollEvent, DeviceEventEmitter } from 'react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { auth } from '../../services/firebase';
import { getBotResponse, sendMessage, listenForMessages, ChatMessage, BotResponse } from './chat';
import Icon from 'react-native-vector-icons/Ionicons';
import TransactionPreviewModal from '../../components/TransactionPreviewModal';
import CategoryPickerModal from '../../components/CategoryPickerModal';
import { bankNotificationService } from '../../services/bankNotificationService';
import { smsBankNotificationService } from '../../services/smsBankNotificationService';
import { emailBankNotificationService } from '../../services/emailBankNotificationService';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isTransaction?: boolean;
  transactionData?: {
    amount: number;
    type: 'income' | 'expense';
    description: string;
    category: string;
    currency: string;
    bankName?: string;
    source: string;
  };
}

export default function ChatScreen () {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [expandedMessages, setExpandedMessages] = useState<{ [id: string]: boolean }>({});
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showTransactionPreview, setShowTransactionPreview] = useState(false);
  const [parsedTransactionData, setParsedTransactionData] = useState<any>(null);
  const [pendingTransactions, setPendingTransactions] = useState<{ [messageId: string]: any }>({});
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const categories = [
    'Food & Dining', 'Transport', 'Shopping', 'Bills & Utilities',
    'Entertainment', 'Health & Medical', 'ATM', 'Transfer', 
    'Salary', 'Investment', 'Other'
  ];
  
  // Get current date and time, formatted
  const now = useMemo(() => {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    };
    return date.toLocaleString(undefined, options);
  }, []);

  // Always clear chat messages from Firebase and UI on mount
  useEffect(() => {
    const clearChat = async (userId: string) => {
      try {
        const { collection, query, where, getDocs, deleteDoc } = await import('firebase/firestore');
        const { firestore } = await import('../../services/firebase');
        const q = query(collection(firestore, 'chats'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        const batchDeletes: Promise<void>[] = [];
        snapshot.forEach(docSnap => {
          batchDeletes.push(deleteDoc(docSnap.ref));
        });
        await Promise.all(batchDeletes);
      } catch (err) {
        // Optionally handle error
      }
      setMessages([]);
      setExpandedMessages({});
      setInputText('');
    };

    const user = auth.currentUser;
    if (!user) {
      setInitialLoading(false);
      return;
    }
    // Clear chat on mount
    clearChat(user.uid).then(() => {
      // Listen for real-time message updates (should be empty after clear)
      const unsubscribe = listenForMessages(user.uid, (chatMessages: ChatMessage[]) => {
        const formattedMessages: Message[] = chatMessages.map(msg => ({
          id: msg.id || '',
          text: msg.text,
          sender: msg.sender,
          timestamp: msg.createdAt,
        }));
        setMessages(formattedMessages);
        setInitialLoading(false);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      });
      unsubscribeRef.current = unsubscribe;
    });
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Handle scroll events
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isScrolledUp = contentOffset.y < contentSize.height - layoutMeasurement.height - 100;
    setShowScrollToBottom(isScrolledUp);
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // Scroll to bottom
  const handleScrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
    setShowScrollToBottom(false);
  };

  // Toggle message expansion
  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'Please log in to send messages');
      return;
    }
    
    const userMessage = inputText.trim();
    const tempMessageId = Date.now().toString();
    
    // Add user message immediately to UI
    const userMsg: Message = {
      id: tempMessageId,
      text: userMessage,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);
    
    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    try {
      // Send user message to Firebase
      await sendMessage(user.uid, userMessage, 'user');
      
      // Get bot response
      const botResponse: BotResponse = await getBotResponse(userMessage);
      
      // Check if there's a parsed transaction
      if (botResponse.parsedTransaction) {
        // Convert the chat ParsedTransactionData to match TransactionPreviewModal interface
        const modalData = {
          amount: botResponse.parsedTransaction.amount,
          type: botResponse.parsedTransaction.type,
          description: botResponse.parsedTransaction.description || botResponse.parsedTransaction.category || '',
          category: botResponse.parsedTransaction.category,
          currency: botResponse.parsedTransaction.currency,
        };
        
        setParsedTransactionData(modalData);
        setShowTransactionPreview(true);
      }
      
      // Send bot response to Firebase
      await sendMessage(user.uid, botResponse.message, 'bot');
      
    } catch (error) {
      //
      Alert.alert('Error', 'Failed to send message');
      
      // Remove the temporary message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item } : {item: Message}) => {
    const isUser = item.sender === 'user';
    const lines = item.text.split(/\n+/);
    const expanded = expandedMessages[item.id || ''] || false;
    const linesToShow = expanded ? lines : lines.slice(0, 8);
    const shouldShowExpand = lines.length > 8;
    const isPendingTransaction = item.isTransaction && pendingTransactions[item.id];

    return (
      <View style={[
        styles.messageBubbleContainer,
        isUser ? styles.userMessageContainer : styles.botMessageContainer,
      ]}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.userMessageBubble : styles.botMessageBubble,
          item.isTransaction && styles.transactionBubble,
        ]}>
          {linesToShow.map((line, idx) => (
            <Text
              key={idx}
              style={[styles.messageText, isUser ? styles.userMessageText : styles.botMessageText]}
              numberOfLines={0}
            >
              {line}
            </Text>
          ))}
          {shouldShowExpand && (
            <TouchableOpacity 
              onPress={() => toggleMessageExpansion(item.id)}
              style={styles.expandButton}
            >
              <Text style={[styles.expandText, isUser ? styles.userExpandText : styles.botExpandText]}>
                {expanded ? 'Show less' : 'Show more'}
              </Text>
            </TouchableOpacity>
          )}
          
          {/* Transaction Action Buttons */}
          {isPendingTransaction && (
            <View style={styles.transactionActions}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.saveButton]}
                onPress={() => handleTransactionAction(item.id, 'save')}
              >
                <Text style={styles.actionButtonText}>💾 Save</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.categoryButton]}
                onPress={() => handleTransactionAction(item.id, 'category')}
              >
                <Text style={styles.actionButtonText}>🏷️ Category</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.skipButton]}
                onPress={() => handleTransactionAction(item.id, 'skip')}
              >
                <Text style={[styles.actionButtonText, { color: '#666' }]}>⏭️ Skip</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {isUser && (
          <Text style={styles.timestamp}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>
    );
  };

  // Handler for new chat button
  const handleNewChat = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'Please log in to start a new chat');
      return;
    }
    Alert.alert(
      'New Chat',
      'Are you sure you want to start a new chat? This will clear the current conversation.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start New Chat',
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
            setExpandedMessages({});
            setInputText('');
          }
        }
      ]
    );
  };

  // Initialize bank services on mount
  useEffect(() => {
    const initializeBankServices = async () => {
      console.log('🚀 Initializing bank notification services...');
      
      // Initialize app notification service
      const appNotificationResult = await bankNotificationService.initialize();
      console.log('📱 App notifications:', appNotificationResult ? 'enabled' : 'disabled');
      
      // Initialize SMS service
      const smsResult = await smsBankNotificationService.initialize();
      
      const emailConfigStatus = emailBankNotificationService.getEmailConfigStatus();
      
      if (emailConfigStatus.configured) {
        await emailBankNotificationService.startEmailMonitoring();
      } else {
        console.log('📧 Email service: initialized (configuration needed for automatic detection)');
      }
    };
    
    initializeBankServices();
    
    // Cleanup function to stop email monitoring when component unmounts
    return () => {
      emailBankNotificationService.stopEmailMonitoring();
    };
  }, []);

  // Listen for transaction chat messages
  useEffect(() => {
    console.log('📡 Setting up TransactionChatMessage listener in ChatScreen');
    
    const listener = DeviceEventEmitter.addListener('TransactionChatMessage', (transactionMessage) => {
      console.log('🎯 ChatScreen received TransactionChatMessage event:', transactionMessage);
      
      // Add transaction message to chat
      setMessages(prev => [...prev, transactionMessage]);
      
      // Store pending transaction data
      setPendingTransactions(prev => ({
        ...prev,
        [transactionMessage.id]: transactionMessage.transactionData
      }));
      
      // Scroll to bottom to show new message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      console.log('✅ Transaction message added to chat');
    });

    return () => {
      console.log('🔌 Removing TransactionChatMessage listener');
      listener.remove();
    };
  }, []);

  // Handle transaction actions
  const handleTransactionAction = async (messageId: string, action: 'save' | 'category' | 'skip') => {
    const transactionData = pendingTransactions[messageId];
    if (!transactionData) return;

    switch (action) {
      case 'save':
        try {
          await saveTransaction(transactionData);
          addBotResponse(`✅ Transaction saved successfully!\n\n💰 ${transactionData.amount.toLocaleString()} ${transactionData.currency} added to your ${transactionData.category} ${transactionData.type === 'income' ? 'income' : 'expenses'}.`);
          // Remove from pending transactions after successful saving
          setPendingTransactions(prev => {
            const newPending = { ...prev };
            delete newPending[messageId];
            return newPending;
          });
        } catch (error) {
          // Error message already handled in saveTransaction function
          console.error('Failed to save transaction:', error);
        }
        break;
      case 'category':
        setSelectedTransactionId(messageId);
        setShowCategoryPicker(true);
        // Don't remove from pending transactions - keep buttons visible
        break;
      case 'skip':
        addBotResponse(`⏭️ Transaction skipped. No worries, you can always add it manually later.`);
        setPendingTransactions(prev => {
          const newPending = { ...prev };
          delete newPending[messageId];
          return newPending;
        });
        break;
    }
  };

  const handleCategoryChange = async (newCategory: string) => {
    if (!selectedTransactionId) return;

    const transactionData = pendingTransactions[selectedTransactionId];
    if (transactionData) {
      try {
        transactionData.category = newCategory;
        await saveTransaction(transactionData);
        addBotResponse(`✅ Transaction saved with category "${newCategory}"!\n\n💰 ${transactionData.amount.toLocaleString()} ${transactionData.currency} added to your ${newCategory} ${transactionData.type === 'income' ? 'income' : 'expenses'}.`);
        
        // Remove from pending transactions after successful saving with new category
        setPendingTransactions(prev => {
          const newPending = { ...prev };
          delete newPending[selectedTransactionId];
          return newPending;
        });
      } catch (error) {
        // Error message already handled in saveTransaction function
        console.error('Failed to save transaction with category:', error);
      }
    }

    setShowCategoryPicker(false);
    setSelectedTransactionId(null);
  };

  const saveTransaction = async (transactionData: any) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Import Firebase functions dynamically
      const { collection, addDoc, Timestamp } = await import('firebase/firestore');
      const { firestore } = await import('../../services/firebase');
      const { sendTransactionAddedNotification } = await import('../../services/notificationService');

      // Format transaction data for Firebase
      const transactionToSave = {
        id: `tx_${Date.now()}`, // Generate unique ID
        type: transactionData.type,
        title: transactionData.description || `${transactionData.bankName || 'Bank'} Transaction`,
        category: transactionData.category,
        date: Timestamp.now(),
        price: transactionData.amount,
        currency: transactionData.currency || 'VND',
        userId: user.uid,
        source: transactionData.source || 'SMS',
        bankName: transactionData.bankName,
        createdAt: Timestamp.now(),
      };

      console.log('💾 Saving transaction to Firestore:', transactionToSave);
      
      // Save to Firebase Firestore
      const docRef = await addDoc(collection(firestore, 'transactions'), transactionToSave);
      
      console.log('✅ Transaction saved with ID:', docRef.id);

      // Send transaction confirmation notification
      try {
        await sendTransactionAddedNotification(
          user.uid,
          transactionData.type,
          transactionData.amount,
          transactionData.category
        );
        console.log('📱 Transaction notification sent');
      } catch (notificationError) {
        console.error('Failed to send transaction notification:', notificationError);
        // Don't fail the transaction save if notification fails
      }
      
    } catch (error) {
      console.error('❌ Error saving transaction:', error);
      addBotResponse(`❌ Failed to save transaction: ${error.message || 'Unknown error'}. Please try again.`);
      throw error; // Re-throw so caller knows it failed
    }
  };

  const addBotResponse = (text: string) => {
    const botMessage: Message = {
      id: `bot_${Date.now()}`,
      text,
      sender: 'bot',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, botMessage]);
    
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
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
        <View>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              {/* Bot Avatar */}
              <View style={styles.avatarContainer}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>🤖</Text>
                </View>
              </View>
              {/* Name and Status */}
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>FinWise Bot</Text>
                <Text style={styles.headerStatus}>Active now</Text>
              </View>
              {/* New Chat Icon */}
              <TouchableOpacity style={styles.newChatButton} onPress={handleNewChat}>
                <Ionicons name="chatbubble-ellipses-outline" size={28} color="#fff" />
              </TouchableOpacity>
              {/* Debug Bank Notification Button */}
              <TouchableOpacity 
                style={styles.debugButton} 
                onPress={() => {
                  Alert.alert(
                    '🧪 SMS & Debug Tools',
                    'Choose a test option:',
                    [
                      {
                        text: '🔍 Force Check Recent SMS',
                        onPress: () => smsBankNotificationService.testForceCheckRecentSMS()
                      },
                      {
                        text: '🧹 Clear Processed SMS',
                        onPress: () => smsBankNotificationService.clearProcessedSMSIds()
                      },
                      {
                        text: '📊 Show Processed SMS',
                        onPress: () => smsBankNotificationService.showProcessedSMSIds()
                      },
                      {
                        text: '🏦 Test ACB Format',
                        onPress: () => smsBankNotificationService.testUserACBMessage()
                      },
                      {
                        text: '� SMS Tests',
                        onPress: () => {
                          Alert.alert(
                            '📱 SMS Tests',
                            'Choose SMS test:',
                            [
                              {
                                text: '🏦 ACB Transfer',
                                onPress: () => smsBankNotificationService.testACBTransferSMS()
                              },
                              {
                                text: '🇻🇳 Vietnamese Bank',
                                onPress: () => smsBankNotificationService.testVietnameseSMS()
                              },
                              {
                                text: '🌍 International Bank',
                                onPress: () => smsBankNotificationService.testInternationalSMS()
                              },
                              {
                                text: '� Salary SMS',
                                onPress: () => smsBankNotificationService.testSalarySMS()
                              },
                              {
                                text: 'Back',
                                style: 'cancel'
                              }
                            ]
                          );
                        }
                      },
                      {
                        text: '� Email Tests',
                        onPress: () => {
                          Alert.alert(
                            '📧 Email Tests',
                            'Choose email test:',
                            [
                              {
                                text: '☕ Test Coffee QR Payment',
                                onPress: () => {
                                  // Trigger a test coffee shop QR payment
                                  DeviceEventEmitter.emit('EmailNotification', {
                                    subject: 'VCB - Thông báo giao dịch QR Code',
                                    body: `
                                      Tài khoản của bạn vừa có giao dịch:
                                      Số tiền: -45,000 VND
                                      Nội dung: QR Payment - Highlands Coffee
                                      Loại GD: Thanh toán QR Code
                                      Thời gian: ${new Date().toLocaleString()}
                                      Số dư: 2,455,000 VND
                                    `,
                                    sender: 'noreply@vietcombank.com.vn',
                                    timestamp: Date.now()
                                  });
                                }
                              },
                              {
                                text: '🍜 Test MoMo Food Order',
                                onPress: () => {
                                  // Trigger a test MoMo food delivery payment
                                  DeviceEventEmitter.emit('EmailNotification', {
                                    subject: 'MoMo - Thanh toán QR thành công',
                                    body: `
                                      Bạn đã thanh toán QR thành công:
                                      Số tiền: -85,000 VND
                                      Merchant: GrabFood - Bun Bo Hue Ngon
                                      Loại: QR Code Payment
                                      Thời gian: ${new Date().toLocaleString()}
                                      Số dư ví: 320,000 VND
                                    `,
                                    sender: 'noreply@momo.vn',
                                    timestamp: Date.now()
                                  });
                                }
                              },
                              {
                                text: '� Test ZaloPay Shopping',
                                onPress: () => {
                                  // Trigger a test ZaloPay convenience store payment
                                  DeviceEventEmitter.emit('EmailNotification', {
                                    subject: 'ZaloPay - Giao dịch thành công',
                                    body: `
                                      Giao dịch QR Code thành công:
                                      Số tiền: -65,000 VND
                                      Merchant: Circle K - Convenient Store
                                      Nội dung: QR Payment for drinks and snacks
                                      Thời gian: ${new Date().toLocaleString()}
                                    `,
                                    sender: 'noreply@zalopay.vn',
                                    timestamp: Date.now()
                                  });
                                }
                              },
                              {
                                text: '🔧 Check Service Status',
                                onPress: () => {
                                  console.log('📧 Email Transaction Service Status Check');
                                  Alert.alert('Service Status', 'Email transaction service is running. Check console for detailed logs.');
                                }
                              },
                              {
                                text: 'Back',
                                style: 'cancel'
                              }
                            ]
                          );
                        }
                      },
                      {
                        text: '💳 App Notifications',
                        onPress: () => {
                          Alert.alert(
                            '💳 App Notifications',
                            'Choose notification test:',
                            [
                              {
                                text: '� Grab Ride (-150k VND)',
                                onPress: () => bankNotificationService.testVietcombankNotification()
                              },
                              {
                                text: '☕ Coffee (-85k VND)',
                                onPress: () => bankNotificationService.testTechcombankNotification()
                              },
                              {
                                text: '� Salary (+5M VND)',
                                onPress: () => bankNotificationService.testIncomeNotification()
                              },
                              {
                                text: 'Back',
                                style: 'cancel'
                              }
                            ]
                          );
                        }
                      },
                      {
                        text: '🔧 Debug Tools',
                        onPress: () => {
                          Alert.alert(
                            '🔧 Debug Tools',
                            'Choose debug option:',
                            [
                              {
                                text: '🔍 SMS Module Status',
                                onPress: () => smsBankNotificationService.testSMSModuleStatus()
                              },
                              {
                                text: '🔥 Manual Event Test',
                                onPress: () => smsBankNotificationService.testManualTransactionEvent()
                              },
                              {
                                text: 'Back',
                                style: 'cancel'
                              }
                            ]
                          );
                        }
                      },
                      {
                        text: 'Cancel',
                        style: 'cancel'
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="mail-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        {/* Date/Time below header */}
        <View style={styles.dateTimeContainer}>
          <Text style={styles.dateTimeText}>{now}</Text>
        </View>
        {/* Message Container */}
        <View style={styles.messagesContainer}>
          {initialLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#00B88D" />
              <Text style={{ color: '#00B88D', marginTop: 12 }}>Loading chat...</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews={false}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Text style={styles.placeholderText}>
                    👋 Hi! I'm FinWise Bot. Ask me anything about personal finance, budgeting, saving, or investing!
                  </Text>
                </View>
              )}
            />
          )}
          {showScrollToBottom && (
            <TouchableOpacity
              style={styles.scrollToBottomButton}
              onPress={handleScrollToBottom}
            >
              <Icon name="arrow-downward" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Input Container */}
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
              editable={!isLoading}
            />
            <TouchableOpacity 
              style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      
      <TransactionPreviewModal
        visible={showTransactionPreview}
        parsedData={parsedTransactionData}
        onClose={() => {
          setShowTransactionPreview(false);
          setParsedTransactionData(null);
        }}
        onSaved={() => {
          setShowTransactionPreview(false);
          setParsedTransactionData(null);
          // Show success message
          Alert.alert('Success', 'Transaction has been saved successfully!');
        }}
      />
      
      <CategoryPickerModal
        visible={showCategoryPicker}
        onSelect={handleCategoryChange}
        onClose={() => {
          setShowCategoryPicker(false);
          setSelectedTransactionId(null);
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    backgroundColor: 'transparent',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  placeholderText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Poppins-Medium',
    lineHeight: 24,
  },
  dateTimeContainer: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  dateTimeText: {
    fontSize: 13,
    color: '#00B88D',
    fontFamily: 'Poppins-Medium',
    letterSpacing: 0.2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
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
    color: '#fff',
    fontFamily: 'Poppins-Bold',
  },
  headerStatus: {
    fontSize: 14,
    color: '#00ff6aff',
    fontFamily: 'Poppins-Medium',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  newChatButton: {
    marginLeft: 12,
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,184,141,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  debugButton: {
    marginLeft: 8,
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,165,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  testButton: {
    marginLeft: 8,
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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
  expandButton: {
    marginTop: 8,
    paddingVertical: 4,
  },
  expandText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
  },
  userExpandText: {
    color: 'rgba(255,255,255,0.8)',
  },
  botExpandText: {
    color: '#00B88D',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Poppins-Regular',
    marginTop: 4,
    textAlign: 'right',
  },
  scrollToBottomButton: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    backgroundColor: '#00B88D',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00B88D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  messagesList: {
    paddingVertical: 16,
    paddingBottom: 16,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingBottom: 100, // Adjusted to ensure visibility without margin
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
  transactionBubble: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E4E7',
    borderRadius: 12,
    padding: 16,
    margin: 8,
  },
  transactionActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E4E7',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#00B88D',
    borderColor: '#00B88D',
  },
  categoryButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderColor: '#666',
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#FFF',
  },
})