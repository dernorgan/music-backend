const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = supabase;

//
// const SUPABASE_URL = process.env.SUPABASE_URL;        // URL твого проєкту Supabase
// const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY; // Анонімний ключ API (або service key)
//
// const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
//
// module.exports = supabaseClient;