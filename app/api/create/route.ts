import { NextRequest, NextResponse } from 'next/server'
import { Agent } from 'undici'
import { addProduct } from '@/lib/remote-store'
import type { Product } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const agnesAgent = new Agent({
  headersTimeout: 600000,
  bodyTimeout: 600000,
})

const AGNES_API_KEY = process.env.AGNES_API_KEY || ''
const AGNES_BASE_URL = 'https://apihub.agnes-ai.com/v1'

interface CreateRequest {
  prompt: string
  userId?: string
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, userId } = (await req.json()) as CreateRequest
    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    if (!AGNES_API_KEY) {
      return NextResponse.json({ error: 'AGNES_API_KEY not configured' }, { status: 500 })
    }

    // Step 1: AI 分析需求 → 产品方案
    const analyzePrompt = `你是一个资深游戏设计师。请根据用户的需求描述，设计一个休闲小游戏方案。只输出 JSON，不要任何其他文字。

## 用户需求
${prompt}

## 输出格式（JSON）
{
  "name": "游戏名称（中文，简洁有力，2-6字）",
  "tagline": "一句话描述游戏玩法（10-20字）",
  "problem": "游戏解决的娱乐需求（30-50字）",
  "solution": "游戏核心玩法说明（30-50字）",
  "targetUsers": "目标玩家群体（20-30字）",
  "coreFeatures": ["玩法1", "玩法2", "玩法3", "玩法4"],
  "techStack": ["HTML", "CSS", "JavaScript"]
}`

    const analyzeResp = await fetch(`${AGNES_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AGNES_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'agnes-1.5-flash',
        messages: [
          { role: 'system', content: '你是资深游戏设计师，只输出合法 JSON 对象，不要 markdown 代码块标记。' },
          { role: 'user', content: analyzePrompt },
        ],
        temperature: 0.4,
      }),
      // @ts-expect-error undici-specific option
      dispatcher: agnesAgent,
    })

    if (!analyzeResp.ok) {
      return NextResponse.json({ error: `Analyze API error: ${analyzeResp.status}` }, { status: 502 })
    }

    const analyzeData = await analyzeResp.json()
    let analyzeContent = analyzeData.choices?.[0]?.message?.content || ''
    analyzeContent = analyzeContent.trim()
    if (analyzeContent.startsWith('```json')) analyzeContent = analyzeContent.slice(7)
    else if (analyzeContent.startsWith('```')) analyzeContent = analyzeContent.slice(3)
    if (analyzeContent.endsWith('```')) analyzeContent = analyzeContent.slice(0, -3)

    // 提取 JSON
    const firstBrace = analyzeContent.indexOf('{')
    const lastBrace = analyzeContent.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      analyzeContent = analyzeContent.slice(firstBrace, lastBrace + 1)
    }
    analyzeContent = analyzeContent.replace(/,\s*([}\]])/g, '$1')

    let productPlan: any
    try {
      productPlan = JSON.parse(analyzeContent)
    } catch {
      productPlan = {
        name: 'AI应用',
        tagline: prompt.slice(0, 20),
        problem: prompt,
        solution: '使用 AI 技术解决用户需求',
        targetUsers: '普通用户',
        coreFeatures: ['核心功能'],
        techStack: ['HTML', 'JavaScript'],
      }
    }

    // Step 2: 生成 HTML
    const featuresText = (productPlan.coreFeatures || []).map((f: string, i: number) => `${i + 1}. ${f}`).join('\n')

    const genPrompt = `你是一个资深游戏开发者。请根据以下游戏方案，生成一个单文件、可直接运行的小游戏页面。

## 游戏方案
- 名称: ${productPlan.name}
- 一句话: ${productPlan.tagline}
- 玩法: ${productPlan.solution}
- 目标玩家: ${productPlan.targetUsers}
- 核心玩法:
${featuresText}

## 要求
1. 输出完整 HTML 文件，含内部 <style> 和 <script>，自包含无外部依赖
2. 游戏必须真实可玩：有开始/结束逻辑、计分、游戏循环
3. 支持键盘和触摸操作（移动端友好）
4. 现代美观：渐变、动画、圆角，深色主题
5. 游戏数据与主题强相关

只输出 HTML 代码，以 <!DOCTYPE html> 开头，不要解释文字。`

    const genResp = await fetch(`${AGNES_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AGNES_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'agnes-1.5-flash',
        messages: [
          { role: 'system', content: '你是资深游戏开发者，只输出 HTML 代码。' },
          { role: 'user', content: genPrompt },
        ],
        temperature: 0.8,
        max_tokens: 8000,
      }),
      // @ts-expect-error undici-specific option
      dispatcher: agnesAgent,
    })

    if (!genResp.ok) {
      return NextResponse.json({ error: `Generate API error: ${genResp.status}` }, { status: 502 })
    }

    const genData = await genResp.json()
    let html = genData.choices?.[0]?.message?.content || ''
    html = html.trim()
    if (html.startsWith('```html')) html = html.slice(7)
    else if (html.startsWith('```')) html = html.slice(3)
    if (html.endsWith('```')) html = html.slice(0, -3)
    html = html.trim()

    if (!html.toLowerCase().includes('<!doctype html') && !html.toLowerCase().includes('<html')) {
      return NextResponse.json({ error: 'Generated content is not valid HTML' }, { status: 502 })
    }

    // Step 3: 保存产品
    const productId = `prod_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
    const now = new Date().toISOString()
    const product: Product = {
      id: productId,
      ideaId: `idea_${productId}`,
      ideaTitle: prompt.slice(0, 50),
      name: productPlan.name,
      tagline: productPlan.tagline,
      problem: productPlan.problem,
      solution: productPlan.solution,
      targetUsers: productPlan.targetUsers,
      coreFeatures: productPlan.coreFeatures || [],
      techStack: productPlan.techStack || [],
      monetization: productPlan.monetization || '',
      competitors: productPlan.competitors || '',
      differentiator: productPlan.differentiator || '',
      mvp: productPlan.mvp || '',
      createdAt: now,
      status: 'confirmed',
      generatedHtml: html,
      versions: [{ id: `v1_${Date.now()}`, version: 1, html, createdAt: now }],
      currentVersion: 1,
      votes: 0,
      votedBy: [],
    }

    const saved = await addProduct(product)
    if (!saved) {
      return NextResponse.json({ error: 'Failed to save product' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      product,
      productId,
      html,
    })
  } catch (error) {
    console.error('Create API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
