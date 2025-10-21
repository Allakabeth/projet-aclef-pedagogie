# 🎤 PLAN TECHNIQUE - Enregistrement Vocal des Groupes de Sens

**Date :** 21 janvier 2025
**Objectif :** Permettre aux apprenants d'enregistrer leur propre voix pour chaque groupe de sens

---

## 📋 Cahier des Charges

### Besoins validés

1. ✅ **Emplacement :** Bouton d'enregistrement à côté du bouton 🎤 de lecture TTS
2. ✅ **Granularité :** Par groupe de sens (1 enregistrement par groupe)
3. ✅ **Stockage :** Supabase Storage (fichiers audio en cloud)
4. ✅ **Interface :** 2 boutons distincts - 🎤 TTS et 🎵 Mon enregistrement
5. ✅ **Gestion :** Possibilité de ré-enregistrer (écrase l'ancien fichier)

---

## 🏭️ Architecture Technique

### 1. Base de Données - Nouvelle Table

**Nom :** `enregistrements_groupes`

```sql
CREATE TABLE enregistrements_groupes (
    id SERIAL PRIMARY KEY,
    groupe_sens_id INTEGER NOT NULL REFERENCES groupes_sens(id) ON DELETE CASCADE,
    apprenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    audio_url TEXT NOT NULL,           -- Chemin Supabase Storage
    duree_secondes DECIMAL(10,2),      -- Durée de l'enregistrement
    taille_bytes INTEGER,              -- Taille du fichier
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Un seul enregistrement par apprenant par groupe
    UNIQUE(groupe_sens_id, apprenant_id)
);

-- Index pour performances
CREATE INDEX idx_enregistrements_groupes_apprenant
ON enregistrements_groupes(apprenant_id);

CREATE INDEX idx_enregistrements_groupes_groupe
ON enregistrements_groupes(groupe_sens_id);
```

**Localisation du fichier SQL :** `/supabase/migrations/[timestamp]_create_enregistrements_groupes.sql`

---

### 2. Supabase Storage - Bucket

**Nom du bucket :** `enregistrements-audio`

**Configuration :**
```javascript
{
  name: 'enregistrements-audio',
  public: false,  // Fichiers privés, accessibles uniquement par propriétaire
  fileSizeLimit: 10485760,  // 10 MB max par fichier
  allowedMimeTypes: ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/mpeg']
}
```

**Structure des fichiers :**
```
enregistrements-audio/
  └── [apprenant_id]/
      └── [texte_id]/
          └── groupe_[groupe_id].webm
```

**Exemple :** `abc123-def456/27/groupe_158.webm`

**Politique RLS (Row Level Security) :**
```sql
-- Les apprenants peuvent lire/écrire uniquement LEURS enregistrements
CREATE POLICY "Users can upload their own recordings"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'enregistrements-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read their own recordings"
ON storage.objects FOR SELECT
USING (bucket_id = 'enregistrements-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own recordings"
ON storage.objects FOR DELETE
USING (bucket_id = 'enregistrements-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

### 3. APIs Backend (Next.js)

#### **API 1 : Upload Audio**

**Fichier :** `/pages/api/enregistrements/upload.js`

**Route :** `POST /api/enregistrements/upload`

**Input (multipart/form-data) :**
```javascript
{
  groupe_sens_id: 158,
  audio: File (blob WebM)
}
```

**Headers :**
```javascript
Authorization: Bearer [jwt_token]
```

**Processus :**
1. Vérifier authentification (JWT)
2. Valider le fichier audio (type, taille)
3. Récupérer `apprenant_id` depuis token
4. Récupérer `texte_id` depuis `groupe_sens_id` (join BDD)
5. Construire le chemin : `[apprenant_id]/[texte_id]/groupe_[groupe_id].webm`
6. **SI enregistrement existe déjà :**
   - Supprimer l'ancien fichier dans Storage
   - Supprimer l'ancienne entrée BDD
7. Uploader le nouveau fichier dans Supabase Storage
8. Insérer dans table `enregistrements_groupes`
9. Retourner l'URL publique signée (expires 1 heure)

**Output (JSON) :**
```javascript
{
  success: true,
  enregistrement: {
    id: 42,
    groupe_sens_id: 158,
    audio_url: "https://[supabase].storage/enregistrements-audio/...",
    duree_secondes: 3.5,
    taille_bytes: 45120,
    created_at: "2025-01-21T15:30:00Z"
  }
}
```

---

#### **API 2 : Récupérer Enregistrements d'un Texte**

**Fichier :** `/pages/api/enregistrements/list.js`

**Route :** `GET /api/enregistrements/list?texte_id=27`

**Headers :**
```javascript
Authorization: Bearer [jwt_token]
```

**Processus :**
1. Vérifier authentification
2. Récupérer `apprenant_id` depuis token
3. Requête SQL :
```sql
SELECT e.*, g.ordre_groupe
FROM enregistrements_groupes e
JOIN groupes_sens g ON e.groupe_sens_id = g.id
WHERE g.texte_reference_id = $1
  AND e.apprenant_id = $2
ORDER BY g.ordre_groupe
```
4. Générer URLs signées (expires 1 heure) pour chaque enregistrement

**Output (JSON) :**
```javascript
{
  success: true,
  enregistrements: [
    {
      id: 42,
      groupe_sens_id: 158,
      audio_url: "https://[signed-url]",  // URL signée temporaire
      duree_secondes: 3.5,
      created_at: "2025-01-21T15:30:00Z"
    },
    // ...
  ]
}
```

---

#### **API 3 : Supprimer Enregistrement**

**Fichier :** `/pages/api/enregistrements/delete.js`

**Route :** `DELETE /api/enregistrements/delete/[id]`

**Headers :**
```javascript
Authorization: Bearer [jwt_token]
```

**Processus :**
1. Vérifier authentification
2. Vérifier que l'enregistrement appartient bien à l'apprenant connecté
3. Supprimer le fichier de Supabase Storage
4. Supprimer l'entrée dans `enregistrements_groupes`

**Output (JSON) :**
```javascript
{
  success: true,
  message: "Enregistrement supprimé"
}
```

---

### 4. Frontend - Modification de `/lire/texte/[id].js`

#### **Nouveaux états React**

```javascript
const [enregistrements, setEnregistrements] = useState({}) // { groupeId: { audio_url, duree } }
const [isRecording, setIsRecording] = useState(false)
const [recordingGroupeId, setRecordingGroupeId] = useState(null)
const [mediaRecorder, setMediaRecorder] = useState(null)
const [audioChunks, setAudioChunks] = useState([])
const [recordingDuration, setRecordingDuration] = useState(0) // Compteur temps
const [isUploading, setIsUploading] = useState(false)
```

#### **Nouvelles fonctions**

##### **`loadEnregistrements()`**
```javascript
// Charger tous les enregistrements du texte au montage
const loadEnregistrements = async () => {
  const token = localStorage.getItem('token')
  const response = await fetch(`/api/enregistrements/list?texte_id=${id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const data = await response.json()

  // Transformer en map { groupeId: enregistrement }
  const enregMap = {}
  data.enregistrements.forEach(enreg => {
    enregMap[enreg.groupe_sens_id] = enreg
  })
  setEnregistrements(enregMap)
}
```

##### **`startRecording(groupeId)`**
```javascript
const startRecording = async (groupeId) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })

    const chunks = []
    recorder.ondataavailable = (e) => chunks.push(e.data)

    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      await uploadEnregistrement(groupeId, blob)
      stream.getTracks().forEach(track => track.stop())
    }

    setMediaRecorder(recorder)
    setAudioChunks([])
    setRecordingGroupeId(groupeId)
    setIsRecording(true)

    recorder.start()

    // Démarrer compteur
    startRecordingTimer()

  } catch (error) {
    console.error('Erreur accès micro:', error)
    alert('Impossible d\'accéder au microphone. Vérifiez les permissions.')
  }
}
```

##### **`stopRecording()`**
```javascript
const stopRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
    setIsRecording(false)
    setRecordingDuration(0)
  }
}
```

##### **`uploadEnregistrement(groupeId, audioBlob)`**
```javascript
const uploadEnregistrement = async (groupeId, audioBlob) => {
  setIsUploading(true)

  try {
    const formData = new FormData()
    formData.append('groupe_sens_id', groupeId)
    formData.append('audio', audioBlob, `groupe_${groupeId}.webm`)

    const token = localStorage.getItem('token')
    const response = await fetch('/api/enregistrements/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })

    if (!response.ok) throw new Error('Upload échoué')

    const data = await response.json()

    // Mettre à jour l'état local
    setEnregistrements(prev => ({
      ...prev,
      [groupeId]: data.enregistrement
    }))

    alert('✅ Enregistrement sauvegardé !')

  } catch (error) {
    console.error('Erreur upload:', error)
    alert('❌ Erreur lors de la sauvegarde')
  } finally {
    setIsUploading(false)
    setRecordingGroupeId(null)
  }
}
```

##### **`playEnregistrement(groupeId)`**
```javascript
const playEnregistrement = async (groupeId) => {
  const enreg = enregistrements[groupeId]
  if (!enreg) return

  // Arrêter toute lecture en cours
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
  }

  const audio = new Audio(enreg.audio_url)
  setCurrentAudio(audio)
  setSpeaking(true)
  setCurrentSpeaking(groupeId)

  audio.onended = () => {
    setSpeaking(false)
    setCurrentSpeaking(null)
    setCurrentAudio(null)
  }

  await audio.play()
}
```

#### **Nouveau rendu JSX (pour chaque groupe)**

**Emplacement :** Ligne ~578 (dans le map des groupes)

```jsx
<div style={{
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '15px'
}}>
  {/* Texte du groupe */}
  <div style={{ ... }}>
    {groupe.contenu}
  </div>

  {/* Boutons audio */}
  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>

    {/* Bouton TTS (existant) */}
    <button
      onClick={() => lireTexte(groupe.contenu, groupe.id)}
      disabled={isGeneratingAudio || isRecording}
      style={{ ... }}
      title="Lecture TTS (ElevenLabs ou Web Speech)"
    >
      {speaking && currentSpeaking === groupe.id ? '⏹️' :
       isGeneratingAudio && currentSpeaking === groupe.id ? '⏳' :
       getCachedAudio(groupe.contenu, selectedVoice) ? '💾' : '🎤'}
    </button>

    {/* Bouton ENREGISTRER */}
    {isRecording && recordingGroupeId === groupe.id ? (
      // Mode enregistrement en cours
      <button
        onClick={stopRecording}
        style={{
          backgroundColor: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '14px',
          cursor: 'pointer',
          minWidth: '80px',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}
        title="Arrêter l'enregistrement"
      >
        ⏹️ {recordingDuration}s
      </button>
    ) : (
      // Mode normal
      <button
        onClick={() => startRecording(groupe.id)}
        disabled={isRecording || speaking || isUploading}
        style={{
          backgroundColor: enregistrements[groupe.id] ? '#f59e0b' : '#dc2626',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '14px',
          cursor: isRecording || speaking || isUploading ? 'not-allowed' : 'pointer',
          opacity: isRecording || speaking || isUploading ? 0.5 : 1,
          minWidth: '45px'
        }}
        title={enregistrements[groupe.id] ?
          'Ré-enregistrer (écrasera l\'ancien)' :
          'Enregistrer ma voix'
        }
      >
        🔴
      </button>
    )}

    {/* Bouton LIRE MON ENREGISTREMENT (si existe) */}
    {enregistrements[groupe.id] && !isRecording && (
      <button
        onClick={() => playEnregistrement(groupe.id)}
        disabled={speaking || isRecording || isUploading}
        style={{
          backgroundColor: speaking && currentSpeaking === groupe.id ? '#ef4444' : '#8b5cf6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '14px',
          cursor: speaking || isRecording || isUploading ? 'not-allowed' : 'pointer',
          opacity: speaking || isRecording || isUploading ? 0.5 : 1,
          minWidth: '45px'
        }}
        title={`Écouter mon enregistrement (${enregistrements[groupe.id].duree_secondes}s)`}
      >
        {speaking && currentSpeaking === groupe.id ? '⏹️' : '🎵'}
      </button>
    )}

  </div>
</div>

{/* Indicateur upload en cours */}
{isUploading && recordingGroupeId === groupe.id && (
  <div style={{
    marginTop: '8px',
    fontSize: '12px',
    color: '#f59e0b',
    textAlign: 'right'
  }}>
    ⏳ Sauvegarde en cours...
  </div>
)}
```

#### **Animation CSS (à ajouter)**

```jsx
<style jsx>{`
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`}</style>
```

---

### 5. Permissions Navigateur

**Gestion des permissions microphone :**

```javascript
// Vérifier si microphone est accessible
const checkMicrophonePermission = async () => {
  try {
    const result = await navigator.permissions.query({ name: 'microphone' })
    if (result.state === 'denied') {
      alert('⚠️ L\'accès au microphone est bloqué. Vérifiez les paramètres de votre navigateur.')
      return false
    }
    return true
  } catch (error) {
    // Fallback : essayer directement
    return true
  }
}
```

---

## 📁 Fichiers à Créer/Modifier

### Fichiers à CRÉER

1. ✅ `/supabase/migrations/20250121_create_enregistrements_groupes.sql`
2. ✅ `/supabase/migrations/20250121_create_storage_bucket.sql`
3. ✅ `/pages/api/enregistrements/upload.js`
4. ✅ `/pages/api/enregistrements/list.js`
5. ✅ `/pages/api/enregistrements/delete.js` (optionnel)

### Fichiers à MODIFIER

1. ✅ `/pages/lire/texte/[id].js` (ajout enregistrement vocal)

---

## 🔒 Sécurité

### Validations côté serveur

1. ✅ **Authentification JWT** sur toutes les APIs
2. ✅ **Validation du propriétaire** (apprenant_id = token.id)
3. ✅ **Validation du type de fichier** (audio/* uniquement)
4. ✅ **Limite de taille** (10 MB max)
5. ✅ **RLS Supabase Storage** (chaque user voit uniquement ses fichiers)

### Gestion des erreurs

1. ✅ Microphone non disponible → Message clair
2. ✅ Quota Storage dépassé → Message clair
3. ✅ Erreur upload → Retry possible
4. ✅ Fichier corrompu → Message clair

---

## 🎨 UX/UI

### États visuels

| État | Bouton 🔴 | Bouton 🎵 | Comportement |
|------|-----------|-----------|------------|
| Aucun enregistrement | Rouge, icône 🔴 | Masqué | Clic → Démarrer enregistrement |
| Enregistrement en cours | Rouge pulsant, ⏹️ + timer | Masqué | Clic → Arrêter |
| Enregistrement sauvegardé | Orange, icône 🔴 | Violet, icône 🎵 | 🔴 = Ré-enregistrer<br>🎵 = Écouter |
| Lecture en cours | Grisé | Rouge, icône ⏹️ | Clic → Arrêter |
| Upload en cours | Grisé | Masqué | Indicateur "Sauvegarde..." |

### Accessibilité

- ✅ Tooltips explicites sur tous les boutons
- ✅ Affichage de la durée de l'enregistrement
- ✅ Indicateurs visuels clairs (couleurs, icônes)
- ✅ Messages de confirmation/erreur

---

## 🧪 Plan de Tests

### Tests manuels à effectuer

1. ✅ Enregistrer un groupe → Vérifier sauvegarde BDD + Storage
2. ✅ Ré-enregistrer le même groupe → Vérifier écrasement
3. ✅ Lire l'enregistrement → Vérifier lecture fluide
4. ✅ Permissions microphone refusées → Vérifier message
5. ✅ Upload fichier trop gros → Vérifier erreur
6. ✅ Texte avec plusieurs groupes → Vérifier indépendance
7. ✅ Rechargement page → Vérifier persistance
8. ✅ Navigateur sans MediaRecorder → Vérifier fallback

---

## 📊 Estimation

| Tâche | Complexité | Fichiers |
|-------|------------|----------|
| Table SQL | Faible | 1 |
| Bucket Storage | Faible | 1 |
| API Upload | Moyenne | 1 |
| API List | Faible | 1 |
| API Delete | Faible | 1 |
| Modification page | Moyenne | 1 |
| Tests | Moyenne | - |

**Total : 6 fichiers à créer/modifier**

---

## ⚠️ Limitations Connues

1. **Format audio :** WebM uniquement (pas de fallback MP3/WAV pour vieux navigateurs)
2. **Compatibilité :** MediaRecorder API non supporté sur IE11
3. **Taille :** Limite 10 MB par enregistrement
4. **Quota :** Dépend du plan Supabase Storage (gratuit = 1 GB)

---

## 🚀 Déploiement

### Ordre d'exécution

1. Créer la migration SQL (table + bucket)
2. Appliquer la migration sur Supabase
3. Créer les 3 APIs backend
4. Modifier la page frontend
5. Tester en local
6. Déployer en production

---

**Plan créé le 21 janvier 2025**
**Prêt pour validation et implémentation** ✅
