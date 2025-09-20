import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

export default function QuizzAdminIndex() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Vérifier l'authentification admin
    const token = localStorage.getItem('quiz-admin-token')
    const userData = localStorage.getItem('quiz-admin-user')

    if (!token || !userData) {
      router.push('/aclef-pedagogie-admin')
      return
    }

    try {
      const user = JSON.parse(userData)
      setUser(user)

      // Vérifier si l'utilisateur est admin ou salarié
      if (user.role !== 'admin' && user.role !== 'salarié') {
        alert('Accès refusé. Cette page est réservée aux administrateurs et salariés.')
        router.push('/aclef-pedagogie-admin')
        return
      }
    } catch (error) {
      console.error('Erreur parsing user data:', error)
      router.push('/aclef-pedagogie-admin')
      return
    }

    setIsLoading(false)
  }, [router])

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: '#8b5cf6', fontSize: '18px' }}>Chargement...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div style={{
      minHeight: '100vh',
      background: 'white',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* En-tête */}
        <h1 style={{
          fontSize: 'clamp(24px, 5vw, 32px)',
          fontWeight: 'bold',
          marginBottom: '30px',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textAlign: 'center'
        }}>
          🧠 Administration des Quiz
        </h1>

        {/* Grille des fonctionnalités */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          {/* Créer un quiz */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            border: '2px solid #e5e7eb',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            transition: 'transform 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>➕</div>
            <h3 style={{ color: '#1f2937', marginBottom: '10px' }}>Créer un Quiz</h3>
            <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>
              Créer un nouveau quiz avec l'assistant IA ou manuellement
            </p>
            <Link href="/admin/quizz/nouveau" style={{
              display: 'inline-block',
              backgroundColor: '#8b5cf6',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              🚀 Nouveau Quiz
            </Link>
          </div>

          {/* Gérer les quiz */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            border: '2px solid #e5e7eb',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            transition: 'transform 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>📝</div>
            <h3 style={{ color: '#1f2937', marginBottom: '10px' }}>Gérer les Quiz</h3>
            <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>
              Modifier, supprimer et organiser les quiz existants
            </p>
            <Link href="/admin/quizz/gestion" style={{
              display: 'inline-block',
              backgroundColor: '#10b981',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              📋 Gérer
            </Link>
          </div>

          {/* Catégories */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            border: '2px solid #e5e7eb',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            transition: 'transform 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>📂</div>
            <h3 style={{ color: '#1f2937', marginBottom: '10px' }}>Catégories</h3>
            <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>
              Organiser les quiz par catégories thématiques
            </p>
            <Link href="/admin/quizz/categories" style={{
              display: 'inline-block',
              backgroundColor: '#f59e0b',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              🗂️ Catégories
            </Link>
          </div>

          {/* Statistiques */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            border: '2px solid #e5e7eb',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            transition: 'transform 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>📊</div>
            <h3 style={{ color: '#1f2937', marginBottom: '10px' }}>Statistiques</h3>
            <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>
              Consulter les résultats et performances des apprenants
            </p>
            <Link href="/admin/quizz/statistiques" style={{
              display: 'inline-block',
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              📈 Statistiques
            </Link>
          </div>

          {/* Import/Export */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            border: '2px solid #e5e7eb',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            transition: 'transform 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>📦</div>
            <h3 style={{ color: '#1f2937', marginBottom: '10px' }}>Import/Export</h3>
            <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>
              Importer des quiz depuis CSV ou exporter vos créations
            </p>
            <Link href="/admin/quizz/import-export" style={{
              display: 'inline-block',
              backgroundColor: '#6b7280',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              🔄 Import/Export
            </Link>
          </div>

          {/* Test Quiz */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            border: '2px solid #e5e7eb',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            transition: 'transform 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🎯</div>
            <h3 style={{ color: '#1f2937', marginBottom: '10px' }}>Tester</h3>
            <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>
              Tester les quiz en tant qu'apprenant pour valider
            </p>
            <Link href="/quizz" style={{
              display: 'inline-block',
              backgroundColor: '#dc2626',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              🎮 Mode Test
            </Link>
          </div>
        </div>

        {/* Bouton retour */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => router.push('/admin')}
            style={{
              backgroundColor: '#6b7280',
              color: 'white',
              padding: '12px 30px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            ← Retour au tableau de bord
          </button>
        </div>
      </div>
    </div>
  )
}