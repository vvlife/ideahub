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
    } catch { /* ignore */ }
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
    } catch { /* ignore */ }
    setVotingId(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black pb-20">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/95 backdrop-blur-lg border-b border-white/10 px-4 py-3">
        <h1 className="text-lg font-bold text-white">社区排行</h1>
        <p className="text-xs text-white/40">投票支持你喜欢的作品</p>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
            <svg className="w-8 h-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
          </div>
          <p className="text-white/40 text-sm">还没有作品</p>
          <Link
            href="/create"
            className="px-5 py-2 text-sm font-medium bg-white text-black rounded-full hover:bg-white/90 transition active:scale-95"
          >
            创作第一个
          </Link>
        </div>
      ) : (
        <div className="px-4 py-3 space-y-2.5">
          {products.map((product) => {
            const hasVoted = product.votedBy?.includes(userId)
            return (
              <div
                key={product.id}
                className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-2xl border border-white/5 hover:border-white/10 transition"
              >
                {/* Rank */}
                <div className="shrink-0 w-8 text-center">
                  <span className={`text-base font-bold ${
                    product.rank <= 3 ? 'text-yellow-400' : 'text-white/30'
                  }`}>
                    {product.rank}
                  </span>
                </div>

                {/* Vote */}
                <button
                  onClick={() => handleVote(product.id)}
                  disabled={votingId === product.id}
                  className={`shrink-0 flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition ${
                    hasVoted
                      ? 'bg-gradient-to-br from-pink-500/20 to-red-500/20 text-pink-400 border border-pink-500/30'
                      : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/5'
                  }`}
                >
                  <svg className={`w-4 h-4 ${votingId === product.id ? 'animate-pulse' : ''}`} fill={hasVoted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="text-[11px] font-bold">{product.votes}</span>
                </button>

                {/* Info */}
                <Link
                  href={`/product/${product.id}/app`}
                  className="flex-1 min-w-0"
                >
                  <h3 className="text-sm font-semibold text-white truncate">{product.name}</h3>
                  <p className="text-xs text-white/40 truncate mt-0.5">{product.tagline}</p>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-white/30">
                    <span>{product.ideaTitle?.slice(0, 16)}{product.ideaTitle?.length > 16 ? '…' : ''}</span>
                    <span>·</span>
                    <span>{new Date(product.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </Link>

                {/* Preview */}
                <Link
                  href={`/product/${product.id}/app`}
                  className="shrink-0 w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition active:scale-90"
                >
                  <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
