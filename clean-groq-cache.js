const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Lire .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8')
const envLines = envContent.split('\n')
let supabaseUrl = null
let supabaseKey = null

for (const line of envLines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
        supabaseUrl = line.split('=')[1].trim()
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
        supabaseKey = line.split('=')[1].trim()
    }
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanGroqCache() {
    console.log('🧹 Nettoyage du cache Groq...')

    // Supprimer toutes les phrases générées par Groq
    const { data, error } = await supabase
        .from('phrases_pregenerees')
        .delete()
        .eq('source', 'groq')
        .select()

    if (error) {
        console.error('❌ Erreur:', error)
        process.exit(1)
    }

    console.log(`✅ ${data.length} phrases Groq supprimées du cache`)

    // Stats restantes
    const { count } = await supabase
        .from('phrases_pregenerees')
        .select('*', { count: 'exact', head: true })

    console.log(`📊 ${count} phrases restantes en cache`)
}

cleanGroqCache()
