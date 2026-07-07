import type { RawIdea } from './types'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
}

const RSS_FEEDS: Record<string, string> = {
  '36Kr': 'https://36kr.com/feed',
  'SSPAI': 'https://sspai.com/feed',
  'Zhihu': 'https://rsshub.app/zhihu/hot',
  'V2EX': 'https://www.v2ex.com/index.xml',
  'GitHubTrending': 'https://rsshub.app/github/trending/daily/all',
  'Juejin': 'https://rsshub.app/juejin/trending/all/1',
}

function parseRSS(xml: string): RawIdea[] {
  const items: RawIdea[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi

  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const title = extractTag(block, 'title')
    const link = extractTag(block, 'link')
    const desc = extractTag(block, 'description')
    const pubDate = extractTag(block, 'pubDate')
    if (title) {
      items.push({
        title: cleanHTML(title),
        description: cleanHTML(desc || title).slice(0, 200),
        platform: 'other',
        sourceUrl: link,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        heat: 0,
      })
    }
  }

  if (items.length === 0) {
    while ((match = entryRegex.exec(xml)) !== null) {
      const block = match[1]
      const title = extractTag(block, 'title')
      const link = extractLinkHref(block)
      const summary = extractTag(block, 'summary') || extractTag(block, 'content')
      const updated = extractTag(block, 'updated')
      if (title) {
        items.push({
          title: cleanHTML(title),
          description: cleanHTML(summary || title).slice(0, 200),
          platform: 'other',
          sourceUrl: link,
          publishedAt: updated ? new Date(updated).toISOString() : new Date().toISOString(),
          heat: 0,
        })
      }
    }
  }

  return items.slice(0, 20)
}

function extractTag(block: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?</${tag}>`, 's')
  const m = block.match(regex)
  return m ? m[1].trim() : ''
}

function extractLinkHref(block: string): string {
  const m = block.match(/<link[^>]*href="([^"]+)"/)
  return m ? m[1] : extractTag(block, 'link')
}

function cleanHTML(text: string): string {
  // Decode HTML entities first
  let result = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  // Remove HTML tags
  result = result.replace(/<[^>]*>/g, '')
  // Clean up whitespace
  result = result.replace(/\s+/g, ' ').trim()
  return result
}

async function fetchFeed(name: string, url: string): Promise<RawIdea[]> {
  try {
    const resp = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 3600 },
    })
    if (!resp.ok) return []
    const text = await resp.text()
    return parseRSS(text)
  } catch {
    return []
  }
}

export async function crawlAllFeeds(): Promise<RawIdea[]> {
  const results = await Promise.allSettled(
    Object.entries(RSS_FEEDS).map(([name, url]) => fetchFeed(name, url))
  )

  const seen = new Set<string>()
  const all: RawIdea[] = []

  for (const r of results) {
    if (r.status !== 'fulfilled') continue
    for (const item of r.value) {
      const key = item.title.toLowerCase().trim()
      if (!seen.has(key)) {
        seen.add(key)
        all.push(item)
      }
    }
  }

  return all
}
