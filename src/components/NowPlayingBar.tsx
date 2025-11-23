import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Slider from '@react-native-community/slider';
import { useProgress } from 'react-native-track-player';
import TrackPlayer from 'react-native-track-player';
import { usePlayerStore } from '@/store/PlayerStore';
import { useTheme } from '@/styles/theme';

export function NowPlayingBar() {
    const theme = useTheme();
    const { currentTrack, isPlaying, play, pause, next, previous } = usePlayerStore();
    const { position, duration } = useProgress();
    const [imageError, setImageError] = useState(false);
    const [isSeeking, setIsSeeking] = useState(false);

    if (!currentTrack) return null;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSlidingComplete = async (value: number) => {
        await TrackPlayer.seekTo(value);
        setIsSeeking(false);
    };

    const handleValueChange = (value: number) => {
        setIsSeeking(true);
    };

    const styles = StyleSheet.create({
        container: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: theme.colors.surface,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            paddingTop: theme.spacing.sm,
            paddingBottom: theme.spacing.md,
            paddingHorizontal: theme.spacing.md,
        },
        trackInfo: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: theme.spacing.sm,
        },
        artwork: {
            width: 40,
            height: 40,
            borderRadius: theme.borderRadius.sm,
            marginRight: theme.spacing.md,
            backgroundColor: theme.colors.surfaceAlt,
            overflow: 'hidden',
        },
        artworkImage: {
            width: '100%',
            height: '100%',
        },
        artworkPlaceholder: {
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
        },
        artworkPlaceholderText: {
            fontSize: 18,
            color: theme.colors.textSecondary,
        },
        info: {
            flex: 1,
        },
        title: {
            color: theme.colors.text,
            fontSize: 14,
            fontWeight: '500',
            marginBottom: 2,
        },
        artist: {
            color: theme.colors.textSecondary,
            fontSize: 12,
        },
        seekSection: {
            marginBottom: theme.spacing.sm,
        },
        timeRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 4,
        },
        timeText: {
            fontSize: 11,
            color: theme.colors.textSecondary,
        },
        slider: {
            width: '100%',
            height: 30,
        },
        controls: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.lg,
        },
        controlButton: {
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: theme.colors.surfaceAlt,
            justifyContent: 'center',
            alignItems: 'center',
        },
        playButton: {
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: theme.colors.surfaceAlt,
            justifyContent: 'center',
            alignItems: 'center',
        },
        controlText: {
            fontSize: 18,
            color: theme.colors.text,
            textAlign: 'center',
            includeFontPadding: false,
            textAlignVertical: 'center',
        },
        playText: {
            fontSize: 22,
            color: theme.colors.text,
            textAlign: 'center',
            includeFontPadding: false,
            textAlignVertical: 'center',
        },
    });

    return (
        <View style={styles.container}>
            {/* Track Info */}
            <View style={styles.trackInfo}>
                <View style={styles.artwork}>
                    {currentTrack.artwork && !imageError ? (
                        <Image
                            source={{
                                uri: currentTrack.artwork.startsWith('data:')
                                    ? currentTrack.artwork
                                    : `data:image/jpeg;base64,${currentTrack.artwork}`
                            }}
                            style={styles.artworkImage}
                            resizeMode="cover"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <View style={styles.artworkPlaceholder}>
                            <Text style={styles.artworkPlaceholderText}>♪</Text>
                        </View>
                    )}
                </View>

                <View style={styles.info}>
                    <Text style={styles.title} numberOfLines={1}>
                        {currentTrack.title}
                    </Text>
                    <Text style={styles.artist} numberOfLines={1}>
                        {currentTrack.artist}
                    </Text>
                </View>
            </View>

            {/* Seek Bar */}
            <View style={styles.seekSection}>
                <View style={styles.timeRow}>
                    <Text style={styles.timeText}>{formatTime(position)}</Text>
                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>
                <Slider
                    style={styles.slider}
                    value={position}
                    minimumValue={0}
                    maximumValue={duration || 1}
                    minimumTrackTintColor={theme.colors.textSecondary}
                    maximumTrackTintColor={theme.colors.border}
                    thumbTintColor={theme.colors.text}
                    onValueChange={handleValueChange}
                    onSlidingStart={() => setIsSeeking(true)}
                    onSlidingComplete={handleSlidingComplete}
                />
            </View>

            {/* Controls */}
            <View style={styles.controls}>
                <TouchableOpacity onPress={previous} style={styles.controlButton} activeOpacity={0.7}>
                    <Text style={styles.controlText}>⏮</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={isPlaying ? pause : play}
                    style={styles.playButton}
                    activeOpacity={0.7}
                >
                    <Text style={styles.playText}>{isPlaying ? '⏸' : '▶'}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={next} style={styles.controlButton} activeOpacity={0.7}>
                    <Text style={styles.controlText}>⏭</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
