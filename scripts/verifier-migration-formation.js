// Script de vérification des migrations Formation
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mkbchdhbgdynxwfhpxbw.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sbp_0a6db35105a956290b3f3d2aca90c644b4f2c9e6'

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifierMigrations() {
    console.log('🔍 Vérification des migrations Formation...\n')

    try {
        // 1. Vérifier les domaines
        console.log('📊 Domaines :')
        const { data: domaines, error: errDomaines } = await supabase
            .from('formation_domaines')
            .select('*')
            .order('ordre')

        if (errDomaines) {
            console.error('❌ Erreur domaines:', errDomaines.message)
        } else {
            console.log(`   ✅ ${domaines.length} domaines trouvés`)
            domaines.forEach(d => console.log(`      - ${d.emoji} ${d.nom}`))
        }

        // 2. Vérifier les catégories
        console.log('\n📚 Catégories de compétences :')
        const { data: categories, error: errCat } = await supabase
            .from('formation_categories_competences')
            .select('*')

        if (errCat) {
            console.error('❌ Erreur catégories:', errCat.message)
        } else {
            console.log(`   ✅ ${categories.length} catégories trouvées`)
        }

        // 3. Vérifier les compétences
        console.log('\n🎯 Compétences :')
        const { data: competences, error: errComp } = await supabase
            .from('formation_competences')
            .select('*')

        if (errComp) {
            console.error('❌ Erreur compétences:', errComp.message)
        } else {
            console.log(`   ✅ ${competences.length} compétences trouvées`)
        }

        // 4. Détail par domaine
        console.log('\n📋 Répartition par domaine :')
        for (const domaine of domaines || []) {
            const { data: catsDomaine } = await supabase
                .from('formation_categories_competences')
                .select('id, nom')
                .eq('domaine_id', domaine.id)

            console.log(`\n   ${domaine.emoji} ${domaine.nom} (${catsDomaine?.length || 0} catégories) :`)

            for (const cat of catsDomaine || []) {
                const { data: comps } = await supabase
                    .from('formation_competences')
                    .select('intitule')
                    .eq('categorie_id', cat.id)

                console.log(`      - ${cat.nom} : ${comps?.length || 0} compétences`)
            }
        }

        // 5. Vérifier les autres tables
        console.log('\n🗄️  Autres tables :')
        const tables = [
            'formation_positionnements',
            'formation_evaluations_positionnement',
            'formation_plans',
            'formation_plan_competences',
            'formation_attributions_exercices',
            'formation_resultats_exercices',
            'formation_suivis_pedagogiques',
            'formation_bilans'
        ]

        for (const table of tables) {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true })

            if (error) {
                console.log(`   ❌ ${table} : ${error.message}`)
            } else {
                console.log(`   ✅ ${table} : ${count} entrées`)
            }
        }

        console.log('\n✅ Vérification terminée avec succès !')

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error.message)
        process.exit(1)
    }
}

verifierMigrations()
