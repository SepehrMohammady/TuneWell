import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Track } from '@/types';
import { theme } from '@/styles/theme';

interface TrackItemProps {
    track: Track;
    onPress: () => void;
}

export function TrackItem({ track, onPress }: TrackItemProps) {
    const formatDuration = (seconds?: number) => {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            {/* Album Artwork */}
            <View style={styles.artworkContainer}>
                {track.artwork ? (
                    <Image
                        source={{ uri: `data:image/jpeg;base64,${track.artwork}` }}
                        style={styles.artwork}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.artwork, styles.placeholderArtwork]}>
                        <Text style={styles.musicIcon}>♪</Text>
                    </View>
                )}
            </View>

            {/* Track Info */}
            <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>
                    {track.title}
                </Text>
                <Text style={styles.artist} numberOfLines={1}>
                    {track.artist}
                </Text>
            </View>

            {/* Duration */}
            {track.duration && (
                <Text style={styles.duration}>{formatDuration(track.duration)}</Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    artworkContainer: {
        marginRight: theme.spacing.md,
    },
    artwork: {
        width: 50,
        height: 50,
        borderRadius: theme.borderRadius.sm,
    },
    placeholderArtwork: {
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    musicIcon: {
        fontSize: 24,
        color: theme.colors.primary,
    },
    info: {
        flex: 1,
    },
    title: {
        ...theme.typography.body,
        color: theme.colors.text,
        marginBottom: 4,
    },
    artist: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
    },
    duration: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        marginLeft: theme.spacing.md,
    },
});
