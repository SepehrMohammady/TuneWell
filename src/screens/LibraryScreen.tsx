import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useTheme } from '@/styles/theme';
import { useLibraryStore } from '@/store/LibraryStore';
import { usePlayerStore } from '@/store/PlayerStore';
import { FileSystemService } from '@/services/FileSystemService';
import { TrackItem } from '../components/TrackItem';

export function LibraryScreen() {
    const theme = useTheme();
    const { tracks, searchQuery, isLoading, setTracks, setLoading, setSearchQuery, getFilteredTracks } = useLibraryStore();
    const { playTrack } = usePlayerStore();
    const [hasPermission, setHasPermission] = useState(false);

    useEffect(() => {
        checkPermissionsAndLoad();
    }, []);

    async function checkPermissionsAndLoad() {
        try {
            const granted = await FileSystemService.requestPermissions();
            setHasPermission(granted);

            if (granted) {
                await loadTracks();
            } else {
                Alert.alert(
                    'Permission Required',
                    'TuneWell needs permission to access your music files.',
                    [
                        {
                            text: 'Grant Permission',
                            onPress: checkPermissionsAndLoad,
                        },
                        {
                            text: 'Cancel',
                            style: 'cancel',
                        },
                    ]
                );
            }
        } catch (error) {
            console.error('Error checking permissions:', error);
        }
    }

    async function loadTracks() {
        setLoading(true);
        try {
            const audioFiles = await FileSystemService.getAudioFiles();
            setTracks(audioFiles);
        } catch (error) {
            console.error('Error loading tracks:', error);
            Alert.alert('Error', 'Failed to load your music library');
        } finally {
            setLoading(false);
        }
    }

    async function handleTrackPress(track: any, index: number) {
        const filteredTracks = getFilteredTracks();
        await playTrack(track, filteredTracks);
    }

    const filteredTracks = getFilteredTracks();

    const styles = StyleSheet.create({
        container: {
            flex: 1,
        },
        searchContainer: {
            padding: theme.spacing.md,
            backgroundColor: theme.colors.background,
        },
        searchInput: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            color: theme.colors.text,
            fontSize: theme.typography.body.fontSize,
        },
        list: {
            paddingBottom: 200, // Space for player controls and bar
        },
        emptyContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: theme.spacing.xl,
            backgroundColor: theme.colors.background,
        },
        emptyText: {
            color: theme.colors.textSecondary,
            fontSize: theme.typography.body.fontSize,
            textAlign: 'center',
            marginTop: theme.spacing.md,
        },
        button: {
            marginTop: theme.spacing.lg,
            backgroundColor: theme.colors.primary,
            paddingVertical: theme.spacing.md,
            paddingHorizontal: theme.spacing.xl,
            borderRadius: theme.borderRadius.md,
        },
        buttonText: {
            color: '#FFFFFF',
            fontSize: theme.typography.body.fontSize,
            fontWeight: '600',
        },
    });

    if (!hasPermission) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Permission is required to access your music</Text>
                <TouchableOpacity style={styles.button} onPress={checkPermissionsAndLoad}>
                    <Text style={styles.buttonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (isLoading) {
        return (
            <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.emptyText}>Loading your music...</Text>
            </View>
        );
    }

    if (tracks.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No music files found</Text>
                <TouchableOpacity style={styles.button} onPress={loadTracks}>
                    <Text style={styles.buttonText}>Refresh</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search songs, artists, albums..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <FlatList
                data={filteredTracks}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                    <TrackItem track={item} onPress={() => handleTrackPress(item, index)} />
                )}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}
