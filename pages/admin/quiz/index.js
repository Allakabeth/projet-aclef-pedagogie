import { useRouter } from 'next/router'

export default function AdminQuiz() {
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
                maxWidth: '800px',
                width: '100%',
                textAlign: 'center',
                borderRadius: '20px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)'
            }}>
                <h1 style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    color: '#059669'
                }}>
                    📋 Module Quiz
                </h1>

                <p style={{
                    fontSize: '18px',
                    color: '#666',
                    marginBottom: '30px'
                }}>
                    Gestion des quiz et contenus pédagogiques
                </p>

                {/* Grille d'options Quiz */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '20px',
                    marginBottom: '30px'
                }}>
                    {/* Créer un Quiz */}
                    <button
                        onClick={() => router.push('/quizz-admin/quiz/editor')}
                        style={{
                            backgroundColor: '#10b981',
                            color: 'white',
                            padding: '20px',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        ➕ Créer un Quiz
                    </button>

                    {/* Gérer les Quiz */}
                    <button
                        onClick={() => router.push('/quizz-admin/index')}
                        style={{
                            backgroundColor: '#ef4444',
                            color: 'white',
                            padding: '20px',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        📋 Gérer les Quiz
                    </button>

                    {/* Catégories */}
                    <button
                        onClick={() => router.push('/quizz-admin/categories')}
                        style={{
                            backgroundColor: '#8b5cf6',
                            color: 'white',
                            padding: '20px',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        🏷️ Catégories
                    </button>

                    {/* Import CSV */}
                    <button
                        onClick={() => router.push('/quizz-admin/quiz/csv-creator')}
                        style={{
                            backgroundColor: '#f59e0b',
                            color: 'white',
                            padding: '20px',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        📊 Import CSV
                    </button>
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