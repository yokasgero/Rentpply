#!/usr/bin/env python3
"""Copies the live site into a folder, exactly as rentpply.com serves it, for bundling inside the apps.

    python3 apps/fetch-site.py OUT_DIR [https://rentpply.com]

Reads /app-manifest.json (written by the site's build, see vite.config.ts), downloads every file it lists,
checks each one's SHA-256 and writes the manifest last, so the app knows which version it carries.
The app then starts from this copy and keeps itself up to date from the same manifest.
"""
import hashlib, json, os, sys, time, urllib.request

out = sys.argv[1]
base = (sys.argv[2] if len(sys.argv) > 2 else 'https://rentpply.com').rstrip('/')
UA = {'User-Agent': 'RentpplyAppBuild/1.0', 'Cache-Control': 'no-cache'}


def get(path, tries=5):
    for i in range(tries):
        try:
            # The site answers /index.html with a redirect to /, so the page itself is fetched from /.
            url = f'{base}/' if path == 'index.html' else f'{base}/{path}'
            req = urllib.request.Request(f'{url}?b={int(time.time())}', headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except Exception as e:  # flaky connections: try again
            if i == tries - 1:
                raise SystemExit(f'Could not download {path}: {e}')
            time.sleep(2 + i * 3)


raw = get('app-manifest.json')
manifest = json.loads(raw)
for path, info in manifest['files'].items():
    data = get(path)
    if hashlib.sha256(data).hexdigest() != info['sha256']:
        raise SystemExit(f'{path} does not match the manifest (the site may be mid-deploy; try again)')
    dest = os.path.join(out, *path.split('/'))
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, 'wb') as f:
        f.write(data)
with open(os.path.join(out, 'app-manifest.json'), 'wb') as f:
    f.write(raw)
print(f"Site version {manifest['version']}: {len(manifest['files'])} files in {out}")
