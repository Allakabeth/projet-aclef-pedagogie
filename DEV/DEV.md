# Journal de Développement - Projet ACLEF Pédagogie

Historique des modifications et points clés à retenir.

---

## [2025-11-09 17:00] - 💾 SAUVEGARDE: Configuration MCP et optimisation règles

⚠️ **Sauvegarde avant compactage de conversation**

### Contexte
Session longue - analyse et nettoyage configuration MCP + optimisation règles de travail.

### Fichiers modifiés
- `.mcp.json` - Nettoyage serveurs MCP (supprimé playwright et promptx, mis à jour deepwiki)
- `.claude/commands/regles.md` - Restauration version optimisée avec sections structurées
- `.claude/settings.json` - Correction hooks pour utiliser /bin/bash au lieu de sh

### Travail terminé
- ✅ Analyse complète des 9 serveurs MCP
- ✅ Suppression serveurs inutiles (playwright, promptx)
- ✅ Mise à jour deepwiki vers serveur officiel HTTP
- ✅ Vérification serveurs fonctionnels (supabase, github, memory, memory-bank, sequential-thinking)
- ✅ Désactivation serena (cause ralentissements)
- ✅ Correction syntaxe hooks bash dans settings.json
- ✅ Clarification règles /save vs rituels

### Points clés à retenir
- **Serveurs MCP actifs** : 6 (supabase, github, sequential-thinking, deepwiki, memory, memory-bank)
- **DeepWiki** : Nouveau serveur officiel via HTTP (https://mcp.deepwiki.com/mcp)
- **Hooks nécessitent bash** : Utiliser `/bin/bash -c '...'` pour compatibilité syntaxe [[]]
- **Slash commands = permissions explicites** : /save, /push donnent autorisation directe
- **Rituels ≠ autorisations** : Toujours demander permission pour créer fichiers DEV

### Configuration MCP finale
```json
Actifs: supabase, github, sequential-thinking, deepwiki (HTTP), memory, memory-bank
Désactivés: serena
Supprimés: playwright, promptx
```

### Notes pour la prochaine session
- Hooks corrigés mais nécessitent redémarrage Claude Code pour prendre effet
- Fichier DEV.md existe déjà dans /DEV/ (pas besoin d'en créer nouveau)
- Memory et Memory-Bank configurés et fonctionnels (prêts à utiliser)
- Format DEV: DEV_JJMMAAAA_HH_MM.md pour nouvelles sessions

---

## [2025-01-09 15:00] - Docs: Ajout journal DEV.md et règles de travail

### Fichiers modifiés
- `DEV.md` - Création du journal de développement
- `Règles.md` - Création du fichier de règles de travail
- `.claude/commands/push.md` - Ajout étape 5 pour mise à jour automatique de DEV.md
- `.claude/commands/tokens.md` - Création commande /tokens pour voir budget conversation

### Points clés à retenir
- **Journal DEV.md** : Système de traçabilité des modifications pour garder une mémoire du projet
- **Format des entrées** : Date/heure, type de commit, fichiers modifiés, points clés, code important
- **Commande /push** : Désormais met à jour automatiquement DEV.md après chaque push
- **Commande /tokens** : Permet de voir le pourcentage de conversation restant
- **Ordre chronologique** : Les entrées sont ajoutées en haut (plus récentes en premier)

### Workflow établi
1. Modifier le code
2. Taper `/push`
3. Push automatique vers GitHub
4. Mise à jour automatique de DEV.md
5. Déploiement Vercel automatique

---

## Session du 2025-01-09 à 14:45

Début de session de développement.

---
