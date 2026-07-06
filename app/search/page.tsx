import { search } from '@/lib/store'
import SearchBar from '@/components/SearchBar'
import IdeaCard from '@/components/IdeaCard'
import CollectionCard from '@/components/CollectionCard'
import Link from 'next/link'

interface Props {
  searchParams: { q?: string }
}

export const dynamic = 'force-dynamic'

export function generateMetadata({ searchParams }: Props) {
  return { title: `${searchParams.q || '搜索'} - IdeaHub` }
}

export default async function SearchPage({ searchParams }: Props) {
  const query = searchParams.q || ''
  const results = query ? await search(query) : { results: [], total: 0 }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          搜索需求
        </h1>
        <SearchBar initialQuery={query} autoFocus={!query} />
      </div>

      {query && (
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            找到 <span className="font-semibold text-gray-900 dark:text-gray-100">{results.total}</span> 条与
            「<span className="font-semibold text-gray-900 dark:text-gray-100">{query}</span>」相关的结果
          </p>

          {results.total === 0 ? (
            <div className="py-20 text-center">
              <p className="text-4xl mb-4">🔍</p>
              <p className="text-gray-400 dark:text-gray-500">没有找到相关需求</p>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-2">
                试试其他关键词，或
                <Link href="/" className="text-blue-500 hover:underline ml-1">返回首页浏览</Link>
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {results.results.map((item: any) =>
                item.type === 'collection' ? (
                  <CollectionCard key={item.id} collection={{
                    id: item.id,
                    title: item.title,
                    summary: item.summary,
                    category: item.category,
                    ideaIds: [],
                    createdAt: new Date().toISOString(),
                  }} />
                ) : (
                  <IdeaCard key={item.id} idea={item} />
                )
              )}
            </div>
          )}
        </div>
      )}

      {!query && (
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
      )}
    </div>
  )
}
