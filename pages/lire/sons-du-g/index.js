import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

const MODULES = [
    { numero: 1, titre: "Je repère les g", sousTitre: 'Dans mes textes', icon: '🔍', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', actif: true, route: '/lire/sons-du-g/module-1-decouverte' },
    { numero: 2, titre: "Dans la phrase", sousTitre: 'Mot, image, son, ma voix', icon: '🖼️', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', actif: true, route: '/lire/sons-du-g/module-2-dans-la-phrase' },
    { numero: 3, titre: "Le même son", sousTitre: 'Je regroupe ce qui se ressemble', icon: '👂', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', actif: true, route: '/lire/sons-du-g/module-3-meme-son' },
    { numero: 4, titre: "Mes paniers de sons", sousTitre: 'Je range', icon: '🧺', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', actif: false, route: '/lire/sons-du-g/module-4-paniers' },
    { numero: 5, titre: "Où j'entends ce son ?", sousTitre: 'Je choisis le mot', icon: '🎯', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', actif: false, route: '/lire/sons-du-g/module-5-ou-est-le-son' },
    { numero: 6, titre: "Trouve le mot", sousTitre: "J'écoute et je clique", icon: '🔊', gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', actif: false, route: '/lire/sons-du-g/module-6-trouve-le-mot' },
    { numero: 7, titre: "Je lis, tu dis", sousTitre: "Quel son j'entends ?", icon: '👄', gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', actif: false, route: '/lire/sons-du-g/module-7-je-lis-tu-dis' },
    { numero: 8, titre: "Je dis, tu écris", sousTitre: "Comment ça s'écrit ?", icon: '✍️', gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', actif: false, route: '/lire/sons-du-g/module-8-je-dis-tu-ecris' },
    { numero: 9, titre: "Le jeu du g", sousTitre: 'Vite et bien', icon: '🎮', gradient: 'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)', actif: false, route: '/lire/sons-du-g/module-9-jeu' },
    { numero: 10, titre: "Je lis tout", sousTitre: 'De nouvelles phrases', icon: '📖', gradient: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', actif: false, route: '/lire/sons-du-g/module-10-phrases' },
]

export default function SonsDuGHub() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [isMobile, setIsMobile] = useState(false)
    const [hoveredModule, setHoveredModule] = useState(null)

    useEffect(() => {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')
        if (!token || !userData) {
            router.push('/login')
            return
        }
        try {
            setUser(JSON.parse(userData))
        } catch {
            router.push('/login')
        }
        setIsMobile(window.innerWidth <= 768)
        const handleResize = () => setIsMobile(window.innerWidth <= 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [router])

    if (!user) return null

    return (
        <>
            <Head>
                <title>Les Sons du G — ACLEF</title>
            </Head>
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                padding: isMobile ? '15px' : '30px',
                fontFamily: "'Andika', 'Comic Sans MS', sans-serif"
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '30px'
                }}>
                    <button
                        onClick={() => router.push('/lire')}
                        style={{
                            background: 'rgba(255,255,255,0.15)',
                            border: 'none',
                            color: 'white',
                            fontSize: '16px',
                            padding: '10px 20px',
                            borderRadius: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        ← Retour
                    </button>
                    <button
                        onClick={() => router.push('/dashboard')}
                        style={{
                            background: 'rgba(255,255,255,0.15)',
                            border: 'none',
                            color: 'white',
                            fontSize: '16px',
                            padding: '10px 20px',
                            borderRadius: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        🏠
                    </button>
                </div>

                {/* Titre */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h1 style={{
                        color: 'white',
                        fontSize: isMobile ? '28px' : '36px',
                        margin: '0 0 10px 0',
                        textShadow: '0 2px 10px rgba(0,0,0,0.3)'
                    }}>
                        Les Sons du G
                    </h1>
                    <p style={{
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: isMobile ? '16px' : '20px',
                        margin: 0,
                        fontStyle: 'italic'
                    }}>
                        Une lettre, plusieurs sons
                    </p>
                </div>

                {/* Grille des modules */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '20px',
                    maxWidth: '900px',
                    margin: '0 auto'
                }}>
                    {MODULES.map((mod) => (
                        <div
                            key={mod.numero}
                            onClick={() => {
                                if (mod.actif) {
                                    router.push(mod.route)
                                }
                            }}
                            onMouseEnter={() => setHoveredModule(mod.numero)}
                            onMouseLeave={() => setHoveredModule(null)}
                            style={{
                                background: mod.actif ? mod.gradient : 'rgba(255,255,255,0.08)',
                                borderRadius: '20px',
                                padding: '30px',
                                cursor: mod.actif ? 'pointer' : 'default',
                                opacity: mod.actif ? 1 : 0.5,
                                transform: hoveredModule === mod.numero && mod.actif ? 'translateY(-4px)' : 'none',
                                transition: 'all 0.3s ease',
                                boxShadow: hoveredModule === mod.numero && mod.actif
                                    ? '0 15px 40px rgba(0,0,0,0.4)'
                                    : '0 5px 20px rgba(0,0,0,0.2)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ fontSize: '40px', marginBottom: '12px' }}>
                                {mod.icon}
                            </div>
                            <div style={{
                                color: 'white',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                opacity: 0.8,
                                marginBottom: '4px',
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}>
                                Module {mod.numero}
                            </div>
                            <h2 style={{
                                color: 'white',
                                fontSize: isMobile ? '20px' : '22px',
                                margin: '0 0 8px 0',
                                fontWeight: 'bold'
                            }}>
                                {mod.titre}
                            </h2>
                            <p style={{
                                color: 'rgba(255,255,255,0.8)',
                                fontSize: '14px',
                                margin: 0
                            }}>
                                {mod.sousTitre}
                            </p>
                            {!mod.actif && (
                                <div style={{
                                    position: 'absolute',
                                    top: '15px',
                                    right: '15px',
                                    background: 'rgba(0,0,0,0.3)',
                                    color: 'rgba(255,255,255,0.7)',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    fontSize: '12px'
                                }}>
                                    Bientôt
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </>
    )
}
