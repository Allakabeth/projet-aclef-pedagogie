import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import dynamic from 'next/dynamic'

// Import dynamique côté client seulement
const pdfjsLib = typeof window !== 'undefined' ? require('pdfjs-dist') : null
const mammoth = typeof window !== 'undefined' ? require('mammoth') : null
const JSZip = typeof window !== 'undefined' ? require('jszip') : null

// Moteur de syllables simplifié basé sur votre code HTML
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
        
        // Règle simple basée sur votre code
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

export default function CreerTexte() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [textGroups, setTextGroups] = useState([])
    const [groupCounter, setGroupCounter] = useState(0)
    const [showPreview, setShowPreview] = useState(false)
    const [stats, setStats] = useState({ totalWords: 0, multiSyllableWords: 0 })
    const [isSaving, setIsSaving] = useState(false)
    const [textFont, setTextFont] = useState('Arial')
    const [textSize, setTextSize] = useState('18')
    const [showImport, setShowImport] = useState(false)
    const [isProcessingFile, setIsProcessingFile] = useState(false)
    const [importedText, setImportedText] = useState('')
    const [showTextEditor, setShowTextEditor] = useState(false)
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const [mediaRecorder, setMediaRecorder] = useState(null)
    const [recordedText, setRecordedText] = useState('')
    const [recognition, setRecognition] = useState(null)
    const [speechSupported, setSpeechSupported] = useState(false)
    const router = useRouter()

    useEffect(() => {
        // Configurer PDF.js avec CDN seulement côté client
        if (typeof window !== 'undefined' && pdfjsLib) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.149/build/pdf.worker.min.js'
        }
        
        // Vérifier le support de la reconnaissance vocale
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
            setSpeechSupported(!!SpeechRecognition)
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

    const togglePreview = () => {
        setShowPreview(!showPreview)
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
                
                alert(`✅ Texte "${titre}" sauvegardé !\\n${multiSyllableWords.length} mots ajoutés à l'entraînement.`)
                
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

    // Fonction pour découper automatiquement un texte en groupes
    const autoSegmentText = (text) => {
        // Nettoyer le texte et remplacer les retours à la ligne par des espaces
        let cleanText = text.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim()
        
        // Découper par phrases (points, points d'exclamation, points d'interrogation)
        const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim())
        
        const groups = []
        let groupId = 1
        let currentGroup = ''
        
        for (const sentence of sentences) {
            const cleanSentence = sentence.trim()
            if (!cleanSentence) continue
            
            // Ajouter la ponctuation si ce n'est pas la dernière phrase
            const sentenceWithPunct = cleanSentence + '.'
            
            // Si le groupe actuel + la phrase suivante fait moins de 120 caractères, les regrouper
            if (currentGroup && (currentGroup + ' ' + sentenceWithPunct).length < 120) {
                currentGroup += ' ' + sentenceWithPunct
            } else {
                // Sauver le groupe précédent s'il existe
                if (currentGroup) {
                    groups.push({
                        id: groupId++,
                        content: currentGroup.trim(),
                        ordre: groups.length
                    })
                }
                currentGroup = sentenceWithPunct
            }
        }
        
        // Ajouter le dernier groupe
        if (currentGroup) {
            groups.push({
                id: groupId++,
                content: currentGroup.trim(),
                ordre: groups.length
            })
        }
        
        // Si on n'a qu'un seul très long groupe, essayer de le diviser par virgules ou points-virgules
        if (groups.length === 1 && groups[0].content.length > 150) {
            const longGroup = groups[0].content
            const subParts = longGroup.split(/[;,]+/).filter(part => part.trim())
            
            if (subParts.length > 1) {
                const newGroups = []
                let newGroupId = 1
                let tempGroup = ''
                
                for (const part of subParts) {
                    const cleanPart = part.trim()
                    if (!cleanPart) continue
                    
                    if (tempGroup && (tempGroup + ', ' + cleanPart).length < 100) {
                        tempGroup += ', ' + cleanPart
                    } else {
                        if (tempGroup) {
                            newGroups.push({
                                id: newGroupId++,
                                content: tempGroup,
                                ordre: newGroups.length
                            })
                        }
                        tempGroup = cleanPart
                    }
                }
                
                if (tempGroup) {
                    newGroups.push({
                        id: newGroupId++,
                        content: tempGroup,
                        ordre: newGroups.length
                    })
                }
                
                if (newGroups.length > 1) {
                    return newGroups
                }
            }
        }
        
        return groups
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
                content: content,
                ordre: index
            }))
            
            if (groups.length === 0) {
                throw new Error('Aucun groupe de sens détecté dans le fichier')
            }
            
            // Remplacer les groupes existants
            setTextGroups(groups)
            setGroupCounter(groups.length)
            setShowImport(false)
            
            alert(`✅ Fichier importé avec succès !\\n${groups.length} groupes de sens créés.`)
            
        } catch (error) {
            console.error('Erreur import:', error)
            alert('❌ Erreur lors de l\'import: ' + error.message)
        } finally {
            setIsProcessingFile(false)
            event.target.value = ''
        }
    }

    // Fonction pour diviser manuellement le texte en groupes
    const createGroupsFromText = () => {
        if (!importedText.trim()) return
        
        // Diviser le texte par les doubles retours à la ligne (séparateur de groupes)
        const groups = importedText
            .split(/\n\n+/) // Double retour à la ligne ou plus
            .map(group => group.trim())
            .filter(group => group.length > 0)
            .map((content, index) => ({
                id: index + 1,
                content: content.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim(),
                ordre: index
            }))
        
        if (groups.length === 0) {
            alert('Aucun groupe détecté. Utilisez des doubles retours à la ligne pour séparer les groupes.')
            return
        }
        
        // Remplacer les groupes existants
        setTextGroups(groups)
        setGroupCounter(groups.length)
        setShowTextEditor(false)
        setImportedText('')
        
        alert(`✅ ${groups.length} groupes de sens créés !`)
    }

    // Annuler l'édition de texte
    const cancelTextEditor = () => {
        setShowTextEditor(false)
        setImportedText('')
    }

    // Initialiser la reconnaissance vocale
    const initSpeechRecognition = () => {
        if (typeof window === 'undefined') {
            return null
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        
        if (!SpeechRecognition) {
            alert('Désolé, votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Chrome, Edge ou Safari.')
            return null
        }
        
        const recognition = new SpeechRecognition()
        
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'fr-FR'
        
        recognition.onresult = (event) => {
            let finalTranscript = ''
            let interimTranscript = ''
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' '
                } else {
                    interimTranscript += transcript
                }
            }
            
            setRecordedText(prev => {
                const newText = prev + finalTranscript
                return newText
            })
        }
        
        recognition.onerror = (event) => {
            console.error('Erreur reconnaissance vocale:', event.error)
            if (event.error === 'not-allowed') {
                alert('Accès au microphone refusé. Veuillez autoriser l\'accès au microphone.')
            }
        }
        
        recognition.onend = () => {
            setIsRecording(false)
        }
        
        return recognition
    }

    // Démarrer l'enregistrement vocal
    const startVoiceRecording = () => {
        const speechRecognition = initSpeechRecognition()
        if (!speechRecognition) return
        
        setRecognition(speechRecognition)
        setRecordedText('')
        setIsRecording(true)
        
        try {
            speechRecognition.start()
        } catch (error) {
            console.error('Erreur démarrage reconnaissance:', error)
            alert('Erreur lors du démarrage de la reconnaissance vocale')
            setIsRecording(false)
        }
    }

    // Arrêter l'enregistrement vocal
    const stopVoiceRecording = () => {
        if (recognition) {
            recognition.stop()
        }
        setIsRecording(false)
    }

    // Créer des groupes depuis l'enregistrement vocal
    const createGroupsFromVoiceText = () => {
        if (!recordedText.trim()) {
            alert('Aucun texte enregistré à diviser')
            return
        }
        
        // Utiliser la même logique que l'éditeur de texte
        const groups = recordedText
            .split(/\n\n+/)
            .map(group => group.trim())
            .filter(group => group.length > 0)
            .map((content, index) => ({
                id: Date.now() + index,
                type: 'text',
                content: content.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
            }))
        
        if (groups.length === 0) {
            alert('Aucun groupe détecté. Le texte sera créé comme un seul groupe.')
            const singleGroup = [{
                id: Date.now(),
                type: 'text',
                content: recordedText.trim()
            }]
            setTextGroups(singleGroup)
            setGroupCounter(1)
        } else {
            setTextGroups(groups)
            setGroupCounter(groups.length)
        }
        
        setShowVoiceRecorder(false)
        setRecordedText('')
        
        alert(`✅ Texte vocal converti en ${groups.length || 1} groupe(s) de sens !`)
    }

    // Annuler l'enregistrement vocal
    const cancelVoiceRecorder = () => {
        if (isRecording && recognition) {
            recognition.stop()
        }
        setShowVoiceRecorder(false)
        setRecordedText('')
        setIsRecording(false)
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
                <title>Créer un Texte de Référence - ACLEF</title>
                <style jsx>{`
                    @keyframes pulse {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.05); }
                        100% { transform: scale(1); }
                    }
                `}</style>
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
                        📝 Créer un Texte de Référence
                    </h1>

                    <p style={{
                        textAlign: 'center',
                        fontSize: 'clamp(14px, 3vw, 16px)',
                        color: '#666',
                        marginBottom: '20px'
                    }}>
                        <strong>3 façons de créer votre texte :</strong><br/>
                        📁 Importez un fichier • 🎤 Enregistrez-vous • ✍️ Saisissez manuellement<br/>
                        <em>Les mots multi-syllabes iront automatiquement dans l'entraînement.</em>
                    </p>

                    {/* Zone d'import de fichiers */}
                    <div style={{
                        background: '#e0f2fe',
                        padding: '20px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        textAlign: 'center'
                    }}>
                        <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#0284c7' }}>
                            📎 Importer un fichier
                        </h3>
                        
                        {!showImport ? (
                            <button
                                onClick={() => setShowImport(true)}
                                style={{
                                    backgroundColor: '#0284c7',
                                    color: 'white',
                                    padding: '12px 25px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#0369a1'}
                                onMouseOut={(e) => e.target.style.backgroundColor = '#0284c7'}
                            >
                                📁 Importer un fichier (.txt, .pdf, .docx, .odt)
                            </button>
                        ) : (
                            <div>
                                <p style={{ marginBottom: '15px', color: '#0369a1' }}>
                                    Sélectionnez un fichier texte (.txt), PDF (.pdf), Word (.docx) ou OpenOffice (.odt)
                                </p>
                                <input
                                    type="file"
                                    accept=".txt,.pdf,.docx,.odt"
                                    onChange={handleFileImport}
                                    disabled={isProcessingFile}
                                    style={{
                                        marginBottom: '15px',
                                        padding: '10px',
                                        border: '2px dashed #0284c7',
                                        borderRadius: '8px',
                                        backgroundColor: 'white',
                                        width: '100%',
                                        maxWidth: '400px'
                                    }}
                                />
                                <br />
                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                    <button
                                        onClick={() => setShowImport(false)}
                                        disabled={isProcessingFile}
                                        style={{
                                            backgroundColor: '#6b7280',
                                            color: 'white',
                                            padding: '8px 20px',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            cursor: isProcessingFile ? 'not-allowed' : 'pointer',
                                            opacity: isProcessingFile ? 0.5 : 1
                                        }}
                                    >
                                        Annuler
                                    </button>
                                </div>
                                {isProcessingFile && (
                                    <p style={{ color: '#0284c7', marginTop: '10px' }}>
                                        ⏳ Traitement du fichier en cours...
                                    </p>
                                )}
                            </div>
                        )}
                        
                        <p style={{ 
                            fontSize: '12px', 
                            color: '#64748b', 
                            marginTop: '10px',
                            fontStyle: 'italic'
                        }}>
                            Chaque ligne du fichier deviendra un groupe de sens
                        </p>
                    </div>

                    {/* Zone d'enregistrement vocal */}
                    {speechSupported ? (
                        <div style={{
                            background: '#f0fff4',
                            padding: '20px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            textAlign: 'center'
                        }}>
                        <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#059669' }}>
                            🎤 Enregistrement vocal
                        </h3>
                        
                        {!showVoiceRecorder ? (
                            <button
                                onClick={() => setShowVoiceRecorder(true)}
                                style={{
                                    backgroundColor: '#059669',
                                    color: 'white',
                                    padding: '12px 25px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#047857'}
                                onMouseOut={(e) => e.target.style.backgroundColor = '#059669'}
                            >
                                🎙️ Créer un texte en parlant
                            </button>
                        ) : (
                            <div>
                                <p style={{ marginBottom: '15px', color: '#047857' }}>
                                    Parlez clairement et séparez vos groupes de sens par des pauses
                                </p>
                                
                                {/* Interface d'enregistrement */}
                                <div style={{
                                    background: 'white',
                                    padding: '20px',
                                    borderRadius: '8px',
                                    marginBottom: '15px',
                                    border: '2px solid #059669'
                                }}>
                                    <div style={{ marginBottom: '15px' }}>
                                        {!isRecording ? (
                                            <button
                                                onClick={startVoiceRecording}
                                                style={{
                                                    backgroundColor: '#ef4444',
                                                    color: 'white',
                                                    padding: '15px 30px',
                                                    border: 'none',
                                                    borderRadius: '50px',
                                                    fontSize: '18px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
                                                }}
                                            >
                                                🎤 Démarrer l'enregistrement
                                            </button>
                                        ) : (
                                            <button
                                                onClick={stopVoiceRecording}
                                                style={{
                                                    backgroundColor: '#059669',
                                                    color: 'white',
                                                    padding: '15px 30px',
                                                    border: 'none',
                                                    borderRadius: '50px',
                                                    fontSize: '18px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    animation: 'pulse 2s infinite',
                                                    boxShadow: '0 4px 15px rgba(5, 150, 105, 0.5)'
                                                }}
                                            >
                                                ⏹️ Arrêter l'enregistrement
                                            </button>
                                        )}
                                    </div>
                                    
                                    {/* Texte transcrit en temps réel */}
                                    {(recordedText || isRecording) && (
                                        <div style={{
                                            background: '#f8fafc',
                                            padding: '15px',
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0',
                                            minHeight: '100px',
                                            textAlign: 'left'
                                        }}>
                                            <p style={{ 
                                                margin: '0 0 10px 0', 
                                                fontSize: '14px', 
                                                fontWeight: 'bold', 
                                                color: '#059669' 
                                            }}>
                                                Texte transcrit {isRecording ? '(en cours...)' : ''}:
                                            </p>
                                            <div style={{
                                                fontSize: '16px',
                                                lineHeight: '1.5',
                                                color: '#374151',
                                                whiteSpace: 'pre-wrap'
                                            }}>
                                                {recordedText || 'En attente de votre voix...'}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Boutons d'actions */}
                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    {recordedText && !isRecording && (
                                        <>
                                            <button
                                                onClick={createGroupsFromVoiceText}
                                                style={{
                                                    backgroundColor: '#059669',
                                                    color: 'white',
                                                    padding: '12px 25px',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '16px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ✅ Créer les groupes de sens
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setImportedText(recordedText)
                                                    setShowTextEditor(true)
                                                    setShowVoiceRecorder(false)
                                                }}
                                                style={{
                                                    backgroundColor: '#3b82f6',
                                                    color: 'white',
                                                    padding: '12px 25px',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '16px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ✂️ Découper manuellement
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={cancelVoiceRecorder}
                                        disabled={isRecording}
                                        style={{
                                            backgroundColor: '#6b7280',
                                            color: 'white',
                                            padding: '12px 25px',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            cursor: isRecording ? 'not-allowed' : 'pointer',
                                            opacity: isRecording ? 0.5 : 1
                                        }}
                                    >
                                        ❌ Annuler
                                    </button>
                                </div>
                            </div>
                        )}
                        
                            <p style={{ 
                                fontSize: '12px', 
                                color: '#64748b', 
                                marginTop: '10px',
                                fontStyle: 'italic'
                            }}>
                                Utilisez Chrome ou Edge pour une meilleure reconnaissance vocale
                            </p>
                        </div>
                    ) : (
                        <div style={{
                            background: '#f3f4f6',
                            padding: '20px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            textAlign: 'center'
                        }}>
                            <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#6b7280' }}>
                                🎤 Enregistrement vocal
                            </h3>
                            <p style={{ color: '#6b7280', marginBottom: '15px' }}>
                                La reconnaissance vocale n'est pas disponible sur votre navigateur
                            </p>
                            <p style={{ 
                                fontSize: '14px', 
                                color: '#6b7280',
                                fontStyle: 'italic'
                            }}>
                                Utilisez Chrome, Edge ou Safari pour accéder à cette fonctionnalité
                            </p>
                        </div>
                    )}

                    {/* Zone de saisie manuelle */}
                    <div style={{
                        background: '#fff7ed',
                        padding: '20px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        textAlign: 'center'
                    }}>
                        <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#ea580c' }}>
                            ✍️ Saisie manuelle
                        </h3>
                        
                        <button
                            onClick={() => {
                                setImportedText('')
                                setShowTextEditor(true)
                            }}
                            style={{
                                backgroundColor: '#ea580c',
                                color: 'white',
                                padding: '12px 25px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#c2410c'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#ea580c'}
                        >
                            📝 Taper du texte à découper
                        </button>
                        
                        <p style={{ 
                            fontSize: '12px', 
                            color: '#64748b', 
                            marginTop: '10px',
                            fontStyle: 'italic'
                        }}>
                            Saisissez votre texte puis découpez-le en groupes de sens
                        </p>
                    </div>

                    {/* Éditeur de texte pour division en groupes */}
                    {showTextEditor && (
                        <div style={{
                            background: '#fff3cd',
                            padding: '20px',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#856404' }}>
                                ✂️ Diviser le texte en groupes de sens
                            </h3>
                            
                            <div style={{
                                background: 'white',
                                padding: '15px',
                                borderRadius: '8px',
                                marginBottom: '15px',
                                border: '2px solid #ffc107'
                            }}>
                                <p style={{ marginBottom: '10px', color: '#856404', fontWeight: 'bold' }}>
                                    Instructions :
                                </p>
                                <p style={{ marginBottom: '15px', fontSize: '14px', color: '#6c757d' }}>
                                    • Éditez le texte ci-dessous<br/>
                                    • Séparez chaque groupe de sens par une <strong>ligne vide</strong> (double retour à la ligne)<br/>
                                    • Un groupe de sens = une idée ou phrase complète
                                </p>
                                
                                <textarea
                                    value={importedText}
                                    onChange={(e) => setImportedText(e.target.value)}
                                    style={{
                                        width: '100%',
                                        minHeight: '300px',
                                        padding: '15px',
                                        border: '2px solid #dee2e6',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        fontFamily: textFont,
                                        lineHeight: '1.5',
                                        resize: 'vertical'
                                    }}
                                    placeholder="Collez votre texte ici et séparez les groupes de sens par des lignes vides..."
                                />
                            </div>
                            
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <button
                                    onClick={createGroupsFromText}
                                    style={{
                                        backgroundColor: '#28a745',
                                        color: 'white',
                                        padding: '12px 25px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ✅ Créer les groupes de sens
                                </button>
                                
                                <button
                                    onClick={cancelTextEditor}
                                    style={{
                                        backgroundColor: '#6c757d',
                                        color: 'white',
                                        padding: '12px 25px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ❌ Annuler
                                </button>
                            </div>
                        </div>
                    )}

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
                                    onChange={(e) => setTextFont(e.target.value)}
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
                                    onChange={(e) => setTextSize(e.target.value)}
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
                                                minHeight: '60px',
                                                padding: '10px',
                                                border: 'none',
                                                outline: 'none',
                                                resize: 'vertical',
                                                fontSize: '16px',
                                                background: 'transparent'
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
                            onClick={addGroup}
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
                            onClick={addLineBreak}
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
                            onClick={removeLastGroup}
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
                            onClick={saveText}
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
                        <button
                            onClick={togglePreview}
                            style={{
                                padding: '15px 25px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            👁️ Aperçu
                        </button>
                    </div>

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
                            <h3>Résultat de la sauvegarde :</h3>
                            <p><strong>{stats.totalWords}</strong> mots au total</p>
                            <p><strong>{stats.multiSyllableWords}</strong> mots multi-syllabes ajoutés à l'entraînement</p>
                        </div>
                    )}

                    {/* Bouton retour */}
                    <div style={{ textAlign: 'center', marginTop: '30px' }}>
                        <button
                            onClick={() => router.push('/lire/mes-textes-references')}
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