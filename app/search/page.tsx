'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Idea } from '@/lib/types'

function SearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const [results, setResults] = useState<Idea[]>([])
  const [loading, setLoading] = useState(false)
  const [inputValue, setInputValue] = useState(query)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const resp = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' })
      if (resp.ok) {
        const data = await resp.json()
        setResults(data.results || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    setInputValue(query)
    if (query) doSearch(query)
  }, [query, doSearch])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      router.push(`/search?q=${encodeURIComponent(inputValue.trim())}`)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/95 backdrop-blur-lg border-b border-white/10 px-4 py-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="搜索需求..."
            className="flex-1 px-4 py-2 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition"
            autoFocus
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="px-4 py-2 text-sm font-medium text-black bg-white rounded-xl hover:bg-white/90 transition disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
          >
            搜索
          </button>
        </form>
      </div>

      <div className="px-4 py-4">
        {!query ? (
          <div className="py-12 text-center">
            <p className="text-white/40 text-sm">输入关键词搜索需求</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {['AI写作', '代码助手', 'SaaS工具', '出海产品', '记账'].map(tag => (
                <Link
                  key={tag}
                  href={`/search?q=${encodeURIComponent(tag)}`}
                  className="px-3 py-1.5 text-xs text-white/50 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:text-white/80 transition"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        ) : loading ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            <p className="text-xs text-white/40">搜索中...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-white/40 text-sm">没有找到相关内容</p>
            <Link href="/create" className="text-xs text-pink-400 mt-2 inline-block hover:text-pink-300 transition">
              试试直接创作 →
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-white/40 mb-3">找到 {results.length} 条结果</p>
            <div className="space-y-2">
              {results.map(i => (
                <Link
                  key={`idea-${i.id}`}
                  href="/create"
                  className="block p-3 bg-white/[0.03] rounded-xl border border-white/5 hover:border-white/10 transition"
                >
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 text-[10px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded mt-0.5">
                      {i.platform || '社区'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white/90 line-clamp-1">{i.title}</h3>
                      {i.description && (
                        <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{i.description}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}
