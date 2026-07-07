/**
 * Topic configuration for Agently-Daily-News-Collector
 * Define topics to crawl and their update intervals
 */

export interface TopicConfig {
  id: string
  name: string
  keywords: string[]
  category: 'AI工具' | 'SaaS' | '消费' | '教育' | '开发者工具' | '设计' | '出海' | '其他'
  enabled: boolean
  /** Update interval in minutes. Default: 360 (6 hours) */
  intervalMinutes: number
}

export const defaultTopics: TopicConfig[] = [
  {
    id: 'ai-tools',
    name: 'AI工具与应用',
    keywords: ['AI tools', 'AI applications', 'LLM apps', 'AI产品', '人工智能应用'],
    category: 'AI工具',
    enabled: true,
    intervalMinutes: 360,
  },
  {
    id: 'saas-products',
    name: 'SaaS产品动态',
    keywords: ['SaaS products', 'B2B software', 'SaaS创业', '企业软件'],
    category: 'SaaS',
    enabled: true,
    intervalMinutes: 360,
  },
  {
    id: 'developer-tools',
    name: '开发者工具',
    keywords: ['developer tools', 'programming tools', 'DevTools', '开发者工具', '编程工具'],
    category: '开发者工具',
    enabled: true,
    intervalMinutes: 360,
  },
  {
    id: 'product-launches',
    name: '新产品发布',
    keywords: ['new product launch', 'startup launch', '产品发布', '新产品'],
    category: '其他',
    enabled: true,
    intervalMinutes: 480,
  },
  {
    id: 'design-tools',
    name: '设计工具',
    keywords: ['design tools', 'UI/UX tools', '设计工具', '设计软件'],
    category: '设计',
    enabled: true,
    intervalMinutes: 720,
  },
  {
    id: 'education-tech',
    name: '教育科技',
    keywords: ['edtech', 'online learning', '教育科技', '在线学习'],
    category: '教育',
    enabled: true,
    intervalMinutes: 720,
  },
  {
    id: 'global-products',
    name: '出海产品',
    keywords: ['global products', 'international startup', '出海产品', '跨境产品'],
    category: '出海',
    enabled: true,
    intervalMinutes: 720,
  },
  {
    id: 'consumer-tech',
    name: '消费科技',
    keywords: ['consumer tech', 'consumer apps', '消费科技', '生活服务'],
    category: '消费',
    enabled: true,
    intervalMinutes: 720,
  },
]

export function getEnabledTopics(): TopicConfig[] {
  return defaultTopics.filter(t => t.enabled)
}

export function getTopicById(id: string): TopicConfig | undefined {
  return defaultTopics.find(t => t.id === id)
}
