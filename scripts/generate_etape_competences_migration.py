"""
Génère une migration SQL pour peupler formation_etape_competences dans Supabase.
Lit le SQLite local pour récupérer les intitulés des compétences et les info étapes,
puis génère des INSERT avec des sous-requêtes UUID.

Mapping profil codes SQLite → Supabase :
  ILL-GD → GD/Lecture, ILL-PD → PD/Lecture, ILL-DE → D/Lecture,
  ILL-PLNS → PLNS/Lecture, ILL-LPS → LPS/Lecture,
  A1 → A1/FLE, A2 → A2/FLE, A3 → A3/FLE,
  B1 → B1/Illettrisme, B2 → B2/Illettrisme, BA → BA/Illettrisme

Usage: /mnt/c/Python313/python.exe -X utf8 scripts/generate_etape_competences_migration.py
"""

import sqlite3
import os
import sys

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "SuiviFormation", "data", "suivi_formation.db")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "supabase", "migrations", "20260227000000_seed_etape_competences.sql")

# Mapping SQLite profil code → Supabase (code, type_public)
PROFIL_MAP = {
    "ILL-GD":  ("GD",   "Lecture"),
    "ILL-PD":  ("PD",   "Lecture"),
    "ILL-DE":  ("D",    "Lecture"),
    "ILL-PLNS":("PLNS", "Lecture"),
    "ILL-LPS": ("LPS",  "Lecture"),
    "A1":      ("A1",   "FLE"),
    "A2":      ("A2",   "FLE"),
    "A3":      ("A3",   "FLE"),
    "B1":      ("B1",   "Illettrisme"),
    "B2":      ("B2",   "Illettrisme"),
    "BA":      ("BA",   "Illettrisme"),
}


def escape_sql(s):
    """Échappe les apostrophes pour SQL"""
    return s.replace("'", "''")


def main():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row

    # 1. Lire les compétences SQLite : id -> intitule
    comps = {}
    for row in db.execute("SELECT id, intitule FROM competences"):
        comps[row["id"]] = row["intitule"]
    print(f"Compétences SQLite : {len(comps)}")

    # 2. Lire les étapes SQLite avec profil info
    etapes = {}
    for row in db.execute("""
        SELECT e.id, e.numero, p.code as profil_code, p.type_public
        FROM etapes_parcours e
        JOIN profils p ON e.profil_id = p.id
        ORDER BY e.id
    """):
        etapes[row["id"]] = {
            "numero": row["numero"],
            "profil_code": row["profil_code"],
            "type_public": row["type_public"]
        }
    print(f"Étapes SQLite : {len(etapes)}")

    # 3. Lire les associations etape_competences depuis SQLite
    rows = db.execute("""
        SELECT etape_id, competence_id
        FROM etape_competences
        ORDER BY etape_id, competence_id
    """).fetchall()
    print(f"Associations etape-competence SQLite : {len(rows)}")

    if len(rows) == 0:
        print("ERREUR : La table etape_competences est vide dans SQLite !")
        print("Veuillez d'abord exécuter seed_etape_competences.py")
        sys.exit(1)

    # 4. Grouper par étape
    etape_comps = {}
    for row in rows:
        eid = row["etape_id"]
        cid = row["competence_id"]
        if eid not in etape_comps:
            etape_comps[eid] = []
        etape_comps[eid].append(cid)

    # 5. Générer la migration SQL
    sql_lines = []
    sql_lines.append("-- ============================================================================")
    sql_lines.append("-- MIGRATION: Seed formation_etape_competences")
    sql_lines.append("-- Date: 2026-02-27")
    sql_lines.append("-- Description: Peuple la table M2M étapes/compétences depuis les données SQLite")
    sql_lines.append("-- Généré automatiquement par generate_etape_competences_migration.py")
    sql_lines.append("-- ============================================================================")
    sql_lines.append("")
    sql_lines.append("-- Vider la table avant insertion")
    sql_lines.append("DELETE FROM formation_etape_competences;")
    sql_lines.append("")

    total = 0
    skipped = 0

    for etape_id in sorted(etape_comps.keys()):
        et = etapes.get(etape_id)
        if not et:
            print(f"  SKIP étape SQLite {etape_id} : pas trouvée")
            skipped += len(etape_comps[etape_id])
            continue

        sqlite_profil_code = et["profil_code"]
        numero = et["numero"]

        # Mapper vers Supabase
        mapping = PROFIL_MAP.get(sqlite_profil_code)
        if not mapping:
            print(f"  SKIP profil {sqlite_profil_code} : pas de mapping Supabase")
            skipped += len(etape_comps[etape_id])
            continue

        sb_code, sb_type_public = mapping

        # Collecter les intitulés
        comp_intitules = []
        for cid in etape_comps[etape_id]:
            intitule = comps.get(cid)
            if intitule:
                comp_intitules.append(intitule)
            else:
                skipped += 1

        if not comp_intitules:
            continue

        sql_lines.append(f"-- {sb_type_public} / {sb_code} - Étape {numero} ({len(comp_intitules)} compétences)")
        sql_lines.append(f"INSERT INTO formation_etape_competences (etape_id, competence_id)")
        sql_lines.append(f"SELECT e.id, c.id")
        sql_lines.append(f"FROM formation_etapes e")
        sql_lines.append(f"JOIN formation_profils p ON e.profil_id = p.id")
        sql_lines.append(f"CROSS JOIN formation_competences c")
        sql_lines.append(f"WHERE p.code = '{escape_sql(sb_code)}'")
        sql_lines.append(f"  AND p.type_public = '{escape_sql(sb_type_public)}'")
        sql_lines.append(f"  AND e.numero = {numero}")
        sql_lines.append(f"  AND c.intitule IN (")

        for i, intitule in enumerate(comp_intitules):
            comma = "," if i < len(comp_intitules) - 1 else ""
            sql_lines.append(f"    '{escape_sql(intitule)}'{comma}")

        sql_lines.append(f"  )")
        sql_lines.append(f"ON CONFLICT (etape_id, competence_id) DO NOTHING;")
        sql_lines.append("")

        total += len(comp_intitules)

    # Vérification
    sql_lines.append("-- ============================================================================")
    sql_lines.append("-- VÉRIFICATION")
    sql_lines.append("-- ============================================================================")
    sql_lines.append("DO $$")
    sql_lines.append("DECLARE")
    sql_lines.append("    v_count INTEGER;")
    sql_lines.append("BEGIN")
    sql_lines.append("    SELECT COUNT(*) INTO v_count FROM formation_etape_competences;")
    sql_lines.append("    RAISE NOTICE 'Seed etape_competences: % associations insérées', v_count;")
    sql_lines.append("END $$;")

    # Écrire le fichier
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_lines))

    print(f"\nMigration générée : {OUTPUT_PATH}")
    print(f"Total insertions prévues : {total}")
    print(f"Skipped : {skipped}")

    db.close()


if __name__ == "__main__":
    main()
