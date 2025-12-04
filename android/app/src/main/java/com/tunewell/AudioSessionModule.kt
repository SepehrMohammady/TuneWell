package com.tunewell

import android.content.Context
import android.media.AudioManager
import android.util.Log
import com.facebook.react.bridge.*

/**
 * Native module for getting audio session information.
 * This helps connect EQ effects to the correct audio output.
 */
class AudioSessionModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "AudioSession"
    }

    override fun getName(): String = "AudioSessionModule"

    /**
     * Generate a new audio session ID for EQ effects.
     * This creates a session that can be used with AudioEffect APIs.
     */
    @ReactMethod
    fun generateAudioSessionId(promise: Promise) {
        try {
            val audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val sessionId = audioManager.generateAudioSessionId()
            Log.d(TAG, "Generated audio session ID: $sessionId")
            promise.resolve(sessionId)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to generate session ID: ${e.message}", e)
            promise.reject("SESSION_ERROR", "Failed to generate audio session ID", e)
        }
    }

    /**
     * Get current audio mode info
     */
    @ReactMethod
    fun getAudioInfo(promise: Promise) {
        try {
            val audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            
            val result = Arguments.createMap().apply {
                putInt("mode", audioManager.mode)
                putBoolean("isMusicActive", audioManager.isMusicActive)
                putInt("ringerMode", audioManager.ringerMode)
                putBoolean("isSpeakerphoneOn", audioManager.isSpeakerphoneOn)
                putBoolean("isBluetoothA2dpOn", audioManager.isBluetoothA2dpOn)
                putBoolean("isWiredHeadsetOn", audioManager.isWiredHeadsetOn)
            }
            
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get audio info: ${e.message}", e)
            promise.reject("AUDIO_INFO_ERROR", "Failed to get audio info", e)
        }
    }
}
