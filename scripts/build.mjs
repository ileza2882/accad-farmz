import { build } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

try {
  console.log('Starting Vite build with configFile: false...');
  await build({
    root,
    configFile: false,
    base: './',
    plugins: [react()],
    resolve: {
      alias: {
        '@': root,
      }
    },
    build: {
      outDir: path.resolve(root, 'dist'),
      emptyOutDir: true,
      chunkSizeWarningLimit: 2000
    }
  });
  console.log('✅ BUILD COMPLETED SUCCESSFULLY');
} catch (e) {
  console.error('❌ BUILD ERROR:', e);
  process.exit(1);
}
