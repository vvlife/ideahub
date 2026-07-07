import { NextRequest, NextResponse } from 'next/server'
import { webSearch } from '@/lib/web-search'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const JSONBLOB_BASE = 'https://jsonblob.com/api/jsonBlob'
const SUBSCRIPTION_BLOB_ID = process.env.SUBSCRIPTION_BLOB_ID || ''
const PRODUCTS_BLOB_ID = process.env.JSONBLOB_ID || ''
const AGNES_API_KEY = process.env.AGNES_API_KEY || ''
const AGNES_BASE_URL = 'https://apihub.agnes-ai.com/v1'

interface Subscription {
  id: string
  email: string
  topics: string[]
  createdAt: string
  lastSentAt?: string
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

async function sendEmail(to: string, subject: string, html: string) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    console.log('[email] No RESEND_API_KEY, skipping')
    return false
  }

  try {
    const resp = await fetch('https://api.resend.com/emails', {
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
    const ok = resp.ok
    console.log(`[email] Sent to ${to}: ${subject} (${ok ? 'success' : 'failed'})`)
    return ok
  } catch (e) {
    console.error(`[email] Failed to send to ${to}:`, e)
    return false
  }
}

async function generateProduct(ideaTitle: string, ideaDescription: string) {
  if (!AGNES_API_KEY) {
    throw new Error('AGNES_API_KEY not configured')
  }

  const prompt = `你是一个资深产品设计师。根据以下需求，生成一个简洁的产品方案：

需求：${ideaTitle}
描述：${ideaDescription}

请输出 JSON 格式：
{
  "name": "产品名称",
  "tagline": "一句话描述",
  "problem": "要解决的问题",
  "solution": "解决方案",
  "targetUsers": "目标用户",
  "coreFeatures": ["功能1", "功能2", "功能3"],
  "monetization": "商业模式"
}`

  const resp = await fetch(`${AGNES_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AGNES_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'agnes-2.0-flash',
      messages: [
        { role: 'system', content: '你是一个产品设计师，只输出 JSON。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    }),
  })

  if (!resp.ok) {
    throw new Error(`AI API error: ${resp.status}`)
  }

  const data = await resp.json()
  let content = data.choices?.[0]?.message?.content || ''
  content = content.trim()
  if (content.startsWith('```')) content = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '')

  return JSON.parse(content)
}

async function saveProduct(product: any): Promise<string> {
  if (!PRODUCTS_BLOB_ID) return product.id

  try {
    const storeResp = await fetch(`${JSONBLOB_BASE}/${PRODUCTS_BLOB_ID}`, { cache: 'no-store' })
    if (storeResp.ok) {
      const store = await storeResp.json()
      if (!store.products) store.products = []
      store.products.unshift(product)
      await fetch(`${JSONBLOB_BASE}/${PRODUCTS_BLOB_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(store),
      })
    }
  } catch {}

  return product.id
}

export async function GET() {
  return NextResponse.json({ message: 'Daily collection endpoint. Use POST to trigger.' })
}

export async function POST() {
  console.log('[daily] Starting daily collection with auto-generation...')

  const subs = await getSubscriptions()
  if (subs.length === 0) {
    console.log('[daily] No subscriptions found')
    return NextResponse.json({ success: true, message: 'No subscriptions' })
  }

  let newProductsCount = 0
  let emailsSent = 0

  // 每个用户处理一个主题
  for (const sub of subs) {
    // 随机选一个主题
    const topicId = sub.topics[Math.floor(Math.random() * sub.topics.length)]

    try {
      // 1. 搜索该主题的最新资讯
      console.log(`[daily] Searching for ${topicId}...`)
      const searchResults = await webSearch(`${topicId} 创业 产品 需求`, 3)

      if (searchResults.length === 0) {
        console.log(`[daily] No results for ${topicId}`)
        continue
      }

      const idea = searchResults[0]
      console.log(`[daily] Found idea: ${idea.title}`)

      // 2. 自动生成产品
      console.log(`[daily] Generating product for: ${idea.title}`)
      let productData
      try {
        productData = await generateProduct(idea.title, idea.description)
      } catch (e) {
        console.error(`[daily] Product generation failed:`, e)
        continue
      }

      // 3. 保存产品
      const productId = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const product = {
        id: productId,
        ideaId: `idea_${Date.now()}`,
        ideaTitle: idea.title,
        name: productData.name || idea.title,
        tagline: productData.tagline || '',
        problem: productData.problem || '',
        solution: productData.solution || '',
        targetUsers: productData.targetUsers || '',
        coreFeatures: productData.coreFeatures || [],
        techStack: [],
        monetization: productData.monetization || '',
        competitors: '',
        differentiator: '',
        mvp: '',
        createdAt: new Date().toISOString(),
        status: 'confirmed',
        generatedHtml: '',
        votes: 0,
        votedBy: [],
      }

      await saveProduct(product)
      newProductsCount++

      // 4. 发送产品邮件
      const productUrl = `https://ideahub-pearl.vercel.app/product/${productId}`
      const featuresList = (productData.coreFeatures || []).map((f: string) => `<li style="color:#666;margin-bottom:4px;">• ${f}</li>`).join('')

      await sendEmail(
        sub.email,
        `新产品方案：${productData.name}`,
        `
          <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#111;margin-bottom:8px;">${productData.name}</h2>
            <p style="color:#666;font-size:14px;margin-bottom:16px;">${productData.tagline}</p>

            <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:16px;">
              <h3 style="color:#111;font-size:14px;margin-bottom:8px;">问题</h3>
              <p style="color:#666;font-size:13px;margin-bottom:12px;">${productData.problem}</p>

              <h3 style="color:#111;font-size:14px;margin-bottom:8px;">解决方案</h3>
              <p style="color:#666;font-size:13px;margin-bottom:12px;">${productData.solution}</p>

              <h3 style="color:#111;font-size:14px;margin-bottom:8px;">核心功能</h3>
              <ul style="padding-left:20px;margin:0;">${featuresList}</ul>
            </div>

            <a href="${productUrl}" style="display:inline-block;padding:12px 24px;background:#111;color:white;border-radius:8px;text-decoration:none;font-weight:bold;">
              查看产品页面
            </a>

            <p style="color:#999;font-size:12px;margin-top:16px;">由 IdeaHub 自动生成</p>
          </div>
        `
      )
      emailsSent++

    } catch (e) {
      console.error(`[daily] Error processing for ${sub.email}:`, e)
    }
  }

  await saveSubscriptions(subs)

  console.log(`[daily] Done. ${newProductsCount} products generated, ${emailsSent} emails sent.`)

  return NextResponse.json({
    success: true,
    subscribers: subs.length,
    productsGenerated: newProductsCount,
    emailsSent,
  })
}
