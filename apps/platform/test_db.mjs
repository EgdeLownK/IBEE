import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ztblirxxptdwqobmervk.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0Ymxpcnh4cHRkd3FvYm1lcnZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjkyMDA1MiwiZXhwIjoyMDg4NDk2MDUyfQ.FHObWC7NOL_i84e2n-Cn54mWIZruGV2xxBpumGt6YvM');
async function check() {
  const { data: products } = await supabase.from('products').select('id, title, status').order('created_at', { ascending: false }).limit(2);
  console.log('Products:', products);
  if (products && products.length > 0) {
    const { data: media } = await supabase.from('product_media').select('*').eq('product_id', products[0].id);
    console.log('Media for newest product:', media);
  }
}
check();
