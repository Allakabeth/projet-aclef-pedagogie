# PROMPT: Adapter l'exercice "Écoute et trouve" au nouveau pattern

## OBJECTIF

Adapter le fichier existant `/lire/ecoute-et-trouve.js` pour qu'il suive le **pattern validé** utilisé dans les exercices #1-6, notamment l'exercice "Découpage" (`decoupage-exercice.js`).

---

## CONTEXTE

**Exercice "Écoute et trouve" 🎯 :**
- **Principe** : L'apprenant écoute un mot (audio) et doit cliquer sur le bon mot écrit parmi 4-12 choix affichés
- **Fichier actuel** : `/pages/lire/ecoute-et-trouve.js` (62 KB, déjà extrait)
- **Problème** : Utilise l'ancien pattern avec page d'intro (`showIntro`) au lieu de l'auto-démarrage
- **Solution** : Adapter au nouveau pattern validé (comme decoupage-exercice.js)

**Fichier de référence :**
- ✅ `/pages/lire/reconnaitre-les-mots/decoupage-exercice.js` - Pattern validé et complet

---

## PATTERN VALIDÉ À APPLIQUER

### 1. AUTO-DÉMARRAGE (PAS de page de sélection)

**État initial :**
```javascript
const [etape, setEtape] = useState('chargement') // PAS 'selection'
```

**useEffect auto-démarrage :**
```javascript
useEffect(() => {
    if (user && router.query.texte_ids) {
        chargerDonnees()
    }
}, [user, router.query.texte_ids])

async function chargerDonnees() {
    setEtape('chargement')

    const texteIds = router.query.texte_ids.split(',').map(id => parseInt(id))

    // Charger mots depuis groupes_sens
    const { data: groupes } = await supabase
        .from('groupes_sens')
        .select('id, texte_reference_id, ordre_groupe, contenu')
        .in('texte_reference_id', texteIds)
        .order('texte_reference_id', { ascending: true })
        .order('ordre_groupe', { ascending: true })

    // Extraire mots uniques
    const motsUniques = extraireMots(groupes)

    // Charger enregistrements via API
    const motResponse = await fetch(`/api/enregistrements-mots/list?texte_ids=${texteIds.join(',')}`)
    const motData = await motResponse.json()

    // ⚠️ IMPORTANT: API retourne { enregistrements: [...] }
    const enregMap = {}
    motData.enregistrements?.forEach(enr => {
        const motNormalise = enr.mot.toLowerCase().trim()
        enregMap[motNormalise] = enr
    })

    // Démarrer auto
    if (motsUniques.length > 0) {
        setTimeout(() => demarrerJeu(motsUniques, enregMap), 100)
    }
}
```

### 2. NAVIGATION MODERNE (Entre titre et score)

**Version Desktop :**
```javascript
{!isMobile ? (
    <div style={{ width: '100%' }}>
        {/* Titre */}
        <h1 style={styles.title}>🎯 Écoute et trouve</h1>

        {/* Navigation - Entre titre et score */}
        <div style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'center',
            marginTop: '16px',
            marginBottom: '16px'
        }}>
            <button onClick={() => router.push(`/lire/reconnaitre-les-mots/exercices2?textes=${router.query.texte_ids}`)}>←</button>
            <button onClick={() => router.push('/lire')}>📖</button>
            <button onClick={() => router.push('/dashboard')}>🏠</button>
            <button onClick={lireMot}>🔊</button>
        </div>

        {/* Score */}
        <p style={styles.subtitle}>
            Mot {index + 1} / {totalMots} • Score : {score.bonnes}/{score.total}
        </p>
    </div>
) : (
    // Mobile: voir pattern mobile
)}
```

**Version Mobile :**
- Titre + Score à gauche
- 6 icônes à droite : ← 👁️ 📖 🏠 🔊 ⛶
- Plein écran + orientation forcée

### 3. AUDIO CASCADE (3 niveaux)

