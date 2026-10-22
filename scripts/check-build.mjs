import { existsSync, readFileSync } from 'node:fs';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const source = readFileSync(new URL('../lib/supabase/config.js', import.meta.url), 'utf8');
const { getSupabaseConfig } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
if (!['app', 'src/app', 'pages', 'src/pages'].some((path) => existsSync(path))) {
  throw new Error('Missing Next.js routes. Restore app/ beside package.json, or set deployment Root Directory to the folder containing both.');
}
getSupabaseConfig();
console.log('Project root and public Supabase configuration checked.');
