const ReactNative = require('react-native');
const { StyleSheet, Text, View } = ReactNative;
import React, { createContext, useEffect, useState } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../../services/firebase';

interface AuthContextProps {
    user: User | null,
    loading: boolean;
}

export const AuthContext = createContext<AuthContextProps>({
    user: null,
    loading: true
});

export const AuthProvider = ({ children }: {children: React.ReactNode}) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    if (loading) {
      return null; // Or return a loading indicator like <ActivityIndicator />
    }
  return (
    <AuthContext.Provider value={{ user, loading}}>
      {children}
    </AuthContext.Provider>
  )
}

const styles = StyleSheet.create({})
