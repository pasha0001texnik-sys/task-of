import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://huhiqipdjtgsowwoumua.supabase.co';
const supabaseKey = 'sb_publishable_aaA2ShqRmKMcK6mVO1geVw_cA-pW4zT';

export const supabase = createClient(supabaseUrl, supabaseKey);
