'use client'

import { useState, useMemo } from 'react'
import type { Idea, Collection, Category } from '@/lib/types'
import IdeaCard from './IdeaCard'
import CollectionCard from './CollectionCard'
import CategoryFilter from './CategoryFilter'

interface Props {
  ideas: Idea[]
  collections: Collection[]
}

export default function Timeline({ ideas, collections }: Props) {
  const [selectedCat, setSelectedCat] = useState<Category | 'all'>('all')

  const filteredIdeas = useMemo(() => {
    if (selectedCat === 'all') return ideas
    return ideas.filter(i => i.category === selectedCat)
  }, [ideas, selectedCat])

  const filteredCollections = useMemo(() => {
    if (selectedCat === 'all') return collections
    return collections.filter(c => c.category === selectedCat)
  }, [collections, selectedCat])

  // Merge ideas and collections, sort by time, ideas first
  const timeline = useMemo(() => {
    const items: Array<
      | { type: 'idea'; data: Idea; sortTime: string }
      | { type: 'collection'; data: Collection; sortTime: string }
    > = [
      ...filteredIdeas.map(i => ({ type: 'idea' as const, data: i, sortTime: i.publishedAt })),
      ...filteredCollections.map(c => ({ type: 'collection' as const, data: c, sortTime: c.createdAt })),
    ]
    return items.sort((a, b) => {
      const diff = new Date(b.sortTime).getTime() - new Date(a.sortTime).getTime()
      if (diff !== 0) return diff
      // 同一时间，idea 排在 collection 前面
      return a.type === 'idea' ? -1 : 1
    })
  }, [filteredIdeas, filteredCollections])

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, typeof timeline> = {}
    timeline.forEach(item => {
      const date = new Date(item.sortTime)
      const key = formatDateKey(date)
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    })
    return Object.entries(groups)
  }, [timeline])

  return (
    <div>
      <CategoryFilter selected={selectedCat} onSelect={setSelectedCat} />

      {timeline.length === 0 ? (
        <div className="py-20 text-center text-gray-400 dark:text-gray-500">
          <p className="text-lg">暂无该分类的需求</p>
        </div>
      ) : (
        <div className="mt-4">
          {grouped.map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <div className="sticky top-14 z-40 py-2 bg-white dark:bg-gray-950">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
                  {dateLabel}
                </p>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((item) =>
                  item.type === 'idea' ? (
                    <IdeaCard key={`idea-${item.data.id}`} idea={item.data} />
                  ) : (
                    <CollectionCard key={`col-${item.data.id}`} collection={item.data} />
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatDateKey(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (target.getTime() === today.getTime()) return '今天'
  if (target.getTime() === yesterday.getTime()) return '昨天'

  return `${date.getMonth() + 1}月${date.getDate()}日`
}
