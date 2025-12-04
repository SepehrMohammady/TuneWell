/**
 * TuneWell Settings Screen
 * 
 * App settings and configuration:
 * - Audio output settings
 * - Library management
 * - Playback preferences
 * - About and version info
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME, VERSION, APP_INFO } from '../config';
import { useSettingsStore, useLibraryStore, usePlayerStore, useThemeStore } from '../store';
import type { ThemeMode } from '../store';
import MiniPlayer from '../components/player/MiniPlayer';

// Theme mode labels
const THEME_LABELS: Record<ThemeMode, string> = {
  dark: 'Dark',
  light: 'Light',
  amoled: 'AMOLED Black',
  system: 'System',
};

export default function SettingsScreen() {
  const { currentTrack } = usePlayerStore();
  const settings = useSettingsStore();
  const { scanFolders, lastScanAt, stats } = useLibraryStore();
  const { mode: themeMode, setTheme } = useThemeStore();

  const [selectedSampleRate, setSelectedSampleRate] = useState(settings.audioOutput.sampleRate);
  const [selectedBitDepth, setSelectedBitDepth] = useState(settings.audioOutput.bitDepth);
  const [selectedDsdOutput, setSelectedDsdOutput] = useState('PCM Conversion');
  const [selectedReplayGain, setSelectedReplayGain] = useState('Off');
  const [selectedArtworkQuality, setSelectedArtworkQuality] = useState('High');

  const handleSelectOption = (
    title: string,
    options: string[],
    current: string,
    onSelect: (value: string) => void
  ) => {
    Alert.alert(
      title,
      'Select an option:',
      [
        ...options.map(opt => ({
          text: opt + (opt === current ? ' ✓' : ''),
          onPress: () => onSelect(opt),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  const handleSampleRateSelect = () => {
    handleSelectOption(
      'Sample Rate',
      ['44.1 kHz', '48 kHz', '88.2 kHz', '96 kHz', '176.4 kHz', '192 kHz', '352.8 kHz', '384 kHz'],
      `${selectedSampleRate / 1000} kHz`,
      (value) => {
        const rate = parseFloat(value) * 1000;
        setSelectedSampleRate(rate);
        settings.setAudioOutput({ sampleRate: rate });
      }
    );
  };

  const handleBitDepthSelect = () => {
    handleSelectOption(
      'Bit Depth',
      ['16-bit', '24-bit', '32-bit'],
      `${selectedBitDepth}-bit`,
      (value) => {
        const depth = parseInt(value);
        setSelectedBitDepth(depth);
        settings.setAudioOutput({ bitDepth: depth });
      }
    );
  };

  const handleDsdOutputSelect = () => {
    handleSelectOption(
      'DSD Output',
      ['PCM Conversion', 'DoP (DSD over PCM)', 'Native DSD'],
      selectedDsdOutput,
      setSelectedDsdOutput
    );
  };

  const handleReplayGainSelect = () => {
    handleSelectOption(
      'ReplayGain',
      ['Off', 'Track Gain', 'Album Gain', 'Auto'],
      selectedReplayGain,
      setSelectedReplayGain
    );
  };

  const handleThemeSelect = () => {
    Alert.alert(
      'Theme',
      'Select an option:',
      [
        {
          text: 'Dark' + (themeMode === 'dark' ? ' ✓' : ''),
          onPress: () => setTheme('dark'),
        },
        {
          text: 'Light' + (themeMode === 'light' ? ' ✓' : ''),
          onPress: () => setTheme('light'),
        },
        {
          text: 'AMOLED Black' + (themeMode === 'amoled' ? ' ✓' : ''),
          onPress: () => setTheme('amoled'),
        },
        {
          text: 'System' + (themeMode === 'system' ? ' ✓' : ''),
          onPress: () => setTheme('system'),
        },
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  const handleArtworkQualitySelect = () => {
    handleSelectOption(
      'Artwork Quality',
      ['Low', 'Medium', 'High', 'Original'],
      selectedArtworkQuality,
      setSelectedArtworkQuality
    );
  };

  const handleCrossfadeDuration = () => {
    handleSelectOption(
      'Crossfade Duration',
      ['1s', '2s', '3s', '4s', '5s', '8s', '10s'],
      `${settings.crossfadeDuration / 1000}s`,
      (value) => {
        const duration = parseInt(value) * 1000;
        settings.setCrossfadeDuration(duration);
      }
    );
  };

  const handleMusicFolders = () => {
    Alert.alert(
      'Music Folders',
      scanFolders.length > 0 
        ? `Current folders:\n${scanFolders.join('\n')}\n\nGo to Library tab to manage folders.`
        : 'No folders added yet. Go to Library tab to add folders.',
      [{ text: 'OK' }]
    );
  };

  const handleOutputDevice = () => {
    Alert.alert(
      'Output Device',
      'Currently using system default output.\n\nUSB DAC support will automatically detect and use connected DACs.',
      [{ text: 'OK' }]
    );
  };

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
            {renderSettingRow('Music Folders', `${scanFolders.length} folders`, handleMusicFolders)}
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
            {renderSettingRow('Output Device', 'System Default', handleOutputDevice)}
            {renderSettingRow(
              'Sample Rate',
              `${selectedSampleRate / 1000} kHz`,
              handleSampleRateSelect
            )}
            {renderSettingRow('Bit Depth', `${selectedBitDepth}-bit`, handleBitDepthSelect)}
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
            {renderSettingRow('DSD Output', selectedDsdOutput, handleDsdOutputSelect)}
            {renderSettingRow('ReplayGain', selectedReplayGain, handleReplayGainSelect)}
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
              `${settings.crossfadeDuration / 1000}s`,
              handleCrossfadeDuration
            )}
          </View>
        </View>

        {/* Display Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Display</Text>
          <View style={styles.sectionContent}>
            {renderSettingRow('Theme', THEME_LABELS[themeMode], handleThemeSelect)}
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
            {renderSettingRow('Artwork Quality', selectedArtworkQuality, handleArtworkQualitySelect)}
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.sectionContent}>
            {renderSettingRow('App Name', APP_INFO.name)}
            {renderSettingRow('Version', VERSION.fullVersion)}
            {renderSettingRow('Release Date', VERSION.releaseDate)}
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => {
                Linking.openURL('https://github.com/SepehrMohammady/TuneWell');
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
