import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { usePlayerStore } from '@/store/PlayerStore';
import { useTheme } from '@/styles/theme';

export function PlayerControls() {
    const theme = useTheme();
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
                return '1';
            case 'all':
                return '∞';
            default:
                return '↻';
        }
    };

    const styles = StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: theme.spacing.lg,
            gap: theme.spacing.md,
        },
        button: {
            width: 44,
            height: 44,
            borderRadius: theme.borderRadius.round,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
        },
        sideButton: {
            width: 36,
            height: 36,
        },
        playButton: {
            width: 56,
            height: 56,
            backgroundColor: theme.colors.text,
        },
        icon: {
            fontSize: 18,
            color: theme.colors.text,
        },
        sideIcon: {
            fontSize: 16,
            color: theme.colors.textSecondary,
        },
        activeIcon: {
            color: theme.colors.primary,
        },
        playIcon: {
            fontSize: 24,
            color: theme.colors.background,
        },
    });

    return (
        <View style={styles.container}>
            {/* Shuffle */}
            <TouchableOpacity
                onPress={toggleShuffle}
                style={[styles.button, styles.sideButton]}
                activeOpacity={0.7}
            >
                <Text style={[styles.sideIcon, shuffleMode && styles.activeIcon]}>⚡</Text>
            </TouchableOpacity>

            {/* Previous */}
            <TouchableOpacity onPress={previous} style={styles.button} activeOpacity={0.7}>
                <Text style={styles.icon}>⏮</Text>
            </TouchableOpacity>

            {/* Play/Pause */}
            <TouchableOpacity
                onPress={isPlaying ? pause : play}
                style={[styles.button, styles.playButton]}
                activeOpacity={0.7}
            >
                <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
            </TouchableOpacity>

            {/* Next */}
            <TouchableOpacity onPress={next} style={styles.button} activeOpacity={0.7}>
                <Text style={styles.icon}>⏭</Text>
            </TouchableOpacity>

            {/* Repeat */}
            <TouchableOpacity
                onPress={cycleRepeatMode}
                style={[styles.button, styles.sideButton]}
                activeOpacity={0.7}
            >
                <Text style={[styles.sideIcon, repeatMode !== 'off' && styles.activeIcon]}>
                    {getRepeatIcon()}
                </Text>
            </TouchableOpacity>
        </View>
    );
}
