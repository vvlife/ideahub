'use client'

import { useState, useEffect } from 'react'
import { platformMeta } from '@/lib/data'
import type { Idea, Product } from '@/lib/types'
import AnalysisModal from './AnalysisModal'

function formatTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}天前`
  if (hours > 0) return `${hours}小时前`
  const minutes = Math.floor(diff / (1000 * 60))
  if (minutes > 0) return `${minutes}分钟前`
  return '刚刚'
}

interface IdeaCardProps {
  idea: Idea
}

export default function IdeaCard({ idea }: IdeaCardProps) {
  const meta = platformMeta[idea.platform] || platformMeta.other
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [productCount, setProductCount] = useState(0)
  const [firstProduct, setFirstProduct] = useState<Product | null>(null)

  useEffect(() => {
    let cancelled = false
    const loadProducts = async () => {
      try {
        const resp = await fetch(`/api/products/${idea.id}?type=idea`, { cache: 'no-store' })
        if (resp.ok) {
          const data = await resp.json()
          if (!cancelled) {
            const products: Product[] = data.products || []
            setProductCount(products.length)
            setFirstProduct(products[0] || null)
          }
        }
      } catch {}
    }
    loadProducts()
    return () => { cancelled = true }
  }, [idea.id, showAnalysis])

  const handleGenerate = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowAnalysis(true)
  }

  const handleProductCreated = (product: Product) => {
    setProductCount(prev => prev + 1)
    setFirstProduct(product)
  }

  return (
    <>
      <div className="block py-4 group">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <a
              href={idea.sourceUrl || '#'}
              target={idea.sourceUrl ? '_blank' : undefined}
              rel={idea.sourceUrl ? 'noopener noreferrer' : undefined}
            >
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition leading-snug">
                {idea.title}
              </h3>
            </a>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
              {idea.description}
            </p>

            <div className="mt-2 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${meta.bgClass} ${meta.textClass}`}>
                {meta.label}
              </span>
              {idea.author && (
                <span className="text-blue-500 dark:text-blue-400">by {idea.author}</span>
              )}
              <span>{formatTime(idea.publishedAt)}</span>
              <span className="flex items-center gap-0.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l4-4z" />
                </svg>
                {idea.heat}
              </span>
            </div>
          </div>

          {/* 右侧操作区 */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <button
              onClick={handleGenerate}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:opacity-90 transition shadow-sm"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>生成点子</span>
            </button>

            {productCount > 0 && firstProduct && (
              productCount === 1 ? (
                <a
                  href={`/product/${firstProduct.id}`}
                  className="text-xs text-green-600 dark:text-green-400 hover:underline"
                >
                  → {firstProduct.name}
                </a>
              ) : (
                <a
                  href={`/idea/${idea.id}/products`}
                  className="text-xs text-green-600 dark:text-green-400 hover:underline"
                >
                  → {productCount} 个产品方案
                </a>
              )
            )}
          </div>
        </div>
      </div>

      {showAnalysis && (
        <AnalysisModal
          idea={idea}
          autoStart
          onClose={() => setShowAnalysis(false)}
          onProductCreated={handleProductCreated}
        />
      )}
    </>
  )
}
