import type { RawIdea, Platform } from '../types'

// ── Zhihu hot list ─────────────────────────────────────────────
const NEED_KEYWORDS = ['如何', '有没有', '求推荐', '怎样', '为什么', '什么', '怎么', '哪里', '哪个']

export async function crawlZhihu(): Promise<RawIdea[]> {
  const resp = await fetch(
    'https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=50',
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.zhihu.com/hot',
      },
      signal: AbortSignal.timeout(10000),
    }
  )
  
  if (!resp.ok) throw new Error(`Zhihu API returned ${resp.status}`)
  
  const data = await resp.json() as {
    data: Array<{
      target: {
        id: string
        title: string
        excerpt?: string
        question_id?: string
      }
      detail_text: string
    }>
  }
  
  const results: RawIdea[] = []
  
  if (!data.data) return results
  
  for (const item of data.data) {
    const target = item.target
    if (!target || !target.title) continue
    
    const hasNeed = NEED_KEYWORDS.some(kw => target.title.includes(kw))
    
    if (hasNeed) {
      // Extract heat from detail_text (e.g. "1234 万热度")
      const heatMatch = item.detail_text.match(/(\d+)\s*万/)
      const heat = heatMatch ? parseInt(heatMatch[1]) * 10000 : 0
      
      results.push({
        title: target.title,
        description: target.excerpt || target.title,
        platform: 'zhihu' as Platform,
        sourceUrl: `https://www.zhihu.com/question/${target.question_id || target.id}`,
        publishedAt: new Date().toISOString(),
        heat,
      })
    }
  }
  
  return results
}
