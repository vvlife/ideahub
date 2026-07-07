import { NextResponse } from 'next/server'
import { triggerCrawl } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const result = await triggerCrawl()
    return NextResponse.json({
      message: result.response.message,
      crawledAt: result.response.crawledAt,
      newItems: result.response.newItems,
      stats: result.response.stats,
      ideas: result.ideas,
      collections: result.collections,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    available: true,
    message: 'RSS feed crawler is built-in, no external server needed',
  })
}
