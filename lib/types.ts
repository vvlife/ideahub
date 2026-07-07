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
  | 'other'

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
  filteredCount: number
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

// ── Product 类型 ───────────────────────────────────────────────

export interface ProductVersion {
  id: string
  version: number         // 版本号，从 1 开始自增
  html: string            // 该版本的自包含可运行 HTML
  prompt?: string         // 生成/调整该版本时给出的要求（v1 为初始方案）
  createdAt: string
}

export interface Product {
  id: string
  ideaId: string          // 关联的需求 ID
  ideaTitle: string       // 关联的需求标题
  name: string            // 产品名称
  tagline: string         // 一句话描述
  problem: string         // 问题分析
  solution: string        // 解决方案
  targetUsers: string     // 目标用户
  coreFeatures: string[]  // 核心功能列表
  techStack: string[]     // 技术栈建议
  monetization: string    // 商业模式
  competitors: string     // 竞品分析
  differentiator: string  // 差异化优势
  mvp: string             // MVP 方案
  createdAt: string       // 创建时间
  status: 'draft' | 'confirmed'
  generatedHtml?: string  // 当前版本的可运行 HTML
  versions?: ProductVersion[]   // 版本历史
  currentVersion?: number       // 当前展示的版本号
  deployUrl?: string            // 部署到公网后的可访问链接
  deployedAt?: string           // 最近一次部署时间
  votes?: number                // 社区投票数
  votedBy?: string[]            // 投票用户列表（用于去重）
}

export interface CommunityProduct extends ProductSummary {
  votes: number
  votedBy: string[]
  rank: number
}

export interface ProductSummary {
  id: string
  name: string
  tagline: string
  ideaTitle: string
  createdAt: string
}

// ── Brainstorm 类型 ────────────────────────────────────────────

export interface BrainstormRequirement {
  id: string
  sessionId: string
  author: string          // 参与者昵称
  content: string         // 需求/反馈内容
  type: 'requirement' | 'feedback' | 'suggestion'
  createdAt: string
}

export interface BrainstormSession {
  id: string
  productId: string       // 关联的产品 ID
  productTitle: string    // 产品名称（冗余，方便展示）
  status: 'active' | 'closed'
  participants: string[]  // 参与者昵称列表
  requirementCount: number
  mergedRequirements?: string  // 合并后的需求文本（关闭时生成）
  createdAt: string
  closedAt?: string
}
