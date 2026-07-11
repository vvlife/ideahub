'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { CommunityProduct } from '@/lib/types'

const SwipeFeed = dynamic(() => import('@/components/swipe/SwipeFeed'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      <p className="mt-6 text-lg font-semibold text-white">IdeaHub</p>
      <p className="mt-1 text-sm text-white/40">加载中...</p>
    </div>
  ),
})

const USER_KEY = 'ideahub_user_id'

function getUserId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(USER_KEY)
  if (!id) {
    id = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
    localStorage.setItem(USER_KEY, id)
  }
  return id
}

export default function HomePage() {
  const [products, setProducts] = useState<CommunityProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')

  useEffect(() => {
    setUserId(getUserId())
  }, [])

  const loadProducts = useCallback(async () => {
    try {
      const resp = await fetch('/api/community', { cache: 'no-store' })
      if (resp.ok) {
        const data = await resp.json()
        setProducts(data.products || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // 监听新作品创建事件
  useEffect(() => {
    const handler = () => loadProducts()
    window.addEventListener('product-created', handler)
    return () => window.removeEventListener('product-created', handler)
  }, [loadProducts])

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
        <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        <p className="mt-6 text-lg font-semibold text-white">IdeaHub</p>
        <p className="mt-1 text-sm text-white/40">加载作品...</p>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white gap-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 flex items-center justify-center shadow-2xl shadow-pink-500/30">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-lg text-white/90 font-medium">还没有游戏</p>
          <p className="text-sm text-white/40 mt-1">输入想法，AI 帮你生成第一个</p>
        </div>
        <a
          href="/create"
          className="px-6 py-2.5 text-sm font-medium bg-white text-black rounded-full hover:bg-white/90 transition active:scale-95"
        >
          开始创作
        </a>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black">
      <SwipeFeed products={products} userId={userId} onRefresh={loadProducts} />
    </div>
  )
}
