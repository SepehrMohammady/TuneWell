import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { usePlayerStore } from '@/store/PlayerStore';
import { theme } from '@/styles/theme';

export function NowPlayingBar() {
    const { currentTrack, isPlaying, play, pause, next } = usePlayerStore();

    if (!currentTrack) return null;

    return (
        <View style={styles.container}>
            <View style={styles.trackInfo}>
                <View style={styles.artwork}>
                    {currentTrack.artwork ? (
                        <Image source={{ uri: currentTrack.artwork }} style={styles.artworkImage} />
                    ) : (
                        <View style={styles.artworkPlaceholder}>
                            <Text style={styles.artworkPlaceholderText}>♫</Text>
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
                <TouchableOpacity
                    onPress={isPlaying ? pause : play}
                    style={styles.playButton}
                    activeOpacity={0.7}
                >
                    <Text style={styles.controlIcon}>{isPlaying ? '⏸' : '▶'}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={next} style={styles.controlButton} activeOpacity={0.7}>
                    <Text style={styles.controlIcon}>⏭</Text>
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
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.md,
        ...theme.shadows.medium,
    },
    trackInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    artwork: {
        width: 50,
        height: 50,
        borderRadius: theme.borderRadius.sm,
        overflow: 'hidden',
        marginRight: theme.spacing.md,
    },
    artworkImage: {
        width: '100%',
        height: '100%',
    },
    artworkPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: theme.colors.surfaceAlt,
        justifyContent: 'center',
        alignItems: 'center',
    },
    artworkPlaceholderText: {
        fontSize: 24,
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
    playButton: {
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.round,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlIcon: {
        fontSize: 20,
        color: theme.colors.text,
    },
});
