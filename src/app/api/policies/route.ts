import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

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

// GET /api/policies - Public endpoint for published policies
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const slug = searchParams.get('slug');
        
        const policies = await readPolicies();
        
        // Filter only published policies
        const publishedPolicies = policies.filter(p => p.isPublished);
        
        // If slug provided, return single policy
        if (slug) {
            const policy = publishedPolicies.find(p => p.slug === slug);
            if (!policy) {
                return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
            }
            return NextResponse.json({ policy });
        }
        
        // Return all published policies (sorted by order)
        return NextResponse.json({ 
            policies: publishedPolicies.sort((a, b) => a.order - b.order) 
        });
    } catch (err) {
        console.error('Failed to fetch policies:', err);
        return NextResponse.json({ policies: [] });
    }
}
