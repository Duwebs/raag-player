// Tracks Data
const tracks = [
    {
        id: 1,
        title: "Zamaana Lage",
        artist: "Arijit Singh & Shashwat",
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
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
        title: "Local Audio Track",
        artist: "Unknown Artist",
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
        cover: "" // Image khali hai, isliye Ad dikhega!
    }
];

let currentTrackIndex = 0;
let isPlaying = false;
const audioPlayer = new Audio(tracks[currentTrackIndex].url);

// Selectors
const playBtn = document.getElementById('play-btn');
const playBtnBig = document.getElementById('play-btn-big');
const playerAlbumArt = document.getElementById('player-album-art');
const fallbackIcon = document.getElementById('fallback-icon');
const adBannerZone = document.getElementById('ad-banner-zone');

function updatePlayerUI() {
    const track = tracks[currentTrackIndex];
    document.getElementById('mini-track-title').innerText = track.title;
    document.getElementById('mini-track-artist').innerText = track.artist;
    document.getElementById('full-track-title').innerText = track.title;
    document.getElementById('full-track-artist').innerText = track.artist;

    // Logic: Agar cover image hai toh dikhao, nahi toh Ad dikhao
    if(track.cover && track.cover !== "") {
        playerAlbumArt.src = track.cover;
        playerAlbumArt.classList.remove('hidden');
        adBannerZone.classList.add('hidden');
        fallbackIcon.classList.add('hidden');
    } else {
        playerAlbumArt.classList.add('hidden');
        adBannerZone.classList.remove('hidden'); // AD BANNER ON
        fallbackIcon.classList.add('hidden');
    }

    playBtn.innerText = isPlaying ? 'pause' : 'play_arrow';
    playBtnBig.innerText = isPlaying ? 'pause' : 'play_arrow';
}

function playTrackById(index) {
    currentTrackIndex = index;
    audioPlayer.src = tracks[currentTrackIndex].url;
    isPlaying = true;
    audioPlayer.play();
    updatePlayerUI();
}

function togglePlay() {
    if (isPlaying) { audioPlayer.pause(); isPlaying = false; } 
    else { audioPlayer.play(); isPlaying = true; }
    updatePlayerUI();
}

// Event Listeners
playBtn.addEventListener('click', togglePlay);
document.getElementById('play-btn-big-container').addEventListener('click', togglePlay);
document.getElementById('next-btn').addEventListener('click', () => {
    currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
    playTrackById(currentTrackIndex);
});
document.getElementById('next-btn-big').addEventListener('click', () => {
    currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
    playTrackById(currentTrackIndex);
});
document.getElementById('prev-btn-big').addEventListener('click', () => {
    currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    playTrackById(currentTrackIndex);
});
document.getElementById('mini-player-bar').addEventListener('click', (e) => {
    if (e.target.id !== 'play-btn' && e.target.id !== 'next-btn') {
        document.getElementById('full-player').classList.remove('translate-y-full');
    }
});
document.getElementById('close-player-btn').addEventListener('click', () => {
    document.getElementById('full-player').classList.add('translate-y-full');
});

updatePlayerUI();
