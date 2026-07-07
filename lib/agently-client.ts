/**
 * Agently News Collector Client
 * Calls the Python agently_server.py for news collection and search
 */

const AGENTLY_SERVER = process.env.AGENTLY_SERVER_URL || 'http://127.0.0.1:8766'

interface AgentlyIdea {
  title: string
  description: string
  platform: string
  sourceUrl: string
  publishedAt: string
  heat: number
  category: string
  column?: string
  topic?: string
}

interface CollectResponse {
  success: boolean
  topic: string
  ideas: AgentlyIdea[]
  raw_markdown: string
  collected_at: string
}

interface SearchResponse {
  success: boolean
  query: string
  ideas: AgentlyIdea[]
  total: number
}

interface ScheduledResponse {
  success: boolean
  topics: string[]
  ideas: AgentlyIdea[]
  total: number
  collected_at: string
}

export async function isAgentlyAvailable(): Promise<boolean> {
  try {
    const resp = await fetch(`${AGENTLY_SERVER}/health`, {
      signal: AbortSignal.timeout(3000),
    })
    return resp.ok
  } catch {
    return false
  }
}

export async function collectByTopic(
  topic: string,
  maxItems: number = 10
): Promise<CollectResponse> {
  const resp = await fetch(`${AGENTLY_SERVER}/collect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, max_items: maxItems }),
    signal: AbortSignal.timeout(120000),
  })
  if (!resp.ok) throw new Error(`Agently collect error: ${resp.status}`)
  return resp.json()
}

export async function collectScheduled(
  topics: string[]
): Promise<ScheduledResponse> {
  const resp = await fetch(`${AGENTLY_SERVER}/collect/scheduled`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topics }),
    signal: AbortSignal.timeout(300000),
  })
  if (!resp.ok) throw new Error(`Agently scheduled collect error: ${resp.status}`)
  return resp.json()
}

export async function searchAgently(
  query: string,
  maxResults: number = 8,
  timelimit: string = 'd'
): Promise<SearchResponse> {
  const resp = await fetch(`${AGENTLY_SERVER}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, max_results: maxResults, timelimit }),
    signal: AbortSignal.timeout(60000),
  })
  if (!resp.ok) throw new Error(`Agently search error: ${resp.status}`)
  return resp.json()
}
