/**
 * Player Screen - Main playback interface
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useNavigation} from '@react-navigation/native';

export function PlayerScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.artworkContainer}>
        <View style={styles.artworkPlaceholder}>
          <Icon name="music-note" size={80} color="#333333" />
        </View>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.title}>No track playing</Text>
        <Text style={styles.artist}>Select a track from your library</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={styles.progressFill} />
        </View>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>0:00</Text>
          <Text style={styles.timeText}>0:00</Text>
        </View>
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.controlButton}>
          <Icon name="shuffle-variant" size={28} color="#666666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton}>
          <Icon name="skip-previous" size={36} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.playButton}>
          <Icon name="play" size={40} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton}>
          <Icon name="skip-next" size={36} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton}>
          <Icon name="repeat" size={28} color="#666666" />
        </TouchableOpacity>
      </View>

      <View style={styles.bottomControls}>
        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() => navigation.navigate('EQ' as never)}>
          <Icon name="tune" size={24} color="#1DB954" />
          <Text style={styles.bottomButtonText}>EQ</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomButton}>
          <Icon name="playlist-music" size={24} color="#ffffff" />
          <Text style={styles.bottomButtonText}>Queue</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomButton}>
          <Icon name="share-variant" size={24} color="#ffffff" />
          <Text style={styles.bottomButtonText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 24,
  },
  artworkContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  artworkPlaceholder: {
    width: 280,
    height: 280,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  artist: {
    fontSize: 16,
    color: '#999999',
    marginTop: 8,
    textAlign: 'center',
  },
  progressContainer: {
    paddingVertical: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '0%',
    backgroundColor: '#1DB954',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#999999',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 24,
  },
  controlButton: {
    padding: 12,
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1DB954',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  bottomButton: {
    alignItems: 'center',
  },
  bottomButtonText: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
  },
});
