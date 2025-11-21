import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setupPlayer } from './src/services/AudioService';
import { MainScreen } from './src/screens/MainScreen';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { theme } from './src/styles/theme';

export default function App() {
    const [playerReady, setPlayerReady] = useState(false);

    useEffect(() => {
        async function init() {
            const ready = await setupPlayer();
            setPlayerReady(ready);
        }

        init();
    }, []);

    if (!playerReady) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Initializing TuneWell...</Text>
            </View>
        );
    }

    return (
        <SafeAreaProvider>
            <StatusBar style="light" />
            <MainScreen />
        </SafeAreaProvider>
    );
}

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
