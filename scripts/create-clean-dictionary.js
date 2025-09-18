// Script pour créer un dictionnaire propre avec seulement des vrais mots français
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
        'beautiful': ['beau', 'ti', 'ful'],
        'papillon': ['pa', 'pi', 'llon'],
        'million': ['mil', 'lion'],
        'attention': ['at', 'ten', 'tion'],
        'question': ['ques', 'tion'],
        'nation': ['na', 'tion'],
        'station': ['sta', 'tion'],
        'création': ['cré', 'a', 'tion'],
        'récréation': ['ré', 'cré', 'a', 'tion']
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

// Mots les plus fréquents en français (manquants de ma liste)
const motsTresFrequents = [
    // Articles, pronoms et mots de liaison fréquents
    'le', 'de', 'un', 'et', 'être', 'avoir', 'il', 'à', 'son', 'que', 'se', 'qui', 'ce', 'dans',
    'en', 'du', 'elle', 'au', 'de', 'le', 'tout', 'le', 'il', 'y', 'a', 'le', 'sur', 'avec',
    'ne', 'se', 'pas', 'pour', 'du', 'par', 'sur', 'avec', 'son', 'une', 'sur', 'avec', 'tout',
    'aussi', 'leur', 'bien', 'où', 'sans', 'lui', 'dans', 'le', 'plus', 'le', 'tout', 'ces',
    'mais', 'ou', 'et', 'donc', 'or', 'ni', 'car', 'comme', 'quand', 'si', 'alors', 'ainsi',

    // Verbes très fréquents
    'aller', 'faire', 'dire', 'venir', 'partir', 'arriver', 'rester', 'devenir', 'tenir', 'sortir',
    'passer', 'porter', 'regarder', 'suivre', 'recevoir', 'devoir', 'pouvoir', 'vouloir', 'savoir',
    'falloir', 'valoir', 'croire', 'paraître', 'connaître', 'prendre', 'mettre', 'donner', 'rendre',
    'trouver', 'penser', 'comprendre', 'attendre', 'entendre', 'répondre', 'descendre', 'perdre',
    'vendre', 'permettre', 'promettre', 'admettre', 'commettre', 'soumettre', 'transmettre',

    // Noms très courants
    'chose', 'personne', 'moment', 'temps', 'jour', 'homme', 'femme', 'monde', 'pays', 'ville',
    'vie', 'mort', 'côté', 'façon', 'manière', 'place', 'groupe', 'partie', 'point', 'ligne',
    'heure', 'année', 'mois', 'siècle', 'époque', 'histoire', 'état', 'force', 'sens', 'effet',
    'cause', 'raison', 'problème', 'question', 'réponse', 'solution', 'résultat', 'exemple',
    'cas', 'fait', 'idée', 'pensée', 'sentiment', 'impression', 'opinion', 'conscience',

    // Adjectifs fréquents
    'autre', 'même', 'nouveau', 'premier', 'dernier', 'seul', 'certain', 'possible', 'impossible',
    'vrai', 'faux', 'réel', 'important', 'nécessaire', 'utile', 'inutile', 'simple', 'difficile',
    'facile', 'normal', 'spécial', 'général', 'particulier', 'public', 'privé', 'social', 'national',
    'international', 'européen', 'français', 'moderne', 'ancien', 'récent', 'actuel', 'futur',

    // Adverbes
    'très', 'bien', 'mal', 'mieux', 'moins', 'plus', 'assez', 'trop', 'beaucoup', 'peu', 'encore',
    'toujours', 'jamais', 'souvent', 'parfois', 'quelquefois', 'aujourd-hui', 'hier', 'demain',
    'maintenant', 'bientôt', 'tard', 'tôt', 'déjà', 'enfin', 'alors', 'donc', 'pourtant', 'cependant'
]

