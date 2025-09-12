// Analyse et classification centralisée des mots
// Basé sur la logique de monosyllabes-multisyllabes.js

// Fonctions de syllabification (reprises de monosyllabes-multisyllabes.js)
function syllabifyWord(word) {
    if (!word || word.length === 0) return []
    
    const voyelles = ['a', 'e', 'i', 'o', 'u', 'y', 'é', 'è', 'à', 'ù', 'î', 'ô', 'â', 'ê', 'û', 'ë', 'ï', 'ÿ', 'ç']
    const consonnes = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'z']
    
    // Cas particuliers
    const exceptions = {
        'le': ['le'], 'la': ['la'], 'les': ['les'], 'des': ['des'], 'un': ['un'], 'une': ['une'],
        'du': ['du'], 'au': ['au'], 'aux': ['aux'], 'ce': ['ce'], 'se': ['se'], 'de': ['de'],
        'ne': ['ne'], 'me': ['me'], 'te': ['te'], 'que': ['que'], 'si': ['si'], 'ou': ['ou'],
        'et': ['et'], 'est': ['est'], 'son': ['son'], 'mon': ['mon'], 'ton': ['ton'],
        'ses': ['ses'], 'mes': ['mes'], 'tes': ['tes'], 'nos': ['nos'], 'vos': ['vos'],
        'eux': ['eux'], 'lui': ['lui'], 'moi': ['moi'], 'toi': ['toi'], 'soi': ['soi'],
        'par': ['par'], 'sur': ['sur'], 'dans': ['dans'], 'sous': ['sous'], 'pour': ['pour'],
        'sans': ['sans'], 'avec': ['avec'], 'vers': ['vers'], 'chez': ['chez'],
        'très': ['très'], 'plus': ['plus'], 'bien': ['bien'], 'mal': ['mal'], 'tout': ['tout'],
        'tous': ['tous'], 'rien': ['rien'], 'peu': ['peu'], 'trop': ['trop'], 'assez': ['as', 'sez'],
        'car': ['car'], 'donc': ['donc'], 'mais': ['mais'], 'puis': ['puis'], 'où': ['où'],
        'leur': ['leur'], 'leurs': ['leurs'], 'notre': ['no', 'tre'], 'votre': ['vo', 'tre'],
        'autre': ['au', 'tre'], 'même': ['mê', 'me'], 'chaque': ['cha', 'que'], 'quel': ['quel'],
        'quelle': ['quel', 'le'], 'quels': ['quels'], 'quelles': ['quel', 'les'],
        'cette': ['cet', 'te'], 'celui': ['ce', 'lui'], 'celle': ['cel', 'le'],
        'ceux': ['ceux'], 'celles': ['cel', 'les'], 'ceci': ['ce', 'ci'], 'cela': ['ce', 'la'],
        'ça': ['ça'], 'celui-ci': ['ce', 'lui', 'ci'], 'celui-là': ['ce', 'lui', 'là'],
        'celle-ci': ['cel', 'le', 'ci'], 'celle-là': ['cel', 'le', 'là'],
        'ceux-ci': ['ceux', 'ci'], 'ceux-là': ['ceux', 'là'],
        'celles-ci': ['cel', 'les', 'ci'], 'celles-là': ['cel', 'les', 'là'],
        'faire': ['fai', 're'], 'dire': ['di', 're'], 'voir': ['voir'], 'avoir': ['a', 'voir'],
        'être': ['ê', 'tre'], 'aller': ['al', 'ler'], 'venir': ['ve', 'nir'], 'partir': ['par', 'tir'],
        'mettre': ['met', 'tre'], 'prendre': ['pren', 'dre'], 'donner': ['don', 'ner'],
        'porter': ['por', 'ter'], 'parler': ['par', 'ler'], 'demander': ['de', 'man', 'der'],
        'regarder': ['re', 'gar', 'der'], 'trouver': ['trou', 'ver'], 'penser': ['pen', 'ser'],
        'croire': ['croi', 're'], 'savoir': ['sa', 'voir'], 'vouloir': ['vou', 'loir'],
        'pouvoir': ['pou', 'voir'], 'devoir': ['de', 'voir'], 'falloir': ['fal', 'loir']
    }
    
    const lowerWord = word.toLowerCase()
    if (exceptions[lowerWord]) {
        return exceptions[lowerWord]
    }
    
    let syllables = []
    let currentSyllable = ''
    
    for (let i = 0; i < word.length; i++) {
        const char = word[i].toLowerCase()
        
        if (voyelles.includes(char)) {
            currentSyllable += char
            
            // Si c'est la dernière lettre, ou si la suivante est une voyelle, finir la syllabe
            if (i === word.length - 1 || (i < word.length - 1 && voyelles.includes(word[i + 1].toLowerCase()))) {
                if (currentSyllable.length > 0) {
                    syllables.push(currentSyllable)
                    currentSyllable = ''
                }
            }
        } else if (consonnes.includes(char)) {
            if (currentSyllable.length > 0 && voyelles.includes(currentSyllable[currentSyllable.length - 1])) {
                // On a une voyelle dans la syllabe courante, ajouter la consonne et finir la syllabe
                // sauf si c'est un groupe de consonnes à ne pas séparer
                if (i < word.length - 1) {
                    const nextChar = word[i + 1].toLowerCase()
                    if (consonnes.includes(nextChar)) {
                        // Groupe de consonnes, garder ensemble si possible
                        const consonantGroup = char + nextChar
                        if (['bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'tr', 'vr', 'ch', 'th', 'ph', 'gh'].includes(consonantGroup)) {
                            syllables.push(currentSyllable)
                            currentSyllable = char
                        } else {
                            currentSyllable += char
                        }
                    } else {
                        currentSyllable += char
                    }
                } else {
                    currentSyllable += char
                }
            } else {
                currentSyllable += char
            }
        } else {
            currentSyllable += char
        }
    }
    
    if (currentSyllable.length > 0) {
        syllables.push(currentSyllable)
    }
    
    return syllables.length > 0 ? syllables : [word]
}

