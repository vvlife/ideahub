import { NextResponse } from 'next/server'
import { triggerCrawl, getLastCrawlTime } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function POST() {
  const result = await triggerCrawl()
  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}

export async function GET() {
  const lastCrawlAt = await getLastCrawlTime()
  return NextResponse.json({
    success: true,
    lastCrawlAt,
    message: lastCrawlAt
      ? `Last crawl was at ${lastCrawlAt}`
      : 'No crawl has been performed yet.',
  })
}
