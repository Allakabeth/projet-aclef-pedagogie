import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function EcrireHub() {
    const router = useRouter()
    const [user, setUser] = useState(null)

    useEffect(() => {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')
        if (!token || !userData) { router.push('/login'); return }
        try { setUser(JSON.parse(userData)) } catch { router.push('/login') }
    }, [router])

    if (!user) return null

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Écrire</h1>
            <p style={styles.subtitle}>Bonjour {user.prenom || ''}, choisis ton activité</p>

            <div style={styles.grid}>
                <button
                    onClick={() => router.push('/ecrire/orthographe')}
                    style={styles.card}
                >
                    <div style={styles.cardIcon}>📝</div>
                    <div style={styles.cardTitle}>Orthographe</div>
                    <div style={styles.cardDesc}>
                        Entraîne-toi sur les articles, les accords, les homophones, la conjugaison...
                    </div>
                </button>
            </div>

            <button onClick={() => router.push('/dashboard')} style={styles.backBtn}>
                ← Retour au menu
            </button>
        </div>
    )
}

const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#f8f6ff',
        padding: 'clamp(20px, 5vw, 40px)',
        fontFamily: 'Arial, sans-serif'
    },
    title: {
        fontSize: 'clamp(28px, 6vw, 40px)',
        fontWeight: 'bold',
        color: '#7c3aed',
        textAlign: 'center',
        margin: '0 0 8px 0'
    },
    subtitle: {
        fontSize: 'clamp(16px, 3.5vw, 20px)',
        color: '#64748b',
        textAlign: 'center',
        margin: '0 0 40px 0'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        maxWidth: '600px',
        margin: '0 auto 40px'
    },
    card: {
        backgroundColor: '#fff',
        border: '3px solid #c4b5fd',
        borderRadius: '20px',
        padding: 'clamp(24px, 5vw, 40px)',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 4px 15px rgba(124,58,237,0.1)'
    },
    cardIcon: { fontSize: 'clamp(48px, 10vw, 72px)', marginBottom: '16px' },
    cardTitle: {
        fontSize: 'clamp(22px, 5vw, 28px)',
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: '12px'
    },
    cardDesc: {
        fontSize: 'clamp(14px, 3vw, 17px)',
        color: '#64748b',
        lineHeight: '1.5'
    },
    backBtn: {
        display: 'block',
        margin: '0 auto',
        padding: '14px 32px',
        backgroundColor: '#e2e8f0',
        color: '#475569',
        border: 'none',
        borderRadius: '12px',
        fontSize: 'clamp(14px, 3vw, 16px)',
        fontWeight: '600',
        cursor: 'pointer'
    }
}
