import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createClient } from '@/lib/supabase/server';

const COUPONS_FILE = path.join(process.cwd(), '.inkboard-cache', 'coupons.json');

interface Coupon {
    id: string;
    title: string;
    description: string;
    code: string;
    discount: string;
    brand: string;
    brandLogo?: string;
    coverImage: string;
    targetUrl: string;
    category: string;
    expiresAt?: string;
    isActive: boolean;
    clicks: number;
    createdAt: string;
}

async function readCoupons(): Promise<Coupon[]> {
    try {
        const data = await fs.readFile(COUPONS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function writeCoupons(coupons: Coupon[]): Promise<void> {
    await fs.mkdir(path.dirname(COUPONS_FILE), { recursive: true });
    await fs.writeFile(COUPONS_FILE, JSON.stringify(coupons, null, 2));
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

// GET /api/admin/coupons - List all coupons
export async function GET(req: Request) {
    if (!(await checkAdmin(req))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const coupons = await readCoupons();
    return NextResponse.json({ coupons });
}

// POST /api/admin/coupons - Create new coupon
export async function POST(req: Request) {
    if (!(await checkAdmin(req))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const body = await req.json();
        const coupons = await readCoupons();
        
        const newCoupon: Coupon = {
            id: `coupon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: body.title,
            description: body.description || '',
            code: body.code.toUpperCase(),
            discount: body.discount,
            brand: body.brand,
            brandLogo: body.brandLogo || '',
            coverImage: body.coverImage,
            targetUrl: body.targetUrl,
            category: body.category || 'Other',
            expiresAt: body.expiresAt || undefined,
            isActive: body.isActive ?? true,
            clicks: 0,
            createdAt: new Date().toISOString(),
        };
        
        coupons.unshift(newCoupon);
        await writeCoupons(coupons);
        
        return NextResponse.json(newCoupon);
    } catch (err) {
        console.error('Failed to create coupon:', err);
        return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
    }
}

// PATCH /api/admin/coupons - Update coupon status
export async function PATCH(req: Request) {
    if (!(await checkAdmin(req))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const body = await req.json();
        const coupons = await readCoupons();
        
        const index = coupons.findIndex(c => c.id === body.id);
        if (index === -1) {
            return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
        }
        
        coupons[index] = { ...coupons[index], ...body };
        await writeCoupons(coupons);
        
        return NextResponse.json(coupons[index]);
    } catch (err) {
        console.error('Failed to update coupon:', err);
        return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 });
    }
}

// DELETE /api/admin/coupons - Delete coupon
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
        
        const coupons = await readCoupons();
        const filtered = coupons.filter(c => c.id !== id);
        await writeCoupons(filtered);
        
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Failed to delete coupon:', err);
        return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
    }
}
