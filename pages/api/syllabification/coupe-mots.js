import { verifyToken } from '../../../lib/jwt'
import { spawn, exec } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { promisify } from 'util'
import hyphenopoly from 'hyphenopoly'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

const execAsync = promisify(exec)
const COUPE_MOTS_PATH = 'C:\\Program Files (x86)\\Coupe-Mots\\coupe-mots.exe'

// Configuration Hyphenopoly pour le français
let hyphenatorFr = null

async function initHyphenopoly() {
    if (!hyphenatorFr) {
        console.log('Initialisation Hyphenopoly pour le français...')
        try {
            hyphenatorFr = await hyphenopoly.config({
                require: ['fr'],
                hyphen: '|',  // Même séparateur qu'AccessiDys
                exceptions: {
                    'fr': 'avec: a|vec, en|fants: en|fants, a|do|rait: a|do|rait'
                },
                handleEvent: {
                    engineLoaded: function (e) {
                        console.log(`Moteur Hyphenopoly chargé: ${e.msg}`)
                    }
                }
            })
            console.log('✅ Hyphenopoly initialisé avec succès')
        } catch (error) {
            console.error('❌ Erreur initialisation Hyphenopoly:', error)
            hyphenatorFr = null
        }
    }
    return hyphenatorFr
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        // TEMPORAIRE : Pas d'authentification pour le moment
        // const authHeader = req.headers.authorization
        // if (!authHeader?.startsWith('Bearer ')) {
        //     return res.status(401).json({ error: 'Token manquant' })
        // }

        // const token = authHeader.split(' ')[1]
        // const decoded = verifyToken(token)
        // if (!decoded) {
        //     return res.status(401).json({ error: 'Token invalide' })
        // }

        const { mots } = req.body

        if (!mots || !Array.isArray(mots)) {
            return res.status(400).json({ error: 'Liste de mots manquante' })
        }

        console.log(`Syllabification de ${mots.length} mots avec Coupe-Mots`)

        // 1. Récupérer les corrections centralisées en priorité
        let correctionsAppliquees = 0
        const correctionsCentralisees = await recupererCorrectionsCentralisees(mots)
        
        // 2. Utiliser l'algorithme pour les mots sans corrections
        const motsSansCorrection = mots.filter(mot => !correctionsCentralisees[mot])
        const syllabificationsAlgo = syllabifierTousLesMots(motsSansCorrection)
        
        // 3. Fusionner les corrections centralisées et les syllabifications algorithmiques
        const syllabifications = { ...syllabificationsAlgo, ...correctionsCentralisees }
        
        correctionsAppliquees = Object.keys(correctionsCentralisees).length
        if (correctionsAppliquees > 0) {
            console.log(`✅ ${correctionsAppliquees} corrections centralisées appliquées`)
        }

        res.status(200).json({
            success: true,
            syllabifications
        })

    } catch (error) {
        console.error('Erreur syllabification Coupe-Mots:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}

async function utiliserHyphenopoly(mots) {
    console.log('🚀 Utilisation d\'Hyphenopoly (moderne)...')
    
    try {
        // Initialiser Hyphenopoly
        const hyphenator = await initHyphenopoly()
        
        if (!hyphenator) {
            console.log('❌ Hyphenopoly non disponible, fallback sur AccessiDys')
            return syllabifierTousLesMots(mots)
        }
        
        const syllabifications = {}
        
        // Traiter chaque mot avec Hyphenopoly
        for (const mot of mots) {
            try {
                console.log(`Syllabification de "${mot}" avec Hyphenopoly...`)
                
                // Utiliser Hyphenopoly pour syllabifier
                const hyphenated = await hyphenator.fr(mot)
                console.log(`Hyphenopoly: "${mot}" → "${hyphenated}"`)
                
                // Convertir les tirets en syllabes
                if (hyphenated && hyphenated.includes('|')) {
                    syllabifications[mot] = hyphenated.split('|')
                } else {
                    // Pas de syllabification trouvée par Hyphenopoly
                    syllabifications[mot] = [mot]
                }
                
                console.log(`Résultat: ${JSON.stringify(syllabifications[mot])}`)
                
            } catch (error) {
                console.error(`Erreur Hyphenopoly pour "${mot}":`, error)
                // Fallback sur notre algorithme AccessiDys pour ce mot
                syllabifications[mot] = syllabifierAvecHyphenator(mot)
            }
        }
        
        console.log('✅ Syllabification Hyphenopoly terminée')
        return syllabifications
        
    } catch (error) {
        console.error('❌ Erreur générale Hyphenopoly:', error)
        // Fallback complet sur AccessiDys
        console.log('🔄 Fallback sur algorithme AccessiDys...')
        return syllabifierTousLesMots(mots)
    }
}

function syllabifierTousLesMots(mots) {
    const syllabifications = {}
    
    for (const mot of mots) {
        syllabifications[mot] = syllabifierAvecHyphenator(mot)
    }
    
    return syllabifications
}

async function recupererCorrectionsCentralisees(mots) {
    const corrections = {}
    
    try {
        console.log(`🔍 Recherche de corrections centralisées pour ${mots.length} mots`)
        
        // Récupérer les corrections de syllabification depuis la BDD
        const { data: correctionsSyllab, error: errorSyllab } = await supabase
            .from('corrections_syllabification')
            .select('mot, segmentation_correcte, nombre_applications')
            .in('mot', mots)
            .eq('statut', 'actif')

        if (!errorSyllab && correctionsSyllab) {
            correctionsSyllab.forEach(correction => {
                corrections[correction.mot] = correction.segmentation_correcte
                console.log(`📝 Correction trouvée: "${correction.mot}" → [${correction.segmentation_correcte.join(' | ')}] (utilisée ${correction.nombre_applications} fois)`)
            })
            
            // Incrémenter les compteurs d'utilisation (sans attendre)
            if (correctionsSyllab.length > 0) {
                incrementerUtilisationCorrections(correctionsSyllab.map(c => c.mot))
                    .catch(error => console.error('Erreur incrémentation:', error))
            }
        }
        
    } catch (error) {
        console.warn('⚠️  Corrections centralisées non disponibles:', error.message)
        // Continuer sans corrections centralisées
    }
    
    return corrections
}

async function incrementerUtilisationCorrections(mots) {
    try {
        const { error } = await supabase
            .from('corrections_syllabification')
            .update({ 
                nombre_applications: supabase.raw('nombre_applications + 1'),
                date_modification: new Date().toISOString()
            })
            .in('mot', mots)
            .eq('statut', 'actif')

        if (!error) {
            console.log(`📈 Compteurs d'utilisation mis à jour pour ${mots.length} corrections`)
        }
    } catch (error) {
        console.error('Erreur incrémentation compteurs:', error)
    }
}

function syllabifierAvecHyphenator(mot) {
    // Utilise la même logique qu'AccessiDys avec les patterns français
    if (!mot || mot.length === 0) return [mot]
    
    try {
        // Simulation de Hyphenator avec les règles françaises d'AccessiDys
        const syllables = hyphenateWordFrench(mot)
        return syllables
    } catch (error) {
        console.error('Erreur syllabification Hyphenator:', error)
        // Fallback sur notre ancien algorithme
        return syllabifierMotGenerique(mot)
    }
}

function hyphenateWordFrench(mot) {
    // Algorithme basé sur les patterns de syllabification française d'AccessiDys
    // Règles extraites des patterns fr.js d'Hyphenator
    if (!mot || mot.length === 0) return [mot]
    
    const motLower = mot.toLowerCase()
    
    // Exceptions pédagogiques (syllabification simple pour l'apprentissage)
    const exceptions = {
        // Mots problématiques identifiés
        'enfants': ['en', 'fants'],
        'adorait': ['a', 'do', 'rait'],  // Correction : ne pas sur-segmenter "rait"  
        'bronzette': ['bron', 'zette'],  // Plus simple pour l'apprentissage
        
        // Mots courants - syllabification pédagogique
        'important': ['im', 'por', 'tant'],
        'famille': ['fa', 'mille'],  // Simplification
        'attention': ['at', 'ten', 'tion'],
        'question': ['ques', 'tion'],
        'vacances': ['va', 'cances'],  // Simplification
        'bataille': ['ba', 'taille'],  // Simplification
        'traitement': ['traite', 'ment'],
        
        // Mots composés
        'aujourd': ['aujour', 'd\'hui'],
        'quelque': ['quel', 'que'],
        'quelques': ['quel', 'ques'],
        'longtemps': ['long', 'temps'],
        'beaucoup': ['beau', 'coup'],
        'toujours': ['tou', 'jours'],
        'maintenant': ['main', 'te', 'nant'],
        'seulement': ['seule', 'ment'],
        'vraiment': ['vrai', 'ment'],
        'certainement': ['cer', 'taine', 'ment'],
        'probablement': ['pro', 'bable', 'ment'],
        'absolument': ['ab', 'so', 'lument'],
        'complètement': ['com', 'plète', 'ment'],
        
        // Adjectifs courants
        'différent': ['dif', 'fé', 'rent'],
        'intéressant': ['in', 'té', 'res', 'sant'],
        'magnifique': ['ma', 'gni', 'fi', 'que'],
        'extraordinaire': ['ex', 'tra', 'or', 'di', 'nai', 're'],
        
        // Noms courants
        'restaurant': ['res', 'tau', 'rant'],
        'appartement': ['appar', 'te', 'ment'],
        'développement': ['dé', 've', 'lop', 'pe', 'ment'],
        'gouvernement': ['gouver', 'ne', 'ment'],
        'établissement': ['éta', 'blisse', 'ment'],
        'arrondissement': ['arron', 'disse', 'ment'],
        
        // Monosyllabes à ne PAS couper
        'avec': ['avec'],
        'chez': ['chez'],
        'dans': ['dans'],
        'sous': ['sous'],
        'pour': ['pour'],
        'sans': ['sans'],
        'vers': ['vers'],
        'très': ['très'],
        'plus': ['plus'],
        'bien': ['bien'],
        'tout': ['tout'],
        'tous': ['tous'],
        'rien': ['rien'],
        'puis': ['puis'],
        'donc': ['donc'],
        'mais': ['mais']
    }
    
    if (exceptions[motLower]) {
        return exceptions[motLower]
    }
    
    // Appliquer les règles de syllabification française (patterns Hyphenator)
    return hyphenateWithFrenchPatterns(mot)
}

function hyphenateWithFrenchPatterns(mot) {
    // Algorithme de syllabification pédagogique française (moins agressif)
    if (!mot || mot.length === 0) return [mot]
    
    // Pour les mots courts (≤4 lettres), ne pas couper sauf cas évidents
    if (mot.length <= 4) {
        return [mot]
    }
    
    const voyelles = new Set(['a', 'e', 'i', 'o', 'u', 'y', 'é', 'è', 'à', 'ù', 'î', 'ô', 'â', 'ê', 'û', 'ë', 'ï', 'ÿ'])
    const consonnes = new Set(['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'z'])
    
    const chars = Array.from(mot.toLowerCase())
    
    // Compter les voyelles - si moins de 2, c'est monosyllabique
    const nbVoyelles = chars.filter(c => voyelles.has(c)).length
    if (nbVoyelles < 2) {
        return [mot]
    }
    
    const syllables = []
    let currentSyllable = ''
    
    for (let i = 0; i < chars.length; i++) {
        const char = chars[i]
        currentSyllable += char
        
        if (voyelles.has(char)) {
            let nextConsonants = 0
            let nextVoyelle = -1
            
            // Chercher la prochaine voyelle
            for (let j = i + 1; j < chars.length; j++) {
                if (voyelles.has(chars[j])) {
                    nextVoyelle = j
                    break
                } else if (consonnes.has(chars[j])) {
                    nextConsonants++
                }
            }
            
            if (nextVoyelle === -1) {
                // Dernière voyelle, prendre tout le reste
                currentSyllable += chars.slice(i + 1).join('')
                syllables.push(currentSyllable)
                break
            }
            
            // Règles pédagogiques (moins de coupures)
            if (nextConsonants === 0) {
                // Deux voyelles : hiatus - couper seulement si évident
                const voyelle1 = char
                const voyelle2 = chars[nextVoyelle]
                
                // Ne couper que les hiatus évidents (ia, io, ua, ue, etc.)
                const hiatus = voyelle1 + voyelle2
                if (['ia', 'ie', 'io', 'iu', 'ua', 'ue', 'ui', 'uo', 'ea', 'eo'].includes(hiatus)) {
                    syllables.push(currentSyllable)
                    currentSyllable = ''
                }
                // Sinon, continuer sans couper
            } else if (nextConsonants === 1) {
                // Une consonne : elle va avec la voyelle suivante (règle CV)
                syllables.push(currentSyllable)
                currentSyllable = ''
            } else if (nextConsonants >= 2) {
                // Deux consonnes ou plus : approche pédagogique conservative
                const cons1 = chars[i + 1]
                const cons2 = chars[i + 2] || ''
                const groupe = cons1 + cons2
                
                // Groupes inséparables étendus (approche pédagogique)
                const groupesInseparables = new Set([
                    'bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'tr', 'vr',
                    'ch', 'th', 'ph', 'gn', 'sc', 'sm', 'sn', 'sp', 'st', 'sw',
                    // Ajout de groupes pour éviter les coupures pédagogiquement mauvaises
                    'll', 'mm', 'nn', 'pp', 'rr', 'ss', 'tt', 'cc', 'dd', 'ff', 'gg'
                ])
                
                if (groupesInseparables.has(groupe)) {
                    // Groupe inséparable : ne pas couper
                    syllables.push(currentSyllable)
                    currentSyllable = ''
                } else {
                    // Séparer : première consonne avec voyelle précédente
                    currentSyllable += cons1
                    syllables.push(currentSyllable)
                    currentSyllable = ''
                    i++ // Avancer d'une consonne
                }
            }
        }
        
        // Éviter les boucles infinies
        if (i === chars.length - 1 && currentSyllable.length > 0) {
            syllables.push(currentSyllable)
            break
        }
    }
    
    // Filtrer les syllabes trop courtes (pédagogique)
    const syllablesFiltered = syllables.filter(s => s.length >= 2 || syllables.length <= 2)
    
    return syllablesFiltered.length > 0 ? syllablesFiltered : [mot]
}

function syllabifierMotGenerique(mot) {
    // Algorithme de syllabification française professionnel
    if (!mot || mot.length === 0) return [mot]
    
    const voyelles = new Set(['a', 'e', 'i', 'o', 'u', 'y', 'é', 'è', 'à', 'ù', 'î', 'ô', 'â', 'ê', 'û', 'ë', 'ï', 'ÿ'])
    const consonnes = new Set(['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'z'])
    
    const chars = Array.from(mot.toLowerCase())
    const syllables = []
    let i = 0
    
    while (i < chars.length) {
        let syllable = ''
        
        // Prendre les consonnes initiales
        while (i < chars.length && consonnes.has(chars[i])) {
            syllable += chars[i]
            i++
        }
        
        // Prendre la voyelle (obligatoire pour une syllabe)
        if (i < chars.length && voyelles.has(chars[i])) {
            syllable += chars[i]
            i++
            
            // Gérer les voyelles multiples (diphtongues)
            while (i < chars.length && voyelles.has(chars[i])) {
                syllable += chars[i]
                i++
            }
        }
        
        // Analyser les consonnes qui suivent
        let consonantsAhead = []
        let j = i
        while (j < chars.length && consonnes.has(chars[j])) {
            consonantsAhead.push(chars[j])
            j++
        }
        
        // Y a-t-il une voyelle après ces consonnes ?
        let hasVowelAfter = j < chars.length && voyelles.has(chars[j])
        
        if (consonantsAhead.length === 0) {
            // Pas de consonnes, finir la syllabe
            syllables.push(syllable)
        } else if (!hasVowelAfter) {
            // Plus de voyelles après, prendre toutes les consonnes restantes
            syllable += consonantsAhead.join('')
            syllables.push(syllable)
            i = chars.length // Terminer
        } else {
            // Il y a des consonnes ET une voyelle après
            if (consonantsAhead.length === 1) {
                // Une seule consonne : elle va avec la syllabe suivante
                syllables.push(syllable)
            } else if (consonantsAhead.length === 2) {
                // Deux consonnes : vérifier les groupes inséparables
                const groupe = consonantsAhead[0] + consonantsAhead[1]
                const groupesInseparables = new Set([
                    'bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'tr', 'vr',
                    'ch', 'th', 'ph', 'gn', 'sc', 'sk', 'sm', 'sn', 'sp', 'st'
                ])
                
                if (groupesInseparables.has(groupe)) {
                    // Groupe inséparable : va avec la syllabe suivante
                    syllables.push(syllable)
                } else {
                    // Séparer : première consonne avec syllabe actuelle
                    syllable += consonantsAhead[0]
                    syllables.push(syllable)
                    i++ // Avancer d'une consonne
                }
            } else {
                // Plus de 2 consonnes : une reste, les autres vont avec la syllabe suivante
                syllable += consonantsAhead[0]
                syllables.push(syllable)
                i++ // Avancer d'une consonne
            }
        }
        
        // Sécurité pour éviter les boucles infinies
        if (syllable === '' && i < chars.length) {
            syllable += chars[i]
            i++
            syllables.push(syllable)
        }
    }
    
    // Filtrer les syllabes vides et retourner
    const result = syllables.filter(s => s.length > 0)
    return result.length > 0 ? result : [mot]
}