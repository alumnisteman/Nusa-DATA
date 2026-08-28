import os, json, uuid
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import psycopg
from psycopg.rows import dict_row

DB = os.environ["DATABASE_URL"]

app = FastAPI(
    title="NUSA OSS Copilot",
    version="2.0.0",
    description="Business licensing / KBLI decision-support MVP."
)

# Setup Templates and Static files
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

class AnalysisIn(BaseModel):
    business_name: str = Field(min_length=2, max_length=200)
    description: str = Field(min_length=5, max_length=5000)
    address: str | None = None
    village: str | None = None
    district: str | None = None
    city: str | None = None
    province: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    investment_amount: float | None = None

def conn():
    return psycopg.connect(DB, row_factory=dict_row)

def init_db():
    with conn() as c:
        c.execute("CREATE EXTENSION IF NOT EXISTS postgis")
        c.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        c.execute("CREATE EXTENSION IF NOT EXISTS unaccent")
        c.execute("""
        CREATE TABLE IF NOT EXISTS kbli (
          id UUID PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          version TEXT NOT NULL DEFAULT '2025',
          source_name TEXT,
          source_url TEXT,
          active BOOLEAN NOT NULL DEFAULT TRUE
        )
        """)
        c.execute("""
        CREATE TABLE IF NOT EXISTS analyses (
          id UUID PRIMARY KEY,
          business_name TEXT NOT NULL,
          description TEXT NOT NULL,
          address TEXT, village TEXT, district TEXT,
          city TEXT, province TEXT,
          latitude DOUBLE PRECISION,
          longitude DOUBLE PRECISION,
          investment_amount NUMERIC,
          status TEXT NOT NULL DEFAULT 'COMPLETED',
          readiness_score INTEGER,
          result JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """)
        c.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
          id BIGSERIAL PRIMARY KEY,
          analysis_id UUID,
          action TEXT NOT NULL,
          metadata JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """)

        # Minimal demo records
        demo = [
          ("56101", "Restoran", "Kelompok ini mencakup usaha restoran yang menyediakan makanan dan minuman untuk dikonsumsi di tempat."),
          ("56303", "Rumah Minum/Kafe", "Kelompok ini mencakup usaha penyediaan minuman untuk dikonsumsi di tempat, termasuk kafe."),
          ("47112", "Perdagangan Eceran Berbagai Macam Barang", "Perdagangan eceran berbagai macam barang dalam satu tempat."),
          ("47911", "Perdagangan Eceran Melalui Internet", "Perdagangan eceran barang melalui jaringan internet."),
          ("10710", "Industri Produk Roti dan Kue", "Industri pembuatan roti, kue, dan produk sejenis.")
        ]
        for code, title, desc in demo:
            c.execute("""
              INSERT INTO kbli(id, code, title, description, version, source_name)
              VALUES (%s,%s,%s,%s,'2025','DEMO - GANTI DENGAN DATA RESMI BERLISENSI')
              ON CONFLICT(code) DO NOTHING
            """, (str(uuid.uuid4()), code, title, desc))
        c.commit()

def extract_terms(text: str):
    t = text.lower()
    terms = []
    mapping = {
      "kafe": ["kafe", "cafe", "coffee", "kopi", "kedai minum"],
      "restoran": ["restoran", "rumah makan", "makanan berat", "warung makan"],
      "internet": ["online", "internet", "marketplace", "ecommerce", "e-commerce"],
      "roti": ["roti", "bakery", "kue", "cake"],
      "retail": ["toko", "eceran", "retail", "menjual"]
    }
    for key, words in mapping.items():
        if any(w in t for w in words):
            terms.append(key)
    return terms

def match_kbli(description: str):
    terms = extract_terms(description)
    with conn() as c:
        rows = c.execute("SELECT * FROM kbli WHERE active=true ORDER BY code").fetchall()
    scored = []
    for r in rows:
        blob = (r["title"] + " " + (r["description"] or "")).lower()
        score = 35
        reasons = []
        if "kafe" in terms and ("kafe" in blob or "minuman" in blob):
            score += 45; reasons.append("aktivitas minuman/kafe terdeteksi")
        if "restoran" in terms and ("restoran" in blob or "makanan" in blob):
            score += 45; reasons.append("aktivitas makanan terdeteksi")
        if "internet" in terms and ("internet" in blob):
            score += 45; reasons.append("penjualan melalui internet terdeteksi")
        if "roti" in terms and ("roti" in blob or "kue" in blob):
            score += 45; reasons.append("produksi roti/kue terdeteksi")
        if "retail" in terms and "perdagangan" in blob:
            score += 20; reasons.append("aktivitas perdagangan/eceran terdeteksi")
        scored.append({
            "code": r["code"],
            "title": r["title"],
            "score": min(score, 99),
            "reason": "; ".join(reasons) or "kandidat berdasarkan pencarian awal"
        })
    return sorted(scored, key=lambda x: (-x["score"], x["code"]))[:3]

def readiness(matches, latitude, longitude):
    kbli = matches[0]["score"] if matches else 40
    location = 70 if latitude is not None and longitude is not None else 40
    data = 90
    docs = 50
    score = round(kbli*0.35 + location*0.30 + docs*0.20 + data*0.15)
    status = "READY_FOR_REVIEW" if score >= 90 else "NEEDS_REVIEW" if score >= 75 else "INCOMPLETE"
    return score, status

@app.on_event("startup")
def startup():
    init_db()

@app.get("/health")
def health():
    try:
        with conn() as c:
            c.execute("SELECT 1")
        return {"status":"ok","database":"ok","version":"2.0.0"}
    except Exception as e:
        raise HTTPException(503, str(e))

@app.get("/api/v1/kbli/search")
def search_kbli(q: str = ""):
    q = q.strip()
    with conn() as c:
        if q:
            rows = c.execute("""
              SELECT code,title,description,version,source_name
              FROM kbli
              WHERE active=true AND (
                unaccent(title) ILIKE unaccent(%s)
                OR code ILIKE %s
                OR unaccent(COALESCE(description,'')) ILIKE unaccent(%s)
              )
              ORDER BY title LIMIT 20
            """, (f"%{q}%", f"%{q}%", f"%{q}%")).fetchall()
        else:
            rows = c.execute("""
              SELECT code,title,description,version,source_name
              FROM kbli WHERE active=true ORDER BY code LIMIT 20
            """).fetchall()
    return {"items": rows}

@app.post("/api/v1/analyses")
def create_analysis(data: AnalysisIn):
    matches = match_kbli(data.description)
    score, status = readiness(matches, data.latitude, data.longitude)
    result = {
      "business": data.model_dump(),
      "kbli_matches": matches,
      "location": {
        "status": "LOCATION_DATA_RECEIVED" if data.latitude is not None else "LOCATION_REVIEW_REQUIRED",
        "note": "RDTR verification is not implemented in this one-file MVP."
      },
      "readiness_score": score,
      "status": status,
      "checklist": [
        {"item":"Valid business activity description","status":"CHECK"},
        {"item":"KBLI selection","status":"REVIEW"},
        {"item":"Location/RDTR","status":"REVIEW"},
        {"item":"Supporting documents","status":"REVIEW"},
        {"item":"Sector-specific requirements","status":"REVIEW"}
      ],
      "disclaimer":"Decision-support only. This result is not a guarantee of NIB, OSS, RDTR, or other licensing approval."
    }
    aid = str(uuid.uuid4())
    with conn() as c:
        c.execute("""
          INSERT INTO analyses(
            id,business_name,description,address,village,district,city,province,
            latitude,longitude,investment_amount,status,readiness_score,result
          ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
          aid,data.business_name,data.description,data.address,data.village,data.district,
          data.city,data.province,data.latitude,data.longitude,data.investment_amount,
          status,score,json.dumps(result)
        ))
        c.execute("""
          INSERT INTO audit_log(analysis_id,action,metadata)
          VALUES (%s,'ANALYSIS_CREATED',%s)
        """, (aid, json.dumps({"engine_version":"2.0.0","kbli_version":"2025-demo"})))
        c.commit()
    return {"id":aid, **result}

