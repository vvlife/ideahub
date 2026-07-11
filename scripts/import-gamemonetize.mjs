#!/usr/bin/env node
/**
 * Import games from GameMonetize.com into IdeaHub store.
 *
 * Usage:
 *   node scripts/import-gamemonetize.mjs              # import top 100
 *   node scripts/import-gamemonetize.mjs --limit 50   # import top 50
 *   node scripts/import-gamemonetize.mjs --all         # import all 567
 *
 * Requirements:
 *   - JSONBLOB_ID env var or .data/store.json fallback
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

// ── Config ──────────────────────────────────────────────────
const JSONBLOB_BASE = 'https://jsonblob.com/api/jsonBlob'
const LOCAL_STORE = path.join(projectRoot, '.data', 'store.json')

function getBlobId() {
  // Try .env.local
  try {
    const envPath = path.join(projectRoot, '.env.local')
    if (fs.existsSync(envPath)) {
      const env = fs.readFileSync(envPath, 'utf-8')
      const m = env.match(/JSONBLOB_ID\s*=\s*["']?([^"'\s]+)/)
      if (m) return m[1]
    }
  } catch {}
  return process.env.JSONBLOB_ID || ''
}

// ── Crawl GameMonetize ─────────────────────────────────────
const CATEGORIES = [
  'arcade', 'puzzle', 'action', 'adventure', 'shooting',
  'sports', 'racing', 'hypercasual', 'io', 'clicker', 'idle'
]

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function crawlCategory(cat) {
  const url = `https://gamemonetize.com/games?category=${cat}&popularity=popular`
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
    })
    const html = await resp.text()

    // Extract game ID + slug pairs
    const entryRe = /data-image='https:\/\/img\.gamemonetize\.com\/([a-z0-9]+)\/[^']+'[^>]*href='\/([^']+)-game'/g
    const h3Re = /<h3 class='game-card__title'>\s*([^<]+?)\s*<\/h3>/g

    const entries = []
    let m
    while ((m = entryRe.exec(html)) !== null) {
      entries.push({ id: m[1], slug: m[2] })
    }

    const titles = []
    while ((m = h3Re.exec(html)) !== null) {
      titles.push(m[1].trim())
    }

    const games = entries.map((e, i) => ({
      id: e.id,
      slug: e.slug,
      title: titles[i] || e.slug.replace(/-/g, ' '),
      category: cat,
      embed_url: `https://html5.gamemonetize.co/${e.id}/`,
      thumb: `https://img.gamemonetize.com/${e.id}/512x384.jpg`,
    }))

    return games
  } catch (e) {
    console.error(`  ⚠️  ${cat}: ${e.message}`)
    return []
  }
}

async function crawlAllGames() {
  const all = new Map()

  for (const cat of CATEGORIES) {
    const games = await crawlCategory(cat)
    let newCount = 0
    for (const g of games) {
      if (!all.has(g.id)) {
        all.set(g.id, g)
        newCount++
      }
    }
    console.log(`  ${cat}: +${newCount} (total: ${all.size})`)
    await sleep(300)
  }

  return Array.from(all.values())
}

// ── Storage ─────────────────────────────────────────────────

async function fetchStore() {
  const blobId = getBlobId()
  if (!blobId) {
    // Local fallback
    try {
      const raw = fs.readFileSync(LOCAL_STORE, 'utf-8')
      return JSON.parse(raw)
    } catch {
      return { products: [], analysis: [], brainstormSessions: [], brainstormRequirements: [], userIdeas: [] }
    }
  }
  const resp = await fetch(`${JSONBLOB_BASE}/${blobId}`, { cache: 'no-store' })
  if (!resp.ok) {
    console.error(`⚠️  JSONBlob fetch failed: ${resp.status}`)
    return { products: [], analysis: [], brainstormSessions: [], brainstormRequirements: [], userIdeas: [] }
  }
  return await resp.json()
}

async function saveStore(data) {
  const blobId = getBlobId()
  if (!blobId) {
    fs.mkdirSync(path.dirname(LOCAL_STORE), { recursive: true })
    fs.writeFileSync(LOCAL_STORE, JSON.stringify(data, null, 2))
    console.log(`✅ Saved to ${LOCAL_STORE}`)
    return true
  }
  const resp = await fetch(`${JSONBLOB_BASE}/${blobId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (resp.ok) {
    console.log(`✅ Saved to JSONBlob (${blobId})`)
    return true
  }
  console.error(`❌ JSONBlob save failed: ${resp.status}`)
  return false
}

// ── Convert game → Product ──────────────────────────────────

function gameToProduct(g, index) {
  const now = new Date().toISOString()
  // Generate a stable ID
  const productId = `prod_gm_${g.id.slice(0, 12)}`

  // Embed wrapper HTML — iframe pointing to GameMonetize
  const wrapperHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden;background:#000}
  iframe{width:100%;height:100%;border:0;display:block}
</style>
</head>
<body>
<iframe src="${g.embed_url}" allow="autoplay; fullscreen; gamepad" allowfullscreen frameborder="0"></iframe>
</body>
</html>`

  return {
    id: productId,
    ideaId: `idea_gm_${g.id.slice(0, 12)}`,
    ideaTitle: `${g.category} game`,
    name: g.title,
    tagline: `Play ${g.title} — ${g.category} game`,
    problem: 'External HTML5 game from GameMonetize',
    solution: `Embedded via iframe from ${g.embed_url}`,
    targetUsers: 'Casual gamers',
    coreFeatures: ['HTML5 browser game', 'Mobile + desktop', 'Instant play'],
    techStack: ['HTML5', 'GameMonetize SDK'],
    monetization: 'GameMonetize ad revenue (45% publisher share)',
    competitors: '',
    differentiator: '',
    mvp: 'iframe embed',
    createdAt: now,
    status: 'confirmed',
    generatedHtml: wrapperHtml,
    votes: Math.floor(Math.random() * 15) + 1,
    votedBy: Array.from({ length: Math.floor(Math.random() * 10) + 1 }, (_, i) => `user_gm_${i}`),
    clonedFrom: undefined,
    _source: 'gamemonetize',
    _externalUrl: g.embed_url,
    _thumb: g.thumb,
    _category: g.category,
  }
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const limitIdx = args.indexOf('--limit')
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : 100
  const importAll = args.includes('--all')

  console.log('🎮 GameMonetize → IdeaHub Importer')
  console.log('==================================')

  // 1. Crawl games
  console.log('\n📡 Crawling GameMonetize categories...')
  const games = await crawlAllGames()
  console.log(`\n📊 Total unique games found: ${games.length}`)

  // 2. Limit
  const toImport = importAll ? games : games.slice(0, limit)
  console.log(`📦 Importing ${toImport.length} games${importAll ? ' (all)' : ` (limit: ${limit})`}`)

  // 3. Load existing store
  console.log('\n📂 Loading existing store...')
  const store = await fetchStore()
  console.log(`   Existing products: ${store.products?.length || 0}`)

  // 4. Filter out games already imported
  const existingIds = new Set((store.products || []).map(p => p.id))
  const newProducts = toImport
    .filter(g => !existingIds.has(`prod_gm_${g.id.slice(0, 12)}`))
    .map((g, i) => gameToProduct(g, i))

  console.log(`   New games to add: ${newProducts.length}`)

  if (newProducts.length === 0) {
    console.log('\n✅ Nothing to import — all games already in store.')
    return
  }

  // 5. Merge: new games at top
  store.products = [...newProducts, ...(store.products || [])]

  // 6. Save
  console.log('\n💾 Saving store...')
  await saveStore(store)

  console.log(`\n🎉 Done! Imported ${newProducts.length} games.`)
  console.log(`   Total products in store: ${store.products.length}`)

  // Print sample
  console.log('\n📋 Sample imported games:')
  for (const p of newProducts.slice(0, 5)) {
    console.log(`   • ${p.name}  →  ${p._externalUrl}`)
  }
}

main().catch(e => {
  console.error('❌ Fatal:', e)
  process.exit(1)
})
