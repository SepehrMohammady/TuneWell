import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Slider from '@react-native-community/slider';
import { useProgress } from 'react-native-track-player';
import TrackPlayer from 'react-native-track-player';
import { Ionicons } from '@expo/vector-icons';
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
                            <Ionicons name="musical-note" size={20} color={theme.colors.textSecondary} />
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
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="play-skip-back" size={20} color={theme.colors.text} />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={isPlaying ? pause : play}
                    style={[styles.playButton, { backgroundColor: theme.colors.surfaceAlt }]}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={28}
                        color={theme.colors.text}
                        style={{ marginLeft: isPlaying ? 0 : 2 }} // Optical adjustment for play icon
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={next}
                    style={[styles.controlButton, { backgroundColor: theme.colors.surfaceAlt }]}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="play-skip-forward" size={20} color={theme.colors.text} />
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
        paddingTop: 12,
        paddingBottom: 24,
        paddingHorizontal: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    trackInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    artwork: {
        width: 48,
        height: 48,
        borderRadius: 8,
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
    info: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    artist: {
        fontSize: 13,
    },
    seekSection: {
        marginBottom: 16,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    timeText: {
        fontSize: 12,
        fontVariant: ['tabular-nums'],
    },
    slider: {
        width: '100%',
        height: 40,
        marginHorizontal: -10, // Offset default padding of slider
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
    },
    controlButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
});
