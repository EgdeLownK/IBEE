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
- Si aucun fichier modifié ou stagé → STOP avec message : "Rien à commiter."
- Si la branche existe sur le remote ET a déjà été mergée (vérifier avec `git branch -r --merged origin/main | grep $(git branch --show-current)`) → ALERTE : "⚠️ Cette branche a déjà été mergée. Tu devrais probablement créer une nouvelle branche."

### Étape 1.5 — Auto-création de branche si on est sur `main`

**Si la branche actuelle != `main`** → skip cette étape, continuer le flux normal.

**Si la branche actuelle == `main`** :

- **Working tree clean** : déjà géré par le garde-fou "rien à commiter" ci-dessus.
- **Working tree avec modifs** : auto-créer une branche, ne pas demander à Killian.

1. Lire le diff pour comprendre la nature des changements :

```bash
git diff HEAD --stat
git diff HEAD | head -100
```

2. Générer un nom de branche court et parlant selon cette logique :

   - **Préfixe** selon la nature dominante des modifs :
     - Ajout/modif de fonctionnalité produit (`apps/`, `packages/`) → `feat/`
     - Correction de bug → `fix/`
     - Docs, rules, `CLAUDE.md`, `README` → `docs/`
     - Config, CI, MCPs, tooling, `.gitignore`, `.claude/` → `chore/`
     - Refactoring sans changement fonctionnel → `refactor/`
     - Tests uniquement → `test/`
   - **Slug** : 2-5 mots en kebab-case qui décrivent ce qui change.
   - Exemples : `chore/add-fetch-context7-mcps`, `feat/web-about-page`, `fix/research-web-wikilinks`, `docs/update-claude-md`.

3. Créer la branche et basculer dessus :

```bash
git switch -c <nom-genere>
```

4. Vérifier que la bascule a réussi : `git branch --show-current` doit retourner le nouveau nom.

5. Mémoriser cette information pour l'afficher dans le rapport final (Étape 6) :

```
🌿 Branche créée automatiquement : <nom-genere>
   (auto-création car modifs détectées sur main)
```

6. **Continuer le flux normal** (validation fichiers, type-check, test, génération du message, commit).

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
[si auto-création effectuée à l'Étape 1.5]
🌿 Branche créée automatiquement : <nom-genere>
   (auto-création car modifs détectées sur main)

✅ Commit créé : <hash court>
   Message : <message>
   Branche : <nom>
   Commits accumulés sur cette branche depuis main : <N>

Prochaine action :
- Continuer à coder + nouveau /commit
- OU /push pour envoyer sur GitHub
```

## Garde-fous absolus

- JAMAIS commit directement sur `main` — si on y est avec des modifs, auto-créer une branche (Étape 1.5) avant de commit
- JAMAIS skip les vérifications sans `--quick` explicite
- JAMAIS amend ou rebase automatiquement
- Si type-check ou test échoue : STOP, ne jamais commit
