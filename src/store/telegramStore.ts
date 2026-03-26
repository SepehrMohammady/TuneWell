/**
 * TuneWell Telegram Store
 * 
 * Persists Telegram bot configuration, channels, and audio file index.
 * Uses Zustand + MMKV for persistence.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import type { TelegramAudioItem, TelegramBotUser } from '../services/telegram';

export interface TelegramChannel {
  id: number;
  title: string;
  username?: string;
  type: 'channel' | 'group' | 'supergroup';
  audioCount: number;
  lastSyncAt: number;
  photoPath?: string; // cached local path to chat photo
}

export type BotMode = 'tunewell' | 'custom';

interface TelegramState {
  // Bot config
  botToken: string | null;
  botUser: TelegramBotUser | null;
  isConnected: boolean;
  botMode: BotMode;

  // Channels/groups
  channels: TelegramChannel[];

  // Audio index: chatId -> audio items
  audioFiles: Record<number, TelegramAudioItem[]>;

  // Update tracking
  lastUpdateOffset: number;

  // UI
  isSyncing: boolean;

  // Actions
  setBotToken: (token: string | null) => void;
  setBotUser: (user: TelegramBotUser | null) => void;
  setConnected: (connected: boolean) => void;
  setBotMode: (mode: BotMode) => void;

  addChannel: (channel: TelegramChannel) => void;
  removeChannel: (chatId: number) => void;
  updateChannelSync: (chatId: number, audioCount: number) => void;
  setChannelPhoto: (chatId: number, photoPath: string) => void;

  setAudioFiles: (chatId: number, files: TelegramAudioItem[]) => void;
  addAudioFiles: (chatId: number, files: TelegramAudioItem[]) => void;

  setLastUpdateOffset: (offset: number) => void;
  setSyncing: (syncing: boolean) => void;

  disconnect: () => void;
}

export const useTelegramStore = create<TelegramState>()(
  persist(
    (set, get) => ({
      botToken: null,
      botUser: null,
      isConnected: false,
      botMode: 'tunewell' as BotMode,
      channels: [],
      audioFiles: {},
      lastUpdateOffset: 0,
      isSyncing: false,

      setBotToken: (token) => set({ botToken: token }),
      setBotUser: (user) => set({ botUser: user }),
      setConnected: (connected) => set({ isConnected: connected }),
      setBotMode: (mode) => set({ botMode: mode }),

      addChannel: (channel) => {
        const existing = get().channels;
        if (existing.find((c) => c.id === channel.id)) return;
        // Restore audio count if we have cached audio from a previous add
        const cachedAudio = get().audioFiles[channel.id]?.length || 0;
        set({ channels: [...existing, { ...channel, audioCount: cachedAudio || channel.audioCount }] });
      },

      removeChannel: (chatId) => {
        // Only remove from channels list — keep audioFiles so re-adding restores data
        set({
          channels: get().channels.filter((c) => c.id !== chatId),
        });
      },

      updateChannelSync: (chatId, audioCount) => {
        const channels = get().channels.map((c) =>
          c.id === chatId
            ? { ...c, audioCount, lastSyncAt: Date.now() }
            : c,
        );
        set({ channels });
      },

      setChannelPhoto: (chatId, photoPath) => {
        const channels = get().channels.map((c) =>
          c.id === chatId ? { ...c, photoPath } : c,
        );
        set({ channels });
      },

      setAudioFiles: (chatId, files) => {
        set({
          audioFiles: { ...get().audioFiles, [chatId]: files },
        });
      },

      addAudioFiles: (chatId, newFiles) => {
        const existing = get().audioFiles[chatId] || [];
        const existingUniqueIds = new Set(existing.map((f) => f.fileUniqueId));
        const existingMsgIds = new Set(existing.map((f) => `${f.chatId}_${f.messageId}`));
        const unique = newFiles.filter(
          (f) => !existingUniqueIds.has(f.fileUniqueId) && !existingMsgIds.has(`${f.chatId}_${f.messageId}`),
        );
        set({
          audioFiles: {
            ...get().audioFiles,
            [chatId]: [...existing, ...unique],
          },
        });
      },

      setLastUpdateOffset: (offset) => set({ lastUpdateOffset: offset }),
      setSyncing: (syncing) => set({ isSyncing: syncing }),

      disconnect: () => {
        set({
          botToken: null,
          botUser: null,
          isConnected: false,
          botMode: 'tunewell' as BotMode,
          channels: [],
          audioFiles: {},
          lastUpdateOffset: 0,
          isSyncing: false,
        });
      },
    }),
    {
      name: 'tunewell.telegram',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
