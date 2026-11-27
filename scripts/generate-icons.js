import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const androidResDir = path.join(rootDir, 'android/app/src/main/res');

const TANPURA_PATH =
  'M 25.06 31.71 Q 27.6 30.8 29.3 28.5 L 41.2 12.1 C 43.0 9.6 46.8 9.8 48.1 12.1 C 49.3 14.3 47.3 16.9 44.8 14.7 L 33.2 31.4 Q 31.6 33.6 32.46 38.37 A 10.6 10.6 0 1 1 25.06 31.71 Z';
const PLAY_PATH =
  'M 20.2 38.4 Q 20.2 37.6 21.0 38.0 L 26.9 41.4 Q 27.7 41.9 26.9 42.5 L 21.0 45.9 Q 20.2 46.3 20.2 45.5 Z';

// Precompute geometric polylines in 64x64 space matching RaagLogo.tsx verbatim
function sampleQuad(p0, p1, p2, steps = 20) {
  const pts = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    pts.push([
      mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0],
      mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1],
    ]);
  }
  return pts;
}

function sampleCubic(p0, p1, p2, p3, steps = 28) {
  const pts = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    pts.push([
      mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0],
      mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return pts;
}

function sampleCircleArc(cx, cy, r, startDeg, sweepDeg, steps = 64) {
  const pts = [];
  for (let i = 1; i <= steps; i++) {
    const rad = ((startDeg + (sweepDeg * i) / steps) * Math.PI) / 180;
    pts.push([cx + r * Math.cos(rad), cy + r * Math.sin(rad)]);
  }
  return pts;
}

function buildTanpuraSegments() {
  const poly = [[25.06, 31.71]];
  poly.push(...sampleQuad([25.06, 31.71], [27.6, 30.8], [29.3, 28.5]));
  poly.push([41.2, 12.1]);
  poly.push(...sampleCubic([41.2, 12.1], [43.0, 9.6], [46.8, 9.8], [48.1, 12.1]));
  poly.push(...sampleCubic([48.1, 12.1], [49.3, 14.3], [47.3, 16.9], [44.8, 14.7]));
  poly.push([33.2, 31.4]);
  poly.push(...sampleQuad([33.2, 31.4], [31.6, 33.6], [32.46, 38.37]));
  // Resonator arc from -20deg clockwise to +284deg (-76deg) = +304deg sweep
  poly.push(...sampleCircleArc(22.5, 42.0, 10.6, -20.0, 304.0, 72));

  const segs = [];
  for (let i = 0; i < poly.length - 1; i++) {
    segs.push([poly[i][0], poly[i][1], poly[i + 1][0], poly[i + 1][1]]);
  }
  // 3 soundwave bars: short, tall, medium
  segs.push([40.0, 29.8, 40.0, 37.2]);
  segs.push([45.2, 24.2, 45.2, 42.8]);
  segs.push([50.4, 28.0, 50.4, 39.0]);
  return segs;
}

function buildPlayTrianglePolygon() {
  const pts = [[20.2, 38.4]];
  pts.push(...sampleQuad([20.2, 38.4], [20.2, 37.6], [21.0, 38.0], 8));
  pts.push([26.9, 41.4]);
  pts.push(...sampleQuad([26.9, 41.4], [27.7, 41.9], [26.9, 42.5], 8));
  pts.push([21.0, 45.9]);
  pts.push(...sampleQuad([21.0, 45.9], [20.2, 46.3], [20.2, 45.5], 8));
  return pts;
}

const TANPURA_SEGMENTS = buildTanpuraSegments();
const PLAY_POLYGON = buildPlayTrianglePolygon();

function distToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(px - ax, py - ay);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(px - bx, py - by);
  const b = c1 / c2;
  return Math.hypot(px - (ax + b * vx), py - (ay + b * vy));
}

