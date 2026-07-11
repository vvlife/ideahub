const { chromium } = require('playwright')

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

  // Home page - swipe feed
  console.log('📸 Home page...')
  await page.goto('https://ideahub-pearl.vercel.app/', { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(3000)
  await page.screenshot({ path: 'public/screenshots/home-gm.png', fullPage: false })
  console.log('   → public/screenshots/home-gm.png')

  // Community page
  console.log('📸 Community page...')
  await page.goto('https://ideahub-pearl.vercel.app/community', { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: 'public/screenshots/community-gm.png', fullPage: false })
  console.log('   → public/screenshots/community-gm.png')

  // Swipe down to see next game
  console.log('📸 Swipe #2...')
  await page.goto('https://ideahub-pearl.vercel.app/', { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(2000)
  // swipe up (scroll down)
  await page.mouse.move(200, 400)
  await page.mouse.down()
  await page.mouse.move(200, 100, { steps: 20 })
  await page.mouse.up()
  await page.waitForTimeout(3000)
  await page.screenshot({ path: 'public/screenshots/swipe-2.png', fullPage: false })
  console.log('   → public/screenshots/swipe-2.png')

  // Product detail (GM game)
  console.log('📸 GM game preview...')
  await page.goto('https://ideahub-pearl.vercel.app/p/prod_gm_3mvlbgcro82s', { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(3000)
  await page.screenshot({ path: 'public/screenshots/gm-game-preview.png', fullPage: false })
  console.log('   → public/screenshots/gm-game-preview.png')

  await browser.close()
  console.log('✅ Done')
}

main().catch(e => { console.error(e); process.exit(1) })
