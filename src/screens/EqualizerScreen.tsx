import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { EqualizerPreset } from '../types/navigation';

const FREQUENCY_BANDS = [
  { freq: '32Hz', default: 0 },
  { freq: '64Hz', default: 0 },
  { freq: '125Hz', default: 0 },
  { freq: '250Hz', default: 0 },
  { freq: '500Hz', default: 0 },
  { freq: '1kHz', default: 0 },
  { freq: '2kHz', default: 0 },
  { freq: '4kHz', default: 0 },
  { freq: '8kHz', default: 0 },
  { freq: '16kHz', default: 0 },
];

const PRESET_EQUALIZERS: EqualizerPreset[] = [
  {
    id: 'flat',
    name: 'Flat',
    gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    isCustom: false,
  },
  {
    id: 'rock',
    name: 'Rock',
    gains: [3, 2, -1, -2, -1, 1, 4, 5, 6, 6],
    isCustom: false,
  },
  {
    id: 'jazz',
    name: 'Jazz',
    gains: [2, 1, 1, 2, -1, -1, 0, 1, 2, 3],
    isCustom: false,
  },
  {
    id: 'classical',
    name: 'Classical',
    gains: [3, 2, -1, -2, -2, -1, -1, 0, 2, 3],
    isCustom: false,
  },
  {
    id: 'electronic',
    name: 'Electronic',
    gains: [4, 3, 1, 0, -2, 2, 0, 1, 4, 5],
    isCustom: false,
  },
  {
    id: 'vocal',
    name: 'Vocal',
    gains: [-2, -1, -1, 1, 3, 3, 2, 1, 0, -1],
    isCustom: false,
  },
  {
    id: 'bass_boost',
    name: 'Bass Boost',
    gains: [6, 5, 4, 3, 1, 0, -1, -1, -1, -1],
    isCustom: false,
  },
  {
    id: 'treble_boost',
    name: 'Treble Boost',
    gains: [-1, -1, -1, 0, 1, 2, 3, 4, 5, 6],
    isCustom: false,
  },
];

