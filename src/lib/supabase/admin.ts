import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient | null = null;

// Create a mock client that returns proper error responses when credentials missing
const createMockClient = (): SupabaseClient => {
    const errorObj = { 
        code: 'NO_CREDENTIALS', 
        message: 'Admin credentials not configured. Set SUPABASE_SERVICE_ROLE_KEY env var.',
        details: 'Called on admin client without credentials'
    };

    // Fully chainable builder that always resolves to { data: null, error }
    const chainable = (): any => {
        const obj: any = { data: null, error: errorObj, count: null, status: 500, statusText: 'NO_CREDENTIALS' };
        const self = () => obj;
        // Every possible PostgREST method returns itself so chains never break
        const methods = ['select','insert','upsert','update','delete','eq','neq','gt','gte','lt','lte',
            'like','ilike','is','in','contains','containedBy','filter','not','or','match',
            'order','limit','range','single','maybeSingle','csv','then','throwOnError','returns','head'];
        for (const m of methods) {
            obj[m] = (..._args: any[]) => chainable();
        }
        return obj;
    };

    return {
        from: () => chainable(),
        rpc: () => chainable(),
        auth: {
            getUser: async () => ({ data: { user: null }, error: null }),
            getSession: async () => ({ data: { session: null }, error: null }),
        },
    } as unknown as SupabaseClient;
};

export function getSupabaseAdmin(): SupabaseClient {
    if (client) return client;
    
    if (!supabaseUrl || !serviceRoleKey) {
        console.warn('[admin] Missing Supabase service role credentials. Returning mock client.');
        return createMockClient();
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
