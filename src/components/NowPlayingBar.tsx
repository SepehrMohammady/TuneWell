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

    if (!currentTrack) return null;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSeek = async (value: number) => {
        try {
            await TrackPlayer.seekTo(value);
        } catch (error) {
            console.error('Seek error:', error);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
            {/* Track Info */}
            <View style={styles.trackInfo}>
                <View style={[styles.artwork, { backgroundColor: theme.colors.surfaceAlt }]}>
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
                            <Text style={[styles.artworkPlaceholderText, { color: theme.colors.textSecondary }]}>♪</Text>
                        </View>
                    )}
                </View>

                <View style={styles.info}>
                    <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
                        {currentTrack.title}
                    </Text>
                    <Text style={[styles.artist, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {currentTrack.artist}
                    </Text>
                </View>
            </View>

            {/* Seek Bar */}
            <View style={styles.seekSection}>
                <View style={styles.timeRow}>
                    <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>{formatTime(position)}</Text>
                    <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>{formatTime(duration)}</Text>
                </View>
                <Slider
                    style={styles.slider}
                    value={position}
                    minimumValue={0}
                    maximumValue={duration || 1}
                    minimumTrackTintColor={theme.colors.text}
                    maximumTrackTintColor={theme.colors.border}
                    thumbTintColor={theme.colors.text}
                    tapToSeek={true}
                    onSlidingComplete={handleSeek}
                />
            </View>

            {/* Controls */}
            <View style={styles.controls}>
                <TouchableOpacity
                    onPress={previous}
                    style={[styles.controlButton, { backgroundColor: theme.colors.surfaceAlt }]}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.controlText, { color: theme.colors.text }]}>⏮</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={isPlaying ? pause : play}
                    style={[styles.playButton, { backgroundColor: theme.colors.surfaceAlt }]}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.playText, { color: theme.colors.text }]}>{isPlaying ? '⏸' : '▶'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={next}
                    style={[styles.controlButton, { backgroundColor: theme.colors.surfaceAlt }]}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.controlText, { color: theme.colors.text }]}>⏭</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopWidth: 1,
        paddingTop: 8,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    trackInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    artwork: {
        width: 40,
        height: 40,
        borderRadius: 4,
        marginRight: 12,
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
    },
    info: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 2,
    },
    artist: {
        fontSize: 12,
    },
    seekSection: {
        marginBottom: 8,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    timeText: {
        fontSize: 11,
    },
    slider: {
        width: '100%',
        height: 30,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
    },
    controlButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlText: {
        fontSize: 20,
        textAlign: 'center',
    },
    playText: {
        fontSize: 24,
        textAlign: 'center',
    },
});
