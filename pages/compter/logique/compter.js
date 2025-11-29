import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { nombreAleatoire, calculerScore, formaterTemps } from '../../../lib/compter/genererExercice'

// Scénarios de conservation (concept de Piaget)
const SCENARIOS_CONSERVATION = [
    {
        id: 'jetons_ligne',
        titre: 'Les jetons',
        situationInitiale: {
            description: 'Voici 2 rangées de 6 jetons parfaitement alignées',
            visuel: ['🔴🔴🔴🔴🔴🔴', '🔵🔵🔵🔵🔵🔵']
        },
        transformation: {
            description: 'On écarte les jetons bleus',
            visuel: ['🔴🔴🔴🔴🔴🔴', '🔵  🔵  🔵  🔵  🔵  🔵']
        },
        question: 'Y a-t-il toujours le même nombre de jetons dans chaque rangée ?',
        reponseCorrecte: 'pareil',
        explication: 'Oui ! Écarter les jetons ne change pas leur nombre. Il y a toujours 6 jetons dans chaque rangée.'
    },
    {
        id: 'jetons_tas',
        titre: 'Le tas de jetons',
        situationInitiale: {
            description: 'Voici 6 jetons étalés en ligne',
            visuel: ['🟡 🟡 🟡 🟡 🟡 🟡']
        },
        transformation: {
            description: 'On les regroupe en tas',
            visuel: ['🟡🟡🟡', '🟡🟡🟡']
        },
        question: 'Y a-t-il toujours le même nombre de jetons ?',
        reponseCorrecte: 'pareil',
        explication: 'Oui ! Regrouper les jetons en tas ne change pas leur nombre. Il y a toujours 6 jetons.'
    },
    {
        id: 'liquide_verre',
        titre: 'L\'eau dans les verres',
        situationInitiale: {
            description: 'Voici un verre large rempli d\'eau',
            visuel: ['🥤', '(verre large, eau à mi-hauteur)']
        },
        transformation: {
            description: 'On verse l\'eau dans un verre étroit',
            visuel: ['🥛', '(verre étroit, eau plus haute)']
        },
        question: 'Y a-t-il toujours la même quantité d\'eau ?',
        reponseCorrecte: 'pareil',
        explication: 'Oui ! L\'eau monte plus haut car le verre est plus étroit, mais c\'est toujours la même quantité d\'eau.'
    },
    {
        id: 'pizza',
        titre: 'La pizza',
        situationInitiale: {
            description: 'Voici une pizza entière',
            visuel: ['🍕', '(pizza entière)']
        },
        transformation: {
            description: 'On la coupe en 4 parts',
            visuel: ['🍕🍕', '🍕🍕']
        },
        question: 'Y a-t-il toujours autant de pizza à manger ?',
        reponseCorrecte: 'pareil',
        explication: 'Oui ! Couper la pizza ne change pas la quantité totale. C\'est toujours la même pizza, juste en morceaux.'
    },
    {
        id: 'monnaie_5euros',
        titre: 'Les billets',
        situationInitiale: {
            description: 'Marie a 2 billets de 5 euros',
            visuel: ['💵💵', '= 10€']
        },
        transformation: {
            description: 'Elle les échange contre 1 billet de 10 euros',
            visuel: ['💶', '= 10€']
        },
        question: 'A-t-elle toujours la même somme d\'argent ?',
        reponseCorrecte: 'pareil',
        explication: 'Oui ! 2 billets de 5€ = 10€ et 1 billet de 10€ = 10€. C\'est la même valeur !'
    },
    {
        id: 'monnaie_pieces',
        titre: 'Les pièces',
        situationInitiale: {
            description: 'Pierre a 10 pièces de 10 centimes',
            visuel: ['🪙🪙🪙🪙🪙', '🪙🪙🪙🪙🪙', '= 1€']
        },
        transformation: {
            description: 'Il les échange contre 1 pièce de 1 euro',
            visuel: ['🪙', '= 1€']
        },
        question: 'A-t-il toujours la même somme d\'argent ?',
        reponseCorrecte: 'pareil',
        explication: 'Oui ! 10 × 10 centimes = 1 euro. La valeur est identique, même s\'il y a moins de pièces.'
    },
    {
        id: 'bonbons',
        titre: 'Les bonbons',
        situationInitiale: {
            description: 'Léa a 8 bonbons dans un petit bol',
            visuel: ['🍬🍬🍬🍬', '🍬🍬🍬🍬']
        },
        transformation: {
            description: 'Elle les met dans un grand saladier',
            visuel: ['  🍬  🍬  🍬  🍬  ', '  🍬  🍬  🍬  🍬  ']
        },
        question: 'A-t-elle toujours le même nombre de bonbons ?',
        reponseCorrecte: 'pareil',
        explication: 'Oui ! Changer de récipient ne change pas le nombre de bonbons. Elle a toujours 8 bonbons.'
    },
    {
        id: 'pate_modeler',
        titre: 'La pâte à modeler',
        situationInitiale: {
            description: 'Voici une boule de pâte à modeler',
            visuel: ['🔵', '(boule ronde)']
        },
        transformation: {
            description: 'On l\'aplatit en galette',
            visuel: ['🔵', '(galette plate et large)']
        },
        question: 'Y a-t-il toujours autant de pâte à modeler ?',
        reponseCorrecte: 'pareil',
        explication: 'Oui ! La forme change, mais la quantité de pâte reste identique. On n\'a rien ajouté ni enlevé.'
    }
]

