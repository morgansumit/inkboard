import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient | null = null;

// Create a mock client that returns proper error responses when credentials missing
const createMockClient = (): SupabaseClient => {
    const createErrorResponse = (method: string) => ({
      data: null,
      error: { 
        code: 'NO_CREDENTIALS', 
        message: 'Admin credentials not configured. Set SUPABASE_SERVICE_ROLE_KEY env var.',
        details: `Called ${method}() on admin client without credentials`
      }
    });
    
    const chainableError = (method: string) => () => createErrorResponse(method);

    return {
        from: () => ({
            select: () => ({ ...createErrorResponse('select'), eq: chainableError('eq'), maybeSingle: chainableError('maybeSingle'), single: chainableError('single'), order: chainableError('order') }),
            insert: () => ({ ...createErrorResponse('insert'), select: chainableError('select') }),
            upsert: () => ({ ...createErrorResponse('upsert'), select: chainableError('select') }),
            delete: () => ({ ...createErrorResponse('delete'), eq: chainableError('eq') }),
            update: () => ({ ...createErrorResponse('update'), eq: chainableError('eq') }),
        }),
        rpc: () => createErrorResponse('rpc'),
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
