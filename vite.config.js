import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

const repoUrl = pkg.repository?.url || (typeof pkg.repository === 'string' ? pkg.repository : '') || 'https://github.com/Duwebs/raag-player.git';
const repoMatch = repoUrl.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(\.git)?$/);
const repoSlug = repoMatch ? `${repoMatch[1]}/${repoMatch[2]}` : 'Duwebs/raag-player';

export default defineConfig({
  plugins: [react()],
  define: {
    __GITHUB_REPO__: JSON.stringify(repoSlug),
    __APP_VERSION__: JSON.stringify(pkg.version || '1.0.5'),
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