**Cascade validée :**
```javascript
async function lireMot(mot) {
    // Niveau 1: Voix personnalisée
    const motNormalise = mot.toLowerCase().trim()
    if (enregistrementsMap[motNormalise]) {
        const audio = new Audio(enregistrementsMap[motNormalise].audio_url)
        audio.play()
        return
    }

    // Niveau 2: ElevenLabs
    try {
        const response = await fetch('/api/speech/elevenlabs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: mot, voice_id: selectedVoice })
        })

        if (response.ok) {
            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const audio = new Audio(url)
            audio.play()
            return
        }
    } catch (err) {
        console.log('ElevenLabs échoué, fallback Web Speech')
    }

    // Niveau 3: Web Speech (fallback)
    const utterance = new SpeechSynthesisUtterance(mot)
    utterance.lang = 'fr-FR'
    speechSynthesis.speak(utterance)
}
```

### 4. INTERFACE ÉPURÉE (PAS de cadres blancs)

**Consigne :**
```javascript
{!isMobile && (
    <p style={styles.consigne}>Écoute le mot et clique sur le bon mot écrit :</p>
)}
```

**Zone de jeu :**
```javascript
<div style={{
    padding: isMobile ? '24px 0' : '48px',
    textAlign: 'center',
    marginBottom: '32px'
}}>
    {/* Grille de mots */}
</div>
```

**Styles :**
```javascript
consigne: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    backgroundColor: '#dbeafe',
    padding: '16px',
    borderRadius: '8px',
    border: '2px solid #3b82f6',
    margin: 0,
    marginBottom: '24px'
}
```

### 5. CONFETTIS (Uniquement score parfait)

```javascript
useEffect(() => {
    if (etape === 'resultats' && score.bonnes === score.total && score.total > 0) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 3000)
    }
}, [etape, score])
```

---

## MODIFICATIONS À EFFECTUER

### 1. SUPPRIMER l'ancien pattern

**À SUPPRIMER :**
- ❌ État `showIntro` (ligne 44)
- ❌ Fonction `handleStartGame()` (démarrage manuel)
- ❌ Page d'intro JSX (lignes 763-837)
- ❌ Anciens boutons de navigation

### 2. ADAPTER le chargement des données

**Remplacement :**
```javascript
// AVANT (ligne 149)
const loadMotsForTextes = async (texteIds) => {
    const { data, error: err } = await supabase.from('groupes_sens')...
}

// APRÈS (pattern auto-démarrage)
async function chargerDonnees() {
    const texteIds = router.query.texte_ids.split(',').map(id => parseInt(id))

    // Charger groupes
    const { data: groupes } = await supabase
        .from('groupes_sens')
        .select('id, texte_reference_id, ordre_groupe, contenu')
        .in('texte_reference_id', texteIds)
        .order('texte_reference_id', { ascending: true })
        .order('ordre_groupe', { ascending: true })

    // Extraire mots
    const mots = extraireMots(groupes)

    // Charger enregistrements
    const response = await fetch(`/api/enregistrements-mots/list?texte_ids=${texteIds.join(',')}`)
    const data = await response.json()

    const enregMap = {}
    data.enregistrements?.forEach(enr => {
        const motNormalise = enr.mot.toLowerCase().trim()
        enregMap[motNormalise] = enr
    })

    setEnregistrementsMap(enregMap)

    // Auto-démarrer
    if (mots.length > 0) {
        demarrerJeu(mots)
    }
}
```

### 3. ADAPTER la navigation

**Remplacer** les anciens boutons par le pattern moderne (voir section 2).

### 4. ADAPTER l'interface

**Consigne** : Retirer cadre blanc, garder fond bleu
**Zone de jeu** : Transparent, pas de cadre
**Boutons actions** : Uniquement en bas (pas de "Menu exercices" redondant)

### 5. VÉRIFIER les colonnes Supabase

**Colonnes correctes :**
- ✅ `texte_reference_id` (FK vers textes_references)
- ✅ `ordre_groupe` (integer)
- ❌ PAS `texte_id` ni `ordre`

---

## STRUCTURE FINALE ATTENDUE