// Dictionnaire de vrais mots français organisés par thème
const vraiMotsFrancais = [
    // Famille (20 mots)
    'maman', 'papa', 'enfant', 'bébé', 'frère', 'sœur', 'cousin', 'oncle', 'tante', 'neveu',
    'nièce', 'mari', 'femme', 'ami', 'amie', 'copain', 'voisin', 'invité', 'famille', 'parent',

    // Corps (30 mots)
    'tête', 'cheveux', 'visage', 'yeux', 'nez', 'bouche', 'dent', 'langue', 'oreille', 'cou',
    'épaule', 'bras', 'main', 'doigt', 'pouce', 'ventre', 'dos', 'jambe', 'genou', 'pied',
    'orteil', 'cœur', 'poumon', 'estomac', 'cerveau', 'muscle', 'squelette', 'peau', 'sang', 'os',

    // Maison (40 mots)
    'maison', 'appartement', 'chambre', 'salon', 'cuisine', 'salle', 'toilette', 'garage', 'cave', 'grenier',
    'balcon', 'terrasse', 'jardin', 'porte', 'fenêtre', 'mur', 'toit', 'escalier', 'table', 'chaise',
    'lit', 'armoire', 'placard', 'tiroir', 'étagère', 'lampe', 'miroir', 'rideau', 'tapis', 'coussin',
    'télévision', 'radio', 'téléphone', 'ordinateur', 'livre', 'journal', 'cahier', 'crayon', 'stylo', 'gomme',

    // Vêtements (25 mots)
    'chemise', 'pantalon', 'jupe', 'robe', 'veste', 'manteau', 'blouson', 'pull', 'tee-shirt', 'short',
    'chaussette', 'chaussure', 'botte', 'sandale', 'chapeau', 'casquette', 'écharpe', 'gant', 'ceinture', 'cravate',
    'pyjama', 'maillot', 'uniforme', 'costume', 'bijou',

    // Nourriture (50 mots)
    'pain', 'beurre', 'fromage', 'lait', 'yaourt', 'œuf', 'viande', 'poisson', 'poulet', 'jambon',
    'pomme', 'poire', 'banane', 'orange', 'citron', 'fraise', 'cerise', 'raisin', 'tomate', 'carotte',
    'salade', 'pomme-de-terre', 'oignon', 'ail', 'persil', 'sel', 'poivre', 'sucre', 'farine', 'huile',
    'vinaigre', 'soupe', 'sandwich', 'pizza', 'gâteau', 'chocolat', 'bonbon', 'glace', 'café', 'thé',
    'eau', 'jus', 'soda', 'biscuit', 'confiture', 'miel', 'légume', 'fruit', 'céréale', 'pâtes',

    // Animaux (40 mots)
    'chien', 'chat', 'oiseau', 'poisson', 'lapin', 'souris', 'cheval', 'vache', 'cochon', 'mouton',
    'chèvre', 'poule', 'coq', 'canard', 'lion', 'tigre', 'éléphant', 'girafe', 'singe', 'ours',
    'loup', 'renard', 'cerf', 'écureuil', 'hérisson', 'tortue', 'serpent', 'grenouille', 'papillon', 'abeille',
    'mouche', 'araignée', 'fourmi', 'escargot', 'requin', 'baleine', 'dauphin', 'pingouin', 'aigle', 'cygne',

    // Transport (20 mots)
    'voiture', 'camion', 'autobus', 'vélo', 'moto', 'avion', 'bateau', 'train', 'métro', 'taxi',
    'ambulance', 'tracteur', 'hélicoptère', 'fusée', 'skateboard', 'trottinette', 'roller', 'scooter', 'camionnette', 'remorque',

    // École (30 mots)
    'école', 'classe', 'maître', 'élève', 'étudiant', 'professeur', 'directeur', 'bureau', 'tableau', 'cartable',
    'trousse', 'règle', 'équerre', 'compas', 'calculatrice', 'dictionnaire', 'atlas', 'exercice', 'devoir', 'leçon',
    'examen', 'note', 'diplôme', 'récréation', 'cantine', 'bibliothèque', 'laboratoire', 'gymnase', 'cour', 'couloir',

    // Travail (25 mots)
    'travail', 'métier', 'emploi', 'bureau', 'usine', 'magasin', 'banque', 'poste', 'hôpital', 'pharmacie',
    'boulangerie', 'boucherie', 'épicerie', 'restaurant', 'café', 'hôtel', 'garage', 'salon', 'cinema', 'théâtre',
    'musée', 'parc', 'stade', 'piscine', 'marché',

    // Couleurs (15 mots)
    'rouge', 'bleu', 'vert', 'jaune', 'noir', 'blanc', 'gris', 'rose', 'orange', 'violet',
    'marron', 'beige', 'dorée', 'argenté', 'transparent',

    // Actions (50 mots)
    'marcher', 'courir', 'sauter', 'tomber', 'monter', 'descendre', 'entrer', 'sortir', 'ouvrir', 'fermer',
    'prendre', 'donner', 'porter', 'tirer', 'pousser', 'lancer', 'attraper', 'manger', 'boire', 'dormir',
    'réveiller', 'laver', 'habiller', 'jouer', 'travailler', 'étudier', 'lire', 'écrire', 'dessiner', 'chanter',
    'danser', 'parler', 'écouter', 'regarder', 'voir', 'entendre', 'sentir', 'toucher', 'goûter', 'respirer',
    'sourire', 'pleurer', 'rire', 'crier', 'chuchoter', 'construire', 'réparer', 'nettoyer', 'ranger', 'cuisiner',

    // Nature (35 mots)
    'soleil', 'lune', 'étoile', 'nuage', 'pluie', 'neige', 'vent', 'orage', 'brouillard', 'arc-en-ciel',
    'arbre', 'fleur', 'herbe', 'feuille', 'branche', 'racine', 'fruit', 'graine', 'rose', 'tulipe',
    'montagne', 'colline', 'vallée', 'rivière', 'lac', 'mer', 'océan', 'plage', 'sable', 'rocher',
    'forêt', 'champ', 'prairie', 'désert', 'île',

    // Temps (30 mots)
    'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche', 'semaine', 'mois', 'année',
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre',
    'novembre', 'décembre', 'printemps', 'été', 'automne', 'hiver', 'matin', 'midi', 'soir', 'nuit',

    // Qualités (40 mots)
    'grand', 'petit', 'gros', 'mince', 'long', 'court', 'haut', 'bas', 'large', 'étroit',
    'épais', 'fin', 'lourd', 'léger', 'dur', 'mou', 'chaud', 'froid', 'tiède', 'sec',
    'mouillé', 'propre', 'sale', 'neuf', 'vieux', 'jeune', 'âgé', 'beau', 'joli', 'laid',
    'bon', 'mauvais', 'facile', 'difficile', 'simple', 'compliqué', 'rapide', 'lent', 'fort', 'faible',

    // Émotions (20 mots)
    'content', 'heureux', 'joyeux', 'triste', 'fâché', 'colère', 'peur', 'surprise', 'amour', 'amitié',
    'jalousie', 'fierté', 'honte', 'courage', 'timidité', 'patience', 'nerveux', 'calme', 'excité', 'fatigué',

    // Nombres (20 mots)
    'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'vingt', 'trente', 'cent',

    // Objets divers (50 mots)
    'ballon', 'jouet', 'poupée', 'voiture', 'train', 'puzzle', 'jeu', 'carte', 'cadeau', 'sac',
    'boîte', 'bouteille', 'verre', 'assiette', 'cuillère', 'fourchette', 'couteau', 'casserole', 'poêle', 'four',
    'frigo', 'machine', 'aspirateur', 'télé', 'radio', 'caméra', 'appareil', 'montre', 'horloge', 'réveil',
    'clé', 'serrure', 'marteau', 'tournevis', 'scie', 'clou', 'vis', 'corde', 'ficelle', 'colle',
    'ciseaux', 'aiguille', 'fil', 'bouton', 'fermeture', 'parapluie', 'lunettes', 'chapeau', 'sac', 'portefeuille',

    // Mots plus complexes mais courants (30 mots)
    'ordinateur', 'téléphone', 'télévision', 'automobile', 'bicyclette', 'photographie', 'cinéma', 'musique',
    'restaurant', 'boulangerie', 'pharmacie', 'bibliothèque', 'hôpital', 'université', 'gouvernement', 'président',
    'ministre', 'député', 'maire', 'police', 'pompier', 'médecin', 'infirmier', 'professeur', 'ingénieur',
    'architecte', 'avocat', 'journaliste', 'artiste', 'musicien'
]

