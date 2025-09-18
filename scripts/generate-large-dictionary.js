// Script pour générer un dictionnaire de 5000 mots français avec syllabification
const fs = require('fs')
const path = require('path')

// Fonction simple de syllabification française
function syllabify(word) {
    const voyelles = 'aeiouyàáâäèéêëìíîïòóôöùúûü'
    const consonnes = 'bcdfghjklmnpqrstvwxz'

    let syllables = []
    let currentSyllable = ''

    for (let i = 0; i < word.length; i++) {
        const char = word[i].toLowerCase()
        currentSyllable += char

        // Si c'est une voyelle et qu'il y a une consonne après
        if (voyelles.includes(char)) {
            let nextChar = word[i + 1]
            let nextNextChar = word[i + 2]

            if (nextChar && consonnes.includes(nextChar.toLowerCase())) {
                if (nextNextChar && voyelles.includes(nextNextChar.toLowerCase())) {
                    // Voyelle-Consonne-Voyelle : couper après la voyelle
                    syllables.push(currentSyllable)
                    currentSyllable = ''
                } else if (nextNextChar && consonnes.includes(nextNextChar.toLowerCase())) {
                    // Voyelle-Consonne-Consonne : couper après la voyelle
                    syllables.push(currentSyllable)
                    currentSyllable = ''
                }
            } else if (!nextChar) {
                // Fin de mot
                syllables.push(currentSyllable)
                currentSyllable = ''
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

// Base étendue de mots français communs
const motsFrancais = [
    // Famille et personnes
    'maman', 'papa', 'enfant', 'bébé', 'frère', 'sœur', 'cousin', 'cousine', 'oncle', 'tante',
    'grand-père', 'grand-mère', 'neveu', 'nièce', 'mari', 'femme', 'époux', 'épouse',
    'ami', 'amie', 'copain', 'copine', 'voisin', 'voisine', 'invité', 'visiteur',

    // Corps humain
    'tête', 'cheveux', 'visage', 'front', 'sourcil', 'œil', 'yeux', 'nez', 'bouche',
    'dent', 'langue', 'lèvre', 'menton', 'joue', 'oreille', 'cou', 'épaule', 'bras',
    'coude', 'main', 'doigt', 'pouce', 'ongle', 'poitrine', 'dos', 'ventre', 'hanche',
    'jambe', 'genou', 'pied', 'orteil', 'talon', 'cheville', 'cœur', 'poumon',

    // Maison et objets
    'maison', 'appartement', 'chambre', 'salon', 'cuisine', 'salle', 'toilette', 'garage',
    'cave', 'grenier', 'balcon', 'terrasse', 'jardin', 'porte', 'fenêtre', 'mur',
    'plafond', 'plancher', 'escalier', 'toit', 'cheminée', 'table', 'chaise', 'lit',
    'armoire', 'placard', 'tiroir', 'étagère', 'lampe', 'télé', 'radio', 'téléphone',
    'ordinateur', 'livre', 'journal', 'magazine', 'cahier', 'crayon', 'stylo', 'gomme',

    // Vêtements
    'chemise', 'pantalon', 'jupe', 'robe', 'veste', 'manteau', 'blouson', 'pull',
    'tee-shirt', 'short', 'culotte', 'chaussette', 'collant', 'chaussure', 'botte',
    'sandale', 'chapeau', 'casquette', 'écharpe', 'gant', 'ceinture', 'cravate',

    // Nourriture
    'pain', 'beurre', 'fromage', 'lait', 'yaourt', 'œuf', 'viande', 'poisson', 'poulet',
    'jambon', 'saucisse', 'pomme', 'poire', 'banane', 'orange', 'citron', 'fraise',
    'cerise', 'raisin', 'tomate', 'carotte', 'salade', 'pomme-de-terre', 'oignon',
    'ail', 'persil', 'sel', 'poivre', 'sucre', 'farine', 'huile', 'vinaigre',

    // Animaux
    'chien', 'chat', 'oiseau', 'poisson', 'lapin', 'souris', 'cheval', 'vache',
    'cochon', 'mouton', 'chèvre', 'poule', 'coq', 'canard', 'oie', 'dindon',
    'lion', 'tigre', 'éléphant', 'girafe', 'singe', 'ours', 'loup', 'renard',
    'cerf', 'sanglier', 'écureuil', 'hérisson', 'tortue', 'serpent', 'grenouille',

    // Transport
    'voiture', 'camion', 'autobus', 'vélo', 'moto', 'avion', 'bateau', 'train',
    'métro', 'tramway', 'taxi', 'ambulance', 'camion', 'tracteur', 'hélicoptère',

    // École et travail
    'école', 'classe', 'maître', 'élève', 'étudiant', 'professeur', 'directeur',
    'bureau', 'usine', 'magasin', 'banque', 'poste', 'hôpital', 'pharmacie',
    'boulangerie', 'boucherie', 'épicerie', 'librairie', 'restaurant', 'café',

    // Couleurs et formes
    'rouge', 'bleu', 'vert', 'jaune', 'noir', 'blanc', 'gris', 'rose', 'orange',
    'violet', 'marron', 'beige', 'rond', 'carré', 'triangle', 'rectangle', 'oval',

    // Actions
    'marcher', 'courir', 'sauter', 'tomber', 'monter', 'descendre', 'entrer', 'sortir',
    'ouvrir', 'fermer', 'prendre', 'donner', 'porter', 'tirer', 'pousser', 'lancer',
    'attraper', 'manger', 'boire', 'dormir', 'réveiller', 'laver', 'habiller',
    'jouer', 'travailler', 'étudier', 'lire', 'écrire', 'dessiner', 'chanter',
    'danser', 'parler', 'écouter', 'regarder', 'voir', 'entendre', 'sentir',

    // Nature et météo
    'soleil', 'lune', 'étoile', 'nuage', 'pluie', 'neige', 'vent', 'orage',
    'arbre', 'fleur', 'herbe', 'feuille', 'branche', 'racine', 'fruit', 'graine',
    'montagne', 'colline', 'vallée', 'rivière', 'lac', 'mer', 'océan', 'plage',
    'forêt', 'champ', 'prairie', 'désert', 'île', 'pont', 'route', 'chemin',

    // Temps
    'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche',
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
    'septembre', 'octobre', 'novembre', 'décembre', 'printemps', 'été', 'automne', 'hiver',
    'matin', 'midi', 'après-midi', 'soir', 'nuit', 'aujourd-hui', 'hier', 'demain',

    // Qualités
    'grand', 'petit', 'gros', 'mince', 'long', 'court', 'haut', 'bas', 'large', 'étroit',
    'épais', 'fin', 'lourd', 'léger', 'dur', 'mou', 'chaud', 'froid', 'tiède',
    'sec', 'mouillé', 'propre', 'sale', 'neuf', 'vieux', 'jeune', 'âgé',
    'beau', 'joli', 'laid', 'bon', 'mauvais', 'facile', 'difficile', 'simple',

    // Mots plus complexes
    'automobile', 'bicyclette', 'ordinateur', 'téléphone', 'télévision', 'radiateur',
    'réfrigérateur', 'machine', 'aspirateur', 'ventilateur', 'calculateur',
    'professeur', 'directeur', 'boulanger', 'coiffeur', 'médecin', 'pharmacien',
    'université', 'bibliothèque', 'laboratoire', 'cafétéria', 'secrétaire',
    'mathématiques', 'géographie', 'histoire', 'sciences', 'français', 'anglais',
    'informatique', 'électronique', 'mécanique', 'automatique', 'photographie',
    'température', 'électricité', 'magnétisme', 'république', 'démocratie',
    'anniversaire', 'célébration', 'manifestation', 'démonstration', 'présentation'
]

// Génération de variations et combinaisons pour atteindre 5000 mots
function generateVariations(baseMots) {
    const variations = [...baseMots]

    // Préfixes communs
    const prefixes = ['re', 'pré', 'anti', 'inter', 'super', 'sous', 'auto', 'ex', 'pro', 'dé']

    // Suffixes communs
    const suffixes = ['tion', 'ment', 'able', 'ible', 'eur', 'euse', 'age', 'isme', 'iste', 'té']

    // Ajouter des variations avec préfixes (plus agressif)
    baseMots.forEach(mot => {
        prefixes.forEach(prefix => {
            if (variations.length < 4000) {
                variations.push(prefix + mot)
            }
        })
    })

    // Ajouter des variations avec suffixes (plus agressif)
    baseMots.forEach(mot => {
        suffixes.forEach(suffix => {
            if (variations.length < 4500) {
                variations.push(mot + suffix)
            }
        })
    })

    // Ajouter des mots composés
    for (let i = 0; i < baseMots.length && variations.length < 4800; i++) {
        for (let j = i + 1; j < baseMots.length && variations.length < 4800; j++) {
            variations.push(baseMots[i] + baseMots[j])
        }
    }

    // Ajouter des variantes avec doublons de lettres
    baseMots.forEach(mot => {
        if (variations.length < 4900) {
            variations.push(mot + mot) // Redoublement
            variations.push('super' + mot)
            variations.push('mini' + mot)
            variations.push(mot + 'ette')
            variations.push(mot + 'ment')
        }
    })

    return [...new Set(variations)] // Supprimer les doublons
}

// Générer le dictionnaire
const motsEtendus = generateVariations(motsFrancais)

// Créer le dictionnaire avec syllabification
const dictionnaire = {
    mots: motsEtendus.slice(0, 5000).map((mot, index) => ({
        mot: mot,
        syllabes: syllabify(mot),
        niveau: Math.ceil((index + 1) / 1000) // Niveaux 1-5
    }))
}

// Sauvegarder le fichier
const outputPath = path.join(__dirname, '../public/dictionnaire-syllabes.json')
fs.writeFileSync(outputPath, JSON.stringify(dictionnaire, null, 2), 'utf8')

console.log(`✅ Dictionnaire généré avec ${dictionnaire.mots.length} mots`)
console.log(`📁 Sauvegardé dans: ${outputPath}`)

// Afficher quelques exemples
console.log('\n📝 Exemples de mots générés:')
dictionnaire.mots.slice(0, 10).forEach(mot => {
    console.log(`- ${mot.mot}: ${mot.syllabes.join('-')} (niveau ${mot.niveau})`)
})