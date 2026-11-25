import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ZipArchive } from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const otaDir = path.resolve(rootDir, 'ota');
const packageJsonPath = path.resolve(rootDir, 'package.json');

function getRepoSlug() {
  if (process.env.GITHUB_REPOSITORY) {
    return process.env.GITHUB_REPOSITORY;
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const url = pkg.repository?.url || (typeof pkg.repository === 'string' ? pkg.repository : '');
    const match = url.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(\.git)?$/);
    if (match) return `${match[1]}/${match[2]}`;
  } catch {
    // fallback
  }
  return 'Duwebs/raag-player';
}

async function generateOta() {
  if (!fs.existsSync(distDir)) {
    console.error('[OTA] dist directory does not exist. Run vite build first.');
    process.exit(1);
  }

  // Ensure ota directory exists
  if (!fs.existsSync(otaDir)) {
    fs.mkdirSync(otaDir, { recursive: true });
  }

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const runNumber = process.env.GITHUB_RUN_NUMBER || '';
  const version = process.env.OTA_VERSION || (runNumber ? `1.0.${runNumber}` : (pkg.version || '1.0.5'));
  const repoSlug = getRepoSlug();
  const defaultBundleUrl = `https://cdn.jsdelivr.net/gh/${repoSlug}@main/ota/bundle.zip`;
  const bundleUrl = process.env.OTA_BUNDLE_URL || defaultBundleUrl;
  const buildTime = new Date().toISOString();
  const notes = process.env.OTA_NOTES || (runNumber ? `Live OTA Update #${runNumber}` : 'Live OTA update via jsDelivr CDN');

  // 1. Generate version.json
  const versionData = {
    version,
    bundleUrl,
    notes,
    buildTime,
  };

  const distVersionPath = path.resolve(distDir, 'version.json');
  fs.writeFileSync(distVersionPath, JSON.stringify(versionData, null, 2), 'utf-8');

  const otaVersionPath = path.resolve(otaDir, 'version.json');
  fs.writeFileSync(otaVersionPath, JSON.stringify(versionData, null, 2), 'utf-8');
  console.log(`[OTA] Generated ${otaVersionPath} (v${version}) -> ${bundleUrl}`);

  // Also sync to public/version.json for local dev/preview
  const publicDir = path.resolve(rootDir, 'public');
  if (fs.existsSync(publicDir)) {
    fs.writeFileSync(path.resolve(publicDir, 'version.json'), JSON.stringify(versionData, null, 2), 'utf-8');
  }

  // 2. Generate dist/bundle.zip with dist contents directly at zip root
  const distZipPath = path.resolve(distDir, 'bundle.zip');
  if (fs.existsSync(distZipPath)) {
    fs.unlinkSync(distZipPath);
  }

  const output = fs.createWriteStream(distZipPath);
  const archive = new ZipArchive({
    zlib: { level: 9 },
  });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      const sizeMb = (archive.pointer() / (1024 * 1024)).toFixed(2);
      console.log(`[OTA] Created ${distZipPath} (${sizeMb} MB, ${archive.pointer()} total bytes) at zip root`);

      // Copy to ota/bundle.zip
      const otaZipPath = path.resolve(otaDir, 'bundle.zip');
      fs.copyFileSync(distZipPath, otaZipPath);
      console.log(`[OTA] Copied to ${otaZipPath}`);

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