const EqualizerScreen: React.FC = () => {
  const navigation = useNavigation();
  
  const [isEnabled, setIsEnabled] = useState(true);
  const [currentPreset, setCurrentPreset] = useState<EqualizerPreset>(PRESET_EQUALIZERS[0]);
  const [gains, setGains] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [customPresets, setCustomPresets] = useState<EqualizerPreset[]>([]);

  useEffect(() => {
    // Load saved equalizer settings
    loadSavedSettings();
  }, []);

  const loadSavedSettings = async () => {
    try {
      // In a real app, load from AsyncStorage or similar
      // For now, use default settings
      console.log('Loading saved EQ settings...');
    } catch (error) {
      console.error('Error loading EQ settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      // In a real app, save to AsyncStorage or similar
      console.log('Saving EQ settings...');
      Alert.alert('Success', 'Equalizer settings saved successfully');
    } catch (error) {
      console.error('Error saving EQ settings:', error);
      Alert.alert('Error', 'Could not save equalizer settings');
    }
  };

  const applyPreset = (preset: EqualizerPreset) => {
    setCurrentPreset(preset);
    setGains([...preset.gains]);
  };

  const updateGain = (index: number, value: number) => {
    const newGains = [...gains];
    newGains[index] = value;
    setGains(newGains);
    
    // Create custom preset if gains don't match current preset
    const isCustom = !PRESET_EQUALIZERS.some(preset => 
      JSON.stringify(preset.gains) === JSON.stringify(newGains)
    );
    
    if (isCustom) {
      setCurrentPreset({
        id: 'custom',
        name: 'Custom',
        gains: newGains,
        isCustom: true,
      });
    }
  };

  const resetEqualizer = () => {
    Alert.alert(
      'Reset Equalizer',
      'This will reset all frequency bands to 0. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset',
          style: 'destructive',
          onPress: () => applyPreset(PRESET_EQUALIZERS[0])
        },
      ]
    );
  };

  const saveAsCustomPreset = () => {
    Alert.prompt(
      'Save Custom Preset',
      'Enter a name for this preset:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: (name?: string) => {
            if (name && name.trim()) {
              const newPreset: EqualizerPreset = {
                id: `custom_${Date.now()}`,
                name: name.trim(),
                gains: [...gains],
                isCustom: true,
              };
              setCustomPresets(prev => [...prev, newPreset]);
              Alert.alert('Success', 'Custom preset saved successfully');
            }
          }
        },
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const renderFrequencySlider = (index: number) => {
    const band = FREQUENCY_BANDS[index];
    const gain = gains[index];
    
    return (
      <View key={index} style={styles.sliderContainer}>
        <Text style={styles.gainValue}>
          {gain > 0 ? '+' : ''}{gain.toFixed(1)}dB
        </Text>
        
        <View style={styles.sliderWrapper}>
          <Slider
            style={styles.slider}
            minimumValue={-12}
            maximumValue={12}
            value={gain}
            onValueChange={(value) => updateGain(index, Math.round(value * 2) / 2)}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#333333"
          />
        </View>
        
        <Text style={styles.frequencyLabel}>{band.freq}</Text>
      </View>
    );
  };

  const renderPresetButton = (preset: EqualizerPreset) => {
    const isActive = currentPreset.id === preset.id;
    
    return (
      <TouchableOpacity
        key={preset.id}
        style={[styles.presetButton, isActive && styles.activePresetButton]}
        onPress={() => applyPreset(preset)}
      >
        <Text style={[
          styles.presetButtonText,
          isActive && styles.activePresetButtonText
        ]}>
          {preset.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.enableContainer}>
          <Text style={styles.enableLabel}>Enable Equalizer</Text>
          <Switch
            value={isEnabled}
            onValueChange={setIsEnabled}
            trackColor={{ false: '#333333', true: '#007AFF' }}
            thumbColor={isEnabled ? '#ffffff' : '#666666'}
          />
        </View>
        
        <View style={styles.currentPreset}>
          <Text style={styles.currentPresetLabel}>Current Preset:</Text>
          <Text style={styles.currentPresetName}>{currentPreset.name}</Text>
        </View>
      </View>

      <View style={[styles.equalizerContainer, !isEnabled && styles.disabled]}>
        <View style={styles.frequencySliders}>
          {FREQUENCY_BANDS.map((_, index) => renderFrequencySlider(index))}
        </View>
      </View>

      <View style={styles.presetsSection}>
        <Text style={styles.sectionTitle}>Presets</Text>
        <View style={styles.presetGrid}>
          {PRESET_EQUALIZERS.map(renderPresetButton)}
        </View>
        
        {customPresets.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Custom Presets</Text>
            <View style={styles.presetGrid}>
              {customPresets.map(renderPresetButton)}
            </View>
          </>
        )}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={saveAsCustomPreset}
          disabled={!isEnabled}
        >
          <Ionicons name="bookmark-outline" size={20} color="#ffffff" />
          <Text style={styles.actionButtonText}>Save Preset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={resetEqualizer}
          disabled={!isEnabled}
        >
          <Ionicons name="refresh-outline" size={20} color="#ffffff" />
          <Text style={styles.actionButtonText}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.saveButton]}
          onPress={saveSettings}
        >
          <Ionicons name="checkmark" size={20} color="#ffffff" />
          <Text style={styles.actionButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Professional Audio Enhancement</Text>
        <Text style={styles.infoText}>
          Fine-tune your audio experience with precise frequency control. 
          Designed for use with professional DACs and high-end audio equipment.
        </Text>
        <Text style={styles.infoText}>
          • 10-band graphic equalizer with ±12dB range
        </Text>
        <Text style={styles.infoText}>
          • Optimized for lossless formats (FLAC, DSD)
        </Text>
        <Text style={styles.infoText}>
          • Low-latency processing for real-time adjustment
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  enableContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  enableLabel: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
  },
  currentPreset: {
    alignItems: 'center',
  },
  currentPresetLabel: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 4,
  },
  currentPresetName: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  equalizerContainer: {
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  disabled: {
    opacity: 0.5,
  },
  frequencySliders: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 280,
  },
  sliderContainer: {
    alignItems: 'center',
    flex: 1,
  },
  gainValue: {
    fontSize: 12,
    color: '#cccccc',
    fontWeight: '600',
    marginBottom: 10,
    height: 18,
    textAlign: 'center',
  },
  sliderWrapper: {
    height: 200,
    justifyContent: 'center',
  },
  slider: {
    width: 200,
    height: 30,
    transform: [{ rotate: '-90deg' }],
  },
  sliderThumb: {
    backgroundColor: '#007AFF',
    width: 20,
    height: 20,
  },
  frequencyLabel: {
    fontSize: 11,
    color: '#666666',
    marginTop: 10,
    textAlign: 'center',
    transform: [{ rotate: '-45deg' }],
  },
  presetsSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 15,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  presetButton: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    margin: 4,
    borderWidth: 1,
    borderColor: '#333333',
  },
  activePresetButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  presetButtonText: {
    color: '#cccccc',
    fontSize: 14,
    fontWeight: '500',
  },
  activePresetButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#1a1a1a',
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  infoTitle: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
    marginBottom: 6,
  },
});

export default EqualizerScreen;