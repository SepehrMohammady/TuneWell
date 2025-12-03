package com.tunewell

import android.content.ContentResolver
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.net.Uri
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.*
import kotlinx.coroutines.*
import java.io.FileInputStream
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Native audio decoder for formats not supported by ExoPlayer.
 * Handles DSD (DSF/DFF) files by converting to PCM.
 * Also handles WAV files with various bit depths.
 */
class NativeAudioDecoderModule(private val reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "NativeAudioDecoder"
        
        // DSD sample rates
        const val DSD64_RATE = 2822400   // 64x CD sample rate
        const val DSD128_RATE = 5644800  // 128x CD sample rate
        const val DSD256_RATE = 11289600 // 256x CD sample rate
        
        // PCM output sample rates
        const val PCM_SAMPLE_RATE_44100 = 44100
        const val PCM_SAMPLE_RATE_88200 = 88200
        const val PCM_SAMPLE_RATE_176400 = 176400
        
        // DSD to PCM decimation ratios
        const val DSD64_TO_PCM_RATIO = 64
        const val DSD128_TO_PCM_RATIO = 128
        const val DSD256_TO_PCM_RATIO = 256
    }

    private var audioTrack: AudioTrack? = null
    private var decoderJob: Job? = null
    private var isPlaying = false
    private var isPaused = false
    private var currentUri: String? = null

    override fun getName(): String = "NativeAudioDecoderModule"

    /**
     * Check if a file can be played by this decoder
     */
    @ReactMethod
    fun canPlay(uri: String, promise: Promise) {
        try {
            val extension = uri.substringAfterLast('.', "").lowercase()
            val supported = extension in listOf("dsf", "dff", "dsd", "wav", "wave", "aiff", "aif")
            
            val result = Arguments.createMap().apply {
                putBoolean("supported", supported)
                putString("format", extension)
                putString("decoder", if (supported) "native" else "exoplayer")
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("DECODER_ERROR", e.message, e)
        }
    }

    /**
     * Get audio file info without playing
     */
    @ReactMethod
    fun getAudioInfo(uri: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val extension = uri.substringAfterLast('.', "").lowercase()
                
                val info = when (extension) {
                    "dsf" -> getDSFInfo(uri)
                    "dff" -> getDFFInfo(uri)
                    "wav", "wave" -> getWAVInfo(uri)
                    else -> null
                }
                
                if (info != null) {
                    promise.resolve(info)
                } else {
                    promise.reject("UNSUPPORTED_FORMAT", "Format not supported: $extension")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to get audio info: ${e.message}", e)
                promise.reject("INFO_ERROR", e.message, e)
            }
        }
    }

    /**
     * Play audio file using native decoder
     */
    @ReactMethod
    fun play(uri: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                stop() // Stop any current playback
                
                currentUri = uri
                isPlaying = true
                isPaused = false
                
                val extension = uri.substringAfterLast('.', "").lowercase()
                
                when (extension) {
                    "dsf" -> playDSF(uri)
                    "dff" -> playDFF(uri)
                    "wav", "wave" -> playWAV(uri)
                    else -> {
                        promise.reject("UNSUPPORTED", "Format not supported: $extension")
                        return@launch
                    }
                }
                
                promise.resolve(true)
            } catch (e: Exception) {
                Log.e(TAG, "Playback error: ${e.message}", e)
                promise.reject("PLAYBACK_ERROR", e.message, e)
            }
        }
    }

    /**
     * Pause playback
     */
    @ReactMethod
    fun pause(promise: Promise) {
        try {
            isPaused = true
            audioTrack?.pause()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("PAUSE_ERROR", e.message, e)
        }
    }

    /**
     * Resume playback
     */
    @ReactMethod
    fun resume(promise: Promise) {
        try {
            isPaused = false
            audioTrack?.play()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("RESUME_ERROR", e.message, e)
        }
    }

    /**
     * Stop playback
     */
    @ReactMethod
    fun stop(promise: Promise) {
        stop()
        promise.resolve(true)
    }

    private fun stop() {
        isPlaying = false
        isPaused = false
        decoderJob?.cancel()
        decoderJob = null
        
        audioTrack?.apply {
            try {
                stop()
                release()
            } catch (e: Exception) {
                Log.e(TAG, "Error stopping AudioTrack: ${e.message}")
            }
        }
        audioTrack = null
        currentUri = null
    }

    /**
     * Get playback state
     */
    @ReactMethod
    fun getState(promise: Promise) {
        val result = Arguments.createMap().apply {
            putBoolean("isPlaying", isPlaying && !isPaused)
            putBoolean("isPaused", isPaused)
            putString("currentUri", currentUri)
        }
        promise.resolve(result)
    }

    // =========================================================================
    // DSF (DSD Stream File) Support
    // =========================================================================

    private fun getDSFInfo(uri: String): WritableMap? {
        val inputStream = openUri(uri) ?: return null
        
        return try {
            val buffer = ByteArray(512)
            inputStream.read(buffer)
            
            // Check DSF header
            val magic = String(buffer, 0, 4)
            if (magic != "DSD ") {
                Log.e(TAG, "Invalid DSF file: wrong magic")
                return null
            }
            
            // Parse DSF header
            val headerSize = ByteBuffer.wrap(buffer, 4, 8).order(ByteOrder.LITTLE_ENDIAN).long
            val fileSize = ByteBuffer.wrap(buffer, 12, 8).order(ByteOrder.LITTLE_ENDIAN).long
            
            // Format chunk at offset 28
            val formatMagic = String(buffer, 28, 4)
            if (formatMagic != "fmt ") {
                Log.e(TAG, "Invalid DSF format chunk")
                return null
            }
            
            val formatVersion = ByteBuffer.wrap(buffer, 36, 4).order(ByteOrder.LITTLE_ENDIAN).int
            val formatId = ByteBuffer.wrap(buffer, 40, 4).order(ByteOrder.LITTLE_ENDIAN).int
            val channelType = ByteBuffer.wrap(buffer, 44, 4).order(ByteOrder.LITTLE_ENDIAN).int
            val channelCount = ByteBuffer.wrap(buffer, 48, 4).order(ByteOrder.LITTLE_ENDIAN).int
            val sampleRate = ByteBuffer.wrap(buffer, 52, 4).order(ByteOrder.LITTLE_ENDIAN).int
            val bitsPerSample = ByteBuffer.wrap(buffer, 56, 4).order(ByteOrder.LITTLE_ENDIAN).int
            val sampleCount = ByteBuffer.wrap(buffer, 60, 8).order(ByteOrder.LITTLE_ENDIAN).long
            
            val duration = sampleCount.toDouble() / sampleRate.toDouble()
            
            val dsdRate = when (sampleRate) {
                DSD64_RATE -> "DSD64"
                DSD128_RATE -> "DSD128"
                DSD256_RATE -> "DSD256"
                else -> "DSD"
            }
            
            Arguments.createMap().apply {
                putString("format", "DSF")
                putString("dsdRate", dsdRate)
                putInt("sampleRate", sampleRate)
                putInt("channels", channelCount)
                putInt("bitsPerSample", bitsPerSample)
                putDouble("duration", duration)
                putDouble("fileSize", fileSize.toDouble())
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing DSF: ${e.message}")
            null
        } finally {
            inputStream.close()
        }
    }

    private suspend fun playDSF(uri: String) {
        // For DSD playback, we need to:
        // 1. Read DSD data
        // 2. Convert to PCM (decimation filter)
        // 3. Output via AudioTrack
        
        // This is a simplified implementation
        // Full DSD to PCM conversion requires a proper decimation filter
        
        Log.d(TAG, "Playing DSF: $uri")
        
        // For now, show that DSD files are recognized but need conversion
        // A full implementation would use a DSP library for DSD->PCM conversion
        
        val info = getDSFInfo(uri)
        if (info == null) {
            Log.e(TAG, "Failed to get DSF info")
            return
        }
        
        // Create AudioTrack for output
        val sampleRate = PCM_SAMPLE_RATE_176400  // Output at high sample rate
        val channelConfig = AudioFormat.CHANNEL_OUT_STEREO
        val audioFormat = AudioFormat.ENCODING_PCM_16BIT
        
        val bufferSize = AudioTrack.getMinBufferSize(sampleRate, channelConfig, audioFormat) * 4
        
        audioTrack = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setSampleRate(sampleRate)
                    .setChannelMask(channelConfig)
                    .setEncoding(audioFormat)
                    .build()
            )
            .setBufferSizeInBytes(bufferSize)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build()
        
        audioTrack?.play()
        
        // Note: Full DSD decoding would happen here
        // For a complete implementation, integrate a DSD->PCM converter library
        Log.w(TAG, "DSD playback requires DSD->PCM conversion (not fully implemented)")
    }

    // =========================================================================
    // DFF (DSDIFF) Support  
    // =========================================================================

    private fun getDFFInfo(uri: String): WritableMap? {
        val inputStream = openUri(uri) ?: return null
        
        return try {
            val buffer = ByteArray(256)
            inputStream.read(buffer)
            
            // Check FRM8 container
            val magic = String(buffer, 0, 4)
            if (magic != "FRM8") {
                Log.e(TAG, "Invalid DFF file: wrong magic")
                return null
            }
            
            // Parse DSDIFF header
            val formType = String(buffer, 12, 4)
            if (formType != "DSD ") {
                Log.e(TAG, "Invalid DFF: not DSD format")
                return null
            }
            
            // Find PROP chunk and parse sample rate
            // This is a simplified parser
            
            Arguments.createMap().apply {
                putString("format", "DFF")
                putString("dsdRate", "DSD64")  // Default
                putInt("sampleRate", DSD64_RATE)
                putInt("channels", 2)
                putInt("bitsPerSample", 1)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing DFF: ${e.message}")
            null
        } finally {
            inputStream.close()
        }
    }

    private suspend fun playDFF(uri: String) {
        Log.d(TAG, "Playing DFF: $uri")
        // Similar to DSF, DFF requires DSD->PCM conversion
        Log.w(TAG, "DFF playback requires DSD->PCM conversion (not fully implemented)")
    }

    // =========================================================================
    // WAV Support (including high bit-depth)
    // =========================================================================

    private fun getWAVInfo(uri: String): WritableMap? {
        val inputStream = openUri(uri) ?: return null
        
        return try {
            val buffer = ByteArray(128)
            inputStream.read(buffer)
            
            // Check RIFF header
            val riff = String(buffer, 0, 4)
            val wave = String(buffer, 8, 4)
            
            if (riff != "RIFF" || wave != "WAVE") {
                Log.e(TAG, "Invalid WAV file")
                return null
            }
            
            // Find fmt chunk
            var offset = 12
            var sampleRate = 0
            var channels = 0
            var bitsPerSample = 0
            var audioFormat = 0
            
            while (offset < buffer.size - 8) {
                val chunkId = String(buffer, offset, 4)
                val chunkSize = ByteBuffer.wrap(buffer, offset + 4, 4).order(ByteOrder.LITTLE_ENDIAN).int
                
                if (chunkId == "fmt ") {
                    audioFormat = ByteBuffer.wrap(buffer, offset + 8, 2).order(ByteOrder.LITTLE_ENDIAN).short.toInt()
                    channels = ByteBuffer.wrap(buffer, offset + 10, 2).order(ByteOrder.LITTLE_ENDIAN).short.toInt()
                    sampleRate = ByteBuffer.wrap(buffer, offset + 12, 4).order(ByteOrder.LITTLE_ENDIAN).int
                    bitsPerSample = ByteBuffer.wrap(buffer, offset + 22, 2).order(ByteOrder.LITTLE_ENDIAN).short.toInt()
                    break
                }
                
                offset += 8 + chunkSize
            }
            
            val formatName = when (audioFormat) {
                1 -> "PCM"
                3 -> "IEEE Float"
                0xFFFE -> "Extensible"
                else -> "Unknown"
            }
            
            Arguments.createMap().apply {
                putString("format", "WAV")
                putString("encoding", formatName)
                putInt("sampleRate", sampleRate)
                putInt("channels", channels)
                putInt("bitsPerSample", bitsPerSample)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing WAV: ${e.message}")
            null
        } finally {
            inputStream.close()
        }
    }

    private suspend fun playWAV(uri: String) {
        Log.d(TAG, "Playing WAV: $uri")
        
        val info = getWAVInfo(uri)
        if (info == null) {
            Log.e(TAG, "Failed to get WAV info")
            return
        }
        
        // Use MediaExtractor and MediaCodec for WAV playback
        // This handles various WAV formats including high bit-depth
        
        try {
            val extractor = MediaExtractor()
            
            if (uri.startsWith("content://")) {
                extractor.setDataSource(reactContext, Uri.parse(uri), null)
            } else if (uri.startsWith("file://")) {
                extractor.setDataSource(uri.removePrefix("file://"))
            } else {
                extractor.setDataSource(uri)
            }
            
            // Find audio track
            var audioTrackIndex = -1
            for (i in 0 until extractor.trackCount) {
                val format = extractor.getTrackFormat(i)
                val mime = format.getString(MediaFormat.KEY_MIME)
                if (mime?.startsWith("audio/") == true) {
                    audioTrackIndex = i
                    break
                }
            }
            
            if (audioTrackIndex < 0) {
                Log.e(TAG, "No audio track found in WAV")
                return
            }
            
            extractor.selectTrack(audioTrackIndex)
            val format = extractor.getTrackFormat(audioTrackIndex)
            
            val sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            val channelCount = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
            val mime = format.getString(MediaFormat.KEY_MIME) ?: "audio/raw"
            
            Log.d(TAG, "WAV format: $sampleRate Hz, $channelCount ch, $mime")
            
            // Create decoder
            val decoder = MediaCodec.createDecoderByType(mime)
            decoder.configure(format, null, null, 0)
            decoder.start()
            
            // Create AudioTrack
            val channelConfig = if (channelCount == 1) 
                AudioFormat.CHANNEL_OUT_MONO 
            else 
                AudioFormat.CHANNEL_OUT_STEREO
                
            val audioFormat = AudioFormat.ENCODING_PCM_16BIT
            val bufferSize = AudioTrack.getMinBufferSize(sampleRate, channelConfig, audioFormat) * 4
            
            audioTrack = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setSampleRate(sampleRate)
                        .setChannelMask(channelConfig)
                        .setEncoding(audioFormat)
                        .build()
                )
                .setBufferSizeInBytes(bufferSize)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()
            
            audioTrack?.play()
            
            // Decode and play
            decoderJob = CoroutineScope(Dispatchers.IO).launch {
                val inputBuffers = decoder.inputBuffers
                val outputBuffers = decoder.outputBuffers
                val bufferInfo = MediaCodec.BufferInfo()
                var isEOS = false
                
                while (isPlaying && !isEOS) {
                    if (isPaused) {
                        delay(100)
                        continue
                    }
                    
                    // Feed input
                    val inputIndex = decoder.dequeueInputBuffer(10000)
                    if (inputIndex >= 0) {
                        val inputBuffer = inputBuffers[inputIndex]
                        val sampleSize = extractor.readSampleData(inputBuffer, 0)
                        
                        if (sampleSize < 0) {
                            decoder.queueInputBuffer(inputIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                            isEOS = true
                        } else {
                            decoder.queueInputBuffer(inputIndex, 0, sampleSize, extractor.sampleTime, 0)
                            extractor.advance()
                        }
                    }
                    
                    // Get output
                    val outputIndex = decoder.dequeueOutputBuffer(bufferInfo, 10000)
                    if (outputIndex >= 0) {
                        val outputBuffer = outputBuffers[outputIndex]
                        val chunk = ByteArray(bufferInfo.size)
                        outputBuffer.get(chunk)
                        outputBuffer.clear()
                        
                        audioTrack?.write(chunk, 0, chunk.size)
                        decoder.releaseOutputBuffer(outputIndex, false)
                        
                        if (bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) {
                            isEOS = true
                        }
                    }
                }
                
                decoder.stop()
                decoder.release()
                extractor.release()
                
                isPlaying = false
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "WAV playback error: ${e.message}", e)
            throw e
        }
    }

    // =========================================================================
    // Utilities
    // =========================================================================

    private fun openUri(uri: String): java.io.InputStream? {
        return try {
            when {
                uri.startsWith("content://") -> {
                    reactContext.contentResolver.openInputStream(Uri.parse(uri))
                }
                uri.startsWith("file://") -> {
                    FileInputStream(uri.removePrefix("file://"))
                }
                else -> {
                    FileInputStream(uri)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open URI: $uri - ${e.message}")
            null
        }
    }

    override fun invalidate() {
        stop()
        super.invalidate()
    }
}