function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function insideShapeMask(x, y, width, height, maskType) {
  if (maskType === 'circle') {
    const cx = width * 0.5;
    const cy = height * 0.5;
    const r = Math.min(width, height) * 0.5;
    return Math.hypot(x - cx, y - cy) <= r;
  }
  if (maskType === 'squircle') {
    const r = Math.min(width, height) * 0.24;
    const qx = Math.abs(x - width * 0.5) - (width * 0.5 - r);
    const qy = Math.abs(y - height * 0.5) - (height * 0.5 - r);
    const dx = Math.max(qx, 0);
    const dy = Math.max(qy, 0);
    return Math.hypot(dx, dy) + Math.min(Math.max(qx, qy), 0) <= r;
  }
  return true;
}

/**
 * Renders crisp 4x4 supersampled RGBA PNG buffer cleanly with zero external binary deps.
 */
function renderRaagPng(width, height, options = {}) {
  const {
    background = [5, 5, 5, 255],
    maskType = 'full', // 'full' | 'squircle' | 'circle'
    logoScale = 0.86, // Fraction of min(w,h) occupied by 64x64 viewBox
  } = options;

  const minDim = Math.min(width, height);
  const scale = (minDim * logoScale) / 64.0;
  const offsetX = (width - 64.0 * scale) * 0.5;
  const offsetY = (height - 64.0 * scale) * 0.5;

  const rgba = Buffer.alloc(width * height * 4);
  const sub = 4;
  const invSamples = 1 / (sub * sub);
  const strokeHalf = 1.3; // 2.6px stroke width in 64x64 viewBox

  // Precompute fast bounding box of logo geometry in pixel coordinates
  const marginPx = 4 * scale + 2;
  const logoMinX = offsetX - marginPx;
  const logoMaxX = offsetX + 64 * scale + marginPx;
  const logoMinY = offsetY - marginPx;
  const logoMaxY = offsetY + 64 * scale + marginPx;
  const cornerR = maskType === 'squircle' ? minDim * 0.24 : maskType === 'circle' ? minDim * 0.5 : 0;

  for (let py = 0; py < height; py++) {
    const rowInLogoY = py >= logoMinY && py <= logoMaxY;
    for (let px = 0; px < width; px++) {
      const inLogoBox = rowInLogoY && px >= logoMinX && px <= logoMaxX;

      // Fast path for pixels far outside logo geometry
      if (!inLogoBox) {
        if (maskType === 'full') {
          if (background[3] > 0) {
            const outIdx = (py * width + px) * 4;
            rgba[outIdx] = background[0];
            rgba[outIdx + 1] = background[1];
            rgba[outIdx + 2] = background[2];
            rgba[outIdx + 3] = background[3];
          }
          continue;
        }
        // Check if safely inside solid rounded squircle/circle core (>2px away from edge)
        const dxCenter = Math.abs(px + 0.5 - width * 0.5);
        const dyCenter = Math.abs(py + 0.5 - height * 0.5);
        const safeInner =
          maskType === 'circle'
            ? dxCenter * dxCenter + dyCenter * dyCenter < (cornerR - 2) * (cornerR - 2)
            : dxCenter < width * 0.5 - cornerR && dyCenter < height * 0.5 - 2;
        if (safeInner) {
          const outIdx = (py * width + px) * 4;
          rgba[outIdx] = background[0];
          rgba[outIdx + 1] = background[1];
          rgba[outIdx + 2] = background[2];
          rgba[outIdx + 3] = background[3];
          continue;
        }
      }

      let accR = 0;
      let accG = 0;
      let accB = 0;
      let accA = 0;

      for (let sy = 0; sy < sub; sy++) {
        const yImg = py + (sy + 0.5) / sub;
        const gy = (yImg - offsetY) / scale;
        for (let sx = 0; sx < sub; sx++) {
          const xImg = px + (sx + 0.5) / sub;

          if (!insideShapeMask(xImg, yImg, width, height, maskType)) {
            continue;
          }

          let sr = background[0];
          let sg = background[1];
          let sb = background[2];
          let sa = background[3];

          const gx = (xImg - offsetX) / scale;
          if (gx >= -2 && gx <= 66 && gy >= -2 && gy <= 66) {
            // Check Saffron Gold tuning peg dot
            const distGold = Math.hypot(gx - 35.1, gy - 12.9);
            if (distGold <= 2.15) {
              sr = 245;
              sg = 158;
              sb = 11;
              sa = 255;
            } else {
              // Check white Tanpura outline + 3 soundwave bars + inner Play triangle
              let isWhite = pointInPolygon(gx, gy, PLAY_POLYGON);
              if (!isWhite) {
                for (let s = 0; s < TANPURA_SEGMENTS.length; s++) {
                  const seg = TANPURA_SEGMENTS[s];
                  if (distToSegment(gx, gy, seg[0], seg[1], seg[2], seg[3]) <= strokeHalf) {
                    isWhite = true;
                    break;
                  }
                }
              }
              if (isWhite) {
                sr = 255;
                sg = 255;
                sb = 255;
                sa = 255;
              }
            }
          }

          const aNorm = sa / 255;
          accR += sr * aNorm;
          accG += sg * aNorm;
          accB += sb * aNorm;
          accA += aNorm;
        }
      }

      const outIdx = (py * width + px) * 4;
      const finalA = accA * invSamples;
      if (finalA > 0) {
        rgba[outIdx] = Math.round(accR * invSamples / finalA);
        rgba[outIdx + 1] = Math.round(accG * invSamples / finalA);
        rgba[outIdx + 2] = Math.round(accB * invSamples / finalA);
        rgba[outIdx + 3] = Math.round(finalA * 255);
      }
    }
  }

  return encodePng(width, height, rgba);
}

