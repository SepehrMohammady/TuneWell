import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setupPlayer } from './src/services/AudioService';
import { MainScreen } from './src/screens/MainScreen';
import { View, Text, ActivityIndicator, StyleSheet, useColorScheme } from 'react-native';
import { useTheme } from './src/styles/theme';

function LoadingScreen() {
    const theme = useTheme();

    const styles = StyleSheet.create({
        loading: {
            flex: 1,
            backgroundColor: theme.colors.background,
            justifyContent: 'center',
            alignItems: 'center',
        },
        loadingText: {
            color: theme.colors.text,
            marginTop: theme.spacing.md,
            fontSize: theme.typography.body.fontSize,
        },
    });

    return (
        <View style={styles.loading}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Initializing TuneWell...</Text>
        </View>
    );
}

export default function App() {
    const [playerReady, setPlayerReady] = useState(false);
    const colorScheme = useColorScheme();

    useEffect(() => {
        async function init() {
            const ready = await setupPlayer();
            setPlayerReady(ready);
        }

        init();
    }, []);

    if (!playerReady) {
        return <LoadingScreen />;
    }

    return (
        <SafeAreaProvider>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <MainScreen />
        </SafeAreaProvider>
    );
}
