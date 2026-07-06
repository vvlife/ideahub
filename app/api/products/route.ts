import { NextRequest, NextResponse } from 'next/server'
import { getAllProducts, addProduct } from '@/lib/remote-store'
import type { Product } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/products — 获取所有产品
export async function GET() {
  try {
    const products = await getAllProducts()
    return NextResponse.json({ products, total: products.length })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST /api/products — 创建产品
export async function POST(req: NextRequest) {
  try {
    const product: Product = await req.json()
    if (!product.id || !product.name) {
      return NextResponse.json(
        { error: 'id and name are required' },
        { status: 400 }
      )
    }
    const success = await addProduct(product)
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to save product' },
        { status: 500 }
      )
    }
    return NextResponse.json({ success: true, product })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
