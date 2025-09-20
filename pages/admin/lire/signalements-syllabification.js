import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function SignalementsSyllabification() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [signalements, setSignalements] = useState([])
    const [dbConfigured, setDbConfigured] = useState(false)
    const [message, setMessage] = useState('')
    const [filter, setFilter] = useState('non_traite') // all, traite, non_traite
    const [searchTerm, setSearchTerm] = useState('')
    const router = useRouter()

    useEffect(() => {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')

        if (!token || !userData) {
            router.push('/login')
            return
        }

        try {
            setUser(JSON.parse(userData))
            loadSignalements()
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/login')
            return
        }

        setIsLoading(false)
    }, [router])

    const loadSignalements = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/admin/signalements-list', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                setSignalements(data.signalements || [])
                setDbConfigured(data.db_configured)
                setMessage(data.message || '')
                console.log('Signalements chargés:', data.signalements?.length || 0)
            } else {
                console.error('Erreur chargement signalements')
                setMessage('Erreur lors du chargement des signalements')
            }
        } catch (error) {
            console.error('Erreur chargement signalements:', error)
            setMessage('Erreur de connexion')
        }
    }

    const appliquerCorrection = async (signalement, typeCorrection, correction) => {
        try {
            const token = localStorage.getItem('token')
            
            const body = {
                mot: signalement.mot,
                type_correction: typeCorrection,
                signalement_id: signalement.id
            }

            if (typeCorrection === 'syllabification') {
                // Utiliser la segmentation utilisateur comme correction
                body.correction_syllabification = correction || signalement.segmentation_utilisateur
                body.commentaire = `Correction appliquée: segmentation utilisateur validée`
            }

            const response = await fetch('/api/admin/appliquer-correction', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            })

            if (response.ok) {
                const result = await response.json()
                alert(`✅ Correction appliquée avec succès !\n\nLe mot "${signalement.mot}" utilisera désormais cette segmentation pour tous les utilisateurs.`)
                
                // Recharger les signalements pour voir le changement
                loadSignalements()
            } else {
                const error = await response.json()
                alert(`❌ Erreur: ${error.error}`)
            }
        } catch (error) {
            console.error('Erreur application correction:', error)
            alert('❌ Erreur de connexion lors de l\'application de la correction')
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'Date inconnue'
        const date = new Date(dateString)
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const filteredSignalements = signalements.filter(signalement => {
        // Filtre par statut
        let statusMatch = true
        if (filter === 'traite') statusMatch = signalement.traite === true
        if (filter === 'non_traite') statusMatch = signalement.traite === false
        // filter === 'all' reste true
        
        // Filtre par recherche de mot
        const searchMatch = !searchTerm || 
            signalement.mot?.toLowerCase().includes(searchTerm.toLowerCase())
        
        return statusMatch && searchMatch
    })

    const stats = {
        total: signalements.length,
        traites: signalements.filter(s => s.traite).length,
        non_traites: signalements.filter(s => !s.traite).length
    }

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{ color: '#f59e0b', fontSize: '18px' }}>Chargement...</div>
            </div>
        )
    }

    if (!user) return null

    return (
        <div style={{
            minHeight: '100vh',
            background: '#f8f9fa',
            padding: '20px'
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                <h1 style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    color: '#333',
                    textAlign: 'center'
                }}>
                    📋 Administration - Signalements de Syllabification
                </h1>

                {/* Statut de la base de données */}
                <div style={{
                    background: dbConfigured ? '#ecfdf5' : '#fef3c7',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: `2px solid ${dbConfigured ? '#10b981' : '#f59e0b'}`
                }}>
                    <div style={{ 
                        color: dbConfigured ? '#059669' : '#d97706',
                        fontWeight: 'bold',
                        marginBottom: '5px'
                    }}>
                        {dbConfigured ? '✅ Base de données configurée' : '⚠️ Base de données non configurée'}
                    </div>
                    {message && (
                        <div style={{ color: '#666', fontSize: '14px' }}>
                            {message}
                        </div>
                    )}
                    {!dbConfigured && (
                        <div style={{ fontSize: '14px', color: '#d97706', marginTop: '5px' }}>
                            Les signalements sont visibles dans les logs du serveur. 
                            Consultez SIGNALEMENTS-README.md pour configurer la BDD.
                        </div>
                    )}
                </div>

                {/* Statistiques */}
                {signalements.length > 0 && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '15px',
                        marginBottom: '30px'
                    }}>
                        <div style={{
                            background: '#ddd6fe',
                            padding: '20px',
                            borderRadius: '8px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7c3aed' }}>
                                {stats.total}
                            </div>
                            <div style={{ color: '#6b46c1' }}>Total signalements</div>
                        </div>
                        <div style={{
                            background: '#ecfdf5',
                            padding: '20px',
                            borderRadius: '8px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
                                {stats.traites}
                            </div>
                            <div style={{ color: '#047857' }}>Traités</div>
                        </div>
                        <div style={{
                            background: '#fef2f2',
                            padding: '20px',
                            borderRadius: '8px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>
                                {stats.non_traites}
                            </div>
                            <div style={{ color: '#b91c1c' }}>En attente</div>
                        </div>
                    </div>
                )}

                {/* Filtres */}
                {signalements.length > 0 && (
                    <div style={{
                        background: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{ marginBottom: '15px', color: '#333' }}>Filtrer les signalements :</h3>
                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {/* Filtres par statut */}
                            <button
                                onClick={() => setFilter('all')}
                                style={{
                                    padding: '8px 16px',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    backgroundColor: filter === 'all' ? '#f59e0b' : '#e5e7eb',
                                    color: filter === 'all' ? 'white' : '#374151'
                                }}
                            >
                                Tous ({stats.total})
                            </button>
                            <button
                                onClick={() => setFilter('non_traite')}
                                style={{
                                    padding: '8px 16px',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    backgroundColor: filter === 'non_traite' ? '#ef4444' : '#e5e7eb',
                                    color: filter === 'non_traite' ? 'white' : '#374151'
                                }}
                            >
                                En attente ({stats.non_traites})
                            </button>
                            <button
                                onClick={() => setFilter('traite')}
                                style={{
                                    padding: '8px 16px',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    backgroundColor: filter === 'traite' ? '#10b981' : '#e5e7eb',
                                    color: filter === 'traite' ? 'white' : '#374151'
                                }}
                            >
                                Traités ({stats.traites})
                            </button>
                            
                            {/* Barre de recherche */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '20px' }}>
                                <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151' }}>
                                    🔍 Rechercher :
                                </label>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Tapez un mot..."
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px',
                                        minWidth: '200px',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Liste des signalements */}
                {filteredSignalements.length === 0 ? (
                    <div style={{
                        background: 'white',
                        padding: '40px',
                        borderRadius: '8px',
                        textAlign: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        {signalements.length === 0 ? (
                            <div>
                                <div style={{ fontSize: '24px', marginBottom: '10px' }}>📭</div>
                                <h3 style={{ color: '#666', marginBottom: '10px' }}>Aucun signalement</h3>
                                <p style={{ color: '#999', fontSize: '14px' }}>
                                    {dbConfigured 
                                        ? "Aucun signalement n'a encore été reçu."
                                        : "Les signalements sont visibles dans les logs du serveur."}
                                </p>
                            </div>
                        ) : (
                            <div>
                                <h3 style={{ color: '#666' }}>
                                    {searchTerm ? `Aucun signalement trouvé pour "${searchTerm}"` : 'Aucun signalement pour ce filtre'}
                                </h3>
                                <p style={{ color: '#999', fontSize: '14px' }}>
                                    {searchTerm 
                                        ? 'Essayez un autre terme de recherche ou changez le filtre.' 
                                        : 'Changez le filtre pour voir d\'autres signalements.'
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {filteredSignalements.map((signalement, index) => (
                            <div key={signalement.id || index} style={{
                                background: 'white',
                                padding: '20px',
                                borderRadius: '8px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                borderLeft: `4px solid ${signalement.traite ? '#10b981' : '#ef4444'}`
                            }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', alignItems: 'start' }}>
                                    {/* Info du mot */}
                                    <div>
                                        <h4 style={{ 
                                            color: '#1f2937', 
                                            marginBottom: '10px',
                                            fontSize: '18px',
                                            fontWeight: 'bold'
                                        }}>
                                            📝 "{signalement.mot}"
                                        </h4>
                                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                                            Signalé le {formatDate(signalement.date_signalement)}
                                        </div>
                                        {signalement.utilisateur && (
                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                Par : {signalement.utilisateur}
                                            </div>
                                        )}
                                    </div>

                                    {/* Segmentations */}
                                    <div>
                                        <div style={{ marginBottom: '10px' }}>
                                            <strong style={{ color: '#dc2626', fontSize: '14px' }}>
                                                Segmentation utilisateur :
                                            </strong>
                                            <div style={{ 
                                                background: '#fef2f2', 
                                                padding: '8px', 
                                                borderRadius: '4px',
                                                marginTop: '4px',
                                                fontFamily: 'monospace'
                                            }}>
                                                {Array.isArray(signalement.segmentation_utilisateur) 
                                                    ? signalement.segmentation_utilisateur.join(' - ')
                                                    : signalement.segmentation_utilisateur}
                                            </div>
                                        </div>
                                        <div>
                                            <strong style={{ color: '#059669', fontSize: '14px' }}>
                                                Segmentation système :
                                            </strong>
                                            <div style={{ 
                                                background: '#ecfdf5', 
                                                padding: '8px', 
                                                borderRadius: '4px',
                                                marginTop: '4px',
                                                fontFamily: 'monospace'
                                            }}>
                                                {Array.isArray(signalement.segmentation_systeme) 
                                                    ? signalement.segmentation_systeme.join(' - ')
                                                    : signalement.segmentation_systeme}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Statut et actions */}
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{
                                            display: 'inline-block',
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            backgroundColor: signalement.traite ? '#ecfdf5' : '#fef2f2',
                                            color: signalement.traite ? '#059669' : '#dc2626',
                                            marginBottom: '10px'
                                        }}>
                                            {signalement.traite ? '✅ Traité' : '⏳ En attente'}
                                        </div>

                                        {/* Actions pour signalements non traités */}
                                        {!signalement.traite && dbConfigured && (
                                            <div style={{ 
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                gap: '6px',
                                                marginBottom: '10px'
                                            }}>
                                                <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>
                                                    Actions :
                                                </div>
                                                
                                                {/* Valider segmentation utilisateur - Rouge → Rouge */}
                                                <button
                                                    onClick={() => {
                                                        appliquerCorrection(signalement, 'syllabification', signalement.segmentation_utilisateur)
                                                    }}
                                                    style={{
                                                        backgroundColor: '#dc2626', // Rouge comme la segmentation utilisateur
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        padding: '6px 8px',
                                                        fontSize: '10px',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold'
                                                    }}
                                                    title="Adopter la segmentation proposée par l'utilisateur"
                                                >
                                                    👤 Adopter segmentation utilisateur
                                                </button>
                                                
                                                {/* Valider segmentation système - Vert → Vert */}
                                                <button
                                                    onClick={() => {
                                                        appliquerCorrection(signalement, 'syllabification', signalement.segmentation_systeme)
                                                    }}
                                                    style={{
                                                        backgroundColor: '#059669', // Vert comme la segmentation système
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        padding: '6px 8px',
                                                        fontSize: '10px',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold'
                                                    }}
                                                    title="Confirmer que la segmentation système était correcte"
                                                >
                                                    🤖 Confirmer segmentation système
                                                </button>

                                                {/* Nouvelle segmentation personnalisée */}
                                                <button
                                                    onClick={() => {
                                                        const nouvelleSegmentation = prompt(`✏️ Entrez une NOUVELLE segmentation pour "${signalement.mot}":\n\nFormat: séparez les syllabes par des tirets\nExemple: châ-teaux ou ma-gnif-ique\n\nLaissez vide pour annuler.`)
                                                        
                                                        if (nouvelleSegmentation && nouvelleSegmentation.trim()) {
                                                            const syllabes = nouvelleSegmentation.split('-').map(s => s.trim()).filter(s => s.length > 0)
                                                            
                                                            if (syllabes.length > 0 && syllabes.join('') === signalement.mot) {
                                                                appliquerCorrection(signalement, 'syllabification', syllabes)
                                                            } else {
                                                                alert('❌ Erreur: La segmentation ne reconstitue pas le mot original.\n\nVérifiez que les syllabes correspondent exactement au mot.')
                                                            }
                                                        }
                                                    }}
                                                    style={{
                                                        backgroundColor: '#7c3aed', // Violet pour nouvelle option
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        padding: '6px 8px',
                                                        fontSize: '10px',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold'
                                                    }}
                                                    title="Définir une segmentation personnalisée différente des deux propositions"
                                                >
                                                    ✏️ Nouvelle segmentation
                                                </button>

                                                {/* Accepter les deux segmentations */}
                                                <button
                                                    onClick={() => {
                                                        const segmentationUtilisateur = Array.isArray(signalement.segmentation_utilisateur) ? signalement.segmentation_utilisateur.join(' - ') : signalement.segmentation_utilisateur
                                                        const segmentationSysteme = Array.isArray(signalement.segmentation_systeme) ? signalement.segmentation_systeme.join(' - ') : signalement.segmentation_systeme
                                                        
                                                        // Marquer comme traité en acceptant les deux
                                                        fetch('/api/admin/accepter-les-deux', {
                                                            method: 'POST',
                                                            headers: {
                                                                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                                                'Content-Type': 'application/json'
                                                            },
                                                            body: JSON.stringify({
                                                                signalement_id: signalement.id,
                                                                mot: signalement.mot,
                                                                segmentation_utilisateur: signalement.segmentation_utilisateur,
                                                                segmentation_systeme: signalement.segmentation_systeme
                                                            })
                                                        }).then(response => {
                                                            if (response.ok) {
                                                                loadSignalements()
                                                            } else {
                                                                alert('❌ Erreur lors de l\'acceptation')
                                                            }
                                                        }).catch(() => {
                                                            alert('❌ Erreur de connexion')
                                                        })
                                                    }}
                                                    style={{
                                                        backgroundColor: '#0891b2', // Bleu cyan pour "accepter les deux"
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        padding: '6px 8px',
                                                        fontSize: '10px',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold'
                                                    }}
                                                    title="Accepter que les deux segmentations sont valides"
                                                >
                                                    🤝 Accepter les deux
                                                </button>
                                            </div>
                                        )}

                                        {/* Actions pour signalements traités */}
                                        {signalement.traite && dbConfigured && (
                                            <div style={{ 
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                gap: '6px',
                                                marginBottom: '10px'
                                            }}>
                                                <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>
                                                    Modifier la décision :
                                                </div>
                                                
                                                {/* Bouton Modifier pour traités */}
                                                <button
                                                    onClick={() => {
                                                        const choix = prompt(`🔄 Modifier la décision pour "${signalement.mot}":\n\n1. Tapez "reouvrir" pour remettre en attente\n2. Tapez "utilisateur" pour adopter la segmentation utilisateur\n3. Tapez "systeme" pour confirmer la segmentation système\n4. Tapez "nouveau:" suivi de votre segmentation (ex: "nouveau:ma-gnif-ique")\n5. Tapez "accepter-deux" pour accepter les deux segmentations\n6. OU directement votre segmentation avec des tirets (ex: "ma-gnif-ique")\n\nLaissez vide pour annuler.`)
                                                        
                                                        if (!choix || !choix.trim()) return
                                                        
                                                        const action = choix.trim().toLowerCase()
                                                        
                                                        if (action === 'reouvrir') {
                                                            // Remettre en attente
                                                            fetch('/api/admin/rouvrir-signalement', {
                                                                method: 'POST',
                                                                headers: {
                                                                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                                                    'Content-Type': 'application/json'
                                                                },
                                                                body: JSON.stringify({
                                                                    signalement_id: signalement.id
                                                                })
                                                            }).then(response => {
                                                                if (response.ok) {
                                                                    alert('✅ Signalement remis en attente')
                                                                    loadSignalements()
                                                                } else {
                                                                    alert('❌ Erreur lors de la réouverture')
                                                                }
                                                            }).catch(() => {
                                                                alert('❌ Erreur de connexion')
                                                            })
                                                        } else if (action === 'utilisateur') {
                                                            appliquerCorrection(signalement, 'syllabification', signalement.segmentation_utilisateur)
                                                        } else if (action === 'systeme') {
                                                            appliquerCorrection(signalement, 'syllabification', signalement.segmentation_systeme)
                                                        } else if (action.startsWith('nouveau:')) {
                                                            const nouvelleSegmentation = action.replace('nouveau:', '').trim()
                                                            if (nouvelleSegmentation) {
                                                                const syllabes = nouvelleSegmentation.split('-').map(s => s.trim()).filter(s => s.length > 0)
                                                                
                                                                if (syllabes.length > 0 && syllabes.join('') === signalement.mot) {
                                                                    appliquerCorrection(signalement, 'syllabification', syllabes)
                                                                } else {
                                                                    alert('❌ Erreur: La segmentation ne reconstitue pas le mot original.')
                                                                }
                                                            }
                                                        } else if (action === 'accepter-deux') {
                                                            fetch('/api/admin/accepter-les-deux', {
                                                                method: 'POST',
                                                                headers: {
                                                                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                                                    'Content-Type': 'application/json'
                                                                },
                                                                body: JSON.stringify({
                                                                    signalement_id: signalement.id,
                                                                    mot: signalement.mot,
                                                                    segmentation_utilisateur: signalement.segmentation_utilisateur,
                                                                    segmentation_systeme: signalement.segmentation_systeme
                                                                })
                                                            }).then(response => {
                                                                if (response.ok) {
                                                                    loadSignalements()
                                                                } else {
                                                                    alert('❌ Erreur lors de l\'acceptation')
                                                                }
                                                            }).catch(() => {
                                                                alert('❌ Erreur de connexion')
                                                            })
                                                        } else {
                                                            // Essayer d'interpréter comme une segmentation directe
                                                            const syllabesDirectes = action.split('-').map(s => s.trim()).filter(s => s.length > 0)
                                                            
                                                            if (syllabesDirectes.length > 0 && syllabesDirectes.join('') === signalement.mot.toLowerCase()) {
                                                                // C'est une segmentation valide
                                                                console.log('Segmentation directe détectée:', syllabesDirectes)
                                                                appliquerCorrection(signalement, 'syllabification', syllabesDirectes)
                                                            } else {
                                                                alert(`❌ Action non reconnue: "${choix}"\n\nActions valides:\n• "reouvrir" - remettre en attente\n• "utilisateur" - adopter segmentation utilisateur\n• "systeme" - confirmer segmentation système\n• "nouveau:ma-gnif-ique" - nouvelle segmentation avec préfixe\n• "accepter-deux" - accepter les deux segmentations\n• "ma-gnif-ique" - segmentation directe\n\nVérifiez que les syllabes reconstituent bien le mot "${signalement.mot}".`)
                                                            }
                                                        }
                                                    }}
                                                    style={{
                                                        backgroundColor: '#f97316', // Orange pour modifier
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        padding: '6px 8px',
                                                        fontSize: '10px',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold'
                                                    }}
                                                    title="Modifier la décision prise pour ce signalement"
                                                >
                                                    ⚙️ Modifier
                                                </button>
                                            </div>
                                        )}

                                        {signalement.commentaire_admin && (
                                            <div style={{
                                                marginTop: '10px',
                                                padding: '8px',
                                                background: '#f9fafb',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                color: '#4b5563'
                                            }}>
                                                <strong>Note admin :</strong><br />
                                                {signalement.commentaire_admin}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Actions */}
                <div style={{ 
                    textAlign: 'center', 
                    marginTop: '40px',
                    display: 'flex',
                    gap: '15px',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={loadSignalements}
                        style={{
                            backgroundColor: '#f59e0b',
                            color: 'white',
                            padding: '10px 20px',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        🔄 Actualiser
                    </button>
                    
                    <button
                        onClick={() => router.push('/admin/lire')}
                        style={{
                            backgroundColor: '#6b7280',
                            color: 'white',
                            padding: '10px 20px',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        ← Retour admin
                    </button>
                </div>
            </div>
        </div>
    )
}