'use client'

import { useState, useEffect } from 'react'
import type { Idea, Product } from '@/lib/types'
import Link from 'next/link'

interface AnalysisModalProps {
  idea: Idea
  onClose: () => void
  onProductCreated: (product: Product) => void
}

type Step = 'idle' | 'analyzing' | 'result' | 'saving' | 'saved'

export default function AnalysisModal({
  idea,
  onClose,
  onProductCreated,
}: AnalysisModalProps) {
  const [step, setStep] = useState<Step>('idle')
  const [analysis, setAnalysis] = useState<Partial<Product> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [existingProducts, setExistingProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  // 加载已有产品
  useEffect(() => {
    let cancelled = false
    const loadProducts = async () => {
      try {
        const resp = await fetch(`/api/products/${idea.id}?type=idea`, { cache: 'no-store' })
        if (resp.ok) {
          const data = await resp.json()
          if (!cancelled) {
            setExistingProducts(data.products || [])
          }
        }
      } catch {} finally {
        if (!cancelled) setLoadingProducts(false)
      }
    }
    loadProducts()
    return () => { cancelled = true }
  }, [idea.id])

  const handleAnalyze = async () => {
    setStep('analyzing')
    setError(null)
    try {
      const resp = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ideaTitle: idea.title,
          ideaDescription: idea.description,
          platform: idea.platform,
          category: idea.category,
        }),
      })
      const data = await resp.json()
      if (!resp.ok || !data.success) {
        throw new Error(data.error || data.raw || '分析失败')
      }
      setAnalysis(data.product)
      setStep('result')

      // 同时保存分析记录到远程
      try {
        await fetch('/api/analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `analysis_${Date.now()}`,
            ideaId: idea.id,
            ideaTitle: idea.title,
            analysis: data.product,
            createdAt: new Date().toISOString(),
          }),
        })
      } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : '未知错误')
      setStep('idle')
    }
  }

  const handleConfirm = async () => {
    if (!analysis) return
    setStep('saving')

    const product: Product = {
      id: `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ideaId: idea.id,
      ideaTitle: idea.title,
      name: analysis.name || '未命名产品',
      tagline: analysis.tagline || '',
      problem: analysis.problem || '',
      solution: analysis.solution || '',
      targetUsers: analysis.targetUsers || '',
      coreFeatures: analysis.coreFeatures || [],
      techStack: analysis.techStack || [],
      monetization: analysis.monetization || '',
      competitors: analysis.competitors || '',
      differentiator: analysis.differentiator || '',
      mvp: analysis.mvp || '',
      createdAt: new Date().toISOString(),
      status: 'confirmed',
    }

    try {
      const resp = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      })
      const data = await resp.json()
      if (!resp.ok || !data.success) {
        throw new Error(data.error || '保存失败')
      }
      onProductCreated(product)
      setExistingProducts(prev => [product, ...prev])
      setStep('saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : '未知错误')
      setStep('result')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              AI 需求分析
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {idea.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* 已有产品 */}
          {!loadingProducts && existingProducts.length > 0 && step !== 'result' && step !== 'analyzing' && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                已生成的产品方案 ({existingProducts.length})
              </h3>
              <div className="space-y-2">
                {existingProducts.map(p => (
                  <Link
                    key={p.id}
                    href={`/product/${p.id}`}
                    onClick={onClose}
                    className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition"
                  >
                    <div className="font-medium text-sm text-gray-900 dark:text-white">
                      {p.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {p.tagline}
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  想要生成新的产品方案？
                </p>
              </div>
            </div>
          )}

          {/* 保存成功 */}
          {step === 'saved' && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                产品已生成！
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                产品方案已保存，可以查看详情
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
                >
                  关闭
                </button>
                <Link
                  href={`/product/${existingProducts[0]?.id}`}
                  onClick={onClose}
                  className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-500 rounded-full hover:opacity-90 transition shadow-sm"
                >
                  查看产品详情 →
                </Link>
              </div>
            </div>
          )}

          {/* 初始状态 */}
          {step === 'idle' && (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">🤖</div>
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                使用 Agnes AI 分析这个需求
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
                AI 将深入分析用户痛点，设计产品方案，包括核心功能、技术栈、商业模式等
              </p>
              <button
                onClick={handleAnalyze}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full font-medium hover:opacity-90 transition shadow-lg"
              >
                🚀 开始 AI 分析
              </button>
              {error && (
                <p className="mt-4 text-sm text-red-500">{error}</p>
              )}
            </div>
          )}

          {/* 分析中 */}
          {step === 'analyzing' && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">
                AI 正在分析需求...
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                深入挖掘痛点，设计解决方案
              </p>
            </div>
          )}

          {/* 分析结果 */}
          {step === 'result' && analysis && (
            <div className="space-y-4">
              {/* 产品名称 */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {analysis.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {analysis.tagline}
                </p>
              </div>

              <Section title="🎯 问题分析" content={analysis.problem} />
              <Section title="💡 解决方案" content={analysis.solution} />
              <Section title="👥 目标用户" content={analysis.targetUsers} />

              {analysis.coreFeatures && analysis.coreFeatures.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    ⚡ 核心功能
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.coreFeatures.map((f, i) => (
                      <span key={i} className="px-2.5 py-1 text-xs rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.techStack && analysis.techStack.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    🛠 推荐技术栈
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.techStack.map((t, i) => (
                      <span key={i} className="px-2.5 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <Section title="💰 商业模式" content={analysis.monetization} />
              <Section title="🔍 竞品分析" content={analysis.competitors} />
              <Section title="✨ 差异化优势" content={analysis.differentiator} />
              <Section title="🚀 MVP 方案" content={analysis.mvp} />

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'result' || step === 'saving') && analysis && (
          <div className="flex items-center justify-between gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setStep('idle')}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
            >
              ← 重新分析
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-500 rounded-full hover:opacity-90 transition shadow-sm"
              >
                {step === 'saving' ? '保存中...' : '✓ 确认生成产品'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, content }: { title: string; content?: string }) {
  if (!content) return null
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
        {title}
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        {content}
      </p>
    </div>
  )
}
