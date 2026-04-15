import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '@/lib/supabaseClient'
import VoiceRecorder from '@/components/VoiceRecorder'

// Panorama complet des sons du G, groupés par famille phonétique
const FAMILLES = [
    {
        nom: 'Son [g] — g dur',
        couleur: '#43e97b',
        icon: '🟢',
        syllabes: [
            { cle: 'ga',  libelle: 'ga',  indice: 'comme dans gâteau, gamelle, gare', essentiel: true },
            { cle: 'go',  libelle: 'go',  indice: 'comme dans gorille, escargot',     essentiel: true },
            { cle: 'gu',  libelle: 'gu',  indice: 'comme dans légume, figure',        essentiel: true },
            { cle: 'gue', libelle: 'gue', indice: 'comme dans guêpe (son [g])',       essentiel: true },
            { cle: 'gui', libelle: 'gui', indice: 'comme dans guitare (son [g])',     essentiel: true },
        ]
    },
    {
        nom: 'Son [ʒ] — g doux',
        couleur: '#667eea',
        icon: '🔵',
        syllabes: [
            { cle: 'ge', libelle: 'ge', indice: 'comme dans mange, orange, plage', essentiel: true },
            { cle: 'gi', libelle: 'gi', indice: 'comme dans girafe, gilet, magicien', essentiel: true },
        ]
    },
    {
        nom: 'Son [ɲ] — gn',
        couleur: '#a855f7',
        icon: '🟣',
        syllabes: [
            { cle: 'gna', libelle: 'gna', indice: 'comme dans agneau',               essentiel: true },
            { cle: 'gne', libelle: 'gne', indice: 'comme dans montagne, vigne',      essentiel: true },
            { cle: 'gno', libelle: 'gno', indice: 'comme dans champignon, oignon',   essentiel: true },
            { cle: 'gni', libelle: 'gni', indice: 'rare — stagner',                  essentiel: false },
            { cle: 'gnu', libelle: 'gnu', indice: 'rare — gnou',                     essentiel: false },
        ]
    },
    {
        nom: 'Son [gl]',
        couleur: '#f59e0b',
        icon: '🟠',
        syllabes: [
            { cle: 'gla',  libelle: 'gla',  indice: 'comme dans glace',          essentiel: true },
            { cle: 'gle',  libelle: 'gle',  indice: 'comme dans règle, aigle',   essentiel: true },
            { cle: 'gli',  libelle: 'gli',  indice: 'comme dans glisse',         essentiel: true },
            { cle: 'glo',  libelle: 'glo',  indice: 'comme dans globe',          essentiel: true },
            { cle: 'glu',  libelle: 'glu',  indice: 'comme dans glu',            essentiel: true },
            { cle: 'gloo', libelle: 'gloo', indice: 'pour igloo (optionnel)',    essentiel: false },
        ]
    },
    {
        nom: 'Son [gr]',
        couleur: '#ef4444',
        icon: '🔴',
        syllabes: [
            { cle: 'gra', libelle: 'gra', indice: 'comme dans grand, agrafe',    essentiel: true },
            { cle: 'gre', libelle: 'gre', indice: 'comme dans grenouille, tigre',essentiel: true },
            { cle: 'gri', libelle: 'gri', indice: 'comme dans gris, grimpe',     essentiel: true },
            { cle: 'gro', libelle: 'gro', indice: 'comme dans gros',             essentiel: true },
            { cle: 'gru', libelle: 'gru', indice: 'comme dans gruyère',          essentiel: true },
        ]
    },
    {
        nom: 'Exceptions',
        couleur: '#6b7280',
        icon: '⚪',
        syllabes: [
            { cle: 'gea', libelle: 'gea', indice: 'pour geai (optionnel)',    essentiel: false },
            { cle: 'geo', libelle: 'geo', indice: 'pour Georges (optionnel)', essentiel: false },
        ]
    },
]

// Toutes les syllabes à plat
const TOUTES = FAMILLES.flatMap(f => f.syllabes)
const TOTAL_ESSENTIEL = TOUTES.filter(s => s.essentiel).length

