import { NextRequest, NextResponse } from 'next/server'
import { getProduct } from '@/lib/remote-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 简单的内存投票存储（Vercel serverless 不持久化，但足够演示）
const votesStore = new Map<string, { votes: number; votedBy: string[] }>()

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const product = await getProduct(params.id)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // 获取当前投票状态
    const current = votesStore.get(params.id) || {
      votes: product.votes || 0,
      votedBy: product.votedBy || [],
    }

    const hasVoted = current.votedBy.includes(userId)
    if (hasVoted) {
      // 取消投票
      current.votes = Math.max(0, current.votes - 1)
      current.votedBy = current.votedBy.filter(id => id !== userId)
    } else {
      // 增加投票
      current.votes += 1
      current.votedBy.push(userId)
    }

    votesStore.set(params.id, current)

    // 同步到产品存储
    const { promises: fs } = await import('fs')
    const path = await import('path')
    const LOCAL_STORE_PATH = path.join(process.cwd(), '.data', 'store.json')

    try {
      const raw = await fs.readFile(LOCAL_STORE_PATH, 'utf-8')
      const store = JSON.parse(raw)
      const p = store.products?.find((x: any) => x.id === params.id)
      if (p) {
        p.votes = current.votes
        p.votedBy = current.votedBy
        await fs.writeFile(LOCAL_STORE_PATH, JSON.stringify(store, null, 2), 'utf-8')
      }
    } catch {}

    return NextResponse.json({
      success: true,
      votes: current.votes,
      hasVoted: !hasVoted,
    })
  } catch (error) {
    console.error('Vote error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
