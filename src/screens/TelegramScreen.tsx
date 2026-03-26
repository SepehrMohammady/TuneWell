/**
 * TuneWell Telegram Screen
 * 
 * Manage Telegram integration:
 * - Connect via user's own custom bot
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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import RNFS from 'react-native-fs';
import { useThemeStore } from '../store/themeStore';
import { useTelegramStore } from '../store/telegramStore';
import { telegramService } from '../services/telegram';
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
    isSyncing,
    setBotToken, setBotUser, setConnected,
    addChannel, removeChannel, updateChannelSync, setChannelPhoto,
    addAudioFiles, setLastUpdateOffset, setSyncing,
    disconnect, lastUpdateOffset,
  } = useTelegramStore();

  const [channelInput, setChannelInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAddingChannel, setIsAddingChannel] = useState(false);

  // Connect with user's bot token
  const handleConnect = useCallback(async () => {
    const token = tokenInput.trim();
    if (!token) {
      showAlert('Error', 'Please enter your bot token.');
      return;
    }
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
      showAlert('Invalid Token', 'Token format should be like:\n123456789:ABCdefGHIjklMNOpqrSTUvwxYZ');
      return;
    }
    setIsConnecting(true);
    try {
      telegramService.setBotToken(token);
      const bot = await telegramService.verifyToken();
      setBotToken(token);
      setBotUser(bot);
      setConnected(true);
      showAlert('Connected', `Bot @${bot.username} is ready!\n\nNow add it to your channels or groups as admin, then tap Sync.`);
    } catch (err: any) {
      telegramService.setBotToken(null);
      showAlert('Connection Failed', err.message || 'Could not verify the token. Check it and try again.');
    } finally {
      setIsConnecting(false);
    }
  }, [tokenInput, setBotToken, setBotUser, setConnected]);

  // Auto-restore connection on mount
  React.useEffect(() => {
    const { botToken, isConnected: connected } = useTelegramStore.getState();
    if (connected && botToken) {
      telegramService.setBotToken(botToken);
    } else if (botToken) {
      telegramService.setBotToken(botToken);
      telegramService.verifyToken()
        .then((bot) => {
          setBotUser(bot);
          setConnected(true);
        })
        .catch(() => setConnected(false));
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
        // Auto-discover: detect ALL chats from any update type
        const discoveredChats = telegramService.extractChatsFromUpdates(updates);
        const knownIds = new Set(channels.map((c) => c.id));
        let discovered = 0;
        for (const chat of discoveredChats) {
          if (!knownIds.has(chat.id) && chat.type !== 'private') {
            addChannel({
              id: chat.id,
              title: chat.title || `Chat ${chat.id}`,
              username: chat.username,
              type: chat.type as 'channel' | 'group' | 'supergroup',
              audioCount: 0,
              lastSyncAt: 0,
            });
            knownIds.add(chat.id);
            fetchChannelPhoto(chat.id);
            discovered++;
          }
        }

        const audioItems = telegramService.extractAudioFromUpdates(updates);

        // Group by chat
        const byChat: Record<number, typeof audioItems> = {};
        for (const item of audioItems) {
          if (!byChat[item.chatId]) byChat[item.chatId] = [];
          byChat[item.chatId].push(item);
        }

        for (const [chatIdStr, items] of Object.entries(byChat)) {
          const chatId = parseInt(chatIdStr, 10);
          addAudioFiles(chatId, items);
          const existing = audioFiles[chatId]?.length || 0;
          updateChannelSync(chatId, existing + items.length);
          totalNew += items.length;
        }

        if (discovered > 0 && totalNew === 0) {
          showAlert('Groups Found', `Discovered ${discovered} new group${discovered !== 1 ? 's' : ''}. Send audio there and sync again.`);
          return;
        }
      }

      // Auto-restore: re-add groups that have cached audio but were removed from list
      const currentIds = new Set(channels.map((c) => c.id));
      const orphanedIds = Object.keys(audioFiles)
        .map(Number)
        .filter((id) => !currentIds.has(id) && audioFiles[id]?.length > 0);
      let restored = 0;
      for (const orphanId of orphanedIds) {
        try {
          const chat = await telegramService.getChat(orphanId);
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
            restored++;
          }
        } catch {
          // Bot may no longer be in this chat
        }
      }

      // Fetch missing photos
      for (const ch of channels) {
        if (!ch.photoPath) fetchChannelPhoto(ch.id);
      }

      if (totalNew > 0) {
        showAlert('Sync Complete', `Found ${totalNew} new audio file${totalNew !== 1 ? 's' : ''}${restored > 0 ? ` and restored ${restored} group${restored !== 1 ? 's' : ''}` : ''}.`);
      } else if (restored > 0) {
        showAlert('Groups Restored', `Restored ${restored} group${restored !== 1 ? 's' : ''} with cached audio.`);
      } else {
        showAlert('Up to Date', 'No new audio found.\n\nThe bot can only detect audio sent AFTER it joins. Forward or re-send existing audio to pick it up.');
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

              {/* Step-by-step guide */}
              <View style={[styles.guideBox, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                <Text style={[styles.guideTitle, { color: colors.text }]}>How to set up:</Text>
                <Text style={[styles.guideStep, { color: colors.textSecondary }]}>
                  {'1. '}Open Telegram and search for{' '}
                  <Text
                    style={{ color: '#0088cc', fontWeight: '600' }}
                    onPress={() => Linking.openURL('https://t.me/BotFather')}
                  >@BotFather</Text>
                </Text>
                <Text style={[styles.guideStep, { color: colors.textSecondary }]}>
                  {'2. '}Send /newbot and follow the steps to create a bot
                </Text>
                <Text style={[styles.guideStep, { color: colors.textSecondary }]}>
                  {'3. '}Copy the token BotFather gives you
                </Text>
                <Text style={[styles.guideStep, { color: colors.textSecondary }]}>
                  {'4. '}Paste it below and tap Connect
                </Text>
                <Text style={[styles.guideStep, { color: colors.textSecondary }]}>
                  {'5. '}Add your bot to a group/channel as admin
                </Text>
                <Text style={[styles.guideStep, { color: colors.textSecondary }]}>
                  {'6. '}Send audio there, come back and tap Sync
                </Text>
              </View>

              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceLight, color: colors.text, borderColor: colors.border }]}
                placeholder="Paste your bot token here..."
                placeholderTextColor={colors.textMuted}
                value={tokenInput}
                onChangeText={setTokenInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#0088cc' }]}
                onPress={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Connect</Text>
                )}
              </TouchableOpacity>
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
                    Connected
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
                For public channels/groups, enter the @username.
                {' '}For private groups, just add the bot as admin and tap Sync — they appear automatically.
                {' '}The bot detects audio sent after it joins.
              </Text>
              <View style={styles.addRow}>
                <TextInput
                  style={[styles.input, styles.addInput, { backgroundColor: colors.surfaceLight, color: colors.text, borderColor: colors.border }]}
                  placeholder="@channel_username"
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
  guideBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  guideTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  guideStep: { fontSize: 13, lineHeight: 22 },
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
