'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { Product } from '@/lib/types'

export default function IdeaProductsPage() {
  const params = useParams()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ideaId = params.id as string
    const loadProducts = async () => {
      try {
        const resp = await fetch(`/api/products/${ideaId}?type=idea`, { cache: 'no-store' })
        if (resp.ok) {
          const data = await resp.json()
          setProducts(data.products || [])
        }
      } catch {} finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [params.id])

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300 dark:border-gray-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          产品方案列表
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          基于该需求生成的 {products.length} 个产品方案
        </p>
      </div>

      {products.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl mb-4">📦</p>
          <p className="text-gray-500 dark:text-gray-400">
            暂无产品方案
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map(p => (
            <Link
              key={p.id}
              href={`/product/${p.id}`}
              className="block p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    {p.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {p.tagline}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.coreFeatures.slice(0, 3).map((f, i) => (
                      <span key={i} className="px-2 py-0.5 text-[11px] rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                  {new Date(p.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
