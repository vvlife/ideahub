import type { RawIdea, Idea, CrawlStats } from '../types'
import { categorize } from '../categorize'
import { crawlV2EX } from './v2ex'
import { crawlHackerNews } from './hackernews'
import { crawlProductHunt } from './producthunt'
import { crawlReddit } from './reddit'
import { crawlWeibo } from './weibo'
import { crawlZhihu } from './zhihu'

export interface CrawlResult {
  ideas: Idea[]
  stats: CrawlStats
}

// ── Run all crawlers in parallel, collect results ──────────────
export async function crawlAll(): Promise<CrawlResult> {
  const crawlers: Array<{ name: string; fn: () => Promise<RawIdea[]> }> = [
    { name: 'V2EX', fn: crawlV2EX },
    { name: 'HackerNews', fn: crawlHackerNews },
    { name: 'ProductHunt', fn: crawlProductHunt },
    { name: 'Reddit', fn: crawlReddit },
    { name: 'Weibo', fn: crawlWeibo },
    { name: 'Zhihu', fn: crawlZhihu },
  ]
  
  const results = await Promise.allSettled(
    crawlers.map(c => c.fn())
  )
  
  const errors: string[] = []
  const byPlatform: Record<string, number> = {}
  const allRawIdeas: RawIdea[] = []
  
  results.forEach((result, index) => {
    const name = crawlers[index].name
    if (result.status === 'fulfilled') {
      const rawIdeas = result.value
      byPlatform[name] = rawIdeas.length
      allRawIdeas.push(...rawIdeas)
    } else {
      errors.push(`${name}: ${result.reason?.message || 'unknown error'}`)
      byPlatform[name] = 0
    }
  })
  
  // Convert RawIdea → Idea with categorization and unique IDs
  const ideas: Idea[] = allRawIdeas.map((raw, index) => {
    const category = categorize(raw.title, raw.description)
    return {
      id: `idea_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`,
      title: raw.title,
      description: raw.description,
      platform: raw.platform,
      sourceUrl: raw.sourceUrl,
      publishedAt: raw.publishedAt,
      heat: raw.heat,
      category,
    }
  })
  
  const stats: CrawlStats = {
    totalFetched: ideas.length,
    byPlatform,
    collectionsFormed: 0,
    errors,
  }
  
  return { ideas, stats }
}
