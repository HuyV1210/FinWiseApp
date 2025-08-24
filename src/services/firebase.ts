// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics"; // Not supported in React Native
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID
} from '@env';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || "DUMMY_API_KEY",
  authDomain: FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || "dummy-auth-domain",
  projectId: FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "dummy-project-id",
  storageBucket: FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || "dummy-storage-bucket",
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || "dummy-messaging-sender-id",
  appId: FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || "dummy-app-id",
  measurementId: FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID || "dummy-measurement-id",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Use initializeAuth for React Native, with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

export const firestore = getFirestore(app);
export { app };
