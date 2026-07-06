import { notFound } from 'next/navigation'
import { getCollectionById, getRelatedIdeas } from '@/lib/store'
import IdeaCard from '@/components/IdeaCard'
import Link from 'next/link'

interface Props {
  params: { id: string }
}

export const dynamic = 'force-dynamic'

export function generateMetadata({ params }: Props) {
  return { title: `需求集合 - IdeaHub` }
}

export default async function CollectionPage({ params }: Props) {
  const result = await getCollectionById(params.id)
  if (!result) notFound()

  const { collection, ideas } = result
  const relatedIdeas = (await getRelatedIdeas(collection.category, undefined, 5)).filter(
    i => !i.collectionId || i.collectionId !== collection.id
  )

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 text-xs text-gray-400 dark:text-gray-500">
        <Link href="/" className="hover:text-blue-500 transition">首页</Link>
        <span className="mx-1">/</span>
        <span className="text-gray-600 dark:text-gray-300">集合</span>
      </nav>

      {/* Collection header */}
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

      {/* Ideas in collection */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {ideas.map(idea => (
          <IdeaCard key={idea.id} idea={idea} />
        ))}
      </div>

      {/* Related */}
      {relatedIdeas.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            相关需求
          </h2>
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
