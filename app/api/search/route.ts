import { NextResponse } from 'next/server'
import { search } from '@/lib/store'
import { webSearch } from '@/lib/web-search'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''

  if (!q.trim()) {
    return NextResponse.json({ results: [], total: 0 })
  }

  // 1. Search local cache
  const localResults = await search(q)

  // 2. Web search via DuckDuckGo API
  let webResults: any[] = []
  try {
    const webItems = await webSearch(q, 10)
    webResults = webItems.map((item, idx) => ({
      type: 'idea' as const,
      id: `web_${Date.now()}_${idx}`,
      title: item.title,
      description: item.description,
      platform: 'other',
      sourceUrl: item.url,
      publishedAt: new Date().toISOString(),
      heat: 0,
      category: '其他',
    }))
  } catch (e) {
    console.error('Web search error:', e)
  }

  // 3. Merge: local first, then web (dedup by title)
  const seenTitles = new Set(localResults.results.map((r: any) => r.title?.toLowerCase()))
  const uniqueWeb = webResults.filter((r: any) => !seenTitles.has(r.title?.toLowerCase()))

  return NextResponse.json({
    results: [...localResults.results, ...uniqueWeb],
    total: localResults.results.length + uniqueWeb.length,
  })
}
