import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

/**
 * Page de visualisation des profils de référence et leurs étapes de parcours
 * Affiche les profils FLE, Illettrisme, Lecture, Écriture, Maths, Bureautique, Internet
 */
export default function ProfilsReference() {
    const router = useRouter()
    const [profils, setProfils] = useState([])
    const [loading, setLoading] = useState(true)
    const [filterType, setFilterType] = useState('tous')
    const [selectedProfil, setSelectedProfil] = useState(null)
    const [etapes, setEtapes] = useState([])
    const [loadingEtapes, setLoadingEtapes] = useState(false)

    // Types de publics disponibles
    const typesPublic = [
        { value: 'tous', label: 'Tous les profils' },
        { value: 'FLE', label: 'FLE (A1-A3)' },
        { value: 'Illettrisme', label: 'Illettrisme (B1-BA)' },
        { value: 'Lecture', label: 'Lecture (GD-LPS)' },
        { value: 'Ecriture', label: 'Écriture (GD-LPS)' },
        { value: 'Maths', label: 'Mathématiques (M0-M4)' },
        { value: 'Bureautique', label: 'Bureautique (N0-N2B)' },
        { value: 'Internet', label: 'Internet (I0-I3)' }
    ]

    useEffect(() => {
        loadProfils()
    }, [filterType])

    async function loadProfils() {
        try {
            setLoading(true)
            const token = localStorage.getItem('quiz-admin-token')
            if (!token) {
                router.push('/admin/login')
                return
            }

            let url = '/api/admin/formation/profils'
            if (filterType !== 'tous') {
                url += `?type_public=${encodeURIComponent(filterType)}`
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            const data = await response.json()
            setProfils(data.profils || [])
        } catch (err) {
            console.error('Erreur:', err)
        } finally {
            setLoading(false)
        }
    }

    async function loadEtapes(profilId) {
        try {
            setLoadingEtapes(true)
            const token = localStorage.getItem('quiz-admin-token')

            const response = await fetch(`/api/admin/formation/etapes?profil_id=${profilId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            const data = await response.json()
            setEtapes(data.etapes || [])
        } catch (err) {
            console.error('Erreur:', err)
            setEtapes([])
        } finally {
            setLoadingEtapes(false)
        }
    }

    function handleSelectProfil(profil) {
        setSelectedProfil(profil)
        loadEtapes(profil.id)
    }

    function handleCloseModal() {
        setSelectedProfil(null)
        setEtapes([])
    }

    // Grouper les profils par type
    const profilsGroupes = profils.reduce((acc, profil) => {
        const type = profil.type_public
        if (!acc[type]) acc[type] = []
        acc[type].push(profil)
        return acc
    }, {})

    if (loading) return <div style={styles.container}><p>Chargement...</p></div>

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>👥 Profils de Référence</h1>
                    <p style={styles.subtitle}>{profils.length} profil(s) - Cliquez sur un profil pour voir ses étapes</p>
                </div>
                <div style={styles.headerActions}>
                    <button onClick={() => router.push('/admin/formation/referentiel')} style={styles.backButton}>
                        ← Retour
                    </button>
                </div>
            </div>

            {/* Filtres */}
            <div style={styles.filters}>
                <label style={styles.filterLabel}>Filtrer par type :</label>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    style={styles.select}
                >
                    {typesPublic.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>
            </div>

            {/* Liste des profils groupés */}
            {Object.keys(profilsGroupes).length === 0 ? (
                <div style={styles.empty}>
                    <p>Aucun profil trouvé</p>
                </div>
            ) : (
                Object.entries(profilsGroupes).map(([type, profilsType]) => (
                    <div key={type} style={styles.groupe}>
                        <h2 style={styles.groupeTitle}>
                            {getTypeEmoji(type)} {type}
                            <span style={styles.groupeCount}>{profilsType.length} profil(s)</span>
                        </h2>
                        <div style={styles.profilsGrid}>
                            {profilsType.map(profil => (
                                <div
                                    key={profil.id}
                                    style={{
                                        ...styles.profilCard,
                                        borderLeftColor: profil.couleur || '#666'
                                    }}
                                    onClick={() => handleSelectProfil(profil)}
                                >
                                    <div style={styles.profilHeader}>
                                        <span style={{
                                            ...styles.profilCode,
                                            backgroundColor: profil.couleur || '#666'
                                        }}>
                                            {profil.code}
                                        </span>
                                        <span style={styles.profilDegre}>
                                            Degré {profil.degre_anlci || '?'}
                                        </span>
                                    </div>
                                    <h3 style={styles.profilNom}>{profil.nom}</h3>
                                    {profil.description && (
                                        <p style={styles.profilDesc}>{profil.description}</p>
                                    )}
                                    <div style={styles.profilFooter}>
                                        <span style={styles.viewEtapes}>Voir les étapes →</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}

            {/* Modal détail profil + étapes */}
            {selectedProfil && (
                <div style={styles.modal} onClick={handleCloseModal}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <div>
                                <span style={{
                                    ...styles.modalCode,
                                    backgroundColor: selectedProfil.couleur || '#666'
                                }}>
                                    {selectedProfil.code}
                                </span>
                                <h2 style={styles.modalTitle}>{selectedProfil.nom}</h2>
                                <p style={styles.modalType}>
                                    {selectedProfil.type_public} • Degré ANLCI {selectedProfil.degre_anlci || 'Non défini'}
                                </p>
                            </div>
                            <button onClick={handleCloseModal} style={styles.closeButton}>✕</button>
                        </div>

                        {selectedProfil.description && (
                            <div style={styles.section}>
                                <h4 style={styles.sectionTitle}>Description</h4>
                                <p style={styles.sectionText}>{selectedProfil.description}</p>
                            </div>
                        )}

                        {selectedProfil.caracteristiques && (
                            <div style={styles.section}>
                                <h4 style={styles.sectionTitle}>Caractéristiques</h4>
                                <p style={styles.sectionText}>{selectedProfil.caracteristiques}</p>
                            </div>
                        )}

                        {selectedProfil.besoins_formation && (
                            <div style={styles.section}>
                                <h4 style={styles.sectionTitle}>Besoins de formation</h4>
                                <p style={styles.sectionText}>{selectedProfil.besoins_formation}</p>
                            </div>
                        )}

                        <div style={styles.section}>
                            <h4 style={styles.sectionTitle}>📍 Étapes de parcours</h4>
                            {loadingEtapes ? (
                                <p>Chargement des étapes...</p>
                            ) : etapes.length === 0 ? (
                                <p style={styles.noEtapes}>Aucune étape définie pour ce profil</p>
                            ) : (
                                <div style={styles.etapesList}>
                                    {etapes.map((etape, index) => (
                                        <div key={etape.id} style={styles.etapeCard}>
                                            <div style={styles.etapeHeader}>
                                                <span style={styles.etapeNumero}>{etape.nom || `Étape ${etape.numero}`}</span>
                                                <span style={styles.etapeDuree}>
                                                    {etape.duree_min && etape.duree_max
                                                        ? `${etape.duree_min}-${etape.duree_max}h`
                                                        : 'Durée non définie'}
                                                </span>
                                            </div>
                                            {etape.objectifs_lecture && (
                                                <div style={styles.etapeObjectif}>
                                                    <strong>📖 Lecture :</strong> {etape.objectifs_lecture}
                                                </div>
                                            )}
                                            {etape.objectifs_ecriture && (
                                                <div style={styles.etapeObjectif}>
                                                    <strong>✍️ Écriture :</strong> {etape.objectifs_ecriture}
                                                </div>
                                            )}
                                            {etape.indicateurs_reussite && (
                                                <div style={styles.etapeIndicateur}>
                                                    <strong>✅ Indicateurs :</strong> {etape.indicateurs_reussite}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function getTypeEmoji(type) {
    const emojis = {
        'FLE': '🌍',
        'Illettrisme': '📝',
        'Lecture': '📖',
        'Ecriture': '✍️',
        'Maths': '🔢',
        'Bureautique': '💻',
        'Internet': '🌐'
    }
    return emojis[type] || '📁'
}

const styles = {
    container: { padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Arial' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#333', margin: '0 0 4px 0' },
    subtitle: { fontSize: '14px', color: '#666', margin: 0 },
    headerActions: { display: 'flex', gap: '12px' },
    backButton: { padding: '10px 20px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    filters: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '8px' },
    filterLabel: { fontWeight: '600', fontSize: '14px' },
    select: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', minWidth: '200px' },
    empty: { textAlign: 'center', padding: '60px 20px', backgroundColor: '#f9f9f9', borderRadius: '8px' },
    groupe: { marginBottom: '32px' },
    groupeTitle: { fontSize: '20px', fontWeight: '600', color: '#333', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' },
    groupeCount: { fontSize: '14px', color: '#999', fontWeight: 'normal', backgroundColor: '#f0f0f0', padding: '4px 10px', borderRadius: '12px' },
    profilsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' },
    profilCard: {
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderLeft: '4px solid #666',
        borderRadius: '8px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s, transform 0.2s',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    },
    profilHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
    profilCode: { color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '14px', fontWeight: '700' },
    profilDegre: { fontSize: '12px', color: '#999', backgroundColor: '#f5f5f5', padding: '4px 8px', borderRadius: '4px' },
    profilNom: { fontSize: '16px', fontWeight: '600', color: '#333', margin: '8px 0' },
    profilDesc: { fontSize: '13px', color: '#666', lineHeight: '1.4', margin: '0 0 12px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
    profilFooter: { paddingTop: '12px', borderTop: '1px solid #f0f0f0' },
    viewEtapes: { fontSize: '13px', color: '#2196f3', fontWeight: '500' },
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
    modalContent: { backgroundColor: '#fff', borderRadius: '12px', padding: '0', maxWidth: '700px', width: '100%', maxHeight: '85vh', overflowY: 'auto' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px', borderBottom: '1px solid #eee', position: 'sticky', top: 0, backgroundColor: '#fff', borderRadius: '12px 12px 0 0' },
    modalCode: { color: '#fff', padding: '6px 14px', borderRadius: '6px', fontSize: '18px', fontWeight: '700', display: 'inline-block', marginBottom: '8px' },
    modalTitle: { fontSize: '22px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#333' },
    modalType: { fontSize: '14px', color: '#666', margin: 0 },
    closeButton: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#999', padding: '0', lineHeight: 1 },
    section: { padding: '20px 24px', borderBottom: '1px solid #f0f0f0' },
    sectionTitle: { fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' },
    sectionText: { fontSize: '14px', color: '#555', lineHeight: '1.6', margin: 0 },
    noEtapes: { color: '#999', fontStyle: 'italic' },
    etapesList: { display: 'flex', flexDirection: 'column', gap: '12px' },
    etapeCard: { backgroundColor: '#f9f9f9', borderRadius: '8px', padding: '16px', border: '1px solid #eee' },
    etapeHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
    etapeNumero: { fontSize: '16px', fontWeight: '600', color: '#333' },
    etapeDuree: { fontSize: '13px', color: '#fff', backgroundColor: '#2196f3', padding: '4px 10px', borderRadius: '12px' },
    etapeObjectif: { fontSize: '13px', color: '#555', lineHeight: '1.5', marginBottom: '6px' },
    etapeIndicateur: { fontSize: '12px', color: '#4caf50', marginTop: '8px', padding: '8px', backgroundColor: '#e8f5e9', borderRadius: '4px' }
}
