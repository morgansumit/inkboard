import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CouponsClient } from './CouponsClient';

export default async function CouponsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login?redirect=/admin/coupons');
    }

    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    if (profile?.role !== 'ADMIN') {
        redirect('/');
    }

    return <CouponsClient />;
}
