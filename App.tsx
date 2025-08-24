import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
const ReactNative = require('react-native');
const { useColorScheme } = ReactNative;
import SplashScreen from './src/screens/Splash/SplashScreen.tsx';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from './src/screens/Welcome/WelcomeScreen.tsx';
import LoginScreen from './src/screens/Auth/LoginScreen';
import RegisterScreen from './src/screens/Auth/RegisterScreen';
import ForgotPasswordScreen from './src/screens/Auth/ForgotPasswordScreen';
import MainTabs from './src/screens/Navigation/MainTabs';
import SearchScreen from './src/screens/Search/SearchScreen';
import NotificationScreen from './src/screens/Notification/NotificationScreen';
import StatsChartScreen from './src/screens/Stats/StatsChartScreen';
import BudgetScreen from './src/screens/Budget/BudgetScreen';
import NotificationSettingsScreen from './src/screens/Settings/NotificationSettingsScreen';
import { AuthProvider } from './src/context/AuthContext';
import { fcmService } from './src/services/fcmService';
import { auth } from './src/services/firebase';
import React from 'react';

// Import bank notification service to initialize it
import './src/services/bankNotificationService';

enableScreens();

const Stack = createNativeStackNavigator();

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';

  // Initialize FCM service after auth is ready
  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          setTimeout(async () => {
            try {
              await fcmService.initialize();
            } catch (error) {
              console.error('Failed to initialize FCM after delay:', error);
            }
          }, 2000); // 2 second delay
        } catch (error) {
          console.error('Failed to initialize FCM:', error);
        }
      }
    });

    return unsubscribe;
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Home" component={MainTabs} />
          <Stack.Screen name="Forgot" component={ForgotPasswordScreen} />
          <Stack.Screen name="Search" component={SearchScreen}/>
          <Stack.Screen name="Notification" component={NotificationScreen} />
          <Stack.Screen name="StatsChart" component={StatsChartScreen} />
          <Stack.Screen name="statchart" component={StatsChartScreen} />
          <Stack.Screen name="Budget" component={BudgetScreen} />
          <Stack.Screen 
            name="NotificationSettings" 
            component={NotificationSettingsScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}