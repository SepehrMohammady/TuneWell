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
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.artwork}>
                {track.artwork ? (
                    <Image source={{ uri: track.artwork }} style={styles.artworkImage} />
                ) : (
                    <View style={styles.artworkPlaceholder}>
                        <Text style={styles.artworkPlaceholderText}>♫</Text>
                    </View>
                )}
            </View>

            <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>
                    {track.title}
                </Text>
                <Text style={styles.artist} numberOfLines={1}>
                    {track.artist}
                </Text>
            </View>

            <Text style={styles.duration}>{formatDuration(track.duration)}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderBottomWidth: 0.5,
        borderBottomColor: theme.colors.border,
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
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    artworkPlaceholderText: {
        fontSize: 24,
        color: theme.colors.textSecondary,
    },
    info: {
        flex: 1,
        marginRight: theme.spacing.md,
    },
    title: {
        color: theme.colors.text,
        fontSize: theme.typography.body.fontSize,
        fontWeight: '500',
        marginBottom: 4,
    },
    artist: {
        color: theme.colors.textSecondary,
        fontSize: theme.typography.caption.fontSize,
    },
    duration: {
        color: theme.colors.textTertiary,
        fontSize: theme.typography.small.fontSize,
    },
});
