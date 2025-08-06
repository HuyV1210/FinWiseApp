import React, { useEffect, useCallback, useContext } from 'react';
import type { User } from 'firebase/auth';
import { Text, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { SplashScreenProps } from '../../types/navigation';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../../services/firebase';
import { AuthContext } from '../../context/AuthContext';

export default function SplashScreen({ navigation }: SplashScreenProps) {
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const { validateToken, clearTokens } = useContext(AuthContext);
  const SPLASH_TIMEOUT = 1500;

  const handleNavigation = useCallback(
    async () => {
      try {
        // Step 1: Check AsyncStorage for auth token
        const authToken = await AsyncStorage.getItem('authToken');
        
        if (authToken) {
          // Step 2: Token exists, validate with Firebase
          const isValid = await validateToken();
          
          if (isValid) {
            // Step 3: Token valid, show dashboard
            setTimeout(() => {
              navigation.replace('Home');
            }, SPLASH_TIMEOUT);
          } else {
            // Step 4: Token invalid, clear and show welcome
            await clearTokens();
            setTimeout(() => {
              navigation.replace('Welcome');
            }, SPLASH_TIMEOUT);
          }
        } else {
          // Step 5: No token, show welcome screen
          setTimeout(() => {
            navigation.replace('Welcome');
          }, SPLASH_TIMEOUT);
        }
      } catch (error) {
        console.error('Navigation error:', error);
        setErrorMessage('An error occurred while loading your data. Please try again.');
        setTimeout(() => navigation.replace('Welcome'), 2000);
      }
    },
    [navigation, validateToken, clearTokens]
  );

  const handleRetry = () => {
    setErrorMessage(null);
    handleNavigation();
  };

  useEffect(() => {
    // Start the authentication flow
    handleNavigation();
  }, [handleNavigation]);

  return (
    <LinearGradient 
      colors={[stylesVars.primary, stylesVars.background]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={stylesVars.primary} />
      <SafeAreaView style={styles.safeArea}>
        <Text 
          style={styles.logo}
          accessibilityLabel="FinWise App Logo"
          accessibilityRole="text"
          testID="app-logo"
        >
          FinWise
        </Text>
        {!errorMessage ? (
            <ActivityIndicator 
              size="large" 
              color={stylesVars.primary}
              style={styles.loading}
              accessibilityLabel="Loading indicator"
              testID="splash-loading"
            />
          ) : (
            <>
              <Text style={styles.errorMessage} accessibilityRole="alert" testID="splash-error">
                {errorMessage}
              </Text>
              <Text style={{ color: stylesVars.primary, marginTop: 16, fontWeight: '700', textAlign: 'center', textDecorationLine: 'underline' }} onPress={handleRetry} accessibilityRole="button" testID="splash-retry">
                Try Again
              </Text>
            </>
          )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const stylesVars = {
  background: '#00D09E',
  primary: '#FFFFFF',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: '800',
    fontFamily: 'Poppins-ExtraBold',
    color: stylesVars.primary,
    marginBottom: 20,
    letterSpacing: 1,
    textAlign: 'center',
  },
  loading: {
    marginTop: 16,
  },
  errorMessage: {
    marginTop: 24,
    color: '#D00000',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
    fontWeight: '600',
  },
});
