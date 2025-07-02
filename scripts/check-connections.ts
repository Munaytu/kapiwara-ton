import { Redis } from '@upstash/redis';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'kapiwara-ton/.env.local' });

async function checkConnections() {
  try {
    // Redis connection check
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Missing Upstash Redis credentials');
    }

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    await redis.ping();
    console.log('Redis connection: ✅');
  } catch (error: any) {
    console.error('Redis connection: ❌');
    console.error(error.message);
  }

  try {
    // Supabase connection check
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase credentials');
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase.from('countries').select('*').limit(1);

    if (error) {
      throw error;
    }

    console.log('Supabase connection: ✅');
  } catch (error: any) {
    console.error('Supabase connection: ❌');
    console.error(error.message);
  }
}

checkConnections();