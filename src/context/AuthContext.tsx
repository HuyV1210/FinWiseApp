import React, { createContext, useEffect, useState } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import bankNotificationService from '../services/bankNotificationService';

interface AuthContextProps {
    user: User | null,
    loading: boolean;
    isAuthenticated: boolean;
    validateToken: () => Promise<boolean>;
    clearTokens: () => Promise<void>;
    storeAuthToken: (token: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextProps>({
    user: null,
    loading: true,
    isAuthenticated: false,
    validateToken: async () => false,
    clearTokens: async () => {},
    storeAuthToken: async () => {},
});

export const AuthProvider = ({ children }: {children: React.ReactNode}) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Store authentication token
    const storeAuthToken = async (token: string) => {
        try {
            await AsyncStorage.setItem('authToken', token);
            await AsyncStorage.setItem('authTimestamp', Date.now().toString());
        } catch (error) {
            console.error('Error storing auth token:', error);
        }
    };

    // Validate stored token
    const validateToken = async (): Promise<boolean> => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            const timestamp = await AsyncStorage.getItem('authTimestamp');
            
            if (!token || !timestamp) {
                return false;
            }

            // Check if token is expired (24 hours)
            const tokenAge = Date.now() - parseInt(timestamp);
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            
            if (tokenAge > maxAge) {
                await clearTokens();
                return false;
            }

            // Validate with Firebase
            if (auth.currentUser) {
                const idToken = await auth.currentUser.getIdToken(true);
                if (idToken) {
                    await storeAuthToken(idToken);
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error('Token validation error:', error);
            await clearTokens();
            return false;
        }
    };

    // Clear all tokens and data
    const clearTokens = async () => {
        try {
            await AsyncStorage.multiRemove(['authToken', 'authTimestamp', 'rememberedEmail']);
            setIsAuthenticated(false);
        } catch (error) {
            console.error('Error clearing tokens:', error);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            try {
                setUser(user);
                
                if (user) {
                    // User is authenticated, store new token
                    const idToken = await user.getIdToken();
                    await storeAuthToken(idToken);
                    setIsAuthenticated(true);
                    
                    // Initialize bank notification service when user logs in
                    try {
                        console.log('User authenticated - bank notification service is ready');
                        // Service is already initialized when imported
                    } catch (error) {
                        console.error('Error with bank notification service:', error);
                    }
                } else {
                    // User is not authenticated, clear tokens
                    await clearTokens();
                    setIsAuthenticated(false);
                    // Service continues running for potential future logins
                }
            } catch (error) {
                console.error('Auth state change error:', error);
                await clearTokens();
                setIsAuthenticated(false);
            } finally {
                setLoading(false);
            }
        });
        
        return () => {
            unsubscribe();
            // Service continues running in background
        };
    }, []);
    
    if (loading) {
      return null; // Or return a loading indicator like <ActivityIndicator />
    }
  
    return (
        <AuthContext.Provider value={{ 
            user, 
            loading, 
            isAuthenticated, 
            validateToken, 
            clearTokens, 
            storeAuthToken 
        }}>
            {children}
        </AuthContext.Provider>
    )
}
