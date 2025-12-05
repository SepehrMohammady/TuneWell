/**
 * TuneWell Navigation Setup
 * 
 * Main navigation structure for the app using React Navigation.
 */

import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { THEME, ROUTES } from '../config/constants';
import type { RootStackParamList, MainTabsParamList } from '../types';

// Import screens (to be created)
import HomeScreen from '../screens/HomeScreen';
import LibraryScreen from '../screens/LibraryScreen';
import PlaylistsScreen from '../screens/PlaylistsScreen';
import EqualizerScreen from '../screens/EqualizerScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PlayerScreen from '../screens/PlayerScreen';
import QueueScreen from '../screens/QueueScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabsParamList>();

// Custom dark theme
const TuneWellTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: THEME.colors.primary,
    background: THEME.colors.background,
    card: THEME.colors.surface,
    text: THEME.colors.text,
    border: THEME.colors.border,
    notification: THEME.colors.primary,
  },
};

import { Text as RNText } from 'react-native';

/**
 * Tab icon component
 */
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const iconMap: Record<string, string> = {
    Home: '⌂',
    Library: '♫',
    Playlists: '≡',
    Equalizer: '⏛',
    Settings: '⚙',
  };
  
  return (
    <RNText style={{ fontSize: 22, opacity: focused ? 1 : 0.6 }}>
      {iconMap[name] || '●'}
    </RNText>
  );
}

/**
 * Main tabs navigator
 */
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: THEME.colors.surface,
          borderTopColor: THEME.colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: THEME.colors.primary,
        tabBarInactiveTintColor: THEME.colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name={ROUTES.HOME as keyof MainTabsParamList}
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name={ROUTES.LIBRARY as keyof MainTabsParamList}
        component={LibraryScreen}
        options={{
          tabBarLabel: 'Library',
          tabBarIcon: ({ focused }) => <TabIcon name="Library" focused={focused} />,
        }}
      />
      <Tab.Screen
        name={ROUTES.PLAYLISTS as keyof MainTabsParamList}
        component={PlaylistsScreen}
        options={{
          tabBarLabel: 'Playlists',
          tabBarIcon: ({ focused }) => <TabIcon name="Playlists" focused={focused} />,
        }}
      />
      <Tab.Screen
        name={ROUTES.EQUALIZER as keyof MainTabsParamList}
        component={EqualizerScreen}
        options={{
          tabBarLabel: 'EQ',
          tabBarIcon: ({ focused }) => <TabIcon name="Equalizer" focused={focused} />,
        }}
      />
      <Tab.Screen
        name={ROUTES.SETTINGS as keyof MainTabsParamList}
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon name="Settings" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * Root stack navigator
 */
export function RootNavigator() {
  return (
    <NavigationContainer theme={TuneWellTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_bottom',
          contentStyle: { backgroundColor: THEME.colors.background },
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name={ROUTES.PLAYER as keyof RootStackParamList}
          component={PlayerScreen}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name={ROUTES.QUEUE as keyof RootStackParamList}
          component={QueueScreen}
          options={{
            presentation: 'modal',
            animation: 'slide_from_right',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default RootNavigator;
