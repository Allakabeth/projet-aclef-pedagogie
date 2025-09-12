import { syllabifyWord, countSyllables, isMonosyllabic } from './utils/syllabify.js'

const text = `Regretter n'est pas ma philosophie. L'idée même de regarder le passé avec tristesse me déplaît. Au contraire, j'aime prendre le temps de constater les choses pour ensuite changer la situation, améliorer ma vie. Je suis quelqu'un de plutôt rêveur, et je sais bien que rêver n'est pas agir. Par exemple, je rêve d'apprendre la guitare, voyager en voilier, ouvrir un café dans une petite ville au bord de l'eau, peindre un tableau, devenir ceinture noire de karaté, écrire un roman, créer ma propre entreprise, faire le tour du monde... La liste est longue, c'est vrai. Mais y penser est nécessaire pour espérer un jour commencer à les réaliser, non ?`

// Extraire tous les mots
const words = text.match(/\b[a-zA-ZàâäéèêëïîôöùûüÿæœçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÆŒÇ]+\b/g) || []

console.log('=== TEST DE SYLLABIFICATION ===')
console.log(`Nombre total de mots: ${words.length}`)
console.log('')

// Analyser chaque mot
const results = []
for (const word of words) {
    const syllables = syllabifyWord(word)
    const count = countSyllables(word)
    const mono = isMonosyllabic(word)
    
    results.push({
        word,
        syllables: syllables.join('-'),
        count,
        mono: mono ? 'MONO' : 'MULTI'
    })
}

// Afficher tous les résultats
results.forEach(result => {
    console.log(`${result.word.padEnd(15)} → ${result.syllables.padEnd(20)} (${result.count} syll.) [${result.mono}]`)
})

// Stats
console.log('')
console.log('=== STATISTIQUES ===')
const monoCount = results.filter(r => r.mono === 'MONO').length
const multiCount = results.filter(r => r.mono === 'MULTI').length
console.log(`Monosyllabes: ${monoCount}`)
console.log(`Multisyllabes: ${multiCount}`)
console.log(`Total syllabes: ${results.reduce((sum, r) => sum + r.count, 0)}`)

// Tests spécifiques
console.log('')
console.log('=== TESTS SPÉCIFIQUES ===')
const testWords = ['elle', 'jouer', 'royan', 'cerf-volant', 'partie', 'philosophie', 'rêveur', 'entreprise']
testWords.forEach(word => {
    const syllables = syllabifyWord(word)
    const count = countSyllables(word)
    console.log(`${word.padEnd(12)} → ${syllables.join('-').padEnd(15)} (${count} syllabes)`)
})