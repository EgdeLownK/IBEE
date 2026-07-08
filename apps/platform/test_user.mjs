import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ztblirxxptdwqobmervk.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0Ymxpcnh4cHRkd3FvYm1lcnZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjkyMDA1MiwiZXhwIjoyMDg4NDk2MDUyfQ.FHObWC7NOL_i84e2n-Cn54mWIZruGV2xxBpumGt6YvM');
async function test() {
  const { data: p } = await supabase.from('products').select('*, entity!inner(user_id)').eq('id', '66ab8d6c-5489-477b-b2b2-eecfdfda1a2b').single();
  console.log('User ID:', p.entity.user_id);
}
test();
