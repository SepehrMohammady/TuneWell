import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useEQ } from '../contexts/EQContext';

const EqualizerScreen: React.FC = () => {
  const navigation = useNavigation();
  const { eqState, toggleEQ, selectPreset, updateBand, saveCustomPreset, deletePreset, resetToFlat } = useEQ();
  
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [presetName, setPresetName] = useState('');

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      Alert.alert('Error', 'Please enter a preset name');
      return;
    }

    try {
      await saveCustomPreset(presetName.trim());
      setPresetName('');
      setShowSaveModal(false);
      Alert.alert('Success', 'Custom preset saved!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save preset');
    }
  };

  const handleDeletePreset = (presetId: string) => {
    const preset = eqState.presets.find(p => p.id === presetId);
    if (!preset || !preset.isCustom) return;

    Alert.alert(
      'Delete Preset',
      `Are you sure you want to delete "${preset.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deletePreset(presetId)
        },
      ]
    );
  };

  const renderFrequencySlider = (band: any, index: number) => (
    <View key={index} style={styles.sliderContainer}>
      <Text style={styles.frequencyLabel}>{band.label}</Text>
      <View style={styles.sliderWrapper}>
        <Text style={styles.gainLabel}>+12</Text>
        <Slider
          style={styles.verticalSlider}
          minimumValue={-12}
          maximumValue={12}
          value={band.gain}
          onValueChange={(value) => updateBand(index, Math.round(value))}
          minimumTrackTintColor="#4CAF50"
          maximumTrackTintColor="#333333"
          thumbTintColor="#4CAF50"
          step={1}
        />
        <Text style={styles.gainLabel}>-12</Text>
      </View>
      <Text style={styles.gainValue}>{band.gain > 0 ? '+' : ''}{band.gain}dB</Text>
    </View>
  );

  const renderPresetButton = (preset: any) => (
    <TouchableOpacity
      key={preset.id}
      style={[
        styles.presetButton,
        eqState.currentPreset === preset.id && styles.activePresetButton
      ]}
      onPress={() => selectPreset(preset.id)}
    >
      <Text style={[
        styles.presetButtonText,
        eqState.currentPreset === preset.id && styles.activePresetButtonText
      ]}>
        {preset.name}
      </Text>
      {preset.isCustom && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeletePreset(preset.id)}
        >
          <Ionicons name="close-circle" size={20} color="#ff4444" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* EQ Toggle */}
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Equalizer</Text>
          <Switch
            value={eqState.isEnabled}
            onValueChange={toggleEQ}
            trackColor={{ false: '#333333', true: '#4CAF50' }}
            thumbColor={eqState.isEnabled ? '#ffffff' : '#cccccc'}
          />
        </View>

        {eqState.isEnabled && (
          <>
            {/* Preset Buttons */}
            <View style={styles.presetsContainer}>
              <Text style={styles.sectionTitle}>Presets</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {eqState.presets.map(renderPresetButton)}
              </ScrollView>
            </View>

            {/* EQ Controls */}
            <View style={styles.equalizerContainer}>
              <Text style={styles.sectionTitle}>10-Band Equalizer</Text>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.slidersContainer}
              >
                <View style={styles.slidersRow}>
                  {eqState.customBands.map((band, index) => 
                    renderFrequencySlider(band, index)
                  )}
                </View>
              </ScrollView>
            </View>

            {/* Control Buttons */}
            <View style={styles.controlsContainer}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => setShowSaveModal(true)}
              >
                <Ionicons name="save" size={20} color="#ffffff" />
                <Text style={styles.controlButtonText}>Save Preset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, styles.resetButton]}
                onPress={resetToFlat}
              >
                <Ionicons name="refresh" size={20} color="#ffffff" />
                <Text style={styles.controlButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>

            {/* Info */}
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                <Ionicons name="information-circle" size={16} color="#888888" />
                {' '}Equalizer settings are saved automatically
              </Text>
              <Text style={styles.infoText}>
                <Ionicons name="warning" size={16} color="#ff8800" />
                {' '}Audio processing requires development build
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Save Preset Modal */}
      <Modal
        visible={showSaveModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSaveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save Custom Preset</Text>
            
            <TextInput
              style={styles.textInput}
              placeholder="Enter preset name..."
              placeholderTextColor="#888888"
              value={presetName}
              onChangeText={setPresetName}
              maxLength={20}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowSaveModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSavePreset}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
  },
  toggleLabel: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  presetsContainer: {
    marginBottom: 30,
  },
  presetButton: {
    backgroundColor: '#333333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activePresetButton: {
    backgroundColor: '#4CAF50',
  },
  presetButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  activePresetButtonText: {
    color: '#ffffff',
  },
  deleteButton: {
    marginLeft: 8,
  },
  equalizerContainer: {
    marginBottom: 30,
  },
  slidersContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
  },
  slidersRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderContainer: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 60,
  },
  frequencyLabel: {
    color: '#cccccc',
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '500',
  },
  sliderWrapper: {
    height: 200,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verticalSlider: {
    width: 200,
    height: 40,
    transform: [{ rotate: '-90deg' }],
  },

  gainLabel: {
    color: '#888888',
    fontSize: 10,
    fontWeight: '500',
  },
  gainValue: {
    color: '#4CAF50',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  resetButton: {
    backgroundColor: '#ff8800',
  },
  controlButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoContainer: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
  },
  infoText: {
    color: '#888888',
    fontSize: 12,
    marginBottom: 5,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: '#333333',
    color: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#666666',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EqualizerScreen;