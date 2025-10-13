import { useRouter } from 'next/router'

/**
 * Page Référentiels - Menu de gestion des référentiels de compétences
 */
export default function ReferentielsMenu() {
    const router = useRouter()

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>📚 Référentiels de Compétences</h1>
                <p style={styles.subtitle}>Gérer la structure des domaines, catégories et compétences</p>
            </div>

            <div style={styles.menuGrid}>
                <div
                    style={styles.menuCard}
                    onClick={() => router.push('/admin/formation/referentiel/domaines')}
                >
                    <div style={styles.menuIcon}>📚</div>
                    <h3 style={styles.menuTitle}>Domaines</h3>
                    <p style={styles.menuDescription}>
                        Gérer les domaines de formation (Lecture, Écriture, Mathématiques...)
                    </p>
                </div>

                <div
                    style={styles.menuCard}
                    onClick={() => router.push('/admin/formation/referentiel/categories')}
                >
                    <div style={styles.menuIcon}>📂</div>
                    <h3 style={styles.menuTitle}>Catégories</h3>
                    <p style={styles.menuDescription}>
                        Gérer les catégories de compétences au sein des domaines
                    </p>
                </div>

                <div
                    style={styles.menuCard}
                    onClick={() => router.push('/admin/formation/referentiel/competences')}
                >
                    <div style={styles.menuIcon}>🎯</div>
                    <h3 style={styles.menuTitle}>Compétences</h3>
                    <p style={styles.menuDescription}>
                        Gérer les compétences détaillées avec codes et descriptions
                    </p>
                </div>
            </div>

            <div style={styles.footer}>
                <button
                    onClick={() => router.push('/admin/formation')}
                    style={styles.backButton}
                >
                    ← Retour au module Formation
                </button>
            </div>
        </div>
    )
}

const styles = {
    container: {
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif'
    },
    header: {
        marginBottom: '40px',
        textAlign: 'center'
    },
    title: {
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#333',
        margin: '0 0 8px 0'
    },
    subtitle: {
        fontSize: '16px',
        color: '#666',
        margin: 0
    },
    menuGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        marginBottom: '40px'
    },
    menuCard: {
        backgroundColor: '#fff',
        border: '2px solid #e0e0e0',
        borderRadius: '12px',
        padding: '32px 24px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    },
    menuIcon: {
        fontSize: '64px',
        marginBottom: '20px'
    },
    menuTitle: {
        fontSize: '20px',
        fontWeight: '600',
        color: '#333',
        margin: '0 0 12px 0'
    },
    menuDescription: {
        fontSize: '14px',
        color: '#666',
        margin: 0,
        lineHeight: '1.5'
    },
    footer: {
        textAlign: 'center',
        marginTop: '40px'
    },
    backButton: {
        padding: '12px 24px',
        backgroundColor: '#f5f5f5',
        color: '#333',
        border: '1px solid #ddd',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    }
}
