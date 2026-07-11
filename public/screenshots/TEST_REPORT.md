# 卡片模式恢复 + 全屏修复测试报告

## 测试时间
2026-07-12

## 测试环境
- 线上：https://ideahub-pearl.vercel.app
- 浏览器：Chromium headless, 390×844 (iPhone 12 viewport)

## 测试结果

### ✅ 卡片模式 (默认)
- 卡片框 `rounded-[24px]` 正常显示
- 背景模糊 iframe 正常
- 底部导航栏可见
- 页面指示器 1/116 正常
- 右侧操作栏 (❤️ 分享 全屏 详情) 可见
- 游戏加载正常 (2048)

### ✅ 全屏模式 (点击全屏按钮)
- 退出按钮 `< 退出` 出现在左上
- 游戏标题显示在右上
- 游戏全屏显示，无卡片框
- **底部导航栏已隐藏** (通过 Portal + z-[100] 覆盖)
- 游戏正常加载和可玩
- AD 标签正确显示 (GameMonetize 游戏)

### ✅ 全屏内导航
- 滑动翻页正常 (wheel/arrow)
- Escape 退出全屏回到卡片模式

### ✅ 卡片间导航
- ArrowDown → 2/116 ✅
- ArrowDown → 3/116 ✅
- ArrowUp → 2/116 ✅
- Wheel down → 3/116 ✅

## 修复历史

### 问题 1: BottomNav 在全屏时仍可见
**根因**: SwipeFeed 的滑动容器使用 `transform: translateY()` 创建了新的堆叠上下文，导致全屏 div 的 z-index 无法跨越堆叠上下文覆盖 BottomNav。

**修复**: 使用 `createPortal` 将全屏模式 div 渲染到 `document.body`，脱离 SwipeFeed 的堆叠上下文。

### 问题 2: 全屏 div z-index 不够高
**修复**: 从 z-50 → z-[60] → z-[100]，确保高于 BottomNav 的 z-50。

### 问题 3: SwipeFeed 父容器 z-index 干扰
**修复**: 移除 `app/page.tsx` 中 SwipeFeed 父容器的 `z-30`。
