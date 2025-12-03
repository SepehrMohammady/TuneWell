/**
 * TuneWell Storage Utility
 * 
 * Shared MMKV storage instance for all stores.
 */

import { MMKV } from 'react-native-mmkv';

// Single shared MMKV instance
let storage: MMKV | null = null;

export function getStorage(): MMKV {
  if (!storage) {
    storage = new MMKV({ id: 'tunewell-storage' });
  }
  return storage;
}

export const zustandStorage = {
  getItem: (name: string): string | null => {
    try {
      const value = getStorage().getString(name);
      return value ?? null;
    } catch (error) {
      console.error('[Storage] getItem error:', error);
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      getStorage().set(name, value);
    } catch (error) {
      console.error('[Storage] setItem error:', error);
    }
  },
  removeItem: (name: string): void => {
    try {
      getStorage().delete(name);
    } catch (error) {
      console.error('[Storage] removeItem error:', error);
    }
  },
};

export default getStorage;
