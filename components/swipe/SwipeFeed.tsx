'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import AppCard from './AppCard'
import type { CommunityProduct } from '@/lib/types'

interface SwipeFeedProps {
  products: CommunityProduct[]
  userId: string
  onRefresh?: () => void
}

const SWIPE_THRESHOLD = 50
const ANIM_MS = 300
const COOLDOWN_MS = 250

export default function SwipeFeed({ products, userId, onRefresh }: SwipeFeedProps) {
  const total = products.length + 1 // +1 for end card
  const lastIdx = products.length - 1
  const endIdx = products.length

  const [idx, setIdx] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [showHint, setShowHint] = useState(true)
  const [fullscreen, setFullscreen] = useState<number | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const touch = useRef({ startY: 0, lastY: 0, dragging: false, moved: false })
  const lock = useRef(false)
  const lastGoTo = useRef(0)

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 3500)
    return () => clearTimeout(t)
  }, [])

  const goTo = useCallback((target: number) => {
    const now = Date.now()
    if (now - lastGoTo.current < COOLDOWN_MS) return
    const clamped = Math.max(0, Math.min(target, total - 1))
    if (clamped === idx) return
    lastGoTo.current = now
    lock.current = true
    setAnimating(true)
    setIdx(clamped)
    // Keep fullscreen in sync when navigating
    if (fullscreen !== null) {
      if (clamped <= lastIdx) setFullscreen(clamped)
      else setFullscreen(null)
    }
    setTimeout(() => {
      lock.current = false
      setAnimating(false)
    }, ANIM_MS)
  }, [idx, total, lastIdx, fullscreen])

  // Touch handlers (only active in card mode, not fullscreen)
  const onTouchStart = (e: React.TouchEvent) => {
    if (lock.current || total <= 1) return
    if (fullscreen !== null) return // fullscreen handles its own swipes
    touch.current = { startY: e.touches[0].clientY, lastY: e.touches[0].clientY, dragging: true, moved: false }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    const t = touch.current
    if (!t.dragging || lock.current) return
    t.lastY = e.touches[0].clientY
    if (Math.abs(t.lastY - t.startY) > 10) t.moved = true
  }

  const onTouchEnd = () => {
    const t = touch.current
    if (!t.dragging || lock.current) return
    t.dragging = false
    t.moved = false
    const delta = t.lastY - t.startY
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      if (delta < 0 && idx < total - 1) goTo(idx + 1)
      else if (delta > 0 && idx > 0) goTo(idx - 1)
      else if (delta > 0 && idx === 0 && onRefresh && Math.abs(delta) > 100) onRefresh()
    }
  }

  // Wheel (only in card mode)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (lock.current || total <= 1) return
      if (fullscreen !== null) return // fullscreen handles its own wheel
      if (e.deltaY > 15 && idx < total - 1) goTo(idx + 1)
      else if (e.deltaY < -15) {
        if (idx === 0 && onRefresh && Math.abs(e.deltaY) > 60) onRefresh()
        else if (idx > 0) goTo(idx - 1)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: true })
    return () => el.removeEventListener('wheel', onWheel)
  }, [idx, goTo, total, onRefresh, fullscreen])

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); if (idx < total - 1) goTo(idx + 1) }
      else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); if (idx > 0) goTo(idx - 1) }
      else if (e.key === 'Escape' && fullscreen !== null) { setFullscreen(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goTo, idx, total, fullscreen])

  const getTransform = () => {
    if (total === 0) return 'translateY(0)'
    const base = -idx * 100
    const t = touch.current
    let offset = 0
    if (t.dragging && t.moved) {
      const delta = t.lastY - t.startY
      if ((idx === 0 && delta > 0) || (idx === total - 1 && delta < 0)) {
        offset = delta * 0.3 // bounce
      } else {
        offset = delta
      }
    }
    const vh = typeof window !== 'undefined' ? window.innerHeight : 1
    return `translateY(${base + offset / vh * 100}vh)`
  }

  const isFs = fullscreen !== null
  const atEnd = idx === endIdx

  // Fullscreen navigation handlers
  const fsNext = useCallback(() => {
    if (fullscreen !== null && fullscreen < lastIdx) goTo(fullscreen + 1)
  }, [fullscreen, lastIdx, goTo])

  const fsPrev = useCallback(() => {
    if (fullscreen !== null && fullscreen > 0) goTo(fullscreen - 1)
  }, [fullscreen, goTo])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden touch-none"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => { touch.current.dragging = false }}
    >
      <div
        className="will-change-transform"
        style={{
          transform: getTransform(),
          transition: animating ? `transform ${ANIM_MS}ms cubic-bezier(0.32, 0.72, 0, 1)` : 'transform 0ms',
        }}
      >
        {products.map((product, i) => (
          <div key={product.id} className="h-screen w-full relative">
            <AppCard
              product={product}
              userId={userId}
              isActive={i === idx}
              shouldLoad={Math.abs(i - idx) <= 1}
              isFullscreen={fullscreen === i}
              onRequestFullscreen={() => setFullscreen(idx)}
              onExitFullscreen={() => setFullscreen(null)}
              onFullscreenNext={fsNext}
              onFullscreenPrev={fsPrev}
            />
          </div>
        ))}

        {/* End card */}
        <div className="h-screen w-full relative flex flex-col items-center justify-center px-8" style={{ background: 'linear-gradient(180deg, #000000 0%, #0a0a0f 50%, #111827 100%)' }}>
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-pink-500/20">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-white/80 text-base font-medium mb-1">已经到底了</p>
            <p className="text-white/40 text-xs mb-8">自己创作一个游戏吧</p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white transition-all border border-white/10 text-sm font-medium active:scale-95"
            >
              创作游戏
            </Link>
          </div>
        </div>
      </div>

      {/* Hint */}
      {showHint && products.length > 1 && !isFs && !atEnd && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className="bg-white/10 backdrop-blur-md text-white/60 text-xs px-4 py-2 rounded-full border border-white/10 animate-bounce">
            ↑↓ 滑动切换
          </div>
        </div>
      )}

      {/* Progress dots (right side) */}
      {!isFs && total > 2 && total < 30 && (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-0">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="flex items-center justify-center"
              style={{ width: '24px', height: '24px' }}
            >
              <span className={`rounded-full transition-all duration-300 ${i === idx ? 'w-[4px] h-5 bg-white' : 'w-[3px] h-[3px] bg-white/30'}`} />
            </button>
          ))}
        </div>
      )}

      {/* Top bar */}
      {!isFs && !atEnd && (
        <div className="fixed top-0 left-0 right-0 z-40 pointer-events-none">
          <div className="flex items-center justify-between px-4 pt-3">
            <span className="text-sm font-bold text-white/80">IdeaHub</span>
            <span className="text-[10px] text-white/30 font-mono">
              {idx + 1 < total ? `${idx + 1}/${lastIdx + 1}` : 'END'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
