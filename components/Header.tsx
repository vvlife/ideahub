'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type RefreshState = 'idle' | 'loading' | 'success' | 'error'

export default function Header() {
  const [query, setQuery] = useState('')
  const [refreshState, setRefreshState] = useState<RefreshState>('idle')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const handleRefresh = async () => {
    if (refreshState === 'loading') return
    
    setRefreshState('loading')
    try {
      const resp = await fetch('/api/crawl', { method: 'POST' })
      const data = await resp.json()
      
      if (data.success) {
        setRefreshState('success')
        // Refresh the page data
        router.refresh()
        // Reset state after 2 seconds
        setTimeout(() => setRefreshState('idle'), 2000)
      } else {
        setRefreshState('error')
        setTimeout(() => setRefreshState('idle'), 3000)
      }
    } catch {
      setRefreshState('error')
      setTimeout(() => setRefreshState('idle'), 3000)
    }
  }

  const buttonLabel = {
    idle: '刷新',
    loading: '抓取中...',
    success: '抓取成功',
    error: '抓取失败',
  }[refreshState]

  const buttonClass = {
    idle: 'text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800',
    loading: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20 cursor-wait',
    success: 'text-green-500 bg-green-50 dark:bg-green-900/20',
    error: 'text-red-500 bg-red-50 dark:bg-red-900/20',
  }[refreshState]

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-content px-4">
        <div className="flex items-center justify-between h-14 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 shrink-0">
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              Idea
            </span>
            <span className="text-xl font-bold text-blue-500">Hub</span>
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xs sm:max-w-md">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索需求..."
                className="w-full pl-9 pr-4 py-1.5 text-sm rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </form>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={refreshState === 'loading'}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition ${buttonClass}`}
            title={buttonLabel}
          >
            <svg
              className={`w-3.5 h-3.5 ${refreshState === 'loading' ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="hidden sm:inline">{buttonLabel}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
