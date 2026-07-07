'use client'

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import IdeaCard from '@/components/IdeaCard'
import CollectionCard from '@/components/CollectionCard'
import Link from 'next/link'
import type { Idea, Collection } from '@/lib/types'

const CACHE_KEY = 'ideahub_cache'

function SearchContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [agentlyLoading, setAgentlyLoading] = useState(false)
  const [agentlyResults, setAgentlyResults] = useState<Idea[]>([])
  const [searchMode, setSearchMode] = useState<'local' | 'agently'>('local')

  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const data = JSON.parse(cached)
        setIdeas(data.ideas || [])
        setCollections(data.collections || [])
      }
    } catch {}
    setLoading(false)
  }, [])

  // Agently web search
  const searchAgently = useCallback(async (q: string) => {
    if (!q.trim()) return
    setAgentlyLoading(true)
    try {
      const resp = await fetch(`/api/search?q=${encodeURIComponent(q)}&source=agently`, {
        cache: 'no-store',
      })
      if (resp.ok) {
        const data = await resp.json()
        setAgentlyResults(data.results || [])
      }
    } catch {}
    setAgentlyLoading(false)
  }, [])

  useEffect(() => {
    if (searchMode === 'agently' && query) {
      searchAgently(query)
    }
  }, [searchMode, query, searchAgently])

  const localResults = useMemo(() => {
    if (!query.trim()) return { ideas: [], collections: [] }
    const q = query.toLowerCase().trim()
    return {
      ideas: ideas.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
      ),
      collections: collections.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      ),
    }
  }, [query, ideas, collections])

  const total = searchMode === 'agently'
    ? agentlyResults.length
    : localResults.ideas.length + localResults.collections.length

  const displayIdeas = searchMode === 'agently' ? agentlyResults : localResults.ideas
  const displayCollections = searchMode === 'agently' ? [] : localResults.collections

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300 dark:border-gray-600"></div>
      </div>
    )
  }

  if (!query) {
    return (
      <div className="py-20 text-center">
        <p className="text-4xl mb-4">💡</p>
        <p className="text-gray-400 dark:text-gray-500">输入关键词搜索创业需求</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {['AI写作', '代码审查', 'SaaS', '出海', '无代码', 'AI客服'].map(tag => (
            <Link
              key={tag}
              href={`/search?q=${encodeURIComponent(tag)}`}
              className="px-3 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              {tag}
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          搜索「{query}」
        </h1>
        {/* Search mode toggle */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setSearchMode('local')}
            className={`px-3 py-1 text-xs rounded-full transition ${
              searchMode === 'local'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            本地数据
          </button>
          <button
            onClick={() => setSearchMode('agently')}
            className={`px-3 py-1 text-xs rounded-full transition ${
              searchMode === 'agently'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            网络搜索
          </button>
        </div>
      </div>

      {agentlyLoading && searchMode === 'agently' ? (
        <div className="py-12 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-300 dark:border-gray-600"></div>
          <p className="mt-3 text-sm text-gray-400">正在通过 Agently 搜索...</p>
        </div>
      ) : total === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-gray-400 dark:text-gray-500">没有找到相关需求</p>
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-2">
            试试其他关键词，或
            <Link href="/" className="text-blue-500 hover:underline ml-1">返回首页浏览</Link>
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            找到 <span className="font-semibold text-gray-900 dark:text-gray-100">{total}</span> 条结果
            {searchMode === 'agently' && (
              <span className="ml-2 text-xs text-blue-500">via Agently</span>
            )}
          </p>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {displayCollections.map(c => (
              <CollectionCard key={`col-${c.id}`} collection={c} />
            ))}
            {displayIdeas.map(i => (
              <IdeaCard key={`idea-${i.id}`} idea={i} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300 dark:border-gray-600"></div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}
