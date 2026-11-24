import { Track } from '../types';

// Generate lightweight, melodious 44.1kHz musical WAV buffers with chords & harmonics
function generateProceduralMelodyWav(type: 'raag' | 'lofi' | 'ambient' | 'chill', durationSeconds = 45): string {
  const sampleRate = 22050; // High enough for mobile offline demo, compact size
  const totalSamples = sampleRate * durationSeconds;
  const numChannels = 2;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = totalSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  // format chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16-bit
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Musical notes in Hz
  // Raag Bhairav / Indian scale: Sa (261.63), Re komal (277.18), Ga shuddha (329.63), Ma (349.23), Pa (392.00), Dha komal (415.30), Ni shuddha (493.88)
  const raagNotes = [130.81, 196.00, 261.63, 277.18, 329.63, 349.23, 392.00, 415.30, 493.88, 523.25];
  const lofiNotes = [110.00, 164.81, 220.00, 261.63, 329.63, 392.00, 440.00];

  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let sampleL = 0;
    let sampleR = 0;

    if (type === 'raag') {
      // Tanpura drone (Sa + Pa + Sa)
      const droneSa = Math.sin(2 * Math.PI * 130.81 * t) * 0.25;
      const dronePa = Math.sin(2 * Math.PI * 196.00 * t) * 0.18;
      const droneHarm = Math.sin(2 * Math.PI * 261.63 * t) * 0.12;
      const drone = (droneSa + dronePa + droneHarm) * (0.8 + 0.2 * Math.sin(2 * Math.PI * 0.3 * t));

      // Sitar / Flute melody line that evolves every 2 seconds
      const noteIndex = Math.floor(t * 1.5) % raagNotes.length;
      const currentFreq = raagNotes[noteIndex];
      const noteTime = (t * 1.5) % 1.0;
      const envelope = Math.exp(-noteTime * 2.5); // plucked decay
      const melody = Math.sin(2 * Math.PI * currentFreq * t) * envelope * 0.35 +
                     Math.sin(2 * Math.PI * currentFreq * 2 * t) * envelope * 0.15;

      sampleL = (drone * 0.6 + melody * 0.7);
      sampleR = (drone * 0.6 + melody * 0.7 * Math.cos(2 * Math.PI * 0.2 * t));
    } else if (type === 'lofi') {
      // Warm Rhodes / Lofi pad chords
      const chordIndex = Math.floor(t / 4) % 4;
      const baseFreq = lofiNotes[chordIndex];
      const pad = (Math.sin(2 * Math.PI * baseFreq * t) +
                   Math.sin(2 * Math.PI * baseFreq * 1.25 * t) * 0.6 +
                   Math.sin(2 * Math.PI * baseFreq * 1.5 * t) * 0.4) * 0.25;
      // Gentle vinyl / kick pulse
      const beat = (t % 1 < 0.15) ? Math.sin(2 * Math.PI * 55 * (t % 1) * 8) * Math.exp(-(t % 1) * 15) * 0.3 : 0;
      sampleL = pad + beat;
      sampleR = pad * 0.95 + beat;
    } else {
      // Ambient warm chill
      const swell = (Math.sin(2 * Math.PI * 0.15 * t) + 1) * 0.5;
      const freq = 174.61; // F3 healing tone
      const tone = (Math.sin(2 * Math.PI * freq * t) + Math.sin(2 * Math.PI * freq * 1.5 * t) * 0.4) * swell * 0.3;
      sampleL = tone;
      sampleR = tone;
    }

    // Clamp
    sampleL = Math.max(-1, Math.min(1, sampleL));
    sampleR = Math.max(-1, Math.min(1, sampleR));

    view.setInt16(offset, sampleL * 32767, true);
    view.setInt16(offset + 2, sampleR * 32767, true);
    offset += 4;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Generate cover art images using canvas data URLs
function generateArtDataUrl(primaryColor: string, secondaryColor: string, title: string, subtitle: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Rich gradient background
  const grad = ctx.createLinearGradient(0, 0, 400, 400);
  grad.addColorStop(0, primaryColor);
  grad.addColorStop(0.5, secondaryColor);
  grad.addColorStop(1, '#08080a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 400, 400);

  // Soft atmospheric glowing orbs
  ctx.save();
  ctx.filter = 'blur(40px)';
  ctx.fillStyle = primaryColor;
  ctx.beginPath();
  ctx.arc(120, 140, 100, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = secondaryColor;
  ctx.beginPath();
  ctx.arc(280, 260, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Subtle vinyl record rings
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1.5;
  for (let r = 50; r <= 180; r += 20) {
    ctx.beginPath();
    ctx.arc(200, 200, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Modern album typography
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 12;
  ctx.fillText(title, 200, 210);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = '500 18px sans-serif';
  ctx.fillText(subtitle, 200, 246);

  return canvas.toDataURL('image/jpeg', 0.9);
}

export function getDemoTracks(): Track[] {
  // Check if running in browser with document
  const canRenderCanvas = typeof document !== 'undefined';

  const art1 = canRenderCanvas ? generateArtDataUrl('#78350f', '#b45309', 'Bairan', 'Banjaare') : undefined;
  const art2 = canRenderCanvas ? generateArtDataUrl('#1e3a8a', '#3b82f6', 'Barsaat', 'Banjaare, Roni') : undefined;
  const art3 = canRenderCanvas ? generateArtDataUrl('#831843', '#be185d', 'Mirzapur', 'Vaaroon') : undefined;
  const art4 = canRenderCanvas ? generateArtDataUrl('#064e3b', '#10b981', 'Shyama Shyama', 'PARAIISO') : undefined;
  const art5 = canRenderCanvas ? generateArtDataUrl('#312e81', '#6366f1', 'Let Go', 'Ark Patrol') : undefined;

  return [
    {
      id: 'demo-bairan-1',
      title: 'Bairan',
      artist: 'Banjaare',
      album: 'Bairan Single',
      duration: 150,
      url: canRenderCanvas ? generateProceduralMelodyWav('raag', 150) : '',
      coverArt: art1,
      dominantColor: '120, 53, 15', // Warm earthy brown matching Image 7
      folder: 'Download',
      format: 'mp3',
      dateAdded: Date.now() - 1000 * 60 * 60 * 24 * 2,
      isFavorite: true,
      playCount: 14,
      lyrics: `[00:00.00] (Instrumental Alaap)
[00:04.00] jhanjhara ke jode
[00:10.00] baaje re paanv mein bairan
[00:16.00] saanson mein ghuli khushboo teri
[00:23.00] naino mein bas gaya re manchala
[00:31.00] bairan hawa chhoo ke gayi
[00:39.00] dard-e-dil ko rasta mil gaya
[00:48.00] tere bina soona lage aalam
[00:58.00] tu jo mila to jahan mil gaya
[01:10.00] jhanjhara ke jode...
[01:25.00] (Melodic Sitar Interlude)`,
    },
    {
      id: 'demo-barsaat-2',
      title: 'Barsaat',
      artist: 'Banjaare, Roni',
      album: 'Barsaat',
      duration: 165,
      url: canRenderCanvas ? generateProceduralMelodyWav('chill', 165) : '',
      coverArt: art2,
      dominantColor: '30, 58, 138', // Deep royal blue
      folder: 'Download',
      format: 'mp3',
      dateAdded: Date.now() - 1000 * 60 * 60 * 24 * 5,
      isFavorite: false,
      playCount: 8,
      lyrics: `[00:00.00] Bheegi bheegi raaton mein
[00:12.00] Barsaat ki boondein pukarein tujhe
[00:24.00] Khwabon ke aaine mein
[00:36.00] Ek tera hi aks nazar aaye mujhe`,
    },
    {
      id: 'demo-mirzapur-3',
      title: 'Mirzapur',
      artist: 'Vaaroon',
      album: 'Telegram Audio',
      duration: 140,
      url: canRenderCanvas ? generateProceduralMelodyWav('lofi', 140) : '',
      coverArt: art3,
      dominantColor: '131, 24, 67', // Deep crimson
      folder: 'Telegram',
      format: 'mp3',
      dateAdded: Date.now() - 1000 * 60 * 60 * 24 * 7,
      isFavorite: true,
      playCount: 22,
      lyrics: `[00:00.00] (Dramatic cinematic strings)
[00:15.00] Bhaukaal zinda hai
[00:30.00] Raahon mein aandhiyan
[00:45.00] Mirzapur ki galliyan`,
    },
    {
      id: 'demo-shyama-4',
      title: 'Shyama Shyama full BGM',
      artist: 'PARAIISO MUSIC',
      album: 'Devotional Chill',
      duration: 180,
      url: canRenderCanvas ? generateProceduralMelodyWav('raag', 180) : '',
      coverArt: art4,
      dominantColor: '6, 78, 59', // Emerald forest green
      folder: 'Download',
      format: 'mp3',
      dateAdded: Date.now() - 1000 * 60 * 60 * 24 * 10,
      isFavorite: false,
      playCount: 5,
      lyrics: `[00:00.00] Radhe Shyama Shyam
[00:20.00] Murali Manohar Mohana
[00:45.00] Yamuna kinare baansuri baaje`,
    },
    {
      id: 'demo-letgo-5',
      title: 'Let Go',
      artist: 'Ark Patrol, Veronika Redd',
      album: 'Indie Dance Electronic',
      duration: 195,
      url: canRenderCanvas ? generateProceduralMelodyWav('ambient', 195) : '',
      coverArt: art5,
      dominantColor: '49, 46, 129', // Midnight violet
      folder: 'Music',
      format: 'mp3',
      dateAdded: Date.now() - 1000 * 60 * 60 * 24 * 12,
      isFavorite: false,
      playCount: 19,
      lyrics: `[00:00.00] Let go of the weight you hold
[00:15.00] Feel the echo in the cold
[00:30.00] Every beat is a new day
[00:45.00] Finding peace along the way`,
    },
  ];
}
