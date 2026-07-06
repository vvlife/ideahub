import type { Idea, Collection, Category, FeedResponse, CollectionsResponse, SearchResponse, CollectionResult, CrawlResponse } from './types'
import { loadData, saveData, deduplicateIdeas, getInMemoryData } from './storage'
import { crawlAll } from './crawlers'
import { clusterIdeas } from './cluster'

// ── Get current data (async, reads from storage) ───────────────
async function getData() {
  return await loadData()
}

// ── Feed ───────────────────────────────────────────────────────
export async function getFeed(category?: Category | 'all'): Promise<FeedResponse> {
  const data = await getData()
  let filtered = data.ideas
  if (category && category !== 'all') {
    filtered = filtered.filter(i => i.category === category)
  }
  // Sort by publishedAt descending
  const sorted = [...filtered].sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )
  return {
    ideas: sorted,
    collections: data.collections,
    total: sorted.length,
  }
}

// ── Collections ────────────────────────────────────────────────
export async function getCollections(category?: Category | 'all'): Promise<CollectionsResponse> {
  const data = await getData()
  let filtered = data.collections
  if (category && category !== 'all') {
    filtered = filtered.filter(c => c.category === category)
  }
  return {
    collections: filtered,
    total: filtered.length,
  }
}

export async function getCollectionById(id: string): Promise<{ collection: Collection; ideas: Idea[] } | null> {
  const data = await getData()
  const collection = data.collections.find(c => c.id === id)
  if (!collection) return null
  const collectionIdeas = data.ideas.filter(i => i.collectionId === id)
  return { collection, ideas: collectionIdeas }
}

// ── Search ─────────────────────────────────────────────────────
export async function search(query: string): Promise<SearchResponse> {
  const data = await getData()
  const q = query.toLowerCase().trim()
  if (!q) return { results: [], total: 0 }

  const matchedIdeas = data.ideas.filter(i =>
    i.title.toLowerCase().includes(q) ||
    i.description.toLowerCase().includes(q) ||
    i.category.toLowerCase().includes(q)
  )

  const matchedCollections = data.collections.filter(c =>
    c.title.toLowerCase().includes(q) ||
    c.summary.toLowerCase().includes(q) ||
    c.category.toLowerCase().includes(q)
  )

  const collectionResults: CollectionResult[] = matchedCollections.map(c => ({
    type: 'collection' as const,
    id: c.id,
    title: c.title,
    summary: c.summary,
    category: c.category,
    ideaCount: c.ideaIds.length,
  }))

  // Merge and sort by heat
  const allResults = [
    ...matchedIdeas.map(i => ({ type: 'idea' as const, ...i })),
    ...collectionResults,
  ].sort((a: any, b: any) => (b.heat ?? 0) - (a.heat ?? 0))

  return {
    results: allResults,
    total: allResults.length,
  }
}

// ── Crawl: trigger real data collection ────────────────────────
export async function triggerCrawl(): Promise<CrawlResponse> {
  try {
    const data = await getData()
    
    // Run all crawlers
    const { ideas: newRawIdeas, stats } = await crawlAll()
    
    // Convert to Idea[] format (they already have ids and categories from crawlAll)
    const newIdeas: Idea[] = newRawIdeas
    
    // Deduplicate against existing data
    const uniqueNew = deduplicateIdeas(data.ideas, newIdeas)
    
    // Merge: keep existing + add new
    const allIdeas = [...data.ideas, ...uniqueNew]
    
    // Cluster: re-cluster all ideas
    const { ideas: clusteredIdeas, collections: newCollections } = clusterIdeas(allIdeas, 0.4)
    
    // Save
    const crawledAt = new Date().toISOString()
    await saveData(clusteredIdeas, newCollections, crawledAt)
    
    stats.collectionsFormed = newCollections.length
    
    return {
      success: true,
      message: `Crawled ${stats.totalFetched} items from ${Object.keys(stats.byPlatform).length} platforms. ${uniqueNew.length} new items added. ${stats.errors.length} errors.`,
      crawledAt,
      newItems: uniqueNew.length,
      stats,
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Crawl failed: ${error?.message || 'unknown error'}`,
      crawledAt: new Date().toISOString(),
      newItems: 0,
    }
  }
}

// ── Get last crawl time ────────────────────────────────────────
export async function getLastCrawlTime(): Promise<string | null> {
  const data = await getData()
  return data.lastCrawlAt
}

// ── Helpers ────────────────────────────────────────────────────
export async function getIdeaById(id: string): Promise<Idea | undefined> {
  const data = await getData()
  return data.ideas.find(i => i.id === id)
}

export async function getRelatedIdeas(category: Category, excludeId?: string, limit = 5): Promise<Idea[]> {
  const data = await getData()
  return data.ideas
    .filter(i => i.category === category && i.id !== excludeId)
    .sort((a, b) => b.heat - a.heat)
    .slice(0, limit)
}
