package com.tunewell

import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.media.audiofx.Equalizer
import android.media.audiofx.BassBoost
import android.media.audiofx.Virtualizer
import android.media.audiofx.PresetReverb
import android.media.audiofx.AudioEffect
import android.media.audiofx.LoudnessEnhancer
import android.util.Log
import com.facebook.react.bridge.*

/**
 * Native module for audio equalizer using Android's AudioEffect APIs.
 * Applies EQ effects to the audio output in real-time.
 * 
 * Uses session ID 0 for global output mix which affects all audio on the device.
 */
class AudioEqualizerModule(private val reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "AudioEqualizer"
        // Use priority 0 (default) - higher priorities can cause issues
        private const val PRIORITY = 0
    }

    private var equalizer: Equalizer? = null
    private var bassBoost: BassBoost? = null
    private var virtualizer: Virtualizer? = null
    private var loudnessEnhancer: LoudnessEnhancer? = null
    private var audioSessionId: Int = 0
    private var isEnabled: Boolean = false
    private var currentPreampDb: Double = 0.0

    override fun getName(): String = "AudioEqualizerModule"

    /**
     * Generate an audio session ID for use with audio effects
     */
    @ReactMethod
    fun generateSessionId(promise: Promise) {
        try {
            val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val sessionId = audioManager.generateAudioSessionId()
            Log.d(TAG, "Generated audio session ID: $sessionId")
            promise.resolve(sessionId)
        } catch (e: Exception) {
            promise.reject("SESSION_ERROR", e.message, e)
        }
    }

    /**
     * Initialize the equalizer with an audio session ID.
     * Use session ID 0 for global output.
     */
    @ReactMethod
    fun initialize(sessionId: Int, promise: Promise) {
        try {
            // Release any existing instances
            release()

            audioSessionId = sessionId
            
            Log.d(TAG, "Initializing equalizer with session ID: $audioSessionId")
            
            // Create equalizer for the audio session
            // Session 0 = global output mix
            equalizer = Equalizer(PRIORITY, audioSessionId).apply {
                enabled = true  // Enable immediately
            }
            
            // Check if the equalizer has control
            val hasControl = equalizer?.hasControl() ?: false
            Log.d(TAG, "Equalizer hasControl: $hasControl, enabled: ${equalizer?.enabled}")

            // Create bass boost
            bassBoost = BassBoost(PRIORITY, audioSessionId).apply {
                enabled = false
            }

            // Create virtualizer
            virtualizer = Virtualizer(PRIORITY, audioSessionId).apply {
                enabled = false
            }

            // Create loudness enhancer for preamp
            try {
                loudnessEnhancer = LoudnessEnhancer(audioSessionId).apply {
                    enabled = true
                    setTargetGain(0) // Start at 0 dB
                }
                Log.d(TAG, "LoudnessEnhancer initialized for preamp")
            } catch (e: Exception) {
                Log.w(TAG, "LoudnessEnhancer not available: ${e.message}")
            }

            val eq = equalizer!!
            val numBands = eq.numberOfBands
            val bandLevelRange = eq.bandLevelRange
            val minLevel = bandLevelRange[0]
            val maxLevel = bandLevelRange[1]
            
            // Log all available effects for debugging
            val effects = AudioEffect.queryEffects()
            Log.d(TAG, "Available audio effects: ${effects?.size ?: 0}")
            effects?.forEach { desc ->
                Log.d(TAG, "  Effect: ${desc.name} - ${desc.type}")
            }

            val result = Arguments.createMap().apply {
                putInt("numberOfBands", numBands.toInt())
                putInt("minLevel", minLevel.toInt())
                putInt("maxLevel", maxLevel.toInt())
                putInt("audioSessionId", audioSessionId)
                putBoolean("hasControl", hasControl)
                putBoolean("isEnabled", eq.enabled)
                
                // Get center frequencies for each band
                val frequencies = Arguments.createArray()
                for (i in 0 until numBands) {
                    frequencies.pushInt(eq.getCenterFreq(i.toShort()).toInt())
                }
                putArray("centerFrequencies", frequencies)

                // Get presets
                val presets = Arguments.createArray()
                val numPresets = eq.numberOfPresets
                for (i in 0 until numPresets) {
                    presets.pushString(eq.getPresetName(i.toShort()))
                }
                putArray("presets", presets)
            }

            Log.d(TAG, "Equalizer initialized: $numBands bands, range $minLevel to $maxLevel mB")
            isEnabled = true
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize equalizer: ${e.message}", e)
            promise.reject("EQ_INIT_ERROR", "Failed to initialize equalizer: ${e.message}", e)
        }
    }

    /**
     * Enable or disable the equalizer
     */
    @ReactMethod
    fun setEnabled(enabled: Boolean, promise: Promise) {
        try {
            isEnabled = enabled
            equalizer?.enabled = enabled
            bassBoost?.enabled = enabled
            virtualizer?.enabled = enabled
            
            Log.d(TAG, "Equalizer enabled: $enabled")
            promise.resolve(enabled)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to set enabled state: ${e.message}", e)
            promise.reject("EQ_ERROR", "Failed to set enabled state: ${e.message}", e)
        }
    }

    /**
     * Set the gain for a specific band.
     * @param bandIndex The band index (0-based)
     * @param gainDb The gain in dB (typically -15 to +15, but depends on hardware)
     */
    @ReactMethod
    fun setBandLevel(bandIndex: Int, gainDb: Double, promise: Promise) {
        try {
            val eq = equalizer
            if (eq == null) {
                promise.reject("EQ_NOT_INITIALIZED", "Equalizer not initialized")
                return
            }

            val numBands = eq.numberOfBands
            if (bandIndex < 0 || bandIndex >= numBands) {
                promise.reject("INVALID_BAND", "Band index $bandIndex is out of range (0-${numBands - 1})")
                return
            }

            // Convert dB to millibels (1 dB = 100 mB)
            val gainMb = (gainDb * 100).toInt().toShort()
            
            // Clamp to supported range
            val range = eq.bandLevelRange
            val clampedGain = gainMb.coerceIn(range[0], range[1])
            
            eq.setBandLevel(bandIndex.toShort(), clampedGain)
            
            Log.d(TAG, "Band $bandIndex set to ${gainDb}dB (${clampedGain}mB)")
            promise.resolve(clampedGain.toInt() / 100.0)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to set band level: ${e.message}", e)
            promise.reject("EQ_ERROR", "Failed to set band level: ${e.message}", e)
        }
    }

    /**
     * Set all band levels at once.
     * @param gains Array of gain values in dB for each band
     */
    @ReactMethod
    fun setBandLevels(gains: ReadableArray, promise: Promise) {
        try {
            val eq = equalizer
            if (eq == null) {
                promise.reject("EQ_NOT_INITIALIZED", "Equalizer not initialized")
                return
            }

            val numBands = eq.numberOfBands
            val range = eq.bandLevelRange

            for (i in 0 until minOf(gains.size(), numBands.toInt())) {
                val gainDb = gains.getDouble(i)
                val gainMb = (gainDb * 100).toInt().toShort()
                val clampedGain = gainMb.coerceIn(range[0], range[1])
                eq.setBandLevel(i.toShort(), clampedGain)
            }

            Log.d(TAG, "Set ${minOf(gains.size(), numBands.toInt())} band levels")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to set band levels: ${e.message}", e)
            promise.reject("EQ_ERROR", "Failed to set band levels: ${e.message}", e)
        }
    }

    /**
     * Get current band level
     */
    @ReactMethod
    fun getBandLevel(bandIndex: Int, promise: Promise) {
        try {
            val eq = equalizer
            if (eq == null) {
                promise.reject("EQ_NOT_INITIALIZED", "Equalizer not initialized")
                return
            }

            val levelMb = eq.getBandLevel(bandIndex.toShort())
            val levelDb = levelMb.toDouble() / 100.0
            promise.resolve(levelDb)
        } catch (e: Exception) {
            promise.reject("EQ_ERROR", "Failed to get band level: ${e.message}", e)
        }
    }

    /**
     * Use a preset by index
     */
    @ReactMethod
    fun usePreset(presetIndex: Int, promise: Promise) {
        try {
            val eq = equalizer
            if (eq == null) {
                promise.reject("EQ_NOT_INITIALIZED", "Equalizer not initialized")
                return
            }

            if (presetIndex >= 0 && presetIndex < eq.numberOfPresets) {
                eq.usePreset(presetIndex.toShort())
                promise.resolve(eq.getPresetName(presetIndex.toShort()))
            } else {
                promise.reject("INVALID_PRESET", "Preset index out of range")
            }
        } catch (e: Exception) {
            promise.reject("EQ_ERROR", "Failed to use preset: ${e.message}", e)
        }
    }

    /**
     * Set bass boost strength (0-1000)
     */
    @ReactMethod
    fun setBassBoost(strength: Int, promise: Promise) {
        try {
            val bb = bassBoost
            if (bb == null) {
                promise.reject("BASS_NOT_INITIALIZED", "Bass boost not initialized")
                return
            }

            val clampedStrength = strength.coerceIn(0, 1000).toShort()
            bb.setStrength(clampedStrength)
            bb.enabled = strength > 0
            
            Log.d(TAG, "Bass boost set to $clampedStrength")
            promise.resolve(clampedStrength.toInt())
        } catch (e: Exception) {
            promise.reject("BASS_ERROR", "Failed to set bass boost: ${e.message}", e)
        }
    }

    /**
     * Set preamp gain using LoudnessEnhancer.
     * @param gainDb The gain in dB (typically -12 to +12)
     */
    @ReactMethod
    fun setPreamp(gainDb: Double, promise: Promise) {
        try {
            currentPreampDb = gainDb
            
            val le = loudnessEnhancer
            if (le == null) {
                Log.w(TAG, "LoudnessEnhancer not available, preamp not applied")
                promise.resolve(gainDb)
                return
            }

            // LoudnessEnhancer uses millibels (1 dB = 100 mB)
            val gainMb = (gainDb * 100).toInt()
            le.setTargetGain(gainMb)
            le.enabled = true
            
            Log.d(TAG, "Preamp set to ${gainDb}dB (${gainMb}mB)")
            promise.resolve(gainDb)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to set preamp: ${e.message}", e)
            promise.reject("PREAMP_ERROR", "Failed to set preamp: ${e.message}", e)
        }
    }

    /**
     * Get current preamp gain
     */
    @ReactMethod
    fun getPreamp(promise: Promise) {
        try {
            val le = loudnessEnhancer
            if (le != null) {
                val gainMb = le.targetGain
                val gainDb = gainMb / 100.0
                promise.resolve(gainDb)
            } else {
                promise.resolve(currentPreampDb)
            }
        } catch (e: Exception) {
            promise.resolve(currentPreampDb)
        }
    }

    /**
     * Set virtualizer strength (0-1000)
     */
    @ReactMethod
    fun setVirtualizer(strength: Int, promise: Promise) {
        try {
            val virt = virtualizer
            if (virt == null) {
                promise.reject("VIRT_NOT_INITIALIZED", "Virtualizer not initialized")
                return
            }

            val clampedStrength = strength.coerceIn(0, 1000).toShort()
            virt.setStrength(clampedStrength)
            virt.enabled = strength > 0
            
            Log.d(TAG, "Virtualizer set to $clampedStrength")
            promise.resolve(clampedStrength.toInt())
        } catch (e: Exception) {
            promise.reject("VIRT_ERROR", "Failed to set virtualizer: ${e.message}", e)
        }
    }

    /**
     * Get equalizer info
     */
    @ReactMethod
    fun getInfo(promise: Promise) {
        try {
            val eq = equalizer
            if (eq == null) {
                promise.reject("EQ_NOT_INITIALIZED", "Equalizer not initialized")
                return
            }

            val numBands = eq.numberOfBands
            val range = eq.bandLevelRange

            val bandInfo = Arguments.createArray()
            for (i in 0 until numBands) {
                val band = Arguments.createMap().apply {
                    putInt("index", i)
                    putInt("centerFreq", eq.getCenterFreq(i.toShort()).toInt())
                    putDouble("currentLevel", eq.getBandLevel(i.toShort()).toDouble() / 100.0)
                    
                    // Get frequency range for this band
                    val freqRange = eq.getBandFreqRange(i.toShort())
                    putInt("minFreq", freqRange[0])
                    putInt("maxFreq", freqRange[1])
                }
                bandInfo.pushMap(band)
            }

            val result = Arguments.createMap().apply {
                putInt("numberOfBands", numBands.toInt())
                putInt("minLevel", range[0].toInt())
                putInt("maxLevel", range[1].toInt())
                putBoolean("isEnabled", eq.enabled)
                putArray("bands", bandInfo)
            }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("EQ_ERROR", "Failed to get info: ${e.message}", e)
        }
    }

    /**
     * Release all audio effect resources
     */
    @ReactMethod
    fun release(promise: Promise) {
        release()
        promise.resolve(true)
    }

    private fun release() {
        try {
            equalizer?.release()
            equalizer = null
            
            bassBoost?.release()
            bassBoost = null
            
            virtualizer?.release()
            virtualizer = null
            
            loudnessEnhancer?.release()
            loudnessEnhancer = null
            
            currentPreampDb = 0.0
            
            Log.d(TAG, "Equalizer released")
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing equalizer: ${e.message}", e)
        }
    }

    /**
     * Called when React Native is destroyed
     */
    override fun invalidate() {
        release()
        super.invalidate()
    }
}
