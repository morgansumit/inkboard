// Smart country detection with fallbacks

const TIMEZONE_COUNTRIES: Record<string, string> = {
    'Asia/Kolkata': 'IN', 'Europe/London': 'GB', 'America/New_York': 'US',
    'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US',
    'Europe/Paris': 'FR', 'Europe/Berlin': 'DE', 'Europe/Madrid': 'ES',
    'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Asia/Shanghai': 'CN',
    'Asia/Singapore': 'SG', 'Australia/Sydney': 'AU', 'America/Toronto': 'CA',
    'America/Sao_Paulo': 'BR', 'America/Mexico_City': 'MX',
};

export async function detectCountryWithFallback(): Promise<{
    country: string | null;
    source: 'ipinfo' | 'timezone' | 'none';
    isGuess: boolean;
}> {
    try {
        const ipRes = await fetch('https://ipinfo.io/json');
        if (ipRes.ok) {
            const data = await ipRes.json();
            if (data.country) {
                return { country: data.country, source: 'ipinfo', isGuess: false };
            }
        }
    } catch (e) {
        console.log('[countryDetection] ipinfo failed');
    }
    
    // Fallback: Timezone
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const country = TIMEZONE_COUNTRIES[tz];
        if (country) {
            return { country, source: 'timezone', isGuess: true };
        }
    } catch (e) {
        // ignore
    }
    
    return { country: null, source: 'none', isGuess: false };
}

export const COUNTRY_NAMES: Record<string, string> = {
    'IN': 'India', 'GB': 'United Kingdom', 'US': 'United States', 'CA': 'Canada',
    'AU': 'Australia', 'DE': 'Germany', 'FR': 'France', 'JP': 'Japan',
    'KR': 'South Korea', 'CN': 'China', 'SG': 'Singapore', 'BR': 'Brazil',
    'MX': 'Mexico', 'ES': 'Spain', 'IT': 'Italy', 'NL': 'Netherlands',
    'RU': 'Russia', 'ZA': 'South Africa', 'AE': 'UAE', 'PK': 'Pakistan',
    'BD': 'Bangladesh', 'LK': 'Sri Lanka', 'NP': 'Nepal', 'TH': 'Thailand',
    'VN': 'Vietnam', 'MY': 'Malaysia', 'PH': 'Philippines', 'ID': 'Indonesia',
    'NZ': 'New Zealand', 'IE': 'Ireland', 'SE': 'Sweden', 'NO': 'Norway',
    'DK': 'Denmark', 'FI': 'Finland', 'PL': 'Poland', 'CZ': 'Czech Republic',
    'HU': 'Hungary', 'RO': 'Romania', 'BG': 'Bulgaria', 'GR': 'Greece',
    'PT': 'Portugal', 'AT': 'Austria', 'CH': 'Switzerland', 'BE': 'Belgium',
    'TR': 'Turkey', 'UA': 'Ukraine', 'IL': 'Israel', 'SA': 'Saudi Arabia',
    'EG': 'Egypt', 'NG': 'Nigeria', 'KE': 'Kenya', 'GH': 'Ghana',
    'AR': 'Argentina', 'CL': 'Chile', 'PE': 'Peru', 'CO': 'Colombia',
    'VE': 'Venezuela', 'EC': 'Ecuador', 'UY': 'Uruguay', 'PY': 'Paraguay',
    'BO': 'Bolivia', 'CR': 'Costa Rica', 'PA': 'Panama', 'GT': 'Guatemala',
    'HN': 'Honduras', 'SV': 'El Salvador', 'NI': 'Nicaragua', 'DO': 'Dominican Republic',
    'CU': 'Cuba', 'JM': 'Jamaica', 'TT': 'Trinidad and Tobago', 'BB': 'Barbados',
    'HT': 'Haiti', 'IS': 'Iceland', 'MT': 'Malta', 'CY': 'Cyprus',
    'LU': 'Luxembourg', 'MC': 'Monaco', 'LI': 'Liechtenstein', 'AD': 'Andorra',
    'SM': 'San Marino', 'VA': 'Vatican City',
};
