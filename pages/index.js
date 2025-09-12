import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Rediriger vers la page de login
    router.push('/login')
  }, [router])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'white'
    }}>
      <p style={{ color: '#667eea', fontSize: '18px' }}>Redirection...</p>
    </div>
  )
}