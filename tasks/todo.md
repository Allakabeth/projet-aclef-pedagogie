# Ajout fonctionnalité capture d'écran dans mes-imagiers.js

**Date :** 29 octobre 2025
**Objectif :** Ajouter les boutons de capture d'écran Google Images dans la page de modification d'imagiers

---

## CONTEXTE

La fonctionnalité de capture d'écran a été créée dans `creer.js` et fonctionne parfaitement.
L'utilisateur souhaite maintenant l'avoir également dans `mes-imagiers.js` pour :
- Ajouter un nouvel élément dans un imagier existant
- Modifier l'image d'un élément existant

---

## PLAN DE TRAVAIL

### ✅ Phase 1 : Ajout des états React

- [ ] Ajouter `isCapturing` - État de capture en cours
- [ ] Ajouter `capturedImage` - Image capturée (base64)
- [ ] Ajouter `isCropping` - Modal de recadrage ouvert
- [ ] Ajouter `cropData` - Données du rectangle de sélection
- [ ] Ajouter `isSelecting` - Zone verrouillée après sélection
- [ ] Ajouter `captureContext` - Contexte de capture ('new' ou index de l'élément modifié)

### ✅ Phase 2 : Ajout des fonctions

- [ ] `openGoogleImages(mot)` - Ouvrir Google Images avec le mot recherché
- [ ] `captureScreen(context)` - Capturer l'écran avec Screen Capture API
- [ ] `applyCrop()` - Appliquer le recadrage et assigner l'image au bon élément
- [ ] `cancelCrop()` - Annuler le recadrage
- [ ] `resetCropSelection()` - Recommencer la sélection

**Adaptation importante :**
```javascript
const applyCrop = async () => {
    // ... code de recadrage ...

    // Assignation conditionnelle selon le contexte
    if (captureContext === 'new') {
        // Nouvel élément
        setNewElement(prev => ({
            ...prev,
            image_url: compressedImage
        }))
    } else {
        // Modification d'élément existant
        handleUpdateElement(captureContext, 'image_url', compressedImage)
    }
}
```

### ✅ Phase 3 : Interface - Ajout d'un nouvel élément

**Emplacement :** Ligne 1158 (après le champ "Mot")

- [ ] Ajouter les 2 boutons :
  - 🔍 Chercher sur Google Images (utilise `newElement.mot`)
  - 📸 Capturer l'image
- [ ] Passer `context='new'` lors de la capture

### ✅ Phase 4 : Interface - Modification d'élément existant

**Emplacement :** Ligne 1439 (avant "Changer l'image")

- [ ] Ajouter les 2 boutons pour CHAQUE élément :
  - 🔍 Chercher sur Google Images (utilise `element.mot`)
  - 📸 Capturer l'image
- [ ] Passer `context=index` lors de la capture

### ✅ Phase 5 : Modal de recadrage

- [ ] Ajouter le modal avec l'image capturée
- [ ] Outil de sélection click-drag
- [ ] 3 boutons :
  - ✅ Utiliser cette zone
  - 🔄 Recommencer
  - ❌ Annuler
- [ ] Verrouillage de zone avec `isSelecting`

---

## CODE À RÉUTILISER

### États (à ajouter ligne ~33)
```javascript
const [isCapturing, setIsCapturing] = useState(false)
const [capturedImage, setCapturedImage] = useState(null)
const [isCropping, setIsCropping] = useState(false)
const [cropData, setCropData] = useState({ x: 0, y: 0, width: 0, height: 0 })
const [isSelecting, setIsSelecting] = useState(false)
const [captureContext, setCaptureContext] = useState(null) // 'new' ou index
```

### Fonctions (à copier depuis creer.js lignes 392-518)
- `openGoogleImages(mot)`
- `captureScreen(context)`
- `applyCrop()` (avec modification pour assignation conditionnelle)
- `cancelCrop()`
- `resetCropSelection()`

### Boutons (à insérer 2 fois)
- Interface ajout : après ligne 1153
- Interface modification : avant ligne 1439 (dans le map)

### Modal (à ajouter à la fin du JSX)
- Réutiliser le code des lignes 1583-1745 de creer.js

---

## NOTES IMPORTANTES

1. **Simplicité maximale** : Copier-coller le code existant avec un minimum d'adaptations
2. **Assignation conditionnelle** : Seule différence avec creer.js
3. **Verrouillage de zone** : Déjà testé et fonctionnel
4. **Pas de modification de l'API** : Tout se passe côté client

---

## ✅ RÉSUMÉ DES MODIFICATIONS EFFECTUÉES

### Fichier modifié : `/mnt/c/Projet ACLEF/projet aclef pedagogie/pages/imagiers/mes-imagiers.js`

**1. États React ajoutés (lignes 35-41) :**
```javascript
const [isCapturing, setIsCapturing] = useState(false)
const [capturedImage, setCapturedImage] = useState(null)
const [isCropping, setIsCropping] = useState(false)
const [cropData, setCropData] = useState({ x: 0, y: 0, width: 0, height: 0 })
const [isSelecting, setIsSelecting] = useState(false)
const [captureContext, setCaptureContext] = useState(null)
```

**2. Fonctions ajoutées (lignes 278-397) :**
- `openGoogleImages(mot)` - Ouvre fenêtre popup Google Images
- `captureScreen(context)` - Capture l'écran via Screen Capture API
- `applyCrop()` - Recadre et assigne l'image (nouvel élément ou modification)
- `cancelCrop()` - Annule le recadrage
- `resetCropSelection()` - Recommence la sélection

**3. Interface d'ajout de nouvel élément (lignes 1325-1366) :**
- 2 boutons ajoutés : 🔍 Chercher sur Google Images + 📸 Capturer l'image
- Texte d'aide pour guider l'utilisateur
- Context='new' lors de la capture

**4. Interface de modification d'élément (lignes 1608-1648) :**
- 2 boutons ajoutés pour chaque élément existant
- Context=index lors de la capture
- Même fonctionnalité que pour les nouveaux éléments

**5. Modal de recadrage (lignes 1759-1900) :**
- Overlay noir semi-transparent (zIndex: 9999)
- Outil de sélection click-drag avec rectangle vert
- Verrouillage de zone après sélection (fix du bug)
- 3 boutons : ✅ Utiliser / 🔄 Recommencer / ❌ Annuler
- Feedback visuel et textuel

**6. Refactoring de la structure :**
- Création variable `mainContent` pour stocker le contenu conditionnel
- Changement des `return (...)` en `mainContent = (...)`
- Un seul `return` final qui affiche `mainContent` + modal
- Permet au modal de s'afficher sur tous les modes (list, view, edit)

---

## 🎉 FONCTIONNALITÉ COMPLÉTÉE !

La fonctionnalité de capture d'écran Google Images est maintenant disponible dans `mes-imagiers.js` pour :
- ✅ Ajouter un nouvel élément dans un imagier existant
- ✅ Modifier l'image d'un élément existant

Le workflow est identique à celui de `creer.js` :
1. Saisir le mot
2. Cliquer "🔍 Chercher sur Google Images" → popup s'ouvre
3. Cliquer "📸 Capturer l'image" → sélectionner la fenêtre
4. Recadrer l'image avec l'outil de sélection
5. Cliquer "✅ Utiliser cette zone"
6. L'image est automatiquement ajoutée/modifiée

---

# TODO - Amélioration déduplication mots dans Écoute et trouve

**Date :** 8 novembre 2025
**Objectif :** Éviter les doublons de mots dans l'exercice "Écoute et trouve"

---

## PROBLÈME IDENTIFIÉ

Les mots en double (ex: "mer" apparaît 2 fois dans le texte) sont présentés plusieurs fois dans l'exercice.

## CAUSE PROBABLE

La déduplication existe déjà (lignes 106-128 dans `ecoute-et-trouve.js`) mais peut échouer à cause de :
- Ponctuation attachée aux mots ("mer" vs "mer.")
- Espaces invisibles
- Apostrophes ou caractères spéciaux
- Comparaison basée uniquement sur `toLowerCase()` sans nettoyage préalable

## PLAN D'ACTION

### Tâche 1 : Renforcer le nettoyage des mots
- [x] Modifier la fonction `loadMotsForTextes` (ligne 91)
- [x] Créer une fonction `cleanWord()` qui nettoie TOUTE ponctuation
- [x] Supprimer : . , ; : ! ? ' " ( ) [ ] { } … « » — – -
- [x] Normaliser les espaces (trim + multiples espaces)
- [x] Comparer uniquement sur les caractères alphanumériques nettoyés

### Tâche 2 : Utiliser Map au lieu de Set
- [x] Remplacer `motsSet` (Set) par `motsMap` (Map)
- [x] Clé = mot nettoyé en minuscules
- [x] Valeur = objet {id, mot, texte_id}
- [x] **Stocker le mot SANS ponctuation** dans l'objet (pas le mot original)
- [x] Ainsi l'affichage sera automatiquement sans ponctuation

### Tâche 3 : Ajouter des logs pour vérification
- [x] Console log : "❌ Mot en double ignoré : {mot}"
- [x] Console log : "✅ {X} mots uniques après déduplication"
- [x] Permet de vérifier visuellement que la déduplication fonctionne

## FICHIER À MODIFIER

- `/lire/ecoute-et-trouve.js` - fonction `loadMotsForTextes` (lignes 91-137)

## ✅ MODIFICATIONS EFFECTUÉES

**Fichier modifié :** `/lire/ecoute-et-trouve.js`

**Fonction `loadMotsForTextes` (lignes 91-155) :**

1. **Ajout fonction `cleanWord()` (lignes 106-112) :**
   - Supprime TOUTE ponctuation : . , ; : ! ? ' " ( ) [ ] { } … « » — – -
   - Normalise les espaces multiples
   - Trim du résultat

2. **Remplacement Set → Map (ligne 115) :**
   - Clé = mot nettoyé en minuscules
   - Valeur = objet {id, mot, texte_id}
   - Le mot stocké est SANS ponctuation

3. **Déduplication renforcée (lignes 124-144) :**
   - Nettoie chaque mot avec `cleanWord()`
   - Compare sur `cleanedLower`
   - Si doublon détecté → log "❌ Mot en double ignoré"
   - Si nouveau mot → ajoute à la Map

4. **Logs de vérification (lignes 142, 148) :**
   - Log chaque doublon ignoré avec comparaison
   - Log final : "✅ X mots uniques après déduplication"

**Résultat attendu :**
- ✅ "mer" + "mer." → affiché 1 seule fois comme "mer"
- ✅ Pas de ponctuation dans l'affichage
- ✅ Console affiche les doublons détectés

**Test recommandé :**
1. Ouvrir la console navigateur (F12)
2. Démarrer l'exercice avec un texte contenant des doublons
3. Vérifier les logs : "❌ Mot en double ignoré : ..."
4. Vérifier visuellement qu'aucun mot n'apparaît 2 fois

---

# TODO - Modifier gestion des erreurs dans Écoute et trouve

**Date :** 8 novembre 2025
**Objectif :** Passer au mot suivant même en cas d'erreur (ne pas rester bloqué sur le même mot)

---

## PROBLÈME ACTUEL

Quand l'utilisateur clique sur le mauvais mot :
- ❌ Affiche "Essayez encore"
- Reste sur le même mot
- L'utilisateur peut réessayer jusqu'à trouver le bon

## COMPORTEMENT SOUHAITÉ

Quand l'utilisateur clique sur le mauvais mot :
- ❌ Ça compte comme une erreur
- On passe directement au mot suivant
- Pas de "Essayez encore"

## PLAN D'ACTION

### Tâche 1 : Modifier fonction handleMotClick
- [x] Ligne 379-418 : fonction `handleMotClick`
- [x] Cas mauvaise réponse : supprimer le délai, passer au mot suivant
- [x] Marquer le mot comme "terminé" même si erreur

### Tâche 2 : Unifier le passage au mot suivant
- [x] Bonne réponse → score++ → mot suivant
- [x] Mauvaise réponse → mot suivant (sans score++)
- [x] Même logique pour les deux cas

### Tâche 3 : Feedback visuel
- [x] Bonne réponse : "✅ Correct !" pendant 1 seconde
- [x] Mauvaise réponse : "❌ Incorrect" pendant 1 seconde

## CHANGEMENTS CLÉS

1. ✅ Mauvaise réponse → "❌ Incorrect" au lieu de "Essayez encore"
2. ✅ Passage au mot suivant dans TOUS les cas
3. ✅ Le score ne s'incrémente que si bonne réponse
4. ✅ `attempts` s'incrémente toujours

## ✅ MODIFICATIONS EFFECTUÉES

**Fichier modifié :** `/lire/ecoute-et-trouve.js`

**Fonction `handleMotClick` (lignes 379-423) :**

### Changements principaux

**1. Variable `isCorrect` (ligne 383) :**
```javascript
const isCorrect = mot.id === currentMot.id
```
- Calculée une seule fois au début
- Utilisée pour le feedback ET le score final

**2. Feedback unifié (lignes 385-392) :**
```javascript
if (isCorrect) {
    setScore(score + 1)
    setFeedback('✅ Correct !')
} else {
    setFeedback('❌ Incorrect')  // ← Plus de "Essayez encore"
}
```

**3. Marquer comme terminé dans TOUS les cas (ligne 395) :**
```javascript
setCompletedMots([...completedMots, currentMot.id])
```
- Avant : seulement si bonne réponse
- Maintenant : toujours (bonne ou mauvaise)

**4. Passage au mot suivant unifié (lignes 398-422) :**
- Même setTimeout pour bonne ET mauvaise réponse
- Délai réduit : 1000ms (au lieu de 1500ms)
- Un seul bloc de code au lieu de deux

**5. Calcul du score final correct (ligne 409) :**
```javascript
const finalCorrect = isCorrect ? score + 1 : score
```
- Si dernier mot correct : score + 1
- Si dernier mot incorrect : score (sans incrément)

### Résultat attendu

**Avant :**
- ✅ Bonne réponse → "Correct !" → attend 1.5s → mot suivant
- ❌ Mauvaise réponse → "Essayez encore" → **reste bloqué** → peut réessayer

**Après :**
- ✅ Bonne réponse → "Correct !" → attend 1s → mot suivant
- ❌ Mauvaise réponse → "Incorrect" → attend 1s → **mot suivant**

### Impact utilisateur

1. **Plus de blocage** : On ne peut plus rester bloqué sur un mot
2. **Rythme plus rapide** : 1s au lieu de 1.5s
3. **Feedback clair** : "Incorrect" au lieu de "Essayez encore"
4. **Score juste** : Compte vraiment les erreurs

### Test recommandé

1. Lancer l'exercice
2. Cliquer volontairement sur un mauvais mot
3. Vérifier que :
   - Message "❌ Incorrect" s'affiche
   - On passe au mot suivant après 1s
   - Le score ne s'incrémente pas
   - Attempts s'incrémente

---

# TODO - Feedback visuel par couleurs (au lieu de texte)

**Date :** 8 novembre 2025
**Objectif :** Remplacer les messages "Correct/Incorrect" par un feedback visuel coloré

---

## CHANGEMENTS DEMANDÉS

### Supprimer les messages texte
- ❌ Plus de "✅ Correct !"
- ❌ Plus de "❌ Incorrect"

### Feedback visuel uniquement

**Bonne réponse :**
- Case cliquée → **fond VERT**
- Délai : **1.5 secondes** avant mot suivant

**Mauvaise réponse :**
- Case cliquée → **cadre ROUGE**
- Case du bon mot → **cadre VERT**
- Délai : **3 secondes** avant mot suivant (plus de temps pour voir la bonne réponse)

---

## PLAN D'ACTION

### Tâche 1 : Ajouter un state pour le feedback visuel
- [x] Créer state `visualFeedback` avec structure :
  ```javascript
  {
    clickedMotId: null,      // ID du mot cliqué
    correctMotId: null,      // ID du bon mot
    isCorrect: null          // true/false
  }
  ```
- [x] Remplace le state `feedback` (string)

### Tâche 2 : Modifier handleMotClick
- [x] Supprimer `setFeedback('✅ Correct !')` et `setFeedback('❌ Incorrect')`
- [x] À la place, utiliser :
  ```javascript
  setVisualFeedback({
    clickedMotId: mot.id,
    correctMotId: currentMot.id,
    isCorrect: isCorrect
  })
  ```
- [x] Délai conditionnel :
  - Si `isCorrect` → 1500ms
  - Si pas correct → 3000ms
- [x] Reset `visualFeedback` à la fin (null, null, null)

### Tâche 3 : Modifier le style des boutons de mots
- [x] Dans le map des `displayedMots`, ajouter logique de style conditionnelle
- [x] Si `mot.id === visualFeedback.clickedMotId && visualFeedback.isCorrect` :
  - → `background: '#10b981'` (vert)
  - → `color: 'white'`
  - → `border: '2px solid #10b981'`
- [x] Si `mot.id === visualFeedback.clickedMotId && !visualFeedback.isCorrect` :
  - → `border: '4px solid #ef4444'` (rouge épais)
  - → Garder fond blanc
- [x] Si `mot.id === visualFeedback.correctMotId && !visualFeedback.isCorrect` :
  - → `border: '4px solid #10b981'` (vert épais)
  - → Garder fond blanc

### Tâche 4 : Supprimer l'affichage du feedback texte
- [x] Supprimer le bloc JSX qui affiche `{feedback && ...}`
- [x] Lignes 724-735 environ

---

## FICHIER À MODIFIER

- `/lire/ecoute-et-trouve.js`
  - State `feedback` → `visualFeedback` (ligne ~29)
  - Fonction `handleMotClick` (lignes 379-423)
  - Style des boutons mots (lignes 744-775)
  - Bloc affichage feedback (lignes 724-735)

---

## CODE PROPOSÉ

### 1. Nouveau state (remplacer ligne ~29)

```javascript
// AVANT
const [feedback, setFeedback] = useState('')

// APRÈS
const [visualFeedback, setVisualFeedback] = useState({
    clickedMotId: null,
    correctMotId: null,
    isCorrect: null
})
```

### 2. Modifier handleMotClick

```javascript
const handleMotClick = (mot) => {
    setAttempts(attempts + 1)
    const isCorrect = mot.id === currentMot.id

    if (isCorrect) {
        setScore(score + 1)
    }

    // Feedback visuel
    setVisualFeedback({
        clickedMotId: mot.id,
        correctMotId: currentMot.id,
        isCorrect: isCorrect
    })

    setCompletedMots([...completedMots, currentMot.id])

    // Délai conditionnel : 1.5s si bon, 3s si mauvais
    const delai = isCorrect ? 1500 : 3000

    setTimeout(() => {
        const currentIndex = shuffledMots.findIndex(m => m.id === currentMot.id)
        if (currentIndex < shuffledMots.length - 1) {
            const nextMot = shuffledMots[currentIndex + 1]
            setCurrentMot(nextMot)
            updateDisplayedMots(nextMot, allMots)
            playAudio(nextMot.mot)
            // Reset feedback visuel
            setVisualFeedback({ clickedMotId: null, correctMotId: null, isCorrect: null })
        } else {
            // Fin du jeu
            const finalCorrect = isCorrect ? score + 1 : score
            const finalTotal = shuffledMots.length
            const percentage = Math.round((finalCorrect / finalTotal) * 100)

            setFinalScore({
                correct: finalCorrect,
                total: finalTotal,
                percentage: percentage
            })
            setGameStarted(false)
            setGameFinished(true)
            setVisualFeedback({ clickedMotId: null, correctMotId: null, isCorrect: null })
        }
    }, delai)
}
```

### 3. Style conditionnel des boutons

```javascript
{displayedMots.map(mot => {
    // Déterminer le style selon le feedback visuel
    let buttonStyle = {
        padding: isMobile ? '16px 8px' : '20px',
        background: '#fff',
        border: '2px solid #06b6d4',
        borderRadius: isMobile ? '8px' : '12px',
        cursor: 'pointer',
        transition: 'all 0.3s',
        fontSize: isMobile ? '16px' : '24px',
        fontWeight: '600',
        color: '#06b6d4'
    }

    // Bonne réponse cliquée → fond vert
    if (mot.id === visualFeedback.clickedMotId && visualFeedback.isCorrect) {
        buttonStyle.background = '#10b981'
        buttonStyle.border = '2px solid #10b981'
        buttonStyle.color = 'white'
    }

    // Mauvaise réponse cliquée → cadre rouge
    if (mot.id === visualFeedback.clickedMotId && visualFeedback.isCorrect === false) {
        buttonStyle.border = '4px solid #ef4444'
    }

    // Montrer le bon mot si erreur → cadre vert
    if (mot.id === visualFeedback.correctMotId && visualFeedback.isCorrect === false) {
        buttonStyle.border = '4px solid #10b981'
    }

    return (
        <button
            key={mot.id}
            onClick={() => handleMotClick(mot)}
            disabled={completedMots.includes(mot.id)}
            style={buttonStyle}
            // ... reste du code
        >
            {mot.mot}
        </button>
    )
})}
```

---

## ✅ MODIFICATIONS EFFECTUÉES

**Fichier modifié :** `/lire/ecoute-et-trouve.js`

### 1. State `feedback` → `visualFeedback` (lignes 29-33)

```javascript
// AVANT
const [feedback, setFeedback] = useState('')

// APRÈS
const [visualFeedback, setVisualFeedback] = useState({
    clickedMotId: null,
    correctMotId: null,
    isCorrect: null
})
```

### 2. Fonction `handleMotClick` modifiée (lignes 383-433)

**Changements clés :**
- ❌ Supprimé : `setFeedback('✅ Correct !')` et `setFeedback('❌ Incorrect')`
- ✅ Ajouté : `setVisualFeedback({ clickedMotId, correctMotId, isCorrect })`
- ✅ Délai conditionnel : `const delai = isCorrect ? 1500 : 3000`
- ✅ Reset du feedback visuel après passage au mot suivant

### 3. Bloc d'affichage feedback texte supprimé (ex lignes 756-768)

```javascript
// SUPPRIMÉ
{feedback && (
    <div style={{...}}>
        {feedback}
    </div>
)}
```

### 4. Style des boutons avec feedback visuel (lignes 763-816)

**Logique conditionnelle ajoutée :**

```javascript
// Bonne réponse → fond vert
if (mot.id === visualFeedback.clickedMotId && visualFeedback.isCorrect) {
    buttonStyle.background = '#10b981'
    buttonStyle.border = '2px solid #10b981'
    buttonStyle.color = 'white'
}

// Mauvaise réponse cliquée → cadre rouge épais
if (mot.id === visualFeedback.clickedMotId && visualFeedback.isCorrect === false) {
    buttonStyle.border = '4px solid #ef4444'
}

// Montrer le bon mot → cadre vert épais
if (mot.id === visualFeedback.correctMotId && visualFeedback.isCorrect === false) {
    buttonStyle.border = '4px solid #10b981'
}
```

### 5. Nettoyage autres fonctions

- **`resetGame` (ligne 444)** : `setFeedback('')` → `setVisualFeedback({ ... })`
- **`restartGame` (ligne 236)** : `setFeedback('')` → `setVisualFeedback({ ... })`

---

## 🎨 RÉSULTAT VISUEL

### Bonne réponse ✅
- Case cliquée : **fond vert #10b981**
- Texte : **blanc**
- Délai : **1.5 secondes**

### Mauvaise réponse ❌
- Case cliquée : **cadre rouge #ef4444 (4px)**
- Bonne case : **cadre vert #10b981 (4px)**
- Délai : **3 secondes** (plus de temps pour voir le bon mot)

### Plus de messages texte
- ❌ Plus de "✅ Correct !"
- ❌ Plus de "❌ Incorrect"
- ✅ Feedback 100% visuel par les couleurs

---

## Test recommandé

1. Lancer l'exercice
2. **Tester bonne réponse :**
   - Cliquer sur le bon mot
   - Vérifier : fond vert, passage après 1.5s
3. **Tester mauvaise réponse :**
   - Cliquer sur un mauvais mot
   - Vérifier : cadre rouge sur le mauvais, cadre vert sur le bon
   - Vérifier : passage après 3 secondes
4. Confirmer qu'aucun message texte n'apparaît

---

# TODO - Fix lecture audio automatique du mot suivant

**Date :** 8 novembre 2025
**Objectif :** Corriger le problème de lecture audio dans le setTimeout (bloqué par le navigateur)

---

## PROBLÈME IDENTIFIÉ

Le son ne se lance pas automatiquement quand on passe au mot suivant.

**Cause :** Ligne 414 dans `handleMotClick` :
```javascript
setTimeout(() => {
    // ...
    playAudio(nextMot.mot)  // ← Bloqué par le navigateur (pas d'interaction directe)
}, delai)
```

Les navigateurs bloquent `audio.play()` dans un setTimeout car ce n'est plus une interaction utilisateur directe.

---

## SOLUTIONS POSSIBLES

### Option 1 : Lancer l'audio AVANT le setTimeout ❌
**Problème :** On entendrait le mot suivant pendant qu'on voit encore le feedback visuel du mot actuel.

### Option 2 : Utiliser .catch() et afficher un message ❌
**Problème :** Pas pratique, oblige l'utilisateur à cliquer sur le bouton écouter.

### Option 3 : Pré-charger l'audio mais ne pas le jouer ✅
**Solution retenue :** Créer l'objet Audio immédiatement (pendant l'interaction), le stocker, puis appeler `.play()` dans le setTimeout.

