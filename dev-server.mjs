import fs from 'fs';
import path from 'path';
import http from 'http';
import esbuild from 'esbuild-wasm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '.');

const PORT = 3300;
const distDir = path.join(root, 'dist');
const distAssetsDir = path.join(distDir, 'assets');

if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
if (!fs.existsSync(distAssetsDir)) fs.mkdirSync(distAssetsDir, { recursive: true });

// Initialize esbuild-wasm
await esbuild.initialize({});

const browserShimsPlugin = {
  name: 'browser-shims',
  setup(build) {
    build.onResolve({ filter: /^crypto$/ }, () => ({ path: 'crypto', namespace: 'crypto-poly' }));
    build.onLoad({ filter: /.*/, namespace: 'crypto-poly' }, () => ({
      contents: `
        export const webcrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : {};
        export default { webcrypto };
      `,
      loader: 'js'
    }));

    build.onResolve({ filter: /^core-js/ }, () => ({ path: 'core-js-shim', namespace: 'core-js-shim' }));
    build.onLoad({ filter: /.*/, namespace: 'core-js-shim' }, () => ({
      contents: 'export default {};',
      loader: 'js'
    }));
  }
};

let isBuilding = false;

async function bundleApp() {
  if (isBuilding) return;
  isBuilding = true;
  const start = Date.now();
  try {
    const jsBundleName = `index-bundle.js`;
    const jsBundlePath = path.join(distAssetsDir, jsBundleName);

    await esbuild.build({
      entryPoints: [path.join(root, 'index.tsx')],
      bundle: true,
      minify: false,
      sourcemap: 'inline',
      format: 'esm',
      target: 'es2020',
      outfile: jsBundlePath,
      plugins: [browserShimsPlugin],
      define: {
        'process.env.NODE_ENV': '"development"',
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

    const sourceHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    const finalHtml = sourceHtml.replace(
      '<script type="module" src="/index.tsx"></script>',
      `<script type="module" src="/assets/${jsBundleName}"></script>`
    );
    fs.writeFileSync(path.join(distDir, 'index.html'), finalHtml, 'utf-8');
    console.log(`⚡ Rebuild completed in ${Date.now() - start}ms`);
  } catch (err) {
    console.error('❌ Build error:', err);
  } finally {
    isBuilding = false;
  }
}

// Initial bundle
console.log('📦 Performing initial development build...');
await bundleApp();

// Watch directories for changes
const watchDirs = ['components', 'pages', 'lib', 'src'];
watchDirs.forEach(dir => {
  const fullPath = path.join(root, dir);
  if (fs.existsSync(fullPath)) {
    fs.watch(fullPath, { recursive: true }, (eventType, filename) => {
      if (filename && (filename.endsWith('.ts') || filename.endsWith('.tsx') || filename.endsWith('.css') || filename.endsWith('.json'))) {
        console.log(`🔄 Changed: ${dir}/${filename} -> rebuilding...`);
        bundleApp();
      }
    });
  }
});

// Watch root files
['App.tsx', 'index.tsx', 'index.html', 'types.ts'].forEach(file => {
  const fullPath = path.join(root, file);
  if (fs.existsSync(fullPath)) {
    fs.watch(fullPath, () => {
      console.log(`🔄 Changed: ${file} -> rebuilding...`);
      bundleApp();
    });
  }
});

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';

  let filePath = path.join(distDir, reqPath);

  // Check if file exists in dist
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // Check in public dir
    const publicPath = path.join(root, 'public', reqPath);
    if (fs.existsSync(publicPath) && !fs.statSync(publicPath).isDirectory()) {
      filePath = publicPath;
    } else {
      // SPA Fallback
      filePath = path.join(distDir, 'index.html');
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
=====================================================
🌾 ACCAD FARMS DEV SERVER RUNNING!
👉 Local:   http://localhost:${PORT}
👉 Network: http://127.0.0.1:${PORT}
=====================================================
`);
});
