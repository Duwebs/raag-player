import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ZipArchive } from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const packageJsonPath = path.resolve(rootDir, 'package.json');

const OTA_BASE_URL = 'https://raagplayer.vercel.app';

async function generateOta() {
  if (!fs.existsSync(distDir)) {
    console.error('[OTA] dist directory does not exist. Run vite build first.');
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const version = pkg.version || '1.0.1';
  const buildTime = new Date().toISOString();
  const notes = process.env.OTA_NOTES || `v${version}: Native Android MediaStore audio scanner, real OS permissions & Over-The-Air updater`;
  const bundleUrl = `${OTA_BASE_URL}/bundle.zip`;

  // 1. Generate dist/version.json
  const versionData = {
    version,
    buildTime,
    notes,
    bundleUrl,
  };

  const versionJsonPath = path.resolve(distDir, 'version.json');
  fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2), 'utf-8');
  console.log(`[OTA] Generated ${versionJsonPath} (v${version})`);

  // Also sync to public/version.json for local dev/preview
  const publicDir = path.resolve(rootDir, 'public');
  if (fs.existsSync(publicDir)) {
    fs.writeFileSync(path.resolve(publicDir, 'version.json'), JSON.stringify(versionData, null, 2), 'utf-8');
  }

  // 2. Generate dist/bundle.zip with dist contents directly at zip root
  const zipPath = path.resolve(distDir, 'bundle.zip');
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  const output = fs.createWriteStream(zipPath);
  const archive = new ZipArchive({
    zlib: { level: 9 },
  });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      const sizeMb = (archive.pointer() / (1024 * 1024)).toFixed(2);
      console.log(`[OTA] Created ${zipPath} (${sizeMb} MB, ${archive.pointer()} total bytes) at zip root`);
      resolve();
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('[OTA] Archive warning:', err);
      } else {
        reject(err);
      }
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Archive all files in dist/ directly at zip root, excluding bundle.zip
    archive.glob('**/*', {
      cwd: distDir,
      ignore: ['bundle.zip'],
      dot: true,
    });

    archive.finalize();
  });
}

generateOta().catch((err) => {
  console.error('[OTA] Packaging failed:', err);
  process.exit(1);
});
