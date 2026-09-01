import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

const TOKEN = 'nfp_NrJ9oApSk97J6g1f3MsUQhAQBeMqoWXP3d44';
const SITE_ID = '7ae35053-e03e-4ec1-aad9-8b3c747d8bd6';

async function deploy() {
  console.log('🚀 Deploying ACCAD FARMS to new Netlify account (accadfarmsapp@gmail.com)...');
  const distDir = path.resolve('dist');

  if (!fs.existsSync(distDir)) {
    console.error('❌ dist/ directory not found! Run build first.');
    process.exit(1);
  }

  console.log('📦 Creating deployment bundle with adm-zip...');
  const zip = new AdmZip();

  // Recursively add directory files
  function addDir(currentDir, zipSubDir = '') {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const zipEntryName = zipSubDir ? `${zipSubDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        addDir(fullPath, zipEntryName);
      } else {
        try {
          const content = fs.readFileSync(fullPath);
          zip.addFile(zipEntryName, content);
        } catch (e) {
          console.warn(`Skipping locked file ${entry.name}:`, e.message);
        }
      }
    }
  }

  addDir(distDir);
  const zipBuffer = zip.toBuffer();

  console.log(`📦 Deployment archive size: ${(zipBuffer.length / 1024).toFixed(1)} KB`);

  console.log(`📡 Uploading to Netlify site (${SITE_ID})...`);
  const res = await fetch(`https://api.netlify.com/api/v1/sites/${SITE_ID}/deploys`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/zip'
    },
    body: zipBuffer
  });

  const json = await res.json();

  if (res.ok) {
    console.log('\n🎉 Deployment to New Netlify Account Succeeded!');
    console.log(`🌐 Live URL: ${json.ssl_url || json.url}`);
    console.log(`🆔 Deploy ID: ${json.id}`);
    console.log(`📊 State: ${json.state}`);
  } else {
    console.error('\n❌ Deployment failed:', json);
    process.exit(1);
  }
}

deploy().catch(err => {
  console.error('Deploy error:', err);
  process.exit(1);
});
