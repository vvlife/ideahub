import type { RawIdea } from './types'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
}

const RSS_FEEDS: Record<string, string> = {
  'HackerNews': 'https://hnrss.org/newest?points=50',
  'ProductHunt': 'https://www.producthunt.com/feed',
  'Reddit_SideProject': 'https://www.reddit.com/r/SideProject/.rss',
  'Reddit_Startups': 'https://www.reddit.com/r/startups/.rss',
  'DevTo': 'https://dev.to/feed',
  'IndieHackers': 'https://www.indiehackers.com/feed',
  'GitHubTrending': 'https://rsshub.app/github/trending/daily/all',
  '36Kr': 'https://36kr.com/feed',
  'SSPAI': 'https://sspai.com/feed',
  'Zhihu': 'https://rsshub.app/zhihu/hot',
}

function parseRSS(xml: string, source: string): RawIdea[] {
  const items: RawIdea[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi

  // RSS 2.0
  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const title = extractTag(block, 'title')
    const link = extractTag(block, 'link')
    const desc = extractTag(block, 'description')
    if (title) {
      items.push({
        title: cleanHTML(title),
        description: cleanHTML(desc || title).slice(0, 200),
        platform: 'other',
        sourceUrl: link,
        publishedAt: new Date().toISOString(),
        heat: 0,
      })
    }
  }

  // Atom
  if (items.length === 0) {
    while ((match = entryRegex.exec(xml)) !== null) {
      const block = match[1]
      const title = extractTag(block, 'title')
      const link = extractLinkHref(block)
      const summary = extractTag(block, 'summary') || extractTag(block, 'content')
      if (title) {
        items.push({
          title: cleanHTML(title),
          description: cleanHTML(summary || title).slice(0, 200),
          platform: 'other',
          sourceUrl: link,
          publishedAt: new Date().toISOString(),
          heat: 0,
        })
      }
    }
  }

  return items.slice(0, 15)
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
  return text.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim()
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
    return parseRSS(text, name)
  } catch {
    return []
  }
}

async function fetchHackerNewsAPI(): Promise<RawIdea[]> {
  try {
    const resp = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 300 },
    })
    if (!resp.ok) return []
    const ids: number[] = await resp.json()
    const top = ids.slice(0, 15)

    const stories = await Promise.all(
      top.map(id =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
          signal: AbortSignal.timeout(5000),
        }).then(r => r.json()).catch(() => null)
      )
    )

    return stories
      .filter((s: any) => s?.title)
      .map((s: any) => ({
        title: s.title,
        description: (s.text || s.title).slice(0, 200),
        platform: 'other' as const,
        sourceUrl: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
        publishedAt: new Date((s.time || 0) * 1000).toISOString(),
        heat: s.score || 0,
      }))
  } catch {
    return []
  }
}

async function fetchGitHubTrending(): Promise<RawIdea[]> {
  try {
    const resp = await fetch(
      'https://api.github.com/search/repositories?q=created:>2026-07-01&sort=stars&order=desc&per_page=15',
      { signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } }
    )
    if (!resp.ok) return []
    const data = await resp.json()
    return (data.items || []).slice(0, 15).map((r: any) => ({
      title: `${r.full_name}: ${(r.description || '').slice(0, 80)}`,
      description: (r.description || '').slice(0, 200),
      platform: 'other' as const,
      sourceUrl: r.html_url,
      publishedAt: r.created_at || '',
      heat: r.stargazers_count || 0,
    }))
  } catch {
    return []
  }
}

export async function crawlAllFeeds(): Promise<RawIdea[]> {
  const results = await Promise.allSettled([
    fetchHackerNewsAPI(),
    fetchGitHubTrending(),
    ...Object.entries(RSS_FEEDS).map(([name, url]) => fetchFeed(name, url)),
  ])

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
