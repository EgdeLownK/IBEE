---
description: Commit local avec vérifications automatiques (type-check + test)
allowed-tools: Bash, Read, Grep
argument-hint: [--quick pour skip les tests]
---

# /commit — Commit local avec garde-fous

## Comportement

Tu es invoqué pour faire un commit local sur la branche courante. Pas de push, pas de PR.

### Étape 1 — Diagnostic

Lance :

```bash
git branch --show-current
git status --short
git diff --stat
```

**Garde-fous bloquants** :
- Si la branche est `main` → STOP avec message : "❌ Tu es sur main. Crée une branche d'abord : `git switch -c feat/...` (ou fix/, chore/, docs/)"
- Si aucun fichier modifié ou stagé → STOP avec message : "Rien à commiter."
- Si la branche existe sur le remote ET a déjà été mergée (vérifier avec `git branch -r --merged origin/main | grep $(git branch --show-current)`) → ALERTE : "⚠️ Cette branche a déjà été mergée. Tu devrais probablement créer une nouvelle branche."

### Étape 2 — Validation rapide des fichiers

Affiche un résumé clair :

```
📋 Branche actuelle : <nom>
📝 Fichiers modifiés : <N>
   - path/to/file1 (+10 -3)
   - path/to/file2 (nouveau, +50)
   - path/to/file3 (supprimé)

Procéder au commit ? [O/N]
```

Attends la réponse de Killian. Si N → STOP.

### Étape 3 — Vérifications locales

Si la commande a été appelée avec `--quick`, skip les tests, sinon lance les deux :

```bash
echo "▶ Lancement type-check..."
pnpm type-check
```

Si échec → STOP avec :
- Affichage des erreurs
- Diagnostic court : "❌ type-check a échoué. Corrige les erreurs avant de relancer /commit."
- NE PAS commiter

Si OK et pas `--quick` :

```bash
echo "▶ Lancement tests..."
pnpm test
```

Si échec → STOP avec diagnostic, pas de commit.

Si OK → continue.

### Étape 4 — Génération du message de commit

Analyse les fichiers modifiés et génère un message au format **conventional commits** :

`<type>(<scope>): <description courte>`

**Types autorisés** : `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`

**Choix du type** :
- `feat` : nouvelle fonctionnalité
- `fix` : correction de bug
- `chore` : maintenance (deps, config, build)
- `docs` : documentation
- `refactor` : refactor sans changement fonctionnel
- `test` : ajout/modification de tests uniquement
- `style` : formatage, espacement (sans logique)

**Scope** : nom du package/app/module principal touché. Ex : `dashboard`, `web`, `supabase`, `ui-react`, ou omettre si transverse.

**Description** : impératif présent en anglais, < 72 caractères, pas de point final.

Exemples :
- `feat(dashboard): add user profile page`
- `fix(supabase): handle null in getUser helper`
- `chore: update pnpm to 9.0.0`

Si plusieurs fichiers de scopes différents → choisir le scope dominant ou omettre.

### Étape 5 — Stage + commit

Si rien n'est encore staged, fais `git add .` (preview avec `git status` avant pour confirmation visuelle).
Si des fichiers sont déjà staged, ne stage que ceux-là.

Puis :

```bash
git commit -m "<message généré>"
```

### Étape 6 — Rapport

Affiche :

```
✅ Commit créé : <hash court>
   Message : <message>
   Branche : <nom>
   Commits accumulés sur cette branche depuis main : <N>

Prochaine action :
- Continuer à coder + nouveau /commit
- OU /push pour envoyer sur GitHub
```

## Garde-fous absolus

- JAMAIS commit sur `main`
- JAMAIS skip les vérifications sans `--quick` explicite
- JAMAIS amend ou rebase automatiquement
- Si type-check ou test échoue : STOP, ne jamais commit
