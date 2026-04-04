import { headers } from 'next/headers';

/**
 * Detect the viewer/poster's country from request headers.
 * Netlify provides x-country automatically. Falls back to ipinfo.io lookup.
 */
export async function getCountryFromRequest(): Promise<string | null> {
    try {
        const h = await headers();

        // Netlify geo headers (available automatically)
        const country = h.get('x-country') || h.get('x-nf-country');
        if (country && country.length === 2) {
            return country.toUpperCase();
        }

        // Vercel geo header
        const vercelCountry = h.get('x-vercel-ip-country');
        if (vercelCountry && vercelCountry.length === 2) {
            return vercelCountry.toUpperCase();
        }

        // Cloudflare header
        const cfCountry = h.get('cf-ipcountry');
        if (cfCountry && cfCountry.length === 2) {
            return cfCountry.toUpperCase();
        }

        // Fallback: use IP to look up country via ipinfo.io
        const ip = h.get('x-nf-client-connection-ip')
            || h.get('x-forwarded-for')?.split(',')[0]?.trim()
            || h.get('x-real-ip');

        if (ip && ip !== '127.0.0.1' && ip !== '::1') {
            const res = await fetch(`https://ipinfo.io/${ip}/json`, {
                signal: AbortSignal.timeout(2000),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.country && data.country.length === 2) {
                    return data.country.toUpperCase();
                }
            }
        }
    } catch (err) {
        console.error('[geo] Country detection failed:', err);
    }

    return null;
}
