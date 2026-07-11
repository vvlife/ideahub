import type { Metadata, Viewport } from 'next'
import './globals.css'
import { BottomNav } from '@/components/layout'

export const metadata: Metadata = {
  title: 'IdeaHub · 刷网页的 TikTok',
  description: 'AI 生成的可交互网页，上下滑动无限刷。输入想法，一键生成应用。',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-black text-white antialiased min-h-screen overscroll-none">
        <main className="relative min-h-screen">{children}</main>
        <BottomNav />
      </body>
    </html>
  )
}
