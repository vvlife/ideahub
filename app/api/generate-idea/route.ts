import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const AGNES_API_KEY = process.env.AGNES_API_KEY || ''
const AGNES_BASE_URL = 'https://apihub.agnes-ai.com/v1'

export async function POST(req: NextRequest) {
  try {
    const { email, ideaId, ideaTitle } = await req.json()

    if (!ideaTitle) {
      return NextResponse.json({ error: 'ideaTitle is required' }, { status: 400 })
    }

    if (!AGNES_API_KEY) {
      return NextResponse.json({ error: 'AGNES_API_KEY not configured' }, { status: 500 })
    }

    // 生成产品方案
    const prompt = `你是一个资深产品设计师。根据以下需求，生成一个简洁的产品方案：

需求：${ideaTitle}

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

    // 清理 JSON
    content = content.trim()
    if (content.startsWith('```')) content = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '')

    let product
    try {
      product = JSON.parse(content)
    } catch {
      throw new Error('AI 返回格式异常')
    }

    // 保存产品
    const productId = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const productData = {
      id: productId,
      ideaId,
      ideaTitle,
      name: product.name || ideaTitle,
      tagline: product.tagline || '',
      problem: product.problem || '',
      solution: product.solution || '',
      targetUsers: product.targetUsers || '',
      coreFeatures: product.coreFeatures || [],
      techStack: [],
      monetization: product.monetization || '',
      competitors: '',
      differentiator: '',
      mvp: '',
      createdAt: new Date().toISOString(),
      status: 'confirmed',
      generatedHtml: '',
      votes: 0,
      votedBy: [],
    }

    // 保存到 JSONBlob
    const JSONBLOB_BASE = 'https://jsonblob.com/api/jsonBlob'
    const BLOB_ID = process.env.JSONBLOB_ID || ''

    if (BLOB_ID) {
      try {
        // 读取现有数据
        const storeResp = await fetch(`${JSONBLOB_BASE}/${BLOB_ID}`, { cache: 'no-store' })
        if (storeResp.ok) {
          const store = await storeResp.json()
          if (!store.products) store.products = []
          store.products.unshift(productData)
          await fetch(`${JSONBLOB_BASE}/${BLOB_ID}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(store),
          })
        }
      } catch {}
    }

    // 发送邮件通知（使用 Resend 或其他邮件服务）
    // 这里用一个简单的 API 调用示例
    try {
      const RESEND_API_KEY = process.env.RESEND_API_KEY
      if (RESEND_API_KEY) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'IdeaHub <notify@publishmy.site>',
            to: email,
            subject: `「${product.name}」产品方案已生成`,
            html: `
              <h2>${product.name}</h2>
              <p>${product.tagline}</p>
              <hr>
              <p><strong>问题：</strong>${product.problem}</p>
              <p><strong>方案：</strong>${product.solution}</p>
              <p><strong>目标用户：</strong>${product.targetUsers}</p>
              <p><strong>核心功能：</strong>${(product.coreFeatures || []).join('、')}</p>
              <p><strong>商业模式：</strong>${product.monetization}</p>
              <hr>
              <a href="https://ideahub-pearl.vercel.app/product/${productId}">查看产品方案</a>
            `,
          }),
        })
      }
    } catch {}

    return NextResponse.json({
      success: true,
      product: productData,
    })
  } catch (error) {
    console.error('Generate idea error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    )
  }
}
