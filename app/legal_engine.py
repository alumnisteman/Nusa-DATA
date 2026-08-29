import json
import uuid
from typing import List, Dict, Any

# Placeholder data for legal requirements per KBLI (in real app, fetch from DB or config)
LEGAL_RULES = {
    "62020": {
        "allowed": ["Jual perangkat keras komputer", "Instalasi jaringan"],
        "required_certificates": ["Sertifikat ISO 27001"],
        "restrictions": ["Tidak boleh menyediakan layanan cloud tanpa izin"],
    },
    "62030": {
        "allowed": ["Jasa konsultasi TI"],
        "required_certificates": [],
        "restrictions": [],
    },
    "62040": {
        "allowed": ["Pemeliharaan server"],
        "required_certificates": ["Sertifikat ISO 20000"],
        "restrictions": [],
    },
}

def legal_advice(dna: Dict[str, Any]) -> Dict[str, Any]:
    """Generate simple legal advice based on DNA.
    
    * Mengambil KBLI utama & pendukung.
    * Menggabungkan aturan legal yang tersedia.
    * Mengembalikan daftar aktivitas yang diperbolehkan, sertifikat yang diperlukan, dan larangan.
    """
    kbli_codes = []
    if dna.get("kbli_main"):
        kbli_codes.append(dna["kbli_main"])  # type: ignore
    kbli_codes.extend(dna.get("kbli_supporting") or [])

    allowed: List[str] = []
    required: List[str] = []
    restrictions: List[str] = []

    for code in kbli_codes:
        rules = LEGAL_RULES.get(code)
        if not rules:
            continue
        allowed.extend(rules.get("allowed", []))
        required.extend(rules.get("required_certificates", []))
        restrictions.extend(rules.get("restrictions", []))

    # Remove duplicates while preserving order
    def uniq(seq):
        seen = set()
        return [x for x in seq if not (x in seen or seen.add(x))]

    return {
        "allowed": uniq(allowed),
        "required_certificates": uniq(required),
        "restrictions": uniq(restrictions),
    }
