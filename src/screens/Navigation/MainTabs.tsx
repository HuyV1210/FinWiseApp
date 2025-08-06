import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import HomeScreen from '../../screens/Home/HomeScreen';
import AddScreen from '../../screens/Add/AddScreen';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import ProfileScreen from '../../screens/Profile/ProfileScreen';
import StatsScreen from '../../screens/Stats/StatsScreen';
import ChatScreen from '../../screens/Chat/ChatScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = '';

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Stats':
              iconName = 'bar-chart';
              break;
            case 'Add':
              iconName = 'add';
              break;
            case 'Chat':
              iconName = 'chat';
              break;
            case 'Profile':
              iconName = 'person';
              break;
          }

          return (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Icon name={iconName} size={size} color={focused ? '#FFFFFF' : color} />
            </View>
          );
        },
        tabBarActiveTintColor: '#00B88D',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#DFF7E2',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          height: 90,
          paddingBottom: 20,
          paddingTop: 10,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          position: 'absolute',
          
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="Chat" 
        component={ChatScreen}
        options={{ tabBarLabel: 'Chat' }}
      />
      <Tab.Screen 
        name="Add" 
        component={AddScreen}
        options={{ tabBarLabel: 'Add Expense' }}
      />
      <Tab.Screen 
        name="Stats" 
        component={StatsScreen}
        options={{ tabBarLabel: 'Statistics' }}
      />
      {/* If using a stack navigator, add NotificationScreen to the stack */}
      {/* Example: */}
      {/* <Stack.Screen name="Notification" component={NotificationScreen} /> */}
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIconContainer: {
    backgroundColor: '#00B88D',
    shadowColor: '#00B88D',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
