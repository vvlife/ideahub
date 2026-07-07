'use client'

import { useState, useEffect } from 'react'
import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'
import IdeaCard from '@/components/IdeaCard'
import type { Idea, Collection } from '@/lib/types'

const CACHE_KEY = 'ideahub_cache'

export default function CollectionPage() {
  const params = useParams()
  const id = params.id as string

  const [collection, setCollection] = useState<Collection | null>(null)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [relatedIdeas, setRelatedIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const data = JSON.parse(cached)
        const allIdeas: Idea[] = data.ideas || []
        const allCols: Collection[] = data.collections || []
        const col = allCols.find(c => c.id === id)
        if (col) {
          setCollection(col)
          const colIdeas = allIdeas.filter(i => i.collectionId === id)
          setIdeas(colIdeas)
          const related = allIdeas
            .filter(i => i.category === col.category && (!i.collectionId || i.collectionId !== id))
            .sort((a, b) => b.heat - a.heat)
            .slice(0, 5)
          setRelatedIdeas(related)
        }
      }
    } catch {}
    setLoading(false)
  }, [id])

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300 dark:border-gray-600"></div>
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-4">集合不存在或已过期</p>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition">
          返回首页
        </Link>
      </div>
    )
  }

  return (
    <div>
      <nav className="mb-4 text-xs text-gray-400 dark:text-gray-500">
        <Link href="/" className="hover:text-blue-500 transition">首页</Link>
        <span className="mx-1">/</span>
        <span className="text-gray-600 dark:text-gray-300">集合</span>
      </nav>

      <div className="mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            需求集合
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">{collection.category}</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
          {collection.title}
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {collection.summary}
        </p>
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
          共 {ideas.length} 条相关需求
        </p>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {ideas.map(idea => (
          <IdeaCard key={idea.id} idea={idea} />
        ))}
      </div>

      {relatedIdeas.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-100 dark:divide-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">相关需求</h2>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {relatedIdeas.map(idea => (
              <IdeaCard key={idea.id} idea={idea} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回首页
        </Link>
      </div>
    </div>
  )
}
