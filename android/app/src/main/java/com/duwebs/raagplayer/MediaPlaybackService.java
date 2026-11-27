package com.duwebs.raagplayer;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioManager;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.util.Base64;
import android.util.Size;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

import java.io.File;
import java.io.InputStream;
import java.net.URLDecoder;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MediaPlaybackService extends Service {

    public static final String CHANNEL_ID = "raag_playback_channel";
    public static final int NOTIFICATION_ID = 4201;

    public static final String ACTION_UPDATE_METADATA = "com.duwebs.raagplayer.ACTION_UPDATE_METADATA";
    public static final String ACTION_UPDATE_STATE = "com.duwebs.raagplayer.ACTION_UPDATE_STATE";
    public static final String ACTION_PLAY_PAUSE = "com.duwebs.raagplayer.ACTION_PLAY_PAUSE";
    public static final String ACTION_NEXT = "com.duwebs.raagplayer.ACTION_NEXT";
    public static final String ACTION_PREV = "com.duwebs.raagplayer.ACTION_PREV";
    public static final String ACTION_STOP = "com.duwebs.raagplayer.ACTION_STOP";

    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_ARTIST = "artist";
    public static final String EXTRA_ALBUM = "album";
    public static final String EXTRA_DURATION_MS = "durationMs";
    public static final String EXTRA_POSITION_MS = "positionMs";
    public static final String EXTRA_IS_PLAYING = "isPlaying";
    public static final String EXTRA_PLAYBACK_RATE = "playbackRate";
    public static final String EXTRA_FILE_PATH = "filePath";

    // Stores active artwork source in-process to avoid Intent Binder TransactionTooLargeException
    public static volatile String pendingArtworkSource = "";
    public static volatile MediaPlaybackService activeServiceInstance = null;

    private MediaSessionCompat mediaSession;
    private PowerManager.WakeLock wakeLock;
    private ExecutorService artExecutor;
    private NotificationManager notificationManager;

    private String currentTitle = "Raag Player";
    private String currentArtist = "Tap to play";
    private String currentAlbum = "Raag Player";
    private long currentDurationMs = 0L;
    private long currentPositionMs = 0L;
    private boolean currentIsPlaying = false;
    private float currentPlaybackRate = 1.0f;
    private String currentFilePath = "";
    private String loadedArtworkKey = "";
    private Bitmap currentArtworkBitmap = null;
    private boolean noisyReceiverRegistered = false;

    private final BroadcastReceiver becomingNoisyReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (AudioManager.ACTION_AUDIO_BECOMING_NOISY.equals(intent.getAction())) {
                if (currentIsPlaying) {
                    currentIsPlaying = false;
                    updatePlaybackStateInternal();
                    refreshNotification();
                    MediaControlsPlugin.emitMediaAction("pause", currentPositionMs / 1000.0);
                }
            }
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        activeServiceInstance = this;
        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        artExecutor = Executors.newSingleThreadExecutor();
        createNotificationChannel();
        initMediaSession();

        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "RaagPlayer::MediaPlaybackWakeLock");
            wakeLock.setReferenceCounted(false);
        }

        try {
            IntentFilter noisyFilter = new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(becomingNoisyReceiver, noisyFilter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                registerReceiver(becomingNoisyReceiver, noisyFilter);
            }
            noisyReceiverRegistered = true;
        } catch (Exception ignored) {
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && notificationManager != null) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Raag Player Playback",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Lockscreen and notification playback controls");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            notificationManager.createNotificationChannel(channel);
        }
    }

    private void initMediaSession() {
        mediaSession = new MediaSessionCompat(this, "RaagPlayerMediaSession");
        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                currentIsPlaying = true;
                updateWakeLock(true);
                updatePlaybackStateInternal();
                refreshNotification();
                MediaControlsPlugin.emitMediaAction("play", currentPositionMs / 1000.0);
            }

            @Override
            public void onPause() {
                currentIsPlaying = false;
                updateWakeLock(false);
                updatePlaybackStateInternal();
                refreshNotification();
                MediaControlsPlugin.emitMediaAction("pause", currentPositionMs / 1000.0);
            }

            @Override
            public void onSkipToNext() {
                MediaControlsPlugin.emitMediaAction("next", 0);
            }

            @Override
            public void onSkipToPrevious() {
                MediaControlsPlugin.emitMediaAction("prev", 0);
            }

            @Override
            public void onSeekTo(long pos) {
                currentPositionMs = Math.max(0L, pos);
                updatePlaybackStateInternal();
                refreshNotification();
                MediaControlsPlugin.emitMediaAction("seek", currentPositionMs / 1000.0);
            }

            @Override
            public void onStop() {
                handleStopRequest();
            }
        });
        mediaSession.setActive(true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;

        if (ACTION_STOP.equals(action)) {
            handleStopRequest();
            return START_NOT_STICKY;
        }

        if (ACTION_PLAY_PAUSE.equals(action)) {
            if (currentIsPlaying) {
                currentIsPlaying = false;
                updateWakeLock(false);
                updatePlaybackStateInternal();
                ensureForegroundStarted();
                MediaControlsPlugin.emitMediaAction("pause", currentPositionMs / 1000.0);
            } else {
                currentIsPlaying = true;
                updateWakeLock(true);
                updatePlaybackStateInternal();
                ensureForegroundStarted();
                MediaControlsPlugin.emitMediaAction("play", currentPositionMs / 1000.0);
            }
            return START_STICKY;
        }

        if (ACTION_NEXT.equals(action)) {
            ensureForegroundStarted();
            MediaControlsPlugin.emitMediaAction("next", 0);
            return START_STICKY;
        }

        if (ACTION_PREV.equals(action)) {
            ensureForegroundStarted();
            MediaControlsPlugin.emitMediaAction("prev", 0);
            return START_STICKY;
        }

        if (intent != null && ACTION_UPDATE_METADATA.equals(action)) {
            String title = intent.getStringExtra(EXTRA_TITLE);
            String artist = intent.getStringExtra(EXTRA_ARTIST);
            String album = intent.getStringExtra(EXTRA_ALBUM);
            long durationMs = intent.getLongExtra(EXTRA_DURATION_MS, currentDurationMs);
            String filePath = intent.getStringExtra(EXTRA_FILE_PATH);
            applyMetadata(title, artist, album, durationMs, pendingArtworkSource, filePath);
            ensureForegroundStarted();
            return START_STICKY;
        }

        if (intent != null && ACTION_UPDATE_STATE.equals(action)) {
            boolean playing = intent.getBooleanExtra(EXTRA_IS_PLAYING, currentIsPlaying);
            long posMs = intent.getLongExtra(EXTRA_POSITION_MS, currentPositionMs);
            long durMs = intent.getLongExtra(EXTRA_DURATION_MS, currentDurationMs);
            float rate = intent.getFloatExtra(EXTRA_PLAYBACK_RATE, currentPlaybackRate);
            applyPlaybackState(playing, posMs, durMs, rate);
            ensureForegroundStarted();
            return START_STICKY;
        }

        ensureForegroundStarted();
        return START_STICKY;
    }

    public void applyMetadata(
        String title,
        String artist,
        String album,
        long durationMs,
        String artworkSource,
        String filePath
    ) {
        currentTitle = (title != null && !title.isEmpty()) ? title : "Raag Player";
        currentArtist = (artist != null && !artist.isEmpty()) ? artist : "Unknown Artist";
        currentAlbum = (album != null && !album.isEmpty()) ? album : "Raag Player";
        if (durationMs > 0) {
            currentDurationMs = durationMs;
        }
        currentFilePath = filePath != null ? filePath : "";

        String artKey = (artworkSource != null ? artworkSource : "") + "|" + currentFilePath;
        updateMediaMetadataCompat();
        refreshNotification();

        if (!artKey.equals(loadedArtworkKey)) {
            loadedArtworkKey = artKey;
            final String artUriCopy = artworkSource;
            final String pathCopy = currentFilePath;
            artExecutor.execute(() -> {
                Bitmap decoded = loadBitmap(artUriCopy, pathCopy);
                if (decoded == null) {
                    decoded = getDefaultArtworkBitmap();
                }
                currentArtworkBitmap = decoded;
                updateMediaMetadataCompat();
                refreshNotification();
            });
        }
    }

    public void applyPlaybackState(boolean isPlaying, long positionMs, long durationMs, float playbackRate) {
        currentIsPlaying = isPlaying;
        currentPositionMs = Math.max(0L, positionMs);
        if (durationMs > 0 && durationMs != currentDurationMs) {
            currentDurationMs = durationMs;
            updateMediaMetadataCompat();
        }
        currentPlaybackRate = playbackRate > 0 ? playbackRate : 1.0f;
        updateWakeLock(isPlaying);
        updatePlaybackStateInternal();
        refreshNotification();
    }

    private void updateWakeLock(boolean active) {
        if (wakeLock == null) return;
        try {
            if (active && !wakeLock.isHeld()) {
                wakeLock.acquire(4 * 60 * 60 * 1000L);
            } else if (!active && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception ignored) {
        }
    }

    private void updateMediaMetadataCompat() {
        if (mediaSession == null) return;
        MediaMetadataCompat.Builder builder = new MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, currentAlbum)
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, currentDurationMs);

        if (currentArtworkBitmap != null && !currentArtworkBitmap.isRecycled()) {
            builder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, currentArtworkBitmap);
            builder.putBitmap(MediaMetadataCompat.METADATA_KEY_ART, currentArtworkBitmap);
        }
        mediaSession.setMetadata(builder.build());
    }

    private void updatePlaybackStateInternal() {
        if (mediaSession == null) return;
        long actions = PlaybackStateCompat.ACTION_PLAY
            | PlaybackStateCompat.ACTION_PAUSE
            | PlaybackStateCompat.ACTION_PLAY_PAUSE
            | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
            | PlaybackStateCompat.ACTION_SKIP_TO_NEXT
            | PlaybackStateCompat.ACTION_SEEK_TO
            | PlaybackStateCompat.ACTION_STOP;

        int state = currentIsPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;
        float speed = currentIsPlaying ? currentPlaybackRate : 0.0f;

        PlaybackStateCompat playbackState = new PlaybackStateCompat.Builder()
            .setActions(actions)
            .setState(state, currentPositionMs, speed)
            .build();
        mediaSession.setPlaybackState(playbackState);
    }

    private PendingIntent createServicePendingIntent(String action, int requestCode) {
        Intent intent = new Intent(this, MediaPlaybackService.class);
        intent.setAction(action);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !ACTION_STOP.equals(action)) {
            return PendingIntent.getForegroundService(this, requestCode, intent, flags);
        }
        return PendingIntent.getService(this, requestCode, intent, flags);
    }

    private PendingIntent createLaunchAppPendingIntent() {
        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private Notification buildNotification() {
        Bitmap largeIcon = (currentArtworkBitmap != null && !currentArtworkBitmap.isRecycled())
            ? currentArtworkBitmap
            : getDefaultArtworkBitmap();

        NotificationCompat.Action prevAction = new NotificationCompat.Action(
            R.drawable.ic_media_prev,
            "Previous",
            createServicePendingIntent(ACTION_PREV, 101)
        );
        NotificationCompat.Action playPauseAction = new NotificationCompat.Action(
            currentIsPlaying ? R.drawable.ic_media_pause : R.drawable.ic_media_play,
            currentIsPlaying ? "Pause" : "Play",
            createServicePendingIntent(ACTION_PLAY_PAUSE, 102)
        );
        NotificationCompat.Action nextAction = new NotificationCompat.Action(
            R.drawable.ic_media_next,
            "Next",
            createServicePendingIntent(ACTION_NEXT, 103)
        );
        NotificationCompat.Action closeAction = new NotificationCompat.Action(
            R.drawable.ic_media_close,
            "Close",
            createServicePendingIntent(ACTION_STOP, 104)
        );

        MediaStyle mediaStyle = new MediaStyle()
            .setMediaSession(mediaSession.getSessionToken())
            .setShowActionsInCompactView(0, 1, 2);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(currentTitle)
            .setContentText(currentArtist)
            .setSubText(currentAlbum)
            .setSmallIcon(R.drawable.ic_media_music)
            .setLargeIcon(largeIcon)
            .setContentIntent(createLaunchAppPendingIntent())
            .setDeleteIntent(createServicePendingIntent(ACTION_STOP, 105))
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOnlyAlertOnce(true)
            .setOngoing(currentIsPlaying)
            .setShowWhen(false)
            .addAction(prevAction)
            .addAction(playPauseAction)
            .addAction(nextAction)
            .addAction(closeAction)
            .setStyle(mediaStyle)
            .build();
    }

    private void ensureForegroundStarted() {
        Notification notification = buildNotification();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            if (notificationManager != null) {
                notificationManager.notify(NOTIFICATION_ID, notification);
            }
        }
    }

    private void refreshNotification() {
        if (notificationManager == null) return;
        try {
            notificationManager.notify(NOTIFICATION_ID, buildNotification());
        } catch (Exception ignored) {
        }
    }

    private void handleStopRequest() {
        currentIsPlaying = false;
        updateWakeLock(false);
        updatePlaybackStateInternal();
        MediaControlsPlugin.emitMediaAction("stop", 0);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE);
            } else {
                stopForeground(true);
            }
        } catch (Exception ignored) {
        }
        if (notificationManager != null) {
            notificationManager.cancel(NOTIFICATION_ID);
        }
        stopSelf();
    }

    private Bitmap getDefaultArtworkBitmap() {
        try {
            return BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher);
        } catch (Exception e) {
            return null;
        }
    }

    @Nullable
    private Bitmap loadBitmap(String artUri, String filePath) {
        // 1. Decode base64 data URL
        if (artUri != null && artUri.startsWith("data:image")) {
            try {
                int commaIdx = artUri.indexOf(',');
                if (commaIdx != -1) {
                    String b64 = artUri.substring(commaIdx + 1);
                    byte[] bytes = Base64.decode(b64, Base64.DEFAULT);
                    Bitmap bmp = decodeSampledBytes(bytes, 512, 512);
                    if (bmp != null) return bmp;
                }
            } catch (Exception ignored) {
            }
        }

        // 2. Unwrap Capacitor local server URL back to native path/content URI
        String normalized = artUri;
        if (normalized != null && normalized.contains("/_capacitor_file_")) {
            int idx = normalized.indexOf("/_capacitor_file_");
            normalized = normalized.substring(idx + "/_capacitor_file_".length());
            try {
                normalized = URLDecoder.decode(normalized, "UTF-8");
            } catch (Exception ignored) {
            }
        }

        // 3. Load from content:// URI
        if (normalized != null && normalized.startsWith("content://")) {
            try {
                Uri uri = Uri.parse(normalized);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    try {
                        Bitmap thumb = getContentResolver().loadThumbnail(uri, new Size(512, 512), null);
                        if (thumb != null) return thumb;
                    } catch (Exception ignored) {
                    }
                }
                try (InputStream is = getContentResolver().openInputStream(uri)) {
                    if (is != null) {
                        Bitmap bmp = BitmapFactory.decodeStream(is);
                        if (bmp != null) return scaleBitmapIfNeeded(bmp, 512);
                    }
                }
            } catch (Exception ignored) {
            }
        }

        // 4. Load from local file path
        if (normalized != null && (normalized.startsWith("file://") || normalized.startsWith("/"))) {
            try {
                String p = normalized.startsWith("file://") ? Uri.parse(normalized).getPath() : normalized;
                if (p != null && new File(p).exists()) {
                    Bitmap bmp = decodeSampledFile(p, 512, 512);
                    if (bmp != null) return bmp;
                }
            } catch (Exception ignored) {
            }
        }

        // 5. Extract embedded album art directly from audio file path if available
        if (filePath != null && !filePath.isEmpty()) {
            MediaMetadataRetriever mmr = new MediaMetadataRetriever();
            try {
                mmr.setDataSource(filePath);
                byte[] embedded = mmr.getEmbeddedPicture();
                if (embedded != null && embedded.length > 0) {
                    return decodeSampledBytes(embedded, 512, 512);
                }
            } catch (Exception ignored) {
            } finally {
                try {
                    mmr.release();
                } catch (Exception ignored) {
                }
            }
        }

        return null;
    }

    private static Bitmap decodeSampledBytes(byte[] data, int reqW, int reqH) {
        BitmapFactory.Options opts = new BitmapFactory.Options();
        opts.inJustDecodeBounds = true;
        BitmapFactory.decodeByteArray(data, 0, data.length, opts);
        opts.inSampleSize = calculateInSampleSize(opts, reqW, reqH);
        opts.inJustDecodeBounds = false;
        return BitmapFactory.decodeByteArray(data, 0, data.length, opts);
    }

    private static Bitmap decodeSampledFile(String path, int reqW, int reqH) {
        BitmapFactory.Options opts = new BitmapFactory.Options();
        opts.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(path, opts);
        opts.inSampleSize = calculateInSampleSize(opts, reqW, reqH);
        opts.inJustDecodeBounds = false;
        return BitmapFactory.decodeFile(path, opts);
    }

    private static Bitmap scaleBitmapIfNeeded(Bitmap src, int maxSize) {
        int w = src.getWidth();
        int h = src.getHeight();
        if (w <= maxSize && h <= maxSize) return src;
        float ratio = Math.min((float) maxSize / w, (float) maxSize / h);
        return Bitmap.createScaledBitmap(src, Math.round(w * ratio), Math.round(h * ratio), true);
    }

    private static int calculateInSampleSize(BitmapFactory.Options options, int reqWidth, int reqHeight) {
        int height = options.outHeight;
        int width = options.outWidth;
        int inSampleSize = 1;
        if (height > reqHeight || width > reqWidth) {
            int halfHeight = height / 2;
            int halfWidth = width / 2;
            while ((halfHeight / inSampleSize) >= reqHeight && (halfWidth / inSampleSize) >= reqWidth) {
                inSampleSize *= 2;
            }
        }
        return inSampleSize;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        if (!currentIsPlaying) {
            handleStopRequest();
        }
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        activeServiceInstance = null;
        updateWakeLock(false);
        if (noisyReceiverRegistered) {
            try {
                unregisterReceiver(becomingNoisyReceiver);
            } catch (Exception ignored) {
            }
            noisyReceiverRegistered = false;
        }
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        if (artExecutor != null) {
            artExecutor.shutdownNow();
        }
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
