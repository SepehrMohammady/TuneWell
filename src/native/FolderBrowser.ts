/**
 * TuneWell Folder Browser Native Module
 * 
 * Lists subfolders from SAF (Storage Access Framework) URIs
 */

import { NativeModules, Platform } from 'react-native';

export interface SubfolderInfo {
  name: string;
  uri: string;
  documentId: string;
  path: string; // File system path like /storage/emulated/0/Music/Subfolder
}

interface FolderBrowserModuleInterface {
  listSubfolders(folderUri: string): Promise<SubfolderInfo[]>;
  getFolderName(folderUri: string): Promise<string>;
  hasAllFilesAccess(): Promise<boolean>;
  requestAllFilesAccess(): Promise<boolean>;
}

const { FolderBrowserModule } = NativeModules;

/**
 * Whether the app holds "All files access" (MANAGE_EXTERNAL_STORAGE).
 * Needed to read raw file paths (DSD and other formats MediaStore won't index)
 * under scoped storage. Returns true on non-Android / pre-API-30.
 */
export async function hasAllFilesAccess(): Promise<boolean> {
  if (Platform.OS !== 'android' || !FolderBrowserModule?.hasAllFilesAccess) {
    return true;
  }
  try {
    return await (FolderBrowserModule as FolderBrowserModuleInterface).hasAllFilesAccess();
  } catch (error) {
    console.error('Failed to check All Files Access:', error);
    return false;
  }
}

/**
 * Open the system "All files access" settings page for this app.
 */
export async function requestAllFilesAccess(): Promise<void> {
  if (Platform.OS !== 'android' || !FolderBrowserModule?.requestAllFilesAccess) {
    return;
  }
  try {
    await (FolderBrowserModule as FolderBrowserModuleInterface).requestAllFilesAccess();
  } catch (error) {
    console.error('Failed to open All Files Access settings:', error);
  }
}

/**
 * List subfolders within a SAF URI
 */
export async function listSubfolders(folderUri: string): Promise<SubfolderInfo[]> {
  if (Platform.OS !== 'android') {
    console.warn('FolderBrowser is only available on Android');
    return [];
  }

  if (!FolderBrowserModule) {
    console.warn('FolderBrowserModule native module not available');
    return [];
  }

  try {
    return await (FolderBrowserModule as FolderBrowserModuleInterface).listSubfolders(folderUri);
  } catch (error) {
    console.error('Failed to list subfolders:', error);
    return [];
  }
}

/**
 * Get the display name of a folder from its SAF URI
 */
export async function getFolderName(folderUri: string): Promise<string> {
  if (Platform.OS !== 'android') {
    return 'Unknown';
  }

  if (!FolderBrowserModule) {
    return 'Unknown';
  }

  try {
    return await (FolderBrowserModule as FolderBrowserModuleInterface).getFolderName(folderUri);
  } catch (error) {
    console.error('Failed to get folder name:', error);
    return 'Unknown';
  }
}
