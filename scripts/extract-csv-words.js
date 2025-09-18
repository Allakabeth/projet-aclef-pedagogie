// Script pour extraire les mots de 2-4 syllabes du CSV des 10,000 mots les plus fréquents
const fs = require('fs')
const path = require('path')

// Fonction de syllabification française améliorée
function syllabify(word) {
    const voyelles = 'aeiouyàáâäèéêëìíîïòóôöùúûü'

    // Cas spéciaux pour certains mots
    const casSpeciaux = {
        'eau': ['eau'],
        'oiseau': ['oi', 'seau'],
        'tableau': ['ta', 'bleau'],
        'château': ['châ', 'teau'],
        'gâteau': ['gâ', 'teau'],
        'manteau': ['man', 'teau'],
        'chapeau': ['cha', 'peau'],
        'nouveau': ['nou', 'veau'],
        'papillon': ['pa', 'pi', 'llon'],
        'million': ['mil', 'lion'],
        'attention': ['at', 'ten', 'tion'],
        'question': ['ques', 'tion'],
        'nation': ['na', 'tion'],
        'station': ['sta', 'tion'],
        'création': ['cré', 'a', 'tion'],
        'récréation': ['ré', 'cré', 'a', 'tion'],
        'avoir': ['a', 'voir'],
        'aller': ['al', 'ler'],
        'faire': ['fai', 're'],
        'dire': ['di', 're'],
        'pouvoir': ['pou', 'voir'],
        'vouloir': ['vou', 'loir'],
        'savoir': ['sa', 'voir'],
        'voir': ['voir'],
        'avec': ['a', 'vec'],
        'quand': ['quand'],
        'tout': ['tout'],
        'plus': ['plus'],
        'très': ['très'],
        'bien': ['bien'],
        'petit': ['pe', 'tit'],
        'grand': ['grand'],
        'temps': ['temps'],
        'année': ['an', 'née'],
        'jour': ['jour'],
        'main': ['main'],
        'yeux': ['yeux'],
        'chose': ['cho', 'se'],
        'moment': ['mo', 'ment'],
        'maison': ['mai', 'son'],
        'enfant': ['en', 'fant'],
        'femme': ['fem', 'me'],
        'homme': ['hom', 'me'],
        'famille': ['fa', 'mil', 'le'],
        'place': ['pla', 'ce'],
        'groupe': ['grou', 'pe'],
        'histoire': ['his', 'toi', 're'],
        'question': ['ques', 'tion'],
        'problème': ['pro', 'blè', 'me'],
        'solution': ['so', 'lu', 'tion'],
        'exemple': ['e', 'xem', 'ple'],
        'idée': ['i', 'dée']
    }

    if (casSpeciaux[word.toLowerCase()]) {
        return casSpeciaux[word.toLowerCase()]
    }

    // Algorithme simple pour la plupart des mots
    let syllables = []
    let currentSyllable = ''

    for (let i = 0; i < word.length; i++) {
        const char = word[i].toLowerCase()
        currentSyllable += word[i] // Garder la casse originale

        if (voyelles.includes(char)) {
            // Si c'est une voyelle, regarder ce qui suit
            const nextChar = word[i + 1]

            if (!nextChar) {
                // Fin de mot
                syllables.push(currentSyllable)
                currentSyllable = ''
            } else if (voyelles.includes(nextChar.toLowerCase())) {
                // Deux voyelles consécutives - ne pas couper
                continue
            } else {
                // Voyelle suivie de consonne(s)
                const nextNextChar = word[i + 2]
                if (nextNextChar && voyelles.includes(nextNextChar.toLowerCase())) {
                    // CV-CV pattern
                    syllables.push(currentSyllable)
                    currentSyllable = ''
                }
            }
        }
    }

    if (currentSyllable) {
        if (syllables.length > 0) {
            syllables[syllables.length - 1] += currentSyllable
        } else {
            syllables.push(currentSyllable)
        }
    }

    return syllables.length > 0 ? syllables : [word]
}

// Lire le fichier CSV
const csvPath = 'C:\\Users\\ACLEF25\\Downloads\\Copy of French top 10,000 words with links - 10,000 words.csv'

