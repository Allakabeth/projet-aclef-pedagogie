import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { convertNumbersInText, capitalizeText } from '../../lib/convertNumbers'

// Moteur de syllables simplifié
class SimpleSyllableEngine {
    segmentWord(word) {
        if (word.length <= 2) return [word];
        
        const vowels = ['a', 'e', 'i', 'o', 'u', 'y', 'à', 'á', 'â', 'ã', 'ä', 'å', 'è', 'é', 'ê', 'ë', 'ì', 'í', 'î', 'ï', 'ò', 'ó', 'ô', 'õ', 'ö', 'ù', 'ú', 'û', 'ü', 'ÿ'];
        
        // Exceptions courantes
        const exceptions = {
            'bonjour': ['bon', 'jour'],
            'madame': ['ma', 'dame'],
            'comment': ['com', 'ment'],
            'allez': ['al', 'lez'],
            'merci': ['mer', 'ci'],
            'pardon': ['par', 'don'],
            'voiture': ['voi', 'ture'],
            'famille': ['fa', 'mille'],
            'maison': ['mai', 'son'],
            'jardin': ['jar', 'din'],
            'enfant': ['en', 'fant'],
            'école': ['é', 'cole'],
            'photo': ['pho', 'to'],
            'piano': ['pi', 'a', 'no'],
            'radio': ['ra', 'dio'],
            'table': ['ta', 'ble']
        };
        
        const lowerWord = word.toLowerCase();
        if (exceptions[lowerWord]) {
            return exceptions[lowerWord];
        }
        
        // Règle simple
        let syllables = [];
        let current = '';
        let lastWasVowel = false;
        
        for (let i = 0; i < word.length; i++) {
            const char = word[i].toLowerCase();
            const isVowel = vowels.includes(char);
            
            if (lastWasVowel && !isVowel && current.length > 0) {
                if (current.length >= 2) {
                    syllables.push(current);
                    current = char;
                } else {
                    current += char;
                }
            } else {
                current += char;
            }
            
            lastWasVowel = isVowel;
        }
        
        if (current) {
            syllables.push(current);
        }
        
        return syllables.length > 0 ? syllables : [word];
    }
}

