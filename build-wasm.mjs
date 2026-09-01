import fs from 'fs';
import path from 'path';
import esbuild from 'esbuild-wasm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '.');

console.log('🚀 Starting Optimized ACCAD FARMS WASM Production Build...');

const distDir = path.join(root, 'dist');
const distAssetsDir = path.join(distDir, 'assets');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
if (!fs.existsSync(distAssetsDir)) fs.mkdirSync(distAssetsDir, { recursive: true });

// 2. Initialize esbuild-wasm
await esbuild.initialize({});

const browserShimsPlugin = {
  name: 'browser-shims',
  setup(build) {
    // Polyfill crypto
    build.onResolve({ filter: /^crypto$/ }, () => ({ path: 'crypto', namespace: 'crypto-poly' }));
    build.onLoad({ filter: /.*/, namespace: 'crypto-poly' }, () => ({
      contents: `
        export const webcrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : {};
        export default { webcrypto };
      `,
      loader: 'js'
    }));

    // Shim core-js polyfills
    build.onResolve({ filter: /^core-js/ }, () => ({ path: 'core-js-shim', namespace: 'core-js-shim' }));
    build.onLoad({ filter: /.*/, namespace: 'core-js-shim' }, () => ({
      contents: 'export default {};',
      loader: 'js'
    }));
  }
};

const timestamp = Date.now();
const jsBundleName = `index-${timestamp}.js`;
const jsBundlePath = path.join(distAssetsDir, jsBundleName);

// Clean previous JS bundles from distAssetsDir to save bandwidth
try {
  const existingFiles = fs.readdirSync(distAssetsDir);
  for (const f of existingFiles) {
    if (f.startsWith('index-') && f.endsWith('.js')) {
      fs.unlinkSync(path.join(distAssetsDir, f));
    }
  }
} catch (e) {}

console.log(`📦 Bundling index.tsx with esbuild-wasm (minified & tree-shaken -> ${jsBundleName})...`);
const result = await esbuild.build({
  entryPoints: [path.join(root, 'index.tsx')],
  bundle: true,
  minify: true,
  treeShaking: true,
  legalComments: 'none',
  format: 'esm',
  target: 'es2020',
  outfile: jsBundlePath,
  plugins: [browserShimsPlugin],
  metafile: true,
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.API_KEY': '""',
    'process.env.GEMINI_API_KEY': '""',
    'import.meta.env.VITE_INSFORGE_PROJECT_NAME': '"accadfarmz"',
    'import.meta.env.VITE_INSFORGE_URL': '"https://imf45qwi.us-east.insforge.app"',
    'import.meta.env.VITE_INSFORGE_API_KEY': '"ik_56a71ca7e6aa4249545fc5bd8f983c38"',
    'import.meta.env.VITE_DISCONNECT_DATABASE': '"false"'
  },
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts',
    '.css': 'css',
    '.svg': 'dataurl',
    '.png': 'dataurl',
    '.jpg': 'dataurl'
  }
});

const bundleSize = fs.statSync(jsBundlePath).size;
console.log(`✅ JS Bundle created: dist/assets/${jsBundleName} (${(bundleSize / 1024).toFixed(1)} KB)`);

// 3. Copy public assets into dist
const publicDir = path.join(root, 'public');
if (fs.existsSync(publicDir)) {
  const publicFiles = fs.readdirSync(publicDir);
  for (const file of publicFiles) {
    const srcFile = path.join(publicDir, file);
    const destFile = path.join(distDir, file);
    if (!fs.statSync(srcFile).isDirectory()) {
      fs.copyFileSync(srcFile, destFile);
    }
  }
  console.log('✅ Copied public/ static assets to dist/');
}

// 4. Generate dist/index.html with fresh bundle script
const sourceHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
const finalHtml = sourceHtml.replace(
  /<script\s+type="module"\s+src="[^"]+"><\/script>/i,
  `<script type="module" src="/assets/${jsBundleName}"></script>`
);
fs.writeFileSync(path.join(distDir, 'index.html'), finalHtml, 'utf-8');
console.log('✅ Generated dist/index.html');

// 5. Generate Netlify _redirects & _headers
fs.writeFileSync(path.join(distDir, '_redirects'), '/*  /index.html  200\n', 'utf-8');
fs.writeFileSync(
  path.join(distDir, '_headers'),
  `/*\n  Cache-Control: no-cache, no-store, must-revalidate, max-age=0\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n`,
  'utf-8'
);
console.log('✅ Generated dist/_redirects & dist/_headers');

console.log('🎉 WASM Production Build Complete!');

