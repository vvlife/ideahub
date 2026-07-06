import { NextResponse } from 'next/server'
import { getFeed } from '@/lib/store'
import type { Category } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = (searchParams.get('category') || 'all') as Category | 'all'

  const feed = await getFeed(category)
  return NextResponse.json(feed)
}
