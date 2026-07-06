import type { Idea, Collection, StorageData } from './types'

// ── In-memory storage (works on Vercel serverless) ─────────────
let _storage: StorageData = {
  ideas: [],
  collections: [],
  lastCrawlAt: null,
}

// ── Try to read from /tmp (works on Vercel) ────────────────────
const TMP_IDEAS = '/tmp/ideahub_ideas.json'
const TMP_COLLECTIONS = '/tmp/ideahub_collections.json'
const TMP_META = '/tmp/ideahub_meta.json'

import { promises as fs } from 'fs'

export async function loadData(): Promise<StorageData> {
  try {
    const [ideasData, collectionsData, metaData] = await Promise.all([
      fs.readFile(TMP_IDEAS, 'utf-8').catch(() => null),
      fs.readFile(TMP_COLLECTIONS, 'utf-8').catch(() => null),
      fs.readFile(TMP_META, 'utf-8').catch(() => null),
    ])
    
    if (ideasData && collectionsData) {
      _storage.ideas = JSON.parse(ideasData)
      _storage.collections = JSON.parse(collectionsData)
      _storage.lastCrawlAt = metaData ? JSON.parse(metaData).lastCrawlAt : null
    }
  } catch {
    // Use in-memory data
  }
  
  return _storage
}

export async function saveData(ideas: Idea[], collections: Collection[], lastCrawlAt: string): Promise<void> {
  _storage.ideas = ideas
  _storage.collections = collections
  _storage.lastCrawlAt = lastCrawlAt
  
  try {
    await Promise.all([
      fs.writeFile(TMP_IDEAS, JSON.stringify(ideas, null, 2)),
      fs.writeFile(TMP_COLLECTIONS, JSON.stringify(collections, null, 2)),
      fs.writeFile(TMP_META, JSON.stringify({ lastCrawlAt })),
    ])
  } catch {
    // If file system is not writable, in-memory is still updated
  }
}

export function getInMemoryData(): StorageData {
  return _storage
}

export function getLastCrawlAt(): string | null {
  return _storage.lastCrawlAt
}

// ── Deduplicate ideas by sourceUrl and title similarity ────────
export function deduplicateIdeas(existing: Idea[], incoming: Idea[]): Idea[] {
  const existingUrls = new Set(existing.map(i => i.sourceUrl))
  const existingTitles = new Set(existing.map(i => i.title.toLowerCase().trim()))
  
  return incoming.filter(idea => {
    const url = idea.sourceUrl
    const title = idea.title.toLowerCase().trim()
    
    // Deduplicate by URL
    if (existingUrls.has(url)) return false
    
    // Deduplicate by exact title match
    if (existingTitles.has(title)) return false
    
    return true
  })
}
