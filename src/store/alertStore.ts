/**
 * TuneWell Alert Store
 * 
 * Global alert state for themed custom alerts.
 * Drop-in replacement for React Native's Alert.alert().
 */

import { create } from 'zustand';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];

  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
  hideAlert: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  visible: false,
  title: '',
  message: '',
  buttons: [],

  showAlert: (title, message, buttons) => {
    set({
      visible: true,
      title,
      message,
      buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }],
    });
  },

  hideAlert: () => {
    set({ visible: false, title: '', message: '', buttons: [] });
  },
}));

/**
 * Drop-in replacement for Alert.alert().
 * Usage: showAlert('Title', 'Message', [{ text: 'OK' }])
 */
export const showAlert = (
  title: string,
  message: string = '',
  buttons?: AlertButton[],
) => {
  useAlertStore.getState().showAlert(title, message, buttons);
};
