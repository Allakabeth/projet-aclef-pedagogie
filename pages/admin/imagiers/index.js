import { useRouter } from 'next/router'

export default function AdminImagiers() {
    const router = useRouter()

    return (
        <div style={{
            minHeight: '100vh',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '40px',
                maxWidth: '600px',
                width: '100%',
                textAlign: 'center',
                borderRadius: '20px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)'
            }}>
                <h1 style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    color: '#be185d'
                }}>
                    🖼️ Gérer les Imagiers
                </h1>

                <p style={{
                    fontSize: '18px',
                    color: '#666',
                    marginBottom: '30px'
                }}>
                    Interface de gestion des imagiers pédagogiques
                </p>

                <div style={{
                    padding: '40px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    marginBottom: '30px',
                    border: '2px dashed #d1d5db'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚧</div>
                    <h3 style={{ color: '#be185d', fontSize: '20px', marginBottom: '10px' }}>
                        Module en construction
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '16px' }}>
                        Cette section sera bientôt disponible pour gérer les imagiers et supports visuels pédagogiques.
                    </p>
                </div>

                <button
                    onClick={() => router.push('/admin')}
                    style={{
                        backgroundColor: '#6b7280',
                        color: 'white',
                        padding: '12px 30px',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#6b7280'}
                >
                    ← Retour au menu principal
                </button>
            </div>
        </div>
    )
}