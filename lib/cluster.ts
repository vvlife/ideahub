import type { Idea, Collection, Category } from './types'

// ── Tokenize: extract meaningful keywords from text ────────────
function tokenize(text: string): Set<string> {
  const lower = text.toLowerCase()
  // Extract Chinese words (2+ chars) and English words (2+ chars)
  const chineseMatches = lower.match(/[\u4e00-\u9fa5]{2,}/g) || []
  const englishMatches = lower.match(/[a-z]{2,}/g) || []
  
  // Filter out common stop words
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'can', 'need',
    'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
    'with', 'by', 'from', 'about', 'as', 'into', 'like', 'through',
    'after', 'over', 'between', 'out', 'against', 'during', 'without',
    'before', 'under', 'around', 'among',
    '有没有', '求推荐', '求一个', '如何', '怎么', '怎样',
    '什么', '为什么', '哪个', '哪些', '帮忙', '求助',
    '请问', '想要', '需要', '希望', '寻找',
    'show', 'ask', 'just', 'this', 'that', 'it', 'they',
    'them', 'their', 'there', 'here', 'where', 'when',
    'which', 'who', 'what', 'how', 'why', 'anyone',
    'looking', 'for', 'somebody', 'make', 'this',
  ])
  
  const tokens = new Set<string>()
  for (const w of [...chineseMatches, ...englishMatches]) {
    if (!stopWords.has(w)) {
      tokens.add(w)
    }
  }
  return tokens
}

// ── Jaccard similarity ─────────────────────────────────────────
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  
  let intersection = 0
  for (const item of a) {
    if (b.has(item)) intersection++
  }
  
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

// ── Extract common keywords for collection title ───────────────
function extractCommonKeywords(ideas: Idea[]): string[] {
  const tokenCounts = new Map<string, number>()
  
  for (const idea of ideas) {
    const tokens = tokenize(`${idea.title} ${idea.description}`)
    for (const token of tokens) {
      tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1)
    }
  }
  
  // Sort by frequency, take top ones that appear in multiple ideas
  const sorted = Array.from(tokenCounts.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([token]) => token)
  
  return sorted
}

// ── Generate collection title ──────────────────────────────────
function generateCollectionTitle(ideas: Idea[]): string {
  const keywords = extractCommonKeywords(ideas)
  if (keywords.length > 0) {
    return keywords.join(' · ') + ' 相关需求'
  }
  // Fallback: use the first idea's title, truncated
  const firstTitle = ideas[0].title
  return firstTitle.length > 20 ? firstTitle.slice(0, 20) + '...' : firstTitle
}

// ── Generate collection summary ────────────────────────────────
function generateCollectionSummary(ideas: Idea[]): string {
  const platforms = [...new Set(ideas.map(i => i.platform))]
  const platformText = platforms.length > 1
    ? `${platforms.length}个平台`
    : platforms[0]
  
  const totalHeat = ideas.reduce((sum, i) => sum + i.heat, 0)
  
  // Use the most common category
  const categoryCounts = new Map<string, number>()
  for (const idea of ideas) {
    categoryCounts.set(idea.category, (categoryCounts.get(idea.category) || 0) + 1)
  }
  const topCategory = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '其他'
  
  return `来自${platformText}的${ideas.length}条相关需求，累计关注${totalHeat}+。` +
    `核心话题涉及：${ideas.slice(0, 2).map(i => i.title.slice(0, 15)).join('；')}等。`
}

// ── Cluster ideas into collections ─────────────────────────────
export function clusterIdeas(
  ideas: Idea[],
  threshold: number = 0.4
): { ideas: Idea[]; collections: Collection[] } {
  if (ideas.length === 0) return { ideas: [], collections: [] }
  
  // Pre-compute token sets
  const tokenSets = ideas.map(idea => tokenize(`${idea.title} ${idea.description}`))
  
  // Union-Find structure
  const parent: number[] = ideas.map((_, i) => i)
  
  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]
      x = parent[x]
    }
    return x
  }
  
  function union(x: number, y: number) {
    const px = find(x)
    const py = find(y)
    if (px !== py) parent[px] = py
  }
  
  // Compare all pairs
  for (let i = 0; i < ideas.length; i++) {
    for (let j = i + 1; j < ideas.length; j++) {
      const sim = jaccardSimilarity(tokenSets[i], tokenSets[j])
      if (sim >= threshold) {
        union(i, j)
      }
    }
  }
  
  // Group by root
  const groups = new Map<number, number[]>()
  for (let i = 0; i < ideas.length; i++) {
    const root = find(i)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root)!.push(i)
  }
  
  // Build collections for groups with 2+ ideas
  const updatedIdeas: Idea[] = []
  const collections: Collection[] = []
  let collectionCounter = 0
  
  for (const indices of groups.values()) {
    if (indices.length >= 2) {
      // Create a collection
      const collectionId = `col_${Date.now()}_${collectionCounter++}`
      const groupIdeas = indices.map(i => ideas[i])
      
      // Determine category from the group
      const categoryCounts = new Map<string, number>()
      for (const idea of groupIdeas) {
        categoryCounts.set(idea.category, (categoryCounts.get(idea.category) || 0) + 1)
      }
      const category = Array.from(categoryCounts.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] as Category || '其他'
      
      const collection: Collection = {
        id: collectionId,
        title: generateCollectionTitle(groupIdeas),
        summary: generateCollectionSummary(groupIdeas),
        category,
        ideaIds: groupIdeas.map(i => i.id),
        createdAt: new Date().toISOString(),
      }
      
      // Assign collectionId to ideas
      for (const idea of groupIdeas) {
        updatedIdeas.push({ ...idea, collectionId })
      }
      collections.push(collection)
    } else {
      // Standalone idea
      updatedIdeas.push(ideas[indices[0]])
    }
  }
  
  return { ideas: updatedIdeas, collections }
}
