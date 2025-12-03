/**
 * TuneWell EQ Band Component
 * Vertical slider for a single EQ frequency band
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Slider } from './Slider';
import { Colors, Typography, Spacing } from '../../theme';
import { formatFrequency, formatEQGain } from '../../utils/formatters';
import { getEQBandColor } from '../../theme';

interface EQBandProps {
  frequency: number;
  gain: number;
  bandIndex: number;
  onGainChange: (gain: number) => void;
  disabled?: boolean;
}

export const EQBand: React.FC<EQBandProps> = ({
  frequency,
  gain,
  bandIndex,
  onGainChange,
  disabled = false,
}) => {
  const bandColor = getEQBandColor(bandIndex);

  return (
    <View style={styles.container}>
      <Text style={styles.gainLabel}>{formatEQGain(gain)}</Text>
      
      <View style={styles.sliderContainer}>
        <Slider
          value={gain}
          minimumValue={-12}
          maximumValue={12}
          onValueChange={onGainChange}
          vertical
          disabled={disabled}
          trackColor={Colors.background.tertiary}
          progressColor={bandColor}
          thumbColor={Colors.white}
          thumbSize={16}
          trackHeight={6}
        />
      </View>

      <Text style={styles.frequencyLabel}>{formatFrequency(frequency)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: Spacing.xxs,
  },
  gainLabel: {
    ...Typography.technical,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
    minWidth: 40,
    textAlign: 'center',
  },
  sliderContainer: {
    flex: 1,
    height: 150,
    marginVertical: Spacing.sm,
  },
  frequencyLabel: {
    ...Typography.labelSmall,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
  },
});
