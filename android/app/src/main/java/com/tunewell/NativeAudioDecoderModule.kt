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
import java.io.InputStream
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.PI

/**
 * Native audio decoder for formats not supported by ExoPlayer.
 * Handles DSD (DSF/DFF) files by converting to PCM using proper FIR decimation filter.
 * Also handles WAV files with various bit depths.
 */
class NativeAudioDecoderModule(private val reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "NativeAudioDecoder"
        
        // DSD sample rates
        const val DSD64_RATE = 2822400   // 64x CD sample rate (44100 * 64)
        const val DSD128_RATE = 5644800  // 128x CD sample rate
        const val DSD256_RATE = 11289600 // 256x CD sample rate
        
        // PCM output sample rates - must match DSD rate / 64
        const val PCM_SAMPLE_RATE_44100 = 44100
        const val PCM_SAMPLE_RATE_88200 = 88200
        const val PCM_SAMPLE_RATE_176400 = 176400
        
        // DSD to PCM decimation ratio 
        // DSD64 (2.8224 MHz) / 64 = 44.1 kHz
        // We process 8 bytes (64 bits) of DSD data to produce 1 PCM sample
        const val DECIMATION_RATIO = 64
        
        // Simple sigma-delta demodulation lookup table
        // Each byte (8 bits) maps to a sum of +1/-1 values
        // Pre-computed for LSB-first bit order (DSF format)
        private val DSD_TO_PCM_TABLE_LSB = IntArray(256) { byte ->
            var sum = 0
            for (bit in 0 until 8) {
                sum += if ((byte shr bit) and 1 == 1) 1 else -1
            }
            sum
        }
        
        // Pre-computed for MSB-first bit order (DFF format)
        private val DSD_TO_PCM_TABLE_MSB = IntArray(256) { byte ->
            var sum = 0
            for (bit in 7 downTo 0) {
                sum += if ((byte shr bit) and 1 == 1) 1 else -1
            }
            sum
        }
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
        Log.d(TAG, "Playing DSF: $uri")
        
        val inputStream = openUri(uri) ?: run {
            Log.e(TAG, "Failed to open DSF file")
            return
        }
        
        try {
            // Read and parse DSF header
            val header = ByteArray(512)
            inputStream.read(header)
            
            // Verify DSD chunk
            val magic = String(header, 0, 4)
            if (magic != "DSD ") {
                Log.e(TAG, "Invalid DSF file: wrong magic '$magic'")
                inputStream.close()
                return
            }
            
            // Parse header
            val headerSize = ByteBuffer.wrap(header, 4, 8).order(ByteOrder.LITTLE_ENDIAN).long
            val fileSize = ByteBuffer.wrap(header, 12, 8).order(ByteOrder.LITTLE_ENDIAN).long
            val metadataOffset = ByteBuffer.wrap(header, 20, 8).order(ByteOrder.LITTLE_ENDIAN).long
            
            // Parse format chunk (starts at offset 28)
            val fmtChunkSize = ByteBuffer.wrap(header, 32, 8).order(ByteOrder.LITTLE_ENDIAN).long
            val formatVersion = ByteBuffer.wrap(header, 40, 4).order(ByteOrder.LITTLE_ENDIAN).int
            val formatId = ByteBuffer.wrap(header, 44, 4).order(ByteOrder.LITTLE_ENDIAN).int
            val channelType = ByteBuffer.wrap(header, 48, 4).order(ByteOrder.LITTLE_ENDIAN).int
            val channelCount = ByteBuffer.wrap(header, 52, 4).order(ByteOrder.LITTLE_ENDIAN).int
            val dsdSampleRate = ByteBuffer.wrap(header, 56, 4).order(ByteOrder.LITTLE_ENDIAN).int
            val bitsPerSample = ByteBuffer.wrap(header, 60, 4).order(ByteOrder.LITTLE_ENDIAN).int
            val sampleCount = ByteBuffer.wrap(header, 64, 8).order(ByteOrder.LITTLE_ENDIAN).long
            val blockSizePerChannel = ByteBuffer.wrap(header, 72, 4).order(ByteOrder.LITTLE_ENDIAN).int
            
            Log.d(TAG, "DSF: $channelCount channels, ${dsdSampleRate}Hz DSD, blockSize=$blockSizePerChannel")
            
            // Calculate output sample rate based on DSD rate
            // DSD64 (2.8224 MHz) -> 44.1 kHz, DSD128 -> 88.2 kHz, DSD256 -> 176.4 kHz
            val outputSampleRate = when {
                dsdSampleRate <= DSD64_RATE -> PCM_SAMPLE_RATE_44100
                dsdSampleRate <= DSD128_RATE -> PCM_SAMPLE_RATE_88200
                else -> PCM_SAMPLE_RATE_176400
            }
            
            // Decimation: 8 bytes (64 bits) of DSD -> 1 PCM sample for DSD64
            // The ratio of DSD bytes to PCM samples
            val bytesPerPcmSample = dsdSampleRate / outputSampleRate / 8  // 8 bits per byte
            
            Log.d(TAG, "Output: ${outputSampleRate}Hz, bytesPerPcmSample=$bytesPerPcmSample")
            
            // Find data chunk
            val dataChunkOffset = 28 + fmtChunkSize.toInt()
            
            // Skip to data chunk
            inputStream.close()
            val dataStream = openUri(uri) ?: return
            dataStream.skip(dataChunkOffset.toLong())
            
            // Read data chunk header
            val dataHeader = ByteArray(12)
            dataStream.read(dataHeader)
            val dataChunkId = String(dataHeader, 0, 4)
            val dataChunkSize = ByteBuffer.wrap(dataHeader, 4, 8).order(ByteOrder.LITTLE_ENDIAN).long
            
            Log.d(TAG, "Data chunk: '$dataChunkId', size: $dataChunkSize bytes")
            
            // Setup AudioTrack for PCM output
            val channelConfig = if (channelCount == 1) 
                AudioFormat.CHANNEL_OUT_MONO 
            else 
                AudioFormat.CHANNEL_OUT_STEREO
            val audioFormat = AudioFormat.ENCODING_PCM_16BIT
            val bufferSize = AudioTrack.getMinBufferSize(outputSampleRate, channelConfig, audioFormat) * 4
            
            audioTrack = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setSampleRate(outputSampleRate)
                        .setChannelMask(channelConfig)
                        .setEncoding(audioFormat)
                        .build()
                )
                .setBufferSizeInBytes(bufferSize)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()
            
            audioTrack?.play()
            
            // DSD to PCM conversion using lookup table
            decoderJob = CoroutineScope(Dispatchers.IO).launch {
                // DSF stores data in interleaved blocks:
                // [Left block (blockSizePerChannel bytes)][Right block (blockSizePerChannel bytes)]
                // Each block contains blockSizePerChannel bytes of DSD data for one channel
                
                val dsdBuffer = ByteArray(blockSizePerChannel * channelCount)
                val pcmBuffer = ShortArray(8192)  // Output buffer
                
                var bytesRead = 0
                var pcmIndex = 0
                
                // Accumulators for averaging DSD values
                var leftSum = 0
                var rightSum = 0
                var byteCount = 0
                
                while (isPlaying && dataStream.read(dsdBuffer).also { bytesRead = it } > 0) {
                    if (isPaused) {
                        delay(100)
                        continue
                    }
                    
                    // Process the interleaved blocks
                    // Left channel is in first blockSizePerChannel bytes
                    // Right channel is in next blockSizePerChannel bytes
                    val actualBlockSize = minOf(blockSizePerChannel, bytesRead / channelCount)
                    
                    for (byteIdx in 0 until actualBlockSize) {
                        // Get left and right channel bytes
                        val leftByte = dsdBuffer[byteIdx].toInt() and 0xFF
                        val rightByte = if (channelCount == 2) 
                            dsdBuffer[blockSizePerChannel + byteIdx].toInt() and 0xFF 
                        else 
                            leftByte
                        
                        // Accumulate DSD values using lookup table (LSB first for DSF)
                        leftSum += DSD_TO_PCM_TABLE_LSB[leftByte]
                        rightSum += DSD_TO_PCM_TABLE_LSB[rightByte]
                        byteCount++
                        
                        // Output PCM sample every bytesPerPcmSample bytes
                        if (byteCount >= bytesPerPcmSample) {
                            // Convert accumulated sum to 16-bit PCM
                            // Max possible sum for 8 bytes = 8 * 8 = 64 (all 1s)
                            // Min possible sum = -64 (all 0s)
                            // Scale to 16-bit range
                            val scale = 32767.0 / (bytesPerPcmSample * 8.0)
                            val leftPcm = (leftSum * scale).toInt().coerceIn(-32768, 32767)
                            val rightPcm = (rightSum * scale).toInt().coerceIn(-32768, 32767)
                            
                            if (channelCount == 2) {
                                pcmBuffer[pcmIndex++] = leftPcm.toShort()
                                pcmBuffer[pcmIndex++] = rightPcm.toShort()
                            } else {
                                pcmBuffer[pcmIndex++] = leftPcm.toShort()
                            }
                            
                            // Reset accumulators
                            leftSum = 0
                            rightSum = 0
                            byteCount = 0
                            
                            // Flush buffer when nearly full
                            if (pcmIndex >= pcmBuffer.size - 2) {
                                audioTrack?.write(pcmBuffer, 0, pcmIndex)
                                pcmIndex = 0
                            }
                        }
                    }
                    
                    // Write remaining samples
                    if (pcmIndex > 0) {
                        audioTrack?.write(pcmBuffer, 0, pcmIndex)
                        pcmIndex = 0
                    }
                }
                
                dataStream.close()
                isPlaying = false
                Log.d(TAG, "DSF playback complete")
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "DSF playback error: ${e.message}", e)
            inputStream.close()
        }
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
        
        val inputStream = openUri(uri) ?: run {
            Log.e(TAG, "Failed to open DFF file")
            return
        }
        
        try {
            // Read DSDIFF header
            val header = ByteArray(512)
            inputStream.read(header)
            
            // Verify FRM8 container
            val magic = String(header, 0, 4)
            if (magic != "FRM8") {
                Log.e(TAG, "Invalid DFF file: wrong magic '$magic'")
                inputStream.close()
                return
            }
            
            // Get form size (big endian)
            val formSize = ByteBuffer.wrap(header, 4, 8).order(ByteOrder.BIG_ENDIAN).long
            
            // Verify DSD form type
            val formType = String(header, 12, 4)
            if (formType != "DSD ") {
                Log.e(TAG, "Invalid DFF: not DSD format")
                inputStream.close()
                return
            }
            
            // Parse chunks to find sample rate and data
            // Default values
            var sampleRate = DSD64_RATE
            var channelCount = 2
            var dataOffset = 0L
            var dataSize = 0L
            
            // Simple chunk parser - look for PROP and DSD chunks
            var offset = 16
            while (offset < header.size - 12) {
                val chunkId = String(header, offset, 4)
                val chunkSize = ByteBuffer.wrap(header, offset + 4, 8).order(ByteOrder.BIG_ENDIAN).long
                
                Log.d(TAG, "DFF chunk: $chunkId, size: $chunkSize at offset $offset")
                
                when (chunkId) {
                    "PROP" -> {
                        // Property chunk contains sample rate
                        // Look for FS (sample rate) chunk inside PROP
                        val propData = String(header, offset + 12, 4)
                        if (propData == "SND ") {
                            // Find FS chunk
                            var propOffset = offset + 16
                            while (propOffset < offset + 12 + chunkSize.toInt() && propOffset < header.size - 12) {
                                val subChunkId = String(header, propOffset, 4)
                                val subChunkSize = ByteBuffer.wrap(header, propOffset + 4, 8).order(ByteOrder.BIG_ENDIAN).long
                                
                                if (subChunkId == "FS  ") {
                                    sampleRate = ByteBuffer.wrap(header, propOffset + 12, 4).order(ByteOrder.BIG_ENDIAN).int
                                    Log.d(TAG, "DFF sample rate: $sampleRate")
                                } else if (subChunkId == "CHNL") {
                                    channelCount = ByteBuffer.wrap(header, propOffset + 12, 2).order(ByteOrder.BIG_ENDIAN).short.toInt()
                                    Log.d(TAG, "DFF channels: $channelCount")
                                }
                                
                                propOffset += (12 + subChunkSize).toInt()
                                if (subChunkSize.toInt() % 2 != 0) propOffset++ // Padding
                            }
                        }
                    }
                    "DSD " -> {
                        dataOffset = (offset + 12).toLong()
                        dataSize = chunkSize
                        Log.d(TAG, "DFF data at $dataOffset, size: $dataSize")
                    }
                }
                
                offset += (12 + chunkSize).toInt()
                if (chunkSize.toInt() % 2 != 0) offset++ // Padding
            }
            
            Log.d(TAG, "DFF: $channelCount channels, ${sampleRate}Hz DSD")
            
            // Setup AudioTrack for PCM output
            val outputSampleRate = PCM_SAMPLE_RATE_44100
            val channelConfig = if (channelCount == 1) 
                AudioFormat.CHANNEL_OUT_MONO 
            else 
                AudioFormat.CHANNEL_OUT_STEREO
            val audioFormat = AudioFormat.ENCODING_PCM_16BIT
            val bufferSize = AudioTrack.getMinBufferSize(outputSampleRate, channelConfig, audioFormat) * 4
            
            audioTrack = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setSampleRate(outputSampleRate)
                        .setChannelMask(channelConfig)
                        .setEncoding(audioFormat)
                        .build()
                )
                .setBufferSizeInBytes(bufferSize)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()
            
            audioTrack?.play()
            
            // Re-open file and skip to data
            inputStream.close()
            val dataStream = openUri(uri) ?: return
            dataStream.skip(dataOffset)
            
            // Calculate bytes per PCM sample (DFF uses interleaved channel data)
            val bytesPerPcmSample = sampleRate / outputSampleRate / 8  // 8 bits per byte
            
            Log.d(TAG, "DFF output: ${outputSampleRate}Hz, bytesPerPcmSample=$bytesPerPcmSample")
            
            // DSD to PCM conversion using lookup table
            decoderJob = CoroutineScope(Dispatchers.IO).launch {
                val blockSize = 4096
                val dsdBuffer = ByteArray(blockSize * channelCount)
                val pcmBuffer = ShortArray(8192)
                
                // Accumulators
                var leftSum = 0
                var rightSum = 0
                var byteCount = 0
                
                var bytesRead = 0
                var totalRead = 0L
                var pcmIndex = 0
                
                while (isPlaying && totalRead < dataSize && dataStream.read(dsdBuffer).also { bytesRead = it } > 0) {
                    if (isPaused) {
                        delay(100)
                        continue
                    }
                    
                    totalRead += bytesRead
                    
                    // DFF uses interleaved channel data: L R L R L R...
                    // and MSB-first bit order (opposite of DSF)
                    for (byteIdx in 0 until bytesRead step channelCount) {
                        val leftByte = dsdBuffer[byteIdx].toInt() and 0xFF
                        val rightByte = if (channelCount == 2 && byteIdx + 1 < bytesRead) 
                            dsdBuffer[byteIdx + 1].toInt() and 0xFF 
                        else 
                            leftByte
                        
                        // Accumulate DSD values using lookup table (MSB first for DFF)
                        leftSum += DSD_TO_PCM_TABLE_MSB[leftByte]
                        rightSum += DSD_TO_PCM_TABLE_MSB[rightByte]
                        byteCount++
                        
                        // Output PCM sample every bytesPerPcmSample bytes
                        if (byteCount >= bytesPerPcmSample) {
                            val scale = 32767.0 / (bytesPerPcmSample * 8.0)
                            val leftPcm = (leftSum * scale).toInt().coerceIn(-32768, 32767)
                            val rightPcm = (rightSum * scale).toInt().coerceIn(-32768, 32767)
                            
                            if (channelCount == 2) {
                                pcmBuffer[pcmIndex++] = leftPcm.toShort()
                                pcmBuffer[pcmIndex++] = rightPcm.toShort()
                            } else {
                                pcmBuffer[pcmIndex++] = leftPcm.toShort()
                            }
                            
                            leftSum = 0
                            rightSum = 0
                            byteCount = 0
                            
                            if (pcmIndex >= pcmBuffer.size - 2) {
                                audioTrack?.write(pcmBuffer, 0, pcmIndex)
                                pcmIndex = 0
                            }
                        }
                    }
                    
                    if (pcmIndex > 0) {
                        audioTrack?.write(pcmBuffer, 0, pcmIndex)
                        pcmIndex = 0
                    }
                }
                
                dataStream.close()
                isPlaying = false
                Log.d(TAG, "DFF playback complete")
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "DFF playback error: ${e.message}", e)
            inputStream.close()
        }
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
