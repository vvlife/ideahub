import { NextRequest, NextResponse } from 'next/server'
import { addProduct } from '@/lib/remote-store'
import type { Product } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface ImportRequest {
  url: string
  name?: string
  tagline?: string
  userId?: string
}

export async function POST(req: NextRequest) {
  try {
    const { url, name, tagline } = (await req.json()) as ImportRequest

    if (!url || !url.trim()) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    // Validate URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url.trim())
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    if (!parsedUrl.protocol.startsWith('http')) {
      return NextResponse.json({ error: 'URL must be HTTP/HTTPS' }, { status: 400 })
    }

    // Fetch the page
    const resp = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    })

    if (!resp.ok) {
      return NextResponse.json({ error: `Failed to fetch URL: ${resp.status}` }, { status: 502 })
    }

    const contentType = resp.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return NextResponse.json({ error: 'URL must return HTML content' }, { status: 400 })
    }

    let html = await resp.text()
    html = html.trim()

    if (!html || html.length < 100) {
      return NextResponse.json({ error: 'Page content too short' }, { status: 400 })
    }

    // Extract title from HTML
    let extractedName = name || ''
    let extractedTagline = tagline || ''

    if (!extractedName) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      if (titleMatch) {
        extractedName = titleMatch[1].trim().slice(0, 30)
      }
    }

    if (!extractedTagline) {
      const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
      if (metaDesc) {
        extractedTagline = metaDesc[1].trim().slice(0, 50)
      }
    }

    if (!extractedName) {
      extractedName = parsedUrl.hostname.replace('www.', '').split('.')[0]
      extractedName = extractedName.charAt(0).toUpperCase() + extractedName.slice(1)
    }

    if (!extractedTagline) {
      extractedTagline = `来自 ${parsedUrl.hostname} 的网页游戏`
    }

    // Save as product
    const productId = `prod_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
    const now = new Date().toISOString()

    const product: Product = {
      id: productId,
      ideaId: `idea_imported_${productId}`,
      ideaTitle: `导入自 ${parsedUrl.hostname}`,
      name: extractedName,
      tagline: extractedTagline,
      problem: '网页游戏导入',
      solution: extractedTagline,
      targetUsers: '所有喜欢网页游戏的用户',
      coreFeatures: ['导入游戏'],
      techStack: ['HTML', 'CSS', 'JavaScript'],
      monetization: '',
      competitors: '',
      differentiator: '导入的游戏',
      mvp: '可直接试玩',
      createdAt: now,
      status: 'confirmed',
      generatedHtml: html,
      versions: [{ id: `v1_${Date.now()}`, version: 1, html, createdAt: now }],
      currentVersion: 1,
      votes: 0,
      votedBy: [],
      clonedFrom: parsedUrl.toString(),
    }

    const saved = await addProduct(product)
    if (!saved) {
      return NextResponse.json({ error: 'Failed to save product' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      product,
      productId,
      html,
    })
  } catch (error) {
    console.error('Import URL API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
