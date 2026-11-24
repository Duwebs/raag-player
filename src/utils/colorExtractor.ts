export interface ExtractedPalette {
  dominantRgb: string; // e.g. "72, 45, 30"
  hex: string;
  gradientBackground: string;
  glow: string;
}

const DEFAULT_PALETTE: ExtractedPalette = {
  dominantRgb: "37, 99, 235", // Electric blue
  hex: "#2563EB",
  gradientBackground: "linear-gradient(180deg, #1e293b 0%, #0f172a 40%, #050505 100%)",
  glow: "rgba(37, 99, 235, 0.25)",
};

export async function extractDominantColor(imageSrc?: string): Promise<ExtractedPalette> {
  if (!imageSrc) {
    return DEFAULT_PALETTE;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageSrc;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(DEFAULT_PALETTE);
          return;
        }

        const width = 32;
        const height = 32;
        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height).data;

        let totalR = 0;
        let totalG = 0;
        let totalB = 0;
        let count = 0;

        let bestScore = -1;
        let bestR = 40, bestG = 40, bestB = 50;

        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          if (a < 128) continue;

          // Compute saturation and brightness
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          const lightness = (max + min) / 2;

          // Skip almost pure black or pure white
          if (lightness < 25 || lightness > 230) continue;

          // Prefer saturated colors
          const saturation = lightness === 0 ? 0 : delta / (255 - Math.abs(2 * lightness - 255));
          const score = saturation * 2 + (lightness / 255);

          if (score > bestScore) {
            bestScore = score;
            bestR = r;
            bestG = g;
            bestB = b;
          }

          totalR += r;
          totalG += g;
          totalB += b;
          count++;
        }

        // If no candidate scored high, use average or fallback
        const r = bestScore > 0.4 ? bestR : (count > 0 ? Math.round(totalR / count) : 37);
        const g = bestScore > 0.4 ? bestG : (count > 0 ? Math.round(totalG / count) : 99);
        const b = bestScore > 0.4 ? bestB : (count > 0 ? Math.round(totalB / count) : 235);

        // Darken & enrich for a deep, cinematic background
        const topR = Math.min(255, Math.round(r * 0.85));
        const topG = Math.min(255, Math.round(g * 0.85));
        const topB = Math.min(255, Math.round(b * 0.85));

        const midR = Math.round(r * 0.35);
        const midG = Math.round(g * 0.35);
        const midB = Math.round(b * 0.35);

        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        const dominantRgb = `${r}, ${g}, ${b}`;
        const gradientBackground = `linear-gradient(180deg, rgba(${topR}, ${topG}, ${topB}, 0.72) 0%, rgba(${midR}, ${midG}, ${midB}, 0.85) 45%, #050505 85%, #050505 100%)`;
        const glow = `rgba(${r}, ${g}, ${b}, 0.35)`;

        resolve({
          dominantRgb,
          hex,
          gradientBackground,
          glow,
        });
      } catch (e) {
        console.warn("Color extraction error:", e);
        resolve(DEFAULT_PALETTE);
      }
    };

    img.onerror = () => {
      resolve(DEFAULT_PALETTE);
    };
  });
}
