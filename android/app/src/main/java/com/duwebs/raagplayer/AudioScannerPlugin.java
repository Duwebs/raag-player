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
        ),
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
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
        try {
            String perm = getRequiredPermissionString();
            return ContextCompat.checkSelfPermission(getContext(), perm) == PackageManager.PERMISSION_GRANTED;
        } catch (Exception e) {
            return false;
        }
    }

    @PluginMethod
    public void checkAudioPermission(PluginCall call) {
        JSObject ret = new JSObject();
        try {
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
        } catch (Exception e) {
            ret.put("granted", false);
            ret.put("status", "denied");
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33) {
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
                JSObject ret = new JSObject();
                ret.put("granted", true);
                call.resolve(ret);
                return;
            }
            requestPermissionForAlias("notifications", call, "notificationPermissionCallback");
        } else {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        }
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        JSObject ret = new JSObject();
        boolean granted = true;
        if (Build.VERSION.SDK_INT >= 33) {
            granted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        }
        ret.put("granted", granted);
        call.resolve(ret);
    }



    @PluginMethod
    public void requestAudioPermission(PluginCall call) {
        try {
            if (isAudioPermissionGranted()) {
                JSObject ret = new JSObject();
                ret.put("granted", true);
                ret.put("status", "granted");
                call.resolve(ret);
                return;
            }

            String alias = getRequiredAlias();
            requestPermissionForAlias(alias, call, "audioPermissionCallback");
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("granted", false);
            ret.put("status", "denied");
            call.resolve(ret);
        }
    }

    @PermissionCallback
    private void audioPermissionCallback(PluginCall call) {
        JSObject ret = new JSObject();
        try {
            boolean granted = isAudioPermissionGranted();
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
        } catch (Exception e) {
            ret.put("granted", false);
            ret.put("status", "denied");
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
            JSObject emptyRes = new JSObject();
            emptyRes.put("tracks", new JSArray());
            call.resolve(emptyRes);
            return;
        }

        bridge.execute(() -> {
            JSArray trackArray = new JSArray();
            try {
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

                // Query audio files across device
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
                            long id = System.currentTimeMillis();
                            if (idCol >= 0 && !cursor.isNull(idCol)) {
                                try {
                                    id = cursor.getLong(idCol);
                                } catch (Exception ignore) {}
                            }

                            String title = "";
                            if (titleCol >= 0 && !cursor.isNull(titleCol)) {
                                try {
                                    title = cursor.getString(titleCol);
                                } catch (Exception ignore) {}
                            }

                            String artist = "Unknown Artist";
                            if (artistCol >= 0 && !cursor.isNull(artistCol)) {
                                try {
                                    String a = cursor.getString(artistCol);
                                    if (a != null && !a.trim().isEmpty() && !a.equalsIgnoreCase("<unknown>")) {
                                        artist = a;
                                    }
                                } catch (Exception ignore) {}
                            }

                            String album = "Unknown Album";
                            if (albumCol >= 0 && !cursor.isNull(albumCol)) {
                                try {
                                    String al = cursor.getString(albumCol);
                                    if (al != null && !al.trim().isEmpty() && !al.equalsIgnoreCase("<unknown>")) {
                                        album = al;
                                    }
                                } catch (Exception ignore) {}
                            }

                            long durationMs = 0L;
                            if (durationCol >= 0 && !cursor.isNull(durationCol)) {
                                try {
                                    durationMs = cursor.getLong(durationCol);
                                } catch (Exception ignore) {}
                            }

                            String filePath = "";
                            if (dataCol >= 0 && !cursor.isNull(dataCol)) {
                                try {
                                    String dp = cursor.getString(dataCol);
                                    if (dp != null) filePath = dp;
                                } catch (Exception ignore) {}
                            }

                            long size = 0L;
                            if (sizeCol >= 0 && !cursor.isNull(sizeCol)) {
                                try {
                                    size = cursor.getLong(sizeCol);
                                } catch (Exception ignore) {}
                            }

                            long dateAdded = System.currentTimeMillis() / 1000;
                            if (dateAddedCol >= 0 && !cursor.isNull(dateAddedCol)) {
                                try {
                                    dateAdded = cursor.getLong(dateAddedCol);
                                } catch (Exception ignore) {}
                            }

                            long albumId = -1L;
                            if (albumIdCol >= 0 && !cursor.isNull(albumIdCol)) {
                                try {
                                    albumId = cursor.getLong(albumIdCol);
                                } catch (Exception ignore) {}
                            }

                            if (title == null || title.trim().isEmpty()) {
                                if (!filePath.isEmpty()) {
                                    try {
                                        File f = new File(filePath);
                                        String name = f.getName();
                                        title = name.replaceFirst("[.][^.]+$", "");
                                    } catch (Exception e) {
                                        title = "Track " + id;
                                    }
                                } else {
                                    title = "Track " + id;
                                }
                            }

                            String folder = "Internal Storage";
                            if (!filePath.isEmpty()) {
                                try {
                                    File f = new File(filePath);
                                    File parent = f.getParentFile();
                                    if (parent != null && parent.getName() != null && !parent.getName().isEmpty()) {
                                        folder = parent.getName();
                                    }
                                } catch (Exception ignore) {}
                            }

                            Uri contentUri = ContentUris.withAppendedId(audioUri, id);
                            String albumArtUri = "";
                            if (albumId >= 0) {
                                try {
                                    Uri rawArt = ContentUris.withAppendedId(Uri.parse("content://media/external/audio/albumart"), albumId);
                                    albumArtUri = rawArt.toString();
                                } catch (Exception ignore) {}
                            }

                            String format = "mp3";
                            if (!filePath.isEmpty() && filePath.contains(".")) {
                                try {
                                    format = filePath.substring(filePath.lastIndexOf('.') + 1).toLowerCase();
                                } catch (Exception ignore) {}
                            }

                            JSObject trackObj = new JSObject();
                            trackObj.put("id", "media-" + id);
                            trackObj.put("title", title);
                            trackObj.put("artist", artist);
                            trackObj.put("album", album);
                            trackObj.put("duration", durationMs > 0 ? (double) durationMs / 1000.0 : 0.0);
                            trackObj.put("filePath", filePath);
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
                }
            } catch (Exception ex) {
                // Return empty list so client never crashes
            }

            JSObject result = new JSObject();
            result.put("tracks", trackArray);
            call.resolve(result);
        });
    }
}
