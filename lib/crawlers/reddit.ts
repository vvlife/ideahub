import type { RawIdea, Platform } from '../types'

// ── Reddit: r/SomebodyMakeThis and r/Entrepreneur ──────────────
export async function crawlReddit(): Promise<RawIdea[]> {
  const subreddits = ['SomebodyMakeThis', 'Entrepreneur']
  const results: RawIdea[] = []
  
  await Promise.all(subreddits.map(async (sub) => {
    try {
      const resp = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=15`, {
        headers: {
          'User-Agent': 'IdeaHub/1.0 (https://ideahub.vercel.app)',
        },
        signal: AbortSignal.timeout(10000),
      })
      
      if (!resp.ok) throw new Error(`Reddit r/${sub} returned ${resp.status}`)
      
      const data = await resp.json() as {
        data: {
          children: Array<{
            data: {
              title: string
              selftext: string
              permalink: string
              score: number
              num_comments: number
              created_utc: number
            }
          }>
        }
      }
      
      for (const child of data.data.children) {
        const post = child.data
        if (!post.title) continue
        
        // Skip stickied/meta posts
        if (post.title.startsWith('[Mod') || post.title.startsWith('MOD:')) continue
        
        results.push({
          title: post.title,
          description: post.selftext
            ? post.selftext.replace(/<[^>]*>/g, '').slice(0, 200)
            : post.title,
          platform: 'reddit' as Platform,
          sourceUrl: `https://www.reddit.com${post.permalink}`,
          publishedAt: new Date(post.created_utc * 1000).toISOString(),
          heat: post.num_comments || post.score || 0,
        })
      }
    } catch (err) {
      // Individual subreddit failure is fine
      console.error(`Reddit r/${sub} failed:`, err)
    }
  }))
  
  return results
}
