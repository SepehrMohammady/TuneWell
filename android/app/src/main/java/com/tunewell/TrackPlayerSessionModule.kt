package com.tunewell

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Binder
import android.os.IBinder
import android.util.Log
import com.facebook.react.bridge.*
import kotlinx.coroutines.*
import java.lang.reflect.Method

/**
 * Native module to get audio session ID from react-native-track-player's ExoPlayer.
 * This allows us to attach EQ effects to the actual audio output.
 */
class TrackPlayerSessionModule(private val reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext), ServiceConnection {

    companion object {
        private const val TAG = "TrackPlayerSession"
        private const val MUSIC_SERVICE_CLASS = "com.doublesymmetry.trackplayer.service.MusicService"
    }

    private var musicService: Any? = null
    private var pendingPromise: Promise? = null
    private var isBound = false

    override fun getName(): String = "TrackPlayerSessionModule"

    override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
        Log.d(TAG, "Service connected: $name")
        try {
            // The binder has a 'service' property that returns MusicService
            val binderClass = service?.javaClass
            val serviceField = binderClass?.getDeclaredMethod("getService")
            if (serviceField != null) {
                musicService = serviceField.invoke(service)
                Log.d(TAG, "Got MusicService instance")
            } else {
                // Try reflection on the binder to get service field
                val fields = binderClass?.declaredFields
                fields?.forEach { field ->
                    Log.d(TAG, "Binder field: ${field.name} - ${field.type}")
                }
                
                // Access the service directly from MusicBinder
                val serviceGetter = binderClass?.getMethod("getService")
                if (serviceGetter != null) {
                    musicService = serviceGetter.invoke(service)
                }
            }
            
            // Now try to resolve pending promise if any
            resolvePendingPromise()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get service from binder: ${e.message}", e)
            pendingPromise?.reject("SERVICE_ERROR", e.message, e)
            pendingPromise = null
        }
        isBound = true
    }

    override fun onServiceDisconnected(name: ComponentName?) {
        Log.d(TAG, "Service disconnected: $name")
        musicService = null
        isBound = false
    }

    private fun resolvePendingPromise() {
        val promise = pendingPromise ?: return
        pendingPromise = null
        
        try {
            val sessionId = getAudioSessionIdFromService()
            if (sessionId != null) {
                val result = Arguments.createMap().apply {
                    putInt("sessionId", sessionId)
                    putString("source", "exoplayer")
                }
                promise.resolve(result)
            } else {
                promise.reject("SESSION_NOT_FOUND", "Could not get audio session from ExoPlayer")
            }
        } catch (e: Exception) {
            promise.reject("SESSION_ERROR", e.message, e)
        }
    }

    private fun getAudioSessionIdFromService(): Int? {
        val service = musicService ?: return null
        
        try {
            // Get the player field from MusicService
            val serviceClass = service.javaClass
            val playerField = serviceClass.getDeclaredField("player")
            playerField.isAccessible = true
            val player = playerField.get(service) ?: return null
            
            Log.d(TAG, "Got player: ${player.javaClass.name}")
            
            // Get exoPlayer from the player (QueuedAudioPlayer or BaseAudioPlayer)
            val playerClass = player.javaClass
            val exoPlayerField = playerClass.superclass?.getDeclaredField("exoPlayer")
                ?: playerClass.getDeclaredField("exoPlayer")
            exoPlayerField.isAccessible = true
            val exoPlayer = exoPlayerField.get(player) ?: return null
            
            Log.d(TAG, "Got ExoPlayer: ${exoPlayer.javaClass.name}")
            
            // Get audioSessionId from ExoPlayer
            val getAudioSessionId = exoPlayer.javaClass.getMethod("getAudioSessionId")
            val sessionId = getAudioSessionId.invoke(exoPlayer) as Int
            
            Log.d(TAG, "Got audio session ID: $sessionId")
            return sessionId
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get audio session from service: ${e.message}", e)
            return null
        }
    }

    /**
     * Get the audio session ID from TrackPlayer's ExoPlayer.
     */
    @ReactMethod
    fun getAudioSessionId(promise: Promise) {
        // First check if we already have the service
        if (musicService != null) {
            try {
                val sessionId = getAudioSessionIdFromService()
                if (sessionId != null && sessionId != 0) {
                    val result = Arguments.createMap().apply {
                        putInt("sessionId", sessionId)
                        putString("source", "exoplayer")
                    }
                    promise.resolve(result)
                    return
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to get session from cached service: ${e.message}")
            }
        }
        
        // Try to bind to the service
        try {
            pendingPromise = promise
            val intent = Intent()
            intent.setClassName(reactContext.packageName, MUSIC_SERVICE_CLASS)
            val bound = reactContext.bindService(intent, this, Context.BIND_AUTO_CREATE)
            
            if (!bound) {
                Log.w(TAG, "Could not bind to MusicService, using fallback")
                pendingPromise = null
                
                // Fallback: return session 0 (global output)
                val result = Arguments.createMap().apply {
                    putInt("sessionId", 0)
                    putString("source", "global_output")
                    putString("note", "Could not connect to player service. Using global output session.")
                }
                promise.resolve(result)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to bind to service: ${e.message}", e)
            pendingPromise = null
            promise.reject("BIND_ERROR", e.message, e)
        }
    }

    /**
     * Fallback method using AudioManager
     */
    @ReactMethod
    fun getGeneratedSessionId(promise: Promise) {
        try {
            val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as android.media.AudioManager
            val sessionId = audioManager.generateAudioSessionId()
            
            val result = Arguments.createMap().apply {
                putInt("sessionId", sessionId)
                putString("source", "generated")
                putBoolean("isMusicActive", audioManager.isMusicActive)
            }
            
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("SESSION_ERROR", e.message, e)
        }
    }

    override fun invalidate() {
        if (isBound) {
            try {
                reactContext.unbindService(this)
            } catch (e: Exception) {
                Log.e(TAG, "Error unbinding service: ${e.message}")
            }
        }
        super.invalidate()
    }
}
