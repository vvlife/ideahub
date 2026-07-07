'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Notifications from './Notifications'

type RefreshState = 'idle' | 'loading' | 'success' | 'error'

const CACHE_KEY = 'ideahub_cache'
const CACHE_TIME_KEY = 'ideahub_cache_time'

export default function Header() {
  const [query, setQuery] = useState('')
  const [refreshState, setRefreshState] = useState<RefreshState>('idle')
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [mobileQuery, setMobileQuery] = useState('')
  const router = useRouter()
  const pathname = usePathname()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (mobileQuery.trim()) {
      setShowMobileSearch(false)
      router.push(`/search?q=${encodeURIComponent(mobileQuery.trim())}`)
    }
  }

  const handlePublish = () => {
    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('ideahub:show-submit'))
    } else {
      localStorage.setItem('ideahub_show_submit', '1')
      router.push('/')
    }
  }

  const handleRefresh = async () => {
    if (refreshState === 'loading') return

    setRefreshState('loading')
    try {
      const resp = await fetch('/api/crawl', { method: 'POST' })
      const data = await resp.json()

      if (data.success) {
        const ideas = data.ideas || []
        const collections = data.collections || []
        const crawledAt = data.crawledAt

        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ideas, collections }))
          localStorage.setItem(CACHE_TIME_KEY, crawledAt)
        } catch {}

        window.dispatchEvent(new CustomEvent('ideahub:crawl-complete', {
          detail: { ideas, collections, crawledAt }
        }))

        setRefreshState('success')
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

  const isLanding = pathname === '/home'
  if (isLanding) return null

  return (
    <>
      {/* 移动端搜索弹窗 */}
      {showMobileSearch && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 sm:hidden">
          <div className="flex items-center gap-2 p-3 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowMobileSearch(false)}
              className="p-2 text-gray-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <form onSubmit={handleMobileSearch} className="flex-1 flex gap-2">
              <input
                type="text"
                value={mobileQuery}
                onChange={(e) => setMobileQuery(e.target.value)}
                placeholder="搜索..."
                autoFocus
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!mobileQuery.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg disabled:opacity-40"
              >
                搜索
              </button>
            </form>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="mx-auto max-w-3xl px-4">
          <div className="flex items-center justify-between h-14 gap-3">
            <Link href="/" className="flex items-center gap-1.5 shrink-0 font-semibold text-gray-900 dark:text-white">
              Idea<span className="text-blue-600">Hub</span>
            </Link>

            <button
              onClick={handlePublish}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition shrink-0"
            >
              发布
            </button>

            <Link href="/community" className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition shrink-0">
              社区
            </Link>

            <Link href="/subscribe" className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition shrink-0">
              订阅
            </Link>

            {/* 桌面端搜索 */}
            <form onSubmit={handleSearch} className="hidden sm:flex items-center gap-2 flex-1 max-w-md">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索..."
                className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 transition"
              />
              <button
                type="submit"
                disabled={!query.trim()}
                className="px-3 py-1.5 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                搜索
              </button>
            </form>

            {/* 移动端搜索按钮 */}
            <button
              onClick={() => setShowMobileSearch(true)}
              className="sm:hidden p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            <Notifications />

            <button
              onClick={handleRefresh}
              disabled={refreshState === 'loading'}
              className={`px-3 py-1.5 text-sm rounded-lg transition shrink-0 ${
                refreshState === 'loading'
                  ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 cursor-wait'
                  : refreshState === 'success'
                  ? 'text-green-600 bg-green-50 dark:bg-green-900/20'
                  : refreshState === 'error'
                  ? 'text-red-600 bg-red-50 dark:bg-red-900/20'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span className="hidden sm:inline">{buttonLabel}</span>
              <svg
                className={`w-4 h-4 sm:hidden ${refreshState === 'loading' ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </header>
    </>
  )
}
