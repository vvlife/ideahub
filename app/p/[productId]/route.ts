import { NextRequest } from 'next/server'
import { getProduct } from '@/lib/remote-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params
  const product = await getProduct(productId)
  if (!product) {
    return new Response('Product not found', { status: 404 })
  }

  let html = product.generatedHtml || ''
  if (!html && product.versions?.length) {
    const v = product.currentVersion
      ? product.versions.find(x => x.version === product.currentVersion)
      : product.versions[product.versions.length - 1]
    html = v?.html || ''
  }

  if (!html) {
    return new Response('No HTML available for this product', { status: 404 })
  }

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  })
}
