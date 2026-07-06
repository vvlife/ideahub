import type { RawIdea, Platform } from '../types'

// ── Hacker News top stories ────────────────────────────────────
const NEED_KEYWORDS = [
  'ask hn', 'show hn', 'looking for', 'need', 'wish there was',
  'is there', 'any tool', 'recommend', 'help me', 'how do you',
  'what do you use', 'alternative to', 'self-hosted',
]

export async function crawlHackerNews(): Promise<RawIdea[]> {
  // Fetch top story IDs
  const idsResp = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', {
    signal: AbortSignal.timeout(10000),
  })
  
  if (!idsResp.ok) throw new Error(`HN API returned ${idsResp.status}`)
  
  const ids = (await idsResp.json() as number[]).slice(0, 30)
  
  // Fetch individual items in parallel (batch of 10)
  const results: RawIdea[] = []
  const batchSize = 10
  
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize)
    const items = await Promise.allSettled(
      batch.map(id =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
          signal: AbortSignal.timeout(8000),
        }).then(r => r.json())
      )
    )
    
    for (const item of items) {
      if (item.status !== 'fulfilled' || !item.value) continue
      
      const story = item.value as {
        id: number
        title: string
        url?: string
        score: number
        time: number
        text?: string
        descendants?: number
      }
      
      if (!story.title) continue
      
      const titleLower = story.title.toLowerCase()
      const hasNeed = NEED_KEYWORDS.some(kw => titleLower.includes(kw))
      
      if (hasNeed) {
        results.push({
          title: story.title,
          description: story.text
            ? story.text.replace(/<[^>]*>/g, '').slice(0, 200)
            : story.title,
          platform: 'hackernews' as Platform,
          sourceUrl: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
          publishedAt: new Date(story.time * 1000).toISOString(),
          heat: story.descendants || story.score || 0,
        })
      }
    }
  }
  
  return results
}
