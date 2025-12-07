/**
 * TuneWell Equalizer Screen
 * 
 * 10-band graphic equalizer with:
 * - Preset selection
 * - Custom EQ adjustment
 * - Preamp control
 * - Import/export functionality
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Switch,
  Alert,
  Modal,
  TextInput,
  PanResponder,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME, EQ_FREQUENCIES, EQ_PRESETS } from '../config';
import { useEQStore, BUILT_IN_PRESETS, useThemeStore } from '../store';
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
  const { colors, mode: themeMode } = useThemeStore();
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

  const [savedPresets, setSavedPresets] = useState<{name: string, bands: typeof bands, preamp: number}[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const sliderHeights = useRef<number[]>(new Array(10).fill(120)).current;

  const formatFrequency = (freq: number): string => {
    if (freq >= 1000) {
      return `${freq / 1000}k`;
    }
    return freq.toString();
  };

  const handleBandAdjust = useCallback((index: number, direction: 'up' | 'down') => {
    const band = bands[index];
    const newGain = direction === 'up' 
      ? Math.min(12, band.gain + 1)
      : Math.max(-12, band.gain - 1);
    setBandGain(band.frequency, newGain);
  }, [bands, setBandGain]);

  const handleSliderTouch = useCallback((index: number, locationY: number, height: number) => {
    // Convert touch position to gain value (-12 to +12)
    // Top of slider = +12, bottom = -12
    const ratio = 1 - (locationY / height); // Invert because Y increases downward
    const gain = Math.round((ratio * 24) - 12);
    const clampedGain = Math.max(-12, Math.min(12, gain));
    setBandGain(bands[index].frequency, clampedGain);
  }, [bands, setBandGain]);

  const handleSavePreset = useCallback(() => {
    setPresetName('');
    setShowSaveModal(true);
  }, []);

  const confirmSavePreset = useCallback(() => {
    if (presetName.trim()) {
      setSavedPresets(prev => [...prev, {
        name: presetName.trim(),
        bands: [...bands],
        preamp,
      }]);
      setShowSaveModal(false);
      Alert.alert('Saved', `Preset "${presetName.trim()}" saved successfully!`);
    }
  }, [presetName, bands, preamp]);

  const handleExportPreset = useCallback(() => {
    const presetData = JSON.stringify({
      bands: bands.map(b => ({ frequency: b.frequency, gain: b.gain })),
      preamp,
    }, null, 2);
    
    Alert.alert(
      'Export Preset',
      `Preset data:\n\n${presetData}\n\n(Copy this to share your EQ settings)`,
      [{ text: 'OK' }]
    );
  }, [bands, preamp]);

  const handleImportPreset = useCallback(() => {
    Alert.alert(
      'Import Preset',
      'Import functionality will be available in a future update.\n\nYou can manually adjust the EQ bands or select a built-in preset.',
      [{ text: 'OK' }]
    );
  }, []);

  const renderBandSlider = (frequency: number, gain: number, index: number) => {
    // Visual representation of the slider
    const normalizedGain = ((gain + 12) / 24) * 100; // -12 to +12 -> 0 to 100
    
    return (
      <View key={frequency} style={styles.bandContainer}>
        <TouchableOpacity 
          style={[styles.bandAdjustButton, { backgroundColor: colors.surface }]}
          onPress={() => handleBandAdjust(index, 'up')}
        >
          <Text style={[styles.bandAdjustText, { color: colors.text }]}>+</Text>
        </TouchableOpacity>
        <Text style={[styles.bandGain, { color: colors.textSecondary }]}>{gain > 0 ? '+' : ''}{gain}</Text>
        <View 
          style={[styles.sliderTrack, { backgroundColor: colors.surfaceLight }]}
          onLayout={(e) => { sliderHeights[index] = e.nativeEvent.layout.height; }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) => handleSliderTouch(index, e.nativeEvent.locationY, sliderHeights[index])}
          onResponderMove={(e) => handleSliderTouch(index, e.nativeEvent.locationY, sliderHeights[index])}
        >
          <View style={[styles.sliderTrackBg, { backgroundColor: colors.textMuted }]} />
          <View 
            style={[
              styles.sliderFill,
              { 
                height: `${normalizedGain}%`,
                backgroundColor: gain >= 0 ? colors.primary : colors.textSecondary,
              }
            ]} 
          />
          <View style={[styles.sliderThumb, { bottom: `${Math.max(0, Math.min(95, normalizedGain - 2.5))}%`, backgroundColor: colors.text }]} />
        </View>
        <TouchableOpacity 
          style={[styles.bandAdjustButton, { backgroundColor: colors.surface }]}
          onPress={() => handleBandAdjust(index, 'down')}
        >
          <Text style={[styles.bandAdjustText, { color: colors.text }]}>−</Text>
        </TouchableOpacity>
        <Text style={[styles.bandFreq, { color: colors.textSecondary }]}>{formatFrequency(frequency)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Equalizer</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>10-Band Graphic EQ</Text>
        </View>
        <View style={styles.enableToggle}>
          <Text style={[styles.enableLabel, { color: colors.text }]}>
            {isEnabled ? 'ON' : 'OFF'}
          </Text>
          <Switch
            value={isEnabled}
            onValueChange={toggleEnabled}
            trackColor={{ false: colors.surface, true: colors.primary }}
            thumbColor={colors.text}
          />
        </View>
      </View>

      {/* EQ Notice */}
      <View style={[styles.noticeContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
          ⓘ EQ may have limited effect on some devices. For best results, use device system EQ or DAC app.
        </Text>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Preamp */}
        <View style={styles.preampSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Preamp</Text>
          <View style={[styles.preampControl, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.preampButton, { backgroundColor: colors.surfaceLight }]}
              onPress={() => setPreamp(Math.max(-12, preamp - 1))}
            >
              <Text style={[styles.preampButtonText, { color: colors.text }]}>−</Text>
            </TouchableOpacity>
            <Text style={[styles.preampValue, { color: colors.text }]}>
              {preamp > 0 ? '+' : ''}{preamp} dB
            </Text>
            <TouchableOpacity
              style={[styles.preampButton, { backgroundColor: colors.surfaceLight }]}
              onPress={() => setPreamp(Math.min(12, preamp + 1))}
            >
              <Text style={[styles.preampButtonText, { color: colors.text }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* EQ Bands */}
        <View style={[styles.eqSection, { backgroundColor: colors.surface }]}>
          <View style={styles.scaleLabels}>
            <Text style={[styles.scaleLabel, { color: colors.textSecondary }]}>+12 dB</Text>
            <Text style={[styles.scaleLabel, { color: colors.textSecondary }]}>0 dB</Text>
            <Text style={[styles.scaleLabel, { color: colors.textSecondary }]}>−12 dB</Text>
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
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Presets</Text>
            <TouchableOpacity onPress={resetToFlat}>
              <Text style={[styles.resetButton, { color: colors.primary }]}>Reset</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.presetsGrid}>
            {Object.keys(BUILT_IN_PRESETS).map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  currentPreset === preset && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setPreset(preset as any)}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    { color: colors.textSecondary },
                    currentPreset === preset && { color: colors.text },
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Custom Presets</Text>
          <View style={styles.customActions}>
            <TouchableOpacity style={[styles.customButton, { backgroundColor: colors.surface }]} onPress={handleSavePreset}>
              <Text style={[styles.customButtonText, { color: colors.text }]}>💾 Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.customButton, { backgroundColor: colors.surface }]} onPress={handleExportPreset}>
              <Text style={[styles.customButtonText, { color: colors.text }]}>📤 Export</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.customButton, { backgroundColor: colors.surface }]} onPress={handleImportPreset}>
              <Text style={[styles.customButtonText, { color: colors.text }]}>📥 Import</Text>
            </TouchableOpacity>
          </View>
          {savedPresets.length > 0 && (
            <View style={[styles.savedPresetsContainer, { backgroundColor: colors.surface }]}>
              <Text style={[styles.savedPresetsTitle, { color: colors.textSecondary }]}>Saved Presets:</Text>
              {savedPresets.map((preset, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.savedPresetItem, { backgroundColor: colors.surfaceLight }]}
                  onPress={() => {
                    preset.bands.forEach((band) => setBandGain(band.frequency, band.gain));
                    setPreamp(preset.preamp);
                    Alert.alert('Applied', `Preset "${preset.name}" applied`);
                  }}
                >
                  <Text style={[styles.savedPresetName, { color: colors.text }]}>{preset.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Spacer for mini player */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Save Preset Modal */}
      <Modal
        visible={showSaveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSaveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Save Preset</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Enter a name for this preset:</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text }]}
              value={presetName}
              onChangeText={setPresetName}
              placeholder="My Custom Preset"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { backgroundColor: colors.surfaceLight }]}
                onPress={() => setShowSaveModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={confirmSavePreset}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  noticeContainer: {
    backgroundColor: THEME.colors.surface,
    marginHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.secondary,
  },
  noticeText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
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
  bandAdjustButton: {
    width: 28,
    height: 28,
    backgroundColor: THEME.colors.surface,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  bandAdjustText: {
    color: THEME.colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  savedPresetsContainer: {
    marginTop: THEME.spacing.md,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.sm,
  },
  savedPresetsTitle: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    marginBottom: THEME.spacing.sm,
  },
  savedPresetItem: {
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    backgroundColor: THEME.colors.surfaceLight,
    borderRadius: THEME.borderRadius.sm,
    marginBottom: THEME.spacing.xs,
  },
  savedPresetName: {
    color: THEME.colors.text,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
    width: '85%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.md,
  },
  modalInput: {
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    color: THEME.colors.text,
    fontSize: 16,
    marginBottom: THEME.spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.surfaceLight,
    alignItems: 'center',
  },
  modalCancelText: {
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: '#6C5CE7', // Purple accent - always visible with white text
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
