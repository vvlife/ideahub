import type { Idea, Collection, CrawlResponse, CrawlStats, FeedResponse } from './types'
import { crawlAll } from './crawlers'
import { clusterIdeas } from './cluster'
import { isAgentlyAvailable, searchAgently } from './agently-client'

// ── In-memory cache (per serverless instance) ─────────────────
let _ideas: Idea[] = []
let _collections: Collection[] = []
let _lastCrawlAt: string | null = null

// ── Trigger crawl: returns full data ──────────────────────────
export async function triggerCrawl(): Promise<{
  ideas: Idea[]
  collections: Collection[]
  response: CrawlResponse
}> {
  const { ideas: newIdeas, stats } = await crawlAll()

  // Merge with existing (dedup by sourceUrl + title)
  const existingUrls = new Set(_ideas.map(i => i.sourceUrl))
  const existingTitles = new Set(_ideas.map(i => i.title.toLowerCase().trim()))
  const uniqueNew = newIdeas.filter(i =>
    !existingUrls.has(i.sourceUrl) &&
    !existingTitles.has(i.title.toLowerCase().trim())
  )

  const allIdeas = [..._ideas, ...uniqueNew]
  const { ideas: clusteredIdeas, collections: newCollections } = clusterIdeas(allIdeas, 0.4)

  // Update cache
  _ideas = clusteredIdeas
  _collections = newCollections
  const crawledAt = new Date().toISOString()
  _lastCrawlAt = crawledAt

  stats.collectionsFormed = newCollections.length

  return {
    ideas: clusteredIdeas,
    collections: newCollections,
    response: {
      success: true,
      message: `Crawled ${stats.totalFetched} items. ${uniqueNew.length} new. ${stats.errors.length} errors.`,
      crawledAt,
      newItems: uniqueNew.length,
      stats,
    },
  }
}

// ── Get current cached data ───────────────────────────────────
export async function getFeed(category?: string): Promise<FeedResponse> {
  let filtered = _ideas
  if (category && category !== 'all') {
    filtered = filtered.filter(i => i.category === category)
  }
  const sorted = [...filtered].sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )
  return { ideas: sorted, collections: _collections, total: sorted.length }
}

export async function getCollections(category?: string) {
  let filtered = _collections
  if (category && category !== 'all') {
    filtered = filtered.filter(c => c.category === category)
  }
  return { collections: filtered, total: filtered.length }
}

export async function getCollectionById(id: string) {
  const collection = _collections.find(c => c.id === id)
  if (!collection) return null
  return {
    collection,
    ideas: _ideas.filter(i => i.collectionId === id),
  }
}

export async function search(query: string) {
  const q = query.toLowerCase().trim()
  if (!q) return { results: [], total: 0 }

  // 1. Local search (in-memory)
  const matchedIdeas = _ideas.filter(i =>
    i.title.toLowerCase().includes(q) ||
    i.description.toLowerCase().includes(q)
  )
  const matchedCollections = _collections.filter(c =>
    c.title.toLowerCase().includes(q) ||
    c.summary.toLowerCase().includes(q)
  )

  const localResults = [
    ...matchedIdeas.map(i => ({ type: 'idea' as const, ...i })),
    ...matchedCollections.map(c => ({
      type: 'collection' as const,
      id: c.id, title: c.title, summary: c.summary,
      category: c.category, ideaCount: c.ideaIds.length,
    })),
  ].sort((a: any, b: any) => (b.heat ?? 0) - (a.heat ?? 0))

  // 2. Agently search (web search) if local results are sparse
  if (localResults.length < 3 && (await isAgentlyAvailable())) {
    try {
      const agentlyResult = await searchAgently(query, 8, 'w')
      if (agentlyResult.success && agentlyResult.ideas) {
        const agentlyIdeas = agentlyResult.ideas.map((item, idx) => ({
          type: 'idea' as const,
          id: `agently_search_${Date.now()}_${idx}`,
          title: item.title,
          description: item.description,
          platform: 'other' as const,
          sourceUrl: item.sourceUrl || '',
          publishedAt: item.publishedAt || new Date().toISOString(),
          heat: 0,
          category: '其他' as const,
        }))
        // Merge: local first, then Agently results (dedup by title)
        const seenTitles = new Set(localResults.map((r: any) => r.title?.toLowerCase()))
        const uniqueAgently = agentlyIdeas.filter(a => !seenTitles.has(a.title?.toLowerCase()))
        localResults.push(...uniqueAgently)
      }
    } catch (e) {
      console.error('Agently search failed:', e)
    }
  }

  return { results: localResults, total: localResults.length }
}

export function getLastCrawlTime() { return _lastCrawlAt }

export async function getIdeaById(id: string) {
  return _ideas.find(i => i.id === id)
}

export async function getRelatedIdeas(category: string, excludeId?: string, limit = 5) {
  return _ideas
    .filter(i => i.category === category && i.id !== excludeId)
    .sort((a, b) => b.heat - a.heat)
    .slice(0, limit)
}
