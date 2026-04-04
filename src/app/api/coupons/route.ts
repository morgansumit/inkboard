import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

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

// GET /api/coupons - Public endpoint for active coupons
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');
        
        const coupons = await readCoupons();
        
        // Filter active and non-expired coupons
        let activeCoupons = coupons.filter(c => {
            if (!c.isActive) return false;
            if (c.expiresAt && new Date(c.expiresAt) < new Date()) return false;
            return true;
        });
        
        // Filter by category if provided
        if (category && category !== 'All') {
            activeCoupons = activeCoupons.filter(c => c.category === category);
        }
        
        return NextResponse.json({ coupons: activeCoupons });
    } catch (err) {
        console.error('Failed to fetch coupons:', err);
        return NextResponse.json({ coupons: [] });
    }
}
