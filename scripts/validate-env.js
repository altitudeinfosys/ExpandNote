#!/usr/bin/env node
/**
 * Build-time environment variable validation
 * Run this script before building to ensure all required env vars are set
 *
 * Usage: node scripts/validate-env.js
 */

const fs = require('fs');
const path = require('path');

// Load .env.local if it exists (for local development)
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      // Only set if not already in process.env (deployment vars take precedence)
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

const errors = [];

console.log('🔍 Validating environment variables...\n');

for (const varName of requiredEnvVars) {
  const value = process.env[varName];

  if (!value) {
    errors.push(`❌ Missing: ${varName}`);
  } else {
    console.log(`✅ Found: ${varName}`);
  }
}

if (errors.length > 0) {
  console.error('\n⚠️  Environment variable validation failed:\n');
  errors.forEach(error => console.error(error));
  console.error('\n📝 Please add missing variables to your .env.local file or deployment environment.');
  console.error('   See .env.example for required variables.\n');
  process.exit(1);
}

console.log('\n✅ All required environment variables are set!\n');
process.exit(0);
