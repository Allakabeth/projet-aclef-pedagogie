const fs = require('fs')
const path = require('path')

console.log('=' .repeat(80))
console.log('📋 SQL À EXÉCUTER DANS LE DASHBOARD SUPABASE')
console.log('='.repeat(80))
console.log('\n🌐 URL: https://supabase.com/dashboard/project/mkbchdhbgdynxwfhpxbw/sql/new')
console.log('\n📝 Copier/coller les SQL ci-dessous dans l\'éditeur SQL et exécuter\n')
console.log('='.repeat(80))

const migrations = [
    '20251010000004_create_categories_outils.sql',
    '20251010000005_create_code_route_tables.sql'
]

migrations.forEach((filename, index) => {
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', filename)

    if (fs.existsSync(migrationPath)) {
        const sql = fs.readFileSync(migrationPath, 'utf8')

        console.log(`\n\n${'='.repeat(80)}`)
        console.log(`MIGRATION ${index + 1}/${migrations.length}: ${filename}`)
        console.log('='.repeat(80))
        console.log('\n' + sql)
    } else {
        console.log(`\n⚠️  Migration ${filename} non trouvée`)
    }
})

console.log('\n\n' + '='.repeat(80))
console.log('✅ APRÈS L\'EXÉCUTION:')
console.log('='.repeat(80))
console.log('1. Vérifier qu\'il n\'y a pas d\'erreurs')
console.log('2. Relancer le serveur Next.js: npm run dev')
console.log('3. Tester l\'accès aux pages d\'administration')
console.log('')
