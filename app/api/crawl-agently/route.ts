import { NextRequest, NextResponse } from 'next/server'
import { collectByTopic, isAgentlyAvailable } from '@/lib/agently-client'
import type { Idea, Category } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { topic } = await req.json()

    if (!topic?.trim()) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 })
    }

    // Check if Agently server is available
    const available = await isAgentlyAvailable()
    if (!available) {
      return NextResponse.json({
        error: 'Agently server is not available. Start it with: python crawl-server/agently_server.py',
      }, { status: 503 })
    }

    // Collect by topic
    const result = await collectByTopic(topic.trim(), 20)

    if (!result.success) {
      return NextResponse.json({
        error: 'Collection failed',
        details: result,
      }, { status: 500 })
    }

    // Convert to Idea format and add to store
    const validCategories: Category[] = ['AI工具', 'SaaS', '消费', '教育', '开发者工具', '设计', '出海', '其他']
    const ideas: Idea[] = result.ideas.map((item, idx) => ({
      id: `agently_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 8)}`,
      title: item.title,
      description: item.description,
      platform: 'other' as const,
      sourceUrl: item.sourceUrl || '',
      publishedAt: item.publishedAt || new Date().toISOString(),
      heat: item.heat || 0,
      category: (validCategories.includes(item.category as Category) ? item.category : '其他') as Category,
    }))

    return NextResponse.json({
      success: true,
      topic: result.topic,
      ideas,
      total: ideas.length,
      collected_at: result.collected_at,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const available = await isAgentlyAvailable()
  return NextResponse.json({
    available,
    message: available
      ? 'Agently server is running'
      : 'Agently server is not available. Start it with: python crawl-server/agently_server.py',
  })
}
