import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Context Providers
import { EQProvider } from './src/contexts/EQContext';
import { MusicLibraryProvider } from './src/contexts/MusicLibraryContext';

// Navigation
import TabNavigator from './src/navigation/TabNavigator';

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
                        <TabNavigator />
          </NavigationContainer>
        </EQProvider>
      </MusicLibraryProvider>
    </SafeAreaProvider>
  );
}