### États principaux
```javascript
const [etape, setEtape] = useState('chargement') // 'chargement' | 'jeu' | 'resultats'
const [user, setUser] = useState(null)
const [allMots, setAllMots] = useState([])
const [currentMot, setCurrentMot] = useState(null)
const [displayedMots, setDisplayedMots] = useState([])
const [score, setScore] = useState({ bonnes: 0, total: 0 })
const [enregistrementsMap, setEnregistrementsMap] = useState({})
const [nbChoix, setNbChoix] = useState(8) // 4-12 choix
const [visualFeedback, setVisualFeedback] = useState(null)
const [showConfetti, setShowConfetti] = useState(false)
const [isMobile, setIsMobile] = useState(false)
```

### Fonctions principales
```javascript
// CHARGEMENT
async function chargerDonnees() { ... }
function extraireMots(groupes) { ... }

// AUDIO
async function lireMot(mot) { ... } // Cascade 3 niveaux

// JEU
function demarrerJeu(mots) { ... }
function preparerQuestion(index) { ... }
function verifierReponse(motClique) { ... }
function motSuivant() { ... }

// PLEIN ÉCRAN (mobile)
function togglePleinEcran() { ... }
function quitterPleinEcran() { ... }
```

### Rendu JSX

**1. Écran chargement :**
```javascript
if (etape === 'chargement') {
    return <div style={styles.container}><p>Chargement...</p></div>
}
```

**2. Écran jeu :**
```javascript
if (etape === 'jeu' && currentMot) {
    return (
        <div style={styles.container}>
            {/* Header avec navigation */}

            {/* Consigne (desktop) */}
            {!isMobile && <p style={styles.consigne}>Écoute le mot...</p>}

            {/* Zone de jeu */}
            <div style={{ padding: '48px', textAlign: 'center' }}>
                {/* Grille de mots */}
            </div>

            {/* Bouton rejouer (desktop) */}
            {!isMobile && (
                <button onClick={lireMot}>🔊 Réécouter</button>
            )}
        </div>
    )
}
```

**3. Écran résultats :**
```javascript
if (etape === 'resultats') {
    return (
        <div style={styles.container}>
            {/* Confettis si score parfait */}
            {showConfetti && <div>🎉 🎊 ✨</div>}

            {/* Titre + Navigation */}

            {/* Stats */}
            <div style={styles.resultatsBox}>
                <h2>Score : {score.bonnes}/{score.total}</h2>
                {/* Liste mots réussis/ratés */}
            </div>

            {/* Actions */}
            <button onClick={recommencer}>🔄 Recommencer</button>
            <button onClick={() => router.push('/lire')}>📖 Menu Lire</button>
        </div>
    )
}
```

---

## POINTS CRITIQUES À RESPECTER

### ⚠️ OBLIGATOIRES

1. **Auto-démarrage** : Pas de page de sélection, démarrage immédiat via `router.query.texte_ids`
2. **Navigation moderne** : Icônes centrées entre titre et score (desktop)
3. **API enregistrements** : Format `{ enregistrements: [...] }` (PAS tableau direct)
4. **Colonnes Supabase** : `texte_reference_id` et `ordre_groupe` (PAS texte_id/ordre)
5. **Audio cascade** : Voix perso → ElevenLabs → Web Speech
6. **Confettis** : Uniquement sur page résultats ET score parfait
7. **Interface épurée** : Pas de cadres blancs (questionBox, decoupageBox)

### ✅ OPTIONNELS (Conserver si déjà présent)

- Sélection nombre de choix (4-12 mots)
- Sélection voix ElevenLabs
- Feedback visuel (vert/rouge) sur clic
- Plein écran mobile + orientation forcée

---

## FICHIERS DE RÉFÉRENCE

**À COPIER comme modèle :**
- ✅ `/pages/lire/reconnaitre-les-mots/decoupage-exercice.js` (lignes 1-1137)
  - Structure générale
  - Pattern auto-démarrage (lignes 94-159)
  - Navigation desktop/mobile (lignes 713-918)
  - Audio cascade (lignes 364-433)
  - Styles épurés (lignes 435-580)

