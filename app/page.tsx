'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Idea, Collection, FeedResponse } from '@/lib/types'
import Timeline from '@/components/Timeline'

export default function HomePage() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const resp = await fetch('/api/feed', { cache: 'no-store' })
      if (!resp.ok) throw new Error('Failed to fetch feed')
      const data: FeedResponse = await resp.json()
      setIdeas(data.ideas || [])
      setCollections(data.collections || [])
      setError(null)
    } catch (err: any) {
      setError(err?.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading && ideas.length === 0) {
    return (
      <>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            创业需求时间线
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            搜集社交媒体上的热点需求，发现创业机会
          </p>
        </div>
        <div className="py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300 dark:border-gray-600"></div>
          <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">加载中...</p>
        </div>
      </>
    )
  }

  if (error && ideas.length === 0) {
    return (
      <>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            创业需求时间线
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            搜集社交媒体上的热点需求，发现创业机会
          </p>
        </div>
        <div className="py-20 text-center">
          <p className="text-4xl mb-4">📦</p>
          <p className="text-gray-500 dark:text-gray-400 mb-2">暂无数据</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
            点击右上角「刷新」按钮抓取最新需求
          </p>
          <button
            onClick={fetchData}
            className="px-4 py-2 text-sm font-medium rounded-full bg-blue-500 text-white hover:bg-blue-600 transition"
          >
            重新加载
          </button>
        </div>
      </>
    )
  }

  if (ideas.length === 0 && collections.length === 0) {
    return (
      <>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            创业需求时间线
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            搜集社交媒体上的热点需求，发现创业机会
          </p>
        </div>
        <div className="py-20 text-center">
          <p className="text-4xl mb-4">💡</p>
          <p className="text-gray-500 dark:text-gray-400 mb-2">暂无需求数据</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            点击右上角「刷新」按钮，从各平台抓取最新需求
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          创业需求时间线
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          搜集社交媒体上的热点需求，发现创业机会
        </p>
      </div>
      <Timeline ideas={ideas} collections={collections} />
    </>
  )
}
