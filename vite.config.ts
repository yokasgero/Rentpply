import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
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
      const skip = new Set(['app-manifest.json', '_headers']);
      const files: Record<string, { sha256: string; size: number }> = {};
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
      const version = createHash('sha256').update(Object.entries(files).map(([p, f]) => p + ':' + f.sha256).join('\n')).digest('hex').slice(0, 16);
      writeFileSync(join(outDir, 'app-manifest.json'), JSON.stringify({ version, built: new Date().toISOString(), files }, null, 1));
    },
  };
}

export default defineConfig({ plugins: [appManifest()] });
