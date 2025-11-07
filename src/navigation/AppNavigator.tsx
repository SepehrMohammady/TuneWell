/**
 * App Navigator - Main navigation structure
 */

import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Placeholder screens - will be implemented
import {LibraryScreen} from '@screens/LibraryScreen';
import {PlaylistsScreen} from '@screens/PlaylistsScreen';
import {PlayerScreen} from '@screens/PlayerScreen';
import {SettingsScreen} from '@screens/SettingsScreen';
import {EQScreen} from '@screens/EQScreen';
import {FolderBrowserScreen} from '@screens/FolderBrowserScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: '#1a1a1a',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#1DB954',
        tabBarInactiveTintColor: '#666666',
        tabBarIcon: ({color, size}) => {
          let iconName = 'music';

          if (route.name === 'Library') {
            iconName = 'music-box-multiple';
          } else if (route.name === 'Playlists') {
            iconName = 'playlist-music';
          } else if (route.name === 'Player') {
            iconName = 'play-circle';
          } else if (route.name === 'Settings') {
            iconName = 'cog';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
      })}>
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Playlists" component={PlaylistsScreen} />
      <Tab.Screen name="Player" component={PlayerScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#000000',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
      <Stack.Screen
        name="Main"
        component={TabNavigator}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="EQ"
        component={EQScreen}
        options={{title: 'Equalizer'}}
      />
      <Stack.Screen
        name="FolderBrowser"
        component={FolderBrowserScreen}
        options={{title: 'Browse Folders'}}
      />
    </Stack.Navigator>
  );
}
