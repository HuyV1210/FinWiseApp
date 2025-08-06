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
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import React, { useState } from 'react';
import { StackNavigationProp } from '@react-navigation/stack';
import LinearGradient from 'react-native-linear-gradient';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, firestore } from '../../services/firebase';
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import BackButton from '../../components/BackButton';

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Forgot: undefined;
  Home: undefined;
};

type LoginScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Login'>;
};

export default function Register({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const validateEmail = (email: string) => {
    // Simple email regex
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleRegister = React.useCallback(async () => {
    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();
    setUsernameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    let hasError = false;
    if (!trimmedUsername) {
      setUsernameError('Username is required!');
      hasError = true;
    }
    if (!validateEmail(trimmedEmail)) {
      setEmailError('Please enter a valid email address!');
      hasError = true;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters!');
      hasError = true;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match!');
      hasError = true;
    }
    if (hasError) return;
    setLoading(true);
    try {
      // Create user first
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      const uid = userCredential.user.uid;
      
      // Save user data to Firestore
      await setDoc(doc(firestore, 'users', uid), {
        email: trimmedEmail,
        username: trimmedUsername,
        createdAt: new Date()
      });
      Alert.alert('Account created successfully');
      navigation.replace('Login');
    } catch(error: any) {
      let msg = error.message;
      if (error.code === 'auth/email-already-in-use') {
        setEmailError('This email is already registered. Please use a different email or try logging in.');
        msg = 'Email already in use';
      } else if (error.code === 'auth/weak-password') {
        setPasswordError('Password is too weak. Please use a stronger password.');
        msg = 'Weak password';
      } else if (error.code === 'auth/invalid-email') {
        setEmailError('Please enter a valid email address.');
        msg = 'Invalid email';
      }
      Alert.alert('Registration Error', msg);
    }
    setLoading(false);
  }, [email, username, password, confirmPassword, navigation]);

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
      <Text style={styles.welcomeText}>Register</Text>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, width: '100%' }}
        >
          <ScrollView
            style={styles.subContainer}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={[styles.input, usernameError && { borderColor: '#FF4D4F' }]}
            placeholder="you"
            value={username}
            onChangeText={text => {
              setUsername(text);
              if (usernameError) setUsernameError('');
            }}
            keyboardType="default"
            autoCapitalize="none"
            accessibilityLabel="Username input field"
          />
          {usernameError ? (
            <Text style={{ color: '#FF4D4F', fontSize: 13, marginTop: 4 }}>{usernameError}</Text>
          ) : null}

          <Text style={styles.label}>Email</Text>
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

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={[styles.input, passwordError && { borderColor: '#FF4D4F' }]}
            placeholder="********"
            value={password}
            onChangeText={text => {
              setPassword(text);
              if (passwordError) setPasswordError('');
            }}
            secureTextEntry
            accessibilityLabel="Password input field"
          />
          {passwordError ? (
            <Text style={{ color: '#FF4D4F', fontSize: 13, marginTop: 4 }}>{passwordError}</Text>
          ) : null}

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={[styles.input, confirmPasswordError && { borderColor: '#FF4D4F' }]}
            placeholder="********"
            value={confirmPassword}
            onChangeText={text => {
              setConfirmPassword(text);
              if (confirmPasswordError) setConfirmPasswordError('');
            }}
            secureTextEntry
            accessibilityLabel="Confirm password input field"
          />
          {confirmPasswordError ? (
            <Text style={{ color: '#FF4D4F', fontSize: 13, marginTop: 4 }}>{confirmPasswordError}</Text>
          ) : null}

          <TouchableOpacity style={styles.loginButton} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginText}>Register</Text>
            )}
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={styles.smallText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.linkText]}>Login</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </LinearGradient>
  );
}

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
    gap: 10
  },
  smallText: {
    fontSize: 14,
    color: '#222',
  },
});
