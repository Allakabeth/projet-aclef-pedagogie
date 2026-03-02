"""
Exporte les associations etape_competences depuis SQLite vers un JSON.
Le JSON contient : pour chaque étape, le profil code Supabase, le numéro,
et la liste des intitulés de compétences.

Usage: /mnt/c/Python313/python.exe -X utf8 scripts/export_etape_comps_json.py
"""

import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "SuiviFormation", "data", "suivi_formation.db")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "etape_competences_mapping.json")

# Mapping SQLite profil code → Supabase (code, type_public)
# En Supabase les codes ILL-xx sont sous Illettrisme, B1/B2/BA sous Alphabétisation
PROFIL_MAP = {
    "ILL-GD":  ("ILL-GD",  "Illettrisme"),
    "ILL-PD":  ("ILL-PD",  "Illettrisme"),
    "ILL-DE":  ("ILL-DE",  "Illettrisme"),
    "ILL-PLNS":("ILL-PLNS","Illettrisme"),
    "ILL-LPS": ("ILL-LPS", "Illettrisme"),
    "A1":      ("A1",      "FLE"),
    "A2":      ("A2",      "FLE"),
    "A3":      ("A3",      "FLE"),
    "B1":      ("B1",      "Alphabétisation"),
    "B2":      ("B2",      "Alphabétisation"),
    "BA":      ("BA",      "Alphabétisation"),
}

def main():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row

    # Competences: id → intitule
    comps = {}
    for row in db.execute("SELECT id, intitule FROM competences"):
        comps[row["id"]] = row["intitule"]

    # Etapes: id → (profil_code, numero)
    etapes = {}
    for row in db.execute("""
        SELECT e.id, e.numero, p.code as profil_code
        FROM etapes_parcours e
        JOIN profils p ON e.profil_id = p.id
        ORDER BY e.id
    """):
        etapes[row["id"]] = {
            "numero": row["numero"],
            "profil_code": row["profil_code"]
        }

    # Etape_competences groupées
    rows = db.execute("""
        SELECT etape_id, competence_id
        FROM etape_competences
        ORDER BY etape_id, competence_id
    """).fetchall()

    result = []
    current_etape_id = None
    current_entry = None

    for row in rows:
        eid = row["etape_id"]
        cid = row["competence_id"]

        if eid != current_etape_id:
            if current_entry:
                result.append(current_entry)

            et = etapes.get(eid)
            if not et:
                current_etape_id = eid
                current_entry = None
                continue

            mapping = PROFIL_MAP.get(et["profil_code"])
            if not mapping:
                current_etape_id = eid
                current_entry = None
                continue

            sb_code, sb_type = mapping
            current_entry = {
                "profil_code": sb_code,
                "type_public": sb_type,
                "numero": et["numero"],
                "intitules": []
            }
            current_etape_id = eid

        if current_entry is None:
            continue

        intitule = comps.get(cid)
        if intitule:
            current_entry["intitules"].append(intitule)

    if current_entry:
        result.append(current_entry)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    total_comps = sum(len(e["intitules"]) for e in result)
    print(f"Exporté {len(result)} étapes avec {total_comps} associations vers {OUTPUT_PATH}")

    db.close()

if __name__ == "__main__":
    main()
