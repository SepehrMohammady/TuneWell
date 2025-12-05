/**
 * TuneWell Option Picker Component
 * 
 * A dropdown-style picker for selecting options.
 * Replaces Alert.alert dialogs with a proper UI component.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { useThemeStore } from '../../store';
import { THEME } from '../../config';

interface Option {
  label: string;
  value: string;
}

interface OptionPickerProps {
  title: string;
  options: Option[];
  selectedValue: string;
  onSelect: (value: string) => void;
  visible: boolean;
  onClose: () => void;
}

export default function OptionPicker({
  title,
  options,
  selectedValue,
  onSelect,
  visible,
  onClose,
}: OptionPickerProps) {
  const { colors } = useThemeStore();

  const handleSelect = (value: string) => {
    onSelect(value);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.option,
                  { borderBottomColor: colors.border },
                  item.value === selectedValue && { backgroundColor: colors.surfaceLight },
                ]}
                onPress={() => handleSelect(item.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    item.value === selectedValue && { color: colors.primary },
                  ]}
                >
                  {item.label}
                </Text>
                {item.value === selectedValue && (
                  <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text>
                )}
              </TouchableOpacity>
            )}
            style={styles.list}
          />
          
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.surfaceLight }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    maxHeight: '70%',
    borderRadius: THEME.borderRadius.lg,
    overflow: 'hidden',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
  },
  list: {
    maxHeight: 300,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 16,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: THEME.spacing.md,
    alignItems: 'center',
    marginTop: THEME.spacing.sm,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
