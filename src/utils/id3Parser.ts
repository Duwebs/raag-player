export interface ParsedAudioMetadata {
  title: string;
  artist: string;
  album: string;
  duration: number;
  coverArt?: string;
  lyrics?: string;
}

export async function parseAudioFile(file: File): Promise<ParsedAudioMetadata> {
  const defaultTitle = cleanFilename(file.name);
  const result: ParsedAudioMetadata = {
    title: defaultTitle.title,
    artist: defaultTitle.artist || 'Unknown Artist',
    album: 'Local Music',
    duration: 0,
  };

  try {
    // 1. Read first 256KB to parse ID3v2 tags and embedded album art
    const sliceSize = Math.min(file.size, 512 * 1024);
    const buffer = await file.slice(0, sliceSize).arrayBuffer();
    const view = new DataView(buffer);

    // Check ID3v2 header: "ID3"
    if (buffer.byteLength >= 10 &&
        view.getUint8(0) === 0x49 && // 'I'
        view.getUint8(1) === 0x44 && // 'D'
        view.getUint8(2) === 0x33) { // '3'
      const versionMajor = view.getUint8(3); // 3 or 4
      const id3Flags = view.getUint8(5);
      const tagSize = readSyncSafeInt(view, 6);
      let offset = 10;

      // Skip extended header if present
      if ((id3Flags & 0x40) !== 0 && offset + 4 <= buffer.byteLength) {
        const extSize = versionMajor === 4 ? readSyncSafeInt(view, offset) : view.getUint32(offset);
        offset += extSize;
      }

      const limit = Math.min(buffer.byteLength, 10 + tagSize);

      while (offset + 10 <= limit) {
        let frameId = '';
        for (let i = 0; i < 4; i++) {
          const char = String.fromCharCode(view.getUint8(offset + i));
          frameId += char;
        }

        if (!/^[A-Z0-9]{4}$/.test(frameId)) {
          break; // Padding reached
        }

        const frameSize = versionMajor === 4
          ? readSyncSafeInt(view, offset + 4)
          : view.getUint32(offset + 4);

        offset += 10;
        if (frameSize <= 0 || offset + frameSize > buffer.byteLength) {
          break;
        }

        const frameBytes = new Uint8Array(buffer, offset, frameSize);

        if (frameId === 'TIT2') {
          result.title = decodeTextFrame(frameBytes) || result.title;
        } else if (frameId === 'TPE1') {
          result.artist = decodeTextFrame(frameBytes) || result.artist;
        } else if (frameId === 'TALB') {
          result.album = decodeTextFrame(frameBytes) || result.album;
        } else if (frameId === 'USLT') {
          result.lyrics = decodeLyricsFrame(frameBytes);
        } else if (frameId === 'APIC' && !result.coverArt) {
          result.coverArt = decodeApicFrame(frameBytes);
        }

        offset += frameSize;
      }
    }
  } catch (err) {
    console.warn("Could not parse ID3v2 tags from file:", err);
  }

  // 2. Extract accurate duration via temporary audio element
  try {
    const objectUrl = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = objectUrl;

    const dur = await new Promise<number>((resolve) => {
      const cleanup = () => {
        audio.removeEventListener('loadedmetadata', onLoaded);
        audio.removeEventListener('error', onError);
        URL.revokeObjectURL(objectUrl);
      };
      const onLoaded = () => {
        const d = isFinite(audio.duration) ? audio.duration : 0;
        cleanup();
        resolve(d);
      };
      const onError = () => {
        cleanup();
        resolve(0);
      };
      audio.addEventListener('loadedmetadata', onLoaded);
      audio.addEventListener('error', onError);
      setTimeout(() => {
        cleanup();
        resolve(0);
      }, 3500);
    });

    result.duration = Math.round(dur);
  } catch {
    result.duration = 0;
  }

  return result;
}

function readSyncSafeInt(view: DataView, offset: number): number {
  return (
    ((view.getUint8(offset) & 0x7f) << 21) |
    ((view.getUint8(offset + 1) & 0x7f) << 14) |
    ((view.getUint8(offset + 2) & 0x7f) << 7) |
    (view.getUint8(offset + 3) & 0x7f)
  );
}

function decodeTextFrame(bytes: Uint8Array): string {
  if (bytes.length < 2) return '';
  const encoding = bytes[0];
  const textBytes = bytes.slice(1);

  try {
    if (encoding === 0) {
      // ISO-8859-1
      return new TextDecoder('latin1').decode(textBytes).replace(/\0.*$/g, '').trim();
    } else if (encoding === 1) {
      // UTF-16 with BOM
      return new TextDecoder('utf-16').decode(textBytes).replace(/\0.*$/g, '').trim();
    } else if (encoding === 2) {
      // UTF-16BE
      return new TextDecoder('utf-16be').decode(textBytes).replace(/\0.*$/g, '').trim();
    } else if (encoding === 3) {
      // UTF-8
      return new TextDecoder('utf-8').decode(textBytes).replace(/\0.*$/g, '').trim();
    }
  } catch {
    // Fallback
    return new TextDecoder().decode(textBytes).replace(/\0.*$/g, '').trim();
  }
  return '';
}

function decodeLyricsFrame(bytes: Uint8Array): string {
  if (bytes.length < 5) return '';
  const encoding = bytes[0];
  // 3 bytes language, then null-terminated content description, then lyrics text
  let pos = 4;
  while (pos < bytes.length && bytes[pos] !== 0) {
    pos++;
  }
  pos++; // skip null
  if (pos >= bytes.length) return '';
  return decodeTextFrame(new Uint8Array([encoding, ...bytes.slice(pos)]));
}

function decodeApicFrame(bytes: Uint8Array): string | undefined {
  if (bytes.length < 10) return undefined;
  const encoding = bytes[0];
  let pos = 1;

  // Read MIME type (null terminated ASCII string)
  let mimeType = '';
  while (pos < bytes.length && bytes[pos] !== 0) {
    mimeType += String.fromCharCode(bytes[pos]);
    pos++;
  }
  pos++; // skip null
  if (!mimeType || mimeType === '-->') {
    mimeType = 'image/jpeg';
  }

  // Skip picture type (1 byte)
  pos++;

  // Skip description (null terminated according to encoding)
  if (encoding === 0 || encoding === 3) {
    while (pos < bytes.length && bytes[pos] !== 0) pos++;
    pos++;
  } else {
    while (pos + 1 < bytes.length && !(bytes[pos] === 0 && bytes[pos + 1] === 0)) {
      pos += 2;
    }
    pos += 2;
  }

  if (pos >= bytes.length) return undefined;

  const imgData = bytes.slice(pos);
  let binary = '';
  const len = imgData.byteLength;
  const chunk = 8192;
  for (let i = 0; i < len; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(imgData.subarray(i, Math.min(i + chunk, len)))
    );
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function cleanFilename(filename: string): { title: string; artist: string } {
  const base = filename.replace(/\.[^/.]+$/, ''); // Remove extension
  if (base.includes(' - ')) {
    const parts = base.split(' - ');
    return {
      artist: parts[0].trim(),
      title: parts.slice(1).join(' - ').trim(),
    };
  }
  return {
    title: base.replace(/[_]/g, ' ').trim(),
    artist: 'Local Music',
  };
}