export default function CompterExercice() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    // État de l'exercice
    const [scenario, setScenario] = useState(null)
    const [phase, setPhase] = useState('initial') // 'initial', 'transformation', 'question', 'resultat'
    const [reponseUtilisateur, setReponseUtilisateur] = useState(null)

    // Statistiques
    const [tempsDebut, setTempsDebut] = useState(null)
    const [tempsEcoule, setTempsEcoule] = useState(0)
    const [resultat, setResultat] = useState(null)
    const [scenariosReussis, setScenariosReussis] = useState(0)
    const [scenariosTotal, setScenariosTotal] = useState(0)

    // Charger un scénario aléatoire
    const chargerScenario = useCallback(() => {
        const index = nombreAleatoire(0, SCENARIOS_CONSERVATION.length - 1)
        setScenario(SCENARIOS_CONSERVATION[index])
        setPhase('initial')
        setReponseUtilisateur(null)
    }, [])

    // Initialisation
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
            console.error('Erreur parsing user data:', error)
            router.push('/login')
            return
        }

        chargerScenario()
        setTempsDebut(Date.now())
        setIsLoading(false)
    }, [router, chargerScenario])

    // Timer
    useEffect(() => {
        if (phase !== 'resultat' && tempsDebut) {
            const interval = setInterval(() => {
                setTempsEcoule(Math.floor((Date.now() - tempsDebut) / 1000))
            }, 1000)
            return () => clearInterval(interval)
        }
    }, [phase, tempsDebut])

    // Passer à la transformation
    const voirTransformation = () => {
        setPhase('transformation')
    }

    // Passer à la question
    const poserQuestion = () => {
        setPhase('question')
    }

    // Répondre à la question
    const repondre = (reponse) => {
        setReponseUtilisateur(reponse)
        setScenariosTotal(prev => prev + 1)

        const estCorrect = reponse === scenario.reponseCorrecte

        if (estCorrect) {
            setScenariosReussis(prev => prev + 1)
        }

        setResultat({
            reussi: estCorrect,
            explication: scenario.explication
        })
        setPhase('resultat')

        // Sauvegarder
        sauvegarderProgression(estCorrect)
    }

    // Sauvegarder la progression
    const sauvegarderProgression = async (reussi) => {
        try {
            const token = localStorage.getItem('token')
            await fetch('/api/compter/progression', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    activite: 'compter',
                    contexte_code: scenario.id,
                    reussi,
                    score: reussi ? 100 : 0,
                    temps_secondes: tempsEcoule,
                    nb_erreurs: reussi ? 0 : 1,
                    nb_tentatives: 1
                })
            })
        } catch (error) {
            console.error('Erreur sauvegarde progression:', error)
        }
    }

    // Recommencer avec un nouveau scénario
    const nouveauScenario = () => {
        setResultat(null)
        setTempsDebut(Date.now())
        chargerScenario()
    }

    if (isLoading || !scenario) {
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

    return (
        <div style={{
            minHeight: '100vh',
            background: 'white',
            padding: '15px'
        }}>
            <div style={{
                maxWidth: '600px',
                margin: '0 auto'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                }}>
                    <button
                        onClick={() => router.push('/compter')}
                        style={{
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            padding: '10px 20px',
                            borderRadius: '10px',
                            border: 'none',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        ← Retour
                    </button>

                    <h1 style={{
                        fontSize: 'clamp(18px, 5vw, 24px)',
                        fontWeight: 'bold',
                        color: '#f59e0b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        🔢 COMPTER
                    </h1>

                    <div style={{
                        backgroundColor: '#fef3c7',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#92400e'
                    }}>
                        {scenariosReussis}/{scenariosTotal}
                    </div>
                </div>

                {/* Titre du scénario */}
                <div style={{
                    backgroundColor: '#fef3c7',
                    padding: '12px 15px',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    textAlign: 'center'
                }}>
                    <h2 style={{
                        fontSize: 'clamp(16px, 4vw, 20px)',
                        color: '#92400e',
                        fontWeight: '600',
                        margin: 0
                    }}>
                        {scenario.titre}
                    </h2>
                </div>

                {/* Phase : Situation initiale */}
                {phase === 'initial' && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            backgroundColor: '#f8fafc',
                            borderRadius: '15px',
                            padding: '25px 20px',
                            marginBottom: '25px'
                        }}>
                            <p style={{
                                fontSize: 'clamp(16px, 4vw, 18px)',
                                color: '#374151',
                                marginBottom: '20px',
                                lineHeight: '1.6'
                            }}>
                                {scenario.situationInitiale.description}
                            </p>

                            <div style={{
                                fontSize: 'clamp(24px, 6vw, 36px)',
                                padding: '20px',
                                backgroundColor: 'white',
                                borderRadius: '12px',
                                border: '2px solid #e5e7eb'
                            }}>
                                {scenario.situationInitiale.visuel.map((ligne, i) => (
                                    <div key={i} style={{ marginBottom: '5px' }}>{ligne}</div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={voirTransformation}
                            style={{
                                backgroundColor: '#f59e0b',
                                color: 'white',
                                padding: '18px 40px',
                                borderRadius: '15px',
                                border: 'none',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                margin: '0 auto'
                            }}
                        >
                            Continuer →
                        </button>

                    </div>
                )}

                {/* Phase : Transformation */}
                {phase === 'transformation' && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            backgroundColor: '#fef9c3',
                            borderRadius: '15px',
                            padding: '25px 20px',
                            marginBottom: '25px'
                        }}>
                            <p style={{
                                fontSize: 'clamp(16px, 4vw, 18px)',
                                color: '#713f12',
                                marginBottom: '20px',
                                lineHeight: '1.6',
                                fontWeight: '500'
                            }}>
                                ⚡ {scenario.transformation.description}
                            </p>

                            <div style={{
                                fontSize: 'clamp(24px, 6vw, 36px)',
                                padding: '20px',
                                backgroundColor: 'white',
                                borderRadius: '12px',
                                border: '2px solid #fbbf24'
                            }}>
                                {scenario.transformation.visuel.map((ligne, i) => (
                                    <div key={i} style={{ marginBottom: '5px' }}>{ligne}</div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={poserQuestion}
                            style={{
                                backgroundColor: '#f59e0b',
                                color: 'white',
                                padding: '18px 40px',
                                borderRadius: '15px',
                                border: 'none',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                margin: '0 auto'
                            }}
                        >
                            Répondre à la question →
                        </button>

                    </div>
                )}

                {/* Phase : Question */}
                {phase === 'question' && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            backgroundColor: '#dbeafe',
                            borderRadius: '15px',
                            padding: '25px 20px',
                            marginBottom: '25px'
                        }}>
                            <p style={{
                                fontSize: 'clamp(18px, 4vw, 22px)',
                                color: '#1e40af',
                                fontWeight: '600',
                                lineHeight: '1.5'
                            }}>
                                ❓ {scenario.question}
                            </p>
                        </div>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            maxWidth: '400px',
                            margin: '0 auto'
                        }}>
                            <button
                                onClick={() => repondre('plus')}
                                style={{
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    padding: '18px',
                                    borderRadius: '15px',
                                    border: 'none',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
                                }}
                            >
                                ➕ Plus / Oui, plus
                            </button>

                            <button
                                onClick={() => repondre('moins')}
                                style={{
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    padding: '18px',
                                    borderRadius: '15px',
                                    border: 'none',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                                }}
                            >
                                ➖ Moins / Non, moins
                            </button>

                            <button
                                onClick={() => repondre('pareil')}
                                style={{
                                    backgroundColor: '#22c55e',
                                    color: 'white',
                                    padding: '18px',
                                    borderRadius: '15px',
                                    border: 'none',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)'
                                }}
                            >
                                ⚖️ Pareil / Oui, autant
                            </button>
                        </div>

                    </div>
                )}

                {/* Phase : Résultat */}
                {phase === 'resultat' && resultat && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '80px', marginBottom: '20px' }}>
                            {resultat.reussi ? '🎉' : '💡'}
                        </div>

                        <h2 style={{
                            fontSize: 'clamp(24px, 6vw, 32px)',
                            color: resultat.reussi ? '#22c55e' : '#f59e0b',
                            marginBottom: '15px'
                        }}>
                            {resultat.reussi ? 'BRAVO !' : 'Pas tout à fait...'}
                        </h2>

                        <div style={{
                            backgroundColor: resultat.reussi ? '#dcfce7' : '#fef3c7',
                            borderRadius: '15px',
                            padding: '20px',
                            marginBottom: '25px'
                        }}>
                            <p style={{
                                fontSize: 'clamp(16px, 4vw, 18px)',
                                color: resultat.reussi ? '#166534' : '#92400e',
                                lineHeight: '1.6'
                            }}>
                                {resultat.explication}
                            </p>
                        </div>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            <button
                                onClick={nouveauScenario}
                                style={{
                                    backgroundColor: '#f59e0b',
                                    color: 'white',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px'
                                }}
                            >
                                🔄 Autre question
                            </button>

                            <button
                                onClick={() => router.push('/compter')}
                                style={{
                                    backgroundColor: '#f3f4f6',
                                    color: '#374151',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px'
                                }}
                            >
                                🏠 Retour au menu
                            </button>
                        </div>

                        {/* Score global */}
                        <div style={{
                            marginTop: '25px',
                            padding: '15px',
                            backgroundColor: '#f8fafc',
                            borderRadius: '10px'
                        }}>
                            <p style={{ fontSize: '14px', color: '#6b7280' }}>
                                Score de la session : <strong>{scenariosReussis}/{scenariosTotal}</strong>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
