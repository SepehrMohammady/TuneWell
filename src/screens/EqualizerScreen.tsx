/**
 * TuneWell Equalizer Screen
 * 
 * 10-band graphic equalizer with:
 * - Preset selection
 * - Custom EQ adjustment
 * - Preamp control
 * - Import/export functionality
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
import { THEME, EQ_FREQUENCIES, EQ_PRESETS } from '../config';
import { useEQStore, BUILT_IN_PRESETS } from '../store';
import { usePlayerStore } from '../store';
import MiniPlayer from '../components/player/MiniPlayer';

const PRESET_NAMES: Record<string, string> = {
  [EQ_PRESETS.FLAT]: 'Flat',
  [EQ_PRESETS.BASS_BOOST]: 'Bass Boost',
  [EQ_PRESETS.TREBLE_BOOST]: 'Treble Boost',
  [EQ_PRESETS.VOCAL]: 'Vocal',
  [EQ_PRESETS.ROCK]: 'Rock',
  [EQ_PRESETS.POP]: 'Pop',
  [EQ_PRESETS.JAZZ]: 'Jazz',
  [EQ_PRESETS.CLASSICAL]: 'Classical',
  [EQ_PRESETS.ELECTRONIC]: 'Electronic',
  [EQ_PRESETS.ACOUSTIC]: 'Acoustic',
  [EQ_PRESETS.CUSTOM]: 'Custom',
};

export default function EqualizerScreen() {
  const { currentTrack } = usePlayerStore();
  const {
    isEnabled,
    currentPreset,
    bands,
    preamp,
    toggleEnabled,
    setPreset,
    setBandGain,
    setPreamp,
    resetToFlat,
  } = useEQStore();

  const formatFrequency = (freq: number): string => {
    if (freq >= 1000) {
      return `${freq / 1000}k`;
    }
    return freq.toString();
  };

  const renderBandSlider = (frequency: number, gain: number, index: number) => {
    // Visual representation of the slider
    const normalizedGain = ((gain + 12) / 24) * 100; // -12 to +12 -> 0 to 100
    
    return (
      <View key={frequency} style={styles.bandContainer}>
        <Text style={styles.bandGain}>{gain > 0 ? '+' : ''}{gain}</Text>
        <View style={styles.sliderTrack}>
          <View style={styles.sliderTrackBg} />
          <View 
            style={[
              styles.sliderFill,
              { 
                height: `${normalizedGain}%`,
                backgroundColor: gain >= 0 ? THEME.colors.primary : THEME.colors.secondary,
              }
            ]} 
          />
          <TouchableOpacity 
            style={[styles.sliderThumb, { bottom: `${normalizedGain - 5}%` }]}
            onPress={() => {
              // In a real app, this would be a gesture-based slider
            }}
          />
        </View>
        <Text style={styles.bandFreq}>{formatFrequency(frequency)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Equalizer</Text>
          <Text style={styles.subtitle}>10-Band Graphic EQ</Text>
        </View>
        <View style={styles.enableToggle}>
          <Text style={styles.enableLabel}>
            {isEnabled ? 'ON' : 'OFF'}
          </Text>
          <Switch
            value={isEnabled}
            onValueChange={toggleEnabled}
            trackColor={{ false: THEME.colors.surface, true: THEME.colors.primary }}
            thumbColor={THEME.colors.text}
          />
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Preamp */}
        <View style={styles.preampSection}>
          <Text style={styles.sectionTitle}>Preamp</Text>
          <View style={styles.preampControl}>
            <TouchableOpacity
              style={styles.preampButton}
              onPress={() => setPreamp(Math.max(-12, preamp - 1))}
            >
              <Text style={styles.preampButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.preampValue}>
              {preamp > 0 ? '+' : ''}{preamp} dB
            </Text>
            <TouchableOpacity
              style={styles.preampButton}
              onPress={() => setPreamp(Math.min(12, preamp + 1))}
            >
              <Text style={styles.preampButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* EQ Bands */}
        <View style={styles.eqSection}>
          <View style={styles.scaleLabels}>
            <Text style={styles.scaleLabel}>+12 dB</Text>
            <Text style={styles.scaleLabel}>0 dB</Text>
            <Text style={styles.scaleLabel}>−12 dB</Text>
          </View>
          <View style={styles.bandsContainer}>
            {bands.map((band, index) => 
              renderBandSlider(band.frequency, band.gain, index)
            )}
          </View>
        </View>

        {/* Presets */}
        <View style={styles.presetsSection}>
          <View style={styles.presetHeader}>
            <Text style={styles.sectionTitle}>Presets</Text>
            <TouchableOpacity onPress={resetToFlat}>
              <Text style={styles.resetButton}>Reset</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.presetsGrid}>
            {Object.keys(BUILT_IN_PRESETS).map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetChip,
                  currentPreset === preset && styles.presetChipActive,
                ]}
                onPress={() => setPreset(preset as any)}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    currentPreset === preset && styles.presetChipTextActive,
                  ]}
                >
                  {PRESET_NAMES[preset]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Custom Presets */}
        <View style={styles.customSection}>
          <Text style={styles.sectionTitle}>Custom Presets</Text>
          <View style={styles.customActions}>
            <TouchableOpacity style={styles.customButton}>
              <Text style={styles.customButtonText}>💾 Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.customButton}>
              <Text style={styles.customButtonText}>📤 Export</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.customButton}>
              <Text style={styles.customButtonText}>📥 Import</Text>
            </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  enableToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  enableLabel: {
    color: THEME.colors.text,
    fontWeight: '600',
    marginRight: THEME.spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: THEME.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  preampSection: {
    marginBottom: THEME.spacing.xl,
  },
  preampControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
  },
  preampButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preampButtonText: {
    fontSize: 24,
    color: THEME.colors.text,
    fontWeight: '600',
  },
  preampValue: {
    fontSize: 20,
    fontWeight: '600',
    color: THEME.colors.text,
    marginHorizontal: THEME.spacing.xl,
    minWidth: 80,
    textAlign: 'center',
  },
  eqSection: {
    flexDirection: 'row',
    marginBottom: THEME.spacing.xl,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
  },
  scaleLabels: {
    justifyContent: 'space-between',
    paddingVertical: THEME.spacing.sm,
    marginRight: THEME.spacing.sm,
  },
  scaleLabel: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
  },
  bandsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bandContainer: {
    alignItems: 'center',
    flex: 1,
  },
  bandGain: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginBottom: 4,
  },
  sliderTrack: {
    width: 20,
    height: 150,
    backgroundColor: THEME.colors.surfaceLight,
    borderRadius: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  sliderTrackBg: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: THEME.colors.textMuted,
  },
  sliderFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 10,
  },
  sliderThumb: {
    position: 'absolute',
    left: 2,
    right: 2,
    height: 16,
    backgroundColor: THEME.colors.text,
    borderRadius: 8,
  },
  bandFreq: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  presetsSection: {
    marginBottom: THEME.spacing.xl,
  },
  presetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resetButton: {
    color: THEME.colors.primary,
    fontWeight: '500',
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: THEME.spacing.sm,
    gap: THEME.spacing.sm,
  },
  presetChip: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  presetChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  presetChipText: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  presetChipTextActive: {
    color: THEME.colors.text,
  },
  customSection: {
    marginBottom: THEME.spacing.xl,
  },
  customActions: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
  },
  customButton: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    paddingVertical: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
  },
  customButtonText: {
    color: THEME.colors.text,
    fontWeight: '500',
    fontSize: 14,
  },
});
