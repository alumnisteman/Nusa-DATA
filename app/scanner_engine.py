import uuid
from typing import Dict, Any

def calculate_nusa_score(company_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate the NUSA SCORE based on company profile and mock OSS rules.
    This acts as the Business Gap Scanner.
    """
    documents = company_data.get("documents", [])
    kblis = company_data.get("kblis", [])
    
    score = 0
    max_score = 100
    
    # 1. Base Legality (NIB) - 40 points
    has_nib = company_data.get("nib") is not None
    if has_nib:
        score += 40
        
    # 2. Minimum 1 KBLI - 10 points
    if len(kblis) > 0:
        score += 10
        
    # 3. Specific documents based on mock KBLI rules
    # E.g., if F&B (Restoran/Kafe), needs Sertifikat Halal & SLS
    needs_halal = any("56101" in k["kbli_code"] or "56303" in k["kbli_code"] for k in kblis)
    needs_sbu = any("F" in k["kbli_code"] for k in kblis) # mock construction
    
    doc_types = [d["document_type"] for d in documents]
    
    doc_score = 0
    if needs_halal:
        if "Sertifikat Halal" in doc_types: doc_score += 25
        if "Sertifikat Laik Sehat" in doc_types: doc_score += 25
    else:
        # Default document check
        if "NPWP" in doc_types: doc_score += 25
        if "Akta Pendirian" in doc_types: doc_score += 25
        
    score += doc_score
    
    # Generate findings
    findings = []
    if not has_nib:
        findings.append({"type": "DANGER", "message": "NIB belum terdaftar. Ini adalah syarat mutlak legalitas."})
    else:
        findings.append({"type": "SUCCESS", "message": "NIB terdaftar aktif."})
        
    if needs_halal:
        if "Sertifikat Halal" not in doc_types:
            findings.append({"type": "WARNING", "message": "KBLI Makanan/Minuman membutuhkan Sertifikat Halal."})
        if "Sertifikat Laik Sehat" not in doc_types:
            findings.append({"type": "WARNING", "message": "KBLI Restoran/Kafe membutuhkan Sertifikat Laik Sehat (SLS)."})
            
    # Status
    if score >= 90:
        status = "PROCUREMENT_READY"
    elif score >= 50:
        status = "NEEDS_IMPROVEMENT"
    else:
        status = "NOT_READY"

    return {
        "score": score,
        "max_score": max_score,
        "status": status,
        "findings": findings
    }
