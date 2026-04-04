import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
    if (client) return client;
    
    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing Supabase service role credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
    }
    
    client = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
        },
    });
    
    return client;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
    get(target, prop) {
        return getSupabaseAdmin()[prop as keyof SupabaseClient];
    }
});
