import { createClient } from '@insforge/sdk';

const NEW_URL = 'https://imf45qwi.us-east.insforge.app';
const NEW_API_KEY = 'ik_56a71ca7e6aa4249545fc5bd8f983c38';

const client = createClient({
  baseUrl: NEW_URL,
  anonKey: NEW_API_KEY
});

const USERS_TO_MIGRATE = [
  {
    email: 'info@accadfarms.com',
    password: 'Password123!',
    fullName: 'Executive Director',
    role: 'EXECUTIVE_DIRECTOR',
    department: 'General Operations'
  },
  {
    email: 'dalestic12@gmail.com',
    password: 'Password123!',
    fullName: 'David Adamu Ileza',
    role: 'STAFF',
    department: 'Fishery'
  },
  {
    email: 'operations@accadfarms.com',
    password: 'Password123!',
    fullName: 'Farm Operations Manager',
    role: 'MANAGER',
    department: 'General Operations'
  },
  {
    email: 'fishery@accadfarms.com',
    password: 'Password123!',
    fullName: 'Fishery Manager',
    role: 'MANAGER',
    department: 'Fishery'
  },
  {
    email: 'poultry@accadfarms.com',
    password: 'Password123!',
    fullName: 'Poultry Manager',
    role: 'MANAGER',
    department: 'Poultry'
  },
  {
    email: 'piggery@accadfarms.com',
    password: 'Password123!',
    fullName: 'Piggery Manager',
    role: 'MANAGER',
    department: 'Piggery'
  },
  {
    email: 'crops@accadfarms.com',
    password: 'Password123!',
    fullName: 'Crops Manager',
    role: 'MANAGER',
    department: 'Crops & Horticulture'
  },
  {
    email: 'staff@accadfarms.com',
    password: 'Password123!',
    fullName: 'Fishery Senior Technician',
    role: 'STAFF',
    department: 'Fishery'
  }
];

async function migrate() {
  console.log('🚀 Starting Data Transfer to New InsForge Database (imf45qwi)...');

  for (const u of USERS_TO_MIGRATE) {
    try {
      console.log(`👤 Provisioning user in new database Auth: ${u.fullName} (${u.email})...`);
      const res = await client.auth.signUp({
        email: u.email,
        password: u.password,
        name: u.fullName
      });

      if (res.error) {
        console.log(`   Notice: ${res.error.message || 'Already exists or handled'}`);
      } else {
        console.log(`   ✅ Successfully provisioned ${u.email}`);
      }
    } catch (err) {
      console.warn(`   ⚠️ Warning for ${u.email}:`, err.message);
    }
  }

  console.log('\n🎉 Data Transfer to New Database Complete!');
}

migrate();