// CRC32 table for valid PNG chunks
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter type None
    rgba.copy(raw, rowStart + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function writeFileEnsure(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function generateAllIcons() {
  // 1. Canonical public/icon.svg (512x512 crisp squircle on #050505)
  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512">
  <rect width="64" height="64" rx="15" fill="#050505"/>
  <path d="${TANPURA_PATH}" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${PLAY_PATH}" fill="#FFFFFF"/>
  <circle cx="35.1" cy="12.9" r="2.15" fill="#F59E0B"/>
  <line x1="40.0" y1="29.8" x2="40.0" y2="37.2" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round"/>
  <line x1="45.2" y1="24.2" x2="45.2" y2="42.8" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round"/>
  <line x1="50.4" y1="28.0" x2="50.4" y2="39.0" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round"/>
</svg>
`;
  writeFileEnsure(path.join(publicDir, 'icon.svg'), iconSvg);

  // 2. PWA raster icons (192x192 & 512x512)
  writeFileEnsure(
    path.join(publicDir, 'icon-192.png'),
    renderRaagPng(192, 192, { background: [5, 5, 5, 255], maskType: 'full', logoScale: 0.88 })
  );
  writeFileEnsure(
    path.join(publicDir, 'icon-512.png'),
    renderRaagPng(512, 512, { background: [5, 5, 5, 255], maskType: 'full', logoScale: 0.88 })
  );

  if (fs.existsSync(androidResDir)) {
    // 3. Android Adaptive Icon Background (#050505) + Vector Foreground
    writeFileEnsure(
      path.join(androidResDir, 'values/ic_launcher_background.xml'),
      `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#050505</color>\n</resources>\n`
    );

    // 108dp adaptive icon viewport with 64x64 artwork placed inside centered safe-zone (offset 22,22 -> scale 1.0 within 66dp safe zone!)
    const adaptiveVectorXml = `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <group
        android:translateX="22"
        android:translateY="22">
        <path
            android:pathData="${TANPURA_PATH}"
            android:strokeColor="#FFFFFF"
            android:strokeWidth="2.6"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
        <path
            android:fillColor="#FFFFFF"
            android:pathData="${PLAY_PATH}" />
        <path
            android:fillColor="#F59E0B"
            android:pathData="M35.1,10.75 a2.15,2.15 0 1,0 0,4.3 a2.15,2.15 0 1,0 0,-4.3 z" />
        <path
            android:pathData="M40.0,29.8 L40.0,37.2"
            android:strokeColor="#FFFFFF"
            android:strokeWidth="2.6"
            android:strokeLineCap="round" />
        <path
            android:pathData="M45.2,24.2 L45.2,42.8"
            android:strokeColor="#FFFFFF"
            android:strokeWidth="2.6"
            android:strokeLineCap="round" />
        <path
            android:pathData="M50.4,28.0 L50.4,39.0"
            android:strokeColor="#FFFFFF"
            android:strokeWidth="2.6"
            android:strokeLineCap="round" />
    </group>
</vector>
`;
    writeFileEnsure(
      path.join(androidResDir, 'drawable-v24/ic_launcher_foreground.xml'),
      adaptiveVectorXml
    );

    // 4. Mipmap PNG launcher icons for all Android densities
    const mipmapDensities = [
      { dir: 'mipmap-mdpi', launcher: 48, fg: 108 },
      { dir: 'mipmap-hdpi', launcher: 72, fg: 162 },
      { dir: 'mipmap-xhdpi', launcher: 96, fg: 216 },
      { dir: 'mipmap-xxhdpi', launcher: 144, fg: 324 },
      { dir: 'mipmap-xxxhdpi', launcher: 192, fg: 432 },
    ];

    for (const d of mipmapDensities) {
      writeFileEnsure(
        path.join(androidResDir, `${d.dir}/ic_launcher.png`),
        renderRaagPng(d.launcher, d.launcher, {
          background: [5, 5, 5, 255],
          maskType: 'squircle',
          logoScale: 0.86,
        })
      );
      writeFileEnsure(
        path.join(androidResDir, `${d.dir}/ic_launcher_round.png`),
        renderRaagPng(d.launcher, d.launcher, {
          background: [5, 5, 5, 255],
          maskType: 'circle',
          logoScale: 0.80,
        })
      );
      writeFileEnsure(
        path.join(androidResDir, `${d.dir}/ic_launcher_foreground.png`),
        renderRaagPng(d.fg, d.fg, {
          background: [0, 0, 0, 0],
          maskType: 'full',
          logoScale: 0.60,
        })
      );
    }

    // 5. Matte #050505 Android cold-boot splash screens (portrait + landscape densities)
    const splashTargets = [
      { dir: 'drawable', w: 320, h: 480, logoScale: 0.34 },
      { dir: 'drawable-port-mdpi', w: 320, h: 480, logoScale: 0.34 },
      { dir: 'drawable-port-hdpi', w: 480, h: 800, logoScale: 0.32 },
      { dir: 'drawable-port-xhdpi', w: 640, h: 960, logoScale: 0.30 },
      { dir: 'drawable-port-xxhdpi', w: 720, h: 1280, logoScale: 0.30 },
      { dir: 'drawable-port-xxxhdpi', w: 960, h: 1600, logoScale: 0.28 },
      { dir: 'drawable-land-mdpi', w: 480, h: 320, logoScale: 0.36 },
      { dir: 'drawable-land-hdpi', w: 800, h: 480, logoScale: 0.34 },
      { dir: 'drawable-land-xhdpi', w: 960, h: 640, logoScale: 0.32 },
      { dir: 'drawable-land-xxhdpi', w: 1280, h: 720, logoScale: 0.32 },
      { dir: 'drawable-land-xxxhdpi', w: 1600, h: 960, logoScale: 0.30 },
    ];

    for (const sp of splashTargets) {
      writeFileEnsure(
        path.join(androidResDir, `${sp.dir}/splash.png`),
        renderRaagPng(sp.w, sp.h, {
          background: [5, 5, 5, 255],
          maskType: 'full',
          logoScale: sp.logoScale,
        })
      );
    }
  }

  console.log('[Icons] Generated crisp Raag Tanpura vector SVG, PWA PNGs, and Android adaptive/splash assets.');
}

generateAllIcons();
