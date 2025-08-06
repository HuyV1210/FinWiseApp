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
import React, { useState, useContext } from 'react';
import { StackNavigationProp } from '@react-navigation/stack';
import LinearGradient from 'react-native-linear-gradient';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import BackButton from '../../components/BackButton';
import { AuthContext } from '../../context/AuthContext';

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Forgot: undefined;
  Home: undefined;
};

type LoginScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Login'>;
};

const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

const RememberMeCheckbox = ({ checked, onPress }: { checked: boolean; onPress: () => void }) => (
  <TouchableOpacity
    style={styles.checkbox}
    onPress={onPress}
    accessibilityRole="checkbox"
    accessibilityState={{ checked }}
  >
    <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
      {checked && <Text style={styles.checkboxTick}>✓</Text>}
    </View>
  </TouchableOpacity>
);

export default function Login({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const { storeAuthToken } = useContext(AuthContext);

  React.useEffect(() => {
    (async () => {
      const savedEmail = await AsyncStorage.getItem('rememberedEmail');
      if(savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    })();
  }, []);

  const handleLogin = React.useCallback(async () => {
    let hasError = false;
    setLoginError('');
    
    // Validate email
    if (!isValidEmail(email)) {
      setEmailError(true);
      setLoginError('Please enter a valid email address.');
      hasError = true;
    } else {
      setEmailError(false);
    }
    
    // Validate password
    if (!password) {
      setPasswordError(true);
      setLoginError('Please enter your password.');
      hasError = true;
    } else {
      setPasswordError(false);
    }
    
    if (hasError) return;
    
    setLoading(true);
    
    try {
      // Submit to Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      
      // Authentication Success - Store Token
      const idToken = await userCredential.user.getIdToken();
      await storeAuthToken(idToken);
      
      // Handle Remember Me
      if (rememberMe) {
        await AsyncStorage.setItem('rememberedEmail', email.trim());
      } else {
        await AsyncStorage.removeItem('rememberedEmail');
      }
      
      // Reset retry count on success
      setRetryCount(0);
      
      // Navigate to Home
      navigation.replace('Home');
      
    } catch (err: any) {
      console.log('Login error:', err);
      
      // Enhanced error handling
      let errorMessage = 'Login failed. Please try again.';
      
      switch (err.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection.';
          break;
        default:
          errorMessage = 'Login failed. Please try again.';
      }
      
      setLoginError(errorMessage);
      setRetryCount(prev => prev + 1);
      
      // Show retry suggestion after multiple failures
      if (retryCount >= 2) {
        Alert.alert(
          'Login Issues?',
          'Having trouble logging in? You can reset your password or contact support.',
          [
            { text: 'Reset Password', onPress: () => navigation.navigate('Forgot') },
            { text: 'Try Again', style: 'cancel' }
          ]
        );
      }
    }
    
    setLoading(false);
  }, [email, password, rememberMe, navigation, storeAuthToken, retryCount]);

  return (
    <LinearGradient
      colors={['#00D09E', '#FFFFFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <BackButton
        onPress={() => navigation.canGoBack() ? navigation.goBack() : null}
        style={{ position: 'absolute', top: 50, left: 20, zIndex: 10 }}
        color="#fff"
      />
      <Text style={styles.welcomeText}>Login</Text>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, width: '100%' }}
      >
        <ScrollView
          style={styles.subContainer}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[
              styles.input,
              emailError && { borderColor: '#FF4D4F' }
            ]}
            placeholder="you@example.com"
            value={email}
            onChangeText={text => {
              setEmail(text);
              if (emailError) setEmailError(false);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoFocus
            returnKeyType="next"
          />
          {emailError && (
            <Text style={{ color: '#FF4D4F', fontSize: 13, marginTop: 4 }}>
              Please enter a valid email address.
            </Text>
          )}
          <Text style={styles.label}>Password</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={[
                styles.input,
                passwordError && { borderColor: '#FF4D4F' },
                { paddingRight: 40 }
              ]}
              placeholder="********"
              value={password}
              onChangeText={text => {
                setPassword(text);
                if (passwordError) setPasswordError(false);
                if (loginError) setLoginError('');
              }}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              accessibilityLabel="Password input field"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: 8, top: 0, height: '100%', justifyContent: 'center', padding: 8 }}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              accessibilityRole="button"
            >
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#00B88D" />
            </TouchableOpacity>
          </View>
          {passwordError && (
            <Text style={{ color: '#FF4D4F', fontSize: 13, marginTop: 4 }}>
              Please enter your password.
            </Text>
          )}
          {loginError && !passwordError && (
            <Text style={{ color: '#FF4D4F', fontSize: 13, marginTop: 4 }}>
              {loginError}
            </Text>
          )}
          <View style={styles.rememberMeRow}>
            <RememberMeCheckbox checked={rememberMe} onPress={() => setRememberMe(!rememberMe)} />
            <Text style={styles.rememberMeText}>Remember Me</Text>
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginText}>Login</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Forgot')}>
            <Text style={styles.linkText}>Forgot Password?</Text>
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
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#00D09E',
    flex: 1,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#00B88D',
    fontWeight: 'bold',
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
    paddingVertical: 18, // was 14
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
    shadowColor: '#00B88D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
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
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 8,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#00B88D',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxBoxChecked: {
    backgroundColor: '#00B88D',
    borderColor: '#00B88D',
  },
  checkboxTick: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rememberMeText: {
    fontSize: 16,
    color: '#222',
  },
});