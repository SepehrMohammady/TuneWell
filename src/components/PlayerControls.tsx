import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { usePlayerStore } from '@/store/PlayerStore';
import { theme } from '@/styles/theme';

export function PlayerControls() {
    const {
        isPlaying,
        shuffleMode,
        repeatMode,
        play,
        pause,
        next,
        previous,
        toggleShuffle,
        cycleRepeatMode,
    } = usePlayerStore();

    const getRepeatIcon = () => {
        switch (repeatMode) {
            case 'one':
                return '🔂';
            case 'all':
                return '🔁';
            default:
                return '↻';
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={toggleShuffle} style={styles.button}>
                <Text style={[styles.icon, shuffleMode && styles.activeIcon]}>🔀</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={previous} style={styles.button}>
                <Text style={styles.icon}>⏮</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={isPlaying ? pause : play}
                style={[styles.button, styles.playButton]}
            >
                <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={next} style={styles.button}>
                <Text style={styles.icon}>⏭</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={cycleRepeatMode} style={styles.button}>
                <Text style={[styles.icon, repeatMode !== 'off' && styles.activeIcon]}>
                    {getRepeatIcon()}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        paddingVertical: theme.spacing.md,
    },
    button: {
        padding: theme.spacing.sm,
    },
    playButton: {
        width: 60,
        height: 60,
        borderRadius: theme.borderRadius.round,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        fontSize: 24,
        color: theme.colors.textSecondary,
    },
    activeIcon: {
        color: theme.colors.primary,
    },
    playIcon: {
        fontSize: 28,
        color: theme.colors.text,
    },
});
