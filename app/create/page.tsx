'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Stage = 'idle' | 'generating' | 'done' | 'error'
type Mode = 'prompt' | 'url'

const STAGES = [
  { label: '分析需求', progress: 20 },
  { label: '设计方案', progress: 45 },
  { label: '生成游戏', progress: 75 },
  { label: '发布上线', progress: 100 },
]

export default function CreatePage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('prompt')
  const [prompt, setPrompt] = useState('')
  const [url, setUrl] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [stageIdx, setStageIdx] = useState(0)
  const [result, setResult] = useState<{ productId: string; name: string; html: string } | null>(null)
  const [error, setError] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startStageAnimation = () => {
    setStageIdx(0)
    timerRef.current = setInterval(() => {
      setStageIdx(prev => {
        if (prev >= STAGES.length - 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return prev
        }
        return prev + 1
      })
    }, 3000)
  }

  const stopStageAnimation = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const handleCreate = async () => {
    if (stage === 'generating') return

    if (mode === 'url') {
      // URL import mode
      if (!url.trim()) return
      setStage('generating')
      setError('')
      setResult(null)
      setStageIdx(0)
      startStageAnimation()

      try {
        const resp = await fetch('/api/import-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.trim() }),
        })

        const data = await resp.json()

        if (!resp.ok || !data.success) {
          throw new Error(data.error || '导入失败')
        }

        stopStageAnimation()
        setStageIdx(STAGES.length - 1)
        setResult({
          productId: data.productId,
          name: data.product?.name || '导入游戏',
          html: data.html,
        })
        setStage('done')
        window.dispatchEvent(new Event('product-created'))
      } catch (e) {
        stopStageAnimation()
        setError(e instanceof Error ? e.message : '导入失败')
        setStage('error')
      }
      return
    }

    // Prompt mode
    if (!prompt.trim()) return

    setStage('generating')
    setError('')
    setResult(null)
    startStageAnimation()

    try {
      const resp = await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })

      const data = await resp.json()

      if (!resp.ok || !data.success) {
        throw new Error(data.error || '生成失败')
      }

      stopStageAnimation()
      setStageIdx(STAGES.length - 1)
      setResult({
        productId: data.productId,
        name: data.product?.name || '新游戏',
        html: data.html,
      })
      setStage('done')
      window.dispatchEvent(new Event('product-created'))
    } catch (e) {
      stopStageAnimation()
      setError(e instanceof Error ? e.message : '生成失败')
      setStage('error')
    }
  }

  const handleReset = () => {
    setStage('idle')
    setPrompt('')
    setUrl('')
    setResult(null)
    setError('')
    setStageIdx(0)
  }

  const canSubmit = mode === 'url' ? url.trim().length > 0 : prompt.trim().length > 0

  // Generating state
  if (stage === 'generating') {
    const current = STAGES[stageIdx]
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black px-8">
        <div className="relative mb-8">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 flex items-center justify-center shadow-2xl shadow-pink-500/30 animate-pulse">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        <div className="w-full max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/80 font-medium">{current.label}</span>
            <span className="text-xs text-white/40 font-mono">{current.progress}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-500 to-yellow-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${current.progress}%` }}
            />
          </div>
          <div className="mt-6 space-y-2">
            {STAGES.map((s, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center transition ${
                  i < stageIdx ? 'bg-green-500' :
                  i === stageIdx ? 'bg-white/20' :
                  'bg-white/5'
                }`}>
                  {i < stageIdx && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {i === stageIdx && (
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  )}
                </div>
                <span className={`text-xs ${
                  i < stageIdx ? 'text-white/60' :
                  i === stageIdx ? 'text-white/90' :
                  'text-white/25'
                }`}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-8 text-xs text-white/30 text-center max-w-xs">
          {mode === 'url' ? '正在导入网页游戏...' : 'AI 正在为你生成游戏，通常需要 1-2 分钟'}
        </p>
      </div>
    )
  }

  // Done state
  if (stage === 'done' && result) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <button
            onClick={handleReset}
            className="text-sm text-white/60 hover:text-white transition flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            再做一个
          </button>
          <span className="text-sm font-medium text-white/90">✨ {result.name}</span>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-white/60 hover:text-white transition"
          >
            刷一刷
          </button>
        </div>
        <div className="flex-1 relative">
          <iframe
            title={result.name}
            srcDoc={result.html}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-forms allow-same-origin allow-modals allow-popups"
          />
        </div>
        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-center gap-3">
          <button
            onClick={() => router.push(`/product/${result.productId}`)}
            className="flex-1 max-w-[200px] py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition active:scale-95"
          >
            查看详情
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex-1 max-w-[200px] py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-red-500 text-white text-sm font-medium hover:opacity-90 transition active:scale-95"
          >
            去首页展示
          </button>
        </div>
      </div>
    )
  }

  // Error state
  if (stage === 'error') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black px-8 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <p className="text-white/80 text-sm">生成失败</p>
        <p className="text-white/40 text-xs text-center max-w-xs">{error}</p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={handleCreate}
            className="px-5 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/15 transition active:scale-95"
          >
            重试
          </button>
          <button
            onClick={handleReset}
            className="px-5 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/15 transition active:scale-95"
          >
            重新输入
          </button>
        </div>
      </div>
    )
  }

  // Idle state — input form
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 flex items-center justify-center shadow-2xl shadow-pink-500/30 mb-6">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">AI 一键创游戏</h1>
        <p className="text-sm text-white/40 mb-6 text-center max-w-xs">
          描述你想要的游戏，AI 自动生成可玩的小游戏
        </p>

        {/* Mode toggle */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-full border border-white/10 mb-6">
          <button
            onClick={() => setMode('prompt')}
            className={`px-4 py-1.5 text-xs font-medium rounded-full transition ${
              mode === 'prompt' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >
            ✨ AI 生成
          </button>
          <button
            onClick={() => setMode('url')}
            className={`px-4 py-1.5 text-xs font-medium rounded-full transition ${
              mode === 'url' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >
            🔗 导入网址
          </button>
        </div>

        {mode === 'prompt' ? (
          <>
            {/* Examples */}
            <div className="flex flex-wrap gap-2 justify-center mb-6 max-w-md">
              {[
                '打地鼠游戏',
                '太空射击游戏',
                '消消乐',
                '贪吃蛇大作战',
                '弹球游戏',
              ].map((ex) => (
                <button
                  key={ex}
                  onClick={() => setPrompt(ex)}
                  className="px-3 py-1.5 text-xs bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 rounded-full border border-white/10 transition"
                >
                  {ex}
                </button>
              ))}
            </div>

            {/* Prompt input */}
            <div className="w-full max-w-md">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    handleCreate()
                  }
                }}
                placeholder="描述你想要的游戏，比如：一个猫咪接金鱼的休闲游戏..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/25 resize-none focus:outline-none focus:border-white/30 transition"
                autoFocus
              />
              <button
                onClick={handleCreate}
                disabled={!prompt.trim()}
                className="w-full mt-3 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white text-sm font-semibold hover:opacity-90 transition active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ✨ 生成游戏
              </button>
              <p className="text-[10px] text-white/25 text-center mt-2">
                ⌘ + Enter 快速生成 · 约 60 秒
              </p>
            </div>
          </>
        ) : (
          <>
            {/* URL import */}
            <div className="w-full max-w-md">
              <div className="relative">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleCreate()
                    }
                  }}
                  placeholder="https://example.com/game.html"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/30 transition"
                  autoFocus
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={!url.trim()}
                className="w-full mt-3 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold hover:opacity-90 transition active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                🔗 导入游戏
              </button>
              <p className="text-[10px] text-white/25 text-center mt-2">
                粘贴含 HTML5 游戏的网址 · 秒级导入
              </p>
            </div>

            {/* Helper text */}
            <div className="mt-8 max-w-md px-4 py-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs text-white/40 leading-relaxed">
                💡 支持导入任何包含 HTML5 游戏的网页。游戏将在 IdeaHub 框架内运行，可全屏试玩、投票、分享。
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
