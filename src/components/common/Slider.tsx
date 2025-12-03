/**
 * TuneWell Slider Component
 * Custom slider for EQ bands and progress bars
 */

import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Animated,
  ViewStyle,
} from 'react-native';
import { Colors, BorderRadius } from '../../theme';

interface SliderProps {
  value: number;
  minimumValue?: number;
  maximumValue?: number;
  onValueChange?: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  disabled?: boolean;
  vertical?: boolean;
  trackColor?: string;
  progressColor?: string;
  thumbColor?: string;
  thumbSize?: number;
  trackHeight?: number;
  showThumb?: boolean;
  style?: ViewStyle;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  minimumValue = 0,
  maximumValue = 1,
  onValueChange,
  onSlidingComplete,
  disabled = false,
  vertical = false,
  trackColor = Colors.background.tertiary,
  progressColor = Colors.primary,
  thumbColor = Colors.white,
  thumbSize = 20,
  trackHeight = 4,
  showThumb = true,
  style,
}) => {
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });
  const animatedValue = React.useRef(new Animated.Value(value)).current;

  React.useEffect(() => {
    animatedValue.setValue(value);
  }, [value, animatedValue]);

  const valueToPosition = useCallback(
    (val: number): number => {
      const normalized = (val - minimumValue) / (maximumValue - minimumValue);
      const size = vertical ? dimensions.height : dimensions.width;
      return normalized * size;
    },
    [minimumValue, maximumValue, dimensions, vertical]
  );

  const positionToValue = useCallback(
    (position: number): number => {
      const size = vertical ? dimensions.height : dimensions.width;
      if (size === 0) return minimumValue;
      
      let normalized = position / size;
      if (vertical) {
        normalized = 1 - normalized; // Invert for vertical
      }
      
      normalized = Math.max(0, Math.min(1, normalized));
      return minimumValue + normalized * (maximumValue - minimumValue);
    },
    [minimumValue, maximumValue, dimensions, vertical]
  );

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: (event) => {
          const position = vertical
            ? event.nativeEvent.locationY
            : event.nativeEvent.locationX;
          const newValue = positionToValue(position);
          animatedValue.setValue(newValue);
          onValueChange?.(newValue);
        },
        onPanResponderMove: (event) => {
          const position = vertical
            ? event.nativeEvent.locationY
            : event.nativeEvent.locationX;
          const newValue = positionToValue(position);
          animatedValue.setValue(newValue);
          onValueChange?.(newValue);
        },
        onPanResponderRelease: (event) => {
          const position = vertical
            ? event.nativeEvent.locationY
            : event.nativeEvent.locationX;
          const finalValue = positionToValue(position);
          onSlidingComplete?.(finalValue);
        },
      }),
    [disabled, vertical, positionToValue, animatedValue, onValueChange, onSlidingComplete]
  );

  const progressPosition = valueToPosition(value);
  const normalizedValue = (value - minimumValue) / (maximumValue - minimumValue);

  const containerStyle = [
    styles.container,
    vertical ? styles.containerVertical : styles.containerHorizontal,
    style,
  ].filter(Boolean) as ViewStyle[];

  const trackStyle = [
    styles.track,
    vertical
      ? { width: trackHeight, height: '100%' as const }
      : { height: trackHeight, width: '100%' as const },
    { backgroundColor: trackColor },
  ] as ViewStyle[];

  const progressStyle = [
    styles.progress,
    vertical
      ? {
          width: trackHeight,
          height: `${normalizedValue * 100}%` as const,
          bottom: 0,
        }
      : {
          height: trackHeight,
          width: `${normalizedValue * 100}%` as const,
        },
    { backgroundColor: progressColor },
  ] as ViewStyle[];

  const thumbStyle = [
    styles.thumb,
    {
      width: thumbSize,
      height: thumbSize,
      borderRadius: thumbSize / 2,
      backgroundColor: thumbColor,
    },
    vertical
      ? {
          bottom: progressPosition - thumbSize / 2,
          left: (trackHeight - thumbSize) / 2,
        }
      : {
          left: progressPosition - thumbSize / 2,
          top: (trackHeight - thumbSize) / 2,
        },
  ] as ViewStyle[];

  return (
    <View
      style={containerStyle}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setDimensions({ width, height });
      }}
      {...panResponder.panHandlers}
    >
      <View style={trackStyle}>
        <View style={progressStyle} />
      </View>
      {showThumb && <View style={thumbStyle} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  containerHorizontal: {
    height: 40,
    width: '100%',
  },
  containerVertical: {
    width: 40,
    height: '100%',
  },
  track: {
    borderRadius: BorderRadius.round,
    overflow: 'hidden',
  },
  progress: {
    position: 'absolute',
    borderRadius: BorderRadius.round,
  },
  thumb: {
    position: 'absolute',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
