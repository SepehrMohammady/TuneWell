/**
 * Permissions utility - Handle app permissions
 */

import {Platform, PermissionsAndroid, Alert} from 'react-native';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    return await requestAndroidPermissions();
  } else if (Platform.OS === 'ios') {
    return await requestIOSPermissions();
  }
  return true;
}

async function requestAndroidPermissions(): Promise<boolean> {
  try {
    const androidVersion = Platform.Version as number;

    // Android 13+ requires different permissions
    if (androidVersion >= 33) {
      const permissions = [
        PERMISSIONS.ANDROID.READ_MEDIA_AUDIO,
        PERMISSIONS.ANDROID.POST_NOTIFICATIONS,
      ];

      const results = await Promise.all(
        permissions.map(permission => request(permission))
      );

      return results.every(result => result === RESULTS.GRANTED);
    } else {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ]);

      return (
        granted[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] ===
          PermissionsAndroid.RESULTS.GRANTED
      );
    }
  } catch (error) {
    console.error('Failed to request Android permissions:', error);
    return false;
  }
}

async function requestIOSPermissions(): Promise<boolean> {
  try {
    const result = await request(PERMISSIONS.IOS.MEDIA_LIBRARY);
    return result === RESULTS.GRANTED;
  } catch (error) {
    console.error('Failed to request iOS permissions:', error);
    return false;
  }
}

export async function checkStoragePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const androidVersion = Platform.Version as number;

    if (androidVersion >= 33) {
      const result = await check(PERMISSIONS.ANDROID.READ_MEDIA_AUDIO);
      return result === RESULTS.GRANTED;
    } else {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
      );
      return granted;
    }
  } else if (Platform.OS === 'ios') {
    const result = await check(PERMISSIONS.IOS.MEDIA_LIBRARY);
    return result === RESULTS.GRANTED;
  }

  return true;
}

export function showPermissionDeniedAlert(): void {
  Alert.alert(
    'Permission Required',
    'TuneWell needs access to your music library to play audio files. Please grant permission in Settings.',
    [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Open Settings', onPress: () => {/* Open settings */}},
    ]
  );
}
