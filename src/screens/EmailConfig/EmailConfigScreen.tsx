import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';
import { emailBankNotificationService } from '../../services/emailBankNotificationService';

type EmailConfigScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'EmailConfig'>;
};

interface EmailConfig {
  provider: 'gmail' | 'outlook' | 'imap';
  email?: string;
  accessToken?: string;
  refreshToken?: string;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  imapUser?: string;
  imapPassword?: string;
}

export default function EmailConfigScreen({ navigation }: EmailConfigScreenProps) {
  const [loading, setLoading] = useState(false);
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    provider: 'gmail',
  });
  const [isConfigured, setIsConfigured] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [automaticMonitoring, setAutomaticMonitoring] = useState(false);

  useEffect(() => {
    loadCurrentConfig();
  }, []);

  const loadCurrentConfig = () => {
    const status = emailBankNotificationService.getEmailConfigStatus();
    setIsConfigured(status.configured);
    if (status.configured) {
      setEmailConfig(prev => ({
        ...prev,
        provider: status.provider as any || 'gmail',
        email: status.email || '',
      }));
    }
    
    // Load automatic monitoring status
    setAutomaticMonitoring(emailBankNotificationService.isMonitoringActive());
  };

  const handleProviderChange = (provider: 'gmail' | 'outlook' | 'imap') => {
    setEmailConfig(prev => ({
      ...prev,
      provider,
    }));
  };

  const handleSaveConfig = async () => {
    try {
      setLoading(true);

      // Validate required fields
      if (!emailConfig.email) {
        Alert.alert('Error', 'Please enter your email address');
        return;
      }

      if (emailConfig.provider === 'imap') {
        if (!emailConfig.imapHost || !emailConfig.imapUser || !emailConfig.imapPassword) {
          Alert.alert('Error', 'Please fill in all IMAP configuration fields');
          return;
        }
      }

      // Save configuration
      await emailBankNotificationService.saveEmailConfig(emailConfig);
      
      setIsConfigured(true);
      Alert.alert(
        'Success', 
        'Email configuration saved successfully!\n\nNote: Full email monitoring requires additional setup. For now, you can manually test email parsing.',
        [
          {
            text: 'Test Email Parsing',
            onPress: () => testEmailParsing(),
          },
          {
            text: 'OK',
            style: 'default',
          },
        ]
      );
    } catch (error) {
      console.error('Error saving email config:', error);
      Alert.alert('Error', 'Failed to save email configuration');
    } finally {
      setLoading(false);
    }
  };

  const testEmailParsing = () => {
    // Test with a sample bank email
    const sampleEmail = {
      subject: 'Vietcombank - Thông báo giao dịch',
      body: `
        Kính chào Quý khách,
        
        Tài khoản của Quý khách vừa có giao dịch:
        - Số tiền: -125,000 VND
        - Loại GD: Thanh toán QR Code
        - Thời gian: ${new Date().toLocaleString()}
        - Nội dung: Test email parsing - Coffee shop
        - Số dư khả dụng: 2,875,000 VND
        
        Cảm ơn Quý khách.
      `,
      sender: 'noreply@vietcombank.com.vn',
      timestamp: new Date(),
    };

    emailBankNotificationService.processEmail(sampleEmail);
    Alert.alert('Test Sent', 'Check the chat screen for the transaction preview!');
  };

  const handleToggleMonitoring = async () => {
    try {
      if (automaticMonitoring) {
        // Stop monitoring
        emailBankNotificationService.stopEmailMonitoring();
        setAutomaticMonitoring(false);
        Alert.alert('Monitoring Stopped', 'Automatic email monitoring has been disabled.');
      } else {
        // Start monitoring
        await emailBankNotificationService.startEmailMonitoring();
        setAutomaticMonitoring(true);
        Alert.alert(
          'Monitoring Started', 
          'Automatic email monitoring is now active!\n\nThe app will check for bank emails every 30 seconds and process them automatically.',
          [
            {
              text: 'View Chat',
              onPress: () => navigation.goBack(),
            },
            {
              text: 'OK',
              style: 'default',
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error toggling email monitoring:', error);
      Alert.alert('Error', 'Failed to toggle email monitoring.');
    }
  };

  const handleSetupOAuth = async (provider: 'gmail' | 'outlook') => {
    Alert.alert(
      'OAuth Setup',
      `OAuth setup for ${provider} requires additional configuration:\n\n` +
      '1. Set up OAuth credentials in Google/Microsoft Console\n' +
      '2. Implement OAuth flow in the app\n' +
      '3. Handle token refresh\n\n' +
      'This is a complex process that requires backend integration.\n\n' +
      'For now, you can test email parsing with the manual test feature.',
      [
        {
          text: 'Use Manual Testing',
          onPress: () => setEmailConfig(prev => ({ ...prev, provider: 'imap' })),
        },
        {
          text: 'Continue with OAuth',
          onPress: () => {
            // TODO: Implement OAuth flow
            Alert.alert('Coming Soon', 'OAuth integration is not yet implemented.');
          },
        },
      ]
    );
  };

  const renderProviderConfig = () => {
    switch (emailConfig.provider) {
      case 'gmail':
        return (
          <View style={styles.configSection}>
            <Text style={styles.sectionTitle}>Gmail Configuration</Text>
            <Text style={styles.description}>
              Gmail access requires OAuth authentication for security.
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gmail Address</Text>
              <TextInput
                style={styles.input}
                value={emailConfig.email}
                onChangeText={(email) => setEmailConfig(prev => ({ ...prev, email }))}
                placeholder="your.email@gmail.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={styles.oauthButton}
              onPress={() => handleSetupOAuth('gmail')}
            >
              <Icon name="security" size={20} color="#FFF" />
              <Text style={styles.oauthButtonText}>Setup OAuth Authentication</Text>
            </TouchableOpacity>
          </View>
        );

      case 'outlook':
        return (
          <View style={styles.configSection}>
            <Text style={styles.sectionTitle}>Outlook Configuration</Text>
            <Text style={styles.description}>
              Outlook access requires Microsoft Graph API authentication.
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Outlook Email</Text>
              <TextInput
                style={styles.input}
                value={emailConfig.email}
                onChangeText={(email) => setEmailConfig(prev => ({ ...prev, email }))}
                placeholder="your.email@outlook.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={styles.oauthButton}
              onPress={() => handleSetupOAuth('outlook')}
            >
              <Icon name="security" size={20} color="#FFF" />
              <Text style={styles.oauthButtonText}>Setup Microsoft Authentication</Text>
            </TouchableOpacity>
          </View>
        );

      case 'imap':
        return (
          <View style={styles.configSection}>
            <Text style={styles.sectionTitle}>IMAP Configuration</Text>
            <Text style={styles.description}>
              Connect to your email provider using IMAP settings.
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={emailConfig.email}
                onChangeText={(email) => setEmailConfig(prev => ({ ...prev, email }))}
                placeholder="your.email@domain.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>IMAP Host</Text>
              <TextInput
                style={styles.input}
                value={emailConfig.imapHost}
                onChangeText={(imapHost) => setEmailConfig(prev => ({ ...prev, imapHost }))}
                placeholder="imap.gmail.com"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>IMAP Port</Text>
              <TextInput
                style={styles.input}
                value={emailConfig.imapPort?.toString()}
                onChangeText={(port) => setEmailConfig(prev => ({ ...prev, imapPort: parseInt(port) || 993 }))}
                placeholder="993"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.switchGroup}>
              <Text style={styles.label}>Use SSL/TLS</Text>
              <Switch
                value={emailConfig.imapSecure ?? true}
                onValueChange={(imapSecure) => setEmailConfig(prev => ({ ...prev, imapSecure }))}
                trackColor={{ false: '#767577', true: '#00D09E' }}
                thumbColor={emailConfig.imapSecure ? '#FFF' : '#f4f3f4'}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={emailConfig.imapUser}
                onChangeText={(imapUser) => setEmailConfig(prev => ({ ...prev, imapUser }))}
                placeholder="Usually your email address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={emailConfig.imapPassword}
                onChangeText={(imapPassword) => setEmailConfig(prev => ({ ...prev, imapPassword }))}
                placeholder="Your email password or app password"
                secureTextEntry
              />
            </View>

            <Text style={styles.warning}>
              ⚠️ For Gmail, you need to enable "Less secure app access" or use an App Password.
            </Text>
          </View>
        );
    }
  };

  return (
    <LinearGradient
      colors={['#00D09E', '#FFFFFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.title}>Email Configuration</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Icon 
                name={isConfigured ? "check-circle" : "email"} 
                size={24} 
                color={isConfigured ? "#00D09E" : "#7F8C8D"} 
              />
              <Text style={styles.statusTitle}>
                {isConfigured ? 'Email Configured' : 'Email Not Configured'}
              </Text>
            </View>
            <Text style={styles.statusDescription}>
              {isConfigured 
                ? 'Your email is configured for bank transaction parsing. Manual testing is available.'
                : 'Configure your email to enable automatic bank transaction detection from emails.'
              }
            </Text>
          </View>

          <View style={styles.providerSection}>
            <Text style={styles.sectionTitle}>Choose Email Provider</Text>
            
            <View style={styles.providerButtons}>
              <TouchableOpacity
                style={[
                  styles.providerButton,
                  emailConfig.provider === 'gmail' && styles.providerButtonActive
                ]}
                onPress={() => handleProviderChange('gmail')}
              >
                <Icon name="email" size={24} color={emailConfig.provider === 'gmail' ? '#FFF' : '#7F8C8D'} />
                <Text style={[
                  styles.providerButtonText,
                  emailConfig.provider === 'gmail' && styles.providerButtonTextActive
                ]}>
                  Gmail
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.providerButton,
                  emailConfig.provider === 'outlook' && styles.providerButtonActive
                ]}
                onPress={() => handleProviderChange('outlook')}
              >
                <Icon name="email" size={24} color={emailConfig.provider === 'outlook' ? '#FFF' : '#7F8C8D'} />
                <Text style={[
                  styles.providerButtonText,
                  emailConfig.provider === 'outlook' && styles.providerButtonTextActive
                ]}>
                  Outlook
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.providerButton,
                  emailConfig.provider === 'imap' && styles.providerButtonActive
                ]}
                onPress={() => handleProviderChange('imap')}
              >
                <Icon name="settings" size={24} color={emailConfig.provider === 'imap' ? '#FFF' : '#7F8C8D'} />
                <Text style={[
                  styles.providerButtonText,
                  emailConfig.provider === 'imap' && styles.providerButtonTextActive
                ]}>
                  Custom IMAP
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {renderProviderConfig()}

          {isConfigured && (
            <View style={styles.monitoringSection}>
              <Text style={styles.sectionTitle}>Automatic Monitoring</Text>
              <Text style={styles.description}>
                Enable automatic background monitoring for bank transaction emails.
              </Text>
              
              <View style={styles.monitoringToggle}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Auto-detect Bank Emails</Text>
                  <Text style={styles.toggleDescription}>
                    {automaticMonitoring 
                      ? 'Monitoring active - checking for new bank emails every 30 seconds'
                      : 'Tap to start automatic email monitoring'
                    }
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggle, automaticMonitoring && styles.toggleActive]}
                  onPress={handleToggleMonitoring}
                >
                  <View style={[styles.toggleSwitch, automaticMonitoring && styles.toggleSwitchActive]} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveConfig}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Icon name="save" size={20} color="#FFF" />
                  <Text style={styles.saveButtonText}>Save Configuration</Text>
                </>
              )}
            </TouchableOpacity>

            {isConfigured && (
              <TouchableOpacity
                style={styles.testButton}
                onPress={testEmailParsing}
              >
                <Icon name="play-arrow" size={20} color="#00D09E" />
                <Text style={styles.testButtonText}>Test Email Parsing</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>📧 About Email Monitoring</Text>
            <Text style={styles.infoText}>
              Email monitoring for bank transactions is more complex than SMS parsing because:
            </Text>
            <Text style={styles.infoText}>
              • OAuth authentication required for Gmail/Outlook{'\n'}
              • IMAP requires app passwords for most providers{'\n'}
              • Real-time monitoring needs background services{'\n'}
              • Different email formats from various banks
            </Text>
            <Text style={styles.infoText}>
              <Text style={{ fontWeight: 'bold' }}>Current Status:</Text> Manual email parsing is ready. 
              You can test with the button above to see how bank emails are processed.
            </Text>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 208, 158, 0.3)',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginLeft: 10,
  },
  statusDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
  },
  providerSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  providerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  providerButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  providerButtonActive: {
    backgroundColor: '#00D09E',
    borderColor: '#00B88D',
  },
  providerButtonText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 5,
    fontWeight: '600',
  },
  providerButtonTextActive: {
    color: '#FFF',
  },
  configSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  description: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E6ED',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  switchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  oauthButton: {
    backgroundColor: '#3498DB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  oauthButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  warning: {
    fontSize: 12,
    color: '#E74C3C',
    fontStyle: 'italic',
    marginTop: 10,
    lineHeight: 16,
  },
  actionButtons: {
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#00D09E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  testButton: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#00D09E',
  },
  testButtonText: {
    color: '#00D09E',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.3)',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#34495E',
    lineHeight: 20,
    marginBottom: 8,
  },
  monitoringSection: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  monitoringToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 15,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 18,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E5E5',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#00D09E',
  },
  toggleSwitch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  toggleSwitchActive: {
    transform: [{ translateX: 20 }],
  },
});
