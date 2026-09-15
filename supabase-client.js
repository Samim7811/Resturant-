const SUPABASE_URL = 'https://gwwttllyhwtsdudafhmj.supabase.co';

const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_RSiBriDZf8VZbd-no6G7rg_OTADecQu';

const { createClient } = window.supabase;

const supabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
