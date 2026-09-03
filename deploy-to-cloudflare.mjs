import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '.');

console.log('=====================================================');
console.log('☁️  ACCAD FARMS - Cloudflare Pages Deployment Pipeline');
console.log('📧 Registered Account: accadfarmsapp@gmail.com');
console.log('=====================================================\n');

// 1. Load Environment Variables from .env and .env.local
function loadEnv() {
  ['.env', '.env.local'].forEach(file => {
    const envPath = path.join(root, file);
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim();
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  });
}
loadEnv();

// 2. Build Production Bundle
console.log('📦 Step 1: Compiling fresh production bundle...');
try {
  execSync('node build-wasm.mjs', { stdio: 'inherit', cwd: root });
} catch (e) {
  console.error('❌ Build failed:', e.message);
  process.exit(1);
}

const distDir = path.join(root, 'dist');
if (!fs.existsSync(distDir)) {
  console.error('❌ dist/ folder not found!');
  process.exit(1);
}

// Ensure Cloudflare Pages _redirects file exists
const redirectsPath = path.join(distDir, '_redirects');
fs.writeFileSync(redirectsPath, '/*  /index.html  200\n', 'utf-8');

// Ensure Cloudflare Pages _headers file exists
const headersPath = path.join(distDir, '_headers');
fs.writeFileSync(
  headersPath,
  `/*\n  Cache-Control: no-cache, no-store, must-revalidate, max-age=0\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n`,
  'utf-8'
);

console.log('\n🚀 Step 2: Deploying to Cloudflare Pages...');
console.log('Project: accadfarms');

try {
  const deployCmd = process.platform === 'win32'
    ? 'cmd.exe /c npx.cmd wrangler pages deploy dist --project-name accadfarms --commit-dirty=true'
    : 'npx wrangler pages deploy dist --project-name accadfarms --commit-dirty=true';

  execSync(deployCmd, {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
      CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID
    }
  });

  console.log('\n=====================================================');
  console.log('🎉 Cloudflare Pages Deployment Succeeded!');
  console.log('🌐 Live Application: https://accadfarms.pages.dev');
  console.log('=====================================================\n');
} catch (deployErr) {
  console.error('\n⚠️ Deployment failed:', deployErr.message);
  process.exit(1);
}
