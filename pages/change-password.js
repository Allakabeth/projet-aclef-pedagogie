import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function ChangePassword() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [message, setMessage] = useState('')
    const [messageType, setMessageType] = useState('error')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const router = useRouter()

    useEffect(() => {
        // Vérifier l'authentification
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')

        if (!token || !userData) {
            router.push('/login')
            return
        }

        try {
            const parsedUser = JSON.parse(userData)
            setUser(parsedUser)
            
            // Si c'est une première connexion, pré-remplir avec le nom
            if (parsedUser.mustChangePassword) {
                setCurrentPassword(parsedUser.nom || '')
            }
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/login')
            return
        }

        setIsLoading(false)
    }, [router])

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            setMessage('Veuillez remplir tous les champs')
            setMessageType('error')
            return
        }

        if (newPassword !== confirmPassword) {
            setMessage('Les nouveaux mots de passe ne correspondent pas')
            setMessageType('error')
            return
        }

        if (newPassword.length < 6) {
            setMessage('Le nouveau mot de passe doit contenir au moins 6 caractères')
            setMessageType('error')
            return
        }

        if (newPassword === currentPassword) {
            setMessage('Le nouveau mot de passe doit être différent de l\'ancien')
            setMessageType('error')
            return
        }

        setIsSubmitting(true)
        setMessage('')

        try {
            const token = localStorage.getItem('token')
            
            const response = await fetch('/api/auth/apprenant/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            })

            const data = await response.json()

            if (response.ok && data.success) {
                setMessage('Mot de passe modifié avec succès ! Redirection...')
                setMessageType('success')
                
                // Mettre à jour les informations utilisateur
                const updatedUser = { ...user, mustChangePassword: false }
                localStorage.setItem('user', JSON.stringify(updatedUser))
                setUser(updatedUser)
                
                setTimeout(() => {
                    router.push('/dashboard')
                }, 2000)
            } else {
                setMessage(data.error || 'Erreur lors du changement de mot de passe')
                setMessageType('error')
            }
        } catch (error) {
            console.error('Erreur changement mot de passe:', error)
            setMessage('Erreur de connexion au serveur')
            setMessageType('error')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleRetourDashboard = () => {
        router.push('/dashboard')
    }

    if (isLoading) {
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
                    padding: '40px',
                    textAlign: 'center'
                }}>
                    <div style={{ color: 'white', fontSize: '18px' }}>Chargement...</div>
                </div>
            </div>
        )
    }

    if (!user) {
        return null
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '15px'
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: 'clamp(15px, 4vw, 25px)',
                maxWidth: '450px',
                width: '100%'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h1 style={{
                        fontSize: 'clamp(22px, 5vw, 28px)',
                        fontWeight: 'bold',
                        background: 'white',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '10px'
                    }}>
                        Changer de mot de passe
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: 'clamp(12px, 3vw, 14px)' }}>
                        {user.mustChangePassword ? 
                            'Vous devez changer votre mot de passe pour continuer' : 
                            'Modifiez votre mot de passe ci-dessous'}
                    </p>
                </div>

                {user.mustChangePassword && (
                    <div style={{
                        padding: '15px',
                        borderRadius: '10px',
                        backgroundColor: '#fef3c7',
                        border: '2px solid #f59e0b',
                        marginBottom: '20px',
                        fontSize: '14px'
                    }}>
                        <div style={{ color: '#92400e', fontWeight: '600', marginBottom: '5px' }}>
                            🔐 Première connexion
                        </div>
                        <div style={{ color: '#78350f' }}>
                            Votre mot de passe actuel est votre nom de famille : <strong>{user.nom}</strong>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            color: '#374151',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}>
                            Mot de passe actuel
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showCurrentPassword ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Votre mot de passe actuel"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    paddingRight: '45px',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '10px',
                                    fontSize: '16px',
                                    transition: 'border-color 0.2s',
                                    outline: 'none'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    color: '#6b7280'
                                }}
                            >
                                {showCurrentPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            color: '#374151',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}>
                            Nouveau mot de passe
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showNewPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Minimum 6 caractères"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    paddingRight: '45px',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '10px',
                                    fontSize: '16px',
                                    transition: 'border-color 0.2s',
                                    outline: 'none'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    color: '#6b7280'
                                }}
                            >
                                {showNewPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            color: '#374151',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}>
                            Confirmer le nouveau mot de passe
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Retapez le nouveau mot de passe"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    paddingRight: '45px',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '10px',
                                    fontSize: '16px',
                                    transition: 'border-color 0.2s',
                                    outline: 'none'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    color: '#6b7280'
                                }}
                            >
                                {showConfirmPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    {message && (
                        <div style={{
                            padding: '12px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            backgroundColor: messageType === 'success' ? '#d1fae5' : '#fee2e2',
                            color: messageType === 'success' ? '#065f46' : '#991b1b',
                            fontSize: '14px',
                            textAlign: 'center'
                        }}>
                            {message}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{
                                flex: 1,
                                padding: '14px',
                                background: isSubmitting ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                transition: 'transform 0.2s'
                            }}
                            onMouseOver={(e) => !isSubmitting && (e.target.style.transform = 'scale(1.02)')}
                            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                        >
                            {isSubmitting ? 'Modification...' : '🔐 Changer le mot de passe'}
                        </button>

                        {!user.mustChangePassword && (
                            <button
                                type="button"
                                onClick={handleRetourDashboard}
                                style={{
                                    padding: '14px 20px',
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
                                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                            >
                                Retour
                            </button>
                        )}
                    </div>
                </form>

                <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#64748b',
                    textAlign: 'center'
                }}>
                    <div style={{ fontWeight: '600', marginBottom: '5px' }}>
                        Conseils pour un mot de passe sécurisé :
                    </div>
                    <div>
                        • Au moins 6 caractères<br />
                        • Mélangez lettres et chiffres<br />
                        • Évitez les mots simples
                    </div>
                </div>
            </div>
        </div>
    )
}