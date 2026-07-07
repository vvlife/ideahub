// ── 广告/垃圾内容过滤 ──────────────────────────────────────────

// 广告关键词列表
const AD_KEYWORDS = [
  // 推广营销
  '推广', '营销', '引流', '变现', '赚钱', '副业', '兼职',
  '招商', '加盟', '代理', '分销', '裂变', '获客',
  // 优惠促销
  '优惠', '折扣', '特价', '秒杀', '限时', '免费领', '0元',
  '盖楼送', '抽奖', '送礼品', '送激活码', '送余额',
  // 联系方式
  '微信', 'QQ', 'qq', '加群', '扫码', '二维码',
  '联系我', '私信', '加好友', '加v', '加V',
  // 诱导点击
  '点击链接', '点击查看', '速来', '先到先得',
  // 金融投资
  '股票', '基金', '理财', '投资', '开户', '低佣', '万1免5',
  // 其他广告
  '广告', '赞助', '合作', '商务',
]

// 非产品需求关键词（技术讨论、BUG、求助等）
const NON_PRODUCT_KEYWORDS = [
  // 代码/技术问题
  'bug', 'BUG', '报错', '错误', '异常', '崩溃', '闪退',
  '编译', '运行不了', '打不开', '无法启动', '安装失败',
  '报错了', '出错了', '不工作', '不起作用', '没反应',
  // 求助/问答
  '求推荐', '求帮助', '求助', '请问', '怎么解决', '怎么办',
  '求一个', '求分享', '有没有', '哪里有', '谁知道',
  // 技术讨论（非产品需求）
  '源码', '开源项目', 'github', '代码', '编程', '算法',
  '数据结构', '框架', '库', '依赖', '版本', '升级',
  '配置', '环境', '部署', '运维', '服务器',
  // 招聘/求职
  '招聘', '求职', '面试', '简历', '内推', '跳槽',
  '薪资', '待遇', 'offer', 'Offer',
]

// 广告标题模式（正则）
const AD_PATTERNS = [
  /\d+折/, // 数字+折
  /\d+%.*off/i, // 折扣
  /立减\d+/, // 立减
  /满\d+减\d+/, // 满减
  /\d+元.*包邮/, // 包邮
  /【.*广告.*】/, // 广告标签
  /【.*推广.*】/,
]

// 判断是否为广告内容
export function isAdContent(title: string, description: string): boolean {
  const text = (title + ' ' + description).toLowerCase()

  // 检查广告关键词
  for (const keyword of AD_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      return true
    }
  }

  // 检查正则模式
  for (const pattern of AD_PATTERNS) {
    if (pattern.test(title)) {
      return true
    }
  }

  return false
}

// 判断是否为非产品需求（技术讨论、BUG、求助等）
export function isNonProductContent(title: string, description: string): boolean {
  const text = (title + ' ' + description).toLowerCase()

  for (const keyword of NON_PRODUCT_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      return true
    }
  }

  return false
}

// 过滤广告和非产品内容
export function filterAds<T extends { title: string; description: string }>(
  items: T[]
): T[] {
  return items.filter(item =>
    !isAdContent(item.title, item.description) &&
    !isNonProductContent(item.title, item.description)
  )
}

// 获取被过滤的原因（用于调试）
export function getFilterReason(title: string, description: string): string | null {
  const text = (title + ' ' + description).toLowerCase()
  
  for (const keyword of AD_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      return `包含广告关键词: ${keyword}`
    }
  }
  
  for (const pattern of AD_PATTERNS) {
    if (pattern.test(title)) {
      return `匹配广告模式: ${pattern}`
    }
  }
  
  return null
}
