// Syllabification française basée sur la classe FrenchSyllabifier de app_web.py

class FrenchSyllabifier {
    constructor() {
        this.vowels = new Set('aeiouàâäéèêëïîôöùûüÿæœAEIOUÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÆŒ')
        this.consonants = new Set('bcdfghjklmnpqrstvwxzçBCDFGHJKLMNPQRSTVWXZÇ')
        
        this.consonantClusters = new Set([
            'bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr',
            'pl', 'pr', 'tr', 'vr', 'sc', 'sk', 'sl', 'sm', 'sn',
            'sp', 'st', 'sw', 'th', 'ch', 'ph', 'gh', 'sh', 'sch',
            'ndr', 'ntr'  // Ajout pour "prendre"
        ])
        
        // Diphtongues et groupes vocaliques français
        this.vowelGroups = new Set([
            'ai', 'au', 'eau', 'ei', 'eu', 'ou', 'oi', 'ui', 'ue', 'ie',
            'ia', 'io', 'ié', 'ieu', 'oin', 'ain', 'ein', 'un', 'in', 'on',
            'an', 'en', 'am', 'em', 'im', 'om', 'um', 'yn', 'ym'
        ])
        
        // Terminaisons muettes courantes
        this.muteSuffixes = [
            'e', 'es', 'ent', 'ants', 'ents'
        ]
        
        // Patterns de mots où 'e' final n'est pas muet
        this.nonMuteEPatterns = [
            /^.e$/,        // mots de 2 lettres : je, me, te, le, etc.
            /ée$/,         // terminaisons en -ée : idée, entrée
            /ie$/          // terminaisons en -ie : vie, sortie, partie
        ]
    }
    
    isVowel(char) {
        return this.vowels.has(char.toLowerCase())
    }
    
    isConsonant(char) {
        return this.consonants.has(char.toLowerCase())
    }
    
    // Déterminer si Y est une voyelle selon le contexte
    isYVowel(word, index) {
        const char = word[index].toLowerCase()
        if (char !== 'y') return false
        
        // Y en début de mot = consonne (yaourt, yeux)
        if (index === 0) return false
        
        // Y entre deux consonnes = voyelle (stylo, pyjama)
        const before = index > 0 ? word[index - 1] : ''
        const after = index < word.length - 1 ? word[index + 1] : ''
        
        const beforeIsConsonant = before && this.consonants.has(before.toLowerCase())
        const afterIsConsonant = after && this.consonants.has(after.toLowerCase())
        
        if (beforeIsConsonant && afterIsConsonant) return true
        
        // Y après voyelle = généralement consonne (royal, moyen)
        if (before && this.vowels.has(before.toLowerCase())) {
            return false
        }
        
        // Y avant voyelle = consonne (payer, essuyer)  
        if (after && this.vowels.has(after.toLowerCase())) {
            return false
        }
        
        // Défaut : Y seul = voyelle
        return true
    }
    
    // Vérifier si le 'e' final est muet
    isMuteE(word) {
        const wordLower = word.toLowerCase()
        
        // Vérifier les patterns où 'e' n'est pas muet
        for (const pattern of this.nonMuteEPatterns) {
            if (pattern.test(wordLower)) {
                return false
            }
        }
        
        // 'e' final est muet dans la plupart des cas
        return wordLower.endsWith('e')
    }
    
    // Détecter les groupes vocaliques (diphtongues, etc.)
    findVowelSequence(word, startIndex) {
        let sequence = ''
        let i = startIndex
        
        while (i < word.length) {
            const char = word[i].toLowerCase()
            
            if (this.vowels.has(char)) {
                sequence += char
                i++
            } else if (char === 'y' && this.isYVowel(word, i)) {
                sequence += char
                i++
            } else {
                break
            }
        }
        
        return { sequence, endIndex: i }
    }
    
    findVowelGroups(word) {
        const vowelGroups = []
        let i = 0
        
        while (i < word.length) {
            const char = word[i].toLowerCase()
            
            if (this.vowels.has(char) || (char === 'y' && this.isYVowel(word, i))) {
                const start = i
                const { sequence, endIndex } = this.findVowelSequence(word, i)
                
                // Vérifier si c'est un hiatus (voyelles à prononcer séparément)
                if (this.isHiatus(sequence)) {
                    // Traiter chaque voyelle séparément pour les hiatus
                    for (let j = start; j < endIndex; j++) {
                        const singleChar = word[j].toLowerCase()
                        if (this.vowels.has(singleChar) || (singleChar === 'y' && this.isYVowel(word, j))) {
                            vowelGroups.push([j, j + 1])
                        }
                    }
                } else {
                    // Traiter comme un seul groupe vocalique
                    vowelGroups.push([start, endIndex])
                }
                
                i = endIndex
            } else {
                i++
            }
        }
        
        return vowelGroups
    }
    
