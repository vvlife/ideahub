'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Product, ProductVersion } from '@/lib/types'

// game-leaderboard SDK 类型声明
declare global {
  interface Window {
    API?: {
      setGame: (gameId: string) => void
      getGame: () => string
      createGame: (gameId: string, name: string, desc: string, playUrl?: string) => Promise<{ data: any }>
      deployGame: (gameId: string, html: string) => Promise<{ url: string }>
      updateGameUrl: (gameId: string, url: string) => Promise<{ data: any }>
    }
  }
}

export default function ProductAppPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sdkReady, setSdkReady] = useState(false)
  const sdkLoadedRef = useRef(false)

  // 调整 / 版本相关
  const [showAdjust, setShowAdjust] = useState(false)
  const [adjustPrompt, setAdjustPrompt] = useState('')
  const [genState, setGenState] = useState<'idle' | 'generating' | 'error'>('idle')
  const [genProgress, setGenProgress] = useState(0)
  const [genStage, setGenStage] = useState('')

  const loadProduct = useCallback(async () => {
    const id = params.id as string
    try {
      const resp = await fetch(`/api/products/${id}`, { cache: 'no-store' })
      if (resp.ok) {
        const data = await resp.json()
        setProduct(data.product || null)
      } else {
        setError('产品不存在')
      }
    } catch {
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    loadProduct()
  }, [loadProduct])

  // 加载 game-leaderboard SDK
  useEffect(() => {
    if (sdkLoadedRef.current) return
    sdkLoadedRef.current = true

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve()
          return
        }
        const script = document.createElement('script')
        script.src = src
        script.onload = () => resolve()
        script.onerror = () => reject(new Error(`Failed to load ${src}`))
        document.head.appendChild(script)
      })
    }

    const initSDK = async () => {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2')
        await loadScript('https://leaderboard-skill.vercel.app/supabase-api.js')
        setSdkReady(true)
      } catch (e) {
        console.warn('Failed to load leaderboard SDK:', e)
      }
    }

    initSDK()
  }, [])

  // 当前展示的版本 HTML
  const versions = product?.versions || []
  const currentVersion = product?.currentVersion || (versions.length ? versions[versions.length - 1].version : 1)
  const activeHtml = product
    ? (versions.find(v => v.version === currentVersion)?.html || product.generatedHtml || '')
    : ''

  // 切换版本
  const switchVersion = async (version: number) => {
    if (!product || version === currentVersion) return
    setProduct(p => p ? { ...p, currentVersion: version } : p)
    try {
      await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentVersion: version }),
      })
    } catch {}
  }

  // 部署到公网
  const [deployState, setDeployState] = useState<'idle' | 'deploying' | 'done' | 'error'>('idle')
  const [deployUrl, setDeployUrl] = useState<string | null>(product?.deployUrl || null)
  const [deployError, setDeployError] = useState<string | null>(null)

  useEffect(() => {
    setDeployUrl(product?.deployUrl || null)
  }, [product?.deployUrl])

  const handleDeploy = async () => {
    if (!product || deployState === 'deploying') return
    if (!sdkReady || !window.API) {
      setDeployError('部署 SDK 未加载，请刷新页面重试')
      setDeployState('error')
      return
    }

    setDeployState('deploying')
    setDeployError(null)
    try {
      // 生成安全的 gameId（只包含小写字母、数字、连字符）
      const gameId = `product-${product.id.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`

      // 创建或更新游戏条目
      await window.API.createGame(gameId, product.name, product.tagline, `${window.location.origin}/product/${product.id}/app`)
      window.API.setGame(gameId)

      // 部署 HTML 到公网
      const result = await window.API.deployGame(gameId, activeHtml)

      if (result && result.url) {
        setDeployUrl(result.url)
        setDeployState('done')
        // 同步本地 product 状态
        setProduct(p => p ? { ...p, deployUrl: result.url, deployedAt: new Date().toISOString() } : p)
      } else {
        throw new Error('部署返回结果无效')
      }
    } catch (e) {
      setDeployState('error')
      setDeployError(e instanceof Error ? e.message : '部署失败')
    }
  }

  // 提交调整，生成新版本
  const handleAdjust = async () => {
    if (!product || genState === 'generating') return
    const prompt = adjustPrompt.trim()
    setGenState('generating')
    setGenProgress(10)
    setGenStage('正在构思调整方案...')
    try {
      setGenProgress(35)
      setGenStage('AI 正在重写界面与交互...')
      const resp = await fetch(`/api/products/${product.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await resp.json()
      if (!resp.ok || !data.success) {
        throw new Error(data.error || '生成失败')
      }
      setGenProgress(80)
      setGenStage('正在打包新版本...')
      // 重新拉取产品，加载新版本并自动切到最新
      await loadProduct()
      setGenProgress(100)
      setGenState('idle')
      setShowAdjust(false)
      setAdjustPrompt('')
    } catch {
      setGenState('error')
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300 dark:border-gray-600"></div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="py-20 text-center">
        <p className="text-4xl mb-4">📦</p>
        <p className="text-gray-500 dark:text-gray-400 mb-2">{error || '产品不存在'}</p>
        <Link href="/" className="text-blue-500 hover:underline text-sm">返回首页</Link>
      </div>
    )
  }

  if (!activeHtml) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <p className="text-4xl mb-4">🛠️</p>
        <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          这个产品还没有生成可运行页面
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          当前仅有产品方案，可先查看方案详情。
        </p>
        <Link
          href={`/product/${product.id}`}
          className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-blue-500 rounded-full hover:opacity-90 transition"
        >
          查看产品方案 →
        </Link>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* 顶部条 */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/product/${product.id}`}
            className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            方案
          </Link>
          <span className="text-gray-300 dark:text-gray-700">/</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[28vw]">
            {product.name}
          </span>
          <span className="px-2 py-0.5 text-[11px] rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 shrink-0">
            实时运行
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* 部署到公网 + 跳转 */}
          {deployUrl && (
            <a
              href={deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-orange-500 to-amber-500 rounded-full hover:opacity-90 transition shadow-sm"
              title="在新标签页打开已部署的公网页面"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              跳转公网
            </a>
          )}

          <button
            onClick={handleDeploy}
            disabled={deployState === 'deploying' || genState === 'generating' || !sdkReady}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full hover:opacity-90 transition shadow-sm disabled:opacity-50"
            title={sdkReady ? '把当前版本部署到公网，生成可分享链接' : '部署 SDK 加载中...'}
          >
            {deployState === 'deploying' ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.55 19.09l14-14a1.5 1.5 0 012.12 2.12l-14 14a1.5 1.5 0 01-2.12-2.12zM12 3l1.91 5.79L19.7 10.7l-5.79 1.91L12 18.5l-1.91-5.79L4.3 10.7l5.79-1.91L12 3z" />
              </svg>
            )}
            {!sdkReady ? 'SDK 加载中...' : (deployState === 'deploying' ? '部署中...' : (deployUrl ? '重新部署' : '部署到公网'))}
          </button>

          {/* 版本切换下拉 */}
          {versions.length > 0 && (
            <div className="relative">
              <select
                value={currentVersion}
                onChange={(e) => switchVersion(Number(e.target.value))}
                className="appearance-none text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-full pl-3 pr-8 py-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer focus:outline-none"
                title="切换版本"
              >
                {versions.slice().reverse().map((v: ProductVersion) => (
                  <option key={v.id} value={v.version}>
                    版本 v{v.version}
                  </option>
                ))}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}

          {/* 调整按钮 */}
          <button
            onClick={() => setShowAdjust(o => !o)}
            disabled={genState === 'generating'}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-purple-500 to-blue-500 rounded-full hover:opacity-90 transition shadow-sm disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4h12m-6-4a2 2 0 100 4m0-4a2 2 0 110 4m6-8a2 2 0 100-4m0 4a2 2 0 110-4m0 4h.01" />
            </svg>
            调整
          </button>
        </div>
      </div>

      {/* 调整输入区 */}
      {showAdjust && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 shrink-0">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">
            输入你的调整要求，将生成一个新版本（不影响已有版本）
          </label>
          <div className="flex gap-2">
            <input
              value={adjustPrompt}
              onChange={(e) => setAdjustPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdjust() } }}
              placeholder="例如：把主色调改成深色系，增加一个用户评价区"
              disabled={genState === 'generating'}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition disabled:opacity-60"
            />
            <button
              onClick={handleAdjust}
              disabled={genState === 'generating'}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg hover:opacity-90 transition disabled:opacity-50 shrink-0"
            >
              {genState === 'generating' ? '生成中...' : '生成新版本'}
            </button>
            <button
              onClick={() => setShowAdjust(false)}
              disabled={genState === 'generating'}
              className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition disabled:opacity-50 shrink-0"
            >
              取消
            </button>
          </div>

          {/* 生成进度 */}
          {genState !== 'idle' && (
            <div className="mt-3">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                {genState === 'generating' ? (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                ) : (
                  <span className="text-red-500">⚠️</span>
                )}
                <span>{genState === 'generating' ? genStage : '新版本生成失败，请重试'}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${genState === 'error' ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-blue-500'}`}
                  style={{ width: `${genState === 'error' ? 100 : Math.max(8, genProgress)}%` }}
                />
              </div>
            </div>
          )}

          {/* 部署反馈 */}
          {deployState === 'done' && deployUrl && (
            <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <span>✅ 已部署到公网：</span>
              <a href={deployUrl} target="_blank" rel="noopener noreferrer" className="underline break-all truncate max-w-[70%]">
                {deployUrl}
              </a>
            </div>
          )}
          {deployState === 'error' && deployError && (
            <div className="mt-3 text-xs text-red-500">⚠️ 部署失败：{deployError}</div>
          )}
        </div>
      )}

      {/* 产品 iframe 沙箱 */}
      <iframe
        key={currentVersion}
        title={product.name}
        srcDoc={activeHtml}
        sandbox="allow-scripts allow-forms allow-modals allow-popups"
        className="flex-1 w-full border-0 bg-white"
      />
    </div>
  )
}
