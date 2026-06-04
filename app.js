// 1. Tracks Data Array (Synced with index.html)
const tracks = [
    {
        id: 1,
        title: "Zamaana Lage",
        artist: "Arijit Singh & Shashwat",
        url: "https://files.catbox.moe/6afnbv.mp3",
        cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80"
    },
    {
        id: 2,
        title: "Brazilian Phonk Instrumental",
        artist: "Aggressive Beats",
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80"
    },
    {
        id: 3,
        title: "Tulasi",
        artist: "Sumedh",
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", 
        cover: "" // Image khali hai -> Turbo Cleaner Ad Banner dikhega!
    }
];

let currentTrackIndex = 0;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
let audioPlayer = new Audio(tracks[currentTrackIndex].url);

// Favorites Data (Global state initialization)
let favoriteTracks = [];

// Main Player Selectors
const playBtn = document.getElementById('play-btn');
const playBtnBig = document.getElementById('play-btn-big');
const playerAlbumArt = document.getElementById('player-album-art');
const fallbackIcon = document.getElementById('fallback-icon');
const adBannerZone = document.getElementById('ad-banner-zone');
const heartBtn = document.getElementById('heart-btn'); // Top par move kar diya safe execution ke liye

// Progress Bar & Timer Selectors
const miniProgressBar = document.getElementById('mini-progress');
const fullSlider = document.getElementById('full-progress-slider');
const currentTimeText = document.getElementById('current-time');
const totalDurationText = document.getElementById('total-duration');

// Shuffle & Repeat Selectors
const shuffleBtn = document.getElementById('shuffle-btn');
const repeatBtn = document.getElementById('repeat-btn');

// Time Formatter (eg: 125 seconds -> 2:05)
function formatTime(secs) {
    if (isNaN(secs)) return "0:00";
    let min = Math.floor(secs / 60);
    let sec = Math.floor(secs % 60);
    if (sec < 10) sec = `0${sec}`;
    return `${min}:${sec}`;
}

// Update UI States
function updatePlayerUI() {
    const track = tracks[currentTrackIndex];
    document.getElementById('mini-track-title').innerText = track.title;
    document.getElementById('mini-track-artist').innerText = track.artist;
    document.getElementById('full-track-title').innerText = track.title;
    document.getElementById('full-track-artist').innerText = track.artist;

    // Smart Ad Toggle Logic
    if(track.cover && track.cover !== "") {
        playerAlbumArt.src = track.cover;
        playerAlbumArt.classList.remove('hidden');
        adBannerZone.classList.add('hidden');
        fallbackIcon.classList.add('hidden');
    } else {
        playerAlbumArt.classList.add('hidden');
        adBannerZone.classList.remove('hidden'); // Show Ad
        fallbackIcon.classList.add('hidden');
    }

    // 🔥 DYNAMIC LIST ICON COLOR SYSTEM
    tracks.forEach((t, index) => {
        const iconEl = document.getElementById(`track-icon-${index}`);
        if (iconEl) {
            iconEl.classList.remove('text-emerald-500');
            iconEl.classList.add('text-zinc-500');
        }
    });

    const activeIcon = document.getElementById(`track-icon-${currentTrackIndex}`);
    if (activeIcon) {
        activeIcon.classList.remove('text-zinc-500');
        activeIcon.classList.add('text-emerald-500');
    }
    
    // 🔥 FAVORITE HEART STATE SYNC
    if (heartBtn) {
        if (favoriteTracks.includes(tracks[currentTrackIndex].id)) {
            heartBtn.innerText = 'favorite';
            heartBtn.classList.remove('text-zinc-500');
            heartBtn.classList.add('text-red-500');
        } else {
            heartBtn.innerText = 'favorite_border';
            heartBtn.classList.remove('text-red-500');
            heartBtn.classList.add('text-zinc-500');
        }
    }

    // Sync Icons
    playBtn.innerText = isPlaying ? 'pause' : 'play_arrow';
    playBtnBig.innerText = isPlaying ? 'pause' : 'play_arrow';
}

