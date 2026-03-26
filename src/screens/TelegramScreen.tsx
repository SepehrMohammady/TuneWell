/**
 * TuneWell Telegram Screen
 * 
 * Manage Telegram integration:
 * - Auto-connects using built-in TuneWell bot
 * - Add channels/groups where bot is admin
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useThemeStore } from '../store/themeStore';
import { useTelegramStore } from '../store/telegramStore';
import { telegramService, TUNEWELL_BOT_TOKEN } from '../services/telegram';
import { showAlert } from '../store/alertStore';
import MiniPlayer from '../components/player/MiniPlayer';
import { usePlayerStore } from '../store';

export default function TelegramScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useThemeStore();
  const { currentTrack } = usePlayerStore();
  const {
    botUser, isConnected, channels, audioFiles,
    isSyncing,
    setBotToken, setBotUser, setConnected,
    addChannel, removeChannel, updateChannelSync,
    addAudioFiles, setLastUpdateOffset, setSyncing,
    disconnect, lastUpdateOffset,
  } = useTelegramStore();

  const [channelInput, setChannelInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAddingChannel, setIsAddingChannel] = useState(false);

  // Connect using built-in TuneWell bot
  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
      telegramService.setBotToken(TUNEWELL_BOT_TOKEN);
      const bot = await telegramService.verifyToken();
      setBotToken(TUNEWELL_BOT_TOKEN);
      setBotUser(bot);
      setConnected(true);
      showAlert('Connected', `Bot @${bot.username} is ready!\n\nNow add it to your Telegram channels or groups as admin.`);
    } catch (err: any) {
      telegramService.setBotToken(null);
      showAlert('Connection Failed', err.message || 'Could not connect to TuneWell bot. Check your internet connection.');
    } finally {
      setIsConnecting(false);
    }
  }, [setBotToken, setBotUser, setConnected]);

  // Auto-restore connection on mount
  React.useEffect(() => {
    if (!isConnected) {
      // Auto-connect with built-in token
      telegramService.setBotToken(TUNEWELL_BOT_TOKEN);
      telegramService.verifyToken()
        .then((bot) => {
          setBotToken(TUNEWELL_BOT_TOKEN);
          setBotUser(bot);
          setConnected(true);
        })
        .catch(() => {
          setConnected(false);
        });
    } else {
      telegramService.setBotToken(TUNEWELL_BOT_TOKEN);
    }
  }, []);

  // Add channel/group
  const handleAddChannel = useCallback(async () => {
    const input = channelInput.trim();
    if (!input) {
      showAlert('Error', 'Please enter a channel username or ID.');
      return;
    }

    // Parse input: @username, username, or numeric ID
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

      // Check bot is a member
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
      setChannelInput('');
      showAlert('Added', `"${chat.title}" added. Tap Sync to fetch audio.`);
    } catch (err: any) {
      showAlert('Error', err.message || 'Could not find channel/group.');
    } finally {
      setIsAddingChannel(false);
    }
  }, [channelInput, botUser, addChannel]);

  // Sync all channels
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

        for (const [chatIdStr, items] of Object.entries(byChat)) {
          const chatId = parseInt(chatIdStr, 10);
          addAudioFiles(chatId, items);
          const existing = audioFiles[chatId]?.length || 0;
          updateChannelSync(chatId, existing + items.length);
          totalNew += items.length;
        }
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
  }, [isSyncing, lastUpdateOffset, audioFiles, channels, addAudioFiles, updateChannelSync, setLastUpdateOffset, setSyncing]);

  // Clear all data
  const handleDisconnect = useCallback(() => {
    showAlert('Clear Telegram Data', 'Remove all channels and synced audio files?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          disconnect();
        },
      },
    ]);
  }, [disconnect]);

  // Remove channel
  const handleRemoveChannel = useCallback(
    (chatId: number, title: string) => {
      showAlert('Remove Channel', `Remove "${title}" and its audio?`, [
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
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons name="send" size={40} color="#0088cc" style={styles.telegramIcon} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>TuneWell Telegram</Text>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              Listen to audio from your Telegram channels and groups right inside TuneWell.
            </Text>
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
                  <Text style={[styles.botStatus, { color: colors.success }]}>Connected</Text>
                </View>
                <TouchableOpacity onPress={handleDisconnect}>
                  <MaterialIcons name="delete-outline" size={22} color={colors.error} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.hint, { color: colors.textMuted, marginTop: 10 }]}>
                Add the bot to your Telegram channel or group as admin, then add it below to browse audio.
              </Text>
            </View>

            {/* Add Channel */}
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Add Channel / Group</Text>
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                Enter the @username or numeric ID of a channel/group where the bot is admin.
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
                  Your Channels ({channels.length})
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
                      <MaterialCommunityIcons
                        name={ch.type === 'channel' ? 'bullhorn' : 'account-group'}
                        size={22}
                        color="#0088cc"
                      />
                      <View style={styles.channelInfo}>
                        <Text style={[styles.channelTitle, { color: colors.text }]} numberOfLines={1}>
                          {ch.title}
                        </Text>
                        <Text style={[styles.channelMeta, { color: colors.textMuted }]}>
                          {count} audio file{count !== 1 ? 's' : ''}
                          {ch.lastSyncAt > 0
                            ? ` · Synced ${new Date(ch.lastSyncAt).toLocaleDateString()}`
                            : ' · Not synced'}
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
                  No channels added yet.{'\n'}Add a channel or group to get started.
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
  cardDesc: { fontSize: 14, lineHeight: 22, marginBottom: 16 },
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
  channelInfo: { flex: 1 },
  channelTitle: { fontSize: 15, fontWeight: '500' },
  channelMeta: { fontSize: 12, marginTop: 2 },
  emptyState: { alignItems: 'center', marginTop: 48 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 20 },
});
