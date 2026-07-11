'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import AppCard from './AppCard'
import type { CommunityProduct } from '@/lib/types'

interface SwipeFeedProps {
  products: CommunityProduct[]
  userId: string
  onRefresh?: (excludeIds: string[]) => void
}

const SWIPE_THRESHOLD = 50
const ANIM_MS = 300
const COOLDOWN_MS = 250

export default function SwipeFeed({ products, userId, onRefresh }: SwipeFeedProps) {
  const total = products.length
  const lastIdx = total - 1

  const [idx, setIdx] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [showHint, setShowHint] = useState(true)
  const [fullscreen, setFullscreen] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const touch = useRef({ startY: 0, lastY: 0, dragging: false, moved: false })
  const lock = useRef(false)
  const lastGoTo = useRef(0)
  const viewedIds = useRef<Set<string>>(new Set())

  // Track viewed products
  useEffect(() => {
    if (products[idx]) {
      viewedIds.current.add(products[idx].id)
    }
  }, [idx, products])

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 3500)
    return () => clearTimeout(t)
  }, [])

  const goTo = useCallback((target: number) => {
    const now = Date.now()
    if (now - lastGoTo.current < COOLDOWN_MS) return
    if (total === 0) return
    // Wrap around: going past last → back to 0
    const clamped = ((target % total) + total) % total
    if (clamped === idx) return
    lastGoTo.current = now
    lock.current = true
    setAnimating(true)
    setIdx(clamped)
    // Keep fullscreen in sync when navigating
    if (fullscreen !== null) {
      setFullscreen(clamped)
    }
    setTimeout(() => {
      lock.current = false
      setAnimating(false)
    }, ANIM_MS)
  }, [idx, total, fullscreen])

  const doRefresh = useCallback(async () => {
    if (refreshing) return
    setRefreshing(true)
    // Pass all viewed ids so API can exclude them
    onRefresh?.(Array.from(viewedIds.current))
    // Give API time to respond
    setTimeout(() => setRefreshing(false), 1500)
  }, [refreshing, onRefresh])

  // Touch handlers (only active in card mode, not fullscreen)
  const onTouchStart = (e: React.TouchEvent) => {
    if (lock.current || total <= 1) return
    if (fullscreen !== null) return
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
      if (delta < 0) {
        // Swipe up → next (wrap to 0 at end)
        goTo(idx + 1)
      } else if (delta > 0) {
        // Swipe down → prev or refresh at idx 0
        if (idx === 0) {
          doRefresh()
        } else {
          goTo(idx - 1)
        }
      }
    }
  }

  // Wheel (only in card mode)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (lock.current || total <= 1) return
      if (fullscreen !== null) return
      if (e.deltaY > 15) {
        // Scroll down → next (wrap to 0 at end)
        goTo(idx + 1)
      } else if (e.deltaY < -15) {
        // Scroll up → prev or refresh at idx 0
        if (idx === 0 && Math.abs(e.deltaY) > 60) {
          doRefresh()
        } else if (idx > 0) {
          goTo(idx - 1)
        }
      }
    }
    el.addEventListener('wheel', onWheel, { passive: true })
    return () => el.removeEventListener('wheel', onWheel)
  }, [idx, goTo, total, doRefresh, fullscreen])

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault()
        goTo(idx + 1)
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault()
        if (idx === 0) {
          doRefresh()
        } else {
          goTo(idx - 1)
        }
      } else if (e.key === 'Escape' && fullscreen !== null) {
        setFullscreen(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goTo, idx, fullscreen, doRefresh])

  const getTransform = () => {
    if (total === 0) return 'translateY(0)'
    const base = -idx * 100
    const t = touch.current
    let offset = 0
    if (t.dragging && t.moved) {
      const delta = t.lastY - t.startY
      // No bounce at edges anymore — wrap around instead
      offset = delta
    }
    const vh = typeof window !== 'undefined' ? window.innerHeight : 1
    return `translateY(${base + offset / vh * 100}vh)`
  }

  const isFs = fullscreen !== null

  // Fullscreen navigation handlers
  const fsNext = useCallback(() => {
    if (fullscreen !== null) goTo(fullscreen + 1)
  }, [fullscreen, goTo])

  const fsPrev = useCallback(() => {
    if (fullscreen !== null) {
      if (fullscreen === 0) {
        doRefresh()
      } else {
        goTo(fullscreen - 1)
      }
    }
  }, [fullscreen, goTo, doRefresh])

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
      </div>

      {/* Hint */}
      {showHint && products.length > 1 && !isFs && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className="bg-white/10 backdrop-blur-md text-white/60 text-xs px-4 py-2 rounded-full border border-white/10 animate-bounce">
            ↑↓ 滑动切换
          </div>
        </div>
      )}

      {/* Refreshing indicator */}
      {refreshing && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className="bg-white/10 backdrop-blur-md text-white/80 text-xs px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            刷新中...
          </div>
        </div>
      )}

      {/* Top bar */}
      {!isFs && (
        <div className="fixed top-0 left-0 right-0 z-40 pointer-events-none">
          <div className="flex items-center justify-between px-4 pt-3">
            <span className="text-sm font-bold text-white/80">IdeaHub</span>
            {refreshing && <span className="text-[10px] text-white/40">刷新中</span>}
          </div>
        </div>
      )}
    </div>
  )
}
