/**
 * TuneWell Telegram Bot Service
 * 
 * Integrates with Telegram Bot API to fetch audio files from
 * channels and groups where the TuneWell bot is added as admin.
 * 
 * Architecture:
 * - TuneWell ships with a built-in bot (@TuneWellBot)
 * - User adds the bot to their channels/groups as admin
 * - TuneWell polls getUpdates to index audio messages
 * - Audio files are downloaded on demand via getFile
 * 
 * Bot API Reference: https://core.telegram.org/bots/api
 */

const TELEGRAM_API = 'https://api.telegram.org';

// Built-in TuneWell bot token — shared across all app users
// Created via @BotFather for the TuneWell project
export const TUNEWELL_BOT_TOKEN = 'REDACTED_PLACEHOLDER_TOKEN';

// Telegram Bot API types
export interface TelegramBotUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  description?: string;
}

export interface TelegramAudio {
  file_id: string;
  file_unique_id: string;
  duration: number;
  performer?: string;
  title?: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramMessage {
  message_id: number;
  chat: TelegramChat;
  date: number;
  audio?: TelegramAudio;
  document?: TelegramDocument;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  channel_post?: TelegramMessage;
}

export interface TelegramFile {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

// Audio file extensions for document filtering
const AUDIO_EXTENSIONS = new Set([
  '.mp3', '.flac', '.wav', '.aac', '.m4a', '.ogg', '.opus',
  '.wma', '.aiff', '.aif', '.ape', '.dsf', '.dff', '.alac',
]);

function isAudioDocument(doc: TelegramDocument): boolean {
  if (doc.mime_type && doc.mime_type.startsWith('audio/')) return true;
  if (doc.file_name) {
    const ext = doc.file_name.substring(doc.file_name.lastIndexOf('.')).toLowerCase();
    return AUDIO_EXTENSIONS.has(ext);
  }
  return false;
}

export interface TelegramAudioItem {
  fileId: string;
  fileUniqueId: string;
  title: string;
  performer: string;
  duration: number; // seconds
  fileSize: number;
  mimeType: string;
  fileName: string;
  chatId: number;
  messageId: number;
  date: number;
}

class TelegramService {
  private static instance: TelegramService;
  private botToken: string | null = null;

  static getInstance(): TelegramService {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramService();
    }
    return TelegramService.instance;
  }

  setBotToken(token: string | null) {
    this.botToken = token;
  }

  private get baseUrl(): string {
    if (!this.botToken) throw new Error('Bot token not set');
    return `${TELEGRAM_API}/bot${this.botToken}`;
  }

  private getFileUrl(filePath: string): string {
    if (!this.botToken) throw new Error('Bot token not set');
    return `${TELEGRAM_API}/file/bot${this.botToken}/${filePath}`;
  }

