// GitHub Pages serves 404.html for unknown paths: copying index.html there makes
// client-side routes (e.g. /experiments/abc) reload correctly.
import { copyFileSync } from 'node:fs';
copyFileSync('dist/index.html', 'dist/404.html');