---

## PLAN D'ACTION

### Tâche 1 : Créer un state pour l'audio pré-chargé
- [ ] Ajouter state `preloadedAudio` pour stocker l'audio du mot suivant

### Tâche 2 : Modifier handleMotClick
- [ ] Créer et pré-charger l'audio du mot suivant IMMÉDIATEMENT (pendant l'interaction)
- [ ] Dans le setTimeout, juste appeler `.play()` sur l'audio pré-chargé

### Tâche 3 : Alternative plus simple
- [ ] Utiliser une fonction qui retourne une Promise
- [ ] Appeler `playAudio` AVANT le setTimeout
- [ ] Attendre la fin de l'audio avant de passer au mot suivant

---

## QUESTION

Avant de coder, j'ai besoin de clarifier :

**Quand veux-tu que l'audio du mot suivant se lance ?**

A. Dès qu'on clique (avant le feedback visuel) ?
B. Après le feedback visuel (quand les cases changent) ?
C. En même temps que le feedback visuel ?

**Actuellement le code essaie de faire B** (après feedback) mais c'est bloqué par le navigateur.

❓ Quel comportement souhaites-tu ?

---

# TODO - Copier système audio de quest-ce.js

**Date :** 8 novembre 2025
**Objectif :** Implémenter le même système audio que quest-ce.js (mais sans voix personnalisée car mots isolés)

