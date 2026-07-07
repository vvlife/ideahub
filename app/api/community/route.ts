import { NextRequest, NextResponse } from 'next/server'
import { getAllProducts } from '@/lib/remote-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const products = await getAllProducts()

    // 只展示有 HTML 的产品（已生成的）
    const communityProducts = products
      .filter(p => p.generatedHtml || (p.versions && p.versions.length > 0))
      .map((p, index) => ({
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        ideaTitle: p.ideaTitle,
        createdAt: p.createdAt,
        votes: p.votes || 0,
        votedBy: p.votedBy || [],
        rank: index + 1,
      }))
      .sort((a, b) => b.votes - a.votes || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((p, index) => ({ ...p, rank: index + 1 }))

    return NextResponse.json({ products: communityProducts })
  } catch (error) {
    console.error('Community API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
