import { NextRequest, NextResponse } from 'next/server'
import { webSearch } from '@/lib/web-search'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const JSONBLOB_BASE = 'https://jsonblob.com/api/jsonBlob'
const SUBSCRIPTION_BLOB_ID = process.env.SUBSCRIPTION_BLOB_ID || ''

interface Subscription {
  id: string
  email: string
  topics: string[]
  createdAt: string
  lastSentAt?: string
}

interface PendingIdea {
  id: string
  email: string
  title: string
  description: string
  topic: string
  createdAt: string
  status: 'pending' | 'approved' | 'rejected'
}

async function getSubscriptions(): Promise<Subscription[]> {
  if (!SUBSCRIPTION_BLOB_ID) return []
  try {
    const resp = await fetch(`${JSONBLOB_BASE}/${SUBSCRIPTION_BLOB_ID}`, { cache: 'no-store' })
    if (!resp.ok) return []
    const data = await resp.json()
    return data.subscriptions || []
  } catch {
    return []
  }
}

async function saveSubscriptions(subs: Subscription[]): Promise<boolean> {
  if (!SUBSCRIPTION_BLOB_ID) return false
  try {
    const resp = await fetch(`${JSONBLOB_BASE}/${SUBSCRIPTION_BLOB_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptions: subs }),
    })
    return resp.ok
  } catch {
    return false
  }
}

async function getPendingIdeas(): Promise<PendingIdea[]> {
  if (!SUBSCRIPTION_BLOB_ID) return []
  try {
    const resp = await fetch(`${JSONBLOB_BASE}/${SUBSCRIPTION_BLOB_ID}`, { cache: 'no-store' })
    if (!resp.ok) return []
    const data = await resp.json()
    return data.pendingIdeas || []
  } catch {
    return []
  }
}

async function savePendingIdeas(ideas: PendingIdea[]): Promise<boolean> {
  if (!SUBSCRIPTION_BLOB_ID) return false
  try {
    const resp = await fetch(`${JSONBLOB_BASE}/${SUBSCRIPTION_BLOB_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pendingIdeas: ideas }),
    })
    return resp.ok
  } catch {
    return false
  }
}

function generatePreviewToken(email: string, ideaId: string, ideaTitle: string, description: string): string {
  return Buffer.from(JSON.stringify({ email, ideaId, ideaTitle, description })).toString('base64')
}

async function sendEmail(to: string, subject: string, html: string) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    console.log('[email] No RESEND_API_KEY, skipping')
    return
  }

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'IdeaHub <notify@publishmy.site>',
        to,
        subject,
        html,
      }),
    })
    console.log(`[email] Sent to ${to}: ${subject}`)
  } catch (e) {
    console.error(`[email] Failed to send to ${to}:`, e)
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Daily collection endpoint. Use POST to trigger.' })
}

export async function POST() {
  console.log('[daily] Starting daily collection...')

  const subs = await getSubscriptions()
  if (subs.length === 0) {
    console.log('[daily] No subscriptions found')
    return NextResponse.json({ success: true, message: 'No subscriptions' })
  }

  const pendingIdeas = await getPendingIdeas()
  let newIdeasCount = 0

  // 每个用户只发一个想法
  for (const sub of subs) {
    // 检查是否已经有待处理的想法
    const hasPending = pendingIdeas.some(
      pi => pi.email === sub.email && pi.status === 'pending'
    )
    if (hasPending) {
      console.log(`[daily] ${sub.email} already has pending idea, skipping`)
      continue
    }

    // 随机选一个主题
    const topicId = sub.topics[Math.floor(Math.random() * sub.topics.length)]

    try {
      // 搜索该主题的最新资讯
      const searchResults = await webSearch(`${topicId} 创业 产品 需求`, 3)

      if (searchResults.length === 0) continue

      // 取第一个结果
      const result = searchResults[0]

      // 检查是否已存在
      const exists = pendingIdeas.some(
        pi => pi.email === sub.email && pi.title === result.title
      )
      if (exists) continue

      const ideaId = `idea_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const newIdea: PendingIdea = {
        id: ideaId,
        email: sub.email,
        title: result.title,
        description: result.description,
        topic: topicId,
        createdAt: new Date().toISOString(),
        status: 'pending',
      }

      pendingIdeas.push(newIdea)
      newIdeasCount++

      // 生成预览链接
      const token = generatePreviewToken(sub.email, ideaId, result.title, result.description)
      const previewUrl = `https://ideahub-pearl.vercel.app/preview/${encodeURIComponent(token)}`

      // 发送邮件
      await sendEmail(
        sub.email,
        `新想法：${result.title}`,
        `
          <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #111; margin-bottom: 12px;">${result.title}</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">${result.description}</p>
            <a href="${previewUrl}" style="display: inline-block; padding: 12px 24px; background: #111; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">
              查看产品设计
            </a>
            <p style="color: #999; font-size: 12px; margin-top: 16px;">点击后可预览产品设计，确认后自动生成。</p>
          </div>
        `
      )
    } catch (e) {
      console.error(`[daily] Error processing for ${sub.email}:`, e)
    }
  }

  await savePendingIdeas(pendingIdeas)
  await saveSubscriptions(subs)

  console.log(`[daily] Done. ${newIdeasCount} new ideas sent.`)

  return NextResponse.json({
    success: true,
    subscribers: subs.length,
    newIdeas: newIdeasCount,
  })
}
