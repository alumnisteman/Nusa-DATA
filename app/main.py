import os, json, uuid
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import psycopg
from psycopg.rows import dict_row
# New import for KBLI intelligence module
from kb_intelligence import extract_terms, match_kbli
from legal_engine import legal_advice
from dna_engine import build_dna, score_dna, persist_dna, generate_legal_advice
from scanner_engine import calculate_nusa_score


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
    kbli_code: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    address: str | None = None
    village: str | None = None
    district: str | None = None
    city: str | None = None
    province: str | None = None
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
        c.execute("ALTER TABLE kbli ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);")
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
        
        # Digital Twin Tables (Phase 2)
        c.execute("""
        CREATE TABLE IF NOT EXISTS companies (
            id UUID PRIMARY KEY,
            nib TEXT,
            name TEXT NOT NULL,
            business_type TEXT,
            address TEXT,
            status TEXT DEFAULT 'ACTIVE',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """)
        c.execute("""
        CREATE TABLE IF NOT EXISTS company_kblis (
            id UUID PRIMARY KEY,
            company_id UUID REFERENCES companies(id),
            kbli_code TEXT NOT NULL,
            is_main BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """)
        c.execute("""
        CREATE TABLE IF NOT EXISTS company_documents (
            id UUID PRIMARY KEY,
            company_id UUID REFERENCES companies(id),
            document_type TEXT NOT NULL,
            document_number TEXT,
            issued_date DATE,
            expiry_date DATE,
            status TEXT DEFAULT 'VALID',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """)
        c.execute("""
        CREATE TABLE IF NOT EXISTS company_experiences (
            id UUID PRIMARY KEY,
            company_id UUID REFERENCES companies(id),
            project_name TEXT NOT NULL,
            client_name TEXT NOT NULL,
            project_value NUMERIC,
            completion_date DATE,
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
        return {"status": "ok", "database": "ok", "version": "2.0.0"}
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
    # Verify provided KBLI code if any
    kbli_valid = True
    if data.kbli_code:
        with conn() as c:
            row = c.execute("SELECT 1 FROM kbli WHERE code = %s AND active = true", (data.kbli_code,)).fetchone()
            if not row:
                kbli_valid = False
    # Generate Business DNA
    dna = build_dna(data.description, data.business_name)
    dna_score = score_dna(dna)
    legal_advice = generate_legal_advice(dna)
    
    # Existing keyword‑based matching (still useful for DB lookup logic)
    matches = match_kbli(data.description)
    score, status = readiness(matches, data.latitude, data.longitude)
    
    result = {
        "business": data.model_dump(),
        "business_dna": dna,
        "business_dna_score": dna_score,
        "what_can_i_legally_do": legal_advice,
        "kbli_matches": matches,
        "readiness_score": score,
        "status": status,
        "checklist": [
            {"item": "Business DNA Generated", "status": "CHECK"},
            {"item": "KBLI selection", "status": "CHECK" if kbli_valid else "REVIEW"},
            {"item": "Location/RDTR", "status": "REVIEW"},
            {"item": "Supporting documents", "status": "REVIEW"}
        ],
        "disclaimer": "Decision‑support only. Not a guarantee of NIB/OSS approval."
    }
    aid = str(uuid.uuid4())
    with conn() as c:
        c.execute("""
          INSERT INTO analyses(
            id,business_name,description,address,village,district,city,province,
            latitude,longitude,investment_amount,status,readiness_score,result
          ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            aid, data.business_name, data.description, data.address, data.village, data.district,
            data.city, data.province,
            data.latitude, data.longitude, data.investment_amount,
            status, score, json.dumps(result)
        ))
        c.execute("""
          INSERT INTO audit_log(analysis_id,action,metadata)
          VALUES (%s,'ANALYSIS_CREATED',%s)
        """, (aid, json.dumps({"engine_version": "2.0.0", "kbli_version": "2025-demo"})))
        c.commit()
    return {"id": aid, **result}

@app.get("/api/v1/analyses/{analysis_id}")
def get_analysis(analysis_id: str):
    with conn() as c:
        row = c.execute("SELECT * FROM analyses WHERE id=%s", (analysis_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Analysis not found")
    return {"id": str(row["id"]), **row["result"], "created_at": row["created_at"]}

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
        top_kbli = []
    
    return {"total_analyses": total, "avg_score": avg_score, "top_kbli": top_kbli}

# Endpoint Business DNA
class BusinessDNAIn(BaseModel):
    business_id: uuid.UUID | None = None
    description: str = Field(min_length=5, max_length=5000)

@app.post("/api/v1/business-dna")
def create_business_dna(payload: BusinessDNAIn):
    """Generate Business DNA, calculate score, simpan ke database, dan berikan saran legal."""
    dna = build_dna(payload.description)
    score = score_dna(dna)
    business_id = payload.business_id or uuid.uuid4()
    dna_id = persist_dna(business_id, payload.description, dna, score)
    advice = legal_advice(dna)
    return {
        "dna_id": str(dna_id),
        "dna": dna,
        "score": score,
        "legal_advice": advice,
    }


# Phase 2: Gap Scanner Endpoint

@app.get("/api/v1/companies/{company_id}/gap-scan")
def gap_scan(company_id: str):
    """Execute Business Gap Scanner for a given Company Digital Twin."""
    # Mock finding company profile
    with conn() as c:
        company = c.execute("SELECT * FROM companies WHERE id = %s", (company_id,)).fetchone()
        if not company:
            # For MVP, return a mock profile if not found in DB so UI can render it.
            mock_profile = {
                "id": company_id,
                "nib": "0220000000000",
                "name": "PT NUSA MOCK",
                "kblis": [{"kbli_code": "56303"}],
                "documents": [{"document_type": "NPWP"}]
            }
            res = calculate_nusa_score(mock_profile)
            return {"company": mock_profile, "scan_result": res}
        
        kblis = c.execute("SELECT * FROM company_kblis WHERE company_id = %s", (company_id,)).fetchall()
        docs = c.execute("SELECT * FROM company_documents WHERE company_id = %s", (company_id,)).fetchall()
        
    profile = dict(company)
    profile["kblis"] = kblis
    profile["documents"] = docs
    
    res = calculate_nusa_score(profile)
    return {"company": profile, "scan_result": res}


@app.get("/api/v1/spse")
def get_spse_data():
    """Return cached SPSE procurement data."""
    spse_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "spse_data.json"))
    try:
        with open(spse_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {"items": data}
    except FileNotFoundError:
        raise HTTPException(404, "SPSE data not found")

@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/business-dna", response_class=HTMLResponse)
def business_dna_page(request: Request):
    """Halaman UI Business DNA generator."""
    return templates.TemplateResponse("business_dna.html", {"request": request})



