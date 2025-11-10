import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { convertNumbersInText, capitalizeText } from '../../../lib/convertNumbers'

// Moteur de syllables (même que créer-texte)
class SimpleSyllableEngine {
    segmentWord(word) {
        if (word.length <= 2) return [word];
        
        const vowels = ['a', 'e', 'i', 'o', 'u', 'y', 'à', 'á', 'â', 'ã', 'ä', 'å', 'è', 'é', 'ê', 'ë', 'ì', 'í', 'î', 'ï', 'ò', 'ó', 'ô', 'õ', 'ö', 'ù', 'ú', 'û', 'ü', 'ÿ'];
        
        const exceptions = {
            'bonjour': ['bon', 'jour'], 'madame': ['ma', 'dame'], 'comment': ['com', 'ment'],
            'allez': ['al', 'lez'], 'merci': ['mer', 'ci'], 'pardon': ['par', 'don'],
            'voiture': ['voi', 'ture'], 'famille': ['fa', 'mille'], 'maison': ['mai', 'son'],
            'jardin': ['jar', 'din'], 'enfant': ['en', 'fant'], 'école': ['é', 'cole'],
            'photo': ['pho', 'to'], 'piano': ['pi', 'a', 'no'], 'radio': ['ra', 'dio'],
            'table': ['ta', 'ble']
        };
        
        const lowerWord = word.toLowerCase();
        if (exceptions[lowerWord]) {
            return exceptions[lowerWord];
        }
        
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

export default function ModifierTexte() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingTexte, setIsLoadingTexte] = useState(true)
    const [texte, setTexte] = useState(null)
    const [titre, setTitre] = useState('')
    const [textGroups, setTextGroups] = useState([])
    const [groupCounter, setGroupCounter] = useState(0)
    const [showPreview, setShowPreview] = useState(false)
    const [stats, setStats] = useState({ totalWords: 0, multiSyllableWords: 0 })
    const [isSaving, setIsSaving] = useState(false)
    const [textFont, setTextFont] = useState('Comic Sans MS')
    const [textSize, setTextSize] = useState('22')
    const [selectedGroups, setSelectedGroups] = useState(new Set())
    const router = useRouter()
    const { id } = router.query
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

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
            
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/login')
            return
        }

        setIsLoading(false)
    }, [router])

    useEffect(() => {
        if (id && !isLoading) {
            loadTexte()
        }
    }, [id, isLoading])

    const loadTexte = async () => {
        setIsLoadingTexte(true)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/textes/get/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                const texteData = data.texte
                
                setTexte(texteData)
                setTitre(texteData.titre)
                
                // Convertir les groupes de sens en format pour l'édition
                const groupes = data.groupes_sens.map((groupe, index) => ({
                    id: groupe.id,
                    type: 'text',
                    content: groupe.contenu
                }))
                
                setTextGroups(groupes)
                setGroupCounter(groupes.length)
            } else {
                alert('Erreur lors du chargement du texte')
                router.push('/lire/voir-mes-textes')
            }
        } catch (error) {
            console.error('Erreur chargement texte:', error)
            alert('Erreur lors du chargement du texte')
            router.push('/lire/voir-mes-textes')
        } finally {
            setIsLoadingTexte(false)
        }
    }

    const addGroup = () => {
        const newCounter = groupCounter + 1
        setGroupCounter(newCounter)
        const newGroup = {
            id: `new_${newCounter}`,
            type: 'text',
            content: ''
        }

        // Si exactement UNE case cochée, ajouter APRÈS elle
        if (selectedGroups.size === 1) {
            const selectedId = Array.from(selectedGroups)[0]
            const index = textGroups.findIndex(g => g.id === selectedId)
            if (index !== -1) {
                const newGroups = [...textGroups]
                newGroups.splice(index + 1, 0, newGroup)
                setTextGroups(newGroups)
                return
            }
        }

        // Sinon ajouter à la fin
        setTextGroups([...textGroups, newGroup])
    }

    const addLineBreak = () => {
        setTextGroups([...textGroups, { 
            id: `linebreak_${Date.now()}`, 
            type: 'linebreak' 
        }])
    }

    const toggleGroupSelection = (groupId) => {
        const newSelected = new Set(selectedGroups)
        if (newSelected.has(groupId)) {
            newSelected.delete(groupId)
        } else {
            newSelected.add(groupId)
        }
        setSelectedGroups(newSelected)
    }

    const selectAllGroups = () => {
        const textGroupIds = textGroups.filter(g => g.type === 'text').map(g => g.id)
        setSelectedGroups(new Set(textGroupIds))
    }

    const deselectAllGroups = () => {
        setSelectedGroups(new Set())
    }

    const addLineBreakAfterSelected = () => {
        const newGroups = [...textGroups]
        let addedCount = 0
        
        textGroups.forEach((group, originalIndex) => {
            if (selectedGroups.has(group.id)) {
                const currentIndex = originalIndex + addedCount
                // Vérifier si il n'y a pas déjà un saut de ligne après
                if (currentIndex + 1 < newGroups.length && newGroups[currentIndex + 1].type !== 'linebreak') {
                    newGroups.splice(currentIndex + 1, 0, {
                        id: `linebreak_${Date.now()}_${currentIndex}`, 
                        type: 'linebreak'
                    })
                    addedCount++
                }
            }
        })
        setTextGroups(newGroups)
    }

    const removeLineBreakAfterSelected = () => {
        const newGroups = [...textGroups]
        const groupsToRemove = []
        
        textGroups.forEach((group, index) => {
            if (selectedGroups.has(group.id)) {
                // Vérifier si le groupe suivant est un saut de ligne
                if (index + 1 < textGroups.length && textGroups[index + 1].type === 'linebreak') {
                    groupsToRemove.push(textGroups[index + 1].id)
                }
            }
        })
        
        setTextGroups(newGroups.filter(g => !groupsToRemove.includes(g.id)))
    }

    const removeSelectedGroups = () => {
        // Si des groupes sont sélectionnés, les supprimer
        if (selectedGroups.size > 0) {
            const remainingGroups = textGroups.filter(g => !selectedGroups.has(g.id))
            if (remainingGroups.length === 0) {
                alert('Vous devez garder au moins un groupe !')
                return
            }
            setTextGroups(remainingGroups)
            setSelectedGroups(new Set()) // Désélectionner tout
        } else {
            // Sinon comportement classique : supprimer le dernier
            if (textGroups.length <= 1) {
                alert('Vous devez garder au moins un groupe !')
                return
            }
            setTextGroups(textGroups.slice(0, -1))
        }
    }

    const updateGroupContent = (groupId, content) => {
        setTextGroups(textGroups.map(group => 
            group.id === groupId ? { ...group, content } : group
        ))
    }

    const togglePreview = () => {
        setShowPreview(!showPreview)
    }

    const printText = () => {
        const printContent = `
            <html>
                <head>
                    <title>${titre || 'Texte de référence'}</title>
                    <style>
                        body { 
                            font-family: ${textFont}, Arial, sans-serif; 
                            font-size: 16px; 
                            line-height: 1.6; 
                            margin: 20px; 
                            color: #333;
                        }
                        .text-group {
                            background: #f8f9fa;
                            border: 2px solid #dee2e6;
                            border-radius: 8px;
                            padding: 15px;
                            margin-bottom: 15px;
                            min-height: 40px;
                            display: flex;
                            align-items: center;
                        }
                        .linebreak {
                            height: 30px;
                            margin-bottom: 15px;
                        }
                        .title {
                            font-size: 24px;
                            font-weight: bold;
                            text-align: center;
                            margin-bottom: 30px;
                            color: #333;
                        }
                        @media print {
                            body { margin: 15px; }
                            .text-group { 
                                break-inside: avoid;
                                page-break-inside: avoid;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="title">${titre || 'Texte de référence'}</div>
                    ${textGroups.map(group => 
                        group.type === 'text' && group.content && group.content.trim() ? 
                            `<div class="text-group">${group.content.trim()}</div>` :
                        group.type === 'linebreak' ? 
                            `<div class="linebreak"></div>` : 
                            ''
                    ).join('')}
                </body>
            </html>
        `
        
        const printWindow = window.open('', '_blank')
        printWindow.document.write(printContent)
        printWindow.document.close()
        printWindow.print()
    }

    const saveText = async () => {
        console.log('=== DÉBUT MODIFICATION ===')
        
        if (!titre.trim()) {
            alert('Veuillez saisir un titre !')
            return
        }
        
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
        
        setIsSaving(true)
        try {
            const token = localStorage.getItem('token')
            
            const response = await fetch(`/api/textes/modifier/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    titre: titre.trim(),
                    groupes_sens: textGroups.map((group, index) => ({
                        ordre_groupe: index + 1,
                        contenu: group.type === 'text' ? group.content.trim() : '',
                        type_groupe: group.type || 'text'
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
                
                alert(`✅ Texte "${titre}" modifié avec succès !\\n${multiSyllableWords.length} mots dans l'entraînement.`)
                
                // Retour à la liste des textes
                setTimeout(() => {
                    router.push('/lire/voir-mes-textes')
                }, 1500)
            } else {
                const error = await response.json()
                throw new Error(error.error || 'Erreur de modification')
            }
        } catch (error) {
            console.error('Erreur modification:', error)
            alert('❌ Erreur : ' + error.message)
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading || isLoadingTexte) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{ color: '#10b981', fontSize: '18px' }}>
                    {isLoadingTexte ? 'Chargement du texte...' : 'Chargement...'}
                </div>
            </div>
        )
    }

    if (!user || !texte) return null

    return (
        <>
            <Head>
                <title>Modifier le Texte - ACLEF</title>
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
                        fontSize: 'clamp(16px, 4vw, 24px)',
                        fontWeight: 'bold',
                        marginBottom: '20px',
                        textAlign: 'center'
                    }}>
                        <span style={{ fontSize: 'clamp(16px, 4vw, 24px)' }}>✏️</span>
                        <span style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Modifier le Texte de Référence
                        </span>
                    </h1>

                    {/* Navigation avec icônes */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '12px',
                        marginBottom: '30px'
                    }}>
                        <button
                            onClick={() => router.push('/lire/voir-mes-textes')}
                            style={{
                                width: '55px',
                                height: '55px',
                                borderRadius: '12px',
                                border: '2px solid #64748b',
                                background: 'white',
                                fontSize: '24px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            ←
                        </button>
                        <button
                            onClick={() => router.push('/lire')}
                            style={{
                                width: '55px',
                                height: '55px',
                                borderRadius: '12px',
                                border: '2px solid #10b981',
                                background: 'white',
                                fontSize: '24px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            📖
                        </button>
                        <button
                            onClick={() => router.push('/dashboard')}
                            style={{
                                width: '55px',
                                height: '55px',
                                borderRadius: '12px',
                                border: '2px solid #8b5cf6',
                                background: 'white',
                                fontSize: '24px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            🏠
                        </button>
                        <button
                            onClick={saveText}
                            disabled={isSaving}
                            style={{
                                width: '55px',
                                height: '55px',
                                borderRadius: '12px',
                                border: '2px solid #3b82f6',
                                background: 'white',
                                fontSize: '24px',
                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: isSaving ? 0.5 : 1
                            }}
                        >
                            💾
                        </button>
                        {!isMobile && (
                            <button
                                onClick={() => window.print()}
                                style={{
                                    width: '55px',
                                    height: '55px',
                                    borderRadius: '12px',
                                    border: '2px solid #f59e0b',
                                    background: 'white',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                🖨️
                            </button>
                        )}
                    </div>

                    {/* Champ titre */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#333'
                        }}>
                            Titre du texte :
                        </label>
                        <input
                            type="text"
                            value={titre}
                            onChange={(e) => setTitre(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '2px solid #dee2e6',
                                borderRadius: '8px',
                                fontSize: '16px',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                            placeholder="Titre de votre texte..."
                        />
                    </div>

                    {/* Contrôles de sélection et style (PC uniquement) */}
                    {!isMobile && (
                        <div style={{
                            background: '#f8f9fa',
                            padding: '20px',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#333' }}>
                                Contrôles ({selectedGroups.size} groupe{selectedGroups.size > 1 ? 's' : ''} sélectionné{selectedGroups.size > 1 ? 's' : ''})
                            </h3>

                            {/* Boutons de sélection + Police/Taille */}
                            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <button
                                    onClick={selectAllGroups}
                                    style={{
                                        padding: '8px 15px',
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ✓ Sélectionner tous
                                </button>
                                <button
                                    onClick={deselectAllGroups}
                                    style={{
                                        padding: '8px 15px',
                                        backgroundColor: '#6c757d',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ✗ Désélectionner tous
                                </button>
                                <div>
                                    <label style={{ marginRight: '10px', fontSize: '14px', fontWeight: '500' }}>
                                        Police :
                                    </label>
                                    <select
                                        value={textFont}
                                        onChange={(e) => {
                                            const newFont = e.target.value
                                            setTextFont(newFont)
                                            localStorage.setItem('textFont', newFont)
                                            // Appliquer à tous les groupes
                                            setTextGroups(textGroups.map(group => ({
                                                ...group,
                                                font: newFont
                                            })))
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
                                            const newSize = e.target.value
                                            setTextSize(newSize)
                                            localStorage.setItem('textSize', newSize)
                                            // Appliquer à tous les groupes
                                            setTextGroups(textGroups.map(group => ({
                                                ...group,
                                                size: newSize
                                            })))
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
                    )}

                    {/* Groupes de texte */}
                    <div style={{ marginBottom: '20px' }}>
                        {textGroups.map((group, index) => (
                            <div key={group.id}>
                                <div style={{ marginBottom: isMobile ? '2px' : '15px' }}>
                                    {group.type === 'text' ? (
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                            {/* Case à cocher (PC uniquement) */}
                                            {!isMobile && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedGroups.has(group.id)}
                                                    onChange={() => toggleGroupSelection(group.id)}
                                                    style={{
                                                        marginTop: '20px',
                                                        transform: 'scale(1.2)',
                                                        cursor: 'pointer'
                                                    }}
                                                />
                                            )}

                                            <div
                                                onClick={isMobile ? () => toggleGroupSelection(group.id) : undefined}
                                                style={{
                                                    flex: 1,
                                                    background: selectedGroups.has(group.id) ? '#e8f5e8' : '#f8f9fa',
                                                    border: selectedGroups.has(group.id) ? '2px solid #10b981' : '2px solid #dee2e6',
                                                    borderRadius: isMobile ? '4px' : '8px',
                                                    padding: isMobile ? '0px' : '10px',
                                                    position: 'relative',
                                                    cursor: isMobile ? 'pointer' : 'default'
                                                }}>
                                                {!isMobile && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '-12px',
                                                        left: '12px',
                                                        background: '#10b981',
                                                        color: 'white',
                                                        padding: '2px 8px',
                                                        borderRadius: '3px',
                                                        fontSize: '12px'
                                                    }}>
                                                        {index + 1}
                                                    </div>
                                                )}
                                                <textarea
                                                    placeholder="Saisissez votre groupe de mots..."
                                                    value={group.content || ''}
                                                    onChange={(e) => updateGroupContent(group.id, e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        minHeight: isMobile ? 'auto' : '60px',
                                                        height: isMobile ? 'auto' : 'auto',
                                                        padding: isMobile ? '0px' : '10px',
                                                        border: 'none',
                                                        outline: 'none',
                                                        resize: 'none',
                                                        fontSize: textSize + 'px',
                                                        fontFamily: textFont,
                                                        background: 'transparent',
                                                        lineHeight: isMobile ? '1.2' : 'normal',
                                                        overflow: 'hidden'
                                                    }}
                                                />
                                            </div>
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
                                
                            </div>
                        ))}
                    </div>

                    {/* Boutons actions mobile - Une seule ligne */}
                    {isMobile && (
                        <div style={{
                            display: 'flex',
                            gap: '8px',
                            justifyContent: 'center',
                            marginBottom: '20px'
                        }}>
                            <button
                                onClick={selectAllGroups}
                                style={{
                                    width: '45px',
                                    height: '45px',
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                ✓
                            </button>
                            <button
                                onClick={deselectAllGroups}
                                style={{
                                    width: '45px',
                                    height: '45px',
                                    backgroundColor: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                ✗
                            </button>
                            <button
                                onClick={addGroup}
                                style={{
                                    width: '45px',
                                    height: '45px',
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                ➕
                            </button>
                            <button
                                onClick={addLineBreak}
                                style={{
                                    width: '45px',
                                    height: '45px',
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                ↵
                            </button>
                            <button
                                onClick={removeSelectedGroups}
                                style={{
                                    width: '45px',
                                    height: '45px',
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                ✕
                            </button>
                            <button
                                onClick={saveText}
                                disabled={isSaving}
                                style={{
                                    width: '45px',
                                    height: '45px',
                                    backgroundColor: 'white',
                                    color: '#3b82f6',
                                    border: '2px solid #3b82f6',
                                    borderRadius: '8px',
                                    fontSize: '20px',
                                    cursor: isSaving ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: isSaving ? 0.5 : 1
                                }}
                            >
                                💾
                            </button>
                        </div>
                    )}

                    {/* Boutons d'actions PC */}
                    {!isMobile && (
                        <div style={{
                            display: 'flex',
                            gap: '10px',
                            flexWrap: 'wrap',
                            marginBottom: '20px',
                            justifyContent: 'center'
                        }}>
                            <button
                                onClick={addGroup}
                                style={{
                                    padding: '12px 20px',
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '15px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                ➕ Ajouter groupe
                            </button>
                            <button
                                onClick={addLineBreak}
                                style={{
                                    padding: '12px 20px',
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '15px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                +↵ Ajouter saut de ligne
                            </button>
                            <button
                                onClick={removeSelectedGroups}
                                style={{
                                    padding: '12px 20px',
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '15px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                {selectedGroups.size > 0
                                    ? `✕ Supprimer sélection (${selectedGroups.size})`
                                    : '✕ Supprimer dernier'
                                }
                            </button>
                            <button
                                onClick={saveText}
                                disabled={isSaving}
                                style={{
                                    padding: '12px 20px',
                                    backgroundColor: isSaving ? '#9ca3af' : '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '15px',
                                    fontWeight: 'bold',
                                    cursor: isSaving ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isSaving ? 'Modification...' : '💾 Sauvegarder'}
                            </button>
                        </div>
                    )}

                    {/* Aperçu */}
                    {showPreview && (
                        <div style={{
                            background: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            padding: '20px',
                            marginBottom: '20px'
                        }}>
                            <h3 style={{ marginBottom: '15px', color: '#333' }}>Aperçu :</h3>
                            <div style={{ 
                                lineHeight: '1.6',
                                fontFamily: textFont,
                                fontSize: textSize + 'px'
                            }}>
                                {textGroups.map((group, index) => (
                                    <div key={group.id}>
                                        {group.type === 'text' && group.content && group.content.trim() && (
                                            <div style={{ marginBottom: '1em' }}>
                                                {group.content.trim()}
                                            </div>
                                        )}
                                        {group.type === 'linebreak' && (
                                            <div style={{ height: '2em' }}></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

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
                            <h3>Résultat de la modification :</h3>
                            <p><strong>{stats.totalWords}</strong> mots au total</p>
                            <p><strong>{stats.multiSyllableWords}</strong> mots multi-syllabes dans l'entraînement</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}