// Fusionner toutes les listes et supprimer les doublons
const tousMots = [...new Set([...motsTresFrequents, ...vraiMotsFrancais])]

// Filtrer les mots trop courts (moins de 2 syllabes utiles)
const motsFiltres = tousMots.filter(mot => {
    const syllabes = syllabify(mot)
    return syllabes.length >= 2 && syllabes.length <= 4 // Garder seulement 2-4 syllabes
})

// Créer le dictionnaire final
const dictionnaire = {
    mots: motsFiltres.map((mot, index) => ({
        mot: mot,
        syllabes: syllabify(mot),
        niveau: Math.ceil((index + 1) / 100) // Niveaux progressifs
    }))
}

// Sauvegarder le fichier
const outputPath = path.join(__dirname, '../public/dictionnaire-syllabes.json')
fs.writeFileSync(outputPath, JSON.stringify(dictionnaire, null, 2), 'utf8')

console.log(`✅ Dictionnaire propre généré avec ${dictionnaire.mots.length} VRAIS mots français`)
console.log(`📁 Sauvegardé dans: ${outputPath}`)

// Afficher quelques exemples
console.log('\n📝 Exemples de mots (tous sont de vrais mots français):')
dictionnaire.mots.slice(0, 20).forEach(mot => {
    console.log(`- ${mot.mot}: ${mot.syllabes.join('-')} (niveau ${mot.niveau})`)
})

console.log(`\n🎯 Répartition par niveau:`)
for (let i = 1; i <= 6; i++) {
    const motsNiveau = dictionnaire.mots.filter(m => m.niveau === i).length
    console.log(`  Niveau ${i}: ${motsNiveau} mots`)
}