**À LIRE pour comprendre :**
- ✅ `/pages/lire/reconnaitre-les-mots/quest-ce-exercice.js`
  - API enregistrements (lignes 117, 139)
  - Gestion enregistrementsMap

**Fichier actuel à modifier :**
- 📝 `/pages/lire/ecoute-et-trouve.js` (62 KB)

---

## ÉTAPES D'EXÉCUTION

### 1. ANALYSER le fichier actuel
```bash
cat /mnt/c/Projet\ ACLEF/projet\ aclef\ pedagogie/pages/lire/ecoute-et-trouve.js
```

Identifier :
- Lignes avec `showIntro`
- Fonction `loadMotsForTextes()`
- Section JSX page d'intro
- Navigation actuelle
- Logique de jeu (à conserver)

### 2. MODIFIER en 3 passes

**Passe 1 - Auto-démarrage :**
- Supprimer `showIntro`
- Remplacer `loadMotsForTextes()` par `chargerDonnees()`
- Ajouter useEffect auto-démarrage
- Corriger API enregistrements (`.enregistrements`)

**Passe 2 - Navigation :**
- Supprimer ancienne navigation
- Ajouter nouvelle navigation (icônes entre titre et score)
- Adapter mobile/desktop

**Passe 3 - Interface :**
- Retirer cadres blancs
- Ajuster styles (consigne, zone de jeu)
- Vérifier confettis (score parfait uniquement)

### 3. TESTER
```bash
npm run dev
# Ouvrir http://localhost:3000
# Naviguer vers /lire/reconnaitre-les-mots/exercices2?textes=1,2,3
# Cliquer carte #7 "Écoute et trouve"
# Vérifier auto-démarrage
# Vérifier audio (cascade 3 niveaux)
# Vérifier navigation
# Terminer exercice → vérifier confettis si 100%
```

### 4. DOCUMENTER dans DEV_12112025.md

Format :
```markdown
## [Date Heure] - 🔄 ADAPTATION: Exercice "Écoute et trouve" (Exercice #7)

### Contexte
Adaptation du fichier existant au pattern validé (auto-démarrage + navigation moderne).

### Fichiers modifiés
- ✅ `pages/lire/ecoute-et-trouve.js` - Adaptation complète

### Modifications apportées
- ✅ Suppression page d'intro (`showIntro`)
- ✅ Auto-démarrage via `router.query.texte_ids`
- ✅ Navigation moderne (icônes entre titre et score)
- ✅ Interface épurée (pas de cadres blancs)
- ✅ Audio cascade validé (voix perso → ElevenLabs → Web Speech)

### Compilation
✅ Serveur dev fonctionnel
✅ Aucune erreur
✅ Exercice 100% opérationnel
```

---

## VALIDATION FINALE

**Checklist avant validation :**

- [ ] Auto-démarrage fonctionnel (pas de page de sélection)
- [ ] Navigation moderne (icônes entre titre et score)
- [ ] API enregistrements correcte (`.enregistrements`)
- [ ] Audio cascade 3 niveaux opérationnelle
- [ ] Interface épurée (pas de cadres blancs)
- [ ] Confettis uniquement si score parfait
- [ ] Compilation sans erreur
- [ ] Exercice jouable du début à la fin
- [ ] Navigation retour vers exercices2 fonctionnelle

**Si tout ✅ → Exercice #7 validé ! 🎯✅**

---

## NOTES IMPORTANTES

⚠️ **NE PAS MODIFIER :**
- Logique de jeu (sélection aléatoire mots, mélange, etc.)
- Algorithme de déduplication des mots
- Système de score
- Feedback visuel (vert/rouge)

✅ **À ADAPTER UNIQUEMENT :**
- Pattern de démarrage (showIntro → auto)
- Navigation (ancienne → moderne)
- Interface (cadres → épurée)
- Chargement données (ancien → nouveau)

---

**Pattern validé et réutilisable pour TOUS les exercices** ✅