// Attach Audio Events (Progress, Metadata, Song Ended Logic)
function attachAudioEvents() {
    // 1. Live Time Update
    audioPlayer.addEventListener('timeupdate', () => {
        if (audioPlayer.duration) {
            const progressPercentage = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            miniProgressBar.style.width = `${progressPercentage}%`;
            fullSlider.value = audioPlayer.currentTime;
            currentTimeText.innerText = formatTime(audioPlayer.currentTime);
        }
    });

    // 2. Load Total Duration
    audioPlayer.addEventListener('loadedmetadata', () => {
        fullSlider.max = audioPlayer.duration;
        totalDurationText.innerText = formatTime(audioPlayer.duration);
    });

    // 3. Smart Autoplay Logic on Song End
    audioPlayer.addEventListener('ended', () => {
        if (isRepeat) {
            playTrackById(currentTrackIndex);
        } else if (isShuffle) {
            let randomIndex = Math.floor(Math.random() * tracks.length);
            while (randomIndex === currentTrackIndex && tracks.length > 1) {
                randomIndex = Math.floor(Math.random() * tracks.length);
            }
            playTrackById(randomIndex);
        } else {
            currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
            playTrackById(currentTrackIndex);
        }
    });
}

// Play Selected Track
function playTrackById(index) {
    audioPlayer.pause();
    currentTrackIndex = index;
    
    audioPlayer = new Audio(tracks[currentTrackIndex].url);
    attachAudioEvents();
    
    isPlaying = true;
    audioPlayer.play();
    updatePlayerUI();
}

// Play/Pause Toggle
function togglePlay() {
    if (isPlaying) { 
        audioPlayer.pause(); 
        isPlaying = false; 
    } else { 
        audioPlayer.play(); 
        isPlaying = true; 
    }
    updatePlayerUI();
}

// Toggle Shuffle Mode
function toggleShuffle() {
    isShuffle = !isShuffle;
    if (isShuffle) {
        shuffleBtn.classList.remove('text-zinc-500');
        shuffleBtn.classList.add('text-emerald-400', 'drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]');
    } else {
        shuffleBtn.classList.remove('text-emerald-400', 'drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]');
        shuffleBtn.classList.add('text-zinc-500');
    }
}

// Toggle Repeat Mode
function toggleRepeat() {
    isRepeat = !isRepeat;
    if (isRepeat) {
        repeatBtn.classList.remove('text-zinc-500');
        repeatBtn.classList.add('text-emerald-400', 'drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]');
    } else {
        repeatBtn.classList.remove('text-emerald-400', 'drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]');
        repeatBtn.classList.add('text-zinc-500');
    }
}

// Seekbar Dragging Control
fullSlider.addEventListener('input', () => {
    audioPlayer.currentTime = fullSlider.value;
});

// Click Listeners
playBtn.addEventListener('click', togglePlay);
document.getElementById('play-btn-big-container').addEventListener('click', togglePlay);

document.getElementById('next-btn').addEventListener('click', () => {
    if (isShuffle) {
        let randomIndex = Math.floor(Math.random() * tracks.length);
        playTrackById(randomIndex);
    } else {
        currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
        playTrackById(currentTrackIndex);
    }
});

document.getElementById('next-btn-big').addEventListener('click', () => {
    if (isShuffle) {
        let randomIndex = Math.floor(Math.random() * tracks.length);
        playTrackById(randomIndex);
    } else {
        currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
        playTrackById(currentTrackIndex);
    }
});

document.getElementById('prev-btn-big').addEventListener('click', () => {
    currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    playTrackById(currentTrackIndex);
});

// Full Screen Slide Control
document.getElementById('mini-player-bar').addEventListener('click', (e) => {
    if (e.target.id !== 'play-btn' && e.target.id !== 'next-btn') {
        document.getElementById('full-player').classList.remove('translate-y-full');
    }
});
document.getElementById('close-player-btn').addEventListener('click', () => {
    document.getElementById('full-player').classList.add('translate-y-full');
});

// Heart Button Click Hone Par Toggle Karne Ka Logic
function toggleFavorite() {
    if (!heartBtn) return;
    const currentTrack = tracks[currentTrackIndex];
    const trackIndexInFav = favoriteTracks.indexOf(currentTrack.id);

    if (trackIndexInFav === -1) {
        favoriteTracks.push(currentTrack.id);
        heartBtn.innerText = 'favorite';
        heartBtn.classList.remove('text-zinc-500');
        heartBtn.classList.add('text-red-500', 'scale-110');
    } else {
        favoriteTracks.splice(trackIndexInFav, 1);
        heartBtn.innerText = 'favorite_border';
        heartBtn.classList.remove('text-red-500', 'scale-110');
        heartBtn.classList.add('text-zinc-500');
    }
    
    setTimeout(() => heartBtn.classList.remove('scale-110'), 200);
}

// Initialize on App Start
attachAudioEvents();
updatePlayerUI();
