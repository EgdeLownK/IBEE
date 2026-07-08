import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ztblirxxptdwqobmervk.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0Ymxpcnh4cHRkd3FvYm1lcnZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjkyMDA1MiwiZXhwIjoyMDg4NDk2MDUyfQ.FHObWC7NOL_i84e2n-Cn54mWIZruGV2xxBpumGt6YvM');
async function test() {
  const { data, error } = await supabase.from('product_media').insert({
    product_id: '66ab8d6c-5489-477b-b2b2-eecfdfda1a2b',
    url: 'https://test.com/test.jpg',
    media_type: 'image',
    display_order: 0
  }).select();
  console.log(data, error);
}
test();
