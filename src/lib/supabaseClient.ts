import { createClient } from '@supabase/supabase-js';

// Asegúrate de crear un archivo .env.local en la raíz del proyecto y añadir estas variables.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
