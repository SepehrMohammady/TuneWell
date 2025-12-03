/**
 * TuneWell Settings Screen
 * 
 * App settings and configuration:
 * - Audio output settings
 * - Library management
 * - Playback preferences
 * - About and version info
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME, VERSION, APP_INFO } from '../config';
import { useSettingsStore, useLibraryStore, usePlayerStore } from '../store';
import MiniPlayer from '../components/player/MiniPlayer';

export default function SettingsScreen() {
  const { currentTrack } = usePlayerStore();
  const settings = useSettingsStore();
  const { scanFolders, lastScanAt, stats } = useLibraryStore();

  const formatDate = (timestamp: number | null | undefined): string => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleDateString();
  };

  const renderSettingRow = (
    label: string,
    value: string | React.ReactNode,
    onPress?: () => void
  ) => (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={styles.settingLabel}>{label}</Text>
      {typeof value === 'string' ? (
        <Text style={styles.settingValue}>{value}</Text>
      ) : (
        value
      )}
    </TouchableOpacity>
  );

  const renderToggleRow = (
    label: string,
    value: boolean,
    onValueChange: (value: boolean) => void
  ) => (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: THEME.colors.surface, true: THEME.colors.primary }}
        thumbColor={THEME.colors.text}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Library Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Library</Text>
          <View style={styles.sectionContent}>
            {renderSettingRow('Music Folders', `${scanFolders.length} folders`)}
            {renderSettingRow('Last Scan', formatDate(lastScanAt))}
            {renderSettingRow('Total Tracks', stats?.totalTracks?.toString() || '0')}
            {renderToggleRow(
              'Auto-scan on Startup',
              settings.autoScanOnStartup,
              settings.setAutoScanOnStartup
            )}
            {renderToggleRow(
              'Watch for Changes',
              settings.watchForChanges,
              settings.setWatchForChanges
            )}
          </View>
        </View>

        {/* Audio Output Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audio Output</Text>
          <View style={styles.sectionContent}>
            {renderSettingRow('Output Device', 'System Default')}
            {renderSettingRow(
              'Sample Rate',
              `${settings.audioOutput.sampleRate / 1000} kHz`
            )}
            {renderSettingRow('Bit Depth', `${settings.audioOutput.bitDepth}-bit`)}
            {renderToggleRow(
              'Exclusive Mode',
              settings.audioOutput.exclusiveMode,
              (value) => settings.setAudioOutput({ exclusiveMode: value })
            )}
            {renderToggleRow(
              'Gapless Playback',
              settings.audioOutput.gaplessPlayback,
              (value) => settings.setAudioOutput({ gaplessPlayback: value })
            )}
            {renderSettingRow('DSD Output', 'PCM Conversion')}
            {renderSettingRow('ReplayGain', 'Off')}
          </View>
        </View>

        {/* Playback Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Playback</Text>
          <View style={styles.sectionContent}>
            {renderToggleRow(
              'Resume on Startup',
              settings.resumeOnStartup,
              settings.setResumeOnStartup
            )}
            {renderToggleRow(
              'Fade on Pause',
              settings.fadeOnPause,
              settings.setFadeOnPause
            )}
            {renderToggleRow(
              'Crossfade',
              settings.crossfade,
              settings.setCrossfade
            )}
            {settings.crossfade && renderSettingRow(
              'Crossfade Duration',
              `${settings.crossfadeDuration / 1000}s`
            )}
          </View>
        </View>

        {/* Display Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Display</Text>
          <View style={styles.sectionContent}>
            {renderSettingRow('Theme', 'Dark')}
            {renderToggleRow(
              'Show Bitrate',
              settings.showBitrate,
              settings.setShowBitrate
            )}
            {renderToggleRow(
              'Show Sample Rate',
              settings.showSampleRate,
              settings.setShowSampleRate
            )}
            {renderSettingRow('Artwork Quality', 'High')}
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.sectionContent}>
            {renderSettingRow('App Name', APP_INFO.name)}
            {renderSettingRow('Version', VERSION.fullVersion)}
            {renderSettingRow('Codename', VERSION.codename)}
            {renderSettingRow('Release Date', VERSION.releaseDate)}
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => {
                // Open GitHub repo
              }}
            >
              <Text style={styles.linkText}>View on GitHub</Text>
              <Text style={styles.linkArrow}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Supported Formats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Supported Formats</Text>
          <View style={styles.formatsGrid}>
            {['FLAC', 'DSD', 'WAV', 'AIFF', 'ALAC', 'MP3', 'AAC', 'OGG', 'APE'].map(
              (format) => (
                <View key={format} style={styles.formatBadge}>
                  <Text style={styles.formatText}>{format}</Text>
                </View>
              )
            )}
          </View>
        </View>

        {/* Spacer for mini player */}
        <View style={{ height: 120 }} />
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
    fontSize: 28,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: THEME.spacing.lg,
  },
  section: {
    marginBottom: THEME.spacing.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: THEME.spacing.sm,
  },
  sectionContent: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  settingLabel: {
    fontSize: 16,
    color: THEME.colors.text,
  },
  settingValue: {
    fontSize: 15,
    color: THEME.colors.textSecondary,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.md,
  },
  linkText: {
    fontSize: 16,
    color: THEME.colors.primary,
  },
  linkArrow: {
    fontSize: 16,
    color: THEME.colors.primary,
  },
  formatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.sm,
  },
  formatBadge: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
  },
  formatText: {
    color: THEME.colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
});
