import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { usePlayerStore } from '@/store/PlayerStore';
import { useTheme } from '@/styles/theme';

export function NowPlayingBar() {
    const theme = useTheme();
    const { currentTrack, isPlaying, play, pause, next, previous } = usePlayerStore();
    const [imageError, setImageError] = useState(false);

    if (!currentTrack) return null;

    const styles = StyleSheet.create({
        container: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: theme.colors.surface,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            ...theme.shadows.small,
        },
        trackInfo: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            marginRight: theme.spacing.md,
        },
        artwork: {
            width: 44,
            height: 44,
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
            fontSize: 20,
            color: theme.colors.textSecondary,
        },
        info: {
            flex: 1,
        },
        title: {
            color: theme.colors.text,
            fontSize: theme.typography.body.fontSize,
            fontWeight: '500',
            marginBottom: 2,
        },
        artist: {
            color: theme.colors.textSecondary,
            fontSize: theme.typography.caption.fontSize,
        },
        controls: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
        },
        controlButton: {
            width: 36,
            height: 36,
            borderRadius: theme.borderRadius.round,
            backgroundColor: theme.colors.surfaceAlt,
            justifyContent: 'center',
            alignItems: 'center',
        },
        playButton: {
            width: 40,
            height: 40,
            borderRadius: theme.borderRadius.round,
            backgroundColor: theme.colors.text,
            justifyContent: 'center',
            alignItems: 'center',
        },
        controlIcon: {
            fontSize: 16,
            color: theme.colors.text,
        },
        playIcon: {
            fontSize: 18,
            color: theme.colors.background,
        },
    });

    return (
        <View style={styles.container}>
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

            <View style={styles.controls}>
                {/* Previous Button */}
                <TouchableOpacity onPress={previous} style={styles.controlButton} activeOpacity={0.7}>
                    <Text style={styles.controlIcon}>⏮</Text>
                </TouchableOpacity>

                {/* Play/Pause Button */}
                <TouchableOpacity
                    onPress={isPlaying ? pause : play}
                    style={styles.playButton}
                    activeOpacity={0.7}
                >
                    <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
                </TouchableOpacity>

                {/* Next Button */}
                <TouchableOpacity onPress={next} style={styles.controlButton} activeOpacity={0.7}>
                    <Text style={styles.controlIcon}>⏭</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
