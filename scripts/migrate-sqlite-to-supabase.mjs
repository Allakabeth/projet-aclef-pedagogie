/**
 * Script de migration SQLite -> Supabase
 *
 * Pre-requis:
 *   1. Lancer d'abord export-sqlite-json.py pour generer migration-data.json
 *   2. Les migrations SQL (etape_competences, alter bilans, pdf_coordonnees) doivent etre appliquees
 *
 * Usage:
 *   cd projet-aclef-pedagogie
 *   python scripts/export-sqlite-json.py
 *   node scripts/migrate-sqlite-to-supabase.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// === Config ===
const DRY_RUN = process.argv.includes('--dry-run')

// Charger .env.local
const envPath = join(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const envVars = {}
envContent.replace(/\r/g, '').split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) envVars[match[1].trim()] = match[2].trim()
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Variables d\'environnement manquantes dans .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Charger les donnees exportees
const dataPath = join(__dirname, 'migration-data.json')
let sourceData
try {
    sourceData = JSON.parse(readFileSync(dataPath, 'utf-8'))
} catch (e) {
    console.error('Fichier migration-data.json introuvable.')
    console.error('Lancez d\'abord: python scripts/export-sqlite-json.py')
    process.exit(1)
}

// Tables de mapping ID: { table: { oldId: newUuid } }
const idMap = {
    domaines: {},
    categories: {},
    competences: {},
    profils: {},
    etapes: {},
    apprenants: {},
    positionnements: {},
    plans: {},
    bilans: {},
    attestations: {}
}

// Compteurs
const stats = {
    domaines: { found: 0, created: 0, skipped: 0 },
    categories: { found: 0, created: 0, skipped: 0 },
    competences: { found: 0, created: 0, skipped: 0 },
    profils: { found: 0, created: 0, skipped: 0 },
    etapes: { found: 0, created: 0, skipped: 0 },
    etape_competences: { found: 0, created: 0, skipped: 0 },
    apprenants: { found: 0, created: 0, skipped: 0 },
    positionnements: { found: 0, created: 0, skipped: 0 },
    evaluations: { found: 0, created: 0, skipped: 0 },
    plans: { found: 0, created: 0, skipped: 0 },
    plan_competences: { found: 0, created: 0, skipped: 0 },
    bilans: { found: 0, created: 0, skipped: 0 },
    bilan_competences: { found: 0, created: 0, skipped: 0 },
    attestations: { found: 0, created: 0, skipped: 0 },
    attestation_competences: { found: 0, created: 0, skipped: 0 },
}
const errors = []

// === Helpers ===

function log(msg) {
    console.log(DRY_RUN ? `[DRY-RUN] ${msg}` : msg)
}

function normalize(str) {
    if (!str) return ''
    return str.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
}

// Mapping niveau SQLite (0,1,2) -> evaluation Supabase
function mapNiveau(niveau) {
    switch (Number(niveau)) {
        case 0: return 'non'
        case 1: return 'en_cours'
        case 2: return 'oui'
        default: return 'non_evalue'
    }
}

// === Migration functions ===

async function migrateDomaines() {
    log('\n=== DOMAINES ===')

    // Charger domaines existants dans Supabase
    const { data: existing } = await supabase
        .from('formation_domaines')
        .select('id, nom, emoji, ordre')

    const existingByNom = {}
    for (const d of existing || []) {
        existingByNom[normalize(d.nom)] = d
    }

    for (const src of sourceData.domaines) {
        const key = normalize(src.nom)
        if (existingByNom[key]) {
            // Domaine existe deja -> mapper l'ID
            idMap.domaines[src.id] = existingByNom[key].id
            stats.domaines.found++
            log(`  Trouve: ${src.nom} -> ${existingByNom[key].id}`)
        } else {
            // Creer le domaine
            if (!DRY_RUN) {
                const { data, error } = await supabase
                    .from('formation_domaines')
                    .insert({
                        nom: src.nom,
                        emoji: src.emoji || null,
                        description: src.description || null,
                        ordre: src.ordre || 0,
                        actif: src.actif !== 0
                    })
                    .select('id')
                    .single()

                if (error) {
                    errors.push(`Domaine ${src.nom}: ${error.message}`)
                    stats.domaines.skipped++
                    continue
                }
                idMap.domaines[src.id] = data.id
            }
            stats.domaines.created++
            log(`  Cree: ${src.nom}`)
        }
    }
}

async function migrateCategories() {
    log('\n=== CATEGORIES ===')

    const { data: existing } = await supabase
        .from('formation_categories_competences')
        .select('id, nom, domaine_id, ordre')

    // Index par (domaine_uuid + nom normalise)
    const existingByKey = {}
    for (const c of existing || []) {
        const key = `${c.domaine_id}__${normalize(c.nom)}`
        existingByKey[key] = c
    }

    for (const src of sourceData.categories_competences) {
        const domaineUuid = idMap.domaines[src.domaine_id]
        if (!domaineUuid) {
            errors.push(`Categorie ${src.nom}: domaine_id ${src.domaine_id} non mappe`)
            stats.categories.skipped++
            continue
        }

        const key = `${domaineUuid}__${normalize(src.nom)}`
        if (existingByKey[key]) {
            idMap.categories[src.id] = existingByKey[key].id
            stats.categories.found++
        } else {
            if (!DRY_RUN) {
                const { data, error } = await supabase
                    .from('formation_categories_competences')
                    .insert({
                        domaine_id: domaineUuid,
                        nom: src.nom,
                        description: src.description || null,
                        ordre: src.ordre || 0
                    })
                    .select('id')
                    .single()

                if (error) {
                    errors.push(`Categorie ${src.nom}: ${error.message}`)
                    stats.categories.skipped++
                    continue
                }
                idMap.categories[src.id] = data.id
            }
            stats.categories.created++
            log(`  Cree: ${src.nom}`)
        }
    }
}

async function migrateCompetences() {
    log('\n=== COMPETENCES ===')

    const { data: existing } = await supabase
        .from('formation_competences')
        .select('id, intitule, categorie_id, code, ordre')

    // Index par (categorie_uuid + intitule normalise)
    const existingByKey = {}
    for (const c of existing || []) {
        const key = `${c.categorie_id}__${normalize(c.intitule)}`
        existingByKey[key] = c
    }

    // Traiter par batch de 50
    const batch = []
    for (const src of sourceData.competences) {
        const catUuid = idMap.categories[src.categorie_id]
        if (!catUuid) {
            stats.competences.skipped++
            continue
        }

        const key = `${catUuid}__${normalize(src.intitule)}`
        if (existingByKey[key]) {
            idMap.competences[src.id] = existingByKey[key].id
            stats.competences.found++
        } else {
            batch.push({
                src,
                insert: {
                    categorie_id: catUuid,
                    code: src.code || null,
                    intitule: src.intitule,
                    description: src.description || null,
                    contexte: src.contexte || null,
                    ordre: src.ordre || 0
                }
            })
        }
    }

    // Inserer les nouvelles competences par batch
    if (batch.length > 0 && !DRY_RUN) {
        const BATCH_SIZE = 50
        for (let i = 0; i < batch.length; i += BATCH_SIZE) {
            const chunk = batch.slice(i, i + BATCH_SIZE)
            const { data, error } = await supabase
                .from('formation_competences')
                .insert(chunk.map(c => c.insert))
                .select('id, intitule, categorie_id')

            if (error) {
                errors.push(`Batch competences ${i}: ${error.message}`)
                chunk.forEach(() => stats.competences.skipped++)
                continue
            }

            // Mapper les IDs retournes
            for (let j = 0; j < data.length; j++) {
                idMap.competences[chunk[j].src.id] = data[j].id
            }
        }
    }
    stats.competences.created = batch.length
    log(`  Trouvees: ${stats.competences.found}, Nouvelles: ${batch.length}`)
}

async function migrateProfils() {
    log('\n=== PROFILS ===')

    const { data: existing } = await supabase
        .from('formation_profils')
        .select('id, code, nom, type_public')

    const existingByCode = {}
    for (const p of existing || []) {
        existingByCode[p.code] = p
    }

    for (const src of sourceData.profils) {
        if (existingByCode[src.code]) {
            idMap.profils[src.id] = existingByCode[src.code].id
            stats.profils.found++
        } else {
            if (!DRY_RUN) {
                const { data, error } = await supabase
                    .from('formation_profils')
                    .insert({
                        code: src.code,
                        nom: src.nom,
                        type_public: src.type_public,
                        domaine_id: idMap.domaines[src.domaine_id] || null,
                        degre_anlci: src.degre_anlci || null,
                        description: src.description || null,
                        caracteristiques: src.caracteristiques || null,
                        besoins_formation: src.besoins_formation || null,
                        couleur: src.couleur || null,
                        ordre: src.ordre || 0
                    })
                    .select('id')
                    .single()

                if (error) {
                    errors.push(`Profil ${src.code}: ${error.message}`)
                    stats.profils.skipped++
                    continue
                }
                idMap.profils[src.id] = data.id
            }
            stats.profils.created++
            log(`  Cree: ${src.code} - ${src.nom}`)
        }
    }
}

async function migrateEtapes() {
    log('\n=== ETAPES ===')

    const { data: existing } = await supabase
        .from('formation_etapes')
        .select('id, profil_id, numero, nom')

    // Index par (profil_uuid + numero)
    const existingByKey = {}
    for (const e of existing || []) {
        existingByKey[`${e.profil_id}__${e.numero}`] = e
    }

    for (const src of sourceData.etapes_parcours) {
        const profilUuid = idMap.profils[src.profil_id]
        if (!profilUuid) {
            stats.etapes.skipped++
            continue
        }

        const key = `${profilUuid}__${src.numero}`
        if (existingByKey[key]) {
            idMap.etapes[src.id] = existingByKey[key].id
            stats.etapes.found++
        } else {
            if (!DRY_RUN) {
                const { data, error } = await supabase
                    .from('formation_etapes')
                    .insert({
                        profil_id: profilUuid,
                        numero: src.numero,
                        nom: src.nom || `Etape ${src.numero}`,
                        objectifs_lecture: src.objectifs_lecture || null,
                        objectifs_ecriture: src.objectifs_ecriture || null,
                        duree_min: src.duree_min || null,
                        duree_max: src.duree_max || null,
                        indicateurs_reussite: src.indicateurs_reussite || null,
                        outils_recommandes: src.outils_recommandes || null,
                        ordre: src.ordre || src.numero
                    })
                    .select('id')
                    .single()

                if (error) {
                    errors.push(`Etape ${src.profil_id}/${src.numero}: ${error.message}`)
                    stats.etapes.skipped++
                    continue
                }
                idMap.etapes[src.id] = data.id
            }
            stats.etapes.created++
        }
    }
    log(`  Trouvees: ${stats.etapes.found}, Nouvelles: ${stats.etapes.created}`)
}

async function migrateEtapeCompetences() {
    log('\n=== ETAPE-COMPETENCES ===')

    // Charger existants
    const { data: existing } = await supabase
        .from('formation_etape_competences')
        .select('etape_id, competence_id')

    const existingSet = new Set()
    for (const e of existing || []) {
        existingSet.add(`${e.etape_id}__${e.competence_id}`)
    }

    const toInsert = []
    for (const src of sourceData.etape_competences) {
        const etapeUuid = idMap.etapes[src.etape_id]
        const compUuid = idMap.competences[src.competence_id]
        if (!etapeUuid || !compUuid) {
            stats.etape_competences.skipped++
            continue
        }

        const key = `${etapeUuid}__${compUuid}`
        if (existingSet.has(key)) {
            stats.etape_competences.found++
        } else {
            toInsert.push({ etape_id: etapeUuid, competence_id: compUuid })
        }
    }

    if (toInsert.length > 0 && !DRY_RUN) {
        const BATCH_SIZE = 100
        for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
            const chunk = toInsert.slice(i, i + BATCH_SIZE)
            const { error } = await supabase
                .from('formation_etape_competences')
                .insert(chunk)

            if (error) {
                errors.push(`Batch etape_competences ${i}: ${error.message}`)
            }
        }
    }
    stats.etape_competences.created = toInsert.length
    log(`  Existants: ${stats.etape_competences.found}, Nouveaux: ${toInsert.length}`)
}

async function migrateApprenants() {
    log('\n=== APPRENANTS ===')

    // Les apprenants dans Supabase sont dans la table 'users' avec role='apprenant'
    const { data: existing } = await supabase
        .from('users')
        .select('id, prenom, nom')
        .eq('role', 'apprenant')

    const existingByName = {}
    for (const u of existing || []) {
        existingByName[normalize(u.prenom + ' ' + u.nom)] = u
    }

    for (const src of sourceData.apprenants) {
        const key = normalize(src.prenom + ' ' + src.nom)
        if (existingByName[key]) {
            idMap.apprenants[src.id] = existingByName[key].id
            stats.apprenants.found++
            log(`  Trouve: ${src.prenom} ${src.nom} -> ${existingByName[key].id}`)
        } else {
            if (!DRY_RUN) {
                const { data, error } = await supabase
                    .from('users')
                    .insert({
                        prenom: src.prenom,
                        nom: src.nom,
                        email: src.email || null,
                        role: 'apprenant',
                        archive: src.archive === 1
                    })
                    .select('id')
                    .single()

                if (error) {
                    errors.push(`Apprenant ${src.prenom} ${src.nom}: ${error.message}`)
                    stats.apprenants.skipped++
                    continue
                }
                idMap.apprenants[src.id] = data.id
                log(`  Cree: ${src.prenom} ${src.nom} -> ${data.id}`)
            }
            stats.apprenants.created++
        }
    }
}

async function migratePositionnements() {
    log('\n=== POSITIONNEMENTS ===')

    // On a besoin d'un formateur_id UUID. Cherchons les formateurs par prenom
    const { data: formateurs } = await supabase
        .from('users')
        .select('id, prenom, nom')
        .eq('role', 'formateur')

    const formateurByInitials = {}
    for (const f of formateurs || []) {
        // Mapper les initiales courantes
        const initials = (f.prenom[0] + f.nom[0]).toLowerCase()
        formateurByInitials[initials] = f.id
        formateurByInitials[normalize(f.prenom)] = f.id
    }

    for (const src of sourceData.positionnements) {
        const apprenantUuid = idMap.apprenants[src.apprenant_id]
        if (!apprenantUuid) {
            errors.push(`Positionnement ${src.id}: apprenant ${src.apprenant_id} non mappe`)
            stats.positionnements.skipped++
            continue
        }

        // Chercher le formateur (le champ est un texte libre dans SQLite)
        let formateurUuid = null
        if (src.formateur) {
            const fKey = normalize(src.formateur)
            formateurUuid = formateurByInitials[fKey] || null
            if (!formateurUuid && formateurs && formateurs.length > 0) {
                // Fallback: premier formateur disponible
                formateurUuid = formateurs[0].id
            }
        }

        if (!formateurUuid) {
            // On ne peut pas creer un positionnement sans formateur_id (NOT NULL)
            // Utiliser le premier formateur par defaut
            if (formateurs && formateurs.length > 0) {
                formateurUuid = formateurs[0].id
            } else {
                errors.push(`Positionnement ${src.id}: aucun formateur disponible`)
                stats.positionnements.skipped++
                continue
            }
        }

        if (!DRY_RUN) {
            const insertData = {
                apprenant_id: apprenantUuid,
                formateur_id: formateurUuid,
                date_positionnement: src.date_positionnement || null,
                statut: src.statut === 'termine' ? 'termine' : src.statut || 'en_cours',
                commentaires_generaux: src.commentaires_generaux || null
            }

            // Ajouter profils_detectes si present
            if (src.profils_detectes) {
                try {
                    insertData.profils_detectes = JSON.parse(src.profils_detectes)
                } catch {
                    insertData.profils_detectes = {}
                }
            }

            const { data, error } = await supabase
                .from('formation_positionnements')
                .insert(insertData)
                .select('id')
                .single()

            if (error) {
                errors.push(`Positionnement ${src.id}: ${error.message}`)
                stats.positionnements.skipped++
                continue
            }
            idMap.positionnements[src.id] = data.id
            log(`  Cree: positionnement ${src.id} -> ${data.id}`)
        }
        stats.positionnements.created++
    }
}

async function migrateEvaluationsPositionnement() {
    log('\n=== EVALUATIONS POSITIONNEMENT ===')

    const toInsert = []
    for (const src of sourceData.evaluations_positionnement) {
        const posUuid = idMap.positionnements[src.positionnement_id]
        const compUuid = idMap.competences[src.competence_id]

        if (!posUuid || !compUuid) {
            stats.evaluations.skipped++
            continue
        }

        toInsert.push({
            positionnement_id: posUuid,
            competence_id: compUuid,
            evaluation: mapNiveau(src.niveau_atteint),
            observations: src.commentaire || null
        })
    }

    if (toInsert.length > 0 && !DRY_RUN) {
        const BATCH_SIZE = 50
        for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
            const chunk = toInsert.slice(i, i + BATCH_SIZE)
            const { error } = await supabase
                .from('formation_evaluations_positionnement')
                .upsert(chunk, { onConflict: 'positionnement_id,competence_id' })

            if (error) {
                errors.push(`Batch evaluations ${i}: ${error.message}`)
            }
        }
    }
    stats.evaluations.created = toInsert.length
    log(`  Inserees: ${toInsert.length}`)
}

async function migratePlans() {
    log('\n=== PLANS DE FORMATION ===')

    const { data: formateurs } = await supabase
        .from('users')
        .select('id, prenom')
        .eq('role', 'formateur')

    const defaultFormateur = formateurs && formateurs.length > 0 ? formateurs[0].id : null

    for (const src of sourceData.plans_formation) {
        const apprenantUuid = idMap.apprenants[src.apprenant_id]
        if (!apprenantUuid) {
            stats.plans.skipped++
            continue
        }

        const posUuid = idMap.positionnements[src.positionnement_id] || null
        const formateurUuid = defaultFormateur

        if (!formateurUuid) {
            errors.push(`Plan ${src.id}: aucun formateur disponible`)
            stats.plans.skipped++
            continue
        }

        if (!DRY_RUN) {
            const { data, error } = await supabase
                .from('formation_plans')
                .insert({
                    apprenant_id: apprenantUuid,
                    formateur_id: formateurUuid,
                    positionnement_id: posUuid,
                    objectif_principal: src.objectif_principal || 'Migration depuis app desktop',
                    date_debut: src.date_debut || null,
                    date_fin_prevue: src.date_fin_prevue || null,
                    statut: src.statut === 'termine' ? 'termine' : src.statut || 'en_cours'
                })
                .select('id')
                .single()

            if (error) {
                errors.push(`Plan ${src.id}: ${error.message}`)
                stats.plans.skipped++
                continue
            }
            idMap.plans[src.id] = data.id
            log(`  Cree: plan ${src.id} -> ${data.id}`)
        }
        stats.plans.created++
    }
}

async function migratePlanCompetences() {
    log('\n=== PLAN-COMPETENCES ===')

    const toInsert = []
    for (const src of sourceData.plan_competences) {
        const planUuid = idMap.plans[src.plan_id]
        const compUuid = idMap.competences[src.competence_id]

        if (!planUuid || !compUuid) {
            stats.plan_competences.skipped++
            continue
        }

        toInsert.push({
            plan_id: planUuid,
            competence_id: compUuid,
            priorite: src.priorite || 2,
            statut: 'a_travailler'
        })
    }

    if (toInsert.length > 0 && !DRY_RUN) {
        const BATCH_SIZE = 50
        for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
            const chunk = toInsert.slice(i, i + BATCH_SIZE)
            const { error } = await supabase
                .from('formation_plan_competences')
                .upsert(chunk, { onConflict: 'plan_id,competence_id' })

            if (error) {
                errors.push(`Batch plan_competences ${i}: ${error.message}`)
            }
        }
    }
    stats.plan_competences.created = toInsert.length
    log(`  Inserees: ${toInsert.length}`)
}

async function migrateBilans() {
    log('\n=== BILANS ===')

    const { data: formateurs } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'formateur')
    const defaultFormateur = formateurs && formateurs.length > 0 ? formateurs[0].id : null

    // Charger toutes les competences pour le matching par intitule
    const { data: allComps } = await supabase
        .from('formation_competences')
        .select('id, intitule')
    const compByIntitule = {}
    for (const c of allComps || []) {
        compByIntitule[normalize(c.intitule)] = c.id
    }

    for (const src of sourceData.bilans) {
        const apprenantUuid = idMap.apprenants[src.apprenant_id]
        if (!apprenantUuid) {
            stats.bilans.skipped++
            continue
        }

        const planUuid = idMap.plans[src.plan_id] || null

        if (!DRY_RUN) {
            // Parser domaine_comments si c'est du JSON
            let domaineComments = {}
            if (src.domaine_comments) {
                try {
                    domaineComments = JSON.parse(src.domaine_comments)
                } catch {
                    domaineComments = {}
                }
            }

            const insertData = {
                apprenant_id: apprenantUuid,
                plan_id: planUuid,
                formateur_id: defaultFormateur,
                date_bilan: src.date_bilan || null,
                type: src.type || 'intermediaire',
                periode_debut: src.periode_debut || null,
                periode_fin: src.periode_fin || null,
                synthese: src.synthese || null,
                recommandations: src.recommandations || null,
                statut: src.statut || 'brouillon',
                duree_realisee: src.duree_realisee || null,
                domaine_comments: domaineComments
            }

            // Stocker les listes textuelles dans les champs TEXT[]
            if (src.competences_acquises) {
                insertData.competences_acquises = src.competences_acquises.split('\n').filter(Boolean)
            }
            if (src.competences_en_cours) {
                insertData.competences_en_cours = src.competences_en_cours.split('\n').filter(Boolean)
            }

            const { data, error } = await supabase
                .from('formation_bilans')
                .insert(insertData)
                .select('id')
                .single()

            if (error) {
                errors.push(`Bilan ${src.id}: ${error.message}`)
                stats.bilans.skipped++
                continue
            }
            idMap.bilans[src.id] = data.id
            log(`  Cree: bilan ${src.id} -> ${data.id}`)

            // Creer les bilan_competences a partir des textes
            const bilanComps = []

            // Competences acquises
            if (src.competences_acquises) {
                for (const line of src.competences_acquises.split('\n')) {
                    const trimmed = line.trim()
                    if (!trimmed) continue
                    const compId = compByIntitule[normalize(trimmed)]
                    if (compId) {
                        bilanComps.push({
                            bilan_id: data.id,
                            competence_id: compId,
                            statut_fin: 'acquis'
                        })
                    }
                }
            }

            // Competences en cours
            if (src.competences_en_cours) {
                for (const line of src.competences_en_cours.split('\n')) {
                    const trimmed = line.trim()
                    if (!trimmed) continue
                    const compId = compByIntitule[normalize(trimmed)]
                    if (compId) {
                        // Eviter doublon si deja dans acquises
                        if (!bilanComps.find(bc => bc.competence_id === compId)) {
                            bilanComps.push({
                                bilan_id: data.id,
                                competence_id: compId,
                                statut_fin: 'en_cours'
                            })
                        }
                    }
                }
            }

            if (bilanComps.length > 0) {
                const { error: bcError } = await supabase
                    .from('formation_bilan_competences')
                    .upsert(bilanComps, { onConflict: 'bilan_id,competence_id' })

                if (bcError) {
                    errors.push(`Bilan ${src.id} competences: ${bcError.message}`)
                } else {
                    stats.bilan_competences.created += bilanComps.length
                }
            }
        }
        stats.bilans.created++
    }
}

async function migrateAttestations() {
    log('\n=== ATTESTATIONS ===')

    // Charger competences pour matching
    const { data: allComps } = await supabase
        .from('formation_competences')
        .select('id, intitule, categorie_id')
    const compByIntitule = {}
    for (const c of allComps || []) {
        compByIntitule[normalize(c.intitule)] = c
    }

    // Charger categories pour avoir les domaines
    const { data: allCats } = await supabase
        .from('formation_categories_competences')
        .select('id, domaine_id, domaine:formation_domaines(nom)')
    const catById = {}
    for (const c of allCats || []) {
        catById[c.id] = c
    }

    for (const src of sourceData.attestations) {
        const apprenantUuid = idMap.apprenants[src.apprenant_id]
        if (!apprenantUuid) {
            stats.attestations.skipped++
            continue
        }

        const bilanUuid = idMap.bilans[src.bilan_id] || null

        if (!DRY_RUN) {
            const { data, error } = await supabase
                .from('formation_attestations')
                .insert({
                    numero: src.numero,
                    apprenant_id: apprenantUuid,
                    bilan_id: bilanUuid,
                    date_delivrance: src.date_delivrance || new Date().toISOString().split('T')[0],
                    lieu_delivrance: src.lieu_delivrance || null,
                    signataire_nom: src.signataire_nom || null,
                    signataire_fonction: src.signataire_fonction || null,
                    statut: 'valide'
                })
                .select('id')
                .single()

            if (error) {
                // Le numero peut deja exister
                if (error.message.includes('duplicate') || error.message.includes('unique')) {
                    log(`  Doublon: ${src.numero} (deja existant)`)
                    stats.attestations.found++
                } else {
                    errors.push(`Attestation ${src.numero}: ${error.message}`)
                    stats.attestations.skipped++
                }
                continue
            }
            idMap.attestations[src.id] = data.id
            log(`  Cree: ${src.numero} -> ${data.id}`)

            // Creer les attestation_competences
            if (src.competences_attestees) {
                const attComps = []
                for (const line of src.competences_attestees.split('\n')) {
                    const trimmed = line.trim()
                    if (!trimmed) continue
                    const comp = compByIntitule[normalize(trimmed)]
                    if (comp) {
                        const cat = catById[comp.categorie_id]
                        const domNom = cat?.domaine?.nom || null
                        attComps.push({
                            attestation_id: data.id,
                            competence_id: comp.id,
                            domaine_nom: domNom,
                            niveau_atteint: 'acquis'
                        })
                    }
                }

                if (attComps.length > 0) {
                    const { error: acError } = await supabase
                        .from('formation_attestation_competences')
                        .upsert(attComps, { onConflict: 'attestation_id,competence_id' })

                    if (acError) {
                        errors.push(`Attestation ${src.numero} competences: ${acError.message}`)
                    } else {
                        stats.attestation_competences.created += attComps.length
                    }
                }
            }
        }
        stats.attestations.created++
    }
}

// === Main ===

async function main() {
    console.log('=========================================')
    console.log('  Migration SQLite -> Supabase')
    console.log(`  Mode: ${DRY_RUN ? 'DRY-RUN (aucune ecriture)' : 'REEL'}`)
    console.log(`  URL: ${supabaseUrl}`)
    console.log('=========================================\n')

    try {
        // Phase 1: Referentiel (par correspondance nom)
        await migrateDomaines()
        await migrateCategories()
        await migrateCompetences()
        await migrateProfils()
        await migrateEtapes()
        await migrateEtapeCompetences()

        // Phase 2: Donnees transactionnelles
        await migrateApprenants()
        await migratePositionnements()
        await migrateEvaluationsPositionnement()
        await migratePlans()
        await migratePlanCompetences()
        await migrateBilans()
        await migrateAttestations()

        // Rapport
        console.log('\n=========================================')
        console.log('  RAPPORT DE MIGRATION')
        console.log('=========================================')

        for (const [table, counts] of Object.entries(stats)) {
            const total = counts.found + counts.created + counts.skipped
            if (total > 0) {
                console.log(`  ${table}: ${counts.found} trouves, ${counts.created} crees, ${counts.skipped} ignores`)
            }
        }

        if (errors.length > 0) {
            console.log(`\n  ERREURS (${errors.length}):`)
            for (const e of errors) {
                console.log(`    - ${e}`)
            }
        } else {
            console.log('\n  Aucune erreur !')
        }

        console.log('\n=========================================')

    } catch (err) {
        console.error('Erreur fatale:', err)
        process.exit(1)
    }
}

main()
