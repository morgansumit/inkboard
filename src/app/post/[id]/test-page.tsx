// Minimal test - if this works, the issue is in PostDetailClient or its imports
import Link from 'next/link';

export default async function TestPostPage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params;
    return (
        <div style={{ padding: '48px', textAlign: 'center' }}>
            <h1>Test Post Page</h1>
            <p>Post ID: {id}</p>
            <Link href="/">Back to feed</Link>
        </div>
    );
}
