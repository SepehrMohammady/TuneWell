package com.tunewell

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.AudioFormat
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.util.Base64
import com.facebook.react.bridge.*
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.InputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder

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
    
    /**
     * Read REAL audio format (sample rate, channels, bit depth) for one track.
     * Accepts a content:// URI, file:// URI, or raw path. Uses MediaExtractor for
     * container formats; falls back to parsing the WAV header (authoritative for
     * bit depth and hi-res rates MediaExtractor may not handle). Returns zeros for
     * fields it can't determine (callers must treat 0 as "unknown", not fake it).
     */
    @ReactMethod
    fun getAudioFormat(uriOrPath: String, promise: Promise) {
        val result = Arguments.createMap()
        var sampleRate = 0
        var channels = 0
        var bitsPerSample = 0
        var mime = ""

        // 1) MediaExtractor for container formats (flac/mp3/m4a/ogg/standard wav)
        val extractor = MediaExtractor()
        try {
            setDataSourceFlexible(extractor, uriOrPath)
            for (i in 0 until extractor.trackCount) {
                val f = extractor.getTrackFormat(i)
                val m = f.getString(MediaFormat.KEY_MIME) ?: ""
                if (m.startsWith("audio/")) {
                    mime = m
                    if (f.containsKey(MediaFormat.KEY_SAMPLE_RATE)) sampleRate = f.getInteger(MediaFormat.KEY_SAMPLE_RATE)
                    if (f.containsKey(MediaFormat.KEY_CHANNEL_COUNT)) channels = f.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
                    if (f.containsKey(MediaFormat.KEY_PCM_ENCODING)) {
                        bitsPerSample = when (f.getInteger(MediaFormat.KEY_PCM_ENCODING)) {
                            AudioFormat.ENCODING_PCM_8BIT -> 8
                            AudioFormat.ENCODING_PCM_16BIT -> 16
                            AudioFormat.ENCODING_PCM_24BIT_PACKED -> 24
                            AudioFormat.ENCODING_PCM_32BIT, AudioFormat.ENCODING_PCM_FLOAT -> 32
                            else -> 0
                        }
                    }
                    break
                }
            }
        } catch (e: Exception) {
            // ignore — fall through to WAV header parse
        } finally {
            try { extractor.release() } catch (_: Exception) {}
        }

        // 2) WAV header is authoritative (covers hi-res 24/32-bit and >192k that
        //    MediaExtractor may not surface). Parse it for .wav files.
        if (uriOrPath.lowercase().substringBefore('?').endsWith(".wav") || mime == "audio/raw" || bitsPerSample == 0 && sampleRate == 0) {
            try {
                openStream(uriOrPath)?.use { stream ->
                    val header = ByteArray(4096)
                    val read = stream.read(header)
                    if (read > 44) {
                        val wav = parseWavHeader(header, read)
                        if (wav != null) {
                            if (wav[0] > 0) sampleRate = wav[0]
                            if (wav[1] > 0) channels = wav[1]
                            if (wav[2] > 0) bitsPerSample = wav[2]
                            if (mime.isEmpty()) mime = "audio/wav"
                        }
                    }
                }
            } catch (_: Exception) {
                // ignore
            }
        }

        result.putInt("sampleRate", sampleRate)
        result.putInt("channels", channels)
        result.putInt("bitsPerSample", bitsPerSample)
        result.putString("mimeType", mime)
        promise.resolve(result)
    }

    private fun setDataSourceFlexible(extractor: MediaExtractor, uriOrPath: String) {
        when {
            uriOrPath.startsWith("content://") ->
                extractor.setDataSource(reactApplicationContext, Uri.parse(uriOrPath), null)
            uriOrPath.startsWith("file://") -> extractor.setDataSource(uriOrPath.removePrefix("file://"))
            else -> extractor.setDataSource(uriOrPath)
        }
    }

    private fun openStream(uriOrPath: String): InputStream? {
        return when {
            uriOrPath.startsWith("content://") ->
                reactApplicationContext.contentResolver.openInputStream(Uri.parse(uriOrPath))
            uriOrPath.startsWith("file://") -> File(uriOrPath.removePrefix("file://")).inputStream()
            else -> File(uriOrPath).inputStream()
        }
    }

    /** Returns [sampleRate, channels, bitsPerSample] or null if not a valid WAV. */
    private fun parseWavHeader(buf: ByteArray, len: Int): IntArray? {
        if (len < 44) return null
        if (String(buf, 0, 4) != "RIFF" || String(buf, 8, 4) != "WAVE") return null
        var off = 12
        while (off + 8 <= len) {
            val chunkId = String(buf, off, 4)
            val chunkSize = ByteBuffer.wrap(buf, off + 4, 4).order(ByteOrder.LITTLE_ENDIAN).int
            if (chunkId == "fmt ") {
                if (off + 24 > len) return null
                val channels = ByteBuffer.wrap(buf, off + 10, 2).order(ByteOrder.LITTLE_ENDIAN).short.toInt()
                val sampleRate = ByteBuffer.wrap(buf, off + 12, 4).order(ByteOrder.LITTLE_ENDIAN).int
                val bits = ByteBuffer.wrap(buf, off + 22, 2).order(ByteOrder.LITTLE_ENDIAN).short.toInt()
                return intArrayOf(sampleRate, channels, bits)
            }
            off += 8 + chunkSize + (chunkSize and 1)
        }
        return null
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
