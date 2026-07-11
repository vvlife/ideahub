'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { Product, ProductVersion } from '@/lib/types'

export default function ProductAppPage() {
  const params = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAdjust, setShowAdjust] = useState(false)
  const [adjustPrompt, setAdjustPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [versions, setVersions] = useState<ProductVersion[]>([])
  const [currentVersion, setCurrentVersion] = useState(1)

  const loadProduct = useCallback(async () => {
    const id = params.id as string
    try {
      const resp = await fetch(`/api/products/${id}`, { cache: 'no-store' })
      if (resp.ok) {
        const data = await resp.json()
        setProduct(data.product || null)
        const vs = (data.product?.versions || []).slice().sort((a: ProductVersion, b: ProductVersion) => b.version - a.version)
        setVersions(vs)
        setCurrentVersion(data.product?.currentVersion || (vs[0]?.version ?? 1))
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [params.id])

  useEffect(() => { loadProduct() }, [loadProduct])

  const activeHtml = product
    ? (versions.find(v => v.version === currentVersion)?.html || product.generatedHtml || '')
    : ''

  const handleAdjust = async () => {
    if (!product || generating) return
    setGenerating(true)
    try {
      const resp = await fetch(`/api/products/${product.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: adjustPrompt.trim() }),
      })
      const data = await resp.json()
      if (data.success) {
        await loadProduct()
        setShowAdjust(false)
        setAdjustPrompt('')
      }
    } catch { /* ignore */ }
    setGenerating(false)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black gap-4">
        <p className="text-white/40">产品不存在</p>
        <Link href="/" className="text-sm text-pink-400">返回首页</Link>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/95 backdrop-blur-lg border-b border-white/10 shrink-0">
        <Link
          href={`/product/${product.id}`}
          className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="truncate max-w-[120px]">{product.name}</span>
        </Link>

        <div className="flex items-center gap-2">
          {versions.length > 1 && (
            <select
              value={currentVersion}
              onChange={(e) => setCurrentVersion(Number(e.target.value))}
              className="text-xs bg-white/10 text-white/70 rounded-lg px-2 py-1 border border-white/10 focus:outline-none"
            >
              {versions.map(v => (
                <option key={v.id} value={v.version} className="bg-black">v{v.version}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setShowAdjust(s => !s)}
            className="px-3 py-1.5 text-xs font-medium text-white bg-white/10 rounded-lg hover:bg-white/20 transition active:scale-95"
          >
            调整
          </button>
        </div>
      </div>

      {/* Adjust panel */}
      {showAdjust && (
        <div className="px-4 py-3 bg-black/90 border-b border-white/10 shrink-0">
          <input
            value={adjustPrompt}
            onChange={(e) => setAdjustPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdjust() }}
            placeholder="描述调整要求，如：改为深色主题"
            disabled={generating}
            className="w-full px-3 py-2 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition mb-2"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdjust}
              disabled={generating || !adjustPrompt.trim()}
              className="flex-1 py-2 text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-red-500 rounded-xl hover:opacity-90 transition disabled:opacity-30 active:scale-95"
            >
              {generating ? '生成中...' : '生成新版本'}
            </button>
            <button
              onClick={() => setShowAdjust(false)}
              className="px-4 py-2 text-sm text-white/50 hover:text-white/80 transition"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* iframe */}
      {activeHtml ? (
        <iframe
          key={currentVersion}
          title={product.name}
          srcDoc={activeHtml}
          sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
          className="flex-1 w-full border-0 bg-white"
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white/40 text-sm">暂无内容</p>
        </div>
      )}
    </div>
  )
}
