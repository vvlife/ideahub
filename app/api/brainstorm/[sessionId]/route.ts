import { NextRequest, NextResponse } from 'next/server'
import { getBrainstormSession, getBrainstormRequirements } from '@/lib/remote-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const session = await getBrainstormSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const requirements = await getBrainstormRequirements(sessionId)

    return NextResponse.json({ session, requirements })
  } catch (error) {
    console.error('Get brainstorm error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