export default function SonsReferenceAdmin() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [audioUrls, setAudioUrls] = useState({})
    const [enregistrementEnCours, setEnregistrementEnCours] = useState(null)
    const [uploading, setUploading] = useState(null)
    const [message, setMessage] = useState(null)

    useEffect(() => {
        const token = localStorage.getItem('quiz-admin-token')
        const userData = localStorage.getItem('quiz-admin-user')
        if (!token || !userData) {
            router.push('/aclef-pedagogie-admin')
            return
        }
        try { setUser(JSON.parse(userData)) } catch { router.push('/aclef-pedagogie-admin') }
    }, [router])

    useEffect(() => {
        if (!user) return
        ;(async () => {
            setLoading(true)
            const { data } = await supabase
                .from('sons_reference_g')
                .select('syllabe, audio_url')
            const map = {}
            ;(data || []).forEach(r => { map[r.syllabe] = r.audio_url })
            setAudioUrls(map)
            setLoading(false)
        })()
    }, [user])

    const handleRecordingComplete = async (syllabe, blob) => {
        setUploading(syllabe)
        setMessage(null)

        try {
            const formData = new FormData()
            formData.append('audio', blob, `${syllabe}.webm`)
            formData.append('syllabe', syllabe)
            const token = localStorage.getItem('quiz-admin-token')
            const res = await fetch('/api/admin/sons-reference/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            })

            // 401 = token expiré
            if (res.status === 401) {
                setMessage({
                    type: 'ko',
                    text: '⚠️ Ta session admin a expiré. Reconnecte-toi.',
                    sticky: true
                })
                setTimeout(() => router.push('/aclef-pedagogie-admin'), 2000)
                return
            }

            const data = await res.json().catch(() => ({ error: 'Réponse invalide du serveur' }))
            if (res.ok && data.success && data.enregistrement?.audio_url) {
                // SEULEMENT maintenant on met à jour le state (succès confirmé)
                setAudioUrls(prev => ({ ...prev, [syllabe]: data.enregistrement.audio_url }))
                setMessage({ type: 'ok', text: `✅ Son "${syllabe}" sauvegardé en base` })
                setTimeout(() => setMessage(null), 3000)
            } else {
                setMessage({
                    type: 'ko',
                    text: `❌ Échec sauvegarde "${syllabe}" : ${data.error || data.details || `HTTP ${res.status}`}`,
                    sticky: true
                })
            }
        } catch (e) {
            setMessage({ type: 'ko', text: `❌ Erreur réseau : ${e.message}`, sticky: true })
        } finally {
            setUploading(null)
            setEnregistrementEnCours(null)
        }
    }

    const ecouter = (url) => {
        if (!url) return
        const audio = new Audio(url); audio.play()
    }

    if (!user) return null

    const nbEssentielsFaits = TOUTES.filter(s => s.essentiel && audioUrls[s.cle]).length
    const nbOptionnelsFaits = TOUTES.filter(s => !s.essentiel && audioUrls[s.cle]).length
    const nbTotalFaits = Object.keys(audioUrls).length

    return (
        <>
            <Head><title>Sons de référence — Admin</title></Head>
            <div style={{
                minHeight: '100vh',
                background: '#f9fafb',
                padding: '30px 20px',
                fontFamily: "'Andika', 'Comic Sans MS', sans-serif"
            }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <button onClick={() => router.push('/admin')}
                            style={{ background: '#e5e7eb', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
                            ← Retour admin
                        </button>
                    </div>

                    <h1 style={{ color: '#111827', margin: '0 0 10px 0' }}>
                        🎤 Sons de référence — Les Sons du G
                    </h1>
                    <p style={{ color: '#6b7280', margin: '0 0 20px 0' }}>
                        Enregistre chaque syllabe en prononçant le son naturellement.
                        Les ★ essentielles sont utilisées par les modules d'apprentissage.
                    </p>

                    {/* Progression */}
                    <div style={{
                        background: 'white', padding: '15px 20px', borderRadius: '12px',
                        marginBottom: '25px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ display: 'flex', gap: '30px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div>
                                <div style={{ fontSize: '13px', color: '#6b7280' }}>★ Essentiels</div>
                                <div style={{ fontSize: '22px', fontWeight: 'bold', color: nbEssentielsFaits === TOTAL_ESSENTIEL ? '#16a34a' : '#111827' }}>
                                    {nbEssentielsFaits} / {TOTAL_ESSENTIEL}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '13px', color: '#6b7280' }}>Optionnels</div>
                                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#111827' }}>
                                    {nbOptionnelsFaits} / {TOUTES.length - TOTAL_ESSENTIEL}
                                </div>
                            </div>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                                <div style={{
                                    width: '100%', height: '12px', background: '#e5e7eb',
                                    borderRadius: '6px', overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${(nbEssentielsFaits / TOTAL_ESSENTIEL) * 100}%`,
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #43e97b, #38f9d7)',
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>
                                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                                    {nbEssentielsFaits === TOTAL_ESSENTIEL ? '🎉 Tous les essentiels enregistrés !' : 'Progression essentiels'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {message && (
                        <div style={{
                            padding: '12px 16px', borderRadius: '8px', marginBottom: '15px',
                            background: message.type === 'ok' ? '#dcfce7' : '#fee2e2',
                            color: message.type === 'ok' ? '#166534' : '#991b1b',
                            fontWeight: 'bold'
                        }}>{message.text}</div>
                    )}

                    {loading && <div>Chargement…</div>}

                    {!loading && FAMILLES.map(famille => (
                        <div key={famille.nom} style={{ marginBottom: '30px' }}>
                            <h2 style={{
                                color: famille.couleur,
                                borderBottom: `3px solid ${famille.couleur}`,
                                paddingBottom: '6px',
                                marginBottom: '12px',
                                fontSize: '20px'
                            }}>
                                {famille.icon} {famille.nom}
                            </h2>
                            <div style={{ display: 'grid', gap: '10px' }}>
                                {famille.syllabes.map(({ cle, libelle, indice, essentiel }) => {
                                    const enregistre = !!audioUrls[cle]
                                    const actif = enregistrementEnCours === cle
                                    return (
                                        <div key={cle} style={{
                                            background: 'white',
                                            borderRadius: '12px',
                                            padding: '12px 18px',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                            display: 'grid',
                                            gridTemplateColumns: '90px 1fr auto',
                                            alignItems: 'center',
                                            gap: '15px',
                                            border: enregistre ? `2px solid ${famille.couleur}` : '2px solid transparent',
                                            opacity: essentiel ? 1 : 0.85
                                        }}>
                                            <div style={{
                                                background: enregistre
                                                    ? `linear-gradient(135deg, ${famille.couleur}, ${famille.couleur}dd)`
                                                    : 'linear-gradient(135deg, #ffd700, #ffa500)',
                                                color: 'white',
                                                fontWeight: 'bold',
                                                fontSize: '26px',
                                                padding: '8px',
                                                borderRadius: '10px',
                                                textAlign: 'center'
                                            }}>
                                                {libelle}
                                            </div>

                                            <div>
                                                <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    {essentiel && <span style={{ color: '#f59e0b' }}>★ Essentiel</span>}
                                                    {!essentiel && <span>Optionnel</span>}
                                                    {enregistre && <span style={{ color: '#16a34a' }}>• Enregistré</span>}
                                                </div>
                                                <div style={{ color: '#374151', fontSize: '13px', marginTop: '2px' }}>
                                                    {indice}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                {enregistre && (
                                                    <button onClick={() => ecouter(audioUrls[cle])}
                                                        style={{
                                                            background: '#3b82f6', color: 'white',
                                                            padding: '7px 12px', border: 'none', borderRadius: '8px',
                                                            cursor: 'pointer', fontSize: '13px', fontWeight: 'bold'
                                                        }}>
                                                        🎧
                                                    </button>
                                                )}
                                                {actif ? (
                                                    <VoiceRecorder
                                                        maxDuration={3}
                                                        onRecordingComplete={(blob) => handleRecordingComplete(cle, blob)}
                                                    />
                                                ) : (
                                                    <button onClick={() => setEnregistrementEnCours(cle)}
                                                        disabled={uploading === cle}
                                                        style={{
                                                            background: enregistre ? '#f59e0b' : '#ef4444',
                                                            color: 'white',
                                                            padding: '7px 12px',
                                                            border: 'none', borderRadius: '8px',
                                                            cursor: 'pointer', fontSize: '13px', fontWeight: 'bold'
                                                        }}>
                                                        {enregistre ? '🔁' : '🎤 Enreg.'}
                                                    </button>
                                                )}
                                                {uploading === cle && (
                                                    <span style={{ color: '#6b7280', fontSize: '12px' }}>...</span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}

                    <div style={{ marginTop: '20px', padding: '15px', background: '#eff6ff', borderRadius: '12px', color: '#1e40af', fontSize: '14px' }}>
                        💡 <strong>Conseil</strong> : prononce chaque son de manière claire et naturelle.
                        Dis par exemple « le son <em>gra</em> » plutôt que « gé-r-a ».
                        Tu peux refaire un enregistrement à tout moment.
                    </div>
                </div>
            </div>
        </>
    )
}
