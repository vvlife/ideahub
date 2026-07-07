import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return new Response('无效的链接', {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // 解析 token: base64 encoded { email, ideaId, ideaTitle }
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'))
    const { email, ideaId, ideaTitle } = decoded

    if (!email || !ideaId) {
      return new Response('无效的链接', {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    // 触发产品生成
    const genResp = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://ideahub-pearl.vercel.app'}/api/generate-idea`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, ideaId, ideaTitle }),
    })

    const result = await genResp.json()

    if (result.success) {
      return new Response(`
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>IdeaHub - 已批准</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f9fafb; padding: 1rem; }
            .card { text-align: center; padding: 3rem 2rem; background: white; border-radius: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 400px; width: 100%; }
            .icon { width: 64px; height: 64px; margin: 0 auto 1.5rem; background: #f0fdf4; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
            .icon svg { width: 32px; height: 32px; color: #16a34a; }
            h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #111827; }
            p { color: #6b7280; margin-bottom: 1.5rem; line-height: 1.6; }
            a { display: inline-block; color: #2563eb; text-decoration: none; font-size: 0.875rem; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1>已批准</h1>
            <p>「${ideaTitle}」的产品方案正在生成中，<br>完成后会发送到你的邮箱。</p>
            <a href="https://ideahub-pearl.vercel.app">返回 IdeaHub</a>
          </div>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    } else {
      return new Response('生成失败，请稍后重试', {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }
  } catch (e) {
    return new Response('无效的链接', {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}
