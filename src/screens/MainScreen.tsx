import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import TrackPlayer, { usePlaybackState, useProgress, Event } from 'react-native-track-player';
import { useTheme } from '@/styles/theme';
import { usePlayerStore } from '@/store/PlayerStore';
import { LibraryScreen } from './LibraryScreen';
import { NowPlayingBar } from '../components/NowPlayingBar';

export function MainScreen() {
    const theme = useTheme();
    const playbackState = usePlaybackState();
    const progress = useProgress();
    const { setPlaying, setProgress, setDuration, setCurrentTrack } = usePlayerStore();

    useEffect(() => {
        // Update progress
        setProgress(progress.position);
        setDuration(progress.duration);
    }, [progress]);

    useEffect(() => {
        // Set up track change listener
        const trackChangedListener = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async ({ index }) => {
            if (index !== undefined && index !== null) {
                const track = await TrackPlayer.getTrack(index);
                if (track) {
                    setCurrentTrack({
                        id: track.url,
                        url: track.url,
                        title: track.title || 'Unknown Title',
                        artist: track.artist || 'Unknown Artist',
                        album: track.album,
                        duration: track.duration,
                        artwork: track.artwork,
                    });
                }
            }
        });

        return () => {
            trackChangedListener.remove();
        };
    }, []);

    useEffect(() => {
        // Update playing state
        const isPlaying = playbackState.state === 'playing';
        setPlaying(isPlaying);
    }, [playbackState]);

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        header: {
            paddingTop: theme.spacing.xl,
            paddingBottom: theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            backgroundColor: theme.colors.background,
        },
        logo: {
            ...theme.typography.h2,
            color: theme.colors.text,
            fontWeight: '700',
        },
    });

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.logo}>TuneWell</Text>
            </View>

            <LibraryScreen />

            <NowPlayingBar />
        </View>
    );
}
