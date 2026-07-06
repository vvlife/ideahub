export type Platform =
  | 'weibo'
  | 'zhihu'
  | 'v2ex'
  | 'producthunt'
  | 'reddit'
  | 'twitter'
  | 'github'
  | 'hackernews'
  | 'douyin'
  | 'xiaohongshu'

export type Category =
  | 'AI工具'
  | 'SaaS'
  | '消费'
  | '教育'
  | '开发者工具'
  | '设计'
  | '出海'
  | '其他'

export interface Idea {
  id: string
  title: string
  description: string
  platform: Platform
  sourceUrl: string
  publishedAt: string // ISO date string
  heat: number // discussion count / upvotes
  category: Category
  collectionId?: string
}

export interface Collection {
  id: string
  title: string
  summary: string
  category: Category
  ideaIds: string[]
  createdAt: string // ISO date string
}

export interface FeedResponse {
  ideas: Idea[]
  collections: Collection[]
  total: number
}

export interface CollectionsResponse {
  collections: Collection[]
  total: number
}

export interface SearchResponse {
  results: (Idea | CollectionResult)[]
  total: number
}

export interface CollectionResult {
  type: 'collection'
  id: string
  title: string
  summary: string
  category: Category
  ideaCount: number
}

export interface CrawlResponse {
  success: boolean
  message: string
  crawledAt: string
  newItems: number
  stats?: CrawlStats
}

export interface CrawlStats {
  totalFetched: number
  byPlatform: Record<string, number>
  collectionsFormed: number
  errors: string[]
}

export interface RawIdea {
  title: string
  description: string
  platform: Platform
  sourceUrl: string
  publishedAt: string
  heat: number
}

export interface StorageData {
  ideas: Idea[]
  collections: Collection[]
  lastCrawlAt: string | null
}
