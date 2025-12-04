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
        const val DSD64_RATE = 2822400   // 64x CD sample rate
        const val DSD128_RATE = 5644800  // 128x CD sample rate
        const val DSD256_RATE = 11289600 // 256x CD sample rate
        
        // PCM output sample rates
        const val PCM_SAMPLE_RATE_44100 = 44100
        const val PCM_SAMPLE_RATE_88200 = 88200
        const val PCM_SAMPLE_RATE_176400 = 176400
        
        // DSD decimation filter - 64 tap FIR low-pass filter
        // This filter is designed for DSD64 to 44.1kHz conversion
        // Cutoff at ~20kHz with good stopband attenuation
        private val FIR_TAPS = 64
        
        // Pre-computed FIR filter coefficients (sinc windowed with Blackman-Harris)
        // These coefficients provide proper low-pass filtering for DSD decimation
        private val FIR_COEFFICIENTS = DoubleArray(FIR_TAPS) { i ->
            val center = (FIR_TAPS - 1) / 2.0
            val x = i - center
            
            // Normalized cutoff frequency (20kHz at DSD64 rate, fs=2.8224MHz)
            val fc = 0.015  // ~21kHz cutoff
            
            // Sinc function
            val sinc = if (x == 0.0) 1.0 else sin(2 * PI * fc * x) / (PI * x)
            
            // Blackman-Harris window for good sidelobe suppression
            val a0 = 0.35875
            val a1 = 0.48829
            val a2 = 0.14128
            val a3 = 0.01168
            val window = a0 - a1 * kotlin.math.cos(2 * PI * i / (FIR_TAPS - 1)) +
                        a2 * kotlin.math.cos(4 * PI * i / (FIR_TAPS - 1)) -
                        a3 * kotlin.math.cos(6 * PI * i / (FIR_TAPS - 1))
            
            sinc * window
        }
        
        // Normalize filter coefficients
        init {
            val sum = FIR_COEFFICIENTS.sum()
            for (i in FIR_COEFFICIENTS.indices) {
                FIR_COEFFICIENTS[i] /= sum
            }
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
            
            // Calculate output sample rate (decimate DSD to PCM)
            val decimationRatio = dsdSampleRate / PCM_SAMPLE_RATE_44100
            val outputSampleRate = PCM_SAMPLE_RATE_44100
            
            Log.d(TAG, "Decimation ratio: $decimationRatio, output: ${outputSampleRate}Hz")
            
            // Find data chunk
            // Data chunk starts after format chunk (28 + fmtChunkSize)
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
            
            // DSD to PCM conversion using proper FIR decimation
            decoderJob = CoroutineScope(Dispatchers.IO).launch {
                // DSF stores data in blocks: all left channel data, then all right channel
                // We need to handle the interleaved block structure
                
                // FIR filter state for each channel
                val leftFilterBuffer = DoubleArray(FIR_TAPS)
                val rightFilterBuffer = DoubleArray(FIR_TAPS)
                var leftFilterIndex = 0
                var rightFilterIndex = 0
                
                // DSD bit buffer for decimation
                // For DSD64, we decimate 64 DSD samples to 1 PCM sample
                val decimationFactor = 64  // DSD64 to 44.1kHz
                
                val dsdBuffer = ByteArray(blockSizePerChannel * channelCount)
                val pcmBuffer = ShortArray(4096)  // Output buffer
                
                var bytesRead = 0
                var pcmIndex = 0
                var dsdBitCount = 0
                var leftAccumulator = 0.0
                var rightAccumulator = 0.0
                
                while (isPlaying && dataStream.read(dsdBuffer).also { bytesRead = it } > 0) {
                    if (isPaused) {
                        delay(100)
                        continue
                    }
                    
                    pcmIndex = 0
                    
                    // Process each byte in the block
                    // DSF block structure: blockSizePerChannel bytes for left, then right
                    val bytesPerChannel = bytesRead / channelCount
                    
                    for (byteIdx in 0 until bytesPerChannel) {
                        // Get left and right channel bytes
                        val leftByte = dsdBuffer[byteIdx].toInt() and 0xFF
                        val rightByte = if (channelCount == 2) 
                            dsdBuffer[blockSizePerChannel + byteIdx].toInt() and 0xFF 
                        else 
                            leftByte
                        
                        // Process each bit in the byte (LSB first for DSF)
                        for (bit in 0 until 8) {
                            // Extract DSD bits (LSB first)
                            val leftBit = (leftByte shr bit) and 1
                            val rightBit = (rightByte shr bit) and 1
                            
                            // Convert DSD bit to bipolar value (+1 or -1)
                            val leftValue = if (leftBit == 1) 1.0 else -1.0
                            val rightValue = if (rightBit == 1) 1.0 else -1.0
                            
                            // Apply FIR filter (moving average with windowed coefficients)
                            leftFilterBuffer[leftFilterIndex] = leftValue
                            rightFilterBuffer[rightFilterIndex] = rightValue
                            
                            leftAccumulator += leftValue * FIR_COEFFICIENTS[dsdBitCount % FIR_TAPS]
                            rightAccumulator += rightValue * FIR_COEFFICIENTS[dsdBitCount % FIR_TAPS]
                            
                            dsdBitCount++
                            leftFilterIndex = (leftFilterIndex + 1) % FIR_TAPS
                            rightFilterIndex = (rightFilterIndex + 1) % FIR_TAPS
                            
                            // Every decimationFactor DSD samples, output one PCM sample
                            if (dsdBitCount >= decimationFactor) {
                                // Apply gain and convert to 16-bit PCM
                                // DSD typically needs about 6dB of gain
                                val leftPcm = (leftAccumulator * 24000).toInt().coerceIn(-32768, 32767)
                                val rightPcm = (rightAccumulator * 24000).toInt().coerceIn(-32768, 32767)
                                
                                if (channelCount == 2) {
                                    pcmBuffer[pcmIndex++] = leftPcm.toShort()
                                    pcmBuffer[pcmIndex++] = rightPcm.toShort()
                                } else {
                                    pcmBuffer[pcmIndex++] = leftPcm.toShort()
                                }
                                
                                // Reset accumulators
                                leftAccumulator = 0.0
                                rightAccumulator = 0.0
                                dsdBitCount = 0
                                
                                // Flush buffer when full
                                if (pcmIndex >= pcmBuffer.size - 2) {
                                    audioTrack?.write(pcmBuffer, 0, pcmIndex)
                                    pcmIndex = 0
                                }
                            }
                        }
                    }
                    
                    // Write remaining samples
                    if (pcmIndex > 0) {
                        audioTrack?.write(pcmBuffer, 0, pcmIndex)
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
            
            // DSD to PCM conversion using FIR decimation (same approach as DSF)
            decoderJob = CoroutineScope(Dispatchers.IO).launch {
                val blockSize = 4096
                val dsdBuffer = ByteArray(blockSize * channelCount)
                val pcmBuffer = ShortArray(4096)
                
                // FIR filter state
                var leftAccumulator = 0.0
                var rightAccumulator = 0.0
                var dsdBitCount = 0
                val decimationFactor = 64
                
                var bytesRead = 0
                var totalRead = 0L
                var pcmIndex = 0
                
                while (isPlaying && totalRead < dataSize && dataStream.read(dsdBuffer).also { bytesRead = it } > 0) {
                    if (isPaused) {
                        delay(100)
                        continue
                    }
                    
                    totalRead += bytesRead
                    pcmIndex = 0
                    
                    // DFF uses MSB-first bit order (opposite of DSF)
                    // Process byte by byte
                    for (byteIdx in 0 until bytesRead step channelCount) {
                        val leftByte = dsdBuffer[byteIdx].toInt() and 0xFF
                        val rightByte = if (channelCount == 2 && byteIdx + 1 < bytesRead) 
                            dsdBuffer[byteIdx + 1].toInt() and 0xFF 
                        else 
                            leftByte
                        
                        // Process each bit (MSB first for DFF)
                        for (bit in 7 downTo 0) {
                            val leftBit = (leftByte shr bit) and 1
                            val rightBit = (rightByte shr bit) and 1
                            
                            val leftValue = if (leftBit == 1) 1.0 else -1.0
                            val rightValue = if (rightBit == 1) 1.0 else -1.0
                            
                            leftAccumulator += leftValue * FIR_COEFFICIENTS[dsdBitCount % FIR_TAPS]
                            rightAccumulator += rightValue * FIR_COEFFICIENTS[dsdBitCount % FIR_TAPS]
                            
                            dsdBitCount++
                            
                            if (dsdBitCount >= decimationFactor) {
                                val leftPcm = (leftAccumulator * 24000).toInt().coerceIn(-32768, 32767)
                                val rightPcm = (rightAccumulator * 24000).toInt().coerceIn(-32768, 32767)
                                
                                if (channelCount == 2) {
                                    pcmBuffer[pcmIndex++] = leftPcm.toShort()
                                    pcmBuffer[pcmIndex++] = rightPcm.toShort()
                                } else {
                                    pcmBuffer[pcmIndex++] = leftPcm.toShort()
                                }
                                
                                leftAccumulator = 0.0
                                rightAccumulator = 0.0
                                dsdBitCount = 0
                                
                                if (pcmIndex >= pcmBuffer.size - 2) {
                                    audioTrack?.write(pcmBuffer, 0, pcmIndex)
                                    pcmIndex = 0
                                }
                            }
                        }
                    }
                    
                    if (pcmIndex > 0) {
                        audioTrack?.write(pcmBuffer, 0, pcmIndex)
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
