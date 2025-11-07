/**
 * EQ Screen - Equalizer settings
 */

import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export function EQScreen() {
  const [selectedPreset, setSelectedPreset] = useState('flat');

  const presets = [
    {id: 'flat', name: 'Flat'},
    {id: 'bass_boost', name: 'Bass Boost'},
    {id: 'treble_boost', name: 'Treble Boost'},
    {id: 'vocal_boost', name: 'Vocal Boost'},
  ];

  return (
    <View style={styles.container}>
      <View style={styles.presetSection}>
        <Text style={styles.sectionTitle}>Presets</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetList}>
          {presets.map(preset => (
            <TouchableOpacity
              key={preset.id}
              style={[
                styles.presetButton,
                selectedPreset === preset.id && styles.presetButtonActive,
              ]}
              onPress={() => setSelectedPreset(preset.id)}>
              <Text
                style={[
                  styles.presetText,
                  selectedPreset === preset.id && styles.presetTextActive,
                ]}>
                {preset.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.presetButton}>
            <Icon name="plus" size={20} color="#1DB954" />
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.visualizerContainer}>
        <Text style={styles.visualizerText}>10-Band Equalizer</Text>
        <View style={styles.bandsContainer}>
          {[32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000].map((freq, index) => (
            <View key={freq} style={styles.bandColumn}>
              <View style={styles.slider}>
                <View style={styles.sliderTrack} />
                <View style={[styles.sliderThumb, {bottom: '50%'}]} />
              </View>
              <Text style={styles.bandLabel}>
                {freq >= 1000 ? `${freq / 1000}k` : freq}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.optionsSection}>
        <TouchableOpacity style={styles.optionRow}>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Bass Boost</Text>
            <Text style={styles.optionDescription}>Enhance low frequencies</Text>
          </View>
          <View style={styles.toggle}>
            <View style={styles.toggleThumb} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionRow}>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Virtualizer</Text>
            <Text style={styles.optionDescription}>Spatial audio effect</Text>
          </View>
          <View style={styles.toggle}>
            <View style={styles.toggleThumb} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionRow}>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Bit-Perfect Mode</Text>
            <Text style={styles.optionDescription}>Bypass all processing</Text>
          </View>
          <View style={styles.toggle}>
            <View style={styles.toggleThumb} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  presetSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  presetList: {
    flexDirection: 'row',
  },
  presetButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    marginRight: 12,
  },
  presetButtonActive: {
    backgroundColor: '#1DB954',
  },
  presetText: {
    color: '#999999',
    fontSize: 14,
    fontWeight: '600',
  },
  presetTextActive: {
    color: '#ffffff',
  },
  visualizerContainer: {
    flex: 1,
    padding: 24,
  },
  visualizerText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    marginBottom: 24,
  },
  bandsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bandColumn: {
    flex: 1,
    alignItems: 'center',
  },
  slider: {
    width: 4,
    height: 200,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
    position: 'relative',
  },
  sliderTrack: {
    position: 'absolute',
    width: '100%',
    top: 0,
    bottom: '50%',
    backgroundColor: '#1DB954',
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    backgroundColor: '#1DB954',
    borderRadius: 8,
    left: -6,
  },
  bandLabel: {
    fontSize: 10,
    color: '#666666',
    marginTop: 8,
  },
  optionsSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  optionDescription: {
    fontSize: 13,
    color: '#999999',
    marginTop: 4,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1a1a1a',
    padding: 3,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#666666',
  },
});
