import { NextResponse } from 'next/server';
import { getCountryFromRequest } from '@/lib/geo';
import { headers } from 'next/headers';

export const runtime = 'nodejs';

export async function GET() {
    const h = await headers();
    const country = await getCountryFromRequest();

    return NextResponse.json({
        detected_country: country,
        headers: {
            'x-country': h.get('x-country'),
            'x-nf-country': h.get('x-nf-country'),
            'x-vercel-ip-country': h.get('x-vercel-ip-country'),
            'cf-ipcountry': h.get('cf-ipcountry'),
            'x-nf-client-connection-ip': h.get('x-nf-client-connection-ip'),
            'x-forwarded-for': h.get('x-forwarded-for'),
        },
    });
}
