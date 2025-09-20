import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function AdminDashboard() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        const token = localStorage.getItem('quiz-admin-token')
        const userData = localStorage.getItem('quiz-admin-user')

        if (!token || !userData) {
            router.push('/aclef-pedagogie-admin')
            return
        }

        try {
            setUser(JSON.parse(userData))
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/aclef-pedagogie-admin')
            return
        }

        setIsLoading(false)
    }, [router])

    const adminTools = [
        {
            title: '🔢 Validation Syllabes-Mots',
            description: 'Valider les corrections de classification mono/multisyllabique et autres',
            href: '/admin/lire/valider-corrections',
            color: '#dc2626'
        },
        {
            title: '📋 Validation Segmentation',
            description: 'Consulter les signalements d\'erreurs de syllabification envoyés par les utilisateurs',
            href: '/admin/lire/signalements-syllabification',
            color: '#f59e0b'
        },
        {
            title: '🔍 Données Apprenants',
            description: 'Visualiser les textes, groupes de sens et mots classifiés par apprenant',
            href: '/admin/lire/visualiser-donnees-apprenant',
            color: '#3b82f6'
        },
        {
            title: '📊 Vue Tabulaire Apprenant',
            description: 'Vue en tableau avec colonnes: textes, groupes de sens, mono, multi',
            href: '/admin/lire/vue-donnees-apprenant',
            color: '#059669'
        },
        {
            title: '📊 Statistiques d\'utilisation',
            description: 'Voir les statistiques d\'utilisation des exercices',
            href: '#',
            color: '#10b981',
            disabled: true
        },
        {
            title: '⚙️ Configuration système',
            description: 'Paramétrer les options globales de l\'application',
            href: '#',
            color: '#6366f1',
            disabled: true
        },
        {
            title: '👥 Gestion des utilisateurs',
            description: 'Administrer les comptes utilisateurs',
            href: '#',
            color: '#8b5cf6',
            disabled: true
        }
    ]

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
                maxWidth: '1000px',
                margin: '0 auto'
            }}>
                <h1 style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    color: '#333',
                    textAlign: 'center'
                }}>
                    ⚡ Tableau de bord administrateur
                </h1>
                
                <p style={{
                    textAlign: 'center',
                    color: '#666',
                    marginBottom: '40px',
                    fontSize: '16px'
                }}>
                    Bonjour {user.identifiant || user.email} - Gestion et supervision de l'application ACLEF
                </p>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '20px',
                    marginBottom: '40px'
                }}>
                    {adminTools.map((tool, index) => (
                        <div
                            key={index}
                            onClick={() => !tool.disabled && router.push(tool.href)}
                            style={{
                                background: 'white',
                                padding: '25px',
                                borderRadius: '12px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                cursor: tool.disabled ? 'not-allowed' : 'pointer',
                                opacity: tool.disabled ? 0.5 : 1,
                                borderLeft: `4px solid ${tool.color}`,
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                ':hover': !tool.disabled ? {
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 6px 20px rgba(0,0,0,0.15)'
                                } : {}
                            }}
                            onMouseEnter={(e) => {
                                if (!tool.disabled) {
                                    e.target.style.transform = 'translateY(-2px)'
                                    e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!tool.disabled) {
                                    e.target.style.transform = 'translateY(0)'
                                    e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                                }
                            }}
                        >
                            <h3 style={{
                                color: tool.color,
                                marginBottom: '10px',
                                fontSize: '18px',
                                fontWeight: 'bold'
                            }}>
                                {tool.title}
                                {tool.disabled && <span style={{ fontSize: '12px', marginLeft: '8px' }}>(Bientôt)</span>}
                            </h3>
                            <p style={{
                                color: '#666',
                                fontSize: '14px',
                                lineHeight: '1.5',
                                margin: 0
                            }}>
                                {tool.description}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Informations système */}
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    marginBottom: '20px'
                }}>
                    <h3 style={{ color: '#333', marginBottom: '15px' }}>ℹ️ Informations système</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                        <div>
                            <strong style={{ color: '#4b5563' }}>Version :</strong>
                            <span style={{ marginLeft: '8px', color: '#6b7280' }}>1.0.0-dev</span>
                        </div>
                        <div>
                            <strong style={{ color: '#4b5563' }}>Environnement :</strong>
                            <span style={{ marginLeft: '8px', color: '#6b7280' }}>Développement</span>
                        </div>
                        <div>
                            <strong style={{ color: '#4b5563' }}>Base de données :</strong>
                            <span style={{ marginLeft: '8px', color: '#10b981' }}>✅ Connectée</span>
                        </div>
                        <div>
                            <strong style={{ color: '#4b5563' }}>Dernière mise à jour :</strong>
                            <span style={{ marginLeft: '8px', color: '#6b7280' }}>Aujourd'hui</span>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <div style={{ 
                    textAlign: 'center',
                    display: 'flex',
                    gap: '15px',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={() => router.push('/')}
                        style={{
                            backgroundColor: '#6b7280',
                            color: 'white',
                            padding: '12px 24px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold'
                        }}
                    >
                        🏠 Retour à l'accueil
                    </button>
                    
                    <button
                        onClick={() => {
                            localStorage.removeItem('token')
                            localStorage.removeItem('user')
                            router.push('/login')
                        }}
                        style={{
                            backgroundColor: '#ef4444',
                            color: 'white',
                            padding: '12px 24px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold'
                        }}
                    >
                        🚪 Déconnexion
                    </button>
                </div>
            </div>
        </div>
    )
}