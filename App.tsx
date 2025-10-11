import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Context Providers
import { EQProvider } from './src/contexts/EQContext';
import { MusicLibraryProvider } from './src/contexts/MusicLibraryContext';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import PlaylistScreen from './src/screens/PlaylistScreen';
import EqualizerScreen from './src/screens/EqualizerScreen';
import FolderBrowserScreen from './src/screens/FolderBrowserScreen';

// Types
import { RootStackParamList } from './src/types/navigation';

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <MusicLibraryProvider>
        <EQProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <Stack.Navigator
              initialRouteName="Home"
              screenOptions={{
                headerStyle: {
                  backgroundColor: '#1a1a1a',
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            >
              <Stack.Screen 
                name="Home" 
                component={HomeScreen} 
                options={{ title: 'TuneWell' }}
              />
              <Stack.Screen 
                name="Player" 
                component={PlayerScreen} 
                options={{ title: 'Now Playing' }}
              />
              <Stack.Screen 
                name="Playlist" 
                component={PlaylistScreen} 
                options={{ title: 'Playlists' }}
              />
              <Stack.Screen 
                name="Equalizer" 
                component={EqualizerScreen} 
                options={{ title: 'Equalizer' }}
              />
              <Stack.Screen 
                name="FolderBrowser" 
                component={FolderBrowserScreen} 
                options={{ title: 'Browse Folders' }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </EQProvider>
      </MusicLibraryProvider>
    </SafeAreaProvider>
  );
}
