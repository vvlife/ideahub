import type { Category, Platform } from './types'

// ── Platform metadata ──────────────────────────────────────────
export const platformMeta: Record<Platform, { label: string; color: string; bgClass: string; textClass: string }> = {
  weibo:        { label: '微博',    color: '#E6162D', bgClass: 'bg-red-100 dark:bg-red-900/30',       textClass: 'text-red-600 dark:text-red-400' },
  zhihu:        { label: '知乎',    color: '#0084FF', bgClass: 'bg-blue-100 dark:bg-blue-900/30',     textClass: 'text-blue-600 dark:text-blue-400' },
  v2ex:         { label: 'V2EX',   color: '#333333', bgClass: 'bg-gray-100 dark:bg-gray-800',         textClass: 'text-gray-700 dark:text-gray-300' },
  producthunt:  { label: 'PH',     color: '#DA552F', bgClass: 'bg-orange-100 dark:bg-orange-900/30',  textClass: 'text-orange-600 dark:text-orange-400' },
  reddit:       { label: 'Reddit', color: '#FF4500', bgClass: 'bg-orange-100 dark:bg-orange-900/30',  textClass: 'text-orange-600 dark:text-orange-400' },
  twitter:      { label: 'X',      color: '#1DA1F2', bgClass: 'bg-sky-100 dark:bg-sky-900/30',        textClass: 'text-sky-600 dark:text-sky-400' },
  github:       { label: 'GitHub', color: '#181717', bgClass: 'bg-gray-100 dark:bg-gray-800',         textClass: 'text-gray-700 dark:text-gray-300' },
  hackernews:   { label: 'HN',     color: '#FF6600', bgClass: 'bg-orange-100 dark:bg-orange-900/30',  textClass: 'text-orange-600 dark:text-orange-400' },
  douyin:       { label: '抖音',   color: '#000000', bgClass: 'bg-gray-100 dark:bg-gray-800',         textClass: 'text-gray-700 dark:text-gray-300' },
  xiaohongshu:  { label: '小红书', color: '#FE2C55', bgClass: 'bg-pink-100 dark:bg-pink-900/30',      textClass: 'text-pink-600 dark:text-pink-400' },
}

// ── Categories ─────────────────────────────────────────────────
export const categories: Category[] = ['AI工具', 'SaaS', '消费', '教育', '开发者工具', '设计', '出海', '其他']
