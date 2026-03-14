import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// .env.local 우선, 없으면 .env
dotenv.config({ path: path.join(root, '.env.local') });
dotenv.config({ path: path.join(root, '.env') });

const isDev = process.env.NODE_ENV !== 'production';

export const config = {
  isDev,
  discord: {
    token: process.env.DISCORD_BOT_TOKEN ?? process.env.DISCORD_TOKEN!,
    clientId: process.env.DISCORD_CLIENT_ID ?? '1482245554598576221',
    devGuildId: '927195557280231514',
  },
  supabase: {
    url: process.env.SUPABASE_URL!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
    schema: 'limbus' as const,
  },
  storageBase: 'https://lpgqcleszdlldneiwgep.supabase.co/storage/v1/object/public/limbus-assets',
} as const;
