package com.duwebs.raagplayer;

import android.content.Context;
import android.content.Intent;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MediaControls")
public class MediaControlsPlugin extends Plugin {

    private static volatile MediaControlsPlugin activeInstance = null;

    @Override
    public void load() {
        activeInstance = this;
        super.load();
    }

    @Override
    protected void handleOnDestroy() {
        if (activeInstance == this) {
            activeInstance = null;
        }
        super.handleOnDestroy();
    }

    public static void emitMediaAction(String action, double positionSeconds) {
        MediaControlsPlugin instance = activeInstance;
        if (instance == null || instance.getBridge() == null) {
            return;
        }
        JSObject payload = new JSObject();
        payload.put("action", action);
        if ("seek".equals(action)) {
            payload.put("position", positionSeconds);
        }
        try {
            instance.notifyListeners("mediaAction", payload, true);
        } catch (Exception ignored) {
        }
    }

    @PluginMethod
    public void updateMetadata(PluginCall call) {
        String title = call.getString("title", "Raag Player");
        String artist = call.getString("artist", "Unknown Artist");
        String album = call.getString("album", "Raag Player");
        double durationSec = call.getDouble("duration", 0.0);
        String artwork = call.getString("artwork", "");
        String filePath = call.getString("filePath", "");

        long durationMs = durationSec > 0 ? Math.round(durationSec * 1000.0) : 0L;
        MediaPlaybackService.pendingArtworkSource = artwork != null ? artwork : "";

        MediaPlaybackService running = MediaPlaybackService.activeServiceInstance;
        if (running != null) {
            running.applyMetadata(title, artist, album, durationMs, MediaPlaybackService.pendingArtworkSource, filePath);
            call.resolve();
            return;
        }

        try {
            Context context = getContext();
            Intent intent = new Intent(context, MediaPlaybackService.class);
            intent.setAction(MediaPlaybackService.ACTION_UPDATE_METADATA);
            intent.putExtra(MediaPlaybackService.EXTRA_TITLE, title);
            intent.putExtra(MediaPlaybackService.EXTRA_ARTIST, artist);
            intent.putExtra(MediaPlaybackService.EXTRA_ALBUM, album);
            intent.putExtra(MediaPlaybackService.EXTRA_DURATION_MS, durationMs);
            intent.putExtra(MediaPlaybackService.EXTRA_FILE_PATH, filePath);
            ContextCompat.startForegroundService(context, intent);
        } catch (Exception e) {
            call.reject("Failed to update media metadata: " + e.getMessage());
            return;
        }
        call.resolve();
    }

    @PluginMethod
    public void updatePlaybackState(PluginCall call) {
        boolean isPlaying = call.getBoolean("isPlaying", false);
        double positionSec = call.getDouble("position", 0.0);
        double durationSec = call.getDouble("duration", 0.0);
        float playbackRate = call.getFloat("playbackRate", 1.0f);

        long positionMs = positionSec >= 0 ? Math.round(positionSec * 1000.0) : 0L;
        long durationMs = durationSec > 0 ? Math.round(durationSec * 1000.0) : 0L;

        MediaPlaybackService running = MediaPlaybackService.activeServiceInstance;
        if (running != null) {
            running.applyPlaybackState(isPlaying, positionMs, durationMs, playbackRate);
            call.resolve();
            return;
        }

        if (!isPlaying) {
            call.resolve();
            return;
        }

        try {
            Context context = getContext();
            Intent intent = new Intent(context, MediaPlaybackService.class);
            intent.setAction(MediaPlaybackService.ACTION_UPDATE_STATE);
            intent.putExtra(MediaPlaybackService.EXTRA_IS_PLAYING, isPlaying);
            intent.putExtra(MediaPlaybackService.EXTRA_POSITION_MS, positionMs);
            intent.putExtra(MediaPlaybackService.EXTRA_DURATION_MS, durationMs);
            intent.putExtra(MediaPlaybackService.EXTRA_PLAYBACK_RATE, playbackRate);
            ContextCompat.startForegroundService(context, intent);
        } catch (Exception e) {
            call.reject("Failed to update playback state: " + e.getMessage());
            return;
        }
        call.resolve();
    }

    @PluginMethod
    public void stopService(PluginCall call) {
        try {
            Context context = getContext();
            Intent intent = new Intent(context, MediaPlaybackService.class);
            intent.setAction(MediaPlaybackService.ACTION_STOP);
            context.startService(intent);
        } catch (Exception ignored) {
        }
        call.resolve();
    }
}
