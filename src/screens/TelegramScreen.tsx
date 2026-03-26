/**
 * TuneWell Telegram Screen
 * 
 * Manage Telegram integration:
 * - Connect via built-in TuneWellBot or custom bot
 * - Add channels/groups where bot is admin
 * - Auto-discover groups from sync
 * - Sync and browse audio files
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import RNFS from 'react-native-fs';
import { useThemeStore } from '../store/themeStore';
import { useTelegramStore } from '../store/telegramStore';
import type { BotMode } from '../store/telegramStore';
import { telegramService, TUNEWELL_BOT_TOKEN } from '../services/telegram';
import { showAlert } from '../store/alertStore';
import MiniPlayer from '../components/player/MiniPlayer';
import { usePlayerStore } from '../store';

const PHOTO_DIR = `${RNFS.CachesDirectoryPath}/telegram_photos`;

export default function TelegramScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useThemeStore();
  const { currentTrack } = usePlayerStore();
  const {
    botUser, isConnected, channels, audioFiles,
    isSyncing, botMode,
    setBotToken, setBotUser, setConnected, setBotMode,
    addChannel, removeChannel, updateChannelSync, setChannelPhoto,
    addAudioFiles, setLastUpdateOffset, setSyncing,
    disconnect, lastUpdateOffset,
  } = useTelegramStore();

  const [channelInput, setChannelInput] = useState('');
  const [customTokenInput, setCustomTokenInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [showCustomBot, setShowCustomBot] = useState(false);

  // Connect with a token (TuneWellBot or custom)
  const connectWithToken = useCallback(async (token: string, mode: BotMode) => {
    setIsConnecting(true);
    try {
      telegramService.setBotToken(token);
      const bot = await telegramService.verifyToken();
      setBotToken(token);
      setBotUser(bot);
      setBotMode(mode);
      setConnected(true);
      showAlert('Connected', `Bot @${bot.username} is ready!\n\nNow add it to your channels or groups as admin.`);
    } catch (err: any) {
      telegramService.setBotToken(null);
      showAlert('Connection Failed', err.message || 'Could not connect. Check your internet connection.');
    } finally {
      setIsConnecting(false);
    }
  }, [setBotToken, setBotUser, setBotMode, setConnected]);

  const handleConnectTuneWell = useCallback(() => {
    connectWithToken(TUNEWELL_BOT_TOKEN, 'tunewell');
  }, [connectWithToken]);

  const handleConnectCustom = useCallback(() => {
    const token = customTokenInput.trim();
    if (!token) {
      showAlert('Error', 'Please enter a bot token.');
      return;
    }
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
      showAlert('Invalid Token', 'Token format should be like:\n123456789:ABCdefGHIjklMNOpqrSTUvwxYZ');
      return;
    }
    connectWithToken(token, 'custom');
    setCustomTokenInput('');
  }, [customTokenInput, connectWithToken]);

  // Auto-restore connection on mount
  React.useEffect(() => {
    const { botToken, isConnected: connected, botMode: mode } = useTelegramStore.getState();
    const token = mode === 'custom' && botToken ? botToken : TUNEWELL_BOT_TOKEN;

    if (!connected) {
      telegramService.setBotToken(token);
      telegramService.verifyToken()
        .then((bot) => {
          setBotToken(token);
          setBotUser(bot);
          setConnected(true);
        })
        .catch(() => setConnected(false));
    } else {
      telegramService.setBotToken(token);
    }
  }, []);

  // Fetch and cache channel photo
  const fetchChannelPhoto = useCallback(async (chatId: number) => {
    const path = await telegramService.downloadChatPhoto(chatId, PHOTO_DIR);
    if (path) setChannelPhoto(chatId, path);
  }, [setChannelPhoto]);

  // Add channel/group
  const handleAddChannel = useCallback(async () => {
    const input = channelInput.trim();
    if (!input) {
      showAlert('Error', 'Enter a @username or numeric chat ID.');
      return;
    }

    let chatId: string | number = input;
    if (/^-?\d+$/.test(input)) {
      chatId = parseInt(input, 10);
    } else {
      chatId = input.startsWith('@') ? input : `@${input}`;
    }

    setIsAddingChannel(true);
    try {
      const chat = await telegramService.getChat(chatId);

      if (chat.type === 'private') {
        showAlert('Not Supported', 'Private chats are not supported. Please add a channel or group.');
        return;
      }

      if (botUser) {
        const member = await telegramService.getChatMember(chat.id, botUser.id);
        if (member.status === 'left' || member.status === 'kicked') {
          showAlert(
            'Bot Not in Chat',
            `Please add @${botUser.username} as admin to "${chat.title}" first, then try again.`,
          );
          return;
        }
      }

      addChannel({
        id: chat.id,
        title: chat.title || `Chat ${chat.id}`,
        username: chat.username,
        type: chat.type as 'channel' | 'group' | 'supergroup',
        audioCount: 0,
        lastSyncAt: 0,
      });

      // Fetch photo in background
      fetchChannelPhoto(chat.id);

      setChannelInput('');
      const cachedCount = audioFiles[chat.id]?.length || 0;
      if (cachedCount > 0) {
        showAlert('Restored', `"${chat.title}" restored with ${cachedCount} cached audio file${cachedCount !== 1 ? 's' : ''}.`);
      } else {
        showAlert('Added', `"${chat.title}" added. Tap Sync to fetch audio.`);
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Could not find channel/group.');
    } finally {
      setIsAddingChannel(false);
    }
  }, [channelInput, botUser, addChannel, audioFiles, fetchChannelPhoto]);

  // Sync all channels + auto-discover new groups
  const handleSync = useCallback(async () => {
    if (isSyncing) return;
    setSyncing(true);
    let totalNew = 0;

    try {
      const { updates, nextOffset } = await telegramService.getUpdates(
        lastUpdateOffset || undefined,
      );
      setLastUpdateOffset(nextOffset);

      if (updates.length > 0) {
        const audioItems = telegramService.extractAudioFromUpdates(updates);

        // Group by chat
        const byChat: Record<number, typeof audioItems> = {};
        for (const item of audioItems) {
          if (!byChat[item.chatId]) byChat[item.chatId] = [];
          byChat[item.chatId].push(item);
        }

        // Auto-discover: add channels we don't have yet
        const knownIds = new Set(channels.map((c) => c.id));
        for (const chatIdStr of Object.keys(byChat)) {
          const chatId = parseInt(chatIdStr, 10);
          if (!knownIds.has(chatId)) {
            try {
              const chat = await telegramService.getChat(chatId);
              if (chat.type !== 'private') {
                addChannel({
                  id: chat.id,
                  title: chat.title || `Chat ${chat.id}`,
                  username: chat.username,
                  type: chat.type as 'channel' | 'group' | 'supergroup',
                  audioCount: 0,
                  lastSyncAt: 0,
                });
                fetchChannelPhoto(chat.id);
              }
            } catch {
              // Ignore if we can't get chat info
            }
          }
        }

        for (const [chatIdStr, items] of Object.entries(byChat)) {
          const chatId = parseInt(chatIdStr, 10);
          addAudioFiles(chatId, items);
          const existing = audioFiles[chatId]?.length || 0;
          updateChannelSync(chatId, existing + items.length);
          totalNew += items.length;
        }
      }

      // Fetch missing photos
      for (const ch of channels) {
        if (!ch.photoPath) fetchChannelPhoto(ch.id);
      }

      if (totalNew > 0) {
        showAlert('Sync Complete', `Found ${totalNew} new audio file${totalNew !== 1 ? 's' : ''}.`);
      } else {
        showAlert('Up to Date', 'No new audio files found.\n\nSend audio to your channels/groups and sync again.');
      }
    } catch (err: any) {
      showAlert('Sync Error', err.message || 'Failed to sync.');
    } finally {
      setSyncing(false);
    }
  }, [isSyncing, lastUpdateOffset, audioFiles, channels, addChannel, addAudioFiles, updateChannelSync, setLastUpdateOffset, setSyncing, fetchChannelPhoto]);

  // Clear all data
  const handleDisconnect = useCallback(() => {
    showAlert('Clear Telegram Data', 'Remove all channels and synced audio files?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => disconnect(),
      },
    ]);
  }, [disconnect]);

  // Remove channel
  const handleRemoveChannel = useCallback(
    (chatId: number, title: string) => {
      showAlert('Remove', `Remove "${title}" from list?\n\nAudio data is kept — re-add to restore.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeChannel(chatId),
        },
      ]);
    },
    [removeChannel],
  );

  // Channel photo component
  const ChannelPhoto = ({ ch }: { ch: typeof channels[0] }) => {
    if (ch.photoPath) {
      return (
        <Image
          source={{ uri: `file://${ch.photoPath}` }}
          style={styles.channelPhoto}
        />
      );
    }
    return (
      <View style={[styles.channelPhotoFallback, { backgroundColor: '#0088cc' }]}>
        <MaterialCommunityIcons
          name={ch.type === 'channel' ? 'bullhorn' : 'account-group'}
          size={18}
          color="#fff"
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Telegram</Text>
        {isConnected && (
          <TouchableOpacity onPress={handleSync} disabled={isSyncing} style={styles.syncBtn}>
            {isSyncing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialIcons name="sync" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Setup */}
        {!isConnected ? (
          <>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <MaterialCommunityIcons name="send" size={40} color="#0088cc" style={styles.telegramIcon} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>TuneWell Telegram</Text>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                Listen to audio from your Telegram channels and groups right inside TuneWell.
              </Text>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#0088cc' }]}
                onPress={handleConnectTuneWell}
                disabled={isConnecting}
              >
                {isConnecting && !showCustomBot ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Connect with @TuneWellBot</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.customToggle}
                onPress={() => setShowCustomBot(!showCustomBot)}
              >
                <Text style={[styles.customToggleText, { color: colors.textSecondary }]}>
                  {showCustomBot ? 'Hide custom bot' : 'Use your own bot instead'}
                </Text>
                <MaterialIcons
                  name={showCustomBot ? 'expand-less' : 'expand-more'}
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {showCustomBot && (
                <View style={styles.customBotSection}>
                  <Text style={[styles.hint, { color: colors.textMuted }]}>
                    Create a bot via @BotFather on Telegram, then paste the token below.
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surfaceLight, color: colors.text, borderColor: colors.border }]}
                    placeholder="Paste bot token here..."
                    placeholderTextColor={colors.textMuted}
                    value={customTokenInput}
                    onChangeText={setCustomTokenInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                    onPress={handleConnectCustom}
                    disabled={isConnecting}
                  >
                    {isConnecting && showCustomBot ? (
                      <ActivityIndicator size="small" color={colors.background} />
                    ) : (
                      <Text style={[styles.primaryBtnText, { color: colors.background }]}>
                        Connect Custom Bot
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        ) : (
          <>
            {/* Bot Info */}
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.botRow}>
                <MaterialCommunityIcons name="robot" size={24} color="#0088cc" />
                <View style={styles.botInfo}>
                  <Text style={[styles.botName, { color: colors.text }]}>
                    @{botUser?.username || 'TuneWellBot'}
                  </Text>
                  <Text style={[styles.botStatus, { color: colors.success }]}>
                    Connected{botMode === 'custom' ? ' (Custom Bot)' : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleDisconnect}>
                  <MaterialIcons name="delete-outline" size={22} color={colors.error} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.hint, { color: colors.textMuted, marginTop: 10 }]}>
                Add the bot to your channel or group as admin, then add it below.
              </Text>
            </View>

            {/* Add Channel */}
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Add Channel / Group</Text>
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                Enter the @username (public) or numeric ID of a channel/group where the bot is admin.
                {'\n\n'}
                <Text style={{ fontWeight: '600', color: colors.textSecondary }}>Private groups:</Text>
                {' '}Invite links are not supported. Add the bot to the group, then tap Sync — private groups are auto-discovered.
              </Text>
              <View style={styles.addRow}>
                <TextInput
                  style={[styles.input, styles.addInput, { backgroundColor: colors.surfaceLight, color: colors.text, borderColor: colors.border }]}
                  placeholder="@username or -1001234567890"
                  placeholderTextColor={colors.textMuted}
                  value={channelInput}
                  onChangeText={setChannelInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: '#0088cc' }]}
                  onPress={handleAddChannel}
                  disabled={isAddingChannel}
                >
                  {isAddingChannel ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <MaterialIcons name="add" size={24} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Channels List */}
            {channels.length > 0 ? (
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Your Groups/Channels ({channels.length})
                </Text>
                {channels.map((ch) => {
                  const count = audioFiles[ch.id]?.length || 0;
                  return (
                    <TouchableOpacity
                      key={ch.id}
                      style={[styles.channelRow, { borderBottomColor: colors.border }]}
                      onPress={() =>
                        navigation.navigate('TelegramChannelDetail', {
                          chatId: ch.id,
                          title: ch.title,
                        })
                      }
                    >
                      <ChannelPhoto ch={ch} />
                      <View style={styles.channelInfo}>
                        <Text style={[styles.channelTitle, { color: colors.text }]} numberOfLines={1}>
                          {ch.title}
                        </Text>
                        <Text style={[styles.channelMeta, { color: colors.textMuted }]}>
                          {count} audio file{count !== 1 ? 's' : ''}
                          {ch.lastSyncAt > 0
                            ? ` · Synced ${new Date(ch.lastSyncAt).toLocaleDateString()}`
                            : count > 0 ? ' · Cached' : ' · Not synced'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveChannel(ch.id, ch.title)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <MaterialIcons name="close" size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="music-note-plus" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No groups or channels added yet.{'\n'}Add one or tap Sync to auto-discover.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {currentTrack && <MiniPlayer />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', flex: 1 },
  syncBtn: { padding: 4 },
  content: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 100 },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  telegramIcon: { alignSelf: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  cardDesc: { fontSize: 14, lineHeight: 22, marginBottom: 16, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  primaryBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  customToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    gap: 4,
  },
  customToggleText: { fontSize: 13 },
  customBotSection: { marginTop: 14 },
  botRow: { flexDirection: 'row', alignItems: 'center' },
  botInfo: { flex: 1, marginLeft: 12 },
  botName: { fontSize: 16, fontWeight: '600' },
  botStatus: { fontSize: 13, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  hint: { fontSize: 13, marginBottom: 12, lineHeight: 18 },
  addRow: { flexDirection: 'row', gap: 8 },
  addInput: { flex: 1, marginBottom: 0 },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  channelPhoto: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  channelPhotoFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelInfo: { flex: 1 },
  channelTitle: { fontSize: 15, fontWeight: '500' },
  channelMeta: { fontSize: 12, marginTop: 2 },
  emptyState: { alignItems: 'center', marginTop: 48 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 20 },
});
