import type { StackNavigationProp } from '@react-navigation/stack';

export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Home: undefined;
  Login: undefined;
  Register: undefined;
  Forgot: undefined;
  Search: undefined;
  Notification: undefined;
  BankNotificationSettings: undefined;
  TestBankNotification: undefined;
  StatsChart: { statType: string };
  statchart: { statType: string };
  Budget: undefined;
  EmailConfig: undefined;
};

export type SplashScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Splash'>;
};

export type WelcomeScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Welcome'>;
};