---

## ANALYSE quest-ce.js

**Hiérarchie audio :**
1. Voix personnalisée (`enregistrements` de groupes_sens)
2. ElevenLabs avec cache
3. Web Speech API (fallback, sans Hortense)

**Pour ecoute-et-trouve.js :**
- ❌ Pas de voix personnalisée (enregistrements = groupes complets, pas mots isolés)
- ✅ ElevenLabs avec cache
- ✅ Web Speech API (fallback, exclure Hortense)

---

## PROBLÈME IDENTIFIÉ

L'audio actuel dans ecoute-et-trouve.js :
1. ✅ A déjà ElevenLabs avec cache
2. ✅ A déjà fallback Web Speech
3. ❌ **MAIS** Web Speech n'exclut PAS Hortense
4. ❌ **ET** l'audio ne se lance pas dans setTimeout (autoplay bloqué)

---

## PLAN D'ACTION

### Tâche 1 : Exclure Hortense du Web Speech (copier de quest-ce.js)
- [x] Ligne 340+ dans fallbackToWebSpeech
- [x] Chercher voix masculine OU voix française (mais PAS Hortense)
- [x] Copier la logique exacte de quest-ce.js lignes 311-317

### Tâche 2 : Fix problème autoplay dans setTimeout
- [ ] **Option A** : Pré-charger l'audio pendant le clic
- [ ] **Option B** : Lancer audio immédiatement après feedback visuel
- [ ] Tester que ça fonctionne sur Chrome/Firefox/Safari

