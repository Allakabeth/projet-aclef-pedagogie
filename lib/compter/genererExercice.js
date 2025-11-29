/**
 * Utilitaires pour la génération d'exercices aléatoires du module COMPTER
 */

/**
 * Mélange un tableau de façon aléatoire (Fisher-Yates)
 * @param {Array} array - Tableau à mélanger
 * @returns {Array} - Nouveau tableau mélangé
 */
export function melangerTableau(array) {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
}

/**
 * Sélectionne N éléments aléatoires d'un tableau
 * @param {Array} array - Tableau source
 * @param {number} n - Nombre d'éléments à sélectionner
 * @returns {Array} - Tableau de N éléments aléatoires
 */
export function piocherElements(array, n) {
    const shuffled = melangerTableau(array)
    return shuffled.slice(0, Math.min(n, array.length))
}

/**
 * Génère un nombre aléatoire entre min et max (inclus)
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function nombreAleatoire(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Vérifie si l'ordre des éléments est correct pour RANGER
 * @param {Array} elements - Éléments dans l'ordre actuel
 * @param {string} critere - Critère de tri ('prix', 'taille', etc.)
 * @returns {boolean}
 */
export function verifierOrdreRanger(elements, critere = 'valeur') {
    for (let i = 0; i < elements.length - 1; i++) {
        const valeurActuelle = elements[i].valeur ?? elements[i].ordre_correct ?? 0
        const valeurSuivante = elements[i + 1].valeur ?? elements[i + 1].ordre_correct ?? 0
        if (valeurActuelle > valeurSuivante) {
            return false
        }
    }
    return true
}

/**
 * Vérifie si le classement TRIER est correct
 * @param {Object} classement - { categorie: [elements] }
 * @param {Array} elementsOriginaux - Éléments avec leur catégorie correcte
 * @returns {Object} - { correct: boolean, erreurs: number, details: [] }
 */
export function verifierClassementTrier(classement, elementsOriginaux) {
    let erreurs = 0
    const details = []

    elementsOriginaux.forEach(element => {
        const categorieCorrecte = element.categorie
        let estBienPlace = false

        // Chercher dans quelle catégorie l'élément a été placé
        for (const [categorie, elements] of Object.entries(classement)) {
            if (elements.some(e => e.id === element.id)) {
                if (categorie === categorieCorrecte) {
                    estBienPlace = true
                } else {
                    erreurs++
                    details.push({
                        element: element.label,
                        placeDans: categorie,
                        attendu: categorieCorrecte
                    })
                }
                break
            }
        }

        if (!estBienPlace && !details.some(d => d.element === element.label)) {
            erreurs++
            details.push({
                element: element.label,
                placeDans: null,
                attendu: categorieCorrecte
            })
        }
    })

    return {
        correct: erreurs === 0,
        erreurs,
        details
    }
}

/**
 * Vérifie les associations pour ASSOCIER
 * @param {Array} associations - [{ gauche: id, droite: id }]
 * @param {Array} pairesCorrectes - Paires correctes depuis la BDD
 * @returns {Object}
 */
export function verifierAssociations(associations, pairesCorrectes) {
    let erreurs = 0
    const details = []

    associations.forEach(assoc => {
        const paireCorrecte = pairesCorrectes.find(p =>
            (p.id === assoc.gauche && p.paire_id === assoc.droite) ||
            (p.id === assoc.droite && p.paire_id === assoc.gauche)
        )

        if (!paireCorrecte) {
            erreurs++
            details.push(assoc)
        }
    })

    return {
        correct: erreurs === 0,
        erreurs,
        details
    }
}

/**
 * Calcule le score en pourcentage
 * @param {number} reussites
 * @param {number} total
 * @returns {number}
 */
export function calculerScore(reussites, total) {
    if (total === 0) return 0
    return Math.round((reussites / total) * 100)
}

/**
 * Formate le temps en secondes en format lisible
 * @param {number} secondes
 * @returns {string}
 */
export function formaterTemps(secondes) {
    if (secondes < 60) {
        return `${secondes}s`
    }
    const minutes = Math.floor(secondes / 60)
    const sec = secondes % 60
    return `${minutes}min ${sec}s`
}

/**
 * Données de fallback si la BDD n'est pas disponible
 */
