import type { RawIdea, Idea, CrawlStats } from '../types'
import { categorize } from '../categorize'
import { filterAds } from '../filter'
import { isNewsbotAvailable, collectNews } from '../newsbot-client'

export interface CrawlResult {
  ideas: Idea[]
  stats: CrawlStats
}

// ── NewsBot collection ────────────────────────────────────────
async function crawlNewsbot(): Promise<RawIdea[]> {
  if (!(await isNewsbotAvailable())) {
    return []
  }

  const response = await collectNews([], 30)

  if (!response.success || !response.ideas) return []

  return response.ideas.map(item => ({
    title: item.title,
    description: item.description,
    platform: 'other' as const,
    sourceUrl: item.sourceUrl || '',
    publishedAt: item.publishedAt || new Date().toISOString(),
    heat: item.heat || 0,
  }))
}

// ── Main crawl function ───────────────────────────────────────
export async function crawlAll(): Promise<CrawlResult> {
  const errors: string[] = []
  const byPlatform: Record<string, number> = {}
  let allRawIdeas: RawIdea[] = []

  // Try NewsBot collection
  try {
    const newsbotIdeas = await crawlNewsbot()
    if (newsbotIdeas.length > 0) {
      byPlatform['NewsBot'] = newsbotIdeas.length
      allRawIdeas.push(...newsbotIdeas)
    }
  } catch (e: any) {
    errors.push(`NewsBot: ${e?.message || 'unknown error'}`)
  }

  // Filter ads
  const filteredIdeas = filterAds(allRawIdeas)
  const filteredCount = allRawIdeas.length - filteredIdeas.length

  // Convert RawIdea → Idea with categorization and unique IDs
  const ideas: Idea[] = filteredIdeas.map((raw, index) => {
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
    totalFetched: allRawIdeas.length,
    filteredCount,
    byPlatform,
    collectionsFormed: 0,
    errors,
  }

  return { ideas, stats }
}
