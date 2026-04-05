import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const COUPONS_FILE = path.join(process.cwd(), '.purseable-cache', 'coupons.json');

interface Coupon {
    id: string;
    clicks: number;
    [key: string]: any;
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

// POST /api/coupons/click - Track coupon click
export async function POST(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        
        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }
        
        const coupons = await readCoupons();
        const index = coupons.findIndex(c => c.id === id);
        
        if (index !== -1) {
            coupons[index].clicks = (coupons[index].clicks || 0) + 1;
            await writeCoupons(coupons);
        }
        
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Failed to track click:', err);
        return NextResponse.json({ error: 'Failed to track' }, { status: 500 });
    }
}
