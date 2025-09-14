import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function SyllabesPaniers() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [textesReferences, setTextesReferences] = useState([])
    const [textesDetails, setTextesDetails] = useState({})
    const [paniers, setPaniers] = useState({})
    const [selectedTexte, setSelectedTexte] = useState(null)
    const [motsCharges, setMotsCharges] = useState([])
    const [showMots, setShowMots] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const initPage = async () => {
            setIsLoading(true)
            console.log('🔄 Début initialisation page...')
            const paniersEtMotsTraites = await loadPaniers()
            console.log('📊 Chargement des textes et calcul des stats...')
            await loadTextesReferences(paniersEtMotsTraites)
            setIsLoading(false)
        }

        initPage()
    }, [])

    const loadTextesReferences = async (paniersEtMotsTraites) => {
        try {
            console.log('🔄 Début chargement textes références...')
            const token = localStorage.getItem('token')
            
            const response = await fetch('/api/textes/list', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                console.log('Textes reçus:', data.textes)
                setTextesReferences(data.textes || [])
                
                // Les paniers et mots traités sont déjà chargés, on peut calculer directement
                await calculerDetailsTextes(data.textes || [], paniersEtMotsTraites)
            } else {
                console.error('Erreur chargement textes - Status:', response.status)
            }
        } catch (error) {
            console.error('Erreur:', error)
        }
    }

    const calculerDetailsTextes = async (textes, paniersEtMotsTraites) => {
        console.log('📊 Calcul des détails pour', textes.length, 'textes')
        console.log('📊 Avec paniers et mots traités:', paniersEtMotsTraites)
        
        // Charger les détails de chaque texte (nombre de mots multisyllabes)
        const details = {}
        for (const texte of textes) {
            try {
                const detailResponse = await fetch('/api/mots-classifies/multisyllabes-simple', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        textesIds: [texte.id]
                    })
                })
                
                if (detailResponse.ok) {
                    const detailData = await detailResponse.json()
                    const totalMots = detailData.mots?.length || 0
                    const motsTraites = compterMotsTraitesPourTexte(detailData.mots || [], paniersEtMotsTraites.paniers, paniersEtMotsTraites.motsTraites)
                    details[texte.id] = {
                        nombreMultisyllabes: totalMots,
                        motsTraites: motsTraites
                    }
                    console.log(`Texte ${texte.id}: ${motsTraites}/${totalMots} mots traités`)
                    console.log('Mots du texte:', detailData.mots?.map(m => m.contenu))
                }
            } catch (error) {
                console.error(`Erreur détails texte ${texte.id}:`, error)
                details[texte.id] = { nombreMultisyllabes: 0, motsTraites: 0 }
            }
        }
        setTextesDetails(details)
        console.log('✅ Détails calculés pour tous les textes')
    }

    const loadPaniers = async () => {
        try {
            console.log('📂 Chargement paniers...')
            const response = await fetch('/api/paniers/charger', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            if (response.ok) {
                const data = await response.json()
                const transformedPaniers = {}
                
                if (data.paniers && Object.keys(data.paniers).length > 0) {
                    Object.keys(data.paniers).forEach(lettre => {
                        transformedPaniers[lettre] = []
                        Object.keys(data.paniers[lettre] || {}).forEach(nomPanier => {
                            transformedPaniers[lettre].push({
                                nom: nomPanier,
                                mots: data.paniers[lettre][nomPanier] || []
                            })
                        })
                    })
                    setPaniers(transformedPaniers)
                    console.log('✅ Paniers chargés:', transformedPaniers)
                }
                
                // Récupérer les mots traités de l'API
                const motsTraites = data.motsTraites || []
                console.log('✅ Mots traités chargés depuis API:', motsTraites)
                
                // Retourner les paniers ET les mots traités
                return {
                    paniers: transformedPaniers,
                    motsTraites: motsTraites
                }
            }
            return { paniers: {}, motsTraites: [] }
        } catch (error) {
            console.error('Erreur chargement paniers:', error)
            return {}
        }
    }

    const compterMotsTraitesPourTexte = (motsDuTexte, paniersCharges, motsTraitesListe) => {
        let motsTraites = 0
        
        console.log('🔍 Comptage des mots traités pour le texte...')
        console.log('📋 Mots traités disponibles:', motsTraitesListe)
        
        // Parcourir tous les mots du texte
        for (const mot of motsDuTexte) {
            // Vérifier d'abord si le mot est dans la liste des mots entièrement traités
            if (motsTraitesListe && motsTraitesListe.includes(mot.contenu)) {
                console.log(`✅ Mot "${mot.contenu}" trouvé dans la liste des mots traités`)
                motsTraites++
            }
            // Sinon, vérifier s'il est dans les paniers (ancienne méthode)
            else if (isMotDansPanierWithData(mot.contenu, paniersCharges)) {
                console.log(`✅ Mot "${mot.contenu}" trouvé dans les paniers`)
                motsTraites++
            }
            else {
                console.log(`❌ Mot "${mot.contenu}" pas encore traité`)
            }
        }
        
        console.log(`📊 Total mots traités: ${motsTraites}/${motsDuTexte.length}`)
        return motsTraites
    }

    const isMotDansPanierWithData = (motContenu, paniersData) => {
        console.log(`🔍 Recherche du mot "${motContenu}" dans les paniers (avec data)...`)
        
        for (const lettre of Object.keys(paniersData || {})) {
            for (const panier of paniersData[lettre] || []) {
                if (panier.mots && panier.mots.includes(motContenu)) {
                    console.log(`✅ Mot "${motContenu}" trouvé dans panier "${panier.nom}" de la lettre "${lettre}"`)
                    return true
                }
            }
        }
        console.log(`❌ Mot "${motContenu}" non trouvé dans les paniers`)
        return false
    }

    const isMotDansPanier = (motContenu) => {
        console.log(`🔍 Recherche du mot "${motContenu}" dans les paniers...`)
        console.log('État actuel des paniers:', paniers)
        
        for (const lettre of Object.keys(paniers)) {
            console.log(`Vérification lettre ${lettre}:`, paniers[lettre])
            for (const panier of paniers[lettre] || []) {
                console.log(`Panier "${panier.nom}": mots =`, panier.mots)
                if (panier.mots && panier.mots.includes(motContenu)) {
                    console.log(`✅ Mot "${motContenu}" trouvé dans panier "${panier.nom}" de la lettre "${lettre}"`)
                    return true
                }
            }
        }
        console.log(`❌ Mot "${motContenu}" non trouvé dans les paniers`)
        return false
    }

    const detecterMotsEnAttente = () => {
        // Vérifier s'il y a des mots dans RESEGMENTATION seulement
        // (les SONS_COMPLEXES ne comptent plus comme "en attente")
        const motsEnAttente = []
        
        if (paniers.RESEGMENTATION && Array.isArray(paniers.RESEGMENTATION)) {
            paniers.RESEGMENTATION.forEach(panier => {
                if (panier.mots && Array.isArray(panier.mots)) {
                    motsEnAttente.push(...panier.mots.filter(s => s && typeof s === 'string' && s.trim()))
                }
            })
        }
        
        // Note: Les SONS_COMPLEXES ne sont plus considérés comme "mots en attente"
        // car ils seront traités différemment par l'admin
        
        return motsEnAttente.length > 0
    }

    const selectTexte = (texteId) => {
        console.log(`🎯 Sélection du texte ${texteId}`)
        
        // Sélectionner le texte (un seul à la fois)
        if (selectedTexte === texteId) {
            setSelectedTexte(null) // Désélectionner si déjà sélectionné
        } else {
            setSelectedTexte(texteId) // Sélectionner ce texte
        }
    }

    const validerEtCommencer = async () => {
        if (!selectedTexte) {
            alert('Veuillez sélectionner un texte !')
            return
        }

        console.log(`🚀 Validation et démarrage pour le texte ${selectedTexte}...`)
        
        try {
            // Charger les mots multisyllabes pour ce texte
            console.log('🔄 Chargement des mots multisyllabes...')
            const response = await fetch('/api/mots-classifies/multisyllabes-simple', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    textesIds: [selectedTexte]
                })
            })

            if (response.ok) {
                const data = await response.json()
                console.log('✅ Mots chargés:', data.mots?.length || 0)
                
                if (!data.mots || data.mots.length === 0) {
                    alert('Aucun mot multisyllabe trouvé dans ce texte !')
                    return
                }
                
                // Rediriger directement vers l'exercice
                router.push(`/lire/recolte-syllabes?texte=${selectedTexte}`)
                
            } else {
                console.error('Erreur chargement mots')
                alert('Erreur lors du chargement des mots')
            }
        } catch (error) {
            console.error('Erreur:', error)
            alert('Erreur lors du chargement')
        }
    }

    if (isLoading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                fontSize: '24px'
            }}>
                ⏳ Chargement...
            </div>
        )
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: window.innerWidth < 768 ? 'white' : '#f8f9fa',
            padding: window.innerWidth < 768 ? '10px' : 'clamp(15px, 4vw, 20px)'
        }}>
            <div style={{
                maxWidth: '1400px',
                margin: '0 auto',
                backgroundColor: window.innerWidth < 768 ? 'transparent' : 'rgba(255, 255, 255, 0.95)',
                borderRadius: window.innerWidth < 768 ? '0' : '15px',
                padding: window.innerWidth < 768 ? '10px' : 'clamp(20px, 5vw, 30px)',
                boxShadow: window.innerWidth < 768 ? 'none' : '0 10px 30px rgba(0, 0, 0, 0.1)'
            }}>
                <h1 style={{
                    textAlign: 'center',
                    marginBottom: 'clamp(25px, 5vw, 40px)',
                    color: '#333',
                    fontSize: 'clamp(24px, 6vw, 40px)',
                    fontWeight: 'bold'
                }}>
                    Récolte des Syllabes
                </h1>

                <div style={{
                    backgroundColor: window.innerWidth < 768 ? 'transparent' : '#f8f9fa',
                    border: window.innerWidth < 768 ? 'none' : '2px solid #e9ecef',
                    borderRadius: window.innerWidth < 768 ? '0' : '12px',
                    padding: window.innerWidth < 768 ? '0' : '30px',
                    marginBottom: window.innerWidth < 768 ? '20px' : '30px'
                }}>
                    {textesReferences.length === 0 ? (
                        <div style={{ 
                            textAlign: 'center', 
                            color: '#666',
                            fontSize: '18px'
                        }}>
                            📚 Aucun texte référence disponible
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: 'clamp(15px, 3vw, 20px)'
                        }}>
                            {textesReferences
                                .filter(texte => {
                                    const details = textesDetails[texte.id]
                                    if (!details) return false
                                    // Montrer tous les textes
                                    return true
                                })
                                .map(texte => {
                                const details = textesDetails[texte.id]
                                const nombreMultisyllabes = details?.nombreMultisyllabes || 0
                                const motsTraites = details?.motsTraites || 0
                                const aDesMotsEnCours = motsTraites > 0 && motsTraites < nombreMultisyllabes
                                const recolteTerminee = motsTraites === nombreMultisyllabes && nombreMultisyllabes > 0
                                
                                return (
                                    <div
                                        key={texte.id}
                                        style={{
                                            backgroundColor: selectedTexte === texte.id ? '#e8f5e8' : 'white',
                                            border: selectedTexte === texte.id ? '3px solid #84cc16' : '2px solid #84cc16',
                                            borderRadius: '12px',
                                            padding: '20px',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            boxShadow: selectedTexte === texte.id ? '0 8px 16px rgba(132, 204, 22, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)',
                                            transform: selectedTexte === texte.id ? 'scale(1.02)' : 'scale(1)'
                                        }}
                                        onClick={() => selectTexte(texte.id)}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            marginBottom: '10px'
                                        }}>
                                            <h3 style={{
                                                margin: '0',
                                                color: '#333',
                                                fontSize: '1.2em',
                                                fontWeight: 'bold',
                                                flex: 1
                                            }}>
                                                {texte.titre}
                                            </h3>
                                        </div>
                                        
                                        <div style={{
                                            margin: '0 0 15px 0',
                                            padding: '10px',
                                            backgroundColor: recolteTerminee ? '#dcfce7' : (aDesMotsEnCours ? '#fff7ed' : '#f0f9ff'),
                                            borderRadius: '8px',
                                            border: `1px solid ${recolteTerminee ? '#16a34a' : (aDesMotsEnCours ? '#fb923c' : '#3b82f6')}`
                                        }}>
                                            <div style={{
                                                fontSize: '16px',
                                                fontWeight: 'bold',
                                                color: recolteTerminee ? '#16a34a' : (aDesMotsEnCours ? '#ea580c' : '#1d4ed8'),
                                                marginBottom: '5px'
                                            }}>
                                                {motsTraites}/{nombreMultisyllabes} mots
                                            </div>
                                            {recolteTerminee && (
                                                <div style={{
                                                    fontSize: '12px',
                                                    color: '#16a34a',
                                                    fontWeight: 'bold'
                                                }}>
                                                    ✅ Récolte terminée
                                                </div>
                                            )}
                                            {aDesMotsEnCours && (
                                                <div style={{
                                                    fontSize: '12px',
                                                    color: '#9a3412',
                                                    fontWeight: 'bold'
                                                }}>
                                                    🔄 Reprendre la récolte
                                                </div>
                                            )}
                                            {motsTraites === 0 && (
                                                <div style={{
                                                    fontSize: '12px',
                                                    color: '#1d4ed8',
                                                    fontWeight: 'bold'
                                                }}>
                                                    🧺 Commencer la récolte
                                                </div>
                                            )}
                                        </div>

                                        {/* Cadre pour mots en attente si récolte terminée */}
                                        {recolteTerminee && detecterMotsEnAttente() && (
                                            <div style={{
                                                margin: '15px 0 0 0',
                                                padding: '10px',
                                                backgroundColor: '#fef3c7',
                                                borderRadius: '8px',
                                                border: '1px solid #f59e0b'
                                            }}>
                                                <div style={{
                                                    fontSize: '14px',
                                                    fontWeight: 'bold',
                                                    color: '#f59e0b',
                                                    marginBottom: '8px',
                                                    textAlign: 'center'
                                                }}>
                                                    ⏸️ Mots en attente détectés
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        // Rediriger vers la récolte en mode "mots en attente"
                                                        localStorage.setItem('modeRecolteMotsEnAttente', 'true')
                                                        router.push(`/lire/recolte-syllabes?texte=${texte.id}`)
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        backgroundColor: '#f59e0b',
                                                        color: 'white',
                                                        padding: '8px',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    🔄 Récolter les mots en attente
                                                </button>
                                            </div>
                                        )}

                                    </div>
                                )
                            })}
                        </div>
                    )}
                    
                    {/* Bouton Valider */}
                    <div style={{ 
                        textAlign: 'center', 
                        marginTop: '30px',
                        display: 'flex',
                        gap: '15px',
                        justifyContent: 'center',
                        flexWrap: 'wrap'
                    }}>
                        <button
                            onClick={validerEtCommencer}
                            disabled={!selectedTexte}
                            style={{
                                backgroundColor: selectedTexte ? '#84cc16' : '#ccc',
                                color: 'white',
                                padding: 'clamp(12px, 3vw, 15px) clamp(20px, 5vw, 30px)',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: 'clamp(16px, 4vw, 18px)',
                                fontWeight: 'bold',
                                cursor: selectedTexte ? 'pointer' : 'not-allowed',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            🌾 Récolter
                        </button>

                        <button
                            onClick={() => router.push('/lire/voir-paniers')}
                            style={{
                                backgroundColor: '#0369a1',
                                color: 'white',
                                padding: 'clamp(12px, 3vw, 15px) clamp(20px, 5vw, 30px)',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: 'clamp(16px, 4vw, 18px)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            🗂️ Voir mes syllabes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}