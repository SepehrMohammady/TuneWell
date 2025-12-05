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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME, VERSION, APP_INFO } from '../config';
import { useSettingsStore, useLibraryStore, usePlayerStore, useThemeStore } from '../store';
import type { ThemeMode } from '../store';
import MiniPlayer from '../components/player/MiniPlayer';
import OptionPicker from '../components/common/OptionPicker';

// Theme mode options
const THEME_OPTIONS = [
  { label: 'Dark', value: 'dark' },
  { label: 'Light', value: 'light' },
  { label: 'AMOLED Black', value: 'amoled' },
  { label: 'System', value: 'system' },
];

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
  const { mode: themeMode, setTheme, colors } = useThemeStore();

  const [selectedSampleRate, setSelectedSampleRate] = useState(settings.audioOutput.sampleRate);
  const [selectedBitDepth, setSelectedBitDepth] = useState(settings.audioOutput.bitDepth);
  const [selectedDsdOutput, setSelectedDsdOutput] = useState('pcm');
  const [selectedReplayGain, setSelectedReplayGain] = useState('off');
  const [selectedArtworkQuality, setSelectedArtworkQuality] = useState('high');

  // Picker visibility states
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showSampleRatePicker, setShowSampleRatePicker] = useState(false);
  const [showBitDepthPicker, setShowBitDepthPicker] = useState(false);
  const [showDsdOutputPicker, setShowDsdOutputPicker] = useState(false);
  const [showReplayGainPicker, setShowReplayGainPicker] = useState(false);
  const [showArtworkQualityPicker, setShowArtworkQualityPicker] = useState(false);
  const [showCrossfadePicker, setShowCrossfadePicker] = useState(false);

  // Picker options
  const sampleRateOptions = [
    { label: '44.1 kHz', value: '44100' },
    { label: '48 kHz', value: '48000' },
    { label: '88.2 kHz', value: '88200' },
    { label: '96 kHz', value: '96000' },
    { label: '176.4 kHz', value: '176400' },
    { label: '192 kHz', value: '192000' },
    { label: '352.8 kHz', value: '352800' },
    { label: '384 kHz', value: '384000' },
  ];

  const bitDepthOptions = [
    { label: '16-bit', value: '16' },
    { label: '24-bit', value: '24' },
    { label: '32-bit', value: '32' },
  ];

  const dsdOutputOptions = [
    { label: 'PCM Conversion', value: 'pcm' },
    { label: 'DoP (DSD over PCM)', value: 'dop' },
    { label: 'Native DSD', value: 'native' },
  ];

  const replayGainOptions = [
    { label: 'Off', value: 'off' },
    { label: 'Track Gain', value: 'track' },
    { label: 'Album Gain', value: 'album' },
    { label: 'Auto', value: 'auto' },
  ];

  const artworkQualityOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Original', value: 'original' },
  ];

  const crossfadeOptions = [
    { label: '1 second', value: '1000' },
    { label: '2 seconds', value: '2000' },
    { label: '3 seconds', value: '3000' },
    { label: '4 seconds', value: '4000' },
    { label: '5 seconds', value: '5000' },
    { label: '8 seconds', value: '8000' },
    { label: '10 seconds', value: '10000' },
  ];

  const getDsdOutputLabel = (value: string) => {
    return dsdOutputOptions.find(o => o.value === value)?.label || 'PCM Conversion';
  };

  const getReplayGainLabel = (value: string) => {
    return replayGainOptions.find(o => o.value === value)?.label || 'Off';
  };

  const getArtworkQualityLabel = (value: string) => {
    return artworkQualityOptions.find(o => o.value === value)?.label || 'High';
  };

  const handleMusicFolders = () => {
    // Navigate to folder selection or show info
  };

  const handleOutputDevice = () => {
    // Show output device info
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
      style={[styles.settingRow, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
      {typeof value === 'string' ? (
        <View style={styles.valueContainer}>
          <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{value}</Text>
          {onPress && <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>}
        </View>
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
    <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.surface, true: colors.primary }}
        thumbColor={colors.text}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Library Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Library</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
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
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Audio Output</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
            {renderSettingRow('Output Device', 'System Default', handleOutputDevice)}
            {renderSettingRow(
              'Sample Rate',
              `${selectedSampleRate / 1000} kHz`,
              () => setShowSampleRatePicker(true)
            )}
            {renderSettingRow('Bit Depth', `${selectedBitDepth}-bit`, () => setShowBitDepthPicker(true))}
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
            {renderSettingRow('DSD Output', getDsdOutputLabel(selectedDsdOutput), () => setShowDsdOutputPicker(true))}
            {renderSettingRow('ReplayGain', getReplayGainLabel(selectedReplayGain), () => setShowReplayGainPicker(true))}
          </View>
        </View>

        {/* Playback Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Playback</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
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
              () => setShowCrossfadePicker(true)
            )}
          </View>
        </View>

        {/* Display Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Display</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
            {renderSettingRow('Theme', THEME_LABELS[themeMode], () => setShowThemePicker(true))}
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
            {renderSettingRow('Artwork Quality', getArtworkQualityLabel(selectedArtworkQuality), () => setShowArtworkQualityPicker(true))}
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>About</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
            {renderSettingRow('App Name', APP_INFO.name)}
            {renderSettingRow('Version', VERSION.fullVersion)}
            {renderSettingRow('Release Date', VERSION.releaseDate)}
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => {
                Linking.openURL('https://github.com/SepehrMohammady/TuneWell');
              }}
            >
              <Text style={[styles.linkText, { color: colors.primary }]}>View on GitHub</Text>
              <Text style={[styles.linkArrow, { color: colors.primary }]}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Supported Formats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Supported Formats</Text>
          <View style={styles.formatsGrid}>
            {['FLAC', 'DSD', 'WAV', 'AIFF', 'ALAC', 'MP3', 'AAC', 'OGG', 'APE'].map(
              (format) => (
                <View key={format} style={[styles.formatBadge, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.formatText, { color: colors.text }]}>{format}</Text>
                </View>
              )
            )}
          </View>
        </View>

        {/* Spacer for mini player */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Option Pickers */}
      <OptionPicker
        title="Theme"
        options={THEME_OPTIONS}
        selectedValue={themeMode}
        onSelect={(value) => setTheme(value as ThemeMode)}
        visible={showThemePicker}
        onClose={() => setShowThemePicker(false)}
      />

      <OptionPicker
        title="Sample Rate"
        options={sampleRateOptions}
        selectedValue={selectedSampleRate.toString()}
        onSelect={(value) => {
          const rate = parseInt(value);
          setSelectedSampleRate(rate);
          settings.setAudioOutput({ sampleRate: rate });
        }}
        visible={showSampleRatePicker}
        onClose={() => setShowSampleRatePicker(false)}
      />

      <OptionPicker
        title="Bit Depth"
        options={bitDepthOptions}
        selectedValue={selectedBitDepth.toString()}
        onSelect={(value) => {
          const depth = parseInt(value);
          setSelectedBitDepth(depth);
          settings.setAudioOutput({ bitDepth: depth });
        }}
        visible={showBitDepthPicker}
        onClose={() => setShowBitDepthPicker(false)}
      />

      <OptionPicker
        title="DSD Output"
        options={dsdOutputOptions}
        selectedValue={selectedDsdOutput}
        onSelect={setSelectedDsdOutput}
        visible={showDsdOutputPicker}
        onClose={() => setShowDsdOutputPicker(false)}
      />

      <OptionPicker
        title="ReplayGain"
        options={replayGainOptions}
        selectedValue={selectedReplayGain}
        onSelect={setSelectedReplayGain}
        visible={showReplayGainPicker}
        onClose={() => setShowReplayGainPicker(false)}
      />

      <OptionPicker
        title="Artwork Quality"
        options={artworkQualityOptions}
        selectedValue={selectedArtworkQuality}
        onSelect={setSelectedArtworkQuality}
        visible={showArtworkQualityPicker}
        onClose={() => setShowArtworkQualityPicker(false)}
      />

      <OptionPicker
        title="Crossfade Duration"
        options={crossfadeOptions}
        selectedValue={settings.crossfadeDuration.toString()}
        onSelect={(value) => {
          settings.setCrossfadeDuration(parseInt(value));
        }}
        visible={showCrossfadePicker}
        onClose={() => setShowCrossfadePicker(false)}
      />

      {/* Mini Player */}
      {currentTrack && <MiniPlayer />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: THEME.spacing.sm,
  },
  sectionContent: {
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
  },
  settingLabel: {
    fontSize: 16,
    flex: 1,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 15,
  },
  chevron: {
    fontSize: 20,
    marginLeft: THEME.spacing.xs,
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
  },
  linkArrow: {
    fontSize: 16,
  },
  formatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.sm,
  },
  formatBadge: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
  },
  formatText: {
    fontWeight: '600',
    fontSize: 13,
  },
});
