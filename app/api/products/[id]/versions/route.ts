import { NextRequest, NextResponse } from 'next/server'
import { getProduct, addProductVersion } from '@/lib/remote-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const AGNES_API_KEY = process.env.AGNES_API_KEY || ''
const AGNES_BASE_URL = 'https://apihub.agnes-ai.com/v1'

interface VersionRequest {
  prompt?: string  // 用户的调整要求（为空则用原方案重新生成 v1 之后的版本）
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const product = await getProduct(id)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    if (!AGNES_API_KEY) {
      return NextResponse.json({ error: 'AGNES_API_KEY not configured' }, { status: 500 })
    }

    const body: VersionRequest = await req.json().catch(() => ({}))
    const userPrompt = (body.prompt || '').trim()

    const featuresText = (product.coreFeatures || []).map((f, i) => `${i + 1}. ${f}`).join('\n')

    const adjustHint = userPrompt
      ? `\n\n## 用户的调整要求\n${userPrompt}\n\n请在上一个版本基础上，按上述要求进行调整并重新生成。保持整体产品定位一致，只针对要求做改动。`
      : '\n\n请基于以上方案重新生成一个改进版本的可运行产品原型。'

    const prompt = `你是一个资深全栈工程师和产品设计师。请根据以下产品方案，生成一个**单文件、可直接在浏览器运行的真实产品原型页面**（不是说明文档）。
${adjustHint}

## 产品方案
- **名称**: ${product.name}
- **一句话**: ${product.tagline}
- **要解决的问题**: ${product.problem}
- **解决方案**: ${product.solution}
- **目标用户**: ${product.targetUsers}
- **核心功能**:
${featuresText}
- **技术栈参考**: ${(product.techStack || []).join('、')}

## 要求
1. 输出一个**完整的 HTML 文件**，包含内部的 <style> 和 <script>，自包含、无需任何外部依赖（不要引用外部 CDN、不要外链资源）。
2. 页面要像一个**真实可交互的产品**（例如：如果产品是电商/订购类，做一个能浏览商品、加购物车、提交表单的界面；如果是工具类，做一个能输入、能出结果的演示界面）。要有真实的视觉设计：导航栏、Hero 区、核心功能演示区、行动号召(CTA)按钮。
3. **必须包含真实交互逻辑**（用原生 JS）：按钮点击有响应、表单能提交并显示结果、列表能增删等。交互可以用 mock 数据，但要能真正跑起来。
4. 设计要现代美观（可用渐变、卡片、圆角、阴影），支持明暗配色自适应（prefers-color-scheme），移动端友好。
5. 文案、示例数据要与这个产品主题强相关，不要泛泛而谈。

## 输出格式
只输出一个 HTML 代码块（用 \`\`\`html 包裹也可以，但内容必须是完整 HTML 文档，以 <!DOCTYPE html> 开头），不要输出任何解释文字。`

    const response = await fetch(`${AGNES_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AGNES_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'agnes-2.0-flash',
        messages: [
          { role: 'system', content: '你是一个资深全栈工程师，擅长生成自包含的可运行 HTML 产品原型。只输出 HTML 代码，不要输出 markdown 代码块标记以外的文字。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Agnes API error:', response.status, errText)
      return NextResponse.json({ error: `Agnes API error: ${response.status}` }, { status: 502 })
    }

    const data = await response.json()
    let content = data.choices?.[0]?.message?.content || ''

    // 清理可能的 markdown 代码块标记
    content = content.trim()
    if (content.startsWith('```html')) content = content.slice(7)
    else if (content.startsWith('```')) content = content.slice(3)
    if (content.endsWith('```')) content = content.slice(0, -3)
    content = content.trim()

    if (!content.toLowerCase().includes('<!doctype html') && !content.toLowerCase().includes('<html')) {
      return NextResponse.json(
        { error: 'Generated content is not a valid HTML document', raw: content.slice(0, 500) },
        { status: 502 }
      )
    }

    const newVersion = await addProductVersion(id, content, userPrompt || undefined)
    if (!newVersion) {
      return NextResponse.json({ error: 'Failed to save version' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      version: newVersion,
      currentVersion: newVersion.version,
      generatedHtml: content,
    })
  } catch (error) {
    console.error('Version API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
