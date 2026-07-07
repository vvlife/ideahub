'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Product, ProductVersion } from '@/lib/types'
import { addNotification } from '@/lib/notify'

export default function ProductAppPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  // 自动生成功能：如果没有 HTML，自动生成
  useEffect(() => {
    if (!product || activeHtml || genState === 'generating') return
    if (product.generatedHtml || (product.versions && product.versions.length > 0)) return

    // 自动触发生成
    const autoGenerate = async () => {
      setGenState('generating')
      setGenProgress(30)
      setGenStage('AI 正在生成产品页面...')
      try {
        const resp = await fetch(`/api/products/${product.id}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: '' }),
        })
        const data = await resp.json()
        if (data.success) {
          setGenProgress(100)
          await loadProduct()
          setGenState('idle')
        } else {
          setGenState('error')
        }
      } catch {
        setGenState('error')
      }
    }
    autoGenerate()
  }, [product, activeHtml, genState, loadProduct])

  // 当前展示的版本 HTML（默认最新版本）
  const versions = (product?.versions || []).slice().sort((a, b) => b.version - a.version)
  const currentVersion = product?.currentVersion || (versions.length ? versions[0].version : 1)
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
    setDeployState('deploying')
    setDeployError(null)
    try {
      const resp = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      })
      const data = await resp.json()
      if (!resp.ok || !data.success) {
        throw new Error(data.error || '部署失败')
      }
      setDeployUrl(data.url)
      setDeployState('done')
      setProduct(p => p ? { ...p, deployUrl: data.url, deployedAt: data.deployedAt } : p)
      addNotification({
        title: '部署成功',
        body: `「${product.name}」已部署到公网`,
        href: `/product/${product.id}/app`,
        type: 'done',
      })
    } catch (e) {
      setDeployState('error')
      setDeployError(e instanceof Error ? e.message : '部署失败')
    }
  }

  // 打榜提交
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [email, setEmail] = useState('')

  const handleSubmitLeaderboard = async () => {
    if (!product || submitState === 'submitting') return
    if (!showEmailInput) {
      setShowEmailInput(true)
      return
    }
    if (!email.trim() || !email.includes('@')) return

    setSubmitState('submitting')
    try {
      const resp = await fetch('/api/submit-leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, email: email.trim() }),
      })
      const data = await resp.json()
      if (data.success) {
        setSubmitState('done')
        addNotification({
          title: '打榜提交成功',
          body: `「${product.name}」已提交到 AICPB (ID: ${data.id})`,
          href: 'https://www.aicpb.com',
          type: 'done',
        })
      } else {
        setSubmitState('error')
      }
    } catch {
      setSubmitState('error')
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
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="py-20 text-center">
        <p className="text-4xl mb-4">📦</p>
        <p className="text-gray-500 mb-2">{error || '产品不存在'}</p>
        <Link href="/" className="text-blue-500 hover:underline text-sm">返回首页</Link>
      </div>
    )
  }

  if (!activeHtml) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300 mb-4"></div>
        <p className="text-lg font-medium text-gray-900 mb-2">
          正在生成产品页面...
        </p>
        <p className="text-sm text-gray-500 mb-6">
          首次访问将自动生成可运行的产品原型，请稍候。
        </p>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* 顶部条 */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200 bg-white shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/product/${product.id}`}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            方案
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-900 truncate max-w-[28vw]">
            {product.name}
          </span>
          <span className="px-2 py-0.5 text-[11px] rounded-full bg-green-50 text-green-600 shrink-0">
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
            disabled={deployState === 'deploying' || genState === 'generating'}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full hover:opacity-90 transition shadow-sm disabled:opacity-50"
            title="把当前版本部署到公网，生成可分享链接"
          >
            {deployState === 'deploying' ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.55 19.09l14-14a1.5 1.5 0 012.12 2.12l-14 14a1.5 1.5 0 01-2.12-2.12zM12 3l1.91 5.79L19.7 10.7l-5.79 1.91L12 18.5l-1.91-5.79L4.3 10.7l5.79-1.91L12 3z" />
              </svg>
            )}
            {deployState === 'deploying' ? '部署中...' : (deployUrl ? '重新部署' : '部署到公网')}
          </button>

          {/* 版本切换下拉 */}
          {versions.length > 0 && (
            <div className="relative">
              <select
                value={currentVersion}
                onChange={(e) => switchVersion(Number(e.target.value))}
                className="appearance-none text-xs font-medium text-gray-700 bg-gray-100 rounded-full pl-3 pr-8 py-1.5 hover:bg-gray-200 transition cursor-pointer focus:outline-none"
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

          {/* 打榜按钮 */}
          <button
            onClick={handleSubmitLeaderboard}
            disabled={submitState === 'submitting'}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-full hover:opacity-90 transition shadow-sm disabled:opacity-50"
          >
            {submitState === 'done' ? '✅' : '🏆'} {submitState === 'submitting' ? '提交中...' : submitState === 'done' ? '已提交' : '打榜'}
          </button>
        </div>
      </div>

      {/* 打榜邮箱输入 */}
      {showEmailInput && submitState !== 'done' && (
        <div className="px-4 py-3 border-b border-gray-200 bg-amber-50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-700">邮箱：</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 max-w-xs px-2 py-1 text-xs rounded border border-amber-200 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <button
              onClick={handleSubmitLeaderboard}
              disabled={submitState === 'submitting' || !email.includes('@')}
              className="px-3 py-1 text-xs font-medium text-white bg-amber-500 rounded hover:bg-amber-600 disabled:opacity-50"
            >
              提交到 AICPB
            </button>
            <button
              onClick={() => setShowEmailInput(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 调整输入区 */}
      {showAdjust && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/60 shrink-0">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            输入你的调整要求，将生成一个新版本（不影响已有版本）
          </label>
          <div className="flex gap-2">
            <input
              value={adjustPrompt}
              onChange={(e) => setAdjustPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdjust() } }}
              placeholder="例如：把主色调改成深色系，增加一个用户评价区"
              disabled={genState === 'generating'}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition disabled:opacity-60"
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
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-900 transition disabled:opacity-50 shrink-0"
            >
              取消
            </button>
          </div>

          {/* 生成进度 */}
          {genState !== 'idle' && (
            <div className="mt-3">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5">
                {genState === 'generating' ? (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                ) : (
                  <span className="text-red-500">⚠️</span>
                )}
                <span>{genState === 'generating' ? genStage : '新版本生成失败，请重试'}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${genState === 'error' ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-blue-500'}`}
                  style={{ width: `${genState === 'error' ? 100 : Math.max(8, genProgress)}%` }}
                />
              </div>
            </div>
          )}

          {/* 部署反馈 */}
          {deployState === 'done' && deployUrl && (
            <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600">
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
