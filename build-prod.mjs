import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '.');

console.log('🚀 Starting ACCAD FARMS Production Build...');

// 1. Ensure dist and dist/assets directories exist
const distDir = path.join(root, 'dist');
const distAssetsDir = path.join(distDir, 'assets');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
if (!fs.existsSync(distAssetsDir)) fs.mkdirSync(distAssetsDir, { recursive: true });

// 2. Locate esbuild binary
const gesbuildPath = path.join(root, 'node_modules', '@esbuild', 'win32-x64', 'gesbuild.exe');
const esbuildPath = fs.existsSync(gesbuildPath)
  ? gesbuildPath
  : path.join(root, 'node_modules', '@esbuild', 'win32-x64', 'esbuild.exe');
if (!fs.existsSync(esbuildPath)) {
  console.error('❌ esbuild binary not found at:', esbuildPath);
  process.exit(1);
}

// 3. Define Environment Constants for SDK and Application
const envDefines = [
  '--define:process.env.NODE_ENV="production"',
  '--define:import.meta.env.VITE_INSFORGE_PROJECT_NAME="accadfarmz"',
  '--define:import.meta.env.VITE_INSFORGE_URL="https://imf45qwi.us-east.insforge.app"',
  '--define:import.meta.env.VITE_INSFORGE_API_KEY="ik_56a71ca7e6aa4249545fc5bd8f983c38"',
  '--define:import.meta.env.VITE_DISCONNECT_DATABASE="false"'
];

// 4. Bundle application using esbuild directly
const timestamp = Date.now();
const jsBundleName = `index-${timestamp}.js`;
const jsBundlePath = path.join(distAssetsDir, jsBundleName);

const esbuildArgs = [
  'index.tsx',
  '--bundle',
  '--minify',
  '--format=esm',
  '--target=es2020',
  `--outfile=${jsBundlePath}`,
  ...envDefines
];

console.log('📦 Bundling index.tsx with direct esbuild binary...');
const result = spawnSync(esbuildPath, esbuildArgs, {
  cwd: root,
  stdio: 'inherit'
});

if (result.status !== 0) {
  console.error('❌ esbuild bundling failed with status:', result.status);
  process.exit(1);
}

console.log(`✅ JS Bundle created: dist/assets/${jsBundleName}`);

// 5. Generate dist/index.html pointing to latest bundle
const sourceHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
const finalHtml = sourceHtml.replace(
  '<script type="module" src="/index.tsx"></script>',
  `<script type="module" src="./assets/${jsBundleName}"></script>`
);
fs.writeFileSync(path.join(distDir, 'index.html'), finalHtml, 'utf-8');
console.log('✅ Generated dist/index.html');

// 6. Generate Netlify _redirects for SPA routing
fs.writeFileSync(path.join(distDir, '_redirects'), '/*  /index.html  200\n', 'utf-8');
console.log('✅ Generated dist/_redirects');

console.log('🎉 Production build complete!');
