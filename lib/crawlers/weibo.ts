import type { RawIdea, Platform } from '../types'

// ── Weibo hot topics via mobile API ────────────────────────────
const NEED_KEYWORDS = ['求推荐', '有没有', '如何', '求助', '想要', '需要', '寻找', '推荐', '请问', '想买']

export async function crawlWeibo(): Promise<RawIdea[]> {
  const resp = await fetch(
    'https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26filter_type%3Drealtime',
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'application/json',
        'Referer': 'https://m.weibo.cn/',
      },
      signal: AbortSignal.timeout(10000),
    }
  )
  
  if (!resp.ok) throw new Error(`Weibo API returned ${resp.status}`)
  
  const data = await resp.json() as {
    data: {
      cards: Array<{
        card_type?: string
        mblog?: {
          text: string
          created_at: string
          id: string
          reposts_count: number
          comments_count: number
          attitudes_count: number
        }
      }>
    }
  }
  
  const results: RawIdea[] = []
  
  if (!data.data || !data.data.cards) return results
  
  for (const card of data.data.cards) {
    if (card.card_type !== '9' || !card.mblog) continue
    
    const text = card.mblog.text.replace(/<[^>]*>/g, '').trim()
    if (!text) continue
    
    const hasNeed = NEED_KEYWORDS.some(kw => text.includes(kw))
    
    if (hasNeed) {
      const title = text.slice(0, 80)
      const description = text.slice(0, 200)
      const heat = (card.mblog.reposts_count || 0) +
                   (card.mblog.comments_count || 0) +
                   (card.mblog.attitudes_count || 0)
      
      // Parse Weibo date format (e.g. "今天 12:30", "昨天 20:15", "07-05")
      const createdStr = card.mblog.created_at
      let publishedAt: string
      if (createdStr.includes('今天')) {
        publishedAt = new Date().toISOString()
      } else if (createdStr.includes('昨天')) {
        publishedAt = new Date(Date.now() - 86400000).toISOString()
      } else {
        const parsed = new Date(createdStr)
        publishedAt = isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
      }
      
      results.push({
        title,
        description,
        platform: 'weibo' as Platform,
        sourceUrl: `https://m.weibo.cn/detail/${card.mblog.id}`,
        publishedAt,
        heat,
      })
    }
  }
  
  return results
}
