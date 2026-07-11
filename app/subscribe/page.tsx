'use client'

import { useState } from 'react'
import Link from 'next/link'

const TOPICS = [
  { id: 'ai-tools', name: 'AI 工具', desc: '写作、编程、设计' },
  { id: 'saas', name: 'SaaS', desc: '企业软件、协作' },
  { id: 'dev-tools', name: '开发者', desc: 'IDE、框架、API' },
  { id: 'consumer', name: '消费科技', desc: '电商、生活服务' },
  { id: 'education', name: '教育', desc: '在线学习、培训' },
  { id: 'design', name: '设计', desc: 'UI/UX、图形' },
  { id: 'global', name: '出海', desc: '跨境、国际化' },
  { id: 'hardware', name: '硬件', desc: 'IoT、可穿戴' },
]

export default function SubscribePage() {
  const [email, setEmail] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !selectedTopic) return
    setSubmitting(true)
    setError('')
    try {
      const resp = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), topic: selectedTopic }),
      })
      const data = await resp.json()
      if (data.success) setSuccess(true)
      else setError(data.error || '订阅失败')
    } catch {
      setError('网络错误，请重试')
    }
    setSubmitting(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 pb-20">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-green-500/30">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold mb-2">订阅成功</h1>
        <p className="text-sm text-white/40 text-center mb-6">
          每天早上 9 点为你推送最新资讯<br />
          有新想法会发送到你的邮箱
        </p>
        <Link
          href="/"
          className="px-6 py-2.5 text-sm font-medium bg-white text-black rounded-full hover:bg-white/90 transition active:scale-95"
        >
          返回首页
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="sticky top-0 z-30 bg-black/95 backdrop-blur-lg border-b border-white/10 px-4 py-3">
        <h1 className="text-lg font-bold">每日订阅</h1>
        <p className="text-xs text-white/40">选择主题，每天推送最新资讯</p>
      </div>

      <div className="px-4 py-5">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full px-4 py-3 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-white/30 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">主题</label>
            <div className="grid grid-cols-2 gap-2">
              {TOPICS.map(topic => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setSelectedTopic(topic.id)}
                  className={`p-3 rounded-xl border text-left transition ${
                    selectedTopic === topic.id
                      ? 'border-pink-500/50 bg-gradient-to-br from-pink-500/10 to-red-500/10 text-white'
                      : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20'
                  }`}
                >
                  <div className="text-sm font-medium">{topic.name}</div>
                  <div className="text-[10px] mt-0.5 opacity-60">{topic.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={!email.trim() || !selectedTopic || submitting}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white text-sm font-semibold hover:opacity-90 transition active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {submitting ? '订阅中...' : '订阅'}
          </button>
        </form>

        <p className="mt-4 text-[10px] text-white/25 text-center">
          每天早上 9 点发送 · 随时可取消
        </p>
      </div>
    </div>
  )
}
