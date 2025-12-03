/**
 * TuneWell IconButton Component
 * Circular icon button for controls
 */

import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Shadow } from '../../theme';

export type IconButtonSize = 'small' | 'medium' | 'large' | 'xlarge';
export type IconButtonVariant = 'default' | 'primary' | 'filled' | 'outline';

interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  active?: boolean;
  activeColor?: string;
  style?: ViewStyle;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 'medium',
  variant = 'default',
  disabled = false,
  loading = false,
  active = false,
  activeColor,
  style,
}) => {
  const isDisabled = disabled || loading;

  const containerStyles: ViewStyle[] = [
    styles.base,
    styles[`${size}Container`],
    styles[`${variant}Container`],
    active && styles.active,
    active && activeColor ? { backgroundColor: activeColor } : undefined,
    isDisabled && styles.disabled,
    style,
  ].filter(Boolean) as ViewStyle[];

  const getLoadingColor = (): string => {
    if (variant === 'primary' || variant === 'filled') {
      return Colors.white;
    }
    return Colors.primary;
  };

  return (
    <TouchableOpacity
      style={containerStyles}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {loading ? (
        <ActivityIndicator
          color={getLoadingColor()}
          size={size === 'small' ? 'small' : 'small'}
        />
      ) : (
        icon
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.round,
  },

  // Sizes
  smallContainer: {
    width: 32,
    height: 32,
  },
  mediumContainer: {
    width: 44,
    height: 44,
  },
  largeContainer: {
    width: 56,
    height: 56,
  },
  xlargeContainer: {
    width: 72,
    height: 72,
  },

  // Variants
  defaultContainer: {
    backgroundColor: Colors.transparent,
  },
  primaryContainer: {
    backgroundColor: Colors.primary,
    ...Shadow.primary,
  },
  filledContainer: {
    backgroundColor: Colors.background.tertiary,
  },
  outlineContainer: {
    backgroundColor: Colors.transparent,
    borderWidth: 1.5,
    borderColor: Colors.border.primary,
  },

  // States
  active: {
    backgroundColor: Colors.primary,
  },
  disabled: {
    opacity: 0.4,
  },
});
