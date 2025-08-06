import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import React, { useState } from 'react';
import { StackNavigationProp } from '@react-navigation/stack';
import LinearGradient from 'react-native-linear-gradient';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackButton from '../../components/BackButton';

type RootStackParamList = {
  Forgot: undefined;
  Login: undefined;
  Register: undefined;
};

type ForgotScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Forgot'>;
};

const Forgot: React.FC<ForgotScreenProps> = React.memo(({ navigation }) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = React.useCallback(async () => {
    setEmailError('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Please enter your email address.');
      return;
    }
    // Simple email regex
    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      Alert.alert(
        'Email Sent!',
        'A password reset email has been sent. Please check your inbox.',
        [
          {
            text: 'Go to Login',
            onPress: () => navigation.replace('Login'),
            style: 'default',
          },
        ],
        { cancelable: false }
      );
    } catch (error: any) {
      let msg = error.message;
      if (error.code === 'auth/user-not-found') {
        setEmailError('No account found with this email address.');
        msg = 'No account found';
      } else if (error.code === 'auth/invalid-email') {
        setEmailError('Please enter a valid email address.');
        msg = 'Invalid email';
      }
      Alert.alert('Error', msg);
    }
    setLoading(false);
  }, [email, navigation]);

  return (
    <LinearGradient
      colors={['#00D09E', '#FFFFFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <BackButton
        onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login')}
        style={{ position: 'absolute', top: 50, left: 20, zIndex: 10 }}
        color="#fff"
      />
      <Text style={styles.welcomeText}>Forgot Password</Text>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, width: '100%' }}
      >
        <ScrollView
          style={styles.subContainer}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>Enter Email Address</Text>
          <TextInput
            style={[styles.input, emailError && { borderColor: '#FF4D4F' }]}
            placeholder="you@example.com"
            value={email}
            onChangeText={text => {
              setEmail(text);
              if (emailError) setEmailError('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            accessibilityLabel="Email input field"
          />
          {emailError ? (
            <Text style={{ color: '#FF4D4F', fontSize: 13, marginTop: 4 }}>{emailError}</Text>
          ) : null}

          <TouchableOpacity style={styles.loginButton} onPress={handleReset} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginText}>Send Reset Password</Text>
            )}
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={styles.smallText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.linkText}>Register</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
});

export default Forgot;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#00D09E',
    flex: 1,
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#222',
    fontFamily: 'Poppins-ExtraBold',
    paddingTop: 100,
    textAlign: 'center',
    paddingBottom: 60,
  },
  subContainer: {
    backgroundColor: '#F1FFF3',
    borderTopRightRadius: 60,
    borderTopLeftRadius: 60,
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  contentContainer: {
    paddingBottom: 60,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    color: '#333',
  },
  input: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#B6E2C8',
    fontSize: 16,
    color: '#222',
    marginBottom: 20
  },
  loginButton: {
    marginTop: 32,
    backgroundColor: '#00B88D',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  loginText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  linkText: {
    color: '#00B88D',
    textAlign: 'center',
    fontWeight: '600',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    gap: 10,
  },
  smallText: {
    fontSize: 14,
    color: '#222',
  },
});