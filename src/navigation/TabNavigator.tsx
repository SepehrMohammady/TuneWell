import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import PlayerScreen from '../screens/PlayerScreen';
import PlaylistScreen from '../screens/PlaylistScreen';
import FolderBrowserScreen from '../screens/FolderBrowserScreen';
import EqualizerScreen from '../screens/EqualizerScreen';

// Import contexts
import { useMusicLibrary } from '../contexts/MusicLibraryContext';
import { TabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<TabParamList>();

// Simple wrapper components for tab navigation
const PlayerTabScreen = () => {
  const { library } = useMusicLibrary();
  return library.currentTrack ? 
    <PlayerScreen route={{ params: { track: library.currentTrack }, key: 'player-tab', name: 'Player' } as any} navigation={undefined as any} /> :
    <PlayerScreen route={{ params: {}, key: 'player-tab', name: 'Player' } as any} navigation={undefined as any} />;
};

const PlaylistTabScreen = () => 
  <PlaylistScreen route={{ params: { type: 'favorites' }, key: 'playlist-tab', name: 'Playlist' } as any} navigation={undefined as any} />;

const BrowseTabScreen = () => 
  <FolderBrowserScreen route={{ params: {}, key: 'browse-tab', name: 'FolderBrowser' } as any} navigation={undefined as any} />;

const TabNavigator: React.FC = () => {
  const { library } = useMusicLibrary();
  const hasCurrentTrack = library.currentTrack !== null;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Player':
              iconName = focused ? 'play-circle' : 'play-circle-outline';
              break;
            case 'Playlists':
              iconName = focused ? 'list' : 'list-outline';
              break;
            case 'Browse':
              iconName = focused ? 'folder' : 'folder-outline';
              break;
            case 'Equalizer':
              iconName = focused ? 'options' : 'options-outline';
              break;
            default:
              iconName = 'home-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#1C1C1E',
          borderTopColor: '#2C2C2E',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#1C1C1E',
          borderBottomColor: '#2C2C2E',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'TuneWell',
          headerShown: true,
        }}
      />
      <Tab.Screen 
        name="Player" 
        component={PlayerTabScreen}
        options={{
          title: 'Now Playing',
          headerShown: true,
        }}
      />
      <Tab.Screen 
        name="Playlists" 
        component={PlaylistTabScreen}
        options={{
          title: 'Playlists',
          headerShown: true,
        }}
      />
      <Tab.Screen 
        name="Browse" 
        component={BrowseTabScreen}
        options={{
          title: 'Browse Files',
          headerShown: true,
        }}
      />
      <Tab.Screen 
        name="Equalizer" 
        component={EqualizerScreen}
        options={{
          title: 'Equalizer',
          headerShown: true,
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;