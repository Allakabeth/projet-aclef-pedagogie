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
    }, [router])

    useEffect(() => {
        if (router.isReady) {
            chargerMots()
        }
    }, [router.isReady, router.query.texte])

    // Charger les paniers quand tous les mots sont chargés
    useEffect(() => {
        if (tousMots.length > 0) {
            chargerPaniersExistants()
        }
    }, [tousMots])

    const chargerMots = async () => {
        try {
            // Récupérer l'ID du texte depuis l'URL ou localStorage
            const texteId = router.query.texte || localStorage.getItem('texte_selectionne_id')
            if (!texteId) {
                console.log('Aucun texte sélectionné')
                return
            }
            
            console.log('Chargement des mots pour le texte:', texteId)

            const response = await fetch('/api/mots-classifies/multisyllabes-simple', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    textesIds: [texteId]
                })
            })

            if (response.ok) {
                const data = await response.json()
                setTousMots(data.mots || []) // Stocker tous les mots initiaux
                setMotsATraiter(data.mots || [])
                console.log('Mots chargés:', data.mots?.length || 0)
                
                // Charger le premier mot
                if (data.mots && data.mots.length > 0) {
                    chargerMotActuel(data.mots[0])
                }
            }
        } catch (error) {
            console.error('Erreur chargement mots:', error)
        }
    }

    const chargerMotActuel = async (mot) => {
        try {
            console.log('Segmentation du mot:', mot.contenu)
            
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
                
                console.log('Segmentation:', segmentation)
            }
        } catch (error) {
            console.error('Erreur segmentation:', error)
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
        }
    }

    const classerSyllabeDansPanier = (panierId) => {
        if (!motActuel || !segmentationActuelle.length || indexSyllabeActuelle >= segmentationActuelle.length) return
        
        const syllabeCourante = segmentationActuelle[indexSyllabeActuelle]
        
        // Ajouter la syllabe au panier
        setPaniers(paniers.map(p => 
            p.id === panierId ? 
                { ...p, syllabes: [...p.syllabes, syllabeCourante] } : 
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
            // Plus de mots à traiter
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
            const response = await fetch('/api/paniers/sauvegarder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
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
            const response = await fetch('/api/paniers/charger', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
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
                            const syllabes = data.paniers[lettre][nomPanier] || []
                            paniersChargés.push({
                                id: Date.now() + Math.random(),
                                nom: nomPanier,
                                syllabes: syllabes
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
                
                // Utiliser tousMots qui contient tous les mots initiaux
                console.log('Mots initiaux:', tousMots.length)
                console.log('Mots à enlever:', motsAEnlever)
                const motsRestants = tousMots.filter(mot => !motsAEnlever.includes(mot.contenu))
                console.log('Mots restants après filtrage:', motsRestants.length)
                setMotsATraiter(motsRestants)
                
                console.log(`SIMPLE: ${tousMots.length} mots total, on enlève ${motsAEnlever.length} mots (${motsAEnlever.join(', ')}), reste ${motsRestants.length} à traiter`)
                
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

    return (
        <div style={{ minHeight: '100vh', padding: '20px' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: '30px' }}>
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
                    <h1 style={{ textAlign: 'center', color: '#84cc16', fontSize: '24px', margin: '0' }}>
                        Récolte des Syllabes
                    </h1>
                </div>

                {/* Grille alphabet + boutons */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(6, 1fr)', 
                    gap: '10px',
                    marginBottom: '30px'
                }}>
                    {/* 26 lettres de l'alphabet */}
                    {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(lettre => {
                        // Vérifier si c'est la lettre de la syllabe courante (catégorie active)
                        const syllabeCourante = segmentationActuelle[indexSyllabeActuelle] || ''
                        const premiereLettreSyllabe = syllabeCourante.charAt(0).toUpperCase()
                        const estCategorieActive = lettre === premiereLettreSyllabe
                        
                        // Chercher un panier correspondant à cette lettre
                        const panierCorrespondant = paniers.find(p => p.nom.toUpperCase().startsWith(lettre))
                        // Compter le nombre de paniers commençant par cette lettre
                        const nbPaniersLettre = paniers.filter(p => p.nom.toUpperCase().startsWith(lettre)).length
                        
                        return (
                            <button
                                key={lettre}
                                onClick={() => panierCorrespondant && classerSyllabeDansPanier(panierCorrespondant.id)}
                                disabled={!estCategorieActive || !panierCorrespondant}
                                style={{
                                    backgroundColor: estCategorieActive ? '#84cc16' : '#e5e7eb',
                                    color: estCategorieActive ? 'white' : 'black',
                                    padding: '15px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    cursor: (estCategorieActive && panierCorrespondant) ? 'pointer' : 'not-allowed',
                                    minHeight: '50px',
                                    opacity: estCategorieActive ? 1 : 0.3,
                                    position: 'relative'
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
                                        width: '20px',
                                        height: '20px',
                                        fontSize: '12px',
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
                    
                    {/* Case -!? */}
                    <button
                        style={{
                            backgroundColor: '#ef4444',
                            color: 'white',
                            padding: '15px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            minHeight: '50px'
                        }}
                    >
                        -!?
                    </button>
                    
                    {/* Case sauvegarde */}
                    <button
                        onClick={sauvegarderPaniers}
                        style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            padding: '15px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            cursor: 'pointer',
                            minHeight: '50px'
                        }}
                    >
                        💾
                    </button>
                    
                    {/* Case aide */}
                    <button
                        style={{
                            backgroundColor: '#8b5cf6',
                            color: 'white',
                            padding: '15px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            cursor: 'pointer',
                            minHeight: '50px'
                        }}
                    >
                        ?
                    </button>
                    
                    {/* Case retour */}
                    <button
                        onClick={() => router.push('/lire/syllabes-paniers')}
                        style={{
                            backgroundColor: '#6b7280',
                            color: 'white',
                            padding: '15px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            cursor: 'pointer',
                            minHeight: '50px'
                        }}
                    >
                        ←
                    </button>
                </div>

                {/* Affichage du mot */}
                {motActuel && segmentationActuelle.length > 0 && (
                    <div style={{ textAlign: 'center', marginTop: '30px', marginBottom: '30px' }}>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            gap: '10px',
                            flexWrap: 'wrap'
                        }}>
                            {/* Cadre du mot complet */}
                            <div style={{
                                padding: '10px 15px',
                                backgroundColor: '#f0f9ff',
                                border: '2px solid #0369a1',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                color: '#0369a1',
                                minHeight: '40px',
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                {motActuel.contenu}
                            </div>
                            
                            {/* Flèche 1 */}
                            <div style={{
                                padding: '10px 15px',
                                backgroundColor: '#f3f4f6',
                                border: '2px solid #6b7280',
                                borderRadius: '8px',
                                fontSize: '16px',
                                minHeight: '40px',
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                →
                            </div>
                            
                            {/* Syllabes segmentées */}
                            {segmentationActuelle.map((syllabe, index) => (
                                <div
                                    key={index}
                                    style={{
                                        padding: '10px 15px',
                                        backgroundColor: index === indexSyllabeActuelle ? '#fef3c7' : '#e5e7eb',
                                        border: index === indexSyllabeActuelle ? '2px solid #f59e0b' : '2px solid #9ca3af',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        color: index === indexSyllabeActuelle ? '#92400e' : '#374151',
                                        minHeight: '40px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    {syllabe}
                                </div>
                            ))}
                            
                            {/* Flèche 2 */}
                            <div style={{
                                padding: '10px 15px',
                                backgroundColor: '#f3f4f6',
                                border: '2px solid #6b7280',
                                borderRadius: '8px',
                                fontSize: '16px',
                                minHeight: '40px',
                                display: 'flex',
                                alignItems: 'center'
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
                                    padding: '10px 15px',
                                    backgroundColor: '#fef2f2',
                                    border: '2px solid #dc2626',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    color: '#dc2626',
                                    minHeight: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    cursor: 'grab'
                                }}
                            >
                                {segmentationActuelle[indexSyllabeActuelle]}
                            </div>
                        </div>
                    </div>
                )}

                {/* Cadre avec paniers */}
                <div style={{ 
                    marginTop: '30px'
                }}>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(4, 1fr)', 
                        gap: '15px' 
                    }}>
                        {/* Ajouter un panier */}
                        <div 
                            onClick={ajouterPanier}
                            style={{
                                border: '2px dashed #666',
                                borderRadius: '8px',
                                padding: '15px',
                                minHeight: '60px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}
                        >
                            + Ajouter un panier
                        </div>

                        {/* Paniers créés dynamiquement - filtrés par la lettre courante */}
                        {paniers
                            .filter(panier => {
                                const syllabeCourante = segmentationActuelle[indexSyllabeActuelle] || ''
                                const premiereLettreSyllabe = syllabeCourante.charAt(0).toUpperCase()
                                return panier.nom.toUpperCase().startsWith(premiereLettreSyllabe)
                            })
                            .map(panier => (
                            <div 
                                key={panier.id}
                                onClick={() => classerSyllabeDansPanier(panier.id)}
                                onDragOver={(e) => {
                                    e.preventDefault()
                                    e.currentTarget.style.backgroundColor = '#f0fdf4'
                                }}
                                onDragLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'white'
                                }}
                                onDrop={(e) => {
                                    e.preventDefault()
                                    e.currentTarget.style.backgroundColor = 'white'
                                    const syllabe = e.dataTransfer.getData('text/plain')
                                    if (syllabe) {
                                        classerSyllabeDansPanier(panier.id)
                                    }
                                }}
                                style={{
                                    border: '2px dashed #84cc16',
                                    borderRadius: '8px',
                                    padding: '15px',
                                    minHeight: '60px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}
                            >
                                <div style={{ marginBottom: '5px' }}>{panier.nom}</div>
                                <div style={{ fontSize: '10px', color: '#666' }}>
                                    {panier.syllabes.length} syllabe(s)
                                </div>
                                {/* Afficher les syllabes */}
                                <div style={{ fontSize: '9px', color: '#333', marginTop: '5px', textAlign: 'center' }}>
                                    {panier.syllabes.join(', ')}
                                </div>
                            </div>
                        ))}

                        {/* Panier sons complexes */}
                        <div 
                            onClick={classerDansSonsComplexes}
                            onDragOver={(e) => {
                                e.preventDefault()
                                e.currentTarget.style.backgroundColor = '#fce7f3'
                            }}
                            onDragLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#fdf2f8'
                            }}
                            onDrop={(e) => {
                                e.preventDefault()
                                e.currentTarget.style.backgroundColor = '#fdf2f8'
                                const syllabe = e.dataTransfer.getData('text/plain')
                                if (syllabe) {
                                    classerDansSonsComplexes()
                                }
                            }}
                            style={{
                                border: '2px dashed #be185d',
                                borderRadius: '8px',
                                padding: '15px',
                                minHeight: '60px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                backgroundColor: '#fdf2f8',
                                color: '#be185d'
                            }}
                        >
                            Sons complexes
                        </div>

                        {/* Panier à resegmenter */}
                        <div 
                            onClick={classerDansResegmentation}
                            onDragOver={(e) => {
                                e.preventDefault()
                                e.currentTarget.style.backgroundColor = '#fef6e7'
                            }}
                            onDragLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#fef3c7'
                            }}
                            onDrop={(e) => {
                                e.preventDefault()
                                e.currentTarget.style.backgroundColor = '#fef3c7'
                                const syllabe = e.dataTransfer.getData('text/plain')
                                if (syllabe) {
                                    classerDansResegmentation()
                                }
                            }}
                            style={{
                                border: '2px dashed #d97706',
                                borderRadius: '8px',
                                padding: '15px',
                                minHeight: '60px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                backgroundColor: '#fef3c7',
                                color: '#d97706'
                            }}
                        >
                            À resegmenter
                        </div>

                        {/* Bouton poubelle */}
                        <div 
                            onClick={supprimerSyllabe}
                            onDragOver={(e) => {
                                e.preventDefault()
                                e.currentTarget.style.backgroundColor = '#f3f4f6'
                            }}
                            onDragLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'white'
                            }}
                            onDrop={(e) => {
                                e.preventDefault()
                                e.currentTarget.style.backgroundColor = 'white'
                                const syllabe = e.dataTransfer.getData('text/plain')
                                if (syllabe) {
                                    supprimerSyllabe()
                                }
                            }}
                            style={{
                                border: '2px dashed #666',
                                borderRadius: '8px',
                                padding: '15px',
                                minHeight: '60px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px'
                            }}
                        >
                            🗑️
                        </div>
                    </div>
                </div>

                {/* Formulaire de création de panier */}
                {showNomPanier && (
                    <div style={{
                        backgroundColor: '#f8f9fa',
                        border: '2px solid #84cc16',
                        borderRadius: '12px',
                        padding: '20px',
                        marginTop: '20px',
                        textAlign: 'center'
                    }}>
                        <h3 style={{
                            color: '#84cc16',
                            marginBottom: '15px',
                            fontSize: '18px',
                            fontWeight: 'bold'
                        }}>
                            Créer un nouveau panier
                        </h3>
                        
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '8px', 
                                color: '#333',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}>
                                Nom du panier :
                            </label>
                            <input
                                type="text"
                                value={nomPanierSaisi}
                                onChange={(e) => setNomPanierSaisi(e.target.value)}
                                placeholder={`Suggestion: ${nomPanierPropose}`}
                                style={{
                                    padding: '10px',
                                    fontSize: '16px',
                                    borderRadius: '6px',
                                    border: '1px solid #ccc',
                                    width: '200px',
                                    textAlign: 'center'
                                }}
                                autoFocus
                            />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button
                                onClick={validerPanier}
                                style={{
                                    backgroundColor: '#84cc16',
                                    color: 'white',
                                    padding: '10px 20px',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                ✓ Valider
                            </button>
                            <button
                                onClick={annulerPanier}
                                style={{
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    padding: '10px 20px',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                ✗ Annuler
                            </button>
                        </div>
                    </div>
                )}

                {/* 4 cadres en bas */}
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

                {/* Bouton retour en bas */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    marginTop: '30px' 
                }}>
                    <button
                        onClick={() => router.push('/lire/syllabes-paniers')}
                        style={{
                            backgroundColor: '#6b7280',
                            color: 'white',
                            padding: '15px 30px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        ← Retour aux textes
                    </button>
                </div>
            </div>
        </div>
    )
}