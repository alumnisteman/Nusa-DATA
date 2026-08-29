# app/kb_intelligence.py
"""Simple keyword‑based KBLI intelligence module.
This is a placeholder implementation that can be replaced by an LLM later.
It provides:
- extract_terms(text) → dict of detected activity keywords
- match_kbli(terms)   → list of candidate KBLI rows (code, title, description, score, reason)
"""
import re
import json
from typing import List, Dict
import psycopg
from psycopg.rows import dict_row

def _conn():
    from main import DB
    return psycopg.connect(DB, row_factory=dict_row)

_KEYWORD_MAP = {
    "komputer": ["komputer", "hardware", "pc"],
    "jaringan": ["jaringan", "network", "instalasi jaringan"],
    "maintenance": ["maintenance", "perawatan", "service"],
    "server": ["server", "data center"],
    "software": ["software", "aplikasi", "program"],
    "instalasi": ["instalasi", "setup", "pasang"],
}

def extract_terms(text: str) -> Dict[str, List[str]]:
    lowered = text.lower()
    detected = {}
    for term, words in _KEYWORD_MAP.items():
        if any(w in lowered for w in words):
            detected[term] = [w for w in words if w in lowered]
    return detected

def match_kbli(description: str) -> List[Dict]:
    terms = extract_terms(description)
    with _conn() as c:
        rows = c.execute("SELECT * FROM kbli WHERE active=true ORDER BY code").fetchall()
    scored = []
    for r in rows:
        blob = (r["title"] + " " + (r["description"] or "")).lower()
        score = 20
        reasons = []
        if "komputer" in terms and ("komputer" in blob or "hardware" in blob):
            score += 30; reasons.append("komputer activity detected")
        if "jaringan" in terms and ("jaringan" in blob or "network" in blob):
            score += 30; reasons.append("jaringan activity detected")
        if "maintenance" in terms and ("maintenance" in blob or "service" in blob):
            score += 20; reasons.append("maintenance activity detected")
        if "software" in terms and ("software" in blob or "aplikasi" in blob):
            score += 20; reasons.append("software activity detected")
        scored.append({
            "code": r["code"],
            "title": r["title"],
            "score": min(score, 99),
            "reason": "; ".join(reasons) or "fallback match"
        })
    return sorted(scored, key=lambda x: (-x["score"], x["code"]))[:3]
