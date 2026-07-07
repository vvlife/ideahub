"""
Agently News Collector API Server for IdeaHub
Uses Agently search tools for news collection and search
"""
import asyncio
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# ── Load env vars from .env.local before anything else ─────────
def _load_env():
    """Load .env.local from project root."""
    env_path = Path(__file__).parent.parent / ".env.local"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, val = line.partition("=")
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if val and key and not key.startswith("#"):
                    os.environ.setdefault(key, val)

_load_env()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add the Agently collector to path
COLLECTOR_DIR = Path(__file__).parent / "agently-news-collector"
sys.path.insert(0, str(COLLECTOR_DIR))

app = FastAPI(title="Agently News Collector Server")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Lazy-loaded state ──────────────────────────────────────────
_search_tool = None
_settings = None


def _get_search_tool():
    global _search_tool, _settings
    if _search_tool is not None:
        return _search_tool

    from news_collector.config import AppSettings
    from tools import create_search_tool

    settings_path = COLLECTOR_DIR / "SETTINGS.yaml"
    _settings = AppSettings.load(settings_path)

    _search_tool = create_search_tool(_settings)
    return _search_tool


# ── Request/Response models ────────────────────────────────────
class CollectRequest(BaseModel):
    topic: str
    max_items: int = 10


class SearchRequest(BaseModel):
    query: str
    max_results: int = 8
    timelimit: str = "d"


class ScheduledCollectRequest(BaseModel):
    topics: list[str]


# ── Category mapping ───────────────────────────────────────────
CATEGORY_MAP = {
    "ai": "AI工具", "llm": "AI工具", "gpt": "AI工具", "人工智能": "AI工具",
    "saas": "SaaS", "crm": "SaaS", "erp": "SaaS",
    "教育": "教育", "学习": "教育", "课程": "教育",
    "设计": "设计", "ui": "设计", "ux": "设计",
    "开发": "开发者工具", "代码": "开发者工具", "编程": "开发者工具",
    "消费": "消费", "电商": "消费", "购物": "消费",
    "出海": "出海", "global": "出海", "international": "出海",
}


def _assign_category(topic: str) -> str:
    topic_lower = topic.lower()
    for kw, cat in CATEGORY_MAP.items():
        if kw in topic_lower:
            return cat
    return "其他"


def _search_results_to_ideas(results: list, topic: str) -> list[dict]:
    """Convert search results to IdeaHub format."""
    ideas = []
    category = _assign_category(topic)

    for item in results:
        title = item.get("title", "").strip()
        body = item.get("body", "").strip()
        href = item.get("href", "").strip()

        if not title:
            continue

        ideas.append({
            "title": title,
            "description": body[:200] if body else title,
            "platform": "other",
            "sourceUrl": href,
            "publishedAt": datetime.now(timezone.utc).isoformat(),
            "heat": 0,
            "category": category,
            "topic": topic,
        })

    return ideas


# ── Endpoints ──────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/collect")
async def collect(req: CollectRequest):
    """Collect news for a single topic using Agently search tools."""
    try:
        search_tool = _get_search_tool()

        # Generate search queries from topic
        queries = [
            req.topic,
            f"{req.topic} news",
            f"{req.topic} product launch",
        ]

        all_ideas = []
        seen_titles = set()

        for query in queries:
            try:
                results = await search_tool.search_news(
                    query=query,
                    timelimit="d",
                    max_results=req.max_items,
                )
                if results:
                    ideas = _search_results_to_ideas(results, req.topic)
                    for idea in ideas:
                        title_lower = idea["title"].lower()
                        if title_lower not in seen_titles:
                            seen_titles.add(title_lower)
                            all_ideas.append(idea)
            except Exception as e:
                print(f"[collect] Search error for '{query}': {e}")
                continue

        # Limit total items
        all_ideas = all_ideas[:req.max_items]

        return {
            "success": True,
            "topic": req.topic,
            "ideas": all_ideas,
            "total": len(all_ideas),
            "collected_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/collect/scheduled")
async def collect_scheduled(req: ScheduledCollectRequest):
    """Collect news for multiple topics (scheduled job)."""
    try:
        search_tool = _get_search_tool()
        all_ideas = []
        seen_titles = set()

        for topic in req.topics:
            try:
                # Search for each topic
                queries = [topic, f"{topic} news"]
                for query in queries:
                    results = await search_tool.search_news(
                        query=query,
                        timelimit="d",
                        max_results=5,
                    )
                    if results:
                        ideas = _search_results_to_ideas(results, topic)
                        for idea in ideas:
                            title_lower = idea["title"].lower()
                            if title_lower not in seen_titles:
                                seen_titles.add(title_lower)
                                all_ideas.append(idea)
            except Exception as e:
                print(f"[scheduled] Error collecting topic '{topic}': {e}")
                continue

        return {
            "success": True,
            "topics": req.topics,
            "ideas": all_ideas,
            "total": len(all_ideas),
            "collected_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search")
async def search(req: SearchRequest):
    """Search for news using Agently's built-in search tools."""
    try:
        search_tool = _get_search_tool()

        results = await search_tool.search_news(
            query=req.query,
            timelimit=req.timelimit,
            max_results=req.max_results,
        )

        # Convert to IdeaHub-compatible format
        ideas = []
        for item in results:
            title = item.get("title", "")
            body = item.get("body", "")
            href = item.get("href", "")

            ideas.append({
                "title": title,
                "description": body[:200] if body else title,
                "platform": "other",
                "sourceUrl": href,
                "publishedAt": datetime.now(timezone.utc).isoformat(),
                "heat": 0,
                "category": "其他",
            })

        return {
            "success": True,
            "query": req.query,
            "ideas": ideas,
            "total": len(ideas),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8766)
