// 1. Tracks Data Array
const tracks = [
    {
        id: 1,
        title: "Zamaana Lage",
        artist: "Arijit Singh & Shashwat",
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
    },
    {
        id: 2,
        title: "Brazilian Phonk Instrumental",
        artist: "Aggressive Beats",
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
    }
];

// 2. Global Player Variables
let currentTrackIndex = 0;
let isPlaying = false;
const audioPlayer = new Audio(tracks[currentTrackIndex].url);

// 3. DOM Elements Selector (Mini Player)
const playBtn = document.getElementById('play-btn');
const trackTitle = document.getElementById('mini-track-title');
const trackArtist = document.getElementById('mini-track-artist');
const progressBar = document.getElementById('mini-progress');

// 4. DOM Elements Selector (Full Screen Player & Screens)
const miniPlayerBar = document.getElementById('mini-player-bar');
const fullPlayer = document.getElementById('full-player');
const closePlayerBtn = document.getElementById('close-player-btn');

const playBtnBig = document.getElementById('play-btn-big');
const playBtnBigContainer = document.getElementById('play-btn-big-container');
const fullTrackTitle = document.getElementById('full-track-title');
const fullTrackArtist = document.getElementById('full-track-artist');

const fullSlider = document.getElementById('full-progress-slider');
const currentTimeText = document.getElementById('current-time');
const totalDurationText = document.getElementById('total-duration');

// 5. Update UI with Current Track Details (Both Mini & Full View)
function updatePlayerUI() {
    const track = tracks[currentTrackIndex];
    
    // Update Mini Player Text
    trackTitle.innerText = track.title;
    trackArtist.innerText = track.artist;
    
    // Update Full Screen Player Text
    fullTrackTitle.innerText = track.title;
    fullTrackArtist.innerText = track.artist;
    
    // Sync Mini Play Icon
    if (isPlaying) {
        playBtn.innerText = 'pause';
        playBtnBig.innerText = 'pause';
    } else {
        playBtn.innerText = 'play_arrow';
        playBtnBig.innerText = 'play_arrow';
    }
    
    // Dynamic Theme Color Change (Lark Player Style Benchmarking)
    if (currentTrackIndex === 0) {
        fullPlayer.style.background = 'linear-gradient(to bottom, #11261d, #050a08)'; // Deep emerald gradient for Arijit
    } else {
        fullPlayer.style.background = 'linear-gradient(to bottom, #2a1b15, #0a0705)'; // Deep rust/brown gradient for Phonk
    }
}

// 6. Play/Pause Functionality
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

// 7. Next Track Functionality
function nextTrack() {
    currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
    audioPlayer.src = tracks[currentTrackIndex].url;
    if (isPlaying) {
        audioPlayer.play();
    } else {
        updatePlayerUI();
    }
    updatePlayerUI();
}

// 8. Previous Track Functionality
function prevTrack() {
    currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    audioPlayer.src = tracks[currentTrackIndex].url;
    if (isPlaying) {
        audioPlayer.play();
    } else {
        updatePlayerUI();
    }
    updatePlayerUI();
}

// --- SCREEN INTERACTIONS & SLIDE LOGIC ---

// Open Full Screen Player on Mini Bar Click
miniPlayerBar.addEventListener('click', (e) => {
    // Agar direct play ya next button par click na hua ho tabhi screen kholo
    if (e.target.id !== 'play-btn' && e.target.id !== 'next-btn') {
        fullPlayer.classList.remove('translate-y-full');
    }
});

// Close Full Screen Player
closePlayerBtn.addEventListener('click', () => {
    fullPlayer.classList.add('translate-y-full');
});

// --- AUDIO EVENTS FOR SLIDERS & TIMERS ---

// Progress Bar & Timer Sync
audioPlayer.addEventListener('timeupdate', () => {
    if (audioPlayer.duration) {
        // Mini Progress Bar (0% to 100%)
        const progressPercentage = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressBar.style.width = `${progressPercentage}%`;
        
        // Full Slider View Sync
        fullSlider.max = audioPlayer.duration;
        fullSlider.value = audioPlayer.currentTime;
        
        // Update Time Text (e.g. 0:45)
        currentTimeText.innerText = formatTime(audioPlayer.currentTime);
    }
});

// Track Load Completion Event
audioPlayer.addEventListener('loadeddata', () => {
    totalDurationText.innerText = formatTime(audioPlayer.duration);
});

// User drags full slider to skip parts
fullSlider.addEventListener('input', () => {
    audioPlayer.currentTime = fullSlider.value;
});

// Time Formatter Helper (Seconds to MM:SS)
function formatTime(secs) {
    let min = Math.floor(secs / 60);
    let sec = Math.floor(secs % 60);
    if (sec < 10) sec = `0${sec}`;
    return `${min}:${sec}`;
}

// 9. Event Listeners Connection
playBtn.addEventListener('click', togglePlay);
playBtnBigContainer.addEventListener('click', togglePlay);
document.getElementById('next-btn').addEventListener('click', nextTrack);
document.getElementById('next-btn-big').addEventListener('click', nextTrack);
document.getElementById('prev-btn-big').addEventListener('click', prevTrack);

// Initialize App State
updatePlayerUI();
