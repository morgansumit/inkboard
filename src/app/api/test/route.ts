import { NextResponse } from 'next/server'

export async function GET() {
    return NextResponse.json({ message: 'Test endpoint works', timestamp: new Date().toISOString() })
}

export async function POST(req: Request) {
    const body = await req.json()
    return NextResponse.json({ message: 'POST test works', body, timestamp: new Date().toISOString() })
}
