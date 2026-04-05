import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import BusinessRequestForm from './BusinessRequestForm';
import BusinessRequestMessages from './BusinessRequestMessages';

export const runtime = 'nodejs';

export default async function BusinessRequestPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login?next=/business/request');
    }

    const [{ data: profile }, { data: latestRequest }] = await Promise.all([
        supabaseAdmin
            .from('users')
            .select('display_name, is_business, username')
            .eq('id', user.id)
            .maybeSingle(),
        supabaseAdmin
            .from('business_requests')
            .select('id, status, created_at, reviewed_by, reviewer_note')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
    ]);

    const isBusiness = Boolean(profile?.is_business);

    return (
        <div className="business-request-shell">
            <div className="business-request-card">
                <Link href="/" className="brand-wordmark" style={{ display: 'block', marginBottom: '36px' }}>
                    Ink<span>board</span>
                </Link>

                <div className="business-request-header">
                    <p className="eyebrow">purseable Ads</p>
                    <h1>Apply for business tools</h1>
                    <p>
                        Business partners unlock sponsored posts, creator collaborations, and advanced targeting inside the Ads Center.
                        Tell us about your brand and campaigns, and our ops team will review within 1-2 business days.
                    </p>
                </div>

                {isBusiness ? (
                    <>
                        <div className="already-business">
                            <p>You already have business access. Head over to the Ads Center to launch a campaign.</p>
                            <Link href="/ads" className="btn btn-primary btn-sm">
                                Go to Ads Center
                            </Link>
                        </div>
                        {latestRequest?.id && <BusinessRequestMessages businessRequestId={latestRequest.id} />}
                    </>
                ) : (
                    <>
                        <BusinessRequestForm
                            defaultBusinessName={profile?.display_name || profile?.username || user.email || ''}
                            defaultWebsite={null}
                            existingRequest={latestRequest}
                        />
                        {latestRequest?.id && <BusinessRequestMessages businessRequestId={latestRequest.id} />}
                    </>
                )}
            </div>
        </div>
    );
}
