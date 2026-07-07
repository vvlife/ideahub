import type { RawIdea, Idea, CrawlStats } from '../types'
import { categorize } from '../categorize'
import { filterAds } from '../filter'
import { isAgentlyAvailable, collectScheduled } from '../agently-client'
import { getEnabledTopics } from '../topics'
import { crawlV2EX } from './v2ex'
import { crawlHackerNews } from './hackernews'
import { crawlProductHunt } from './producthunt'
import { crawlReddit } from './reddit'
import { crawlWeibo } from './weibo'
import { crawlZhihu } from './zhihu'
import { crawlGitHubTrending } from './github-trending'
import { crawlGitHubIssues } from './github-issues'
import { crawl36kr } from './36kr'
import { crawlDevto } from './devto'
import { crawlIndieHackers } from './indiehackers'
import { crawlSSPAI } from './sspai'
import { crawlTwitter } from './twitter'
import { crawlXiaohongshu } from './xiaohongshu'
import { crawlAppStoreReviews } from './appstore'
import { crawlPHComments } from './ph-comments'

export interface CrawlResult {
  ideas: Idea[]
  stats: CrawlStats
}

// ── Agently-based collection (primary) ────────────────────────
async function crawlAgently(): Promise<RawIdea[]> {
  if (!(await isAgentlyAvailable())) {
    return []
  }

  const topics = getEnabledTopics()
  if (topics.length === 0) return []

  // Collect all topics in one scheduled call
  const topicNames = topics.map(t => t.name)
  const response = await collectScheduled(topicNames)

  if (!response.success || !response.ideas) return []

  // Map Agently results to RawIdea format
  return response.ideas.map(item => ({
    title: item.title,
    description: item.description,
    platform: 'other' as const,
    sourceUrl: item.sourceUrl || '',
    publishedAt: item.publishedAt || new Date().toISOString(),
    heat: item.heat || 0,
  }))
}

// ── Legacy crawlers (fallback) ────────────────────────────────
async function crawlLegacy(): Promise<{ ideas: RawIdea[]; byPlatform: Record<string, number>; errors: string[] }> {
  const crawlers: Array<{ name: string; fn: () => Promise<RawIdea[]> }> = [
    { name: 'Twitter', fn: crawlTwitter },
    { name: '小红书', fn: crawlXiaohongshu },
    { name: 'AppStore', fn: crawlAppStoreReviews },
    { name: 'PH评论', fn: crawlPHComments },
    { name: 'GitHub需求', fn: crawlGitHubIssues },
    { name: 'V2EX', fn: crawlV2EX },
    { name: 'HackerNews', fn: crawlHackerNews },
    { name: 'ProductHunt', fn: crawlProductHunt },
    { name: 'Reddit', fn: crawlReddit },
    { name: 'GitHub Trending', fn: crawlGitHubTrending },
    { name: 'Dev.to', fn: crawlDevto },
    { name: 'IndieHackers', fn: crawlIndieHackers },
    { name: '36Kr', fn: crawl36kr },
    { name: 'SSPAI', fn: crawlSSPAI },
    { name: 'Weibo', fn: crawlWeibo },
    { name: 'Zhihu', fn: crawlZhihu },
  ]

  const results = await Promise.allSettled(crawlers.map(c => c.fn()))

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

  return { ideas: allRawIdeas, byPlatform, errors }
}

// ── Main crawl function: Agently primary + legacy fallback ────
export async function crawlAll(): Promise<CrawlResult> {
  const errors: string[] = []
  const byPlatform: Record<string, number> = {}
  let allRawIdeas: RawIdea[] = []

  // 1. Try Agently-based collection first
  try {
    const agentlyIdeas = await crawlAgently()
    if (agentlyIdeas.length > 0) {
      byPlatform['Agently'] = agentlyIdeas.length
      allRawIdeas.push(...agentlyIdeas)
    }
  } catch (e: any) {
    errors.push(`Agently: ${e?.message || 'unknown error'}`)
  }

  // 2. Fallback to legacy crawlers if Agently didn't return results
  if (allRawIdeas.length === 0) {
    try {
      const legacy = await crawlLegacy()
      allRawIdeas = legacy.ideas
      Object.assign(byPlatform, legacy.byPlatform)
      errors.push(...legacy.errors)
    } catch (e: any) {
      errors.push(`Legacy crawlers: ${e?.message || 'unknown error'}`)
    }
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
