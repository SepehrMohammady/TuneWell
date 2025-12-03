/**
 * TuneWell Home Screen
 * 
 * Main landing screen showing:
 * - Now playing mini player
 * - Recently played
 * - Quick access to favorites and playlists
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { THEME, ROUTES, VERSION } from '../config';
import { usePlayerStore } from '../store';
import MiniPlayer from '../components/player/MiniPlayer';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { currentTrack } = usePlayerStore();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>TuneWell</Text>
        <Text style={styles.subtitle}>v{VERSION.versionString}</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate(ROUTES.LIBRARY as never)}
            >
              <Text style={styles.quickActionIcon}>📚</Text>
              <Text style={styles.quickActionText}>Library</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate(ROUTES.PLAYLISTS as never)}
            >
              <Text style={styles.quickActionIcon}>❤️</Text>
              <Text style={styles.quickActionText}>Favorites</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate(ROUTES.EQUALIZER as never)}
            >
              <Text style={styles.quickActionIcon}>🎛️</Text>
              <Text style={styles.quickActionText}>Equalizer</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate(ROUTES.SETTINGS as never)}
            >
              <Text style={styles.quickActionIcon}>📁</Text>
              <Text style={styles.quickActionText}>Folders</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recently Played */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Played</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🎵</Text>
            <Text style={styles.emptyStateText}>No recently played tracks</Text>
            <Text style={styles.emptyStateSubtext}>
              Add folders to your library to start listening
            </Text>
          </View>
        </View>

        {/* Mood Playlists */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mood Playlists</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.moodContainer}
          >
            {[
              { id: 'happy', name: 'Happy', icon: '😊', color: '#FFD700' },
              { id: 'calm', name: 'Calm', icon: '🌿', color: '#90EE90' },
              { id: 'energetic', name: 'Energetic', icon: '⚡', color: '#FF4500' },
              { id: 'focus', name: 'Focus', icon: '🎯', color: '#4169E1' },
              { id: 'romantic', name: 'Romantic', icon: '💕', color: '#FF69B4' },
              { id: 'dreamy', name: 'Dreamy', icon: '🌙', color: '#9370DB' },
            ].map((mood) => (
              <TouchableOpacity
                key={mood.id}
                style={[styles.moodCard, { borderColor: mood.color }]}
              >
                <Text style={styles.moodIcon}>{mood.icon}</Text>
                <Text style={styles.moodName}>{mood.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Audio Quality Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audio Quality</Text>
          <View style={styles.qualityCard}>
            <View style={styles.qualityItem}>
              <Text style={styles.qualityLabel}>Supported Formats</Text>
              <Text style={styles.qualityValue}>FLAC, DSD, WAV, MP3, AAC</Text>
            </View>
            <View style={styles.qualityItem}>
              <Text style={styles.qualityLabel}>High-Res Audio</Text>
              <Text style={styles.qualityValue}>Up to 32-bit/384kHz, DSD512</Text>
            </View>
            <View style={styles.qualityItem}>
              <Text style={styles.qualityLabel}>DAC Support</Text>
              <Text style={styles.qualityValue}>USB DAC, Bluetooth HD</Text>
            </View>
          </View>
        </View>

        {/* Spacer for mini player */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Mini Player */}
      {currentTrack && <MiniPlayer />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: THEME.spacing.lg,
  },
  section: {
    marginBottom: THEME.spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: THEME.colors.text,
    fontWeight: '500',
  },
  emptyState: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.xl,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: THEME.spacing.md,
  },
  emptyStateText: {
    fontSize: 16,
    color: THEME.colors.text,
    fontWeight: '500',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  moodContainer: {
    paddingRight: THEME.spacing.lg,
  },
  moodCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
    marginRight: THEME.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    minWidth: 100,
  },
  moodIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  moodName: {
    fontSize: 14,
    color: THEME.colors.text,
    fontWeight: '500',
  },
  qualityCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
  },
  qualityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  qualityLabel: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
  },
  qualityValue: {
    fontSize: 14,
    color: THEME.colors.text,
    fontWeight: '500',
  },
});
