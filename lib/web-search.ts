/**
 * Web search via Google News RSS (works from Vercel)
 */

interface SearchResult {
  title: string
  description: string
  url: string
}

function parseRSS(xml: string): SearchResult[] {
  const items: SearchResult[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
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
        url: link,
      })
    }
  }
  return items
}

function extractTag(block: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?</${tag}>`, 's')
  const m = block.match(regex)
  return m ? m[1].trim() : ''
}

function cleanHTML(text: string): string {
  return text.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim()
}

export async function webSearch(query: string, maxResults: number = 10): Promise<SearchResult[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
    })
    if (!resp.ok) return []
    const xml = await resp.text()
    return parseRSS(xml).slice(0, maxResults)
  } catch {
    return []
  }
}
