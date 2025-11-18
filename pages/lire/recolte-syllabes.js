import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function RecolteSyllabes() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [paniers, setPaniers] = useState([])
    const [motsATraiter, setMotsATraiter] = useState([])
    const [motActuel, setMotActuel] = useState(null)
    const [segmentationActuelle, setSegmentationActuelle] = useState([])
    const [indexSyllabeActuelle, setIndexSyllabeActuelle] = useState(0)
    const [showNomPanier, setShowNomPanier] = useState(false)
    const [nomPanierPropose, setNomPanierPropose] = useState('')
    const [nomPanierSaisi, setNomPanierSaisi] = useState('')
    const [motsTraites, setMotsTraites] = useState([])
    const [motsEnAttenteSonsComplexes, setMotsEnAttenteSonsComplexes] = useState([])
    const [motsEnAttenteResegmentation, setMotsEnAttenteResegmentation] = useState([])
    const [tousMots, setTousMots] = useState([]) // Stocker tous les mots initiaux
    const [lettreSelectionnee, setLettreSelectionnee] = useState(null) // Lettre sélectionnée pour navigation
    const [jeuTermine, setJeuTermine] = useState(false) // État pour gérer la fin du jeu
    const [afficherFinRecolte, setAfficherFinRecolte] = useState(false) // État pour la fenêtre "fin de récolte"
    const [motsInitiaux, setMotsInitiaux] = useState([]) // Variable state pour persister les mots initiaux
    const [sonPanierActive, setSonPanierActive] = useState(true) // Contrôle du son pour création de panier
    const [showAide, setShowAide] = useState(false) // Contrôle l'affichage du popup d'aide
    const router = useRouter()

    useEffect(() => {
        // Vérifier l'authentification
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')

        if (!token || !userData) {
            router.push('/login')
            return
        }

        try {
            setUser(JSON.parse(userData))
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/login')
            return
        }

        setIsLoading(false)

        // Charger les voix pour la synthèse vocale
        if ('speechSynthesis' in window) {
            // Forcer le chargement des voix
            const loadVoices = () => {
                const voices = window.speechSynthesis.getVoices()
                if (voices.length > 0) {
                    console.log('🔊 Voix disponibles:', voices.filter(v => v.lang.startsWith('fr')).map(v => v.name))
                }
            }

            // Les voix peuvent être chargées de manière asynchrone
            window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
            loadVoices() // Essayer de charger immédiatement
        }
    }, [router])

    useEffect(() => {
        if (router.isReady) {
            chargerMots()
        }
    }, [router.isReady, router.query.texte])

    // Charger les paniers quand les mots initiaux sont chargés
    useEffect(() => {
        if (motsInitiaux.length > 0) {
            chargerPaniersExistants()
        }
    }, [motsInitiaux])

    const chargerMots = async () => {
        try {
            // Récupérer l'ID du texte depuis l'URL ou localStorage
            const texteId = router.query.texte || localStorage.getItem('texte_selectionne_id')
            if (!texteId) {
                console.log('Aucun texte sélectionné')
                return
            }

            console.log('Chargement des mots pour le texte:', texteId)

            const token = localStorage.getItem('token')

            // 1. Charger les mots du texte (depuis l'ancienne API)
            const responseMots = await fetch('/api/mots-classifies/multisyllabes-simple', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    textesIds: [texteId]
                })
            })

            if (!responseMots.ok) {
                console.error('Erreur chargement mots')
                return
            }

            const dataMots = await responseMots.json()
            const mots = dataMots.mots || []

            // 2. Charger les segmentations personnalisées de l'apprenant (SANS CACHE)
            const responseSegmentations = await fetch('/api/enregistrements-syllabes/list', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                cache: 'no-store' // Forcer rechargement sans cache
            })

            let segmentationsMap = {}
            if (responseSegmentations.ok) {
                const dataSegmentations = await responseSegmentations.json()
                // Créer une map pour accès rapide par mot
                segmentationsMap = dataSegmentations.segmentationsMap || {}
                console.log('📦 Segmentations chargées:', Object.keys(segmentationsMap).length, 'mots')
            }

            // 3. Enrichir les mots avec leurs segmentations personnalisées
            const motsEnrichis = mots.map(mot => {
                const motNormalized = mot.contenu
                    .toLowerCase()
                    .trim()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')

                const segmentation = segmentationsMap[motNormalized]

                if (segmentation) {
                    // Le mot a une segmentation personnalisée
                    console.log(`✅ "${mot.contenu}" -> segmentation:`, segmentation.segmentation_personnalisee, 'modifiées:', segmentation.syllabes_modifiees)
                    return {
                        ...mot,
                        segmentation: segmentation.segmentation_personnalisee,
                        syllabesModifiees: segmentation.syllabes_modifiees,
                        audioUrls: segmentation.audio_urls
                    }
                } else {
                    // Pas de segmentation personnalisée, on utilisera l'API automatique
                    console.log(`⚠️ "${mot.contenu}" (${motNormalized}) -> pas de segmentation personnalisée`)
                    return mot
                }
            })

            setMotsInitiaux(motsEnrichis)
            setTousMots(motsEnrichis)
            setMotsATraiter(motsEnrichis)
            console.log('Mots chargés:', motsEnrichis.length)

            // Charger le premier mot
            if (motsEnrichis.length > 0) {
                chargerMotActuel(motsEnrichis[0])
            }
        } catch (error) {
            console.error('Erreur chargement mots:', error)
        }
    }

    const chargerMotActuel = async (mot) => {
        try {
            // Si le mot a déjà une segmentation personnalisée, l'utiliser
            if (mot.segmentation) {
                console.log('Utilisation segmentation personnalisée:', mot.contenu)

                // Si syllabe modifiée, on utilise la version modifiée, sinon la version originale
                const segmentationAffichee = mot.segmentation.map((syllabe, index) => {
                    // Si syllabe modifiée existe, l'utiliser
                    if (mot.syllabesModifiees && mot.syllabesModifiees[index]) {
                        return mot.syllabesModifiees[index]
                    }
                    return syllabe
                })

                setMotActuel(mot)
                setSegmentationActuelle(segmentationAffichee)
                setIndexSyllabeActuelle(0)

                console.log('Segmentation personnalisée:', segmentationAffichee)
                return
            }

            // Sinon, utiliser l'API de segmentation automatique (fallback pour mots non segmentés)
            console.log('Segmentation automatique du mot:', mot.contenu)

            const response = await fetch('/api/syllabification/coupe-mots', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mots: [mot.contenu]
                })
            })

            if (response.ok) {
                const data = await response.json()
                const segmentation = data.syllabifications[mot.contenu] || [mot.contenu]

                setMotActuel(mot)
                setSegmentationActuelle(segmentation)
                setIndexSyllabeActuelle(0)

                console.log('Segmentation automatique:', segmentation)
            }
        } catch (error) {
            console.error('Erreur chargement mot:', error)
            // Fallback : pas de segmentation
            setMotActuel(mot)
            setSegmentationActuelle([mot.contenu])
            setIndexSyllabeActuelle(0)
        }
    }

    const ajouterPanier = () => {
        if (segmentationActuelle.length > 0 && indexSyllabeActuelle < segmentationActuelle.length) {
            const syllabeCourante = segmentationActuelle[indexSyllabeActuelle]
            setNomPanierPropose(syllabeCourante)
            setNomPanierSaisi('')  // Input vide, l'apprenant doit taper
            setShowNomPanier(true)
        }
    }

    const validerPanier = () => {
        if (nomPanierSaisi.trim()) {
            const nomPanier = nomPanierSaisi.trim()
            const syllabeCourante = segmentationActuelle[indexSyllabeActuelle]
            const premiereLettreSyllabe = syllabeCourante ? syllabeCourante.charAt(0).toUpperCase() : ''
            const premiereLettrePanier = nomPanier.charAt(0).toUpperCase()
            
            // Vérifier que le nom du panier commence par la même lettre que la syllabe courante
            if (premiereLettrePanier !== premiereLettreSyllabe) {
                alert(`Erreur : Le nom du panier doit commencer par la lettre "${premiereLettreSyllabe}" (première lettre de la syllabe "${syllabeCourante}").`)
                return
            }
            
            const nouveauPanier = {
                id: Date.now(),
                nom: nomPanier,
                syllabes: []
            }
            setPaniers([...paniers, nouveauPanier])
            setShowNomPanier(false)
            setNomPanierSaisi('')
            setNomPanierPropose('')

            // Jouer le son si activé
            if (sonPanierActive) {
                jouerSon('créer un nouveau panier')
            }
        }
    }

    const classerSyllabeDansPanier = (panierId) => {
        if (!motActuel || !segmentationActuelle.length || indexSyllabeActuelle >= segmentationActuelle.length) return

        const syllabeCourante = segmentationActuelle[indexSyllabeActuelle]

        // Créer l'objet mot avec syllabe et position pour colorisation
        const motAvecSyllabe = {
            mot: motActuel.contenu,
            segmentation: segmentationActuelle,
            syllabeCiblee: syllabeCourante,
            indexSyllabeCiblee: indexSyllabeActuelle
        }

        // Ajouter le mot avec syllabe au panier
        setPaniers(paniers.map(p =>
            p.id === panierId ?
                { ...p, syllabes: [...p.syllabes, motAvecSyllabe] } :
                p
        ))

        // Passer à la syllabe suivante
        passerSyllabeSuivante()
    }
    
    const classerDansSonsComplexes = () => {
        if (!motActuel) return
        
        // Ajouter le mot entier aux mots en attente pour sons complexes
        if (!motsEnAttenteSonsComplexes.find(m => m.contenu === motActuel.contenu)) {
            setMotsEnAttenteSonsComplexes([...motsEnAttenteSonsComplexes, motActuel])
        }
        
        // Passer au mot suivant
        passerMotSuivant()
    }
    
    const classerDansResegmentation = () => {
        if (!motActuel) return
        
        // Ajouter le mot entier aux mots en attente pour resegmentation
        if (!motsEnAttenteResegmentation.find(m => m.contenu === motActuel.contenu)) {
            setMotsEnAttenteResegmentation([...motsEnAttenteResegmentation, motActuel])
        }
        
        // Passer au mot suivant
        passerMotSuivant()
    }
    
    const passerSyllabeSuivante = () => {
        if (indexSyllabeActuelle < segmentationActuelle.length - 1) {
            setIndexSyllabeActuelle(indexSyllabeActuelle + 1)
        } else {
            // Toutes les syllabes du mot sont classées, marquer comme traité
            marquerMotTraite()
            passerMotSuivant()
        }
    }

    const supprimerSyllabe = () => {
        // Passer juste à la syllabe suivante sans rien faire
        passerSyllabeSuivante()
    }
    
    const marquerMotTraite = () => {
        if (motActuel && !motsTraites.find(m => m.contenu === motActuel.contenu)) {
            setMotsTraites([...motsTraites, motActuel])
        }
    }
    
    const passerMotSuivant = () => {
        // Retirer le mot actuel de la liste des mots à traiter
        const nouveauxMots = motsATraiter.filter(m => m.contenu !== motActuel.contenu)
        setMotsATraiter(nouveauxMots)
        
        // Charger le mot suivant s'il y en a un
        if (nouveauxMots.length > 0) {
            chargerMotActuel(nouveauxMots[0])
        } else {
            // Plus de mots à traiter - afficher la fenêtre de fin de récolte
            setAfficherFinRecolte(true)
            setMotActuel(null)
            setSegmentationActuelle([])
            setIndexSyllabeActuelle(0)
        }
    }

    const annulerPanier = () => {
        setShowNomPanier(false)
        setNomPanierSaisi('')
        setNomPanierPropose('')
    }

    // Fonction pour jouer un son avec la synthèse vocale
    const jouerSon = (texte, options = {}) => {
        if ('speechSynthesis' in window) {
            // Arrêter toute synthèse en cours
            window.speechSynthesis.cancel()

            const utterance = new SpeechSynthesisUtterance(texte)

            // Configurer la voix (éviter Hortense)
            const voices = window.speechSynthesis.getVoices()
            const voixFrancaise = voices.find(voice =>
                voice.lang.startsWith('fr') &&
                !voice.name.toLowerCase().includes('hortense') &&
                (voice.name.toLowerCase().includes('marie') ||
                 voice.name.toLowerCase().includes('claire') ||
                 voice.name.toLowerCase().includes('thomas') ||
                 !voice.name.toLowerCase().includes('hortense'))
            )

            if (voixFrancaise) {
                utterance.voice = voixFrancaise
            }

            // Paramètres audio (personnalisables)
            utterance.rate = options.rate || 0.8
            utterance.pitch = options.pitch || 1.1
            utterance.volume = options.volume || 0.8

            window.speechSynthesis.speak(utterance)
        }
    }

    // Fonction pour jouer le son d'une lettre
    const jouerSonLettre = (lettre) => {
        jouerSon(lettre)
    }

    // Fonction pour jouer le son d'une syllabe (utilise l'enregistrement si disponible)
    const jouerSonSyllabe = (syllabe, indexSyllabe = null) => {
        // Si on a un mot actuel avec des URLs audio ET un index de syllabe
        if (motsATraiter.length > 0 && indexSyllabe !== null) {
            const motActuel = motsATraiter[0]
            if (motActuel.audioUrls && motActuel.audioUrls[indexSyllabe]) {
                // Jouer l'enregistrement audio
                console.log(`🎵 Lecture enregistrement syllabe "${syllabe}" (index ${indexSyllabe})`)
                const audio = new Audio(motActuel.audioUrls[indexSyllabe])
                audio.play().catch(err => {
                    console.error('Erreur lecture audio:', err)
                    // Fallback sur synthèse vocale
                    jouerSonSyllabeSynthese(syllabe)
                })
                return
            }
        }

        // Fallback : synthèse vocale
        jouerSonSyllabeSynthese(syllabe)
    }

    // Fonction auxiliaire pour la synthèse vocale
    const jouerSonSyllabeSynthese = (syllabe) => {
        // Corrections phonétiques pour une meilleure prononciation
        let syllabeCorrigee = syllabe.toLowerCase()

        // Corrections spécifiques pour éviter l'épellation
        const corrections = {
            'ir': 'ire',
            'er': 'eur',
            'ar': 'are',
            'or': 'ore',
            'ur': 'ure',
            'eu': 'eue',
            'ou': 'ou',
            'ai': 'è',
            'ei': 'è',
            'au': 'ô',
            'eau': 'ô',
            'ch': 'che',
            'ph': 'fe',
            'th': 'te',
            'tion': 'sion',
            'gn': 'gne'
        }

        // Appliquer les corrections si la syllabe correspond exactement
        if (corrections[syllabeCorrigee]) {
            syllabeCorrigee = corrections[syllabeCorrigee]
        }

        jouerSon(syllabeCorrigee, { rate: 0.7 }) // Plus lent pour les syllabes
    }

    // Fonction pour jouer le nom d'un panier avec l'enregistrement si disponible
    const jouerNomPanier = (nomPanier) => {
        // Normaliser le nom du panier pour rechercher l'enregistrement
        const nomNormalise = nomPanier.toLowerCase().trim()

        // Chercher dans tous les mots chargés si on a un enregistrement pour cette syllabe
        let audioUrlTrouve = null

        for (const mot of tousMots) {
            if (mot.segmentation && mot.audioUrls) {
                const index = mot.segmentation.findIndex(syl =>
                    syl.toLowerCase().trim() === nomNormalise
                )
                if (index !== -1 && mot.audioUrls[index]) {
                    audioUrlTrouve = mot.audioUrls[index]
                    break
                }
            }
        }

        // Si on a trouvé un enregistrement, le jouer
        if (audioUrlTrouve) {
            console.log(`🎵 Lecture enregistrement panier "${nomPanier}"`)
            const audio = new Audio(audioUrlTrouve)
            audio.play().catch(err => {
                console.error('Erreur lecture audio panier:', err)
                // Fallback sur synthèse vocale
                jouerSonSyllabeSynthese(nomPanier)
            })
        } else {
            // Pas d'enregistrement trouvé, utiliser synthèse vocale
            console.log(`⚠️ Pas d'enregistrement pour "${nomPanier}", synthèse vocale`)
            jouerSonSyllabeSynthese(nomPanier)
        }
    }

    // Fonction pour afficher un mot avec colorisation
    const afficherMotAvecColorisation = (motAvecSyllabe, couleurSyllabeCiblee = '#16a34a') => {
        if (!motAvecSyllabe || !motAvecSyllabe.segmentation) {
            return <span>Erreur</span>
        }

        const { mot, segmentation, indexSyllabeCiblee } = motAvecSyllabe

        return (
            <>
                {segmentation.map((syllabe, index) => (
                    <span
                        key={index}
                        style={{
                            color: index === indexSyllabeCiblee ? couleurSyllabeCiblee : '#666',
                            fontWeight: index === indexSyllabeCiblee ? 'bold' : 'normal'
                        }}
                    >
                        {syllabe}
                    </span>
                ))}
            </>
        )
    }

    // Calculer les statistiques
    const calculerStatistiques = () => {
        const totalSyllabes = paniers.reduce((total, panier) => total + panier.syllabes.length, 0)
        
        return {
            motsTraites: motsTraites.length,
            totalSyllabes: totalSyllabes,
            sonsComplexes: motsEnAttenteSonsComplexes.length,
            motsEnAttente: motsEnAttenteResegmentation.length,
            paniersCreés: paniers.length
        }
    }

    // Terminer la récolte : sauvegarder puis afficher les stats
    const terminerRecolte = async () => {
        try {
            // D'abord sauvegarder
            await sauvegarderPaniers()
            
            // Puis passer aux statistiques
            setAfficherFinRecolte(false)
            setJeuTermine(true)
        } catch (error) {
            console.error('Erreur lors de la sauvegarde finale:', error)
            alert('❌ Erreur lors de la sauvegarde')
        }
    }

    // Envoyer à l'admin pour validation
    const envoyerPourValidation = async () => {
        try {
            const stats = calculerStatistiques()
            const token = localStorage.getItem('token')

            const response = await fetch('/api/admin/validation-syllabes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    texteId: router.query.texte || localStorage.getItem('texte_selectionne_id'),
                    statistiques: stats,
                    paniers: paniers,
                    motsTraites: motsTraites,
                    motsEnAttenteSonsComplexes: motsEnAttenteSonsComplexes,
                    motsEnAttenteResegmentation: motsEnAttenteResegmentation,
                    dateEnvoi: new Date().toISOString()
                })
            })

            if (response.ok) {
                alert('✅ Travail envoyé à l\'administrateur pour validation !')
            } else {
                alert('❌ Erreur lors de l\'envoi')
            }
        } catch (error) {
            console.error('Erreur envoi validation:', error)
            alert('❌ Erreur lors de l\'envoi')
        }
    }

    const viderTousLesPaniers = async () => {
        if (confirm('⚠️ Êtes-vous sûr de vouloir supprimer TOUS les paniers et recommencer à zéro ? Cette action est irréversible.')) {
            try {
                // Vider tous les états locaux
                setPaniers([])
                setMotsTraites([])
                setMotsEnAttenteSonsComplexes([])
                setMotsEnAttenteResegmentation([])

                // Vider sur le serveur
                const token = localStorage.getItem('token')
                const response = await fetch('/api/paniers/sauvegarder', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        paniers: {},
                        motsTraites: []
                    })
                })

                if (response.ok) {
                    alert('✅ Tous les paniers ont été supprimés ! Vous pouvez recommencer à zéro.')
                    // Recharger les mots pour recommencer
                    setMotsATraiter(motsInitiaux)
                    if (motsInitiaux.length > 0) {
                        chargerMotActuel(motsInitiaux[0])
                    }
                } else {
                    alert('❌ Erreur lors de la suppression')
                }
            } catch (error) {
                console.error('Erreur suppression paniers:', error)
                alert('❌ Erreur lors de la suppression')
            }
        }
    }

    const sauvegarderPaniers = async () => {
        try {
            // Récupérer l'ID du texte actuel
            const texteId = router.query.texte || localStorage.getItem('texte_selectionne_id')
            
            // Transformer les paniers au format attendu par l'API sessions
            const paniersFormates = {}
            
            paniers.forEach(panier => {
                const premiereLettre = panier.nom.charAt(0).toUpperCase()
                if (!paniersFormates[premiereLettre]) {
                    paniersFormates[premiereLettre] = {}
                }
                // Sauvegarder la structure complète avec mots et syllabes
                paniersFormates[premiereLettre][panier.nom] = panier.syllabes
            })

            // Ajouter les mots en attente dans les catégories spéciales
            // Format attendu par l'API : paniers[lettre][nomPanier] = [syllabes]
            if (motsEnAttenteSonsComplexes.length > 0) {
                paniersFormates['SONS_COMPLEXES'] = {
                    'SONS_COMPLEXES': motsEnAttenteSonsComplexes.map(m => m.contenu)
                }
            }
            
            if (motsEnAttenteResegmentation.length > 0) {
                paniersFormates['RESEGMENTATION'] = {
                    'RESEGMENTATION': motsEnAttenteResegmentation.map(m => m.contenu)
                }
            }

            // Utiliser l'API paniers/sauvegarder qui fonctionne
            const token = localStorage.getItem('token')
            const response = await fetch('/api/paniers/sauvegarder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    paniers: paniersFormates,
                    motsTraites: motsTraites.map(m => m.contenu)
                })
            })

            if (response.ok) {
                alert('✅ Paniers sauvegardés avec succès !')
            } else {
                alert('❌ Erreur lors de la sauvegarde')
            }
        } catch (error) {
            console.error('Erreur sauvegarde:', error)
            alert('❌ Erreur lors de la sauvegarde')
        }
    }

    const chargerPaniersExistants = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/paniers/charger', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                console.log('Paniers chargés:', data)
                
                // Transformer les paniers chargés vers le format local
                const paniersChargés = []
                const motsTraitésChargés = []
                const motsAttenteSonsComplexes = []
                const motsAttenteResegmentation = []

                Object.keys(data.paniers || {}).forEach(lettre => {
                    if (lettre === 'SONS_COMPLEXES') {
                        // Récupérer les mots en sons complexes - structure: paniers['SONS_COMPLEXES']['SONS_COMPLEXES'] = [mots]
                        Object.values(data.paniers[lettre]).forEach(mots => {
                            if (Array.isArray(mots)) {
                                mots.forEach(mot => {
                                    motsAttenteSonsComplexes.push({ contenu: mot })
                                })
                            }
                        })
                    } else if (lettre === 'RESEGMENTATION') {
                        // Récupérer les mots en resegmentation - structure: paniers['RESEGMENTATION']['RESEGMENTATION'] = [mots]  
                        Object.values(data.paniers[lettre]).forEach(mots => {
                            if (Array.isArray(mots)) {
                                mots.forEach(mot => {
                                    motsAttenteResegmentation.push({ contenu: mot })
                                })
                            }
                        })
                    } else if (lettre.length === 1) {
                        // Paniers normaux par lettre
                        Object.keys(data.paniers[lettre] || {}).forEach(nomPanier => {
                            const syllabesOuMots = data.paniers[lettre][nomPanier] || []

                            // Adapter les anciennes données (simple syllabe) vers la nouvelle structure
                            const syllabesFormatees = syllabesOuMots.map(item => {
                                if (typeof item === 'string') {
                                    // Ancienne structure : juste une syllabe
                                    return {
                                        mot: item, // On utilise la syllabe comme mot temporairement
                                        segmentation: [item],
                                        syllabeCiblee: item,
                                        indexSyllabeCiblee: 0
                                    }
                                } else {
                                    // Nouvelle structure : objet complet
                                    return item
                                }
                            })

                            paniersChargés.push({
                                id: Date.now() + Math.random(),
                                nom: nomPanier,
                                syllabes: syllabesFormatees
                            })
                        })
                    }
                })

                // Récupérer les mots traités
                if (data.motsTraites && Array.isArray(data.motsTraites)) {
                    data.motsTraites.forEach(mot => {
                        motsTraitésChargés.push({ contenu: mot })
                    })
                }

                // Appliquer les données chargées
                setPaniers(paniersChargés)
                setMotsTraites(motsTraitésChargés)
                setMotsEnAttenteSonsComplexes(motsAttenteSonsComplexes)
                setMotsEnAttenteResegmentation(motsAttenteResegmentation)

                console.log('État restauré:', {
                    paniers: paniersChargés.length,
                    motsTraités: motsTraitésChargés.length,
                    sonsComplexes: motsAttenteSonsComplexes.length,
                    resegmentation: motsAttenteResegmentation.length
                })

                // SIMPLE: enlever les mots traités/en attente de la liste "à traiter"
                const motsAEnlever = [
                    ...motsTraitésChargés.map(m => m.contenu),
                    ...motsAttenteSonsComplexes.map(m => m.contenu),
                    ...motsAttenteResegmentation.map(m => m.contenu)
                ]
                
                // Utiliser motsInitiaux qui est stable
                console.log('Mots initiaux:', motsInitiaux.length)
                console.log('Mots à enlever:', motsAEnlever)
                const motsRestants = motsInitiaux.filter(mot => !motsAEnlever.includes(mot.contenu))
                console.log('Mots restants après filtrage:', motsRestants.length)
                setMotsATraiter(motsRestants)
                
                console.log(`SIMPLE: ${motsInitiaux.length} mots total, on enlève ${motsAEnlever.length} mots (${motsAEnlever.join(', ')}), reste ${motsRestants.length} à traiter`)
                
                // Charger le premier mot restant
                if (motsRestants.length > 0) {
                    chargerMotActuel(motsRestants[0])
                }
            }
        } catch (error) {
            console.error('Erreur chargement paniers:', error)
        }
    }


    if (isLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div>Chargement...</div>
            </div>
        )
    }

    // Afficher la fenêtre de fin de récolte
    if (afficherFinRecolte) {
        return (
            <div style={{ 
                minHeight: '100vh', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)'
            }}>
                <div style={{
                    background: 'white',
                    padding: '40px',
                    borderRadius: '16px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    textAlign: 'center',
                    maxWidth: '500px',
                    margin: '20px'
                }}>
                    <div style={{ 
                        fontSize: '48px', 
                        marginBottom: '20px' 
                    }}>
                        🎉
                    </div>
                    
                    <h2 style={{ 
                        fontSize: '28px', 
                        color: '#16a34a', 
                        marginBottom: '15px' 
                    }}>
                        Tous les mots ont été récoltés !
                    </h2>
                    
                    <p style={{ 
                        fontSize: '16px', 
                        color: '#666', 
                        marginBottom: '30px',
                        lineHeight: '1.5'
                    }}>
                        Félicitations ! Vous avez terminé la récolte de toutes les syllabes.
                        <br />
                        Cliquez sur "Terminer" pour sauvegarder votre travail et voir les statistiques.
                    </p>
                    
                    <button
                        onClick={terminerRecolte}
                        style={{
                            backgroundColor: '#16a34a',
                            color: 'white',
                            padding: '15px 30px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            marginRight: '15px'
                        }}
                    >
                        ✅ Terminer et sauvegarder
                    </button>
                    
                    <button
                        onClick={() => setAfficherFinRecolte(false)}
                        style={{
                            backgroundColor: '#6b7280',
                            color: 'white',
                            padding: '15px 30px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                    >
                        Continuer à travailler
                    </button>
                </div>
            </div>
        )
    }

    // Afficher le rapport statistique quand le jeu est terminé
    if (jeuTermine) {
        const stats = calculerStatistiques()
        
        return (
            <div style={{ minHeight: '100vh', padding: '20px', backgroundColor: '#f8f9fa' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    {/* En-tête */}
                    <div style={{
                        background: 'white',
                        padding: '30px',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        textAlign: 'center',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                        <h1 style={{ 
                            fontSize: '32px', 
                            color: '#16a34a', 
                            marginBottom: '10px' 
                        }}>
                            🎉 Félicitations !
                        </h1>
                        <p style={{ 
                            fontSize: '18px', 
                            color: '#666', 
                            marginBottom: '0' 
                        }}>
                            Vous avez terminé l'exercice de récolte de syllabes
                        </p>
                    </div>

                    {/* Statistiques */}
                    <div style={{
                        background: 'white',
                        padding: '30px',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                        <h2 style={{ 
                            fontSize: '24px', 
                            color: '#333', 
                            marginBottom: '20px',
                            textAlign: 'center'
                        }}>
                            📊 Rapport Statistique
                        </h2>
                        
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                            gap: '15px' 
                        }}>
                            <div style={{ 
                                padding: '20px', 
                                background: '#dcfce7', 
                                borderRadius: '8px', 
                                textAlign: 'center' 
                            }}>
                                <div style={{ 
                                    fontSize: '32px', 
                                    fontWeight: 'bold', 
                                    color: '#16a34a' 
                                }}>
                                    {stats.motsTraites}
                                </div>
                                <div style={{ color: '#374151' }}>Mots traités</div>
                            </div>
                            
                            <div style={{ 
                                padding: '20px', 
                                background: '#dbeafe', 
                                borderRadius: '8px', 
                                textAlign: 'center' 
                            }}>
                                <div style={{ 
                                    fontSize: '32px', 
                                    fontWeight: 'bold', 
                                    color: '#2563eb' 
                                }}>
                                    {stats.totalSyllabes}
                                </div>
                                <div style={{ color: '#374151' }}>Syllabes classées</div>
                            </div>
                            
                            <div style={{ 
                                padding: '20px', 
                                background: '#fce7f3', 
                                borderRadius: '8px', 
                                textAlign: 'center' 
                            }}>
                                <div style={{ 
                                    fontSize: '32px', 
                                    fontWeight: 'bold', 
                                    color: '#be185d' 
                                }}>
                                    {stats.sonsComplexes}
                                </div>
                                <div style={{ color: '#374151' }}>Sons complexes</div>
                            </div>
                            
                            <div style={{ 
                                padding: '20px', 
                                background: '#fef3c7', 
                                borderRadius: '8px', 
                                textAlign: 'center' 
                            }}>
                                <div style={{ 
                                    fontSize: '32px', 
                                    fontWeight: 'bold', 
                                    color: '#d97706' 
                                }}>
                                    {stats.motsEnAttente}
                                </div>
                                <div style={{ color: '#374151' }}>Mots en attente</div>
                            </div>
                            
                            <div style={{ 
                                padding: '20px', 
                                background: '#f0f9ff', 
                                borderRadius: '8px', 
                                textAlign: 'center' 
                            }}>
                                <div style={{ 
                                    fontSize: '32px', 
                                    fontWeight: 'bold', 
                                    color: '#0369a1' 
                                }}>
                                    {stats.paniersCreés}
                                </div>
                                <div style={{ color: '#374151' }}>Paniers créés</div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ textAlign: 'center' }}>
                        <button
                            onClick={envoyerPourValidation}
                            style={{
                                backgroundColor: '#16a34a',
                                color: 'white',
                                padding: '15px 30px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                marginRight: '15px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                        >
                            ✅ Envoyer à l'admin pour validation
                        </button>
                        
                        <button
                            onClick={() => router.push('/lire/syllabes-paniers')}
                            style={{
                                backgroundColor: '#6b7280',
                                color: 'white',
                                padding: '15px 30px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                        >
                            ← Retour aux activités
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div style={{ minHeight: '100vh', padding: '20px' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: '30px' }}>
                    {window.innerWidth > 768 && (
                        <button
                            onClick={() => router.push('/lire/syllabes-paniers')}
                            style={{
                                position: 'absolute',
                                left: '0',
                                backgroundColor: '#6b7280',
                                color: 'white',
                                padding: '10px 20px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            ← Retour
                        </button>
                    )}
                    <h1 style={{
                        textAlign: 'center',
                        color: '#84cc16',
                        fontSize: window.innerWidth <= 768 ? '20px' : '24px',
                        margin: '0',
                        textShadow: '0 2px 4px rgba(132, 204, 22, 0.3)',
                        fontWeight: '700'
                    }}>
                        Récolte des Syllabes
                    </h1>
                </div>

                {/* Grille alphabet + boutons */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: '6px',
                    marginBottom: '20px',
                    maxHeight: '33vh',
                    overflow: 'visible'
                }}>
                    {/* 26 lettres de l'alphabet */}
                    {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(lettre => {
                        // Vérifier si c'est la lettre de la syllabe courante (catégorie active)
                        const syllabeCourante = segmentationActuelle[indexSyllabeActuelle] || ''
                        const premiereLettreSyllabe = syllabeCourante.charAt(0).toUpperCase()
                        const estCategorieActive = lettre === premiereLettreSyllabe
                        const estLettreSelectionnee = lettreSelectionnee === lettre
                        
                        // Chercher un panier correspondant à cette lettre
                        const panierCorrespondant = paniers.find(p => p.nom.toUpperCase().startsWith(lettre))
                        // Compter le nombre de paniers commençant par cette lettre
                        const nbPaniersLettre = paniers.filter(p => p.nom.toUpperCase().startsWith(lettre)).length
                        
                        return (
                            <button
                                key={lettre}
                                onClick={() => {
                                    setLettreSelectionnee(lettreSelectionnee === lettre ? null : lettre)
                                    jouerSonLettre(lettre)
                                }}
                                style={{
                                    background: estLettreSelectionnee
                                        ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                                        : (estCategorieActive
                                            ? 'linear-gradient(135deg, #84cc16, #65a30d)'
                                            : '#e5e7eb'),
                                    color: estLettreSelectionnee ? 'white' : (estCategorieActive ? 'white' : 'black'),
                                    padding: '8px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: (estCategorieActive && panierCorrespondant) ? 'pointer' : 'not-allowed',
                                    minHeight: '44px',
                                    opacity: estCategorieActive ? 1 : 0.3,
                                    position: 'relative',
                                    boxShadow: estCategorieActive ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.1)',
                                    transition: 'all 0.2s ease',
                                    transform: estLettreSelectionnee ? 'scale(1.05)' : 'scale(1)'
                                }}
                                onMouseEnter={(e) => {
                                    if (estCategorieActive) {
                                        e.target.style.transform = 'scale(1.05)'
                                        e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = estLettreSelectionnee ? 'scale(1.05)' : 'scale(1)'
                                    e.target.style.boxShadow = estCategorieActive ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.1)'
                                }}
                            >
                                {lettre}
                                {/* Afficher le nombre de paniers si > 0 */}
                                {nbPaniersLettre > 0 && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '-8px',
                                        right: '-8px',
                                        backgroundColor: '#dc2626',
                                        color: 'white',
                                        borderRadius: '50%',
                                        width: window.innerWidth <= 768 ? '16px' : '20px',
                                        height: window.innerWidth <= 768 ? '16px' : '20px',
                                        fontSize: window.innerWidth <= 768 ? '10px' : '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold'
                                    }}>
                                        {nbPaniersLettre}
                                    </span>
                                )}
                            </button>
                        )
                    })}

                    {/* Case -!? pour caractères spéciaux */}
                    <button
                        onClick={() => {
                            setLettreSelectionnee(lettreSelectionnee === 'SPECIAUX' ? null : 'SPECIAUX')
                            jouerSon("caractères spéciaux")
                        }}
                        style={{
                            background: lettreSelectionnee === 'SPECIAUX'
                                ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                                : '#e5e7eb',
                            color: lettreSelectionnee === 'SPECIAUX' ? 'white' : 'black',
                            padding: '8px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            minHeight: '44px',
                            opacity: lettreSelectionnee === 'SPECIAUX' ? 1 : 0.3,
                            position: 'relative',
                            boxShadow: lettreSelectionnee === 'SPECIAUX' ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.1)',
                            transition: 'all 0.2s ease',
                            transform: lettreSelectionnee === 'SPECIAUX' ? 'scale(1.05)' : 'scale(1)'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'scale(1.05)'
                            e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = lettreSelectionnee === 'SPECIAUX' ? 'scale(1.05)' : 'scale(1)'
                            e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
                        }}
                    >
                        -!?
                        {/* Afficher le nombre de paniers si > 0 */}
                        {paniers.filter(p => p.nom.match(/^[-!?.,;:'"()]/)).length > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '-8px',
                                right: '-8px',
                                backgroundColor: '#dc2626',
                                color: 'white',
                                borderRadius: '50%',
                                width: window.innerWidth <= 768 ? '16px' : '20px',
                                height: window.innerWidth <= 768 ? '16px' : '20px',
                                fontSize: window.innerWidth <= 768 ? '10px' : '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold'
                            }}>
                                {paniers.filter(p => p.nom.match(/^[-!?.,;:'"()]/)).length}
                            </span>
                        )}
                    </button>

                    {/* Case sauvegarde */}
                    <button
                        onClick={sauvegarderPaniers}
                        style={{
                            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                            color: 'white',
                            padding: '8px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            minHeight: '44px',
                            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'scale(1.05)'
                            e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)'
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'scale(1)'
                            e.target.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)'
                        }}
                    >
                        💾
                    </button>
                    
                    
                    {/* Case aide */}
                    <button
                        onClick={() => {
                            jouerSon("aide")
                            setShowAide(true)
                        }}
                        style={{
                            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                            color: 'white',
                            padding: '8px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            minHeight: '44px',
                            boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'scale(1.05)'
                            e.target.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)'
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'scale(1)'
                            e.target.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.3)'
                        }}
                    >
                        ?
                    </button>

                    {/* Case retour */}
                    <button
                        onClick={() => router.push('/lire/syllabes-paniers')}
                        style={{
                            background: 'linear-gradient(135deg, #6b7280, #4b5563)',
                            color: 'white',
                            padding: '8px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            minHeight: '44px',
                            boxShadow: '0 2px 8px rgba(107, 114, 128, 0.3)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'scale(1.05)'
                            e.target.style.boxShadow = '0 4px 12px rgba(107, 114, 128, 0.4)'
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'scale(1)'
                            e.target.style.boxShadow = '0 2px 8px rgba(107, 114, 128, 0.3)'
                        }}
                    >
                        ←
                    </button>
                </div>

                {/* Affichage du mot */}
                {motActuel && segmentationActuelle.length > 0 && (
                    <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                        {window.innerWidth <= 768 ? (
                            // Affichage mobile sur deux lignes
                            <div style={{ padding: '5px' }}>
                                {/* Première ligne : mot > syllabes segmentées */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: window.innerWidth <= 768 ? 'center' : 'center',
                                    gap: '4px',
                                    overflowX: 'auto',
                                    marginBottom: '5px',
                                    minHeight: '40px',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {/* Cadre du mot complet */}
                                    <div
                                        onClick={() => jouerSon(`ce mot est ${motActuel.contenu}`)}
                                        style={{
                                            padding: '4px 8px',
                                            backgroundColor: '#f0f9ff',
                                            border: '2px solid #0369a1',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            color: '#0369a1',
                                            minHeight: '28px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            flexShrink: 0,
                                            cursor: 'pointer'
                                        }}>
                                        {motActuel.contenu}
                                    </div>

                                    {/* Flèche 1 */}
                                    <div
                                        onClick={() => jouerSon(`ce mot est coupé comme ça`)}
                                        style={{
                                            padding: '4px 6px',
                                            backgroundColor: '#dcfce7',
                                            border: '2px solid #16a34a',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            color: '#16a34a',
                                            minHeight: '28px',
                                            width: '32px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            cursor: 'pointer'
                                        }}>
                                        →
                                    </div>

                                    {/* Syllabes segmentées */}
                                    {segmentationActuelle.map((syllabe, index) => (
                                        <div
                                            key={index}
                                            onClick={() => jouerSonSyllabe(syllabe, index)}
                                            style={{
                                                padding: '4px 8px',
                                                backgroundColor: index === indexSyllabeActuelle ? '#dcfce7' : '#e5e7eb',
                                                border: index === indexSyllabeActuelle ? '2px solid #16a34a' : '2px solid #9ca3af',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                color: index === indexSyllabeActuelle ? '#16a34a' : '#6b7280',
                                                minHeight: '28px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                flexShrink: 0,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {syllabe}
                                        </div>
                                    ))}
                                </div>

                                {/* Texte explicatif */}
                                <div
                                    onClick={() => jouerSon("Classe la syllabe dans un panier. Crée le panier s'il n'existe pas. On doit voir et entendre la même chose.")}
                                    style={{
                                        textAlign: 'center',
                                        fontSize: '10px',
                                        color: '#666',
                                        margin: '5px auto',
                                        padding: '4px 8px',
                                        backgroundColor: '#f8f9fa',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '4px',
                                        maxWidth: 'fit-content',
                                        whiteSpace: 'nowrap',
                                        cursor: 'pointer'
                                    }}>
                                    Classe la syllabe dans un panier
                                </div>

                                {/* Deuxième ligne : syllabe à classer centrée */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: '40px'
                                }}>
                                    {/* Syllabe à classer */}
                                    <div
                                        draggable
                                        onClick={() => jouerSonSyllabe(segmentationActuelle[indexSyllabeActuelle], indexSyllabeActuelle)}
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('text/plain', segmentationActuelle[indexSyllabeActuelle])
                                            e.dataTransfer.setData('syllabe-index', indexSyllabeActuelle.toString())
                                            e.target.style.opacity = '0.5'
                                            e.target.style.transform = 'scale(0.95)'
                                        }}
                                        onDragEnd={(e) => {
                                            e.target.style.opacity = '1'
                                            e.target.style.transform = 'scale(1)'
                                        }}
                                        style={{
                                            padding: '10px 18px',
                                            background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                                            border: '3px solid #dc2626',
                                            borderRadius: '8px',
                                            fontSize: '18px',
                                            fontWeight: 'bold',
                                            color: '#dc2626',
                                            minHeight: '40px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            cursor: 'grab',
                                            flexShrink: 0,
                                            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                                            transition: 'all 0.2s ease',
                                            textShadow: '0 1px 2px rgba(220, 38, 38, 0.2)'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.transform = 'scale(1.05)'
                                            e.target.style.boxShadow = '0 6px 16px rgba(220, 38, 38, 0.4)'
                                            e.target.style.cursor = 'grab'
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.transform = 'scale(1)'
                                            e.target.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.3)'
                                        }}
                                        onMouseDown={(e) => {
                                            e.target.style.cursor = 'grabbing'
                                            e.target.style.transform = 'scale(1.02)'
                                        }}
                                        onMouseUp={(e) => {
                                            e.target.style.cursor = 'grab'
                                            e.target.style.transform = 'scale(1.05)'
                                        }}
                                    >
                                        {segmentationActuelle[indexSyllabeActuelle]}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Affichage PC centré sur deux lignes
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                padding: '10px'
                            }}>
                                {/* Première ligne : mot > syllabes segmentées centrée */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    overflowX: 'auto',
                                    minHeight: '50px',
                                    whiteSpace: 'nowrap'
                                }}>
                                {/* Cadre du mot complet */}
                                <div
                                    onClick={() => jouerSon(`ce mot est ${motActuel.contenu}`)}
                                    style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#f0f9ff',
                                        border: '2px solid #0369a1',
                                        borderRadius: '6px',
                                        fontSize: '28px',
                                        fontWeight: 'bold',
                                        color: '#0369a1',
                                        minHeight: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        flexShrink: 0,
                                        maxWidth: '120px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        cursor: 'pointer'
                                    }}>
                                    {motActuel.contenu}
                                </div>

                                {/* Flèche 1 */}
                                <div
                                    onClick={() => jouerSon(`ce mot est coupé comme ça`)}
                                    style={{
                                        padding: '6px 8px',
                                        backgroundColor: '#dcfce7',
                                        border: '2px solid #16a34a',
                                        borderRadius: '6px',
                                        fontSize: '28px',
                                        color: '#16a34a',
                                        fontWeight: 'bold',
                                        minHeight: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        flexShrink: 0,
                                        cursor: 'pointer'
                                    }}>
                                    →
                                </div>

                                {/* Syllabes segmentées */}
                                {segmentationActuelle.map((syllabe, index) => (
                                    <div
                                        key={index}
                                        onClick={() => jouerSonSyllabe(syllabe, index)}
                                        style={{
                                            padding: '6px 10px',
                                            backgroundColor: index === indexSyllabeActuelle ? '#dcfce7' : '#e5e7eb',
                                            border: index === indexSyllabeActuelle ? '2px solid #16a34a' : '2px solid #9ca3af',
                                            borderRadius: '6px',
                                            fontSize: '28px',
                                            fontWeight: 'bold',
                                            color: index === indexSyllabeActuelle ? '#16a34a' : '#374151',
                                            minHeight: '32px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            flexShrink: 0,
                                            maxWidth: '80px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {syllabe}
                                    </div>
                                ))}

                                {/* Flèche 2 */}
                                <div style={{
                                    padding: '6px 8px',
                                    backgroundColor: '#dcfce7',
                                    border: '2px solid #16a34a',
                                    borderRadius: '6px',
                                    fontSize: '28px',
                                    color: '#16a34a',
                                    fontWeight: 'bold',
                                    minHeight: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    flexShrink: 0
                                }}>
                                    →
                                </div>

                                {/* Syllabe à classer */}
                                <div
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData('text/plain', segmentationActuelle[indexSyllabeActuelle])
                                        e.dataTransfer.setData('syllabe-index', indexSyllabeActuelle.toString())
                                    }}
                                    style={{
                                        padding: '6px 12px',
                                        backgroundColor: '#fef2f2',
                                        border: '2px solid #dc2626',
                                        borderRadius: '6px',
                                        fontSize: '28px',
                                        fontWeight: 'bold',
                                        color: '#dc2626',
                                        minHeight: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'grab',
                                        flexShrink: 0,
                                        maxWidth: '100px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}
                                >
                                    {segmentationActuelle[indexSyllabeActuelle]}
                                </div>
                                </div>

                                {/* Deuxième ligne : Texte explicatif centré */}
                                <div
                                    onClick={() => jouerSon("Classe la syllabe dans un panier. Crée le panier s'il n'existe pas. On doit voir et entendre la même chose.")}
                                    style={{
                                        textAlign: 'center',
                                        fontSize: '20px',
                                        color: '#666',
                                        margin: '5px auto',
                                        padding: '8px 16px',
                                        backgroundColor: '#f8f9fa',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '4px',
                                        maxWidth: 'fit-content',
                                        whiteSpace: 'nowrap',
                                        cursor: 'pointer'
                                    }}>
                                    Classe la syllabe dans un panier
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Cadre avec paniers */}
                <div style={{
                    marginTop: '15px'
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: window.innerWidth <= 768
                            ? 'repeat(4, 1fr)'
                            : 'repeat(6, 1fr)',
                        gap: window.innerWidth <= 768 ? '5px' : '10px',
                        gridAutoRows: '1fr'
                    }}>
                        {/* Ajouter un panier */}
                        <div
                            onClick={() => {
                                if (sonPanierActive) {
                                    jouerSon('créer un nouveau panier')
                                }
                                ajouterPanier()
                            }}
                            style={{
                                border: '2px dashed #84cc16',
                                borderRadius: '8px',
                                padding: window.innerWidth <= 768 ? '5px' : '10px',
                                aspectRatio: '1',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: window.innerWidth <= 768 ? '7px' : '10px',
                                fontWeight: 'bold',
                                background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
                                color: '#84cc16',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 4px rgba(132, 204, 22, 0.1)',
                                position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'scale(1.02)'
                                e.target.style.boxShadow = '0 4px 8px rgba(132, 204, 22, 0.2)'
                                e.target.style.borderColor = '#65a30d'
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'scale(1)'
                                e.target.style.boxShadow = '0 2px 4px rgba(132, 204, 22, 0.1)'
                                e.target.style.borderColor = '#84cc16'
                            }}
                        >
                            <div style={{ fontSize: window.innerWidth <= 768 ? '12px' : '16px' }}>
                                ➕ Ajouter un panier
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setSonPanierActive(!sonPanierActive)
                                }}
                                style={{
                                    position: 'absolute',
                                    top: '2px',
                                    right: '2px',
                                    backgroundColor: sonPanierActive ? '#3b82f6' : '#9ca3af',
                                    color: 'white',
                                    padding: '2px',
                                    border: 'none',
                                    borderRadius: '3px',
                                    fontSize: '8px',
                                    cursor: 'pointer',
                                    width: '16px',
                                    height: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {sonPanierActive ? '🔊' : '🔇'}
                            </button>
                        </div>


                        {/* Panier sons complexes */}
                        <div
                            onClick={() => jouerSon("On ne voit pas et on n'entend pas la même chose!")}
                            onDragOver={(e) => {
                                e.preventDefault()
                                if (e.currentTarget && e.currentTarget.style) {
                                    e.currentTarget.style.backgroundColor = '#fce7f3'
                                    e.currentTarget.style.transform = 'scale(1.05)'
                                    e.currentTarget.style.boxShadow = '0 6px 12px rgba(190, 24, 93, 0.3)'
                                }
                            }}
                            onDragLeave={(e) => {
                                if (e.currentTarget && e.currentTarget.style) {
                                    e.currentTarget.style.backgroundColor = '#fdf2f8'
                                    e.currentTarget.style.transform = 'scale(1)'
                                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(190, 24, 93, 0.2)'
                                }
                            }}
                            onDrop={(e) => {
                                e.preventDefault()
                                if (e.currentTarget && e.currentTarget.style) {
                                    e.currentTarget.style.backgroundColor = '#fdf2f8'
                                    e.currentTarget.style.transform = 'scale(1)'
                                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(190, 24, 93, 0.2)'
                                }
                                const syllabe = e.dataTransfer.getData('text/plain')
                                if (syllabe) {
                                    jouerSon("On ne voit pas et on n'entend pas la même chose!")
                                    classerDansSonsComplexes()
                                }
                            }}
                            style={{
                                border: '2px dashed #be185d',
                                borderRadius: '8px',
                                padding: window.innerWidth <= 768 ? '5px' : '10px',
                                aspectRatio: '1',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: window.innerWidth <= 768 ? '7px' : '10px',
                                fontWeight: 'bold',
                                background: 'linear-gradient(135deg, #fdf2f8, #fce7f3)',
                                color: '#be185d',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 6px rgba(190, 24, 93, 0.2)'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'scale(1.02)'
                                e.target.style.boxShadow = '0 4px 8px rgba(190, 24, 93, 0.3)'
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'scale(1)'
                                e.target.style.boxShadow = '0 2px 6px rgba(190, 24, 93, 0.2)'
                            }}
                        >
                            <div style={{ fontSize: window.innerWidth <= 768 ? '12px' : '16px' }}>
                                🤔 Sons complexes
                            </div>
                        </div>

                        {/* Panier à resegmenter */}
                        <div
                            onClick={() => jouerSon("ce mot est mal coupé!")}
                            onDragOver={(e) => {
                                e.preventDefault()
                                if (e.currentTarget && e.currentTarget.style) {
                                    e.currentTarget.style.backgroundColor = '#fef6e7'
                                    e.currentTarget.style.transform = 'scale(1.05)'
                                    e.currentTarget.style.boxShadow = '0 6px 12px rgba(217, 119, 6, 0.3)'
                                }
                            }}
                            onDragLeave={(e) => {
                                if (e.currentTarget && e.currentTarget.style) {
                                    e.currentTarget.style.backgroundColor = '#fef3c7'
                                    e.currentTarget.style.transform = 'scale(1)'
                                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(217, 119, 6, 0.2)'
                                }
                            }}
                            onDrop={(e) => {
                                e.preventDefault()
                                if (e.currentTarget && e.currentTarget.style) {
                                    e.currentTarget.style.backgroundColor = '#fef3c7'
                                    e.currentTarget.style.transform = 'scale(1)'
                                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(217, 119, 6, 0.2)'
                                }
                                const syllabe = e.dataTransfer.getData('text/plain')
                                if (syllabe) {
                                    jouerSon("ce mot est mal coupé!")
                                    classerDansResegmentation()
                                }
                            }}
                            style={{
                                border: '2px dashed #d97706',
                                borderRadius: '8px',
                                padding: window.innerWidth <= 768 ? '5px' : '10px',
                                aspectRatio: '1',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: window.innerWidth <= 768 ? '7px' : '10px',
                                fontWeight: 'bold',
                                background: 'linear-gradient(135deg, #fef3c7, #fef6e7)',
                                color: '#d97706',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 6px rgba(217, 119, 6, 0.2)'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'scale(1.02)'
                                e.target.style.boxShadow = '0 4px 8px rgba(217, 119, 6, 0.3)'
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'scale(1)'
                                e.target.style.boxShadow = '0 2px 6px rgba(217, 119, 6, 0.2)'
                            }}
                        >
                            <div style={{ fontSize: window.innerWidth <= 768 ? '12px' : '16px' }}>
                                ✂️ Mal coupés
                            </div>
                        </div>

                        {/* Paniers créés dynamiquement - filtrés par la lettre sélectionnée ou syllabe courante */}
                        {paniers
                            .filter(panier => {
                                if (lettreSelectionnee) {
                                    // Si une lettre est sélectionnée, montrer tous les paniers de cette lettre
                                    return panier.nom.toUpperCase().startsWith(lettreSelectionnee)
                                } else {
                                    // Sinon, comportement normal : seulement les paniers de la syllabe courante
                                    const syllabeCourante = segmentationActuelle[indexSyllabeActuelle] || ''
                                    const premiereLettreSyllabe = syllabeCourante.charAt(0).toUpperCase()
                                    return panier.nom.toUpperCase().startsWith(premiereLettreSyllabe)
                                }
                            })
                            .map(panier => (
                            <div
                                onClick={() => jouerNomPanier(panier.nom)}
                                key={panier.id}
                                onDragOver={(e) => {
                                    e.preventDefault()
                                    if (e.currentTarget && e.currentTarget.style) {
                                        e.currentTarget.style.backgroundColor = '#f0fdf4'
                                        e.currentTarget.style.transform = 'scale(1.05)'
                                        e.currentTarget.style.boxShadow = '0 6px 12px rgba(132, 204, 22, 0.3)'
                                        e.currentTarget.style.borderColor = '#65a30d'
                                    }
                                }}
                                onDragLeave={(e) => {
                                    if (e.currentTarget && e.currentTarget.style) {
                                        e.currentTarget.style.backgroundColor = '#fefce8'
                                        e.currentTarget.style.transform = 'scale(1)'
                                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(132, 204, 22, 0.2)'
                                        e.currentTarget.style.borderColor = '#84cc16'
                                    }
                                }}
                                onDrop={(e) => {
                                    e.preventDefault()
                                    if (e.currentTarget && e.currentTarget.style) {
                                        e.currentTarget.style.backgroundColor = '#fefce8'
                                        e.currentTarget.style.transform = 'scale(1)'
                                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(132, 204, 22, 0.2)'
                                        e.currentTarget.style.borderColor = '#84cc16'
                                    }
                                    const syllabe = e.dataTransfer.getData('text/plain')
                                    if (syllabe) {
                                        classerSyllabeDansPanier(panier.id)
                                        // Animation de succès après le classement
                                        if (e.currentTarget && e.currentTarget.style) {
                                            e.currentTarget.style.background = 'linear-gradient(135deg, #dcfce7, #bbf7d0)'
                                            setTimeout(() => {
                                                if (e.currentTarget && e.currentTarget.style) {
                                                    e.currentTarget.style.background = 'linear-gradient(135deg, #fefce8, #f7fee7)'
                                                }
                                            }, 300)
                                        }
                                    }
                                }}
                                style={{
                                    border: '2px dashed #84cc16',
                                    borderRadius: '8px',
                                    padding: window.innerWidth <= 768 ? '5px' : '10px',
                                    aspectRatio: '1',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: window.innerWidth <= 768 ? '6px' : '8px',
                                    fontWeight: 'bold',
                                    background: 'linear-gradient(135deg, #fefce8, #f7fee7)',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 2px 6px rgba(132, 204, 22, 0.2)'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = 'scale(1.02)'
                                    e.target.style.boxShadow = '0 4px 8px rgba(132, 204, 22, 0.3)'
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'scale(1)'
                                    e.target.style.boxShadow = '0 2px 6px rgba(132, 204, 22, 0.2)'
                                }}
                            >
                                <div style={{ marginBottom: '5px', fontSize: window.innerWidth <= 768 ? '12px' : '16px' }}>{panier.nom}</div>
                                <div style={{ fontSize: '10px', color: '#666' }}>
                                    {panier.syllabes.length} mot(s)
                                </div>
                                {/* Afficher les mots avec colorisation */}
                                <div style={{ fontSize: '9px', color: '#333', marginTop: '5px', textAlign: 'center' }}>
                                    {panier.syllabes.map((motAvecSyllabe, index) => {
                                        // Vérification de sécurité : s'assurer que c'est un objet valide
                                        if (typeof motAvecSyllabe === 'string') {
                                            return <div key={index} style={{ marginBottom: '2px' }}>{motAvecSyllabe}</div>
                                        }

                                        if (!motAvecSyllabe || typeof motAvecSyllabe !== 'object' || !motAvecSyllabe.segmentation) {
                                            return <div key={index} style={{ marginBottom: '2px' }}>Erreur données</div>
                                        }

                                        return (
                                            <div key={index} style={{ marginBottom: '2px' }}>
                                                {afficherMotAvecColorisation(motAvecSyllabe)}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}

                    </div>
                </div>

                {/* Formulaire de création de panier */}
                {showNomPanier && (
                    <div style={{
                        backgroundColor: '#f8f9fa',
                        border: '2px solid #84cc16',
                        borderRadius: '6px',
                        padding: '8px',
                        marginTop: '8px',
                        textAlign: 'center',
                        minHeight: '50px',
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}>
                        <input
                            type="text"
                            value={nomPanierSaisi}
                            onChange={(e) => setNomPanierSaisi(e.target.value)}
                            placeholder={`Ex: ${nomPanierPropose}`}
                            style={{
                                padding: '6px',
                                fontSize: '12px',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                width: '120px',
                                textAlign: 'center',
                                flex: '1'
                            }}
                            autoFocus
                        />

                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                                onClick={validerPanier}
                                style={{
                                    backgroundColor: '#84cc16',
                                    color: 'white',
                                    padding: '6px 8px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                ✓
                            </button>
                            <button
                                onClick={annulerPanier}
                                style={{
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    padding: '6px 8px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                ✗
                            </button>
                        </div>
                    </div>
                )}

                {/* 4 cadres en bas - cachés */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '15px',
                    marginTop: '30px'
                }}>
                    {/* Mots à traiter */}
                    <div style={{
                        backgroundColor: '#fef3c7',
                        border: '2px solid #f59e0b',
                        borderRadius: '8px',
                        padding: '15px',
                        minHeight: '120px'
                    }}>
                        <h3 style={{
                            color: '#f59e0b',
                            textAlign: 'center',
                            marginBottom: '10px',
                            fontSize: '16px',
                            fontWeight: 'bold'
                        }}>
                            Mots à traiter
                        </h3>
                        <div style={{
                            fontSize: '12px',
                            textAlign: 'center',
                            maxHeight: '80px',
                            overflowY: 'auto'
                        }}>
                            {motsATraiter.length > 0 ? (
                                motsATraiter.map((mot, index) => (
                                    <div key={index} style={{
                                        backgroundColor: '#f59e0b',
                                        color: 'white',
                                        padding: '2px 6px',
                                        margin: '2px',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        display: 'inline-block'
                                    }}>
                                        {mot.contenu}
                                    </div>
                                ))
                            ) : (
                                <div style={{ color: '#666', fontSize: '12px' }}>0 mots</div>
                            )}
                        </div>
                    </div>

                    {/* Mots traités */}
                    <div style={{
                        backgroundColor: '#dcfce7',
                        border: '2px solid #16a34a',
                        borderRadius: '8px',
                        padding: '15px',
                        minHeight: '120px'
                    }}>
                        <h3 style={{
                            color: '#16a34a',
                            textAlign: 'center',
                            marginBottom: '10px',
                            fontSize: '16px',
                            fontWeight: 'bold'
                        }}>
                            Mots traités
                        </h3>
                        <div style={{
                            fontSize: '12px',
                            color: '#666',
                            textAlign: 'center'
                        }}>
                            {motsTraites.length} mot(s)
                        </div>
                        {motsTraites.length > 0 && (
                            <div style={{
                                fontSize: '10px',
                                color: '#333',
                                textAlign: 'center',
                                marginTop: '5px'
                            }}>
                                {motsTraites.map(m => m.contenu).join(', ')}
                            </div>
                        )}
                    </div>

                    {/* Sons complexes */}
                    <div style={{
                        backgroundColor: '#fdf2f8',
                        border: '2px solid #be185d',
                        borderRadius: '8px',
                        padding: '15px',
                        minHeight: '120px'
                    }}>
                        <h3 style={{
                            color: '#be185d',
                            textAlign: 'center',
                            marginBottom: '10px',
                            fontSize: '16px',
                            fontWeight: 'bold'
                        }}>
                            Sons complexes
                        </h3>
                        <div style={{
                            fontSize: '12px',
                            color: '#666',
                            textAlign: 'center'
                        }}>
                            {motsEnAttenteSonsComplexes.length} mot(s)
                        </div>
                        {motsEnAttenteSonsComplexes.length > 0 && (
                            <div style={{
                                fontSize: '10px',
                                color: '#333',
                                textAlign: 'center',
                                marginTop: '5px'
                            }}>
                                {motsEnAttenteSonsComplexes.map(m => m.contenu).join(', ')}
                            </div>
                        )}
                    </div>

                    {/* Mots en attente : à resegmenter */}
                    <div style={{
                        backgroundColor: '#fef3c7',
                        border: '2px solid #d97706',
                        borderRadius: '8px',
                        padding: '15px',
                        minHeight: '120px'
                    }}>
                        <h3 style={{
                            color: '#d97706',
                            textAlign: 'center',
                            marginBottom: '10px',
                            fontSize: '16px',
                            fontWeight: 'bold'
                        }}>
                            Mots en attente : à resegmenter
                        </h3>
                        <div style={{
                            fontSize: '12px',
                            color: '#666',
                            textAlign: 'center'
                        }}>
                            {motsEnAttenteResegmentation.length} mot(s)
                        </div>
                        {motsEnAttenteResegmentation.length > 0 && (
                            <div style={{
                                fontSize: '10px',
                                color: '#333',
                                textAlign: 'center',
                                marginTop: '5px'
                            }}>
                                {motsEnAttenteResegmentation.map(m => m.contenu).join(', ')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Popup d'aide */}
                {showAide && (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px'
            }}>
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '30px',
                    maxWidth: '800px',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
                    position: 'relative'
                }}>
                    {/* Bouton fermer */}
                    <button
                        onClick={() => setShowAide(false)}
                        style={{
                            position: 'absolute',
                            top: '15px',
                            right: '15px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        ×
                    </button>

                    {/* Contenu de l'aide */}
                    <h1 style={{ color: '#84cc16', fontSize: '28px', marginBottom: '20px', textAlign: 'center' }}>
                        🎯 Guide de la Récolte de Syllabes
                    </h1>

                    <div style={{ lineHeight: '1.6', color: '#333' }}>
                        <h2 style={{ color: '#16a34a', fontSize: '22px', marginTop: '25px', marginBottom: '15px' }}>
                            🎮 Comment jouer ?
                        </h2>
                        <p style={{ marginBottom: '15px' }}>
                            <strong>Objectif :</strong> Organiser les syllabes des mots dans des paniers pour créer des collections thématiques.
                        </p>

                        <h2 style={{ color: '#16a34a', fontSize: '22px', marginTop: '25px', marginBottom: '15px' }}>
                            🔤 Interface principale
                        </h2>
                        <ul style={{ marginBottom: '15px', paddingLeft: '20px' }}>
                            <li><strong>Alphabet :</strong> Cliquez sur une lettre pour entendre son son</li>
                            <li><strong>-!? :</strong> Caractères spéciaux avec son explicatif</li>
                            <li><strong>Mot affiché :</strong> Cliquez pour entendre "ce mot est [mot]"</li>
                            <li><strong>Flèche → :</strong> Cliquez pour entendre "ce mot est coupé comme ça"</li>
                            <li><strong>Syllabes :</strong> Cliquez pour entendre la syllabe (prononciation complète)</li>
                        </ul>

                        <h2 style={{ color: '#16a34a', fontSize: '22px', marginTop: '25px', marginBottom: '15px' }}>
                            🗂️ Organisation en paniers
                        </h2>
                        <ul style={{ marginBottom: '15px', paddingLeft: '20px' }}>
                            <li><strong>➕ Ajouter un panier :</strong> Créez de nouveaux paniers pour organiser vos syllabes</li>
                            <li><strong>🔊 Bouton son :</strong> Dans le coin du panier pour activer/désactiver le son de création</li>
                            <li><strong>Glisser-déposer :</strong> Faites glisser une syllabe vers un panier</li>
                            <li><strong>Paniers existants :</strong> Cliquez pour entendre le nom du panier avec votre voix enregistrée</li>
                        </ul>

                        <h2 style={{ color: '#16a34a', fontSize: '22px', marginTop: '25px', marginBottom: '15px' }}>
                            🎯 Paniers spéciaux
                        </h2>
                        <ul style={{ marginBottom: '15px', paddingLeft: '20px' }}>
                            <li><strong>🤔 Sons complexes :</strong> "On ne voit pas et on n'entend pas la même chose!"</li>
                            <li><strong>✂️ Mal coupés :</strong> "Ce mot est mal coupé!"</li>
                        </ul>

                        <h2 style={{ color: '#16a34a', fontSize: '22px', marginTop: '25px', marginBottom: '15px' }}>
                            🔊 Fonctionnalités sonores
                        </h2>
                        <ul style={{ marginBottom: '15px', paddingLeft: '20px' }}>
                            <li><strong>Syllabes intelligentes :</strong> Prononciations corrigées (IR → "ire", pas "I-R")</li>
                            <li><strong>Voix française :</strong> Évite automatiquement la voix Hortense</li>
                            <li><strong>Sons contextuels :</strong> Chaque élément a son propre message sonore</li>
                            <li><strong>Contrôle création :</strong> Bouton 🔊/🔇 pour les nouveaux paniers</li>
                        </ul>

                        <h2 style={{ color: '#16a34a', fontSize: '22px', marginTop: '25px', marginBottom: '15px' }}>
                            📱💻 Versions Mobile/PC
                        </h2>
                        <ul style={{ marginBottom: '15px', paddingLeft: '20px' }}>
                            <li><strong>Mobile :</strong> Interface compacte sur 2 lignes</li>
                            <li><strong>PC :</strong> Interface agrandie, éléments centrés, paniers plus petits</li>
                            <li><strong>Navigation :</strong> Bouton retour en haut sur mobile uniquement</li>
                        </ul>

                        <h2 style={{ color: '#16a34a', fontSize: '22px', marginTop: '25px', marginBottom: '15px' }}>
                            💡 Conseils d'utilisation
                        </h2>
                        <ul style={{ marginBottom: '15px', paddingLeft: '20px' }}>
                            <li>Créez des paniers thématiques (animaux, couleurs, etc.)</li>
                            <li>Le nom du panier doit commencer par la même lettre que la syllabe</li>
                            <li>Utilisez les sons pour mémoriser les prononciations</li>
                            <li>Organisez progressivement pour une meilleure mémorisation</li>
                        </ul>

                        <div style={{
                            backgroundColor: '#f0f9ff',
                            border: '2px solid #84cc16',
                            borderRadius: '8px',
                            padding: '15px',
                            marginTop: '25px',
                            textAlign: 'center'
                        }}>
                            <strong style={{ color: '#16a34a' }}>🎉 Bon apprentissage ! 🎉</strong>
                        </div>
                    </div>
                </div>
            </div>
        )}

            </div>
        </div>
    )
}