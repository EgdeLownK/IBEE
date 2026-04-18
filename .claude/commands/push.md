---
description: Push branche + création PR + lancement code-review
allowed-tools: Bash, Read, Grep
---

# /push — Push + PR + review

## Comportement

Tu es invoqué pour envoyer les commits accumulés sur la branche courante vers GitHub, créer une PR si nécessaire, et lancer la code-review automatique.

### Étape 1 — Diagnostic

```bash
git branch --show-current
git log main..HEAD --oneline
git status --short
```

**Garde-fous bloquants** :
- Si la branche est `main` → STOP : "❌ Push direct sur main interdit."
- Si aucun commit accumulé depuis main (`git rev-list --count main..HEAD` = 0) → STOP : "Rien à pusher. Fais d'abord un /commit."
- Si fichiers modifiés non committés → ALERTE : "⚠️ Tu as <N> fichiers modifiés non committés. Ils ne seront pas inclus dans ce push. Continuer ? [O/N]"

### Étape 2 — Validation rapide

Affiche :

```
📋 Branche : <nom>
📦 Commits à pusher : <N>
   - <hash> <message>
   - <hash> <message>
   - <hash> <message>

📊 Diff cumulé : <X> fichiers, +<lignes> -<lignes>

Procéder au push ? [O/N]
```

Attends. Si N → STOP.

### Étape 3 — Push

```bash
git push -u origin <branche-courante>
```

Si erreur (auth, conflict, etc.) → STOP avec message exact, ne pas tenter de contournement.

### Étape 4 — Vérifier PR existante

```bash
gh pr list --head <branche-courante> --json number,url,state --jq '.[0]'
```

**Si une PR existe et est OPEN** → on saute la création (étape 5), on va directement à l'étape 6 (re-lancer code-review sur la PR mise à jour).

**Si pas de PR** → étape 5.

### Étape 5 — Création de la PR

Génère titre + body automatiquement :

**Titre** :
- Si 1 commit : reprendre son message
- Si plusieurs commits : titre synthétique au format conventional commits basé sur le commit le plus important

**Body** : structure type
```
## Résumé
<1-2 phrases qui décrivent l'objectif de la PR>

## Commits inclus
- <hash> <message>
- <hash> <message>

## Fichiers modifiés
<résumé : combien de fichiers, quels packages/apps touchés>
```

Crée la PR :

```bash
gh pr create --base main --head <branche> --title "<titre>" --body "<body>"
```

Note l'URL retournée.

### Étape 6 — Lancement de /code-review

Lance `/code-review` sur la PR. Affiche le résultat synthétique (les findings principaux, pas le rapport complet).

Si `/code-review` n'est pas disponible (plugin non installé), signale-le et continue.

### Étape 7 — Rapport final

```
✅ Push réussi
✅ PR créée (ou mise à jour) : <URL>
✅ /code-review lancée

📋 Synthèse review :
<bullets des findings principaux>

📊 État CI : <vérifie avec `gh pr checks <numéro>` et affiche>

🚦 Prochaine action : Killian, vérifier la review et merger sur GitHub quand la CI est verte.
```

**NE PAS MERGER**. Le merge est manuel sur GitHub.

## Garde-fous absolus

- JAMAIS push sur main directement
- JAMAIS `--force` ni `--force-with-lease`
- JAMAIS `gh pr merge` (merge manuel par Killian)
- Si push échoue : STOP, ne pas tenter de contournement
