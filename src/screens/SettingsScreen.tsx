/**
 * Settings Screen - App settings and configuration
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export function SettingsScreen() {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audio Output</Text>
          
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Sample Rate</Text>
              <Text style={styles.settingValue}>48000 Hz</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#666666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Bit Depth</Text>
              <Text style={styles.settingValue}>24-bit</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#666666" />
          </TouchableOpacity>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Exclusive Mode</Text>
              <Text style={styles.settingDescription}>
                Direct hardware access for best quality (Android)
              </Text>
            </View>
            <Switch value={false} />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Bit-Perfect Output</Text>
              <Text style={styles.settingDescription}>
                Bypass all processing for audiophile playback
              </Text>
            </View>
            <Switch value={false} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Library</Text>
          
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Scan Folders</Text>
              <Text style={styles.settingDescription}>
                Manage music library locations
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#666666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Supported Formats</Text>
              <Text style={styles.settingValue}>
                MP3, FLAC, WAV, DSF, DFF, AAC, OGG, OPUS
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#666666" />
          </TouchableOpacity>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Auto-Scan New Files</Text>
              <Text style={styles.settingDescription}>
                Automatically detect new music files
              </Text>
            </View>
            <Switch value={true} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Playback</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Gapless Playback</Text>
              <Text style={styles.settingDescription}>
                Seamless transition between tracks
              </Text>
            </View>
            <Switch value={true} />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Crossfade</Text>
              <Text style={styles.settingDescription}>
                Fade between tracks (0s = disabled)
              </Text>
            </View>
            <Text style={styles.settingValue}>0s</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingTitle}>Version</Text>
            <Text style={styles.settingValue}>0.0.1</Text>
          </View>

          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingTitle}>GitHub Repository</Text>
            <Icon name="github" size={24} color="#666666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingTitle}>Contact Developer</Text>
            <Text style={styles.settingValue}>SMohammady@outlook.com</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999999',
    paddingHorizontal: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  settingDescription: {
    fontSize: 13,
    color: '#666666',
    marginTop: 4,
  },
  settingValue: {
    fontSize: 14,
    color: '#999999',
    marginTop: 4,
  },
});
