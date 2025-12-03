/**
 * TuneWell Button Component
 * Reusable button with multiple variants
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
}) => {
  const isDisabled = disabled || loading;

  const containerStyles: ViewStyle[] = [
    styles.base,
    styles[`${variant}Container`],
    styles[`${size}Container`],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ].filter(Boolean) as ViewStyle[];

  const textStyles: TextStyle[] = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    isDisabled && styles.disabledText,
    textStyle,
  ].filter(Boolean) as TextStyle[];

  const getLoadingColor = (): string => {
    switch (variant) {
      case 'primary':
        return Colors.white;
      case 'secondary':
        return Colors.primary;
      case 'outline':
      case 'ghost':
        return Colors.primary;
      case 'danger':
        return Colors.white;
      default:
        return Colors.white;
    }
  };

  return (
    <TouchableOpacity
      style={containerStyles}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={getLoadingColor()} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          <Text style={textStyles}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.button,
  },

  // Variants
  primaryContainer: {
    backgroundColor: Colors.primary,
    ...Shadow.primary,
  },
  secondaryContainer: {
    backgroundColor: Colors.background.tertiary,
  },
  outlineContainer: {
    backgroundColor: Colors.transparent,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  ghostContainer: {
    backgroundColor: Colors.transparent,
  },
  dangerContainer: {
    backgroundColor: Colors.error,
  },

  // Sizes
  smallContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 32,
  },
  mediumContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 44,
  },
  largeContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    minHeight: 52,
  },

  // Text
  text: {
    textAlign: 'center',
  },
  primaryText: {
    ...Typography.labelLarge,
    color: Colors.white,
  },
  secondaryText: {
    ...Typography.labelLarge,
    color: Colors.text.primary,
  },
  outlineText: {
    ...Typography.labelLarge,
    color: Colors.primary,
  },
  ghostText: {
    ...Typography.labelLarge,
    color: Colors.primary,
  },
  dangerText: {
    ...Typography.labelLarge,
    color: Colors.white,
  },

  // Size text
  smallText: {
    ...Typography.labelSmall,
  },
  mediumText: {
    ...Typography.labelMedium,
  },
  largeText: {
    ...Typography.labelLarge,
  },

  // States
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: Colors.text.disabled,
  },

  // Layout
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
});
