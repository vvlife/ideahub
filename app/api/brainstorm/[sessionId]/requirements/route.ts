import { NextRequest, NextResponse } from 'next/server'
import { addBrainstormRequirement, getBrainstormSession } from '@/lib/remote-store'
import type { BrainstormRequirement } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const { author, content, type } = await req.json()

    if (!author || !content) {
      return NextResponse.json(
        { error: 'author and content are required' },
        { status: 400 }
      )
    }

    const session = await getBrainstormSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.status === 'closed') {
      return NextResponse.json(
        { error: 'Session is closed' },
        { status: 400 }
      )
    }

    const requirement: BrainstormRequirement = {
      id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sessionId: sessionId,
      author,
      content,
      type: type || 'requirement',
      createdAt: new Date().toISOString(),
    }

    await addBrainstormRequirement(requirement)

    return NextResponse.json({ success: true, requirement })
  } catch (error) {
    console.error('Add requirement error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