---

## MODIFICATION IMMÉDIATE - Exclure Hortense

Dans `fallbackToWebSpeech` (ligne 340+), copier la logique de quest-ce.js :

```javascript
const fallbackToWebSpeech = (texte) => {
    try {
        const utterance = new SpeechSynthesisUtterance(texte)
        utterance.lang = 'fr-FR'
        utterance.rate = 0.8
        utterance.pitch = 0.6  // Supprimer cette ligne

        const voices = window.speechSynthesis.getVoices()

        // NOUVELLE LOGIQUE : Exclure explicitement Hortense
        const voixFrancaise = voices.find(voice =>
            voice.lang.includes('fr') &&
            !voice.name.toLowerCase().includes('hortense')
        )

        if (voixFrancaise) {
            utterance.voice = voixFrancaise
        }

        utterance.onend = () => {
            setIsPlaying(false)
        }

        utterance.onerror = () => {
            setIsPlaying(false)
        }

        window.speechSynthesis.speak(utterance)
    } catch (error) {
        setIsPlaying(false)
    }
}
```

---

## Je commence par quoi ?

1. **D'abord** : Exclure Hortense (facile, copie de quest-ce.js)
2. **Ensuite** : Fix autoplay setTimeout (nécessite test)

**Tu veux que je commence ?**

