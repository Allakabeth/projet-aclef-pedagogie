"""
Script d'export SQLite -> JSON pour migration vers Supabase
Usage: python export-sqlite-json.py [chemin_db] [fichier_sortie]
"""

import sqlite3
import json
import sys
import os

def export_all(db_path, output_path):
    """Exporte toutes les tables SQLite en JSON"""

    if not os.path.exists(db_path):
        print(f"Erreur: {db_path} introuvable")
        sys.exit(1)

    db = sqlite3.connect(db_path)
    db.row_factory = sqlite3.Row

    data = {}

    # Tables a exporter dans l'ordre (respect des FK)
    tables = [
        'domaines',
        'categories_competences',
        'competences',
        'profils',
        'etapes_parcours',
        'etape_competences',
        'apprenants',
        'positionnements',
        'evaluations_positionnement',
        'plans_formation',
        'plan_competences',
        'plan_etapes',
        'bilans',
        'attestations',
        'pdf_coordonnees',
    ]

    for table in tables:
        try:
            rows = db.execute(f'SELECT * FROM [{table}]').fetchall()
            data[table] = [dict(row) for row in rows]
            print(f"  {table}: {len(data[table])} enregistrements")
        except Exception as e:
            print(f"  {table}: ERREUR - {e}")
            data[table] = []

    db.close()

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)

    print(f"\nExport termine: {output_path}")
    total = sum(len(v) for v in data.values())
    print(f"Total: {total} enregistrements")

if __name__ == '__main__':
    db_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        '..', 'SuiviFormation', 'data', 'suivi_formation.db'
    )
    output_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        'migration-data.json'
    )

    print(f"Export SQLite -> JSON")
    print(f"Source: {db_path}")
    print(f"Sortie: {output_path}\n")

    export_all(db_path, output_path)
