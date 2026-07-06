import type { RawIdea, Platform } from '../types'
import { categorize } from '../categorize'

// ── V2EX hot topics ────────────────────────────────────────────
const NEED_KEYWORDS = ['求推荐', '有没有', '求一个', '如何', '求助', '请问', '想要', '需要', '寻找', '推荐']

export async function crawlV2EX(): Promise<RawIdea[]> {
  const resp = await fetch('https://www.v2ex.com/api/topics/hot.json', {
    headers: {
      'User-Agent': 'IdeaHub/1.0 (https://ideahub.vercel.app)',
    },
    signal: AbortSignal.timeout(10000),
  })
  
  if (!resp.ok) throw new Error(`V2EX API returned ${resp.status}`)
  
  const topics = await resp.json() as Array<{
    id: number
    title: string
    content: string
    url: string
    replies: number
    created: number
  }>
  
  const results: RawIdea[] = []
  
  for (const topic of topics) {
    const titleLower = topic.title.toLowerCase()
    const hasNeed = NEED_KEYWORDS.some(kw => titleLower.includes(kw.toLowerCase()))
    
    if (hasNeed) {
      const description = topic.content
        ? topic.content.replace(/<[^>]*>/g, '').slice(0, 200)
        : topic.title
      
      results.push({
        title: topic.title,
        description: description || topic.title,
        platform: 'v2ex' as Platform,
        sourceUrl: topic.url || `https://www.v2ex.com/t/${topic.id}`,
        publishedAt: new Date(topic.created * 1000).toISOString(),
        heat: topic.replies || 0,
      })
    }
  }
  
  return results
}
