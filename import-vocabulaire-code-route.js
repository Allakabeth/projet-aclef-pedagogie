const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

const vocabulaire = [
    // VÉHICULES ET USAGERS
    { categorie: 'Véhicules et usagers', emoji: '🚗', mot: 'véhicule', definition_simple: 'voiture, moto, camion (tout ce qui roule)', ordre: 1 },
    { categorie: 'Véhicules et usagers', emoji: '🚗', mot: 'un automobiliste', definition_simple: 'personne qui conduit une voiture', ordre: 2 },
    { categorie: 'Véhicules et usagers', emoji: '🚗', mot: 'un usager', definition_simple: 'personne qui utilise la route', ordre: 3 },
    { categorie: 'Véhicules et usagers', emoji: '🚗', mot: 'un cycliste', definition_simple: 'personne qui fait du vélo', ordre: 4 },
    { categorie: 'Véhicules et usagers', emoji: '🚗', mot: 'conducteur de poids lourds', definition_simple: 'personne qui conduit un camion', ordre: 5 },

    // ACTIONS DE CONDUITE
    { categorie: 'Actions de conduite', emoji: '🎯', mot: 'ralentir', definition_simple: 'aller moins vite', ordre: 1 },
    { categorie: 'Actions de conduite', emoji: '🎯', mot: 'accélérer', definition_simple: 'aller plus vite', ordre: 2 },
    { categorie: 'Actions de conduite', emoji: '🎯', mot: 'freiner', definition_simple: 'appuyer sur la pédale de frein', ordre: 3 },
    { categorie: 'Actions de conduite', emoji: '🎯', mot: 's\'arrêter', definition_simple: 'ne plus bouger', ordre: 4 },
    { categorie: 'Actions de conduite', emoji: '🎯', mot: 'tourner (à droite ou à gauche)', definition_simple: 'changer de direction', ordre: 5 },
    { categorie: 'Actions de conduite', emoji: '🎯', mot: 'céder le passage', definition_simple: 'laisser passer les autres', ordre: 6 },
    { categorie: 'Actions de conduite', emoji: '🎯', mot: 'j\'anticipe', definition_simple: 'je prévois ce qui va arriver', ordre: 7 },
    { categorie: 'Actions de conduite', emoji: '🎯', mot: 'circuler / circulation / je circule', definition_simple: 'rouler sur les routes', ordre: 8 },
    { categorie: 'Actions de conduite', emoji: '🎯', mot: 'se croiser / en croisant', definition_simple: 'se rencontrer avec un autre véhicule', ordre: 9 },
    { categorie: 'Actions de conduite', emoji: '🎯', mot: 'insertion / s\'insérer / je m\'insère', definition_simple: 'entrer dans la circulation', ordre: 10 },

    // ÉQUIPEMENTS ET ÉLÉMENTS DU VÉHICULE
    { categorie: 'Équipements du véhicule', emoji: '⚙️', mot: 'le frein', definition_simple: 'système pour ralentir et arrêter', ordre: 1 },
    { categorie: 'Équipements du véhicule', emoji: '⚙️', mot: 'frein à main', definition_simple: 'frein qu\'on tire avec la main', ordre: 2 },
    { categorie: 'Équipements du véhicule', emoji: '⚙️', mot: 'levier de vitesse', definition_simple: 'bâton pour changer les vitesses', ordre: 3 },
    { categorie: 'Équipements du véhicule', emoji: '⚙️', mot: 'point mort', definition_simple: 'position du levier où la voiture n\'avance pas', ordre: 4 },
    { categorie: 'Équipements du véhicule', emoji: '⚙️', mot: 'clignotants', definition_simple: 'lumières pour indiquer qu\'on tourne', ordre: 5 },
    { categorie: 'Équipements du véhicule', emoji: '⚙️', mot: 'feux', definition_simple: 'toutes les lumières de la voiture', ordre: 6 },
    { categorie: 'Équipements du véhicule', emoji: '⚙️', mot: 'feu de brouillard (avant/arrière)', definition_simple: 'lumière spéciale quand il y a du brouillard', ordre: 7 },
    { categorie: 'Équipements du véhicule', emoji: '⚙️', mot: 'les essuie-glaces', definition_simple: 'pour nettoyer le pare-brise quand il pleut', ordre: 8 },
    { categorie: 'Équipements du véhicule', emoji: '⚙️', mot: 'airbag', definition_simple: 'coussin de sécurité qui se gonfle', ordre: 9 },
    { categorie: 'Équipements du véhicule', emoji: '⚙️', mot: 'plaquettes et disques de frein', definition_simple: 'pièces du système de freinage', ordre: 10 },
    { categorie: 'Équipements du véhicule', emoji: '⚙️', mot: 'batterie de traction', definition_simple: 'batterie d\'une voiture électrique', ordre: 11 },
    { categorie: 'Équipements du véhicule', emoji: '⚙️', mot: 'un câble de charge', definition_simple: 'fil pour recharger une voiture électrique', ordre: 12 },
    { categorie: 'Équipements du véhicule', emoji: '⚙️', mot: 'la climatisation', definition_simple: 'système pour refroidir l\'air', ordre: 13 },
    { categorie: 'Équipements du véhicule', emoji: '⚙️', mot: 'le limiteur de vitesse', definition_simple: 'système qui empêche de dépasser une vitesse', ordre: 14 },
    { categorie: 'Équipements du véhicule', emoji: '⚙️', mot: 'l\'aide au freinage d\'urgence', definition_simple: 'système qui freine automatiquement', ordre: 15 },
    { categorie: 'Équipements du véhicule', emoji: '⚙️', mot: 'régulateur de vitesse et d\'espacement', definition_simple: 'système automatique pour garder la vitesse et la distance', ordre: 16 },
    { categorie: 'Équipements du véhicule', emoji: '⚙️', mot: 'la portière', definition_simple: 'porte de la voiture', ordre: 17 },

    // INFRASTRUCTURE ROUTIÈRE
    { categorie: 'Infrastructure routière', emoji: '🛣️', mot: 'intersection', definition_simple: 'endroit où deux routes se croisent', ordre: 1 },
    { categorie: 'Infrastructure routière', emoji: '🛣️', mot: 'une voie', definition_simple: 'une ligne de circulation sur la route', ordre: 2 },
    { categorie: 'Infrastructure routière', emoji: '🛣️', mot: 'la chaussée', definition_simple: 'la surface de la route', ordre: 3 },
    { categorie: 'Infrastructure routière', emoji: '🛣️', mot: 'passage à niveau', definition_simple: 'endroit où la route croise la voie ferrée', ordre: 4 },
    { categorie: 'Infrastructure routière', emoji: '🛣️', mot: 'un feu tricolore', definition_simple: 'feu rouge, orange, vert', ordre: 5 },
    { categorie: 'Infrastructure routière', emoji: '🛣️', mot: 'route métropolitaine', definition_simple: 'route en France métropolitaine', ordre: 6 },
    { categorie: 'Infrastructure routière', emoji: '🛣️', mot: 'route départementale', definition_simple: 'route gérée par le département', ordre: 7 },
    { categorie: 'Infrastructure routière', emoji: '🛣️', mot: 'route nationale', definition_simple: 'route importante gérée par l\'État', ordre: 8 },
    { categorie: 'Infrastructure routière', emoji: '🛣️', mot: 'autoroute', definition_simple: 'route rapide à péage', ordre: 9 },

    // VITESSE ET ALLURE
    { categorie: 'Vitesse et allure', emoji: '⚡', mot: 'réduire sa vitesse', definition_simple: 'ralentir', ordre: 1 },
    { categorie: 'Vitesse et allure', emoji: '⚡', mot: 'augmenter sa vitesse', definition_simple: 'accélérer', ordre: 2 },
    { categorie: 'Vitesse et allure', emoji: '⚡', mot: 'je maintiens mon allure', definition_simple: 'je garde la même vitesse', ordre: 3 },
    { categorie: 'Vitesse et allure', emoji: '⚡', mot: 'la même allure', definition_simple: 'la même vitesse', ordre: 4 },
    { categorie: 'Vitesse et allure', emoji: '⚡', mot: 'vive allure', definition_simple: 'vitesse rapide', ordre: 5 },
    { categorie: 'Vitesse et allure', emoji: '⚡', mot: 'passer les vitesses', definition_simple: 'changer de vitesse', ordre: 6 },

    // MANŒUVRES ET POSITIONNEMENT
    { categorie: 'Manœuvres et positionnement', emoji: '🅿️', mot: 'stationner / stationnement', definition_simple: 'garer sa voiture', ordre: 1 },
    { categorie: 'Manœuvres et positionnement', emoji: '🅿️', mot: 'un dépassement', definition_simple: 'passer devant une autre voiture', ordre: 2 },
    { categorie: 'Manœuvres et positionnement', emoji: '🅿️', mot: 'se replacer', definition_simple: 'revenir à sa place sur la route', ordre: 3 },
    { categorie: 'Manœuvres et positionnement', emoji: '🅿️', mot: 'se rabattre', definition_simple: 'revenir sur sa voie après un dépassement', ordre: 4 },
    { categorie: 'Manœuvres et positionnement', emoji: '🅿️', mot: 'serrer (à droite ou à gauche)', definition_simple: 'se rapprocher du bord', ordre: 5 },
    { categorie: 'Manœuvres et positionnement', emoji: '🅿️', mot: 'marche arrière/avant', definition_simple: 'reculer ou avancer', ordre: 6 },
    { categorie: 'Manœuvres et positionnement', emoji: '🅿️', mot: 'je suis bien placé', definition_simple: 'je suis au bon endroit', ordre: 7 },
    { categorie: 'Manœuvres et positionnement', emoji: '🅿️', mot: 'l\'arrière', definition_simple: 'le derrière de la voiture', ordre: 8 },
    { categorie: 'Manœuvres et positionnement', emoji: '🅿️', mot: 'l\'avant', definition_simple: 'le devant de la voiture', ordre: 9 },
    { categorie: 'Manœuvres et positionnement', emoji: '🅿️', mot: 'côté (droite ou gauche)', definition_simple: 'sur le côté de la voiture', ordre: 10 },
    { categorie: 'Manœuvres et positionnement', emoji: '🅿️', mot: 'latéral', definition_simple: 'sur le côté', ordre: 11 },

    // SÉCURITÉ ET ACCIDENTS
    { categorie: 'Sécurité et accidents', emoji: '⚠️', mot: 'accident', definition_simple: 'collision, choc entre véhicules', ordre: 1 },
    { categorie: 'Sécurité et accidents', emoji: '⚠️', mot: 'accident matériel', definition_simple: 'accident avec seulement des dégâts', ordre: 2 },
    { categorie: 'Sécurité et accidents', emoji: '⚠️', mot: 'accident corporel', definition_simple: 'accident avec des blessés', ordre: 3 },
    { categorie: 'Sécurité et accidents', emoji: '⚠️', mot: 'accident mortel', definition_simple: 'accident où quelqu\'un meurt', ordre: 4 },
    { categorie: 'Sécurité et accidents', emoji: '⚠️', mot: 'collision frontale', definition_simple: 'choc de face entre deux voitures', ordre: 5 },
    { categorie: 'Sécurité et accidents', emoji: '⚠️', mot: 'un risque', definition_simple: 'un danger possible', ordre: 6 },
    { categorie: 'Sécurité et accidents', emoji: '⚠️', mot: 'sans risque', definition_simple: 'sans danger', ordre: 7 },
    { categorie: 'Sécurité et accidents', emoji: '⚠️', mot: 'en danger', definition_simple: 'dans une situation risquée', ordre: 8 },
    { categorie: 'Sécurité et accidents', emoji: '⚠️', mot: 'la zone à risque', definition_simple: 'endroit dangereux sur la route', ordre: 9 },
    { categorie: 'Sécurité et accidents', emoji: '⚠️', mot: 'les tués', definition_simple: 'les morts dans les accidents', ordre: 10 },
    { categorie: 'Sécurité et accidents', emoji: '⚠️', mot: 'sécurité enfant', definition_simple: 'système pour protéger les enfants', ordre: 11 },
    { categorie: 'Sécurité et accidents', emoji: '⚠️', mot: 'être bien installé', definition_simple: 'être bien assis dans la voiture', ordre: 12 },

    // RÈGLES ET RÉGLEMENTATION
    { categorie: 'Règles et réglementation', emoji: '📋', mot: 'en infraction', definition_simple: 'ne pas respecter les règles', ordre: 1 },
    { categorie: 'Règles et réglementation', emoji: '📋', mot: 'infraction', definition_simple: 'ne pas respecter une règle', ordre: 2 },
    { categorie: 'Règles et réglementation', emoji: '📋', mot: 'obligatoire', definition_simple: 'on doit le faire', ordre: 3 },
    { categorie: 'Règles et réglementation', emoji: '📋', mot: 'facultatif', definition_simple: 'on peut le faire ou pas', ordre: 4 },
    { categorie: 'Règles et réglementation', emoji: '📋', mot: 'nécessaire', definition_simple: 'obligatoire, il faut le faire', ordre: 5 },
    { categorie: 'Règles et réglementation', emoji: '📋', mot: 'prioritaire', definition_simple: 'qui passe en premier', ordre: 6 },
    { categorie: 'Règles et réglementation', emoji: '📋', mot: 'la signalisation', definition_simple: 'tous les panneaux et marquages', ordre: 7 },
    { categorie: 'Règles et réglementation', emoji: '📋', mot: 'période probatoire', definition_simple: 'premières années après le permis', ordre: 8 },
    { categorie: 'Règles et réglementation', emoji: '📋', mot: 'L\'assurance de responsabilité civile automobile', definition_simple: 'assurance obligatoire pour conduire', ordre: 9 },
    { categorie: 'Règles et réglementation', emoji: '📋', mot: 'une amende', definition_simple: 'argent à payer quand on fait une infraction', ordre: 10 },

    // PERCEPTION ET CONDUITE
    { categorie: 'Perception et conduite', emoji: '🧠', mot: 'la visibilité', definition_simple: 'ce qu\'on peut voir', ordre: 1 },
    { categorie: 'Perception et conduite', emoji: '🧠', mot: 'vigilance', definition_simple: 'faire attention', ordre: 2 },
    { categorie: 'Perception et conduite', emoji: '🧠', mot: 'la prise d\'information', definition_simple: 'regarder et analyser la situation', ordre: 3 },
    { categorie: 'Perception et conduite', emoji: '🧠', mot: 'altérer (la prise d\'information)', definition_simple: 'empêcher de bien voir et comprendre', ordre: 4 },
    { categorie: 'Perception et conduite', emoji: '🧠', mot: 'perception visuelle', definition_simple: 'ce qu\'on voit avec les yeux', ordre: 5 },
    { categorie: 'Perception et conduite', emoji: '🧠', mot: 'un indice', definition_simple: 'un signe, une information', ordre: 6 },
    { categorie: 'Perception et conduite', emoji: '🧠', mot: 'une conduite souple', definition_simple: 'conduire doucement et calmement', ordre: 7 },
    { categorie: 'Perception et conduite', emoji: '🧠', mot: 'une conduite sportive', definition_simple: 'conduire de façon dynamique', ordre: 8 },
    { categorie: 'Perception et conduite', emoji: '🧠', mot: 'le temps de réaction', definition_simple: 'temps pour réagir à un danger', ordre: 9 },

    // LIEUX ET TRAJETS
    { categorie: 'Lieux et trajets', emoji: '📍', mot: 'agglomération', definition_simple: 'ville, village', ordre: 1 },
    { categorie: 'Lieux et trajets', emoji: '📍', mot: 'trajet', definition_simple: 'chemin d\'un point A à un point B', ordre: 2 },
    { categorie: 'Lieux et trajets', emoji: '📍', mot: 'un trajet que j\'emprunte quotidiennement', definition_simple: 'chemin que je fais tous les jours', ordre: 3 },
    { categorie: 'Lieux et trajets', emoji: '📍', mot: 'une trajectoire', definition_simple: 'le chemin que suit la voiture', ordre: 4 },
    { categorie: 'Lieux et trajets', emoji: '📍', mot: 'un bouchon', definition_simple: 'embouteillage, circulation bloquée', ordre: 5 },

    // APPRENTISSAGE ET CONTRÔLES
    { categorie: 'Apprentissage et contrôles', emoji: '🎓', mot: 'conduite supervisée', definition_simple: 'apprendre à conduire avec un adulte', ordre: 1 },
    { categorie: 'Apprentissage et contrôles', emoji: '🎓', mot: 'contrôle technique', definition_simple: 'vérification obligatoire de la voiture', ordre: 2 },
    { categorie: 'Apprentissage et contrôles', emoji: '🎓', mot: 'constat (et e-constat)', definition_simple: 'papier à remplir après un accident', ordre: 3 },

    // SANTÉ ET SUBSTANCES
    { categorie: 'Santé et substances', emoji: '⚕️', mot: 'taux d\'alcoolémie', definition_simple: 'quantité d\'alcool dans le sang', ordre: 1 },
    { categorie: 'Santé et substances', emoji: '⚕️', mot: 'Les effets de certains médicaments', definition_simple: 'certains médicaments donnent les mêmes effets que l\'alcool', ordre: 2 },
    { categorie: 'Santé et substances', emoji: '⚕️', mot: 'réduire le risque de fatigue', definition_simple: 'éviter d\'être fatigué', ordre: 3 },

    // FONCTIONNEMENT ET ÉCONOMIE
    { categorie: 'Fonctionnement et économie', emoji: '🔧', mot: 'économiser du carburant', definition_simple: 'consommer moins d\'essence', ordre: 1 },
    { categorie: 'Fonctionnement et économie', emoji: '🔧', mot: 'carburant', definition_simple: 'essence ou diesel', ordre: 2 },
    { categorie: 'Fonctionnement et économie', emoji: '🔧', mot: 'panne', definition_simple: 'la voiture ne marche plus', ordre: 3 },
    { categorie: 'Fonctionnement et économie', emoji: '🔧', mot: 'ajuster', definition_simple: 'corriger, adapter', ordre: 4 },
    { categorie: 'Fonctionnement et économie', emoji: '🔧', mot: 'je désactive', definition_simple: 'j\'éteins, j\'arrête', ordre: 5 },
    { categorie: 'Fonctionnement et économie', emoji: '🔧', mot: 'la distance d\'arrêt', definition_simple: 'distance nécessaire pour s\'arrêter', ordre: 6 },

    // QUANTITÉS ET MESURES
    { categorie: 'Quantités et mesures', emoji: '📊', mot: '2/3', definition_simple: 'deux tiers', ordre: 1 },
    { categorie: 'Quantités et mesures', emoji: '📊', mot: 'la plupart', definition_simple: 'presque tous', ordre: 2 },
    { categorie: 'Quantités et mesures', emoji: '📊', mot: 'absence/présence', definition_simple: 'il n\'y a pas / il y a', ordre: 3 },
    { categorie: 'Quantités et mesures', emoji: '📊', mot: 'uniquement', definition_simple: 'seulement', ordre: 4 },

    // PRIORITÉS ET CHOIX
    { categorie: 'Priorités et choix', emoji: '🎯', mot: 'je privilégie', definition_simple: 'je choisis en priorité', ordre: 1 }
]

async function importVocabulaire() {
    console.log('🚀 Début de l\'import du vocabulaire code de la route...')

    try {
        // Préparer les données pour l'insertion
        const dataToInsert = vocabulaire.map(item => ({
            categorie: item.categorie,
            emoji: item.emoji,
            mot: item.mot,
            definition_simple: item.definition_simple,
            ordre_categorie: item.ordre
        }))

        // Insérer en batch
        const { data, error } = await supabase
            .from('vocabulaire_code_route')
            .insert(dataToInsert)
            .select()

        if (error) {
            console.error('❌ Erreur lors de l\'insertion:', error.message)
            return
        }

        console.log(`✅ ${data.length} mots/expressions importés avec succès !`)

        // Afficher un résumé par catégorie
        const categories = {}
        vocabulaire.forEach(item => {
            if (!categories[item.categorie]) {
                categories[item.categorie] = 0
            }
            categories[item.categorie]++
        })

        console.log('\n📊 Résumé par catégorie:')
        Object.entries(categories).forEach(([cat, count]) => {
            console.log(`   ${count} mots dans "${cat}"`)
        })

    } catch (error) {
        console.error('❌ Erreur:', error.message)
    }
}

importVocabulaire()
