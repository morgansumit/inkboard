import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createClient } from '@/lib/supabase/server';

const POLICIES_FILE = path.join(process.cwd(), '.purseable-cache', 'policies.json');

interface Policy {
    id: string;
    slug: string;
    title: string;
    content: string;
    description: string;
    isPublished: boolean;
    lastUpdated: string;
    createdAt: string;
    order: number;
}

async function readPolicies(): Promise<Policy[]> {
    try {
        const data = await fs.readFile(POLICIES_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function writePolicies(policies: Policy[]): Promise<void> {
    await fs.mkdir(path.dirname(POLICIES_FILE), { recursive: true });
    await fs.writeFile(POLICIES_FILE, JSON.stringify(policies, null, 2));
}

// Check admin auth
async function checkAdmin(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;
    
    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
    
    return profile?.role === 'ADMIN';
}

// GET /api/admin/policies - List all policies
export async function GET(req: Request) {
    if (!(await checkAdmin(req))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const policies = await readPolicies();
    return NextResponse.json({ policies });
}

// POST /api/admin/policies - Create new policy
export async function POST(req: Request) {
    if (!(await checkAdmin(req))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const body = await req.json();
        const policies = await readPolicies();
        
        // Check for duplicate slug
        if (policies.some(p => p.slug === body.slug)) {
            return NextResponse.json({ error: 'Policy with this slug already exists' }, { status: 400 });
        }
        
        const now = new Date().toISOString();
        const newPolicy: Policy = {
            id: `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            slug: body.slug,
            title: body.title,
            description: body.description,
            content: body.content,
            isPublished: body.isPublished ?? false,
            lastUpdated: now,
            createdAt: now,
            order: policies.length,
        };
        
        policies.push(newPolicy);
        await writePolicies(policies);
        
        return NextResponse.json(newPolicy);
    } catch (err) {
        console.error('Failed to create policy:', err);
        return NextResponse.json({ error: 'Failed to create policy' }, { status: 500 });
    }
}

// PATCH /api/admin/policies - Update policy
export async function PATCH(req: Request) {
    if (!(await checkAdmin(req))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const body = await req.json();
        const policies = await readPolicies();
        
        const index = policies.findIndex(p => p.id === body.id);
        if (index === -1) {
            return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
        }
        
        // Check for duplicate slug if changing slug
        if (body.slug && body.slug !== policies[index].slug) {
            if (policies.some(p => p.slug === body.slug && p.id !== body.id)) {
                return NextResponse.json({ error: 'Policy with this slug already exists' }, { status: 400 });
            }
        }
        
        policies[index] = {
            ...policies[index],
            ...body,
            lastUpdated: new Date().toISOString(),
        };
        await writePolicies(policies);
        
        return NextResponse.json(policies[index]);
    } catch (err) {
        console.error('Failed to update policy:', err);
        return NextResponse.json({ error: 'Failed to update policy' }, { status: 500 });
    }
}

// DELETE /api/admin/policies - Delete policy
export async function DELETE(req: Request) {
    if (!(await checkAdmin(req))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        
        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }
        
        const policies = await readPolicies();
        const filtered = policies.filter(p => p.id !== id);
        await writePolicies(filtered);
        
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Failed to delete policy:', err);
        return NextResponse.json({ error: 'Failed to delete policy' }, { status: 500 });
    }
}
