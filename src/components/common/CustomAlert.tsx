/**
 * TuneWell Custom Alert Component
 * 
 * Themed modal alert that replaces the default Android Alert.alert().
 * Rendered at the app root level, driven by alertStore.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useAlertStore } from '../../store/alertStore';
import { useThemeStore } from '../../store/themeStore';

export default function CustomAlert() {
  const { visible, title, message, buttons, hideAlert } = useAlertStore();
  const { colors } = useThemeStore();

  if (!visible) return null;

  const handlePress = (onPress?: () => void) => {
    hideAlert();
    if (onPress) {
      // Small delay so modal closes smoothly before callback runs
      setTimeout(onPress, 150);
    }
  };

  const getButtonBg = (style?: string) => {
    if (style === 'destructive') return colors.error;
    if (style === 'cancel') return 'transparent';
    return colors.primary;
  };

  const getButtonTextColor = (style?: string) => {
    if (style === 'cancel') return colors.textSecondary;
    if (style === 'destructive') return '#FFFFFF';
    return colors.background; // contrast with primary (white bg → dark text, black bg → light text)
  };

  const getButtonBorder = (style?: string) => {
    if (style === 'cancel') return colors.border;
    return 'transparent';
  };

  // Determine layout: stack vertically for 3+ buttons, row for 1-2
  const isStacked = buttons.length > 2;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={hideAlert}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={hideAlert}>
        <Pressable
          style={[styles.container, { backgroundColor: colors.surface }]}
          onPress={() => {}} // prevent dismiss on content tap
        >
          {title ? (
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          ) : null}
          {message ? (
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {message}
            </Text>
          ) : null}
          <View style={isStacked ? styles.buttonColumn : styles.buttonRow}>
            {buttons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.button,
                  {
                    backgroundColor: getButtonBg(btn.style),
                    borderColor: getButtonBorder(btn.style),
                    borderWidth: btn.style === 'cancel' ? 1 : 0,
                  },
                  isStacked && styles.buttonStacked,
                  !isStacked && i > 0 && { marginLeft: 10 },
                ]}
                onPress={() => handlePress(btn.onPress)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.buttonText,
                    {
                      color: getButtonTextColor(btn.style),
                      fontWeight: btn.style === 'cancel' ? '500' : '600',
                    },
                  ]}
                >
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 20,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  buttonColumn: {
    flexDirection: 'column',
    gap: 8,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonStacked: {
    width: '100%',
  },
  buttonText: {
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
