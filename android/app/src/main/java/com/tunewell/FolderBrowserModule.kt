package com.tunewell

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.DocumentsContract
import android.provider.Settings
import com.facebook.react.bridge.*

class FolderBrowserModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "FolderBrowserModule"

    /**
     * Whether the app has "All files access" (MANAGE_EXTERNAL_STORAGE).
     * Required to read raw file paths (e.g. DSD files) under scoped storage.
     * Always true below API 30 where READ_EXTERNAL_STORAGE suffices.
     */
    @ReactMethod
    fun hasAllFilesAccess(promise: Promise) {
        try {
            val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Environment.isExternalStorageManager()
            } else {
                true
            }
            promise.resolve(granted)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /**
     * Open the system "All files access" settings page for this app.
     */
    @ReactMethod
    fun requestAllFilesAccess(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                val activity = reactApplicationContext.currentActivity
                val launcher = activity ?: reactApplicationContext
                val intent = Intent(
                    Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION,
                    Uri.parse("package:" + reactApplicationContext.packageName),
                ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
                try {
                    launcher.startActivity(intent)
                } catch (e: Exception) {
                    // Some OEMs don't support the per-app intent; open the general list.
                    val fallback = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
                        .apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
                    launcher.startActivity(fallback)
                }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("REQUEST_FAILED", e.message, e)
        }
    }

    /**
     * List subfolders within a SAF (Storage Access Framework) URI
     * Returns an array of objects with name, uri (tree URI), and path for each subfolder
     */
    @ReactMethod
    fun listSubfolders(folderUri: String, promise: Promise) {
        try {
            val uri = Uri.parse(folderUri)
            val subfolders = Arguments.createArray()
            
            // Build the children URI for the document tree
            val treeDocumentId = DocumentsContract.getTreeDocumentId(uri)
            val childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(uri, treeDocumentId)
            
            val projection = arrayOf(
                DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                DocumentsContract.Document.COLUMN_MIME_TYPE
            )
            
            val cursor = reactApplicationContext.contentResolver.query(
                childrenUri,
                projection,
                null,
                null,
                "${DocumentsContract.Document.COLUMN_DISPLAY_NAME} ASC"
            )
            
            cursor?.use {
                val idColumn = it.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DOCUMENT_ID)
                val nameColumn = it.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DISPLAY_NAME)
                val mimeColumn = it.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_MIME_TYPE)
                
                while (it.moveToNext()) {
                    val mimeType = it.getString(mimeColumn)
                    
                    // Only include directories
                    if (mimeType == DocumentsContract.Document.MIME_TYPE_DIR) {
                        val docId = it.getString(idColumn)
                        val name = it.getString(nameColumn)
                        
                        // Build a tree URI for the subfolder using the parent's authority
                        // This preserves the permission chain from the parent
                        val subfolderTreeUri = DocumentsContract.buildTreeDocumentUri(
                            uri.authority,
                            docId
                        )
                        
                        // Also extract the file path from the document ID
                        // Document IDs typically look like "primary:Music/Subfolder"
                        var filePath: String? = null
                        if (docId.contains(":")) {
                            val parts = docId.split(":")
                            if (parts.size >= 2) {
                                val storagePart = parts[0]
                                val pathPart = parts[1]
                                filePath = if (storagePart == "primary") {
                                    "/storage/emulated/0/$pathPart"
                                } else {
                                    "/storage/$storagePart/$pathPart"
                                }
                            }
                        }
                        
                        val folderObj = Arguments.createMap().apply {
                            putString("name", name)
                            putString("uri", subfolderTreeUri.toString())
                            putString("documentId", docId)
                            putString("path", filePath ?: "")
                        }
                        subfolders.pushMap(folderObj)
                    }
                }
            }
            
            promise.resolve(subfolders)
        } catch (e: Exception) {
            // If this fails, it might not be a tree URI or permission issue
            promise.resolve(Arguments.createArray())
        }
    }
    
    /**
     * Get the display name from a SAF URI
     */
    @ReactMethod
    fun getFolderName(folderUri: String, promise: Promise) {
        try {
            val uri = Uri.parse(folderUri)
            var displayName = "Unknown"
            
            // Try to get the document ID and extract the name
            val documentId = try {
                DocumentsContract.getTreeDocumentId(uri)
            } catch (e: Exception) {
                DocumentsContract.getDocumentId(uri)
            }
            
            // The document ID often contains the path - extract the last segment
            if (documentId != null) {
                val parts = documentId.split("/", ":")
                displayName = parts.lastOrNull { it.isNotEmpty() } ?: displayName
            }
            
            promise.resolve(displayName)
        } catch (e: Exception) {
            promise.resolve("Unknown")
        }
    }
}
