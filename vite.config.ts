import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { copyFileSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// The Android and iPhone apps (apps/) carry a copy of the site and keep it up to date.
// After each build this writes dist/app-manifest.json: every file with its SHA-256, plus a version
// made from all of them. The apps poll that file and download only what changed.
function appManifest() {
  let outDir = 'dist';
  return {
    name: 'rentpply-app-manifest',
    apply: 'build' as const,
    configResolved(c: { root: string; build: { outDir: string } }) { outDir = join(c.root, c.build.outDir); },
    closeBundle() {
      // Cloudflare adds its analytics script to HTML as it serves it, so the apps download the page from an
      // untouched copy with a .txt name instead (the manifest says where, in "src").
      copyFileSync(join(outDir, 'index.html'), join(outDir, 'app-shell.txt'));
      const skip = new Set(['app-manifest.json', '_headers', 'app-shell.txt']);
      const files: Record<string, { sha256: string; size: number; src?: string }> = {};
      const walk = (dir: string) => {
        for (const name of readdirSync(dir).sort()) {
          const full = join(dir, name);
          if (statSync(full).isDirectory()) { walk(full); continue; }
          const path = relative(outDir, full).split(sep).join('/');
          if (skip.has(path)) continue;
          const data = readFileSync(full);
          files[path] = { sha256: createHash('sha256').update(data).digest('hex'), size: data.length };
        }
      };
      walk(outDir);
      if (files['index.html']) files['index.html'].src = 'app-shell.txt';
      const version = createHash('sha256').update(Object.entries(files).map(([p, f]) => p + ':' + f.sha256).join('\n')).digest('hex').slice(0, 16);
      writeFileSync(join(outDir, 'app-manifest.json'), JSON.stringify({ version, built: new Date().toISOString(), files }, null, 1));
    },
  };
}

export default defineConfig({ plugins: [appManifest()] });
