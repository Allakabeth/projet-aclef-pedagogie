import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { convertNumbersInText, capitalizeText } from '../../lib/convertNumbers'

// Import dynamique côté client seulement
const pdfjsLib = typeof window !== 'undefined' ? require('pdfjs-dist') : null
const mammoth = typeof window !== 'undefined' ? require('mammoth') : null
const JSZip = typeof window !== 'undefined' ? require('jszip') : null

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

export default function ImporterTexte() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [textGroups, setTextGroups] = useState([])
    const [isProcessingFile, setIsProcessingFile] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [textFont, setTextFont] = useState('Comic Sans MS')
    const [textSize, setTextSize] = useState('22')
    const [selectedGroups, setSelectedGroups] = useState(new Set())
    const [isMobile, setIsMobile] = useState(false)
    const router = useRouter()

    useEffect(() => {
        // Détection mobile
        setIsMobile(window.innerWidth <= 768)


        // Configurer PDF.js avec CDN seulement côté client
        if (typeof window !== 'undefined' && pdfjsLib) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.149/build/pdf.worker.min.js'
        }
        
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

    // Fonction pour lire un fichier texte
    const readTextFile = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target.result)
            reader.onerror = (e) => reject(e)
            reader.readAsText(file, 'UTF-8')
        })
    }

    // Fonction pour lire un fichier PDF
    const readPdfFile = async (file) => {
        if (!pdfjsLib) {
            throw new Error('PDF.js non disponible côté serveur')
        }
        
        try {
            const arrayBuffer = await file.arrayBuffer()
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
            let text = ''
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i)
                const textContent = await page.getTextContent()
                const pageText = textContent.items.map(item => item.str).join(' ')
                text += pageText + ' '
            }
            
            return text.trim()
        } catch (error) {
            throw new Error('Erreur lors de la lecture du PDF: ' + error.message)
        }
    }

    // Fonction pour lire un fichier Word (.docx)
    const readWordFile = async (file) => {
        if (!mammoth) {
            throw new Error('Mammoth non disponible côté serveur')
        }
        
        try {
            const arrayBuffer = await file.arrayBuffer()
            const result = await mammoth.extractRawText({ arrayBuffer })
            return result.value.trim()
        } catch (error) {
            throw new Error('Erreur lors de la lecture du fichier Word: ' + error.message)
        }
    }

    // Fonction pour lire un fichier OpenOffice (.odt)
    const readOdtFile = async (file) => {
        if (!JSZip) {
            throw new Error('JSZip non disponible côté serveur')
        }
        
        try {
            const arrayBuffer = await file.arrayBuffer()
            const zip = new JSZip()
            const zipFile = await zip.loadAsync(arrayBuffer)
            
            // Le contenu principal est dans content.xml
            const contentFile = zipFile.file('content.xml')
            if (!contentFile) {
                throw new Error('Fichier content.xml introuvable dans le document ODT')
            }
            
            const xmlContent = await contentFile.async('string')
            
            // Parser le XML et extraire le texte
            const parser = new DOMParser()
            const xmlDoc = parser.parseFromString(xmlContent, 'text/xml')
            
            // Extraire tout le texte des éléments text:p (paragraphes)
            const paragraphs = xmlDoc.getElementsByTagName('text:p')
            let text = ''
            
            for (let i = 0; i < paragraphs.length; i++) {
                const paragraphText = paragraphs[i].textContent || ''
                if (paragraphText.trim()) {
                    text += paragraphText.trim() + ' '
                }
            }
            
            return text.trim()
        } catch (error) {
            throw new Error('Erreur lors de la lecture du fichier ODT: ' + error.message)
        }
    }

    // Gestion de l'import de fichier
    const handleFileImport = async (event) => {
        const file = event.target.files[0]
        if (!file) return
        
        setIsProcessingFile(true)
        
        try {
            let text = ''
            
            if (file.type === 'text/plain') {
                text = await readTextFile(file)
            } else if (file.type === 'application/pdf') {
                text = await readPdfFile(file)
            } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                text = await readWordFile(file)
            } else if (file.type === 'application/vnd.oasis.opendocument.text') {
                text = await readOdtFile(file)
            } else {
                throw new Error('Type de fichier non supporté. Utilisez un fichier .txt, .pdf, .docx ou .odt')
            }
            
            if (!text.trim()) {
                throw new Error('Le fichier semble vide')
            }
            
            // Import simple : chaque ligne = un groupe de sens
            const lines = text.split(/\r?\n/)
                .map(line => line.trim())
                .filter(line => line.length > 0)
            
            const groups = lines.map((content, index) => ({
                id: Date.now() + index,
                type: 'text',
                content: content
            }))
            
            if (groups.length === 0) {
                throw new Error('Aucun groupe de sens détecté dans le fichier')
            }
            
            // Créer les groupes
            setTextGroups(groups)
            
            alert(`✅ Fichier importé avec succès !\n${groups.length} groupes de sens créés.`)
            
        } catch (error) {
            console.error('Erreur import:', error)
            alert('❌ Erreur lors de l\'import: ' + error.message)
        } finally {
            setIsProcessingFile(false)
            event.target.value = ''
        }
    }

    // Modifier le contenu d'un groupe
    const updateGroupContent = (id, content) => {
        setTextGroups(textGroups.map(group => 
            group.id === id ? { ...group, content } : group
        ))
    }

    // Supprimer un groupe
    const removeGroup = (id) => {
        if (textGroups.length <= 1) {
            alert('Vous devez garder au moins un groupe !')
            return
        }
        const updatedGroups = textGroups.filter(group => group.id !== id)
        setTextGroups(updatedGroups)
    }

    // Ajouter un nouveau groupe
    const addGroup = () => {
        const newGroup = {
            id: Date.now(),
            type: 'text',
            content: ''
        }
        setTextGroups([...textGroups, newGroup])
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

    // Sauvegarder le texte
    const handleSave = async () => {
        const validGroups = textGroups.filter(group => (group.type === 'text' && group.content && group.content.trim()) || group.type === 'linebreak')
        if (validGroups.length === 0) {
            alert('Veuillez importer un fichier ou saisir au moins un groupe de sens')
            return
        }

        // Extraire les mots et statistiques
        const allWords = []
        const multiSyllableWords = []
        const syllableEngine = new SimpleSyllableEngine()

        validGroups.forEach((group) => {
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

        const titre = prompt('Titre du texte :') || `Texte importé ${new Date().toLocaleDateString()}`

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
                    titre,
                    groupes_sens: validGroups.map((group, index) => ({
                        ordre_groupe: index + 1,
                        contenu: group.type === 'text' ? group.content.trim() : '',
                        type_groupe: group.type || 'text'
                    })),
                    mots_extraits: multiSyllableWords
                })
            })

            if (response.ok) {
                alert(`✅ Texte "${titre}" sauvegardé !\n${multiSyllableWords.length} mots ajoutés à l'entraînement.`)
                router.push('/lire/voir-mes-textes')
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
                <div style={{ color: '#0284c7', fontSize: '18px' }}>Chargement...</div>
            </div>
        )
    }

    if (!user) return null

    return (
        <>
            <Head>
                <title>Importer un Texte - ACLEF</title>
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
                        textAlign: 'center'
                    }}>
                        <span style={{ marginRight: '8px' }}>📂</span>
                        <span style={{
                            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Importer un Texte
                        </span>
                    </h1>

                    {/* Navigation avec icônes */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '12px',
                        marginBottom: '20px'
                    }}>
                        <button
                            onClick={() => router.push('/lire/mes-textes-references')}
                            style={{
                                width: '55px',
                                height: '55px',
                                backgroundColor: 'white',
                                color: '#64748b',
                                border: '2px solid #64748b',
                                borderRadius: '12px',
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
                                backgroundColor: 'white',
                                color: '#10b981',
                                border: '2px solid #10b981',
                                borderRadius: '12px',
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
                                backgroundColor: 'white',
                                color: '#8b5cf6',
                                border: '2px solid #8b5cf6',
                                borderRadius: '12px',
                                fontSize: '24px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            🏠
                        </button>
                        {isMobile && (
                            <button
                                onClick={() => document.getElementById('file-input')?.click()}
                                disabled={isProcessingFile}
                                style={{
                                    width: '55px',
                                    height: '55px',
                                    backgroundColor: 'white',
                                    color: '#0284c7',
                                    border: '2px solid #0284c7',
                                    borderRadius: '12px',
                                    fontSize: '24px',
                                    cursor: isProcessingFile ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: isProcessingFile ? 0.5 : 1
                                }}
                            >
                                📂
                            </button>
                        )}
                    </div>

                    {/* Input file caché */}
                    <input
                        id="file-input"
                        type="file"
                        accept=".txt,.pdf,.docx,.odt"
                        onChange={handleFileImport}
                        disabled={isProcessingFile}
                        lang="fr"
                        title="Parcourir les fichiers"
                        placeholder="Aucun fichier sélectionné"
                        style={{ display: 'none' }}
                    />

                    {/* Zone d'import - PC uniquement */}
                    {!isMobile && (
                        <>
                            <p style={{
                                textAlign: 'center',
                                fontSize: 'clamp(14px, 3vw, 16px)',
                                color: '#666',
                                marginBottom: '20px'
                            }}>
                                Sélectionnez un fichier : chaque ligne deviendra un groupe de sens.
                            </p>

                            <div style={{
                                background: '#e0f2fe',
                                padding: '30px',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                textAlign: 'center'
                            }}>
                                <h3 style={{ marginBottom: '20px', fontSize: '20px', color: '#0284c7' }}>
                                    📎 Choisir un fichier
                                </h3>

                                <label
                                    htmlFor="file-input"
                                    style={{
                                        display: 'inline-block',
                                        marginBottom: '20px',
                                        padding: '15px',
                                        border: '3px solid #0284c7',
                                        borderRadius: '8px',
                                        backgroundColor: 'white',
                                        maxWidth: '400px',
                                        fontSize: '16px',
                                        cursor: isProcessingFile ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Parcourir les fichiers
                                </label>

                                {isProcessingFile && (
                                    <p style={{ color: '#0284c7', fontSize: '18px', fontWeight: 'bold' }}>
                                        ⏳ Lecture du fichier en cours...
                                    </p>
                                )}

                                <p style={{
                                    fontSize: '14px',
                                    color: '#64748b',
                                    marginTop: '15px'
                                }}>
                                    <strong>Formats supportés :</strong> .txt, .pdf, .docx, .odt
                                </p>
                            </div>
                        </>
                    )}

                    {/* Message traitement - Mobile uniquement */}
                    {isMobile && isProcessingFile && (
                        <p style={{
                            color: '#0284c7',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            marginBottom: '20px'
                        }}>
                            ⏳ Lecture du fichier en cours...
                        </p>
                    )}

                    {/* Aperçu et modification des groupes */}
                    {textGroups.length > 0 && (
                        <>
                            <div style={{
                                background: '#f8f9fa',
                                padding: '20px',
                                borderRadius: '8px',
                                marginBottom: '20px'
                            }}>
                                <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#333' }}>
                                    Contrôles ({selectedGroups.size} groupe{selectedGroups.size > 1 ? 's' : ''} sélectionné{selectedGroups.size > 1 ? 's' : ''})
                                </h3>
                                
                                {/* Boutons de sélection */}
                                <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
                                </div>

                                {/* Boutons saut de ligne */}
                                <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={addLineBreakAfterSelected}
                                        disabled={selectedGroups.size === 0}
                                        style={{
                                            padding: '8px 15px',
                                            backgroundColor: selectedGroups.size > 0 ? '#3b82f6' : '#ccc',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: '14px',
                                            cursor: selectedGroups.size > 0 ? 'pointer' : 'not-allowed'
                                        }}
                                    >
                                        +↵ Ajouter saut de ligne
                                    </button>
                                    <button
                                        onClick={removeLineBreakAfterSelected}
                                        disabled={selectedGroups.size === 0}
                                        style={{
                                            padding: '8px 15px',
                                            backgroundColor: selectedGroups.size > 0 ? '#ef4444' : '#ccc',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: '14px',
                                            cursor: selectedGroups.size > 0 ? 'pointer' : 'not-allowed'
                                        }}
                                    >
                                        -↵ Supprimer saut de ligne
                                    </button>
                                </div>

                                {/* Contrôles de police/taille */}
                                <div style={{
                                    display: 'flex',
                                    gap: '20px',
                                    flexWrap: 'wrap',
                                    alignItems: 'center',
                                    marginBottom: '15px'
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
                                            <option value="Verdana">Verdana</option>
                                            <option value="Comic Sans MS">Comic Sans MS</option>
                                            <option value="Trebuchet MS">Trebuchet MS</option>
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

                                <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#333' }}>
                                    Groupes importés ({textGroups.length})
                                </h3>

                                {textGroups.map((group, index) => (
                                    <div key={group.id} style={{ marginBottom: '15px' }}>
                                        {group.type === 'text' ? (
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                                {/* Case à cocher */}
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
                                                
                                                <div style={{
                                                    flex: 1,
                                                    padding: '15px',
                                                    backgroundColor: selectedGroups.has(group.id) ? '#e8f5e8' : 'white',
                                                    borderRadius: '8px',
                                                    border: selectedGroups.has(group.id) ? '2px solid #10b981' : '2px solid #e2e8f0'
                                                }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        marginBottom: '10px'
                                                    }}>
                                                        <label style={{
                                                            fontSize: '14px',
                                                            fontWeight: 'bold',
                                                            color: '#0284c7'
                                                        }}>
                                                            Groupe {index + 1}
                                                        </label>
                                                        {textGroups.length > 1 && (
                                                            <button
                                                                onClick={() => removeGroup(group.id)}
                                                                style={{
                                                                    backgroundColor: '#ef4444',
                                                                    color: 'white',
                                                                    padding: '5px 10px',
                                                                    border: 'none',
                                                                    borderRadius: '4px',
                                                                    fontSize: '12px',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                ❌ Supprimer
                                                            </button>
                                                        )}
                                                    </div>
                                                    <textarea
                                                        value={group.content}
                                                        onChange={(e) => updateGroupContent(group.id, e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            minHeight: '80px',
                                                            padding: '12px',
                                                            borderRadius: '6px',
                                                            border: '2px solid #e5e7eb',
                                                            fontSize: textSize + 'px',
                                                            fontFamily: textFont,
                                                            lineHeight: '1.5',
                                                            resize: 'none'
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
                                ))}

                                <button
                                    onClick={addGroup}
                                    style={{
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        padding: '10px 20px',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ➕ Ajouter un groupe
                                </button>
                            </div>

                            {/* Bouton de sauvegarde */}
                            <div style={{
                                textAlign: 'center',
                                marginBottom: '20px'
                            }}>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    style={{
                                        backgroundColor: '#0284c7',
                                        color: 'white',
                                        padding: '15px 30px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '18px',
                                        fontWeight: 'bold',
                                        cursor: isSaving ? 'not-allowed' : 'pointer',
                                        opacity: isSaving ? 0.5 : 1
                                    }}
                                >
                                    {isSaving ? '⏳ Sauvegarde...' : '💾 Sauvegarder le texte'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    )
}