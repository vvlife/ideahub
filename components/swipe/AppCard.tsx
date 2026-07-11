'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import type { CommunityProduct } from '@/lib/types'

interface AppCardProps {
  product: CommunityProduct
  userId: string
  isActive: boolean
  shouldLoad: boolean
}

export default function AppCard({
  product, userId, isActive, shouldLoad,
}: AppCardProps) {
  const [hasVoted, setHasVoted] = useState(product.votedBy?.includes(userId))
  const [votes, setVotes] = useState(product.votes || 0)
  const [voting, setVoting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [showOverlay, setShowOverlay] = useState(true)

  // Reset loaded state when product changes
  useEffect(() => {
    if (shouldLoad) {
      setLoaded(false)
      setShowOverlay(true)
    }
  }, [product.id, shouldLoad])

  const handleVote = useCallback(async () => {
    if (voting || !userId) return
    setVoting(true)
    try {
      const resp = await fetch(`/api/community/${product.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (resp.ok) {
        const data = await resp.json()
        setVotes(data.votes)
        setHasVoted(data.hasVoted)
      }
    } catch { /* ignore */ }
    setVoting(false)
  }, [product.id, userId, voting])

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/p/${product.id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }, [product.id])

  // Detect if this is a GameMonetize game (has ad)
  const isAdGame = product.id?.startsWith('prod_gm_')

  // Auto-hide overlay after load
  useEffect(() => {
    if (loaded && showOverlay) {
      const t = setTimeout(() => setShowOverlay(false), 1500)
      return () => clearTimeout(t)
    }
  }, [loaded, showOverlay])

  return (
    <div className="absolute inset-0 bg-black select-none touch-none z-10">
      {/* Full-screen game iframe — single iframe, no blurred background */}
      <div className="absolute inset-0">
        <iframe
          title={product.name}
          src={shouldLoad ? `/p/${product.id}` : undefined}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-forms allow-same-origin allow-modals allow-popups"
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
          onLoad={() => setLoaded(true)}
        />
      </div>

      {/* Loading skeleton */}
      {!loaded && shouldLoad && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-0">
          {/* Thumbnail or gradient */}
          {product._thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product._thumb}
              alt={product.name}
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
          ) : null}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            <p className="mt-4 text-sm text-white/70 font-medium">{product.name}</p>
            <p className="mt-1 text-[11px] text-white/30">加载中...</p>
          </div>
        </div>
      )}

      {/* Ad badge for GameMonetize games */}
      {isAdGame && loaded && (
        <div className="absolute top-12 right-3 z-30 pointer-events-none">
          <span className="text-[9px] text-white/40 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded">
            AD
          </span>
        </div>
      )}

      {/* Top gradient + title (auto-hide) */}
      {loaded && showOverlay && (
        <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none bg-gradient-to-b from-black/70 to-transparent pb-8 pt-3 px-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-white drop-shadow-lg truncate">{product.name}</h2>
              <p className="text-xs text-white/70 mt-0.5 line-clamp-1">{product.tagline}</p>
            </div>
          </div>
        </div>
      )}

      {/* Right action rail (TikTok style, always visible) */}
      <div className="absolute right-2 z-30 flex flex-col items-center gap-4 pointer-events-none" style={{ bottom: '100px' }}>
        {/* Vote */}
        <div className="flex flex-col items-center gap-1 pointer-events-auto">
          <button
            onClick={handleVote}
            disabled={voting}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 backdrop-blur-md ${
              hasVoted
                ? 'bg-gradient-to-br from-pink-500 to-red-500 text-white shadow-lg shadow-pink-500/40'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <svg className={`w-5 h-5 ${voting ? 'animate-pulse' : ''}`} fill={hasVoted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
          <span className={`text-[11px] font-semibold ${hasVoted ? 'text-pink-400' : 'text-white/80'}`}>{votes}</span>
        </div>

        {/* Share */}
        <div className="relative flex flex-col items-center gap-1 pointer-events-auto">
          <button
            onClick={handleShare}
            className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-md active:scale-90"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
          <span className="text-[10px] text-white/60">分享</span>
          {copied && (
            <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-white text-black text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap shadow-lg z-30">
              已复制 ✓
            </div>
          )}
        </div>

        {/* Detail link */}
        <Link href={`/product/${product.id}`} className="flex flex-col items-center gap-1 pointer-events-auto">
          <div className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-md active:scale-90">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-[10px] text-white/60">详情</span>
        </Link>
      </div>

      {/* Bottom gradient with game info (auto-hide) */}
      {loaded && showOverlay && (
        <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none bg-gradient-to-t from-black/80 via-black/30 to-transparent pt-12 pb-4 px-4">
          <div className="max-w-lg">
            <div className="flex items-center gap-2 mb-1">
              {isAdGame && (
                <span className="text-[9px] text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-1.5 py-0.5 rounded">
                  广告游戏
                </span>
              )}
              <span className="text-[10px] text-white/40">
                {new Date(product.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tap to toggle overlay */}
      {loaded && (
        <button
          className="absolute inset-0 z-10 w-full h-full"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          onClick={() => setShowOverlay(s => !s)}
          aria-label="toggle overlay"
        />
      )}
    </div>
  )
}