---

# TODO - Implémenter système audio complet avec enregistrements personnels pour MOTS

**Date :** 8 novembre 2025
**Objectif :** Implémenter la hiérarchie complète : Voix personnalisée → ElevenLabs → Web Speech (Paul/Julie, PAS Hortense)

---

## CORRECTION UTILISATEUR CRITIQUE ⚠️

L'utilisateur a confirmé que **les MOTS sont enregistrés avec la voix personnalisée** et stockés en base de données.

**Hiérarchie audio demandée :**
1. **Voix personnalisée** (enregistrements de mots)
2. **ElevenLabs** (si pas d'enregistrement personnel)
3. **Web Speech** Paul/Julie uniquement (si plus de tokens ElevenLabs)

---

## STRUCTURE DES DONNÉES

### API enregistrements de mots
- **Endpoint :** `/api/enregistrements-mots/list.js`
- **Paramètres :** `apprenant_id` (via JWT token)
- **Retour :**
  ```javascript
  {
    success: true,
    enregistrements: [...],        // Array de tous les enregistrements
    enregistrementsMap: {          // Map pour accès rapide
      "mot1": { mot: "mot1", audio_url: "...", ... },
      "mot2": { mot: "mot2", audio_url: "...", ... }
    },
    count: 42
  }
  ```

### Table `enregistrements_mots`
- `id` - ID unique
- `apprenant_id` - ID apprenant
- `mot` - Texte du mot (clé pour l'indexation)
- `audio_url` - URL signée du fichier audio (expire 1h)
- Autres champs : `duree_secondes`, `taille_bytes`, `created_at`

---

## PLAN D'ACTION

### Tâche 1 : Ajouter state pour enregistrements personnels
- [ ] Ajouter state `enregistrementsMap` (Object, indexé par mot)
  ```javascript
  const [enregistrementsMap, setEnregistrementsMap] = useState({})
  ```

### Tâche 2 : Charger les enregistrements au démarrage
- [ ] Dans `startGame()`, après avoir chargé les mots
- [ ] Faire un fetch vers `/api/enregistrements-mots/list.js`
- [ ] Stocker le `enregistrementsMap` retourné dans le state
- [ ] Logger le nombre d'enregistrements chargés

### Tâche 3 : Créer fonction playEnregistrement
- [ ] Copier la logique de quest-ce.js (lignes 212-241)
- [ ] Adaptations :
  - Prend un objet `enregistrement` en paramètre
  - Vérifie `enregistrement.audio_url`
  - Crée un `new Audio(enregistrement.audio_url)`
  - Retourne `true` si succès, `false` si échec
  - Gère `onended` et `onerror`

### Tâche 4 : Réécrire fonction playAudio avec hiérarchie
- [ ] **Étape 1 : Vérifier voix personnalisée**
  ```javascript
  // Si on a un enregistrement pour ce mot
  if (enregistrementsMap[texte]) {
    const success = await playEnregistrement(enregistrementsMap[texte])
    if (success) return // OK, on s'arrête là
    console.log('⚠️ Échec enregistrement personnel, fallback ElevenLabs')
  }
  ```

- [ ] **Étape 2 : Essayer ElevenLabs** (code existant déjà bon)
  - Vérifier cache
  - Si pas en cache et tokens disponibles → fetch API
  - Jouer l'audio

- [ ] **Étape 3 : Fallback Web Speech** (code existant, déjà correct avec exclusion Hortense)

### Tâche 5 : Fix problème autoplay dans setTimeout
- [ ] **Option retenue :** Pré-charger l'audio pendant le clic
- [ ] Dans `handleMotClick`, avant le setTimeout :
  ```javascript
  // Pré-charger l'audio du mot suivant IMMÉDIATEMENT (pendant l'interaction)
  const nextMot = shuffledMots[currentIndex + 1]
  if (nextMot) {
    // Créer l'audio maintenant (autoplay autorisé car interaction directe)
    prepareNextAudio(nextMot.mot)
  }
  ```
- [ ] Créer fonction `prepareNextAudio(mot)` qui pré-charge l'audio
- [ ] Dans le setTimeout, juste appeler `.play()` sur l'audio pré-chargé

---

## FICHIER À MODIFIER

- `/lire/ecoute-et-trouve.js`

**Sections concernées :**
- **Ligne ~35** : Ajouter state `enregistrementsMap`
- **Ligne 171-215** : Modifier `startGame()` pour charger enregistrements
- **Ligne 271-341** : Réécrire `playAudio()` avec hiérarchie
- **Ligne ~342** : Ajouter fonction `playEnregistrement()`
- **Ligne 383-433** : Modifier `handleMotClick()` pour pré-charger audio

---

## CODE PROPOSÉ

### 1. State (après ligne 35)

```javascript
const [enregistrementsMap, setEnregistrementsMap] = useState({})
```

### 2. Charger enregistrements dans startGame (après ligne 193)

```javascript
// Charger les enregistrements personnels pour tous les mots
try {
    const token = localStorage.getItem('token')
    const enregResponse = await fetch('/api/enregistrements-mots/list.js', {
        headers: { 'Authorization': `Bearer ${token}` }
    })

    if (enregResponse.ok) {
        const enregData = await enregResponse.json()
        if (enregData.enregistrementsMap) {
            setEnregistrementsMap(enregData.enregistrementsMap)
            console.log(`🎵 ${enregData.count} enregistrement(s) personnel(s) chargé(s)`)
        }
    }
} catch (enregError) {
    console.warn('⚠️ Erreur chargement enregistrements:', enregError)
}
```

### 3. Fonction playEnregistrement (après ligne 341)

```javascript
const playEnregistrement = async (enregistrement) => {
    if (!enregistrement || !enregistrement.audio_url) {
        console.warn('⚠️ Enregistrement invalide')
        return false
    }

    try {
        console.log('🎵 Lecture enregistrement personnel:', enregistrement.mot)
        const audio = new Audio(enregistrement.audio_url)
        setCurrentAudio(audio)

        audio.onended = () => {
            setIsPlaying(false)
            setCurrentAudio(null)
        }

        audio.onerror = (error) => {
            console.error('❌ Erreur lecture enregistrement:', error)
            setIsPlaying(false)
            setCurrentAudio(null)
        }

        await audio.play()
        console.log('✅ Enregistrement personnel lu avec succès')
        return true
    } catch (error) {
        console.error('❌ Erreur playEnregistrement:', error)
        return false
    }
}
```

### 4. Nouvelle fonction playAudio (remplacer ligne 271-341)

```javascript
const playAudio = async (texte) => {
    if (isPlaying && currentAudio) {
        currentAudio.pause()
        setCurrentAudio(null)
        setIsPlaying(false)
        return
    }

    setIsPlaying(true)

    try {
        // ========================================================
        // PRIORITÉ 1 : VOIX PERSONNALISÉE
        // ========================================================
        if (enregistrementsMap[texte]) {
            console.log('🎵 Tentative lecture enregistrement personnel pour:', texte)
            const success = await playEnregistrement(enregistrementsMap[texte])
            if (success) return // Succès, on s'arrête là
            console.log('⚠️ Échec enregistrement personnel, fallback ElevenLabs')
        }

        // ========================================================
        // PRIORITÉ 2 : ELEVENLABS AVEC CACHE
        // ========================================================
        const cachedAudio = getCachedAudio(texte, selectedVoice)
        let audioData = null

        if (cachedAudio) {
            audioData = cachedAudio
        } else if (tokenStatus !== 'exhausted') {
            try {
                const token = localStorage.getItem('token')
                const response = await fetch('/api/speech/elevenlabs', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        text: texte,
                        voice_id: selectedVoice
                    })
                })

                if (response.ok) {
                    const data = await response.json()
                    audioData = data.audio
                    setCachedAudio(texte, selectedVoice, audioData)
                    setTokenStatus('available')
                } else {
                    setTokenStatus('exhausted')
                    fallbackToWebSpeech(texte)
                    return
                }
            } catch (error) {
                setTokenStatus('exhausted')
                fallbackToWebSpeech(texte)
                return
            }
        } else {
            // ========================================================
            // PRIORITÉ 3 : WEB SPEECH API (Paul/Julie, PAS Hortense)
            // ========================================================
            fallbackToWebSpeech(texte)
            return
        }

        const audio = new Audio(audioData)
        setCurrentAudio(audio)

        audio.onended = () => {
            setIsPlaying(false)
            setCurrentAudio(null)
        }

        audio.onerror = () => {
            setIsPlaying(false)
            setCurrentAudio(null)
            fallbackToWebSpeech(texte)
        }

        await audio.play()

    } catch (error) {
        fallbackToWebSpeech(texte)
    }
}
```

---

## PROCHAINES ÉTAPES

1. ✅ Valider le plan avec l'utilisateur
2. Implémenter les modifications une par une
3. Tester la hiérarchie audio :
   - Mot avec enregistrement → voix personnelle
   - Mot sans enregistrement → ElevenLabs
   - Tokens épuisés → Web Speech (Paul/Julie)
4. Vérifier qu'Hortense n'est jamais utilisée
5. Fix problème autoplay dans setTimeout

---