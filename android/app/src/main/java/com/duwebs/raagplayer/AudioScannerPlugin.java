package com.duwebs.raagplayer;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.provider.Settings;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.PermissionState;

import java.io.File;

@CapacitorPlugin(
    name = "AudioScanner",
    permissions = {
        @Permission(
            alias = "audio",
            strings = { Manifest.permission.READ_MEDIA_AUDIO }
        ),
        @Permission(
            alias = "storage",
            strings = { Manifest.permission.READ_EXTERNAL_STORAGE }
        )
    }
)
public class AudioScannerPlugin extends Plugin {

    private String getRequiredPermissionString() {
        if (Build.VERSION.SDK_INT >= 33) {
            return Manifest.permission.READ_MEDIA_AUDIO;
        } else {
            return Manifest.permission.READ_EXTERNAL_STORAGE;
        }
    }

    private String getRequiredAlias() {
        return Build.VERSION.SDK_INT >= 33 ? "audio" : "storage";
    }

    private boolean isAudioPermissionGranted() {
        String perm = getRequiredPermissionString();
        return ContextCompat.checkSelfPermission(getContext(), perm) == PackageManager.PERMISSION_GRANTED;
    }

    @PluginMethod
    public void checkAudioPermission(PluginCall call) {
        JSObject ret = new JSObject();
        boolean granted = isAudioPermissionGranted();
        ret.put("granted", granted);

        if (granted) {
            ret.put("status", "granted");
        } else {
            String perm = getRequiredPermissionString();
            boolean canShowRationale = ActivityCompat.shouldShowRequestPermissionRationale(getActivity(), perm);
            PermissionState state = getPermissionState(getRequiredAlias());

            if (state == PermissionState.DENIED && !canShowRationale) {
                ret.put("status", "never_ask_again");
            } else {
                ret.put("status", "denied");
            }
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void requestAudioPermission(PluginCall call) {
        if (isAudioPermissionGranted()) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            ret.put("status", "granted");
            call.resolve(ret);
            return;
        }

        String alias = getRequiredAlias();
        requestPermissionForAlias(alias, call, "audioPermissionCallback");
    }

    @PermissionCallback
    private void audioPermissionCallback(PluginCall call) {
        boolean granted = isAudioPermissionGranted();
        JSObject ret = new JSObject();
        ret.put("granted", granted);

        if (granted) {
            ret.put("status", "granted");
        } else {
            String perm = getRequiredPermissionString();
            boolean canShowRationale = ActivityCompat.shouldShowRequestPermissionRationale(getActivity(), perm);
            if (!canShowRationale) {
                ret.put("status", "never_ask_again");
            } else {
                ret.put("status", "denied");
            }
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            Uri uri = Uri.fromParts("package", getContext().getPackageName(), null);
            intent.setData(uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open app settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getAllDeviceAudio(PluginCall call) {
        if (!isAudioPermissionGranted()) {
            call.reject("Permission not granted to access device audio.");
            return;
        }

        bridge.execute(() -> {
            JSArray trackArray = new JSArray();
            ContentResolver resolver = getContext().getContentResolver();
            Uri audioUri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;

            String[] projection = new String[] {
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.TITLE,
                MediaStore.Audio.Media.ARTIST,
                MediaStore.Audio.Media.ALBUM,
                MediaStore.Audio.Media.DURATION,
                MediaStore.Audio.Media.DATA,
                MediaStore.Audio.Media.SIZE,
                MediaStore.Audio.Media.DATE_ADDED,
                MediaStore.Audio.Media.ALBUM_ID
            };

            // Audio files across device: IS_MUSIC != 0 or audio MIME types, excluding ringtones and alarms
            String selection = "(" + MediaStore.Audio.Media.IS_MUSIC + " != 0 OR "
                + MediaStore.Audio.Media.MIME_TYPE + " LIKE 'audio/%') AND "
                + MediaStore.Audio.Media.IS_RINGTONE + " == 0 AND "
                + MediaStore.Audio.Media.IS_NOTIFICATION + " == 0 AND "
                + MediaStore.Audio.Media.IS_ALARM + " == 0";

            String sortOrder = MediaStore.Audio.Media.TITLE + " COLLATE NOCASE ASC";

            try (Cursor cursor = resolver.query(audioUri, projection, selection, null, sortOrder)) {
                if (cursor != null) {
                    int idCol = cursor.getColumnIndex(MediaStore.Audio.Media._ID);
                    int titleCol = cursor.getColumnIndex(MediaStore.Audio.Media.TITLE);
                    int artistCol = cursor.getColumnIndex(MediaStore.Audio.Media.ARTIST);
                    int albumCol = cursor.getColumnIndex(MediaStore.Audio.Media.ALBUM);
                    int durationCol = cursor.getColumnIndex(MediaStore.Audio.Media.DURATION);
                    int dataCol = cursor.getColumnIndex(MediaStore.Audio.Media.DATA);
                    int sizeCol = cursor.getColumnIndex(MediaStore.Audio.Media.SIZE);
                    int dateAddedCol = cursor.getColumnIndex(MediaStore.Audio.Media.DATE_ADDED);
                    int albumIdCol = cursor.getColumnIndex(MediaStore.Audio.Media.ALBUM_ID);

                    while (cursor.moveToNext()) {
                        long id = cursor.getLong(idCol);
                        String title = titleCol >= 0 ? cursor.getString(titleCol) : null;
                        String artist = artistCol >= 0 ? cursor.getString(artistCol) : null;
                        String album = albumCol >= 0 ? cursor.getString(albumCol) : null;
                        long durationMs = durationCol >= 0 ? cursor.getLong(durationCol) : 0;
                        String filePath = dataCol >= 0 ? cursor.getString(dataCol) : null;
                        long size = sizeCol >= 0 ? cursor.getLong(sizeCol) : 0;
                        long dateAdded = dateAddedCol >= 0 ? cursor.getLong(dateAddedCol) : 0;
                        long albumId = albumIdCol >= 0 ? cursor.getLong(albumIdCol) : -1;

                        if (title == null || title.trim().isEmpty()) {
                            if (filePath != null) {
                                File f = new File(filePath);
                                String name = f.getName();
                                title = name.replaceFirst("[.][^.]+$", "");
                            } else {
                                title = "Track " + id;
                            }
                        }

                        if (artist == null || artist.equalsIgnoreCase("<unknown>") || artist.trim().isEmpty()) {
                            artist = "Unknown Artist";
                        }
                        if (album == null || album.equalsIgnoreCase("<unknown>") || album.trim().isEmpty()) {
                            album = "Unknown Album";
                        }

                        String folder = "Internal Storage";
                        if (filePath != null && !filePath.isEmpty()) {
                            try {
                                File f = new File(filePath);
                                File parent = f.getParentFile();
                                if (parent != null) {
                                    folder = parent.getName();
                                }
                            } catch (Exception ignore) {}
                        }

                        Uri contentUri = ContentUris.withAppendedId(audioUri, id);
                        String albumArtUri = "";
                        if (albumId >= 0) {
                            Uri rawArt = ContentUris.withAppendedId(Uri.parse("content://media/external/audio/albumart"), albumId);
                            albumArtUri = rawArt.toString();
                        }

                        String format = "mp3";
                        if (filePath != null && filePath.contains(".")) {
                            format = filePath.substring(filePath.lastIndexOf('.') + 1).toLowerCase();
                        }

                        JSObject trackObj = new JSObject();
                        trackObj.put("id", "media-" + id);
                        trackObj.put("title", title);
                        trackObj.put("artist", artist);
                        trackObj.put("album", album);
                        trackObj.put("duration", durationMs > 0 ? (double) durationMs / 1000.0 : 0);
                        trackObj.put("filePath", filePath != null ? filePath : "");
                        trackObj.put("contentUri", contentUri.toString());
                        trackObj.put("albumArtUri", albumArtUri);
                        trackObj.put("folder", folder);
                        trackObj.put("format", format);
                        trackObj.put("size", size);
                        trackObj.put("dateAdded", dateAdded > 0 ? dateAdded * 1000 : System.currentTimeMillis());
                        trackObj.put("isFavorite", false);
                        trackObj.put("playCount", 0);

                        trackArray.put(trackObj);
                    }
                }

                JSObject result = new JSObject();
                result.put("tracks", trackArray);
                call.resolve(result);
            } catch (Exception ex) {
                call.reject("Error scanning MediaStore: " + ex.getMessage(), ex);
            }
        });
    }
}
