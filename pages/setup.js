import { useState } from 'react'

export default function Setup() {
    const [isCreating, setIsCreating] = useState(false)
    const [message, setMessage] = useState('')
    const [sqlScript, setSqlScript] = useState('')

    const createTables = async () => {
        setIsCreating(true)
        setMessage('')
        setSqlScript('')

        try {
            const response = await fetch('/api/setup/create-tables', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            const data = await response.json()

            if (response.ok) {
                setMessage('✅ ' + data.message)
            } else {
                setMessage('❌ ' + data.error)
                if (data.sqlScript) {
                    setSqlScript(data.sqlScript)
                }
            }
        } catch (error) {
            setMessage('❌ Erreur: ' + error.message)
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'white',
            padding: '20px',
            fontFamily: 'Arial, sans-serif'
        }}>
            <div style={{
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                <h1 style={{
                    textAlign: 'center',
                    color: '#333',
                    marginBottom: '30px'
                }}>
                    🔧 Configuration Base de Données
                </h1>

                <div style={{
                    background: '#f8f9fa',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <p>Cette page permet de créer automatiquement les tables nécessaires pour les textes de référence dans Supabase.</p>
                    
                    <p><strong>Tables qui seront créées :</strong></p>
                    <ul>
                        <li><code>textes_references</code> - Textes principaux</li>
                        <li><code>groupes_sens</code> - Groupes de mots</li>
                        <li><code>mots_extraits</code> - Mots extraits pour l'entraînement</li>
                        <li><code>syllabes_mots</code> - Syllabes de chaque mot</li>
                    </ul>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <button
                        onClick={createTables}
                        disabled={isCreating}
                        style={{
                            backgroundColor: isCreating ? '#9ca3af' : '#10b981',
                            color: 'white',
                            padding: '15px 30px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: isCreating ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isCreating ? 'Création en cours...' : '🚀 Créer les tables'}
                    </button>
                </div>

                {message && (
                    <div style={{
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        backgroundColor: message.includes('✅') ? '#d1fae5' : '#fee2e2',
                        color: message.includes('✅') ? '#065f46' : '#991b1b',
                        fontWeight: '500'
                    }}>
                        {message}
                    </div>
                )}

                {sqlScript && (
                    <div style={{
                        marginTop: '20px'
                    }}>
                        <h3>Script SQL à exécuter manuellement :</h3>
                        <div style={{
                            background: '#f1f5f9',
                            padding: '15px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            maxHeight: '400px',
                            overflow: 'auto'
                        }}>
                            {sqlScript}
                        </div>
                        <div style={{
                            marginTop: '15px',
                            padding: '15px',
                            background: '#fef3c7',
                            borderRadius: '8px',
                            fontSize: '14px'
                        }}>
                            <strong>Instructions :</strong>
                            <ol style={{ marginTop: '10px' }}>
                                <li>Copiez le script SQL ci-dessus</li>
                                <li>Allez dans votre dashboard Supabase</li>
                                <li>Cliquez sur "SQL Editor"</li>
                                <li>Collez le script et cliquez "Run"</li>
                            </ol>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}