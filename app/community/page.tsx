'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { CommunityProduct } from '@/lib/types'

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

export default function CommunityPage() {
  const [products, setProducts] = useState<CommunityProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [votingId, setVotingId] = useState<string | null>(null)
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
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const handleVote = async (productId: string) => {
    if (!userId || votingId) return
    setVotingId(productId)
    try {
      const resp = await fetch(`/api/community/${productId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (resp.ok) {
        const { votes, hasVoted } = await resp.json()
        setProducts(prev =>
          prev.map(p =>
            p.id === productId
              ? { ...p, votes, votedBy: hasVoted ? [...p.votedBy, userId] : p.votedBy.filter(id => id !== userId) }
              : p
          ).sort((a, b) => b.votes - a.votes || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((p, i) => ({ ...p, rank: i + 1 }))
        )
      }
    } catch {}
    setVotingId(null)
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300 dark:border-gray-600"></div>
        <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">加载中...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">社区作品</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">用户生成的产品，投票支持你喜欢的</p>
      </div>

      {products.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl mb-4">🚀</p>
          <p className="text-gray-500 dark:text-gray-400 mb-2">还没有作品</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            <Link href="/" className="text-blue-500 hover:underline">去首页</Link> 生成第一个产品
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => {
            const hasVoted = product.votedBy.includes(userId)
            return (
              <div
                key={product.id}
                className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition"
              >
                {/* 排名 */}
                <div className="shrink-0 w-10 text-center">
                  <span className={`text-lg font-bold ${
                    product.rank <= 3 ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {product.rank}
                  </span>
                </div>

                {/* 投票按钮 */}
                <button
                  onClick={() => handleVote(product.id)}
                  disabled={votingId === product.id}
                  className={`shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition ${
                    hasVoted
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <svg className={`w-5 h-5 ${votingId === product.id ? 'animate-pulse' : ''}`} fill={hasVoted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  <span className="text-xs font-bold">{product.votes}</span>
                </button>

                {/* 产品信息 */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/product/${product.id}/app`}
                    className="block hover:opacity-80 transition"
                  >
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {product.tagline}
                    </p>
                  </Link>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    <span>基于「{product.ideaTitle.slice(0, 20)}」</span>
                    <span>·</span>
                    <span>{new Date(product.createdAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                </div>

                {/* 预览链接 */}
                <Link
                  href={`/product/${product.id}/app`}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  预览 →
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
