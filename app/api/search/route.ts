import { NextResponse } from 'next/server'
import { search } from '@/lib/store'
import { isAgentlyAvailable, searchAgently } from '@/lib/agently-client'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const source = searchParams.get('source') || 'local' // 'local' | 'agently' | 'all'

  if (!q.trim()) {
    return NextResponse.json({ results: [], total: 0 })
  }

  // Agently-only search
  if (source === 'agently' && (await isAgentlyAvailable())) {
    try {
      const result = await searchAgently(q, 20, 'w')
      return NextResponse.json({
        results: result.ideas.map((item, idx) => ({
          type: 'idea' as const,
          id: `agently_${idx}`,
          title: item.title,
          description: item.description,
          platform: 'other',
          sourceUrl: item.sourceUrl || '',
          publishedAt: item.publishedAt || new Date().toISOString(),
          heat: 0,
          category: '其他',
        })),
        total: result.total,
        source: 'agently',
      })
    } catch (e: any) {
      return NextResponse.json({
        results: [],
        total: 0,
        error: e?.message || 'Agently search failed',
        source: 'agently',
      })
    }
  }

  // Default: local search (with Agently fallback in store.search)
  const results = await search(q)
  return NextResponse.json(results)
}
