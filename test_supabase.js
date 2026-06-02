const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://yqvclrposdiqpahnllph.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxdmNscnBvc2RpcXBhaG5sbHBoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDMxNzkwNSwiZXhwIjoyMDk1ODkzOTA1fQ.u52hnAzrOJnu23ey2VS3_Y58hgzaueUIIGWtuAObSWc');

async function test() {
    console.log('Testing licenses...');
    let { data: l, error: e1 } = await supabase.from('licenses').select('*');
    if (e1) console.error('Licenses Error:', e1);
    else console.log('Licenses:', l);

    console.log('Testing devices...');
    let { data: d, error: e2 } = await supabase.from('devices').select('*');
    if (e2) console.error('Devices Error:', e2);
    else console.log('Devices:', d);
}
test();
