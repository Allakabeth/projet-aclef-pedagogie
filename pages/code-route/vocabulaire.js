import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function VocabulaireCodeRoute() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [categories, setCategories] = useState([])
    const [selectedCategorie, setSelectedCategorie] = useState(null)
    const [vocabulaire, setVocabulaire] = useState([])
    const [selectedMot, setSelectedMot] = useState(null)
    const [definitionVisible, setDefinitionVisible] = useState(false)
    const [maDefinition, setMaDefinition] = useState('')
    const [monExemple, setMonExemple] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState(null)
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
            const parsedUser = JSON.parse(userData)
            setUser(parsedUser)
            loadCategories()
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/login')
            return
        }

        setIsLoading(false)
    }, [router])

    const loadCategories = async () => {
        try {
            const response = await fetch('/api/code-route/categories')
            const data = await response.json()
            if (data.categories) {
                setCategories(data.categories)
            }
        } catch (error) {
            console.error('Erreur chargement catégories:', error)
        }
    }

    const loadVocabulaire = async (categorie) => {
        try {
            const response = await fetch(`/api/code-route/vocabulaire?categorie=${encodeURIComponent(categorie)}&apprenant_id=${user.id}`)
            const data = await response.json()
            if (data.vocabulaire) {
                setVocabulaire(data.vocabulaire)
                setSelectedCategorie(categorie)
            }
        } catch (error) {
            console.error('Erreur chargement vocabulaire:', error)
        }
    }

    const selectMot = (mot) => {
        setSelectedMot(mot)
        setDefinitionVisible(false) // Masquer la définition par défaut
        setMaDefinition(mot.ma_definition || '')
        setMonExemple(mot.mon_exemple || '')
        setMessage(null)
    }

    const revelerDefinition = () => {
        setDefinitionVisible(true)
    }

    const sauvegarderDefinition = async () => {
        if (!selectedMot || (!maDefinition.trim() && !monExemple.trim())) {
            setMessage({ type: 'error', text: 'Veuillez ajouter une définition ou un exemple' })
            return
        }

        setIsSaving(true)
        try {
            const response = await fetch('/api/code-route/sauvegarder-definition', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vocabulaire_id: selectedMot.id,
                    apprenant_id: user.id,
                    ma_definition: maDefinition.trim(),
                    mon_exemple: monExemple.trim()
                })
            })

            const data = await response.json()

            if (data.success) {
                setMessage({ type: 'success', text: '✅ Définition sauvegardée !' })
                // Recharger le vocabulaire pour voir la mise à jour
                loadVocabulaire(selectedCategorie)
                // Fermer le formulaire après 2 secondes
                setTimeout(() => {
                    setSelectedMot(null)
                    setDefinitionVisible(false)
                    setMaDefinition('')
                    setMonExemple('')
                    setMessage(null)
                }, 2000)
            } else {
                setMessage({ type: 'error', text: '❌ Erreur lors de la sauvegarde' })
            }
        } catch (error) {
            console.error('Erreur sauvegarde:', error)
            setMessage({ type: 'error', text: '❌ Erreur de connexion' })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div style={{ minHeight: '100vh', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ color: '#666', fontSize: '18px' }}>Chargement...</div>
                </div>
            </div>
        )
    }

    if (!user) {
        return null
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '20px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* En-tête */}
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                    <h1 style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 'bold', margin: '0 0 10px 0', color: '#f59e0b' }}>
                        📚 Vocabulaire Code de la Route
                    </h1>
                    <p style={{ fontSize: '16px', color: '#666', margin: 0 }}>
                        Apprenez et créez vos propres définitions
                    </p>
                </div>

                {/* Affichage des catégories ou du vocabulaire */}
                {!selectedCategorie ? (
                    // Liste des catégories
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '15px', color: '#334155' }}>
                            Choisissez une catégorie
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                            {categories.map((cat) => (
                                <button
                                    key={cat.nom}
                                    onClick={() => loadVocabulaire(cat.nom)}
                                    style={{
                                        backgroundColor: 'white',
                                        padding: '20px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s ease',
                                        textAlign: 'left'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <div style={{ fontSize: '32px', marginBottom: '10px' }}>{cat.emoji}</div>
                                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginBottom: '5px' }}>
                                        {cat.nom}
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#64748b' }}>
                                        {cat.count} mot{cat.count > 1 ? 's' : ''}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    // Vocabulaire de la catégorie sélectionnée
                    <div>
                        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <button
                                onClick={() => {
                                    setSelectedCategorie(null)
                                    setSelectedMot(null)
                                    setDefinitionVisible(false)
                                    setVocabulaire([])
                                }}
                                style={{
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                ← Retour aux catégories
                            </button>
                            <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#334155' }}>
                                {selectedCategorie}
                            </h2>
                        </div>

                        {/* Liste des mots */}
                        <div style={{ display: 'grid', gridTemplateColumns: selectedMot ? '1fr 1fr' : '1fr', gap: '20px' }}>
                            {/* Colonne de gauche : Liste des mots */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {vocabulaire.map((mot) => (
                                    <div
                                        key={mot.id}
                                        onClick={() => selectMot(mot)}
                                        style={{
                                            backgroundColor: selectedMot?.id === mot.id ? '#fef3c7' : 'white',
                                            padding: '15px',
                                            borderRadius: '10px',
                                            border: selectedMot?.id === mot.id ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseOver={(e) => {
                                            if (selectedMot?.id !== mot.id) {
                                                e.currentTarget.style.backgroundColor = '#f8fafc'
                                            }
                                        }}
                                        onMouseOut={(e) => {
                                            if (selectedMot?.id !== mot.id) {
                                                e.currentTarget.style.backgroundColor = 'white'
                                            }
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>
                                                {mot.mot}
                                            </div>
                                            {mot.ma_definition && (
                                                <div style={{ marginLeft: '10px', fontSize: '20px' }}>✅</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Colonne de droite : Formulaire de définition */}
                            {selectedMot && (
                                <div style={{ position: 'sticky', top: '20px', alignSelf: 'flex-start' }}>
                                    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)' }}>
                                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '20px' }}>
                                            {selectedMot.mot}
                                        </h3>

                                        {/* Boutons avant révélation */}
                                        {!definitionVisible && (
                                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                                <p style={{ fontSize: '16px', color: '#64748b', marginBottom: '20px' }}>
                                                    Est-ce que tu connais ce mot ?
                                                </p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    <button
                                                        onClick={revelerDefinition}
                                                        style={{
                                                            backgroundColor: '#10b981',
                                                            color: 'white',
                                                            padding: '15px',
                                                            borderRadius: '10px',
                                                            border: 'none',
                                                            fontSize: '16px',
                                                            fontWeight: 'bold',
                                                            cursor: 'pointer'
                                                        }}
                                                        onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
                                                        onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
                                                    >
                                                        ✅ Je sais
                                                    </button>
                                                    <button
                                                        onClick={revelerDefinition}
                                                        style={{
                                                            backgroundColor: '#f59e0b',
                                                            color: 'white',
                                                            padding: '15px',
                                                            borderRadius: '10px',
                                                            border: 'none',
                                                            fontSize: '16px',
                                                            fontWeight: 'bold',
                                                            cursor: 'pointer'
                                                        }}
                                                        onMouseOver={(e) => e.target.style.backgroundColor = '#d97706'}
                                                        onMouseOut={(e) => e.target.style.backgroundColor = '#f59e0b'}
                                                    >
                                                        ❓ Je ne sais pas
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Définition et formulaire (après révélation) */}
                                        {definitionVisible && (
                                            <>
                                                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                                                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>
                                                        📖 Définition simple :
                                                    </div>
                                                    <div style={{ fontSize: '14px', color: '#334155' }}>
                                                        {selectedMot.definition_simple}
                                                    </div>
                                                </div>

                                        <div style={{ marginBottom: '15px' }}>
                                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#334155', marginBottom: '8px' }}>
                                                ✏️ Ma définition (avec mes mots) :
                                            </label>
                                            <textarea
                                                value={maDefinition}
                                                onChange={(e) => setMaDefinition(e.target.value)}
                                                placeholder="Écris ce que ce mot veut dire pour toi..."
                                                style={{
                                                    width: '100%',
                                                    minHeight: '80px',
                                                    padding: '12px',
                                                    fontSize: '15px',
                                                    border: '2px solid #e2e8f0',
                                                    borderRadius: '8px',
                                                    resize: 'vertical',
                                                    fontFamily: 'inherit'
                                                }}
                                            />
                                        </div>

                                        <div style={{ marginBottom: '20px' }}>
                                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#334155', marginBottom: '8px' }}>
                                                💡 Mon exemple (situation concrète) :
                                            </label>
                                            <textarea
                                                value={monExemple}
                                                onChange={(e) => setMonExemple(e.target.value)}
                                                placeholder="Donne un exemple de situation où tu utilises ce mot..."
                                                style={{
                                                    width: '100%',
                                                    minHeight: '80px',
                                                    padding: '12px',
                                                    fontSize: '15px',
                                                    border: '2px solid #e2e8f0',
                                                    borderRadius: '8px',
                                                    resize: 'vertical',
                                                    fontFamily: 'inherit'
                                                }}
                                            />
                                        </div>

                                        {message && (
                                            <div style={{
                                                padding: '12px',
                                                borderRadius: '8px',
                                                marginBottom: '15px',
                                                backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
                                                color: message.type === 'success' ? '#065f46' : '#991b1b',
                                                fontSize: '14px',
                                                fontWeight: 'bold'
                                            }}>
                                                {message.text}
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button
                                                onClick={sauvegarderDefinition}
                                                disabled={isSaving}
                                                style={{
                                                    flex: 1,
                                                    backgroundColor: isSaving ? '#9ca3af' : '#10b981',
                                                    color: 'white',
                                                    padding: '12px',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    fontSize: '15px',
                                                    fontWeight: 'bold',
                                                    cursor: isSaving ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                {isSaving ? 'Sauvegarde...' : '💾 Sauvegarder'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedMot(null)
                                                    setDefinitionVisible(false)
                                                    setMaDefinition('')
                                                    setMonExemple('')
                                                    setMessage(null)
                                                }}
                                                style={{
                                                    backgroundColor: '#6b7280',
                                                    color: 'white',
                                                    padding: '12px 20px',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    fontSize: '15px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ✖️
                                            </button>
                                        </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Bouton Retour au menu */}
                <div style={{ marginTop: '30px', textAlign: 'center' }}>
                    <button
                        onClick={() => router.push('/code-route')}
                        style={{
                            backgroundColor: '#6b7280',
                            color: 'white',
                            padding: '12px 30px',
                            borderRadius: '25px',
                            border: 'none',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(107, 114, 128, 0.3)'
                        }}
                    >
                        ↩️ Retour au menu Code de la route
                    </button>
                </div>
            </div>
        </div>
    )
}
