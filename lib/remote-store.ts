// ── JSONBlob 远程存储 ──────────────────────────────────────────
// 使用 jsonblob.com 作为免费 JSON 存储

import type { Product, Idea } from './types'

const JSONBLOB_BASE = 'https://jsonblob.com/api/jsonBlob'

interface StoreData {
  products: Product[]
  analysis: AnalysisRecord[]
}

export interface AnalysisRecord {
  id: string
  ideaId: string
  ideaTitle: string
  analysis: Partial<Product>
  createdAt: string
}

function getBlobId(): string {
  return process.env.JSONBLOB_ID || ''
}

async function fetchStore(): Promise<StoreData> {
  const blobId = getBlobId()
  if (!blobId) {
    return { products: [], analysis: [] }
  }
  try {
    const resp = await fetch(`${JSONBLOB_BASE}/${blobId}`, {
      cache: 'no-store',
    })
    if (!resp.ok) return { products: [], analysis: [] }
    const data = await resp.json()
    return {
      products: data.products || [],
      analysis: data.analysis || [],
    }
  } catch {
    return { products: [], analysis: [] }
  }
}

async function saveStore(data: StoreData): Promise<boolean> {
  const blobId = getBlobId()
  if (!blobId) return false
  try {
    const resp = await fetch(`${JSONBLOB_BASE}/${blobId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return resp.ok
  } catch {
    return false
  }
}

// ── 产品 CRUD ──────────────────────────────────────────────────

export async function getAllProducts(): Promise<Product[]> {
  const store = await fetchStore()
  return store.products
}

export async function getProduct(id: string): Promise<Product | null> {
  const store = await fetchStore()
  return store.products.find(p => p.id === id) || null
}

export async function getProductsByIdea(ideaId: string): Promise<Product[]> {
  const store = await fetchStore()
  return store.products.filter(p => p.ideaId === ideaId)
}

export async function addProduct(product: Product): Promise<boolean> {
  const store = await fetchStore()
  store.products.unshift(product)
  return saveStore(store)
}

export async function deleteProduct(id: string): Promise<boolean> {
  const store = await fetchStore()
  store.products = store.products.filter(p => p.id !== id)
  return saveStore(store)
}

// ── 分析记录 CRUD ──────────────────────────────────────────────

export async function getAnalysisByIdea(ideaId: string): Promise<AnalysisRecord[]> {
  const store = await fetchStore()
  return store.analysis.filter(a => a.ideaId === ideaId)
}

export async function addAnalysisRecord(record: AnalysisRecord): Promise<boolean> {
  const store = await fetchStore()
  // 去重：同一个 ideaId 只保留最新的
  store.analysis = store.analysis.filter(a => a.ideaId !== record.ideaId)
  store.analysis.unshift(record)
  // 最多保留 100 条
  if (store.analysis.length > 100) {
    store.analysis = store.analysis.slice(0, 100)
  }
  return saveStore(store)
}