function countSyllables(word) {
    if (!word) return 0
    
    const vowels = 'aeiouy'
    word = word.toLowerCase()
    let count = 0
    let previousWasVowel = false
    
    for (let i = 0; i < word.length; i++) {
        const isVowel = vowels.includes(word[i])
        if (isVowel && !previousWasVowel) {
            count++
        }
        previousWasVowel = isVowel
    }
    
    // Ajustements pour le français
    if (word.endsWith('e') && count > 1) {
        count--
    }
    
    return Math.max(1, count)
}

function isMonosyllabic(word) {
    const syllables = syllabifyWord(word)
    return syllables.length === 1
}

// Fonction principale d'analyse des mots
export function analyzeWordsFromGroups(groupes) {
    const allWords = []
    
    // Traiter chaque groupe
    groupes.forEach(groupe => {
        if (groupe.contenu && groupe.contenu.trim()) {
            const words = groupe.contenu
                .split(/\s+/)
                .filter(word => word.trim() !== '')
                .map(word => {
                    // Nettoyer le mot : enlever ponctuation
                    let cleanWord = word.replace(/[.,!?;:()"""]/g, '').toLowerCase()
                    
                    // Si le mot contient une apostrophe, prendre seulement la partie après l'apostrophe
                    if (cleanWord.includes("'")) {
                        cleanWord = cleanWord.split("'").pop()
                    }
                    
                    return {
                        original: word,
                        clean: cleanWord,
                        groupe_id: groupe.id,
                        syllables: syllabifyWord(cleanWord),
                        estimatedSyllables: countSyllables(cleanWord),
                        isMonosyllabe: isMonosyllabic(cleanWord)
                    }
                })
                .filter(wordObj => wordObj.clean.length > 0)
            
            allWords.push(...words)
        }
    })
    
    // Éliminer les doublons en gardant seulement les mots uniques
    const uniqueWordsMap = new Map()
    allWords.forEach(wordObj => {
        if (!uniqueWordsMap.has(wordObj.clean)) {
            uniqueWordsMap.set(wordObj.clean, wordObj)
        }
    })
    
    const uniqueWords = Array.from(uniqueWordsMap.values())
    
    // Séparer en mono et multi syllabiques
    const monosyllabes = uniqueWords.filter(word => word.isMonosyllabe)
    const multisyllabes = uniqueWords.filter(word => !word.isMonosyllabe)
    
    return {
        allWords: uniqueWords,
        monosyllabes,
        multisyllabes,
        totalUniqueWords: uniqueWords.length,
        totalMonosyllabes: monosyllabes.length,
        totalMultisyllabes: multisyllabes.length
    }
}