    // Détecter les hiatus (voyelles prononcées séparément)
    isHiatus(vowelSequence) {
        if (vowelSequence.length <= 1) return false
        
        // Exceptions : diphtongues vraies (ne JAMAIS séparer)
        const nonHiatusPatterns = [
            /^(ai|au|eau|ei|eu|ou|oi|ui|ieu|oin|ain|ein|an|en|in|on|un)$/,
            /^ie$/  // "ie" n'est pas un hiatus, c'est une diphtongue
        ]
        
        // Vérifier les exceptions d'abord
        for (const pattern of nonHiatusPatterns) {
            if (pattern.test(vowelSequence)) {
                return false
            }
        }
        
        // Patterns courants d'hiatus en français (TOUJOURS séparer)
        const hiatusPatterns = [
            /^ue$/,              // u + e dans "jouer", "créer", "continuer"
            /^ér$/,              // é + r (cas spécial pour créer)
            /^[aeio][aeiou]$/,   // Deux voyelles distinctes (sauf diphtongues)
            /^[aeiou]y$/,        // voyelle + y final (royal, moyen)
            /^y[aeiou]$/         // y + voyelle initial
        ]
        
        // Vérifier les patterns d'hiatus
        for (const pattern of hiatusPatterns) {
            if (pattern.test(vowelSequence)) {
                return true
            }
        }
        
        return false
    }
    
    isConsonantCluster(consonants) {
        const consonantsLower = consonants.toLowerCase()
        for (const cluster of this.consonantClusters) {
            if (consonantsLower.startsWith(cluster)) {
                return true
            }
        }
        return false
    }
    
