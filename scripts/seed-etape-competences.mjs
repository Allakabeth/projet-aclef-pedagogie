/**
 * Seed formation_etape_competences dans Supabase
 * Lit le mapping JSON exporté depuis SQLite et insère les associations.
 *
 * Usage: node scripts/seed-etape-competences.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('ERREUR: Variables NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises dans .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Charger le mapping JSON
const mappingPath = resolve(__dirname, 'etape_competences_mapping.json')
const mapping = JSON.parse(readFileSync(mappingPath, 'utf-8'))

async function main() {
    console.log(`Chargement de ${mapping.length} étapes à seeder...`)

    // 1. Charger tous les profils Supabase
    const { data: profils, error: profilsErr } = await supabase
        .from('formation_profils')
        .select('id, code, type_public')
    if (profilsErr) throw profilsErr
    console.log(`${profils.length} profils Supabase chargés`)

    // 2. Charger toutes les étapes Supabase
    const { data: etapes, error: etapesErr } = await supabase
        .from('formation_etapes')
        .select('id, profil_id, numero')
    if (etapesErr) throw etapesErr
    console.log(`${etapes.length} étapes Supabase chargées`)

    // 3. Charger toutes les compétences Supabase
    const { data: competences, error: compsErr } = await supabase
        .from('formation_competences')
        .select('id, intitule')
    if (compsErr) throw compsErr
    console.log(`${competences.length} compétences Supabase chargées`)

    // 4. Créer les index de lookup
    // profil: "code|type_public" → profil_id
    const profilIndex = {}
    for (const p of profils) {
        profilIndex[`${p.code}|${p.type_public}`] = p.id
    }

    // etape: "profil_id|numero" → etape_id
    const etapeIndex = {}
    for (const e of etapes) {
        etapeIndex[`${e.profil_id}|${e.numero}`] = e.id
    }

    // competence: intitule → competence_id
    const compIndex = {}
    for (const c of competences) {
        compIndex[c.intitule] = c.id
    }

    // 5. Vider la table existante
    console.log('\nSuppression des données existantes...')
    const { error: deleteErr } = await supabase
        .from('formation_etape_competences')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // trick to delete all
    if (deleteErr) {
        console.error('Erreur suppression:', deleteErr.message)
        // Essayer sans filtre via RPC ou continuer
    }

    // 6. Insérer par batch
    let totalInserted = 0
    let totalSkipped = 0
    let etapesNotFound = 0

    for (const entry of mapping) {
        const { profil_code, type_public, numero, intitules } = entry

        // Trouver l'étape UUID
        const profilId = profilIndex[`${profil_code}|${type_public}`]
        if (!profilId) {
            console.log(`  SKIP profil ${profil_code}/${type_public}: non trouvé en Supabase`)
            totalSkipped += intitules.length
            continue
        }

        const etapeId = etapeIndex[`${profilId}|${numero}`]
        if (!etapeId) {
            console.log(`  SKIP étape ${profil_code} #${numero}: non trouvée en Supabase`)
            etapesNotFound++
            totalSkipped += intitules.length
            continue
        }

        // Mapper les intitulés vers des UUIDs
        const rows = []
        let notFound = 0
        for (const intitule of intitules) {
            const compId = compIndex[intitule]
            if (compId) {
                rows.push({ etape_id: etapeId, competence_id: compId })
            } else {
                notFound++
            }
        }

        if (rows.length === 0) {
            continue
        }

        // Insérer par batch de 500
        for (let i = 0; i < rows.length; i += 500) {
            const batch = rows.slice(i, i + 500)
            const { error: insertErr } = await supabase
                .from('formation_etape_competences')
                .upsert(batch, { onConflict: 'etape_id,competence_id' })

            if (insertErr) {
                console.error(`  ERREUR ${profil_code} #${numero} batch ${i}:`, insertErr.message)
                totalSkipped += batch.length
            } else {
                totalInserted += batch.length
            }
        }

        const status = notFound > 0 ? ` (${notFound} comp. non trouvées)` : ''
        console.log(`  ${profil_code}/${type_public} Étape ${numero}: ${rows.length} insérées${status}`)
    }

    // 7. Vérification
    const { count } = await supabase
        .from('formation_etape_competences')
        .select('*', { count: 'exact', head: true })

    console.log('\n' + '='.repeat(60))
    console.log(`Total inséré: ${totalInserted}`)
    console.log(`Total skipped: ${totalSkipped}`)
    console.log(`Étapes non trouvées en Supabase: ${etapesNotFound}`)
    console.log(`Vérification - lignes en DB: ${count}`)
    console.log('='.repeat(60))
}

main().catch(err => {
    console.error('ERREUR FATALE:', err)
    process.exit(1)
})