export const DONNEES_FALLBACK = {
    ranger: {
        courses_prix: {
            consigne: 'Rangez du moins cher au plus cher',
            elements: [
                { id: 1, label: 'Baguette', valeur: 1.10, ordre_correct: 1 },
                { id: 2, label: 'Lait', valeur: 1.50, ordre_correct: 2 },
                { id: 3, label: 'Yaourts', valeur: 2.30, ordre_correct: 3 },
                { id: 4, label: 'Fromage', valeur: 3.20, ordre_correct: 4 },
                { id: 5, label: 'Jambon', valeur: 4.50, ordre_correct: 5 },
                { id: 6, label: 'Poulet', valeur: 8.50, ordre_correct: 6 }
            ]
        },
        cuisine_taille: {
            consigne: 'Rangez du plus petit au plus grand',
            elements: [
                { id: 1, label: 'Cuillère à café', valeur: 1, ordre_correct: 1 },
                { id: 2, label: 'Cuillère à soupe', valeur: 2, ordre_correct: 2 },
                { id: 3, label: 'Fourchette', valeur: 3, ordre_correct: 3 },
                { id: 4, label: 'Louche', valeur: 4, ordre_correct: 4 },
                { id: 5, label: 'Écumoire', valeur: 5, ordre_correct: 5 }
            ]
        },
        planning_chronologie: {
            consigne: 'Rangez dans l\'ordre de la journée',
            elements: [
                { id: 1, label: 'Petit-déjeuner', valeur: 1, ordre_correct: 1 },
                { id: 2, label: 'Matin', valeur: 2, ordre_correct: 2 },
                { id: 3, label: 'Déjeuner', valeur: 3, ordre_correct: 3 },
                { id: 4, label: 'Après-midi', valeur: 4, ordre_correct: 4 },
                { id: 5, label: 'Dîner', valeur: 5, ordre_correct: 5 }
            ]
        }
    },
    trier: {
        supermarche: {
            consigne: 'Triez les produits dans les bons rayons',
            categories: ['Fruits & Légumes', 'Produits laitiers', 'Viandes', 'Boissons'],
            elements: [
                { id: 1, label: 'Pomme', categorie: 'Fruits & Légumes' },
                { id: 2, label: 'Carotte', categorie: 'Fruits & Légumes' },
                { id: 3, label: 'Banane', categorie: 'Fruits & Légumes' },
                { id: 4, label: 'Lait', categorie: 'Produits laitiers' },
                { id: 5, label: 'Yaourt', categorie: 'Produits laitiers' },
                { id: 6, label: 'Fromage', categorie: 'Produits laitiers' },
                { id: 7, label: 'Poulet', categorie: 'Viandes' },
                { id: 8, label: 'Jambon', categorie: 'Viandes' },
                { id: 9, label: 'Jus d\'orange', categorie: 'Boissons' },
                { id: 10, label: 'Eau', categorie: 'Boissons' }
            ]
        },
        dechets: {
            consigne: 'Triez les déchets dans les bonnes poubelles',
            categories: ['Poubelle jaune', 'Poubelle verte', 'Verre'],
            elements: [
                { id: 1, label: 'Bouteille plastique', categorie: 'Poubelle jaune' },
                { id: 2, label: 'Carton', categorie: 'Poubelle jaune' },
                { id: 3, label: 'Canette', categorie: 'Poubelle jaune' },
                { id: 4, label: 'Épluchures', categorie: 'Poubelle verte' },
                { id: 5, label: 'Restes repas', categorie: 'Poubelle verte' },
                { id: 6, label: 'Bouteille verre', categorie: 'Verre' },
                { id: 7, label: 'Bocal', categorie: 'Verre' },
                { id: 8, label: 'Pot confiture', categorie: 'Verre' }
            ]
        }
    },
    memoriser: {
        liste_courses: {
            consigne: 'Mémorisez les produits puis retrouvez-les',
            elements: [
                { id: 1, label: 'Pomme' },
                { id: 2, label: 'Lait' },
                { id: 3, label: 'Pain' },
                { id: 4, label: 'Fromage' },
                { id: 5, label: 'Œufs' },
                { id: 6, label: 'Beurre' },
                { id: 7, label: 'Yaourt' },
                { id: 8, label: 'Jambon' },
                { id: 9, label: 'Salade' },
                { id: 10, label: 'Tomate' }
            ],
            distracteurs: [
                { id: 11, label: 'Poisson' },
                { id: 12, label: 'Chocolat' },
                { id: 13, label: 'Café' },
                { id: 14, label: 'Riz' },
                { id: 15, label: 'Pâtes' }
            ]
        }
    }
}