    syllabifyWord(word) {
        if (word.length <= 2) {
            return [word]
        }
        
        // Gestion des mots composés avec tiret
        if (word.includes('-')) {
            const parts = word.split('-')
            const result = []
            for (const part of parts) {
                const partSyllables = this.syllabifyWord(part)
                result.push(...partSyllables)
            }
            return result
        }
        
        const wordClean = word.replace(/[^a-zA-ZàâäéèêëïîôöùûüÿæœçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÆŒÇ]/g, '')
        
        if (wordClean.length <= 2) {
            return [word]
        }
        
        // Gestion spéciale pour les mots avec terminaisons muettes
        let workingWord = wordClean
        let muteSuffix = ''
        
        // Identifier et séparer les terminaisons muettes
        if (this.isMuteE(wordClean) && wordClean.length > 2) {
            const wordLower = wordClean.toLowerCase()
            
            // Cas spéciaux où le 'e' n'est pas muet (partie, sortie, etc.)
            if (!wordLower.endsWith('ie') && !wordLower.endsWith('ée')) {
                // Exception pour "prendre" et mots similaires - le 'e' n'est pas muet
                if (wordLower === 'prendre' || wordLower.endsWith('ndre') || wordLower.endsWith('mbre')) {
                    // Ne pas traiter le 'e' comme muet
                } else {
                    workingWord = wordClean.slice(0, -1)
                    muteSuffix = wordClean.slice(-1)
                }
            }
        }
        
        const vowelGroups = this.findVowelGroups(workingWord)
        
        // Cas spéciaux avant la logique générale
        const wordLower = wordClean.toLowerCase()
        
        // Mots en -ie : séparer seulement si > 3 lettres (vie = 1 syllabe, partie = 2 syllabes)
        if (wordLower.endsWith('ie') && wordClean.length > 3) {
            const base = wordClean.slice(0, -2)
            if (base.length > 0) {
                const baseSyllables = this.syllabifyWord(base)
                baseSyllables.push('ie')
                return baseSyllables
            }
        }
        
        // Verbes en -er : règle spéciale pour la segmentation
        if (wordLower.endsWith('er') && wordClean.length > 3) {
            // Pour les verbes en -er, on coupe avant le 'er' mais en gardant la consonne avec 'er'
            // Exemple: regarder -> re-gar-der (pas re-gard-er)
            const baseWithoutEr = wordClean.slice(0, -2)
            
            if (baseWithoutEr.length >= 2) {
                // Syllabifier la base sans 'er'
                const baseSyllables = this.syllabifyWord(baseWithoutEr)
                
                // Déplacer la dernière consonne de la base vers 'er' si possible
                if (baseSyllables.length > 0) {
                    let lastSyllable = baseSyllables[baseSyllables.length - 1]
                    
                    // Si la dernière syllabe se termine par une consonne, la déplacer vers 'er'
                    if (lastSyllable.length > 1) {
                        const lastChar = lastSyllable.slice(-1)
                        if (this.isConsonant(lastChar)) {
                            // Déplacer la consonne vers 'er'
                            baseSyllables[baseSyllables.length - 1] = lastSyllable.slice(0, -1)
                            baseSyllables.push(lastChar + 'er')
                            return baseSyllables.filter(s => s.length > 0)
                        }
                    }
                }
                
                // Cas par défaut : juste ajouter 'er'
                baseSyllables.push('er')
                return baseSyllables
            }
        }
        
        if (vowelGroups.length <= 1) {
            return [word]
        }
        
        const syllables = []
        let lastCut = 0
        
        for (let i = 0; i < vowelGroups.length - 1; i++) {
            const currentVowelEnd = vowelGroups[i][1]
            const nextVowelStart = vowelGroups[i + 1][0]
            
            const consonants = workingWord.slice(currentVowelEnd, nextVowelStart)
            
            let cutPos
            if (consonants.length === 0) {
                // Hiatus - coupure entre les voyelles
                cutPos = currentVowelEnd
            } else if (consonants.length === 1) {
                // Une consonne va avec la syllabe suivante (principe d'attaque maximale)
                cutPos = currentVowelEnd
            } else if (consonants.length === 2) {
                if (this.isConsonantCluster(consonants)) {
                    // Cluster consonantique inséparable
                    cutPos = currentVowelEnd
                } else {
                    // Diviser les consonnes : première reste, deuxième va avec la syllabe suivante
                    cutPos = currentVowelEnd + 1
                }
            } else {
                // 3+ consonnes : principe général = garder une consonne avec chaque syllabe
                if (consonants.length >= 3) {
                    // Si les 2 dernières forment un cluster, les garder ensemble
                    if (this.isConsonantCluster(consonants.slice(-2))) {
                        cutPos = nextVowelStart - 2
                    } else {
                        // Sinon, couper au milieu : garder une consonne de chaque côté
                        cutPos = currentVowelEnd + 1
                    }
                } else {
                    cutPos = currentVowelEnd + 1
                }
            }
            
            if (cutPos > lastCut && cutPos < workingWord.length) {
                const syllable = workingWord.slice(lastCut, cutPos)
                if (syllable) {
                    syllables.push(syllable)
                }
                lastCut = cutPos
            }
        }
        
        // Ajouter la dernière syllabe
        if (lastCut < workingWord.length) {
            let lastSyllable = workingWord.slice(lastCut)
            
            // Rajouter le suffixe muet s'il existe
            if (muteSuffix) {
                lastSyllable += muteSuffix
            }
            
            syllables.push(lastSyllable)
        } else if (muteSuffix) {
            // Le suffixe muet forme une syllabe seule (rare)
            syllables.push(muteSuffix)
        }
        
        if (word !== wordClean) {
            return [word]
        }
        
        return syllables.length > 0 ? syllables : [word]
    }
    
    syllabifyText(text) {
        const words = text.match(/\b\w+\b|\W+/g) || []
        const result = []
        
        for (const word of words) {
            if (/\w+/.test(word)) {
                const syllables = this.syllabifyWord(word)
                result.push(syllables)
            } else {
                result.push([word])
            }
        }
        
        return result
    }
}

// Instance globale du syllabificateur
const frenchSyllabifier = new FrenchSyllabifier()

// Fonction principale de syllabification
export function syllabifyWord(word) {
    if (!word || typeof word !== 'string') return [word]
    return frenchSyllabifier.syllabifyWord(word)
}

// Compter les syllabes
export function countSyllables(word) {
    return syllabifyWord(word).length
}

// Déterminer si un mot est monosyllabique
export function isMonosyllabic(word) {
    return countSyllables(word) === 1
}

// Fonctions utilitaires pour l'exercice
export function classifyWords(words) {
    const monosyllabic = []
    const multisyllabic = []
    
    for (const word of words) {
        if (isMonosyllabic(word)) {
            monosyllabic.push(word)
        } else {
            multisyllabic.push(word)
        }
    }
    
    return { monosyllabic, multisyllabic }
}