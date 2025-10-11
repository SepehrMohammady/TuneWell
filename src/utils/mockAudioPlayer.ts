// Mock audio player for Expo Go compatibility
// This provides basic functionality when testing in Expo Go
// For full audio functionality, use a development build

import { useState, useEffect } from 'react';

export interface MockAudioPlayer {
  playing: boolean;
  duration: number;
  currentTime: number;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  source: string;
}

export const useMockAudioPlayer = (source: string): MockAudioPlayer => {
  const [playing, setPlaying] = useState(false);
  const [duration] = useState(240); // 4 minutes mock duration
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (playing) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) {
            setPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [playing, duration]);

  const play = () => {
    console.log('Mock play:', source);
    setPlaying(true);
  };

  const pause = () => {
    console.log('Mock pause:', source);
    setPlaying(false);
  };

  const seekTo = (seconds: number) => {
    console.log('Mock seek to:', seconds);
    setCurrentTime(seconds);
  };

  return {
    playing,
    duration,
    currentTime,
    play,
    pause,
    seekTo,
    source
  };
};