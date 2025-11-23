import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import TrackPlayer, { useProgress } from 'react-native-track-player';
import { useTheme } from '@/styles/theme';
import { usePlayerStore } from '@/store/PlayerStore';

export function SeekBar() {
    const theme = useTheme();
    const { position, duration } = useProgress();
    const [isSeeking, setIsSeeking] = useState(false);
    const [seekPosition, setSeekPosition] = useState(0);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSlidingStart = () => {
        setIsSeeking(true);
    };

    const handleSlidingComplete = async (value: number) => {
        await TrackPlayer.seekTo(value);
        setIsSeeking(false);
    };

    const handleValueChange = (value: number) => {
        setSeekPosition(value);
    };

    const displayPosition = isSeeking ? seekPosition : position;

    const styles = StyleSheet.create({
        container: {
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.sm,
        },
        timeContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.xs,
        },
        timeText: {
            ...theme.typography.small,
            color: theme.colors.textSecondary,
        },
        slider: {
            width: '100%',
            height: 40,
        },
    });

    return (
        <View style={styles.container}>
            <View style={styles.timeContainer}>
                <Text style={styles.timeText}>{formatTime(displayPosition)}</Text>
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
            <Slider
                style={styles.slider}
                value={displayPosition}
                minimumValue={0}
                maximumValue={duration}
                minimumTrackTintColor={theme.colors.primary}
                maximumTrackTintColor={theme.colors.border}
                thumbTintColor={theme.colors.primary}
                onSlidingStart={handleSlidingStart}
                onSlidingComplete={handleSlidingComplete}
                onValueChange={handleValueChange}
            />
        </View>
    );
}