try {
    const csvContent = fs.readFileSync(csvPath, 'utf8')
    const lines = csvContent.split(/\r?\n/) // Support Windows et Unix line endings

    console.log(`📊 Fichier CSV chargé avec ${lines.length} lignes`)

    // Extraire les mots (colonne 'lemme' = index 1)
    const mots = []

    for (let i = 2; i < lines.length; i++) { // Commencer à la ligne 3 (après l'en-tête)
        const line = lines[i].trim()
        if (!line) continue

        const columns = line.split(',')
        if (columns.length >= 2) {
            const mot = columns[1].trim()

            // Nettoyer le mot (supprimer les caractères spéciaux)
            const motNettoye = mot.replace(/['"´`]/g, '').trim()

            // Ignorer les mots vides, trop courts ou avec caractères spéciaux
            if (motNettoye &&
                motNettoye.length >= 2 &&
                !motNettoye.includes("'") &&
                !motNettoye.includes('-') &&
                /^[a-zA-ZàáâäèéêëìíîïòóôöùúûüçñÀÁÂÄÈÉÊËÌÍÎÏÒÓÔÖÙÚÛÜÇÑ]+$/.test(motNettoye)) {

                const syllabes = syllabify(motNettoye)

                // Garder seulement les mots de 2-4 syllabes
                if (syllabes.length >= 2 && syllabes.length <= 4) {
                    mots.push({
                        mot: motNettoye.toLowerCase(),
                        syllabes: syllabes,
                        longueur: syllabes.length,
                        frequence: parseInt(columns[0]) || 0
                    })
                }
            }
        }
    }

    // Supprimer les doublons
    const motsUniques = new Map()
    mots.forEach(motData => {
        if (!motsUniques.has(motData.mot)) {
            motsUniques.set(motData.mot, motData)
        }
    })

    // Convertir en array et trier par fréquence
    const motsFinaux = Array.from(motsUniques.values())
        .sort((a, b) => a.frequence - b.frequence) // Tri par fréquence croissante

    console.log(`✅ ${motsFinaux.length} mots de 2-4 syllabes extraits`)

    // Créer le dictionnaire final
    const dictionnaire = {
        mots: motsFinaux.map((motData, index) => ({
            mot: motData.mot,
            syllabes: motData.syllabes,
            niveau: Math.ceil((index + 1) / 500) // Niveaux par tranches de 500
        }))
    }

    // Sauvegarder le fichier
    const outputPath = path.join(__dirname, '../public/dictionnaire-syllabes.json')
    fs.writeFileSync(outputPath, JSON.stringify(dictionnaire, null, 2), 'utf8')

    console.log(`📁 Dictionnaire sauvegardé dans: ${outputPath}`)

    // Afficher quelques exemples
    console.log('\\n📝 Premiers mots (les plus fréquents):')
    dictionnaire.mots.slice(0, 20).forEach((mot, index) => {
        console.log(`${index + 1}. ${mot.mot}: ${mot.syllabes.join('-')} (niveau ${mot.niveau})`)
    })

    console.log(`\\n🎯 Répartition par niveau:`)
    for (let i = 1; i <= Math.max(...dictionnaire.mots.map(m => m.niveau)); i++) {
        const motsNiveau = dictionnaire.mots.filter(m => m.niveau === i).length
        if (motsNiveau > 0) {
            console.log(`  Niveau ${i}: ${motsNiveau} mots`)
        }
    }

    console.log(`\\n📊 Répartition par nombre de syllabes:`)
    for (let i = 2; i <= 4; i++) {
        const motsSyllabes = dictionnaire.mots.filter(m => m.syllabes.length === i).length
        console.log(`  ${i} syllabes: ${motsSyllabes} mots`)
    }

} catch (error) {
    console.error('❌ Erreur lors du traitement du fichier CSV:', error.message)
    console.log('\\n💡 Vérifiez que le chemin du fichier est correct:')
    console.log('   C:\\\\Users\\\\ACLEF25\\\\Downloads\\\\Copy of French top 10,000 words with links - 10,000 words.csv')
}