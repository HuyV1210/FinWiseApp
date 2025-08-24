import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, Animated } from "react-native";
import React, { useRef, useCallback } from 'react';
import LinearGradient from "react-native-linear-gradient";
import type { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from "react-native-vector-icons/Ionicons";

type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
};

type WelcomeScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Welcome'>;
};

export default function Welcome({ navigation }: WelcomeScreenProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const circleScale = useRef(new Animated.Value(0.7)).current;
  const circleOpacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(circleScale, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(circleOpacity, {
        toValue: 0.85,
        duration: 700,
        useNativeDriver: true,
      })
    ]).start();
  }, [circleScale, circleOpacity]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return (
    <LinearGradient
      colors={['#00D09E', '#FFFFFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.centered}>
        <Text style={styles.welcomeText}>Welcome to</Text>
        <Text style={styles.welcomeText}>Expense Tracker!</Text>
        <Text style={styles.sloganText}>
          Track your expenses, talk to your AI finance assistant, and stay in control of your money.
        </Text>
      </View>
      <ScrollView
        style={styles.subContainer}
        contentContainerStyle={styles.imageContainer}
        bounces={false}
      >
        <View style={styles.circleImageWrapper}>
          <Animated.View style={{
            ...styles.circle,
            transform: [{ scale: circleScale }],
            opacity: circleOpacity,
          }}>
            <LinearGradient
              colors={['#DFF7E2', '#B2F7D6']}
              style={{ flex: 1, borderRadius: 150 }}
              start={{ x: 0.2, y: 0.2 }}
              end={{ x: 0.8, y: 0.8 }}
            />
          </Animated.View>
          <Image source={require('../../assets/welcome.png')} style={styles.image} />
        </View>
        <Animated.View style={[styles.buttonContainer, { transform: [{ scale }] }]}> 
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            accessibilityRole="button"
            accessibilityLabel="Get Started"
            style={styles.touchable}
            activeOpacity={1}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <Ionicons name="arrow-forward-circle" size={28} color="#fff" style={styles.buttonIcon} />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 60,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#222',
    fontFamily: 'Poppins-SemiBold',
  },
  sloganText: {
    fontSize: 14,
    color: '#222',
    textAlign: 'center',
    fontFamily: 'Poppins-SemiBold',
    marginTop: 10,
  },
  subContainer: {
    backgroundColor: '#F1FFF3',
    borderTopRightRadius: 60,
    borderTopLeftRadius: 60,
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    minHeight: 400,
  },
  circleImageWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 300,
    height: 300,
    marginBottom: 30,
  },
  circle: {
    width: 300,
    height: 300,
    borderRadius: 150,
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 0,
    opacity: 0.85,
    shadowColor: '#00D09E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#B2F7D6',
  },
  image: {
    width: 250,
    height: 250,
    resizeMode: 'contain',
    zIndex: 1,
  },
  buttonContainer: {
    width: 300,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
    shadowColor: '#00D09E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    backgroundColor: '#00D09E',
  },
  buttonText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
    fontFamily: 'Poppins-SemiBold',
    paddingHorizontal: 8,
    textShadowColor: 'rgba(0,0,0,0.12)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 27,
    paddingHorizontal: 18,
    backgroundColor: 'transparent',
  },
  buttonIcon: {
    marginLeft: 16,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.12)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});