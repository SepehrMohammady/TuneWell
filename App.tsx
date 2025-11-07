import React, {useEffect} from 'react';
import {StatusBar, StyleSheet} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {AppNavigator} from './src/navigation/AppNavigator';
import {initializeAudioService} from './src/services/audio/AudioService';
import {initializeDatabase} from './src/services/database/Database';
import {requestPermissions} from './src/utils/permissions';

const App = () => {
  useEffect(() => {
    const initialize = async () => {
      try {
        // Request necessary permissions
        await requestPermissions();

        // Initialize database
        await initializeDatabase();

        // Initialize audio service
        await initializeAudioService();

        console.log('TuneWell initialized successfully');
      } catch (error) {
        console.error('Failed to initialize TuneWell:', error);
      }
    };

    initialize();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
