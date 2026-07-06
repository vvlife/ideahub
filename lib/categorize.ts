import type { Category } from './types'

// ── Keyword → Category mapping ─────────────────────────────────
const categoryKeywords: Record<Category, string[]> = {
  'AI工具': [
    'ai', 'gpt', 'llm', 'chatgpt', 'claude', 'gemini', 'openai', '人工智能',
    '机器学习', '深度学习', 'nlp', 'aigc', '生成式', '智能', '模型',
    'prompt', 'embedding', 'rag', 'agent', 'copilot', 'midjourney',
  ],
  'SaaS': [
    'saas', 'subscription', 'crm', 'erp', 'oa', '协作', '项目管理',
    'notion', 'slack', '线性', '飞书', '钉钉', '企微', '低代码',
    '无代码', 'low-code', 'no-code', 'retotal', 'appsmith',
  ],
  '消费': [
    '购物', '电商', '消费', '生活方式', '健康', '健身', '美食',
    '旅游', '出行', '社交', '直播', '短视频', '抖音', '小红书',
    '大众点评', '美团', '淘宝', '拼多多',
  ],
  '教育': [
    '教育', '学习', '课程', '培训', '考试', '考研', '留学',
    'k12', '编程学习', '语言学习', '题库', '错题', '辅导',
    'tutor', 'edtech', 'mooc', 'coursera',
  ],
  '开发者工具': [
    '代码', 'coding', 'programming', '开发', 'debug', 'ide',
    'vscode', 'git', 'github', 'gitlab', 'ci/cd', 'jenkins',
    'docker', 'kubernetes', 'devops', 'sdk', 'api', '框架',
    'compiler', 'lint', '测试', 'test', '重构', 'refactor',
  ],
  '设计': [
    '设计', 'design', 'ui', 'ux', 'figma', 'sketch', 'adobe',
    'photoshop', 'illustrator', '原型', 'wireframe', 'mockup',
    '配色', '字体', 'icon', '插画', '品牌', 'branding',
  ],
  '出海': [
    '出海', 'global', 'international', 'overseas', 'stripe',
    'payment', '支付', '收款', '合规', 'compliance', 'tax',
    'seo', '多语言', 'i18n', 'localization', '本地化',
    'paddle', 'lemon squeezy', '独立开发者',
  ],
  '其他': [],
}

export function categorize(title: string, description: string): Category {
  const text = `${title} ${description}`.toLowerCase()
  
  const scores: Record<string, number> = {}
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (category === '其他') continue
    scores[category] = 0
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) {
        scores[category] += 1
      }
    }
  }
  
  // Find the category with highest score
  let bestCategory: Category = '其他'
  let bestScore = 0
  for (const [category, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score
      bestCategory = category as Category
    }
  }
  
  return bestCategory
}
