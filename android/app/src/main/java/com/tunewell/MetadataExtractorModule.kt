package com.tunewell

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.util.Base64
import com.facebook.react.bridge.*
import java.io.ByteArrayOutputStream
import java.io.File

class MetadataExtractorModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "MetadataExtractor"

    @ReactMethod
    fun extractMetadata(filePath: String, promise: Promise) {
        try {
            val retriever = MediaMetadataRetriever()
            
            // Handle both file:// URIs and regular paths
            val path = if (filePath.startsWith("file://")) {
                filePath.removePrefix("file://")
            } else {
                filePath
            }
            
            val file = File(path)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "File does not exist: $path")
                return
            }
            
            retriever.setDataSource(path)
            
            val result = Arguments.createMap()
            
            // Basic metadata
            result.putString("title", retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE) ?: "")
            result.putString("artist", retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST) ?: "")
            result.putString("album", retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUM) ?: "")
            result.putString("albumArtist", retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUMARTIST) ?: "")
            result.putString("composer", retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_COMPOSER) ?: "")
            result.putString("genre", retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_GENRE) ?: "")
            result.putString("year", retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_YEAR) ?: "")
            result.putString("trackNumber", retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_CD_TRACK_NUMBER) ?: "")
            result.putString("discNumber", retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DISC_NUMBER) ?: "")
            
            // Duration in milliseconds
            val durationMs = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
            result.putDouble("duration", (durationMs?.toLongOrNull() ?: 0L) / 1000.0)
            
            // Audio properties
            result.putString("bitrate", retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_BITRATE) ?: "")
            result.putString("sampleRate", retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_SAMPLERATE) ?: "")
            result.putString("mimeType", retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_MIMETYPE) ?: "")
            
            // Extract embedded artwork
            val artworkBytes = retriever.embeddedPicture
            if (artworkBytes != null && artworkBytes.isNotEmpty()) {
                // Resize artwork to save memory
                val options = BitmapFactory.Options().apply {
                    inJustDecodeBounds = true
                }
                BitmapFactory.decodeByteArray(artworkBytes, 0, artworkBytes.size, options)
                
                // Calculate sample size for ~300px thumbnail
                val targetSize = 300
                var sampleSize = 1
                if (options.outHeight > targetSize || options.outWidth > targetSize) {
                    val halfHeight = options.outHeight / 2
                    val halfWidth = options.outWidth / 2
                    while ((halfHeight / sampleSize) >= targetSize && (halfWidth / sampleSize) >= targetSize) {
                        sampleSize *= 2
                    }
                }
                
                // Decode with sample size
                val decodeOptions = BitmapFactory.Options().apply {
                    inSampleSize = sampleSize
                }
                val bitmap = BitmapFactory.decodeByteArray(artworkBytes, 0, artworkBytes.size, decodeOptions)
                
                if (bitmap != null) {
                    // Convert to base64 JPEG
                    val outputStream = ByteArrayOutputStream()
                    bitmap.compress(Bitmap.CompressFormat.JPEG, 80, outputStream)
                    val base64 = Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP)
                    result.putString("artwork", "data:image/jpeg;base64,$base64")
                    bitmap.recycle()
                }
            }
            
            retriever.release()
            promise.resolve(result)
            
        } catch (e: Exception) {
            promise.reject("EXTRACTION_ERROR", "Failed to extract metadata: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun extractMetadataBatch(filePaths: ReadableArray, promise: Promise) {
        try {
            val results = Arguments.createArray()
            val retriever = MediaMetadataRetriever()
            
            for (i in 0 until filePaths.size()) {
                val filePath = filePaths.getString(i) ?: continue
                
                try {
                    val path = if (filePath.startsWith("file://")) {
                        filePath.removePrefix("file://")
                    } else {
                        filePath
                    }
                    
                    val file = File(path)
                    if (!file.exists()) {
                        results.pushNull()
                        continue
                    }
                    
                    retriever.setDataSource(path)
                    
                    val result = Arguments.createMap()
                    result.putString("path", filePath)
                    result.putString("title", retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE) ?: "")
                    result.putString("artist", retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST) ?: "")
                    result.putString("album", retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUM) ?: "")
                    result.putString("genre", retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_GENRE) ?: "")
                    result.putString("year", retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_YEAR) ?: "")
                    
                    val durationMs = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
                    result.putDouble("duration", (durationMs?.toLongOrNull() ?: 0L) / 1000.0)
                    
                    // Check for artwork existence without extracting
                    val hasArtwork = retriever.embeddedPicture != null
                    result.putBoolean("hasArtwork", hasArtwork)
                    
                    results.pushMap(result)
                } catch (e: Exception) {
                    results.pushNull()
                }
            }
            
            retriever.release()
            promise.resolve(results)
            
        } catch (e: Exception) {
            promise.reject("BATCH_ERROR", "Batch extraction failed: ${e.message}", e)
        }
    }
}