export default function CreerTexteManuel() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [textGroups, setTextGroups] = useState([])
    const [groupCounter, setGroupCounter] = useState(0)
    const [stats, setStats] = useState({ totalWords: 0, multiSyllableWords: 0 })
    const [isSaving, setIsSaving] = useState(false)
    const [textFont, setTextFont] = useState('Comic Sans MS')
    const [textSize, setTextSize] = useState('22')
    const router = useRouter()

    // Fonction pour lire le texte avec une voix masculine
    const lireTexte = (texte) => {
        if ('speechSynthesis' in window) {
            // Arrêter toute lecture en cours
            window.speechSynthesis.cancel()

            const utterance = new SpeechSynthesisUtterance(texte)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.8
            utterance.pitch = 0.6  // Plus grave pour une voix masculine

            // Chercher une voix masculine française
            const voices = window.speechSynthesis.getVoices()
            let voixMasculine = voices.find(voice =>
                voice.lang.includes('fr') &&
                (voice.name.toLowerCase().includes('male') ||
                 voice.name.toLowerCase().includes('man') ||
                 voice.name.toLowerCase().includes('homme') ||
                 voice.name.toLowerCase().includes('masculin') ||
                 voice.name.toLowerCase().includes('thomas') ||
                 voice.name.toLowerCase().includes('paul') ||
                 voice.name.toLowerCase().includes('pierre') ||
                 voice.name.toLowerCase().includes('antoine') ||
                 voice.name.toLowerCase().includes('nicolas'))
            )

            if (!voixMasculine) {
                voixMasculine = voices.find(voice =>
                    voice.lang.includes('fr') &&
                    voice.name.toLowerCase().includes('male')
                )
            }

            if (!voixMasculine) {
                voixMasculine = voices.find(voice => voice.lang.includes('fr'))
                utterance.pitch = 0.4
            }

            if (voixMasculine) {
                utterance.voice = voixMasculine
            }

            window.speechSynthesis.speak(utterance)
        }
    }

    useEffect(() => {
        // Vérifier l'authentification
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')

        if (!token || !userData) {
            router.push('/login')
            return
        }

        try {
            setUser(JSON.parse(userData))
            
            // Charger les préférences de police/taille
            const savedFont = localStorage.getItem('textFont')
            const savedSize = localStorage.getItem('textSize')
            if (savedFont) setTextFont(savedFont)
            if (savedSize) setTextSize(savedSize)
            
            // Ajouter le premier groupe
            addGroup()
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/login')
            return
        }

        setIsLoading(false)
    }, [router])

    const addGroup = () => {
        const newCounter = groupCounter + 1
        setGroupCounter(newCounter)
        setTextGroups([...textGroups, { 
            id: newCounter, 
            type: 'text', 
            content: '' 
        }])
    }

    const addLineBreak = () => {
        setTextGroups([...textGroups, { 
            id: Date.now(), 
            type: 'linebreak' 
        }])
    }

    const removeLastGroup = () => {
        if (textGroups.length <= 1) {
            alert('Vous devez garder au moins un groupe !')
            return
        }
        setTextGroups(textGroups.slice(0, -1))
    }

    const updateGroupContent = (groupId, content) => {
        setTextGroups(textGroups.map(group => 
            group.id === groupId ? { ...group, content } : group
        ))
    }


    const saveText = async () => {
        console.log('=== DÉBUT SAUVEGARDE ===')
        
        // Extraire les mots et statistiques
        const allWords = []
        const multiSyllableWords = []
        const syllableEngine = new SimpleSyllableEngine()
        
        const textOnlyGroups = textGroups.filter(g => g.type === 'text' && g.content && g.content.trim())
        
        if (textOnlyGroups.length === 0) {
            alert('Veuillez saisir du texte !')
            return
        }

        textOnlyGroups.forEach((group) => {
            if (group.content && group.content.trim()) {
                // Convertir les nombres en lettres
                group.content = convertNumbersInText(group.content)
                
                // Capitaliser le début et après ponctuation
                group.content = capitalizeText(group.content)
                
                const words = group.content.match(/[a-zA-ZàáâãäåèéêëìíîïòóôõöùúûüÿçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜŸÇ-]+/g) || []
                
                words.forEach(word => {
                    const cleanWord = word.toLowerCase()
                    if (!allWords.includes(cleanWord)) {
                        allWords.push(cleanWord)
                        
                        const syllables = syllableEngine.segmentWord(cleanWord)
                        if (syllables.length > 1) {
                            multiSyllableWords.push({
                                mot: cleanWord,
                                syllabes: syllables
                            })
                        }
                    }
                })
            }
        })

        const titre = prompt('Titre du texte :') || `Texte ${new Date().toLocaleDateString()}`
        
        setIsSaving(true)
        try {
            const token = localStorage.getItem('token')
            
            const response = await fetch('/api/textes/creer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    titre: titre,
                    groupes_sens: textOnlyGroups.map((group, index) => ({
                        ordre_groupe: index + 1,
                        contenu: group.content.trim(),
                        type_groupe: 'text'
                    })),
                    mots_extraits: multiSyllableWords
                })
            })

            if (response.ok) {
                const result = await response.json()
                setStats({
                    totalWords: allWords.length,
                    multiSyllableWords: multiSyllableWords.length
                })
                
                alert(`✅ Texte "${titre}" sauvegardé !\n${multiSyllableWords.length} mots ajoutés à l'entraînement.`)
                
                // Retour à la liste des textes
                setTimeout(() => {
                    router.push('/lire/voir-mes-textes')
                }, 1500)
            } else {
                const error = await response.json()
                throw new Error(error.error || 'Erreur de sauvegarde')
            }
        } catch (error) {
            console.error('Erreur sauvegarde:', error)
            alert('❌ Erreur : ' + error.message)
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{ color: '#10b981', fontSize: '18px' }}>Chargement...</div>
            </div>
        )
    }

    if (!user) return null

    return (
        <>
            <Head>
                <title>Créer un Texte Manuellement - ACLEF</title>
            </Head>
            <div style={{
                minHeight: '100vh',
                background: 'white',
                padding: '15px'
            }}>
                <div style={{
                    maxWidth: '800px',
                    margin: '0 auto',
                    backgroundColor: 'white'
                }}>
                    {/* Titre */}
                    <h1 style={{
                        fontSize: 'clamp(22px, 5vw, 28px)',
                        fontWeight: 'bold',
                        marginBottom: '10px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textAlign: 'center'
                    }}>
                        ✍️ Créer un Texte Manuellement
                    </h1>

                    <p style={{
                        textAlign: 'center',
                        fontSize: 'clamp(14px, 3vw, 16px)',
                        color: '#666',
                        marginBottom: '20px'
                    }}>
                        Saisissez vos groupes de mots dans les cases ci-dessous.
                    </p>

                    {/* Contrôles de style */}
                    <div style={{
                        background: '#f8f9fa',
                        padding: '20px',
                        borderRadius: '8px',
                        marginBottom: '20px'
                    }}>
                        <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#333' }}>Style du texte</h3>
                        <div style={{
                            display: 'flex',
                            gap: '20px',
                            flexWrap: 'wrap',
                            alignItems: 'center'
                        }}>
                            <div>
                                <label style={{ marginRight: '10px', fontSize: '14px', fontWeight: '500' }}>
                                    Police :
                                </label>
                                <select
                                    value={textFont}
                                    onChange={(e) => {
                                        setTextFont(e.target.value)
                                        localStorage.setItem('textFont', e.target.value)
                                    }}
                                    style={{
                                        padding: '8px',
                                        borderRadius: '4px',
                                        border: '1px solid #ddd',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="Arial">Arial</option>
                                    <option value="Times New Roman">Times New Roman</option>
                                    <option value="Georgia">Georgia</option>
                                    <option value="Comic Sans MS">Comic Sans MS</option>
                                    <option value="Verdana">Verdana</option>
                                    <option value="Helvetica">Helvetica</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ marginRight: '10px', fontSize: '14px', fontWeight: '500' }}>
                                    Taille :
                                </label>
                                <select
                                    value={textSize}
                                    onChange={(e) => {
                                        setTextSize(e.target.value)
                                        localStorage.setItem('textSize', e.target.value)
                                    }}
                                    style={{
                                        padding: '8px',
                                        borderRadius: '4px',
                                        border: '1px solid #ddd',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="14">14px</option>
                                    <option value="16">16px</option>
                                    <option value="18">18px</option>
                                    <option value="20">20px</option>
                                    <option value="22">22px</option>
                                    <option value="24">24px</option>
                                    <option value="28">28px</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Groupes de texte */}
                    <div style={{ marginBottom: '20px' }}>
                        {textGroups.map((group, index) => (
                            <div key={group.id} style={{ marginBottom: '15px' }}>
                                {group.type === 'text' ? (
                                    <div style={{
                                        background: '#f8f9fa',
                                        border: '2px solid #dee2e6',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        position: 'relative'
                                    }}>
                                        <div style={{
                                            position: 'absolute',
                                            top: '-12px',
                                            left: '12px',
                                            background: '#10b981',
                                            color: 'white',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '12px'
                                        }}>
                                            {index + 1}
                                        </div>
                                        <textarea
                                            placeholder="Saisissez votre groupe de mots..."
                                            value={group.content || ''}
                                            onChange={(e) => updateGroupContent(group.id, e.target.value)}
                                            style={{
                                                width: '100%',
                                                minHeight: '80px',
                                                padding: '10px',
                                                border: 'none',
                                                outline: 'none',
                                                resize: 'vertical',
                                                fontSize: textSize + 'px',
                                                background: 'transparent',
                                                fontFamily: textFont
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div style={{
                                        height: '30px',
                                        background: 'linear-gradient(90deg, #ccc 0%, transparent 100%)',
                                        border: '2px dashed #ccc',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#666',
                                        fontStyle: 'italic',
                                        fontSize: '14px'
                                    }}>
                                        --- Saut de ligne ---
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Boutons d'actions */}
                    <div style={{
                        display: 'flex',
                        gap: '10px',
                        flexWrap: 'wrap',
                        marginBottom: '20px',
                        justifyContent: 'center'
                    }}>
                        <button
                            onClick={() => {
                                lireTexte('Ajouter groupe')
                                setTimeout(() => addGroup(), 800)
                            }}
                            style={{
                                padding: '10px 15px',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}
                        >
                            ➕ Ajouter groupe
                        </button>
                        <button
                            onClick={() => {
                                lireTexte('Saut de ligne')
                                setTimeout(() => addLineBreak(), 800)
                            }}
                            style={{
                                padding: '10px 15px',
                                backgroundColor: '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}
                        >
                            ↵ Saut de ligne
                        </button>
                        <button
                            onClick={() => {
                                lireTexte('Supprimer dernier')
                                setTimeout(() => removeLastGroup(), 800)
                            }}
                            style={{
                                padding: '10px 15px',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}
                        >
                            ❌ Supprimer dernier
                        </button>
                    </div>

                    {/* Boutons principaux */}
                    <div style={{
                        display: 'flex',
                        gap: '10px',
                        justifyContent: 'center',
                        marginBottom: '20px',
                        flexWrap: 'wrap'
                    }}>
                        <button
                            onClick={() => {
                                if (!isSaving) {
                                    lireTexte('Enregistrer le texte')
                                    setTimeout(() => saveText(), 1000)
                                }
                            }}
                            disabled={isSaving}
                            style={{
                                padding: '15px 25px',
                                backgroundColor: isSaving ? '#9ca3af' : '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: isSaving ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isSaving ? 'Sauvegarde...' : '💾 Enregistrer le Texte'}
                        </button>
                    </div>


                    {/* Stats */}
                    {stats.totalWords > 0 && (
                        <div style={{
                            background: '#d4edda',
                            border: '1px solid #c3e6cb',
                            borderRadius: '8px',
                            padding: '15px',
                            marginBottom: '20px',
                            textAlign: 'center'
                        }}>
                            <h3>Résultat de la sauvegarde :</h3>
                            <p><strong>{stats.totalWords}</strong> mots au total</p>
                            <p><strong>{stats.multiSyllableWords}</strong> mots multi-syllabes ajoutés à l'entraînement</p>
                        </div>
                    )}

                    {/* Bouton retour */}
                    <div style={{ textAlign: 'center', marginTop: '30px' }}>
                        <button
                            onClick={() => {
                                lireTexte('Retour aux textes références')
                                setTimeout(() => router.push('/lire/mes-textes-references'), 1200)
                            }}
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
                            ← Retour aux textes références
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}