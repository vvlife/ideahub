# IdeaHub

> From Idea to Product.

**在线体验：https://ideahub-lyart.vercel.app**

---

## 功能一览

### 需求发现（Agently 驱动）
- **Agently-Daily-News-Collector 集成**：基于 Agently v4 的 AI 新闻采集，按主题定时抓取
- **16 个来源并行抓取**（备用）：V2EX、HackerNews、ProductHunt、Reddit、GitHub 等
- **智能过滤**：自动过滤广告、代码 BUG、技术求助等非产品需求
- **用户发布**：支持手动发布需求，所有用户共享

### AI 搜索
- **本地搜索**：搜索已采集的需求数据
- **Agently 网络搜索**：通过 Agently 内置搜索工具实时搜索互联网
- **混合搜索**：本地结果不足时自动补充网络搜索结果

### AI 产品生成
- **一键分析**：点击需求 → AI 自动生成产品方案
- **版本管理**：支持多次调整生成，保留完整版本历史
- **产品预览**：生成可运行的单文件 HTML 产品原型

### Brainstorm 协作
- **多人协作**：发起 Brainstorm 会话，邀请同学一起讨论
- **需求收集**：参与者提交需求、反馈、建议
- **合并生成**：结束讨论后，合并所有需求重新生成产品文档

### 产品部署
- **一键部署**：产品页面可部署到公网，生成可分享链接
- **实时预览**：iframe 沙箱预览产品效果

### 社区展示
- **作品展示**：所有已生成的产品在社区页面展示
- **投票排序**：Product Hunt 风格的投票机制

---

## 技术栈

- **前端**：Next.js (App Router) + React 18 + TypeScript + Tailwind CSS
- **后端**：Next.js API Routes
- **AI 新闻采集**：[Agently-Daily-News-Collector](https://github.com/AgentEra/Agently-Daily-News-Collector)（Agently v4）
- **AI 搜索**：Agently 内置 Search/Browse 工具
- **AI 产品生成**：Agnes AI API
- **存储**：JSONBlob（产品/需求数据）
- **部署**：Vercel

---

## 快速开始

### 方式一：仅启动 Next.js（使用旧爬虫备用源）

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.local.example .env.local
# 编辑 .env.local 填入 AGNES_API_KEY

# 启动开发服务器
npm run dev
```

### 方式二：完整启动（Agently + Next.js）

```bash
# 1. 安装 Next.js 依赖
npm install

# 2. 配置环境变量
cp .env.local.example .env.local
# 编辑 .env.local 填入 AGNES_API_KEY 和 AGENTLY_SERVER_URL

# 3. 配置 Agently 环境变量
cd crawl-server/agently-news-collector
cp .env.example .env
# 编辑 .env 填入模型 API Key（支持 OpenAI / DeepSeek 等）
cd ../..

# 4. 启动 Agently 服务（终端 1）
./crawl-server/start-agently.sh

# 5. 启动 Next.js（终端 2）
npm run dev
```

## 环境变量

### Next.js (.env.local)

| 变量 | 说明 | 必填 |
|------|------|------|
| `AGNES_API_KEY` | Agnes AI API 密钥（用于产品方案生成） | 是 |
| `JSONBLOB_ID` | JSONBlob 存储 ID（用于持久化数据） | 否 |
| `AGENTLY_SERVER_URL` | Agently 服务地址，默认 `http://127.0.0.1:8766` | 否 |

### Agently (crawl-server/agently-news-collector/.env)

| 变量 | 说明 | 必填 |
|------|------|------|
| `AGENTLY_NEWS_BASE_URL` | 模型 API 地址 | 是 |
| `AGENTLY_NEWS_MODEL` | 模型名称 | 是 |
| `AGENTLY_NEWS_API_KEY` | 模型 API 密钥 | 是 |
| `DEEPSEEK_BASE_URL` | DeepSeek API 地址（可选） | 否 |
| `DEEPSEEK_DEFAULT_MODEL` | DeepSeek 模型名称（可选） | 否 |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥（可选） | 否 |

---

## 主题配置

在 `lib/topics.ts` 中配置要采集的主题：

```typescript
export const defaultTopics: TopicConfig[] = [
  {
    id: 'ai-tools',
    name: 'AI工具与应用',
    keywords: ['AI tools', 'AI applications'],
    category: 'AI工具',
    enabled: true,
    intervalMinutes: 360,  // 每 6 小时更新
  },
  // ...更多主题
]
```

---

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/feed` | GET | 获取需求列表 |
| `/api/search?q=xxx` | GET | 本地搜索 |
| `/api/search?q=xxx&source=agently` | GET | Agently 网络搜索 |
| `/api/crawl` | POST | 触发爬取 |
| `/api/crawl-agently` | POST | 按主题触发 Agently 采集 |
| `/api/crawl-agently` | GET | 检查 Agently 服务状态 |

---

## 部署

```bash
vercel --prod
```

## License

MIT
