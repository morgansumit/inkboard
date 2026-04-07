export default async function PostPage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params;
    return (
        <div style={{ padding: '48px', textAlign: 'center' }}>
            <h1>Post Debug</h1>
            <p>Post ID: {id}</p>
            <p>If you see this, the page route works.</p>
            <a href="/">Back to feed</a>
        </div>
    );
}
