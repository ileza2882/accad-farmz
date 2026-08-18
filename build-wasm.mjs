import fs from 'fs';
import path from 'path';
import esbuild from 'esbuild-wasm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '.');

console.log('🚀 Starting ACCAD FARMS WASM Production Build...');

// 1. Ensure dist and dist/assets directories exist
const distDir = path.join(root, 'dist');
const distAssetsDir = path.join(distDir, 'assets');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
if (!fs.existsSync(distAssetsDir)) fs.mkdirSync(distAssetsDir, { recursive: true });

// 2. Initialize esbuild-wasm for Node.js
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

    // Shim core-js polyfills (modern browsers have native support)
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

console.log('📦 Bundling index.tsx with esbuild-wasm...');
await esbuild.build({
  entryPoints: [path.join(root, 'index.tsx')],
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2020',
  outfile: jsBundlePath,
  plugins: [browserShimsPlugin],
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.API_KEY': '""',
    'process.env.GEMINI_API_KEY': '""',
    'import.meta.env.VITE_INSFORGE_PROJECT_NAME': '"accadfarmz"',
    'import.meta.env.VITE_INSFORGE_URL': '"https://a7yjmvd8.us-east.insforge.app"',
    'import.meta.env.VITE_INSFORGE_API_KEY': '"ik_d5f1bd324edbe697b5f79c8e19de1b28"',
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

console.log(`✅ JS Bundle created: dist/assets/${jsBundleName}`);

// 3. Generate dist/index.html
const sourceHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
const finalHtml = sourceHtml.replace(
  '<script type="module" src="/index.tsx"></script>',
  `<script type="module" src="./assets/${jsBundleName}"></script>`
);
fs.writeFileSync(path.join(distDir, 'index.html'), finalHtml, 'utf-8');
console.log('✅ Generated dist/index.html');

// 4. Generate Netlify _redirects & _headers
fs.writeFileSync(path.join(distDir, '_redirects'), '/*  /index.html  200\n', 'utf-8');
fs.writeFileSync(
  path.join(distDir, '_headers'),
  `/*\n  Cache-Control: no-cache, no-store, must-revalidate\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n`,
  'utf-8'
);
console.log('✅ Generated dist/_redirects & dist/_headers');

console.log('🎉 WASM Production Build Complete!');
