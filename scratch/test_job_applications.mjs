import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('apps/platform/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // bypassing RLS for checking table existence

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('entity_job_applications').select('*').limit(1);
  if (error) {
    console.error("Error fetching job applications:", error);
  } else {
    console.log("Success fetching job applications:", data);
  }
}

check();
