import { useRouter } from 'next/router'

export default function AdminEcrire() {
    const router = useRouter()

    return (
        <div style={styles.container}>
            <div style={styles.content}>
                <div style={styles.header}>
                    <h1 style={styles.title}>✍️ Module Écrire</h1>
                    <p style={styles.subtitle}>Gestion des exercices d'écriture et d'orthographe</p>
                </div>

                <div style={styles.menuGrid}>
                    <button
                        onClick={() => router.push('/admin/ecrire/orthographe')}
                        style={styles.menuCard}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={styles.menuIcon}>📦</div>
                        <h2 style={styles.menuTitle}>Orthographe</h2>
                        <p style={styles.menuDescription}>
                            Exercices d'orthographe grammaticale (Boîtes Bleues) :
                            articles, possessifs, homophones, conjugaison...
                        </p>
                        <span style={styles.badge}>Niveaux A / B / C</span>
                    </button>

                    <div style={styles.menuCardDisabled}>
                        <div style={styles.menuIcon}>📝</div>
                        <h2 style={styles.menuTitle}>Production de texte</h2>
                        <p style={styles.menuDescription}>
                            Exercices de production écrite autonome
                        </p>
                        <span style={styles.badgeGray}>Bientôt disponible</span>
                    </div>
                </div>

                <div style={styles.backButtonContainer}>
                    <button onClick={() => router.push('/admin')} style={styles.backButton}>
                        ← Retour au menu admin
                    </button>
                </div>
            </div>
        </div>
    )
}

const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
    },
    content: {
        width: '100%',
        maxWidth: '900px'
    },
    header: {
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '15px',
        marginBottom: '30px',
        textAlign: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    },
    title: {
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#8b5cf6',
        margin: '0 0 10px 0'
    },
    subtitle: {
        fontSize: '16px',
        color: '#64748b',
        margin: 0
    },
    menuGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '25px',
        marginBottom: '30px'
    },
    menuCard: {
        backgroundColor: 'white',
        padding: '40px 30px',
        borderRadius: '15px',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'center',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease'
    },
    menuCardDisabled: {
        backgroundColor: '#f1f5f9',
        padding: '40px 30px',
        borderRadius: '15px',
        border: '2px dashed #cbd5e1',
        textAlign: 'center',
        opacity: 0.6
    },
    menuIcon: {
        fontSize: '64px',
        marginBottom: '20px'
    },
    menuTitle: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#1e293b',
        margin: '0 0 15px 0'
    },
    menuDescription: {
        fontSize: '15px',
        color: '#64748b',
        margin: '0 0 15px 0',
        lineHeight: '1.5'
    },
    badge: {
        display: 'inline-block',
        backgroundColor: '#8b5cf6',
        color: 'white',
        padding: '4px 16px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: 'bold'
    },
    badgeGray: {
        display: 'inline-block',
        backgroundColor: '#cbd5e1',
        color: '#64748b',
        padding: '4px 16px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: 'bold'
    },
    backButtonContainer: {
        textAlign: 'center'
    },
    backButton: {
        backgroundColor: '#6b7280',
        color: 'white',
        padding: '12px 30px',
        borderRadius: '25px',
        border: 'none',
        fontSize: '14px',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'background-color 0.3s'
    }
}
