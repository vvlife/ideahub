import { NextRequest, NextResponse } from 'next/server'
import { closeBrainstormSession, getBrainstormSession, getBrainstormRequirements } from '@/lib/remote-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const session = await getBrainstormSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.status === 'closed') {
      return NextResponse.json(
        { error: 'Session is already closed' },
        { status: 400 }
      )
    }

    // 获取所有需求并合并
    const requirements = await getBrainstormRequirements(sessionId)
    if (requirements.length === 0) {
      return NextResponse.json(
        { error: 'No requirements to merge' },
        { status: 400 }
      )
    }

    // 按类型分组合并
    const grouped = {
      requirements: requirements.filter(r => r.type === 'requirement'),
      feedback: requirements.filter(r => r.type === 'feedback'),
      suggestions: requirements.filter(r => r.type === 'suggestion'),
    }

    let mergedText = ''
    if (grouped.requirements.length > 0) {
      mergedText += '## 需求\n'
      grouped.requirements.forEach(r => {
        mergedText += `- [${r.author}] ${r.content}\n`
      })
      mergedText += '\n'
    }
    if (grouped.feedback.length > 0) {
      mergedText += '## 反馈\n'
      grouped.feedback.forEach(r => {
        mergedText += `- [${r.author}] ${r.content}\n`
      })
      mergedText += '\n'
    }
    if (grouped.suggestions.length > 0) {
      mergedText += '## 建议\n'
      grouped.suggestions.forEach(r => {
        mergedText += `- [${r.author}] ${r.content}\n`
      })
    }

    await closeBrainstormSession(sessionId, mergedText)

    return NextResponse.json({
      success: true,
      mergedRequirements: mergedText,
      requirementCount: requirements.length,
      participantCount: session.participants.length,
    })
  } catch (error) {
    console.error('Close brainstorm error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
