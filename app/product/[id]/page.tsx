'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Product, BrainstormSession } from '@/lib/types'

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    const id = params.id as string
    fetch(`/api/products/${id}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => setProduct(data?.product || null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [params.id])

  const handleGenerate = async () => {
    if (!product || generating) return
    setGenerating(true)
    try {
      const resp = await fetch(`/api/products/${product.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: '' }),
      })
      if (resp.ok) {
        const data = await resp.json()
        if (data.generatedHtml) {
          setProduct(prev => prev ? { ...prev, generatedHtml: data.generatedHtml } : null)
        }
      }
    } catch { /* ignore */ }
    setGenerating(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black pb-20">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black pb-20 gap-4">
        <p className="text-white/40">产品不存在</p>
        <Link href="/" className="text-sm text-pink-400 hover:text-pink-300">返回首页</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/95 backdrop-blur-lg border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-white/60 hover:text-white transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-base font-bold flex-1 truncate">{product.name}</h1>
        {product.generatedHtml && (
          <Link
            href={`/product/${product.id}/app`}
            className="px-3 py-1.5 text-xs font-medium bg-white text-black rounded-lg hover:bg-white/90 transition active:scale-95"
          >
            体验
          </Link>
        )}
      </div>

      {/* Hero */}
      <div className="px-4 py-6 bg-gradient-to-b from-white/[0.03] to-transparent">
        <h2 className="text-2xl font-bold mb-2">{product.name}</h2>
        <p className="text-sm text-white/60">{product.tagline}</p>
        <div className="mt-3 flex items-center gap-2 text-[10px] text-white/30">
          <span className="bg-white/5 px-2 py-0.5 rounded-full">{product.ideaTitle?.slice(0, 20)}</span>
          <span>·</span>
          <span>{new Date(product.createdAt).toLocaleDateString('zh-CN')}</span>
        </div>
      </div>

      {!product.generatedHtml && (
        <div className="px-4 py-6">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-red-500 text-white text-sm font-semibold hover:opacity-90 transition active:scale-95 disabled:opacity-50"
          >
            {generating ? '生成中...' : '生成产品页面'}
          </button>
        </div>
      )}

      {/* Details */}
      <div className="px-4 py-4 space-y-5">
        <Section title="🎯 问题" content={product.problem} />
        <Section title="💡 方案" content={product.solution} />
        <Section title="👥 用户" content={product.targetUsers} />

        {product.coreFeatures?.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white/80 mb-2">⚡ 核心功能</h3>
            <div className="flex flex-wrap gap-1.5">
              {product.coreFeatures.map((f, i) => (
                <span key={i} className="px-2.5 py-1 text-xs rounded-full bg-white/5 text-white/60 border border-white/10">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {product.techStack?.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white/80 mb-2">🛠 技术栈</h3>
            <div className="flex flex-wrap gap-1.5">
              {product.techStack.map((t, i) => (
                <span key={i} className="px-2.5 py-1 text-xs rounded-full bg-white/5 text-white/40 border border-white/10">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        <Section title="💰 商业模式" content={product.monetization} />
        <Section title="✨ 差异化" content={product.differentiator} />
        <Section title="🚀 MVP" content={product.mvp} />
      </div>
    </div>
  )
}

function Section({ title, content }: { title: string; content?: string }) {
  if (!content) return null
  return (
    <div>
      <h3 className="text-sm font-semibold text-white/80 mb-1.5">{title}</h3>
      <p className="text-sm text-white/50 leading-relaxed">{content}</p>
    </div>
  )
}
