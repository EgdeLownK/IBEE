---
description: Retour propre sur main après merge d'une PR (switch + pull + cleanup branche)
allowed-tools: Bash, Read
---

# /github:sync — Synchronisation post-merge

## Comportement

Tu es invoqué pour finir proprement un cycle de PR : revenir sur main, récupérer le merge, supprimer la branche locale.

### Étape 1 — Diagnostic

```bash
git branch --show-current
git status --short
git remote -v
```

**Garde-fous bloquants** :
- Si fichiers modifiés non committés → STOP : "❌ Tu as du travail non committé. Fais `/github:commit` ou `git stash` d'abord."
- Si remote `origin` absent → STOP rapport.

### Étape 2 — Détection du cas

Trois cas possibles selon la branche :

**Cas A — Branche feature** (préfixe `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`)

Vérifier si la branche a été mergée sur le remote :

```bash
gh pr list --state merged --head <branche-courante> --json number,title,mergedAt --jq '.[0]' 2>&1
```

- **Si une PR mergée existe** → c'est le cas nominal, on peut procéder à l'étape 3.
- **Si aucune PR mergée trouvée** → ALERTE : "⚠️ Aucune PR mergée trouvée pour cette branche. Tu veux quand même retourner sur main et garder cette branche ? [O/N]". Si N → STOP. Si O → procéder mais NE PAS supprimer la branche locale à l'étape 3.

**Cas B — Déjà sur main**

Faire juste un pull. Aller directement à l'étape 4.

```bash
git pull origin main
```

**Cas C — Branche bizarre** (HEAD détaché, branche sans préfixe convention, etc.)

STOP : "❌ Tu es sur une branche non standard (`<nom>`). Je ne sais pas quoi faire automatiquement. Que veux-tu faire ?"

### Étape 3 — Switch + pull + cleanup (cas A nominal)

```bash
OLD_BRANCH=$(git branch --show-current)
git switch main
git pull origin main
git branch -d "$OLD_BRANCH" 2>&1
```

Si `git branch -d` échoue avec "not fully merged" → STOP : "⚠️ La branche n'est pas considérée comme mergée localement. Anomalie. À investiguer manuellement avant de supprimer."

NE PAS forcer avec `-D`.

### Étape 4 — Affichage final

```bash
git log --oneline -3
git branch -a | head -20
```

Affiche un rapport :

```
✅ Sync terminé
   Avant : <branche-d'origine>
   Après : main

📦 Nouveaux commits récupérés depuis le dernier sync : <N>
   - <hash> <message>

🌳 Branches locales restantes : <N>
   <liste>

🚦 Prochaine action : tu peux créer une nouvelle branche (`git switch -c feat/...`) ou attendre.
```

## Garde-fous absolus

- JAMAIS `git branch -D` (force delete). Si delete échoue, STOP.
- JAMAIS `git reset --hard` ni `git pull --rebase` sans demande explicite.
- JAMAIS supprimer de branche non mergée sans alerte explicite.
