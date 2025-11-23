import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Track } from '@/types';
import { useTheme } from '@/styles/theme';

interface TrackItemProps {
    track: Track;
    onPress: () => void;
}

export function TrackItem({ track, onPress }: TrackItemProps) {
    const theme = useTheme();
    const [imageError, setImageError] = useState(false);

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const styles = StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            backgroundColor: theme.colors.background,
        },
        artworkContainer: {
            marginRight: theme.spacing.md,
        },
        artwork: {
            width: 48,
            height: 48,
            borderRadius: theme.borderRadius.sm,
            backgroundColor: theme.colors.surface,
        },
        placeholderArtwork: {
            justifyContent: 'center',
            alignItems: 'center',
        },
        musicIcon: {
            fontSize: 20,
            color: theme.colors.textSecondary,
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
            color: theme.colors.textTertiary,
            marginLeft: theme.spacing.md,
        },
    });

    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
            {/* Album Artwork */}
            <View style={styles.artworkContainer}>
                {track.artwork && !imageError ? (
                    <Image
                        source={{ uri: track.artwork.startsWith('data:') ? track.artwork : `data:image/jpeg;base64,${track.artwork}` }}
                        style={styles.artwork}
                        resizeMode="cover"
                        onError={() => setImageError(true)}
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