  private async apiCall<T>(method: string, params?: Record<string, any>): Promise<T> {
    const url = `${this.baseUrl}/${method}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: params ? JSON.stringify(params) : undefined,
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.description || `Telegram API error: ${method}`);
    }
    return data.result as T;
  }

  /**
   * Verify bot token by calling getMe
   */
  async verifyToken(): Promise<TelegramBotUser> {
    return this.apiCall<TelegramBotUser>('getMe');
  }

  /**
   * Get info about a chat (channel/group)
   */
  async getChat(chatId: string | number): Promise<TelegramChat> {
    return this.apiCall<TelegramChat>('getChat', { chat_id: chatId });
  }

  /**
   * Check if the bot is a member/admin of a chat
   */
  async getChatMember(chatId: string | number, userId: number): Promise<{ status: string }> {
    return this.apiCall<{ status: string }>('getChatMember', {
      chat_id: chatId,
      user_id: userId,
    });
  }

  /**
   * Fetch updates (new messages) since the last offset.
   * Returns audio items found in the updates.
   */
  async getUpdates(offset?: number): Promise<{ updates: TelegramUpdate[]; nextOffset: number }> {
    const params: Record<string, any> = {
      allowed_updates: ['message', 'channel_post'],
      timeout: 0,
      limit: 100,
    };
    if (offset !== undefined) {
      params.offset = offset;
    }

    const updates = await this.apiCall<TelegramUpdate[]>('getUpdates', params);
    const nextOffset = updates.length > 0
      ? updates[updates.length - 1].update_id + 1
      : offset || 0;

    return { updates, nextOffset };
  }

  /**
   * Extract audio items from a batch of updates
   */
  extractAudioFromUpdates(updates: TelegramUpdate[]): TelegramAudioItem[] {
    const items: TelegramAudioItem[] = [];

    for (const update of updates) {
      const msg = update.message || update.channel_post;
      if (!msg) continue;

      // Direct audio message
      if (msg.audio) {
        items.push({
          fileId: msg.audio.file_id,
          fileUniqueId: msg.audio.file_unique_id,
          title: msg.audio.title || msg.audio.file_name || 'Unknown',
          performer: msg.audio.performer || 'Unknown Artist',
          duration: msg.audio.duration || 0,
          fileSize: msg.audio.file_size || 0,
          mimeType: msg.audio.mime_type || 'audio/mpeg',
          fileName: msg.audio.file_name || `${msg.audio.title || 'audio'}.mp3`,
          chatId: msg.chat.id,
          messageId: msg.message_id,
          date: msg.date,
        });
      }

      // Document that is an audio file
      if (msg.document && isAudioDocument(msg.document)) {
        const ext = (msg.document.file_name || '').substring(
          (msg.document.file_name || '').lastIndexOf('.'),
        );
        items.push({
          fileId: msg.document.file_id,
          fileUniqueId: msg.document.file_unique_id,
          title: (msg.document.file_name || 'Unknown').replace(/\.[^.]+$/, ''),
          performer: 'Unknown Artist',
          duration: 0,
          fileSize: msg.document.file_size || 0,
          mimeType: msg.document.mime_type || 'audio/mpeg',
          fileName: msg.document.file_name || `document${ext || '.mp3'}`,
          chatId: msg.chat.id,
          messageId: msg.message_id,
          date: msg.date,
        });
      }
    }

    return items;
  }

  /**
   * Get file download info. Returns the file path for download.
   * Note: Bot API file downloads are limited to 20 MB.
   */
  async getFile(fileId: string): Promise<{ filePath: string; downloadUrl: string }> {
    const file = await this.apiCall<TelegramFile>('getFile', { file_id: fileId });
    if (!file.file_path) {
      throw new Error('File path not available (file may exceed 20 MB)');
    }
    return {
      filePath: file.file_path,
      downloadUrl: this.getFileUrl(file.file_path),
    };
  }

  /**
   * Download a file to local storage.
   * Returns the local file path.
   */
  async downloadAudio(
    fileId: string,
    destDir: string,
    fileName: string,
    onProgress?: (bytesWritten: number, totalBytes: number) => void,
  ): Promise<string> {
    const RNFS = require('react-native-fs');
    const { downloadUrl } = await this.getFile(fileId);
    const destPath = `${destDir}/${fileName}`;

    // Ensure directory exists
    const dirExists = await RNFS.exists(destDir);
    if (!dirExists) {
      await RNFS.mkdir(destDir);
    }

    // Check if already downloaded
    const fileExists = await RNFS.exists(destPath);
    if (fileExists) {
      return destPath;
    }

    const result = await RNFS.downloadFile({
      fromUrl: downloadUrl,
      toFile: destPath,
      progress: onProgress
        ? (res: { bytesWritten: number; contentLength: number }) =>
            onProgress(res.bytesWritten, res.contentLength)
        : undefined,
      progressInterval: 250,
    }).promise;

    if (result.statusCode !== 200) {
      throw new Error(`Download failed with status ${result.statusCode}`);
    }

    return destPath;
  }

  /**
   * Sync a channel/group: fetch all new updates and extract audio.
   */
  async syncChannel(
    chatId: number,
    lastOffset: number,
  ): Promise<{ audioItems: TelegramAudioItem[]; nextOffset: number }> {
    const allAudio: TelegramAudioItem[] = [];
    let offset = lastOffset;
    let hasMore = true;

    while (hasMore) {
      const { updates, nextOffset } = await this.getUpdates(offset);

      if (updates.length === 0) {
        hasMore = false;
        break;
      }

      const audioItems = this.extractAudioFromUpdates(updates);
      // Filter to only this chat's audio
      const channelAudio = audioItems.filter((item) => item.chatId === chatId);
      allAudio.push(...channelAudio);

      offset = nextOffset;

      // If we got fewer than 100, we've caught up
      if (updates.length < 100) {
        hasMore = false;
      }
    }

    return { audioItems: allAudio, nextOffset: offset };
  }
}

export const telegramService = TelegramService.getInstance();
