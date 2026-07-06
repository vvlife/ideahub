'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Product } from '@/lib/types'

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const id = params.id as string
    const loadProduct = async () => {
      try {
        const resp = await fetch(`/api/products/${id}`, { cache: 'no-store' })
        if (resp.ok) {
          const data = await resp.json()
          setProduct(data.product || null)
        }
      } catch {} finally {
        setLoading(false)
      }
    }
    loadProduct()
  }, [params.id])

  const handleDelete = async () => {
    if (!product) return
    if (!confirm(`确定要删除产品「${product.name}」吗？`)) return
    setDeleting(true)
    try {
      await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
      router.push('/')
    } catch {} finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300 dark:border-gray-600"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="py-20 text-center">
        <p className="text-4xl mb-4">📦</p>
        <p className="text-gray-500 dark:text-gray-400 mb-2">产品不存在</p>
        <Link href="/" className="text-blue-500 hover:underline text-sm">
          返回首页
        </Link>
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

      {/* 产品头部 */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {product.name}
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-300 mt-2">
          {product.tagline}
        </p>
        <div className="mt-4 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
          <span>基于需求：{product.ideaTitle}</span>
          <span>·</span>
          <span>{new Date(product.createdAt).toLocaleString('zh-CN')}</span>
        </div>
      </div>

      {/* 内容 */}
      <div className="space-y-6">
        <Section title="🎯 问题分析" content={product.problem} />
        <Section title="💡 解决方案" content={product.solution} />
        <Section title="👥 目标用户" content={product.targetUsers} />

        {product.coreFeatures.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              ⚡ 核心功能
            </h2>
            <div className="flex flex-wrap gap-2">
              {product.coreFeatures.map((f, i) => (
                <span key={i} className="px-3 py-1.5 text-sm rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {product.techStack.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              🛠 推荐技术栈
            </h2>
            <div className="flex flex-wrap gap-2">
              {product.techStack.map((t, i) => (
                <span key={i} className="px-3 py-1.5 text-sm rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        <Section title="💰 商业模式" content={product.monetization} />
        <Section title="🔍 竞品分析" content={product.competitors} />
        <Section title="✨ 差异化优势" content={product.differentiator} />
        <Section title="🚀 MVP 方案" content={product.mvp} />
      </div>

      {/* 操作 */}
      <div className="mt-8 flex justify-end gap-3">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition disabled:opacity-50"
        >
          {deleting ? '删除中...' : '删除'}
        </button>
      </div>
    </div>
  )
}

function Section({ title, content }: { title: string; content?: string }) {
  if (!content) return null
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
        {content}
      </p>
    </div>
  )
}
