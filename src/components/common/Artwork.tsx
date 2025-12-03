/**
 * TuneWell Artwork Component
 * Displays album artwork with placeholder and loading states
 */

import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { Colors, BorderRadius, Shadow } from '../../theme';

type ArtworkSize = 'small' | 'medium' | 'large' | 'xlarge' | 'full';

interface ArtworkProps {
  uri?: string | null;
  size?: ArtworkSize | number;
  rounded?: boolean;
  shadow?: boolean;
  style?: ViewStyle;
}

const SIZE_MAP: Record<ArtworkSize, number> = {
  small: 48,
  medium: 64,
  large: 120,
  xlarge: 200,
  full: 300,
};

export const Artwork: React.FC<ArtworkProps> = ({
  uri,
  size = 'medium',
  rounded = false,
  shadow = false,
  style,
}) => {
  const [loading, setLoading] = useState(!!uri);
  const [error, setError] = useState(false);

  const dimension = typeof size === 'number' ? size : SIZE_MAP[size];
  const borderRadius = rounded
    ? dimension / 2
    : dimension >= 120
    ? BorderRadius.artworkLarge
    : BorderRadius.artwork;

  const containerStyle: ViewStyle[] = [
    styles.container,
    {
      width: dimension,
      height: dimension,
      borderRadius,
    },
    shadow && Shadow.lg,
    style,
  ].filter(Boolean) as ViewStyle[];

  const hasValidUri = uri && !error;

  return (
    <View style={containerStyle}>
      {hasValidUri ? (
        <>
          <Image
            source={{ uri }}
            style={[styles.image, { borderRadius }]}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setError(true);
              setLoading(false);
            }}
            resizeMode="cover"
          />
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={Colors.primary} size="small" />
            </View>
          )}
        </>
      ) : (
        <View style={[styles.placeholder, { borderRadius }]}>
          <PlaceholderIcon size={dimension} />
        </View>
      )}
    </View>
  );
};

interface PlaceholderIconProps {
  size: number;
}

const PlaceholderIcon: React.FC<PlaceholderIconProps> = ({ size }) => {
  const iconSize = Math.min(size * 0.4, 48);
  
  return (
    <View style={styles.placeholderContent}>
      <View
        style={[
          styles.musicNote,
          {
            width: iconSize * 0.6,
            height: iconSize * 0.6,
            borderRadius: iconSize * 0.15,
          },
        ]}
      />
      <View
        style={[
          styles.musicNoteStem,
          {
            width: iconSize * 0.1,
            height: iconSize,
            right: 0,
            bottom: iconSize * 0.3,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: Colors.background.tertiary,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderContent: {
    position: 'relative',
    opacity: 0.3,
  },
  musicNote: {
    backgroundColor: Colors.text.secondary,
  },
  musicNoteStem: {
    position: 'absolute',
    backgroundColor: Colors.text.secondary,
  },
});
