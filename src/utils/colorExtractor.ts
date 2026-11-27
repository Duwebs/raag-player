export interface ExtractedPalette {
  dominantRgb: string;
  hex: string;
  solidBackground: string;
  sheetBackground: string;
  sheetElevated: string;
  gradientBackground: string;
  isLight: boolean;
  textColor: string;
  subTextColor: string;
  iconColor: string;
  barBackground: string;
  barProgress: string;
}

export const DEFAULT_DARK_PALETTE: ExtractedPalette = {
  dominantRgb: '20, 17, 24',
  hex: '#141118',
  solidBackground: '#141118',
  sheetBackground: '#100E14',
  sheetElevated: '#1C1922',
  gradientBackground: 'linear-gradient(180deg, #1e293b 0%, #0f172a 45%, #050505 100%)',
  isLight: false,
  textColor: '#FFFFFF',
  subTextColor: 'rgba(255, 255, 255, 0.72)',
  iconColor: '#FFFFFF',
  barBackground: 'rgba(255, 255, 255, 0.22)',
  barProgress: '#FFFFFF',
};

function relativeLuminance(r: number, g: number, b: number): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

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

        // Weighted average emphasizing vibrant/mid pixels over pure black/white corners
        let weightedR = 0;
        let weightedG = 0;
        let weightedB = 0;
        let weightSum = 0;

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

          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
          const weight = 1 + sat * 2.5;
          weightedR += r * weight;
          weightedG += g * weight;
          weightedB += b * weight;
          weightSum += weight;
        }

        if (count === 0) {
          resolve(DEFAULT_DARK_PALETTE);
          return;
        }

        const rawAvgLum = relativeLuminance(totalR / count, totalG / count, totalB / count);
        const isLight = rawAvgLum > 0.56;

        if (isLight) {
          const avgR = Math.round(totalR / count);
          const avgG = Math.round(totalG / count);
          const avgB = Math.round(totalB / count);
          const r = Math.min(238, Math.max(185, avgR));
          const g = Math.min(228, Math.max(175, avgG));
          const b = Math.min(216, Math.max(158, avgB));
          const solidBackground = `rgb(${r}, ${g}, ${b})`;
          const sheetBackground = `rgb(${Math.max(165, r - 14)}, ${Math.max(155, g - 14)}, ${Math.max(142, b - 14)})`;
          const sheetElevated = `rgba(43, 33, 24, 0.08)`;
          const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

          resolve({
            dominantRgb: `${r}, ${g}, ${b}`,
            hex,
            solidBackground,
            sheetBackground,
            sheetElevated,
            gradientBackground: solidBackground,
            isLight: true,
            textColor: '#2B2118',
            subTextColor: 'rgba(43, 33, 24, 0.68)',
            iconColor: '#2B2118',
            barBackground: 'rgba(43, 33, 24, 0.18)',
            barProgress: '#2B2118',
          });
        } else {
          // Rich saturated album tone scaled safely so white text always meets strong contrast
          let r = Math.round(weightedR / weightSum);
          let g = Math.round(weightedG / weightSum);
          let b = Math.round(weightedB / weightSum);

          // Ensure deep minimum floor while avoiding harsh clipping
          r = Math.max(18, r);
          g = Math.max(16, g);
          b = Math.max(20, b);

          // Scale down luminance gently until L <= 0.165 (~4.8:1 contrast against white)
          let safety = 0;
          while (relativeLuminance(r, g, b) > 0.165 && safety < 20) {
            r = Math.max(16, Math.round(r * 0.88));
            g = Math.max(14, Math.round(g * 0.88));
            b = Math.max(18, Math.round(b * 0.88));
            safety++;
          }

          const sr = Math.max(12, Math.round(r * 0.86));
          const sg = Math.max(10, Math.round(g * 0.86));
          const sb = Math.max(14, Math.round(b * 0.86));

          const solidBackground = `rgb(${r}, ${g}, ${b})`;
          const sheetBackground = `rgb(${sr}, ${sg}, ${sb})`;
          const sheetElevated = 'rgba(255, 255, 255, 0.08)';
          const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

          resolve({
            dominantRgb: `${r}, ${g}, ${b}`,
            hex,
            solidBackground,
            sheetBackground,
            sheetElevated,
            gradientBackground: solidBackground,
            isLight: false,
            textColor: '#FFFFFF',
            subTextColor: 'rgba(255, 255, 255, 0.72)',
            iconColor: '#FFFFFF',
            barBackground: 'rgba(255, 255, 255, 0.24)',
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
