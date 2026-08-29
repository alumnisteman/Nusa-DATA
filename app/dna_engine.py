import uuid
from typing import List, Dict, Any

from kb_intelligence import extract_terms, match_kbli


def build_dna(description: str, business_name: str = "") -> Dict[str, Any]:
    """Generate comprehensive Business DNA structure from a free‑text description."""
    terms = extract_terms(description)
    candidates = match_kbli(description) or []
    
    desc_lower = description.lower()
    
    # Heuristics for reasoning engine
    aktivitas_utama = []
    aktivitas_pendukung = []
    produk = []
    jasa = []
    potensi = []
    
    if "komputer" in desc_lower or "it" in desc_lower or "software" in desc_lower:
        aktivitas_utama.append("Penjualan komputer dan perlengkapannya")
        jasa.append("Instalasi jaringan dan maintenance server")
        produk.append("Perangkat keras komputer dan server")
        potensi.append("Pengadaan infrastruktur IT Pemerintah (LKPP/SPSE)")
        potensi.append("Pemeliharaan server instansi")
    
    if "kopi" in desc_lower or "kafe" in desc_lower:
        aktivitas_utama.append("Penyediaan minuman kopi dan tempat bersantai")
        aktivitas_pendukung.append("Penjualan makanan ringan")
        produk.append("Minuman olahan kopi, pastry, makanan berat")
        jasa.append("Layanan dine-in dan take-away")
    
    if "pemerintah" in desc_lower or "tender" in desc_lower or "pengadaan" in desc_lower:
        target_pasar = "B2B dan B2G (Pemerintah)"
        model_transaksi = "Pengadaan Barang/Jasa (B2G)"
    else:
        target_pasar = "B2C / Umum"
        model_transaksi = "Retail / Langsung"

    dna = {
        "aktivitas_utama": aktivitas_utama or ["Aktivitas perdagangan/jasa umum"],
        "aktivitas_pendukung": aktivitas_pendukung or ["Aktivitas operasional rutin"],
        "produk": produk or ["Barang dagangan umum"],
        "jasa": jasa or ["Jasa pelayanan umum"],
        "target_pasar": target_pasar,
        "lokasi": terms if isinstance(terms, list) else [],
        "model_transaksi": model_transaksi,
        "skala": "Menengah",
        "kbli_kandidat": [c["code"] for c in candidates],
        "potensi_pengadaan": potensi or ["Pengadaan barang habis pakai"]
    }
    return dna

def score_dna(dna: Dict[str, Any]) -> int:
    score = 40
    if len(dna["kbli_kandidat"]) > 0: score += 20
    if len(dna["aktivitas_utama"]) > 0: score += 10
    if dna["model_transaksi"] != "Retail / Langsung": score += 10
    if len(dna["potensi_pengadaan"]) > 0: score += 11
    return score

def generate_legal_advice(dna: Dict[str, Any]) -> Dict[str, Any]:
    # Mock reasoning for legal limits based on DNA
    bisa = []
    perlu = []
    jangan = []
    
    if "B2G" in dna["model_transaksi"]:
        bisa.extend([
            "Mengikuti lelang pengadaan barang dan jasa pemerintah (LPSE)",
            "Mendaftar sebagai vendor di E-Katalog LKPP"
        ])
        perlu.extend([
            "NIB berbasis risiko menengah/tinggi",
            "Sertifikat Badan Usaha (SBU) jika terkait konstruksi",
            "Pengalaman kerja/kontrak sebelumnya untuk pembuktian kualifikasi"
        ])
        jangan.extend([
            "Menjalankan proyek tanpa KBLI yang terdaftar persis pada dokumen tender",
            "Memalsukan dokumen pengalaman kerja"
        ])
    else:
        bisa.extend([
            "Melakukan penjualan langsung ke konsumen akhir",
            "Membuka cabang di lokasi sesuai peruntukan tata ruang"
        ])
        perlu.extend([
            "Sertifikat Laik Sehat (SLS) untuk FnB",
            "Sertifikasi Halal (wajib 2024)"
        ])
        jangan.extend([
            "Memproduksi makanan kemasan tanpa izin edar BPOM/PIRT"
        ])

    return {
        "anda_bisa": bisa,
        "anda_perlu_memenuhi": perlu,
        "jangan_lakukan": jangan
    }


def persist_dna(business_id: uuid.UUID, description: str, dna: Dict[str, Any], score: int) -> uuid.UUID:
    """Insert the DNA record into the ``business_dna`` table and return its ID.

    The function opens a DB connection using the ``conn`` helper that exists in
    ``app.main`` (imported lazily to avoid circular imports).
    """
    from main import conn  # flat import — no package prefix needed inside container
    dna_id = uuid.uuid4()
    with conn() as c:
        c.execute(
            """
            INSERT INTO business_dna (id, business_id, description, dna, score)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (str(dna_id), str(business_id), description, json.dumps(dna), score),
        )
    return dna_id
