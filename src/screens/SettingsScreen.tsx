import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useMusicLibrary } from '../contexts/MusicLibraryContext';
import { APP_VERSION } from '../version';

interface Settings {
  theme: 'light' | 'dark' | 'auto';
  scanAllStorage: boolean;
  customFolders: string[];
  autoScanOnStartup: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  scanAllStorage: true,
  customFolders: [],
  autoScanOnStartup: true,
};

const SettingsScreen: React.FC = () => {
  const { clearLibrary } = useMusicLibrary();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('@tunewell_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    try {
      await AsyncStorage.setItem('@tunewell_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'auto') => {
    saveSettings({ ...settings, theme });
  };

  const handleToggleScanAllStorage = (value: boolean) => {
    saveSettings({ ...settings, scanAllStorage: value });
  };

  const handleToggleAutoScan = (value: boolean) => {
    saveSettings({ ...settings, autoScanOnStartup: value });
  };

  const handleAddCustomFolder = async () => {
    Alert.alert(
      'Add Custom Folder',
      'Select a folder to scan for audio files',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Select Folder',
          onPress: async () => {
            try {
              // Note: Expo DocumentPicker doesn't support folder selection directly
              // This is a placeholder - you'd need react-native-fs or similar for folder access
              Alert.alert(
                'Feature Coming Soon',
                'Custom folder selection will be available in a future update. For now, the app scans all media library audio files.'
              );
            } catch (error) {
              console.error('Error selecting folder:', error);
            }
          },
        },
      ]
    );
  };

  const handleRemoveCustomFolder = (folder: string) => {
    Alert.alert(
      'Remove Folder',
      `Remove "${folder}" from scan locations?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const newFolders = settings.customFolders.filter(f => f !== folder);
            saveSettings({ ...settings, customFolders: newFolders });
          },
        },
      ]
    );
  };

  const handleClearLibrary = () => {
    Alert.alert(
      'Clear Library',
      'This will remove all tracks from your library. Your audio files will not be deleted from your device.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearLibrary();
            Alert.alert('Success', 'Library cleared');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, settings.theme === 'light' && styles.lightContainer]}>
      <ScrollView>
        {/* Theme Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, settings.theme === 'light' && styles.lightText]}>
            Appearance
          </Text>
          
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, settings.theme === 'light' && styles.lightText]}>
              Theme
            </Text>
          </View>

          <View style={styles.themeSelector}>
            <TouchableOpacity
              style={[
                styles.themeOption,
                settings.theme === 'light' && styles.themeOptionActive,
                settings.theme === 'light' && styles.lightThemeOption,
              ]}
              onPress={() => handleThemeChange('light')}
            >
              <Ionicons 
                name="sunny" 
                size={24} 
                color={settings.theme === 'light' ? '#007AFF' : '#666666'} 
              />
              <Text style={[
                styles.themeOptionText,
                settings.theme === 'light' && styles.themeOptionTextActive,
              ]}>
                Light
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                settings.theme === 'dark' && styles.themeOptionActive,
              ]}
              onPress={() => handleThemeChange('dark')}
            >
              <Ionicons 
                name="moon" 
                size={24} 
                color={settings.theme === 'dark' ? '#007AFF' : '#666666'} 
              />
              <Text style={[
                styles.themeOptionText,
                settings.theme === 'dark' && styles.themeOptionTextActive,
                settings.theme === 'light' && styles.lightText,
              ]}>
                Dark
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                settings.theme === 'auto' && styles.themeOptionActive,
              ]}
              onPress={() => handleThemeChange('auto')}
            >
              <Ionicons 
                name="phone-portrait" 
                size={24} 
                color={settings.theme === 'auto' ? '#007AFF' : '#666666'} 
              />
              <Text style={[
                styles.themeOptionText,
                settings.theme === 'auto' && styles.themeOptionTextActive,
                settings.theme === 'light' && styles.lightText,
              ]}>
                Auto
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Music Library Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, settings.theme === 'light' && styles.lightText]}>
            Music Library
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, settings.theme === 'light' && styles.lightText]}>
                Scan All Storage
              </Text>
              <Text style={[styles.settingDescription, settings.theme === 'light' && styles.lightDescriptionText]}>
                Automatically scan entire device for audio files
              </Text>
            </View>
            <Switch
              value={settings.scanAllStorage}
              onValueChange={handleToggleScanAllStorage}
              trackColor={{ false: '#333333', true: '#007AFF' }}
              thumbColor={settings.scanAllStorage ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, settings.theme === 'light' && styles.lightText]}>
                Auto-scan on Startup
              </Text>
              <Text style={[styles.settingDescription, settings.theme === 'light' && styles.lightDescriptionText]}>
                Refresh library when app starts
              </Text>
            </View>
            <Switch
              value={settings.autoScanOnStartup}
              onValueChange={handleToggleAutoScan}
              trackColor={{ false: '#333333', true: '#007AFF' }}
              thumbColor={settings.autoScanOnStartup ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, settings.theme === 'light' && styles.lightButton]}
            onPress={handleAddCustomFolder}
          >
            <Ionicons name="folder-outline" size={20} color="#007AFF" />
            <Text style={styles.buttonText}>Add Custom Folder</Text>
          </TouchableOpacity>

          {settings.customFolders.length > 0 && (
            <View style={styles.folderList}>
              <Text style={[styles.folderListTitle, settings.theme === 'light' && styles.lightText]}>
                Custom Folders:
              </Text>
              {settings.customFolders.map((folder, index) => (
                <View key={index} style={[styles.folderItem, settings.theme === 'light' && styles.lightFolderItem]}>
                  <Ionicons name="folder" size={16} color="#007AFF" />
                  <Text style={[styles.folderPath, settings.theme === 'light' && styles.lightText]} numberOfLines={1}>
                    {folder}
                  </Text>
                  <TouchableOpacity onPress={() => handleRemoveCustomFolder(folder)}>
                    <Ionicons name="close-circle" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, settings.theme === 'light' && styles.lightText]}>
            Data Management
          </Text>

          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleClearLibrary}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            <Text style={[styles.buttonText, styles.dangerButtonText]}>Clear Library</Text>
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, settings.theme === 'light' && styles.lightText]}>
            About
          </Text>
          <Text style={[styles.infoText, settings.theme === 'light' && styles.lightText]}>
            TuneWell Music Player
          </Text>
          <Text style={[styles.infoText, styles.versionText, settings.theme === 'light' && styles.lightDescriptionText]}>
            Version {APP_VERSION.full}
          </Text>
          <Text style={[styles.infoText, styles.descriptionText, settings.theme === 'light' && styles.lightDescriptionText]}>
            Professional audio player for music enthusiasts
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  lightContainer: {
    backgroundColor: '#F5F5F5',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  lightText: {
    color: '#000000',
  },
  lightDescriptionText: {
    color: '#666666',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 10,
  },
  settingLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: '#8E8E93',
  },
  themeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    marginHorizontal: 5,
    borderRadius: 10,
    backgroundColor: '#1C1C1E',
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  lightThemeOption: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E5EA',
  },
  themeOptionActive: {
    borderColor: '#007AFF',
  },
  themeOptionText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666666',
  },
  themeOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#1C1C1E',
    marginTop: 15,
  },
  lightButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  buttonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  dangerButton: {
    backgroundColor: '#1C1C1E',
  },
  dangerButtonText: {
    color: '#FF3B30',
  },
  folderList: {
    marginTop: 15,
  },
  folderListTitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 10,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    marginBottom: 8,
  },
  lightFolderItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  folderPath: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 10,
    marginRight: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 5,
  },
  versionText: {
    color: '#8E8E93',
  },
  descriptionText: {
    marginTop: 10,
    fontSize: 12,
    color: '#666666',
  },
});

export default SettingsScreen;
