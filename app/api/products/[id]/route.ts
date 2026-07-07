import { NextRequest, NextResponse } from 'next/server'
import { getProduct, deleteProduct, getProductsByIdea, updateProductHtml, setCurrentVersion, updateProductDeployUrl } from '@/lib/remote-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/products/[id] — 获取单个产品或按 ideaId 查询
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

// PATCH /api/products/[id] — 异步写回生成的产品 HTML
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { generatedHtml, currentVersion, deployUrl } = body

    if (typeof currentVersion === 'number') {
      const ok = await setCurrentVersion(id, currentVersion)
      if (!ok) {
        return NextResponse.json(
          { error: 'Product not found or version not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({ success: true, currentVersion })
    }

    if (typeof deployUrl === 'string') {
      const ok = await updateProductDeployUrl(id, deployUrl)
      if (!ok) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({ success: true, deployUrl })
    }

    if (typeof generatedHtml !== 'string') {
      return NextResponse.json(
        { error: 'generatedHtml (string) or currentVersion (number) is required' },
        { status: 400 }
      )
    }
    const success = await updateProductHtml(id, generatedHtml)
    if (!success) {
      return NextResponse.json(
        { error: 'Product not found or update failed' },
        { status: 404 }
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

// DELETE /api/products/[id] — 删除产品
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const success = await deleteProduct(id)
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
