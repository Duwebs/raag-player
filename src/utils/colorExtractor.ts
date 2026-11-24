export interface ExtractedPalette {
  dominantRgb: string;     // e.g. "228, 206, 182"
  hex: string;             // e.g. "#E4CEB6"
  solidBackground: string; // 100% opaque solid background color
  gradientBackground: string; // fallback if needed
  isLight: boolean;        // true if background is light/warm (cream, beige, pastel)
  textColor: string;       // #2B2118 if light, #FFFFFF if dark
  subTextColor: string;    // #6B5E55 if light, rgba(255,255,255,0.65) if dark
  iconColor: string;       // #2B2118 if light, #FFFFFF if dark
  barBackground: string;   // seekbar background
  barProgress: string;     // seekbar fill
}

export const DEFAULT_DARK_PALETTE: ExtractedPalette = {
  dominantRgb: "20, 17, 24",
  hex: "#141118",
  solidBackground: "#141118",
  gradientBackground: "linear-gradient(180deg, #1e293b 0%, #0f172a 45%, #050505 100%)",
  isLight: false,
  textColor: "#FFFFFF",
  subTextColor: "rgba(255, 255, 255, 0.65)",
  iconColor: "#FFFFFF",
  barBackground: "rgba(255, 255, 255, 0.2)",
  barProgress: "#FFFFFF",
};

export async function extractDominantColor(imageSrc?: string): Promise<ExtractedPalette> {
  if (!imageSrc) {
    return DEFAULT_DARK_PALETTE;
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
          resolve(DEFAULT_DARK_PALETTE);
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

        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          if (a < 128) continue;

          totalR += r;
          totalG += g;
          totalB += b;
          count++;
        }

        if (count === 0) {
          resolve(DEFAULT_DARK_PALETTE);
          return;
        }

        const avgR = Math.round(totalR / count);
        const avgG = Math.round(totalG / count);
        const avgB = Math.round(totalB / count);

        // Calculate perceived brightness (relative luminance: 0.0 - 1.0)
        const luminance = (0.299 * avgR + 0.587 * avgG + 0.114 * avgB) / 255;
        const isLight = luminance > 0.48;

        if (isLight) {
          // Warm pastel/cream/beige solid background
          const r = Math.min(242, Math.max(185, avgR));
          const g = Math.min(232, Math.max(175, avgG));
          const b = Math.min(218, Math.max(155, avgB));
          const solidBackground = `rgb(${r}, ${g}, ${b})`;
          const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

          resolve({
            dominantRgb: `${r}, ${g}, ${b}`,
            hex,
            solidBackground,
            gradientBackground: solidBackground,
            isLight: true,
            textColor: '#2B2118',
            subTextColor: 'rgba(43, 33, 24, 0.65)',
            iconColor: '#2B2118',
            barBackground: 'rgba(43, 33, 24, 0.18)',
            barProgress: '#2B2118',
          });
        } else {
          // Deep solid dark tone
          const r = Math.min(36, Math.max(16, Math.round(avgR * 0.45)));
          const g = Math.min(32, Math.max(15, Math.round(avgG * 0.45)));
          const b = Math.min(38, Math.max(18, Math.round(avgB * 0.45)));
          const solidBackground = `rgb(${r}, ${g}, ${b})`;
          const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

          resolve({
            dominantRgb: `${r}, ${g}, ${b}`,
            hex,
            solidBackground,
            gradientBackground: solidBackground,
            isLight: false,
            textColor: '#FFFFFF',
            subTextColor: 'rgba(255, 255, 255, 0.65)',
            iconColor: '#FFFFFF',
            barBackground: 'rgba(255, 255, 255, 0.22)',
            barProgress: '#FFFFFF',
          });
        }
      } catch (err) {
        console.warn('Canvas color extraction error:', err);
        resolve(DEFAULT_DARK_PALETTE);
      }
    };

    img.onerror = () => {
      resolve(DEFAULT_DARK_PALETTE);
    };
  });
}
