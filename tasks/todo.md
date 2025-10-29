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
