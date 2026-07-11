'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import type { CommunityProduct } from '@/lib/types'

interface AppCardProps {
  product: CommunityProduct
  userId: string
  isActive: boolean
  shouldLoad: boolean
  isFullscreen?: boolean
  onRequestFullscreen?: () => void
  onExitFullscreen?: () => void
  onFullscreenNext?: () => void
  onFullscreenPrev?: () => void
}

const FS_SWIPE = 25

export default function AppCard({
  product, userId, isActive, shouldLoad,
  isFullscreen, onRequestFullscreen, onExitFullscreen,
  onFullscreenNext, onFullscreenPrev,
}: AppCardProps) {
  const [hasVoted, setHasVoted] = useState(product.votedBy?.includes(userId))
  const [votes, setVotes] = useState(product.votes || 0)
  const [voting, setVoting] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [copied, setCopied] = useState(false)

  const fsTouch = useRef({ startY: 0, moved: false })
  const lock = useRef(false)
  const lastSwipe = useRef(0)

  // Reset loaded state when product changes or shouldLoad changes
  useEffect(() => {
    if (shouldLoad) {
      setLoaded(false)
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

  // Fullscreen swipe
  const fsStart = (e: React.TouchEvent) => {
    const now = Date.now()
    if (now - lastSwipe.current < 400 || lock.current) return
    fsTouch.current = { startY: e.touches[0].clientY, moved: false }
  }

  const fsMove = (e: React.TouchEvent) => {
    const t = fsTouch.current
    if (!t.startY || lock.current) return
    if (Math.abs(e.touches[0].clientY - t.startY) > 10) t.moved = true
  }

  const fsEnd = (e: React.TouchEvent) => {
    const t = fsTouch.current
    if (!t.startY || !t.moved || lock.current) return
    const dy = e.changedTouches[0].clientY - t.startY
    t.startY = 0
    if (Math.abs(dy) >= FS_SWIPE) {
      lastSwipe.current = Date.now()
      lock.current = true
      setTimeout(() => { lock.current = false }, 300)
      if (dy < 0) onFullscreenNext?.()
      else onFullscreenPrev?.()
    }
  }

  // Fullscreen wheel
  useEffect(() => {
    if (!isFullscreen) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const now = Date.now()
      if (now - lastSwipe.current < 400 || lock.current) return
      if (Math.abs(e.deltaY) <= 15) return
      lastSwipe.current = now
      lock.current = true
      setTimeout(() => { lock.current = false }, 300)
      if (e.deltaY > 0) onFullscreenNext?.()
      else onFullscreenPrev?.()
    }
    window.addEventListener('wheel', handler, { passive: false })
    return () => window.removeEventListener('wheel', handler)
  }, [isFullscreen, onFullscreenNext, onFullscreenPrev])

  const iframe = (
    <iframe
      title={product.name}
      src={shouldLoad ? `/p/${product.id}` : undefined}
      className="w-full h-full border-0"
      sandbox="allow-scripts allow-forms allow-same-origin allow-modals allow-popups"
      style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
      onLoad={() => setLoaded(true)}
    />
  )

  // Fullscreen mode (rendered via portal to escape parent stacking context)
  if (isFullscreen && typeof document !== 'undefined') {
    return createPortal(
      <div className="fixed inset-0 bg-black select-none z-[100]">
        <div className="absolute inset-0">{iframe}</div>

        {/* Swipe zones (left & right edges, so center is tappable for game) */}
        <div
          className="absolute inset-y-0 left-0 w-14 z-30"
          onTouchStart={fsStart}
          onTouchMove={fsMove}
          onTouchEnd={fsEnd}
        />
        <div
          className="absolute inset-y-0 right-0 w-14 z-30"
          onTouchStart={fsStart}
          onTouchMove={fsMove}
          onTouchEnd={fsEnd}
        />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
            <button
              onClick={onExitFullscreen}
              className="pointer-events-auto text-sm text-white/80 hover:text-white transition flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              退出
            </button>
            <span className="text-xs text-white/50 truncate max-w-[60%]">{product.name}</span>
          </div>
        </div>

        {/* AD badge */}
        {isAdGame && (
          <div className="absolute top-14 right-3 z-30 pointer-events-none">
            <span className="text-[9px] text-white/40 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded">
              AD
            </span>
          </div>
        )}

        {!loaded && shouldLoad && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-0">
            <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          </div>
        )}
      </div>,
      document.body
    )
  }

  // Card mode (TikTok style — default, non-fullscreen)
  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none touch-none z-10">
      {/* Blurred bg */}
      <div className="absolute inset-0 z-[1]">
        <iframe
          title={product.name + '_bg'}
          src={shouldLoad ? `/p/${product.id}` : undefined}
          className="w-full h-full border-0 pointer-events-none opacity-40 scale-110 blur-md"
          sandbox="allow-scripts"
          aria-hidden
        />
      </div>

      {/* App preview frame */}
      <div className="absolute inset-0 flex items-center justify-center px-4 z-10" style={{ paddingBottom: '160px', paddingTop: '60px' }}>
        <div className="w-full h-full max-w-[400px] relative">
          <div
            className="w-full h-full rounded-[24px] overflow-hidden border border-white/15 shadow-[0_0_80px_rgba(0,0,0,0.7)] bg-gradient-to-br from-gray-900 to-gray-800 cursor-pointer"
            onClick={onRequestFullscreen}
          >
            {shouldLoad ? iframe : <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center"><div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-white/30 animate-spin" /></div>}
            {!loaded && shouldLoad && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 rounded-[24px] z-10">
                <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                <p className="mt-3 text-sm text-white/50">{product.name}</p>
                <p className="mt-1 text-[10px] text-white/25">加载中...</p>
              </div>
            )}
          </div>
          {/* Click to expand hint */}
          {loaded && (
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-white/30 whitespace-nowrap pointer-events-none">
              点击全屏体验 ↑
            </div>
          )}
        </div>
      </div>

      {/* Bottom info (TikTok style) */}
      <div className="absolute bottom-16 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-20 pb-3 px-4 pointer-events-none">
        <div className="max-w-lg">
          <h2 className="text-xl font-bold text-white drop-shadow-lg">{product.name}</h2>
          <p className="text-sm text-white/80 mt-1 line-clamp-2 drop-shadow">{product.tagline}</p>
          <div className="flex items-center gap-2 mt-2">
            {isAdGame && (
              <span className="text-[9px] text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-1.5 py-0.5 rounded">
                广告游戏
              </span>
            )}
            <span className="text-[10px] text-white/50 bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-sm">
              {product.ideaTitle?.slice(0, 20)}{product.ideaTitle?.length > 20 ? '…' : ''}
            </span>
            <span className="text-[10px] text-white/40">
              {new Date(product.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Right action rail (TikTok style) */}
      <div className="absolute right-3 z-20 flex flex-col items-center gap-5 pointer-events-none" style={{ bottom: 'calc(160px + 20px)' }}>
        {/* Vote */}
        <div className="flex flex-col items-center gap-1 pointer-events-auto">
          <button
            onClick={handleVote}
            disabled={voting}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${
              hasVoted
                ? 'bg-gradient-to-br from-pink-500 to-red-500 text-white shadow-lg shadow-pink-500/40'
                : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
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
            className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-sm active:scale-90"
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

        {/* Expand */}
        <button onClick={onRequestFullscreen} className="flex flex-col items-center gap-1 pointer-events-auto">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-sm active:scale-90">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </div>
          <span className="text-[10px] text-white/60">全屏</span>
        </button>

        {/* Detail link */}
        <Link href={`/product/${product.id}`} className="flex flex-col items-center gap-1 pointer-events-auto">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-sm active:scale-90">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-[10px] text-white/60">详情</span>
        </Link>
      </div>
    </div>
  )
}
