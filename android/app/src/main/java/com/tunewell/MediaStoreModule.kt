package com.tunewell

import android.content.ContentUris
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import com.facebook.react.bridge.*

class MediaStoreModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "MediaStoreModule"

    @ReactMethod
    fun getAudioFiles(promise: Promise) {
        try {
            val audioList = Arguments.createArray()
            
            val collection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
            } else {
                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
            }

            val projection = arrayOf(
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.DISPLAY_NAME,
                MediaStore.Audio.Media.TITLE,
                MediaStore.Audio.Media.ARTIST,
                MediaStore.Audio.Media.ALBUM,
                MediaStore.Audio.Media.ALBUM_ID,
                MediaStore.Audio.Media.DURATION,
                MediaStore.Audio.Media.SIZE,
                MediaStore.Audio.Media.DATA,
                MediaStore.Audio.Media.MIME_TYPE,
                MediaStore.Audio.Media.DATE_MODIFIED,
                MediaStore.Audio.Media.DATE_ADDED
            )

            // Get all audio files including those without music metadata
            // This ensures WAV, DSF, DFF files are included even if not tagged
            val supportedMimeTypes = listOf(
                "audio/mpeg", "audio/mp3",
                "audio/flac", "audio/x-flac",
                "audio/wav", "audio/x-wav", "audio/wave",
                "audio/aac", "audio/mp4", "audio/m4a",
                "audio/ogg", "audio/opus",
                "audio/x-ms-wma",
                "audio/aiff", "audio/x-aiff",
                "audio/dsf", "audio/x-dsf", "audio/dsd",
                "audio/dff", "audio/x-dff"
            )
            
            // Query for music files OR files with supported MIME types
            val selection = "${MediaStore.Audio.Media.IS_MUSIC} != 0 OR ${MediaStore.Audio.Media.MIME_TYPE} IN (${supportedMimeTypes.joinToString(",") { "'$it'" }})"
            val sortOrder = "${MediaStore.Audio.Media.TITLE} ASC"

            val cursor: Cursor? = reactApplicationContext.contentResolver.query(
                collection,
                projection,
                selection,
                null,
                sortOrder
            )

            cursor?.use {
                val idColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
                val displayNameColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME)
                val titleColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
                val artistColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
                val albumColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
                val albumIdColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)
                val durationColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
                val sizeColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE)
                val dataColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.DATA)
                val mimeTypeColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.MIME_TYPE)
                val dateModifiedColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_MODIFIED)
                val dateAddedColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_ADDED)

                while (it.moveToNext()) {
                    val id = it.getLong(idColumn)
                    val displayName = it.getString(displayNameColumn) ?: ""
                    val title = it.getString(titleColumn) ?: displayName
                    val artist = it.getString(artistColumn) ?: ""
                    val album = it.getString(albumColumn) ?: ""
                    val albumId = it.getLong(albumIdColumn)
                    val duration = it.getLong(durationColumn)
                    val size = it.getLong(sizeColumn)
                    val data = it.getString(dataColumn) ?: ""
                    val mimeType = it.getString(mimeTypeColumn) ?: ""
                    val dateModified = it.getLong(dateModifiedColumn)
                    val dateAdded = it.getLong(dateAddedColumn)

                    // Get content URI for playback
                    val contentUri = ContentUris.withAppendedId(
                        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id
                    )

                    // Get album art URI
                    val albumArtUri = ContentUris.withAppendedId(
                        Uri.parse("content://media/external/audio/albumart"), albumId
                    )

                    val audioItem = Arguments.createMap().apply {
                        putString("id", id.toString())
                        putString("uri", contentUri.toString())
                        putString("filename", displayName)
                        putString("path", data)
                        putString("title", title)
                        putString("artist", artist)
                        putString("album", album)
                        putString("albumArtUri", albumArtUri.toString())
                        putDouble("duration", duration / 1000.0) // Convert to seconds
                        putDouble("size", size.toDouble())
                        putString("mimeType", mimeType)
                        putDouble("dateModified", dateModified.toDouble() * 1000) // Convert to milliseconds
                        putDouble("dateAdded", dateAdded.toDouble() * 1000)
                        
                        // Extract extension from filename
                        val ext = displayName.substringAfterLast('.', "").lowercase()
                        putString("extension", ".$ext")
                        
                        // Extract folder from path
                        val folder = data.substringBeforeLast('/')
                        putString("folder", folder)
                    }

                    audioList.pushMap(audioItem)
                }
            }

            promise.resolve(audioList)
        } catch (e: Exception) {
            promise.reject("MEDIASTORE_ERROR", "Failed to query audio files: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getAudioFilesInFolder(folderPath: String, promise: Promise) {
        try {
            val audioList = Arguments.createArray()
            
            val collection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
            } else {
                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
            }

            val projection = arrayOf(
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.DISPLAY_NAME,
                MediaStore.Audio.Media.TITLE,
                MediaStore.Audio.Media.ARTIST,
                MediaStore.Audio.Media.ALBUM,
                MediaStore.Audio.Media.ALBUM_ID,
                MediaStore.Audio.Media.DURATION,
                MediaStore.Audio.Media.SIZE,
                MediaStore.Audio.Media.DATA,
                MediaStore.Audio.Media.MIME_TYPE,
                MediaStore.Audio.Media.DATE_MODIFIED,
                MediaStore.Audio.Media.DATE_ADDED
            )

            // Filter by folder path
            val selection = "${MediaStore.Audio.Media.DATA} LIKE ?"
            val selectionArgs = arrayOf("$folderPath%")
            val sortOrder = "${MediaStore.Audio.Media.TITLE} ASC"

            val cursor: Cursor? = reactApplicationContext.contentResolver.query(
                collection,
                projection,
                selection,
                selectionArgs,
                sortOrder
            )

            cursor?.use {
                val idColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
                val displayNameColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME)
                val titleColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
                val artistColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
                val albumColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
                val albumIdColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)
                val durationColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
                val sizeColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE)
                val dataColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.DATA)
                val mimeTypeColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.MIME_TYPE)
                val dateModifiedColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_MODIFIED)
                val dateAddedColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_ADDED)

                while (it.moveToNext()) {
                    val id = it.getLong(idColumn)
                    val displayName = it.getString(displayNameColumn) ?: ""
                    val title = it.getString(titleColumn) ?: displayName
                    val artist = it.getString(artistColumn) ?: ""
                    val album = it.getString(albumColumn) ?: ""
                    val albumId = it.getLong(albumIdColumn)
                    val duration = it.getLong(durationColumn)
                    val size = it.getLong(sizeColumn)
                    val data = it.getString(dataColumn) ?: ""
                    val mimeType = it.getString(mimeTypeColumn) ?: ""
                    val dateModified = it.getLong(dateModifiedColumn)
                    val dateAdded = it.getLong(dateAddedColumn)

                    val contentUri = ContentUris.withAppendedId(
                        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id
                    )

                    val albumArtUri = ContentUris.withAppendedId(
                        Uri.parse("content://media/external/audio/albumart"), albumId
                    )

                    val audioItem = Arguments.createMap().apply {
                        putString("id", id.toString())
                        putString("uri", contentUri.toString())
                        putString("filename", displayName)
                        putString("path", data)
                        putString("title", title)
                        putString("artist", artist)
                        putString("album", album)
                        putString("albumArtUri", albumArtUri.toString())
                        putDouble("duration", duration / 1000.0)
                        putDouble("size", size.toDouble())
                        putString("mimeType", mimeType)
                        putDouble("dateModified", dateModified.toDouble() * 1000)
                        putDouble("dateAdded", dateAdded.toDouble() * 1000)
                        
                        val ext = displayName.substringAfterLast('.', "").lowercase()
                        putString("extension", ".$ext")
                        
                        val folder = data.substringBeforeLast('/')
                        putString("folder", folder)
                    }

                    audioList.pushMap(audioItem)
                }
            }

            promise.resolve(audioList)
        } catch (e: Exception) {
            promise.reject("MEDIASTORE_ERROR", "Failed to query audio files: ${e.message}", e)
        }
    }
}
