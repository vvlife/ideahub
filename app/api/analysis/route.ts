import { NextRequest, NextResponse } from 'next/server'
import { getAnalysisByIdea, addAnalysisRecord, type AnalysisRecord } from '@/lib/remote-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/analysis?ideaId=xxx — 获取某 idea 的分析记录
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const ideaId = url.searchParams.get('ideaId')
    if (!ideaId) {
      return NextResponse.json(
        { error: 'ideaId is required' },
        { status: 400 }
      )
    }
    const records = await getAnalysisByIdea(ideaId)
    return NextResponse.json({ records, total: records.length })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST /api/analysis — 保存分析记录
export async function POST(req: NextRequest) {
  try {
    const record: AnalysisRecord = await req.json()
    if (!record.ideaId || !record.analysis) {
      return NextResponse.json(
        { error: 'ideaId and analysis are required' },
        { status: 400 }
      )
    }
    const success = await addAnalysisRecord(record)
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to save analysis' },
        { status: 500 }
      )
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
