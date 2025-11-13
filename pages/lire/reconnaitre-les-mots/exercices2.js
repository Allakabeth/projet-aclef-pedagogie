import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function ReconnaitreLesMotsExercices2() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isMobile, setIsMobile] = useState(false)
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
        } catch (error) {
            router.push('/login')
            return
        }

        setIsLoading(false)
    }, [router])

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }

        checkMobile()
        window.addEventListener('resize', checkMobile)

        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const exercices = [
        { id: 1, titre: 'Ma voix, mes mots', icon: '🎙️', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
        { id: 2, titre: 'Karaoké', icon: '🎤', bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
        { id: 3, titre: 'Remettre dans l\'ordre', icon: '🔀', bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
        { id: 4, titre: 'Où est-ce ?', icon: '🎯', bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
        { id: 5, titre: 'Qu\'est-ce ?', icon: '🔊', bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
        { id: 6, titre: 'Découpage', icon: '✂️', bg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
        { id: 7, titre: 'Écoute et trouve', icon: '👂', bg: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
        { id: 8, titre: 'Lis et trouve', icon: '👀', bg: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
        { id: 9, titre: 'Construis des phrases', icon: '📝', bg: 'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)' }
    ]

    if (isLoading) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Chargement...</p></div>
    }

    return (
        <div style={{ minHeight: '100vh', background: 'white', padding: '10px' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                {/* Titre */}
                <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}>
                    <span style={{ marginRight: '6px' }}>🎯</span>
                    <span style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Reconnaître les mots</span>
                </h1>

                {/* Navigation */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}>
                    <button onClick={() => router.push('/lire/reconnaitre-les-mots')} style={{ width: '40px', height: '40px', backgroundColor: 'white', color: '#64748b', border: '2px solid #64748b', borderRadius: '8px', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
                    <button onClick={() => router.push('/lire')} style={{ width: '40px', height: '40px', backgroundColor: 'white', color: '#0ea5e9', border: '2px solid #0ea5e9', borderRadius: '8px', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📖</button>
                    <button onClick={() => router.push('/dashboard')} style={{ width: '40px', height: '40px', backgroundColor: 'white', color: '#8b5cf6', border: '2px solid #8b5cf6', borderRadius: '8px', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🏠</button>
                </div>

                {/* Sous-titre */}
                <p style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', marginBottom: '15px' }}>8 groupes de sens • Choisis un exercice</p>

                {/* GRILLE 3x3 - Responsive */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '90px 90px 90px' : '200px 200px 200px',
                    gridTemplateRows: isMobile ? '90px 90px 90px' : '200px 200px 200px',
                    gap: isMobile ? '10px' : '20px',
                    justifyContent: 'center',
                    alignContent: 'center'
                }}>
                    {exercices.map((exercice) => (
                        <div
                            key={exercice.id}
                            onClick={() => {
                                if (exercice.id === 1) {
                                    router.push(`/lire/ma-voix-mes-mots-exercice?texte_ids=${router.query.textes}`)
                                } else if (exercice.id === 2) {
                                    router.push(`/lire/karaoke-exercice?texte_ids=${router.query.textes}`)
                                } else if (exercice.id === 3) {
                                    router.push(`/lire/remettre-dans-ordre-exercice?texte_ids=${router.query.textes}`)
                                } else if (exercice.id === 4) {
                                    router.push(`/lire/ou-est-ce-exercice?texte_ids=${router.query.textes}`)
                                } else if (exercice.id === 5) {
                                    router.push(`/lire/reconnaitre-les-mots/quest-ce-exercice?texte_ids=${router.query.textes}`)
                                } else if (exercice.id === 6) {
                                    router.push(`/lire/reconnaitre-les-mots/decoupage-exercice?texte_ids=${router.query.textes}`)
                                } else if (exercice.id === 7) {
                                    router.push(`/lire/ecoute-et-trouve?texte_ids=${router.query.textes}`)
                                } else if (exercice.id === 8) {
                                    router.push(`/lire/lis-et-trouve?texte_ids=${router.query.textes}`)
                                } else if (exercice.id === 9) {
                                    router.push(`/lire/reconnaitre-les-mots/construis-phrases-intro?texte_ids=${router.query.textes}`)
                                }
                            }}
                            style={{
                                background: exercice.bg,
                                borderRadius: isMobile ? '8px' : '12px',
                                padding: isMobile ? '6px' : '10px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                cursor: 'pointer'
                            }}>
                            <div style={{ fontSize: isMobile ? '32px' : '48px', marginBottom: isMobile ? '4px' : '6px' }}>{exercice.icon}</div>
                            <div style={{ color: 'white', fontWeight: 'bold', fontSize: isMobile ? '11px' : '16px', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>{exercice.titre}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
