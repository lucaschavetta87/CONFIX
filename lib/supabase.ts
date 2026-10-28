import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mshzaatzxjzzqruszihp.supabase.co';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_9w01GiT57R-vruEgbVkQEQ_z4UShVc6';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan las variables de Supabase. Copiá .env.example a .env.local y completá ' +
      'NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
