# Diagnostic MCP - Pourquoi les serveurs ne démarrent pas

**Date :** 19 octobre 2025
**Statut :** 🔍 En investigation

---

## ✅ CE QUI EST CORRECT

1. **Fichier mcp.json**
   - ✅ Présent à la racine : `/mnt/c/Projet ACLEF/projet aclef pedagogie/mcp.json`
   - ✅ Format JSON valide
   - ✅ Configuration Supabase avec token d'accès

2. **Fichier .claude/settings.local.json**
   - ✅ `enableAllProjectMcpServers: true` (ligne 92)
   - ✅ `"supabase"` dans `enabledMcpjsonServers` (ligne 104)
   - ✅ Permissions MCP configurées (lignes 45-50, 76-89)

3. **Serveur Supabase MCP**
   - ✅ Fonctionne manuellement (testé avec npx)
   - ✅ Le token d'accès est valide

4. **Permissions Claude Code**
   - ✅ Chargées dans settings.local.json
   - ✅ Visibles dans les logs (`~/.claude/debug/latest`)

---

## ❌ CE QUI NE FONCTIONNE PAS

1. **Serveurs MCP ne démarrent pas automatiquement**
   - Aucun processus MCP visible (`ps aux | grep mcp`)
   - Les outils MCP ne sont pas disponibles (test `mcp__supabase:list_tables` → erreur)

2. **Erreur OAuth dans les logs**
   ```
   [ERROR] Error streaming, falling back to non-streaming mode: 401
   {"type":"error","error":{"type":"authentication_error","message":"OAuth authentication is currently not supported."}}
   ```

---

## 🔍 HYPOTHÈSES

### Hypothèse 1 : Claude Code pas complètement redémarré
**Solution :** Quitter COMPLÈTEMENT l'application (pas juste fermer la fenêtre)
- Windows : Clic droit barre des tâches → Quitter
- Ou : Fichier → Quitter

### Hypothèse 2 : Conflit entre OAuth et Token
Le fichier mcp.json utilise un token direct, mais Claude Code essaye peut-être d'utiliser OAuth
**Solution potentielle :** Supprimer complètement GitHub de la configuration

### Hypothèse 3 : Version de Claude Code incompatible
**À vérifier :** Version de Claude Code installée

### Hypothèse 4 : Cache de configuration
Claude Code a peut-être mis en cache une ancienne configuration
**Solution :** Supprimer le cache et redémarrer

---

## 🧪 TESTS À EFFECTUER

### Test 1 : Vérifier la version de Claude Code
Aller dans : Aide → À propos de Claude Code
Vérifier que c'est une version qui supporte MCP (>= 2.0.0)

### Test 2 : Supprimer GitHub du mcp.json
Créer un mcp.json qui contient SEULEMENT Supabase, sans GitHub

### Test 3 : Vérifier les logs au démarrage
Regarder `~/.claude/debug/latest` immédiatement après le redémarrage
Rechercher les messages contenant "mcp", "server", "supabase"

### Test 4 : Tester avec un serveur MCP simple
Essayer avec un serveur MCP de test (filesystem, memory) pour voir si le problème est spécifique à Supabase

---

## 📝 PROCHAINES ÉTAPES

- [ ] Confirmer avec l'utilisateur comment il a redémarré
- [ ] Vérifier si des fenêtres OAuth se sont ouvertes
- [ ] Regarder les logs au démarrage
- [ ] Essayer de supprimer GitHub de enabledMcpjsonServers
- [ ] Vérifier la version de Claude Code

---

## 🎯 SOLUTION ATTENDUE

Une fois que tout fonctionne, l'utilisateur devrait pouvoir demander :
```
"Liste toutes les tables de ma base Supabase"
```

Et Claude devrait répondre automatiquement avec la liste des tables SANS demander de permission.
