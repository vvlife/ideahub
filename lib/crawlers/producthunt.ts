import type { RawIdea, Platform } from '../types'

// ── Product Hunt RSS feed ──────────────────────────────────────
export async function crawlProductHunt(): Promise<RawIdea[]> {
  const resp = await fetch('https://www.producthunt.com/feed', {
    headers: {
      'User-Agent': 'IdeaHub/1.0 (https://ideahub.vercel.app)',
    },
    signal: AbortSignal.timeout(10000),
  })
  
  if (!resp.ok) throw new Error(`ProductHunt feed returned ${resp.status}`)
  
  const xml = await resp.text()
  const results: RawIdea[] = []
  
  // Parse RSS XML (simple regex parsing since we don't want extra dependencies)
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || []
  
  for (const itemXml of items.slice(0, 20)) {
    const titleMatch = itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
                       itemXml.match(/<title>([\s\S]*?)<\/title>/)
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/)
    const descMatch = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ||
                      itemXml.match(/<description>([\s\S]*?)<\/description>/)
    const dateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)
    
    if (!titleMatch) continue
    
    const title = titleMatch[1].trim()
    const link = linkMatch ? linkMatch[1].trim() : ''
    const description = descMatch
      ? descMatch[1].replace(/<[^>]*>/g, '').trim().slice(0, 200)
      : title
    const pubDate = dateMatch ? new Date(dateMatch[1].trim()).toISOString() : new Date().toISOString()
    
    // ProductHunt posts are inherently product launches / ideas
    results.push({
      title,
      description: description || title,
      platform: 'producthunt' as Platform,
      sourceUrl: link || 'https://www.producthunt.com',
      publishedAt: pubDate,
      heat: 0,
    })
  }
  
  return results
}
