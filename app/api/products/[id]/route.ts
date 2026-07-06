import { NextRequest, NextResponse } from 'next/server'
import { getProduct, deleteProduct, getProductsByIdea } from '@/lib/remote-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/products/[id] — 获取单个产品或按 ideaId 查询
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id

    // 支持 ?type=idea 查询某 idea 的所有产品
    const url = new URL(req.url)
    const type = url.searchParams.get('type')

    if (type === 'idea') {
      const products = await getProductsByIdea(id)
      return NextResponse.json({ products, total: products.length })
    }

    const product = await getProduct(id)
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    return NextResponse.json({ product })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id] — 删除产品
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = await deleteProduct(params.id)
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete product' },
        { status: 500 }
      )
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