@app.get("/api/v1/analyses/{analysis_id}")
def get_analysis(analysis_id: str):
    with conn() as c:
        row = c.execute("SELECT * FROM analyses WHERE id=%s", (analysis_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Analysis not found")
    return {"id":str(row["id"]), **row["result"], "created_at":row["created_at"]}

# New endpoint for history
@app.get("/api/v1/analyses")
def list_analyses(limit: int = 20, offset: int = 0):
    with conn() as c:
        rows = c.execute(
            "SELECT id, business_name, description, status, readiness_score, created_at FROM analyses ORDER BY created_at DESC LIMIT %s OFFSET %s",
            (limit, offset)
        ).fetchall()
        total = c.execute("SELECT COUNT(*) as count FROM analyses").fetchone()["count"]
    return {"items": rows, "total": total}

# New endpoint for stats
@app.get("/api/v1/stats")
def get_stats():
    with conn() as c:
        total = c.execute("SELECT COUNT(*) as count FROM analyses").fetchone()["count"]
        avg_score_row = c.execute("SELECT AVG(readiness_score) as avg FROM analyses").fetchone()
        avg_score = round(avg_score_row["avg"]) if avg_score_row["avg"] else 0
        
        # Approximate top KBLI by checking result JSON (simplification for MVP)
        top_kbli = [] # Could be implemented with more complex JSON query if needed
    
    return {
        "total_analyses": total,
        "avg_score": avg_score,
        "top_kbli": top_kbli
    }

@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})
