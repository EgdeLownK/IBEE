---
description: Recherche web approfondie avec 11 phases, 7 principes de rigueur, 4 types de recherche. Sortie markdown dans .agora-brain/research/web/
allowed-tools: WebSearch, Bash, Read, Write, Glob, Grep
argument-hint: "<question> [--standard] [--with-hn] [--type=fact|opinion|comparison|exploration]"
---

# /research:web — Recherche web approfondie

## Règles critiques non-négociables

1. **Interdiction absolue de WebFetch.** Utilise uniquement Fetch MCP. Si Fetch MCP n'est pas disponible, signale-le et utilise Playwright MCP en fallback. Ne tombe JAMAIS sur WebFetch.
2. **Tous les outils disponibles** : WebSearch (natif), Fetch MCP (si installé), Playwright MCP (si installé, fallback JS), Context7 MCP (si installé, doc technique), Hacker News MCP (si installé, opt-in via `--with-hn`).
3. **Sortie systématique** en fichier markdown dans `.agora-brain/research/web/`. Jamais de réponse inline longue.
4. **Pas de `git commit`, pas de modification du projet.** Cette commande produit uniquement des fichiers dans `.agora-brain/research/web/`.

## Parser les arguments

- Extraire la question (tout ce qui n'est pas un flag)
- Détecter niveau : `--standard` → STANDARD, sinon → APPROFONDI (défaut)
- Détecter HN : `--with-hn` présent → activer, sinon désactivé
- Détecter type : `--type=fact|opinion|comparison|exploration` → appliquer, sinon `exploration` (défaut)

Si la question est vide → STOP : `❌ Aucun sujet fourni. Usage : /research:web "ma question" [--standard] [--with-hn] [--type=...]`

## Phase 1 — Contextualisation projet

Avant toute recherche externe, lire le contexte projet pour cibler intelligemment.

```bash
ls .agora-brain/pilier/ 2>/dev/null
ls .agora-brain/marche/ 2>/dev/null
```

Si ces dossiers existent, utilise Glob pour lister les fichiers puis Read sur les 2-3 plus pertinents par rapport au sujet de la question. Extrait mentalement : vocabulaire projet, stack, positionnement marché, contraintes.

Si la question est manifestement hors-projet (ex : "qui a gagné tel tournoi sportif") → skip cette phase en signalant "contexte projet non pertinent pour cette question".

## Phase 2 — Génération des queries multi-angles

Selon le niveau ET le type, génère des queries variées (vocabulaire différent, langues différentes, angles différents) :

**STANDARD** : 3-4 queries
**APPROFONDI** : 4-6 queries

**Types influent sur la nature des queries** :
- `fact` : queries courtes et précises, ciblées sur la doc officielle (`site:` du vendor), 2-3 queries suffisent
- `opinion` : queries avec mots-clés "review", "experience", "opinion", "2026" ; cibles Reddit/HN/forums
- `comparison` : queries explicites "X vs Y", "alternatives to X", "X comparison 2026"
- `exploration` (défaut) : mix équilibré docs + blogs + communautaire

**Ciblage par opérateurs** :
- Utilise `site:` pour cibler des sources spécifiques quand pertinent
- Utilise `after:YYYY-MM-DD` pour forcer la fraîcheur
- Utilise `"quote"` pour les termes exacts
- Évite les guillemets sauf pour les expressions consacrées

## Phase 3 — Sondage parallèle

Lance les queries WebSearch EN PARALLÈLE (toutes en une fois, pas séquentiellement).

En parallèle aussi :
- Si la question identifie clairement une librairie/framework → appelle Context7 MCP (`resolve-library-id` puis `get-library-docs` sur le sujet). Doc officielle à jour directement.
- Si `--with-hn` est activé → appelle Hacker News MCP (`hn_search` avec filtre score minimum 30 ou date récente).

Collecte tous les résultats bruts (titres, URLs, snippets, scores si HN). NE fetche PAS encore les pages.

## Phase 4 — Classification et priorisation des sources

Pour chaque résultat, attribue 3 dimensions :

**Autorité (pyramide)** :
- Niveau 1 : doc officielle vendor, spec RFC, code source officiel
- Niveau 2 : blogs techniques vendors, papers académiques, conférences officielles
- Niveau 3 : HN top comments (score > 50), Stack Overflow accepted answers, GitHub discussions très upvotées
- Niveau 4 : blogs personnels réputés, Medium, Dev.to, Reddit
- Niveau 5 : contenu SEO suspect, forums obscurs, LinkedIn posts

**Fraîcheur** (si détectable depuis URL ou snippet) :
- Ok : < 12 mois pour tech, < 6 mois pour pricing/politique
- Daté : 12-24 mois, à valider
- Périmé : > 24 mois, exclure sauf cas méthodologique

**Pertinence** : le snippet correspond-il vraiment à la question ?

**Décision de fetch** : prioriser niveau 1-3 fraîches et pertinentes.

**Limite de fetch** :
- STANDARD : max 5 sources
- APPROFONDI : max 10 sources
- `fact` : max 3 sources (allégement)
- `opinion`/`comparison` : max du niveau

Si aucune source niveau 1-2 pour un sujet technique → FLAG dans `_METHODOLOGY.md` : "aucune source officielle trouvée, résultats basés sur communauté".

## Phase 5 — Fetch par batches

Crée le dossier de sortie :

```bash
DATE=$(date +%Y-%m-%d)
TIME=$(date +%H-%M)
SLUG=$(echo "<question>" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g' | cut -c1-50)
DIR=".agora-brain/research/web/${DATE}_${TIME}_${SLUG}"
mkdir -p "$DIR/raw"
```

Fetch les sources retenues par **batches de 3-5** avec Fetch MCP.

**Workflow par batch** :
1. Lance 3-5 fetches en parallèle via Fetch MCP
2. Si un fetch retourne du contenu vide ou uniquement du JavaScript → retry avec Playwright MCP (un seul essai, pas de boucle)
3. Si Playwright échoue aussi → marque la source comme "inaccessible" dans `_METHODOLOGY.md` et continue
4. Sauvegarde chaque source dans `$DIR/raw/source-N.md` avec en-tête YAML :

```markdown
---
url: <url>
title: <titre extrait>
fetched_at: <YYYY-MM-DD HH:MM>
published_at: <date extraite du contenu ou "inconnu">
domain_authority: <niveau 1-5>
freshness: <ok|daté|périmé>
fetch_method: <fetch-mcp|playwright>
---

<contenu markdown brut>
```

5. Après chaque batch, génère une synthèse interne courte (~200 mots) des points saillants, garde les sources brutes dans `raw/`

**Règle anti-dérive** : ne modifie JAMAIS le contenu brut extrait. Garde-le fidèle à la source.

## Phase 6 — Triangulation et synthèse préliminaire

Parcours toutes les sources fetchées. Construis un tableau mental (pas à écrire) :

| Affirmation | Source 1 | Source 2 | Source 3 | Confiance |
|-------------|----------|----------|----------|-----------|
| ... | ✅ | ✅ | ✅ | haute |
| ... | ✅ | ✅ | ❌ | moyenne |
| ... | ✅ | ❌ | ❌ | basse |

**Règle pragmatique** :
- Affirmations **centrales** de la réponse → exigence ≥ 3 sources
- Affirmations **périphériques** ou illustratives → 1-2 sources acceptables avec confiance ajustée explicitement

**Identifie les points de divergence** entre sources : quand 2 sources disent des choses opposées, c'est un signal fort à traiter explicitement dans le rapport.

**Sépare faits et interprétations** :
- Faits observés : "Astro 5 a introduit X en <date>", "Cloudflare Workers KV a une latence de Y ms"
- Interprétations : "Cela suggère que...", "Pour Agora, cela implique..."

## Phase 7 — Outline refinement (NOUVEAU)

Prends un temps explicite pour revoir le plan du rapport à la lumière de ce que tu as trouvé. Pas le plan que tu avais imaginé au début.

**Questions à te poser** :
1. Le plan initial (implicite) tient-il encore, ou les données révèlent-elles une autre structure ?
2. Y a-t-il un débat important que je n'avais pas anticipé ? (Ex : pas "comparer X et Y" mais "comprendre 2 écoles de pensée")
3. Quelles sont les 3-5 sections principales du `_SUMMARY.md` final ?

Écris un **mini-plan** (3-5 sections numérotées avec 1 phrase de contenu prévu chacune) dans ton raisonnement. C'est ce plan qui guidera la synthèse Phase 8.

**Exception** : si `--type=fact`, cette phase est allégée (pas besoin de repenser le plan pour une info factuelle simple).

## Phase 8 — Synthèse préliminaire

Rédige le `_SUMMARY.md` selon le plan de la phase 7.

**Règles strictes** :
- Chaque affirmation factuelle est suivie du **niveau de confiance entre crochets** : `[haute]`, `[moyenne]`, `[basse]`
- Chaque affirmation importante est suivie de son **numéro de source** : `[src 1]`, `[src 2,3]` (référence à `_SOURCES.md`)
- **Séparation explicite** entre `## Faits observés` et `## Interprétations / Recommandations`
- Section `## Points de divergence` si des sources se contredisent
- Longueur :
  - STANDARD : 800-1500 mots
  - APPROFONDI : 1500-3000 mots
  - `fact` : 200-500 mots

## Phase 9 — Critique avocat du diable (NOUVEAU)

Relis ta propre synthèse avec un œil critique. Pose-toi EXPLICITEMENT ces questions :

1. Ai-je pris parti pour une école de pensée sans justifier ?
2. Y a-t-il des contre-arguments que j'ai sous-représentés ?
3. Ai-je des affirmations `[haute]` qui reposent en fait sur moins de 3 sources vraiment indépendantes ?
4. Ai-je ignoré une dimension importante (sécurité, coût long-terme, maintenance, écosystème) ?
5. Y a-t-il un angle que la recherche n'a pas couvert ?

**Si OUI à une question importante** → déclenche une **2e vague ciblée** :
- Reformule 2-3 queries visant spécifiquement l'angle mort
- Fetch 2-3 sources supplémentaires
- Intègre les findings dans `_SUMMARY.md`

**Limite** : maximum 2 itérations avocat du diable. Après ça, signaler dans `_METHODOLOGY.md` les limites restantes plutôt que de boucler.

**Exception** : si `--type=fact`, cette phase est allégée voire skippée (pas d'angles morts sur une question factuelle simple).

## Phase 10 — Validation anti-hallucination (NOUVEAU, version simple)

Vérifie la cohérence entre le rapport et les sources effectivement fetchées :

1. Liste toutes les URLs citées dans `_SUMMARY.md` (pattern : `[src N]` et URLs inline)
2. Liste toutes les URLs présentes dans les fichiers `$DIR/raw/source-*.md`
3. Pour chaque URL citée dans `_SUMMARY.md` :
   - Si elle est dans `raw/` → OK
   - Si elle n'est PAS dans `raw/` → ⚠️ Flag en rouge dans `_METHODOLOGY.md` section "⚠️ URLs citées non vérifiées"
4. Pour chaque `[src N]` référencé → vérifier que la source N existe bien dans `_SOURCES.md`
5. Vérifier que `_SUMMARY.md`, `_SOURCES.md` et `_METHODOLOGY.md` commencent tous par un bloc frontmatter YAML valide (`---\n...\n---`) conforme à `.claude/rules/brain.md` (`type`, `status`, `created` obligatoires). Si un des fichiers manque de frontmatter → FLAG dans `_METHODOLOGY.md` section "⚠️ Violations brain conventions" et régénérer le fichier avec frontmatter.

**Ne ré-écris pas le rapport** en cas de flag, juste le signaler. C'est à Killian de décider quoi en faire.

## Phase 11 — Production des fichiers markdown finaux

Crée les 3 fichiers dans `$DIR/` :

### `$DIR/_SUMMARY.md` (déjà rédigé en Phase 8, potentiellement complété en Phase 9)

Structure :

```markdown
---
type: research
subtype: web
status: active
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
level: <STANDARD|APPROFONDI>
research_type: <fact|opinion|comparison|exploration>
question: "<question>"
tags: [research, web, <research_type>]
---

# Recherche : <question>

**Date** : <YYYY-MM-DD HH:MM>
**Niveau** : <STANDARD|APPROFONDI>
**Type** : <fact|opinion|comparison|exploration>
**HN activé** : <oui|non>
**Sources consultées** : <N>
**Tokens consommés (estimation)** : <nombre>

## Contexte projet
<2-3 lignes si pertinent, sinon "N/A">

## Faits observés
<structure selon type, chaque fait avec [confiance] et [src N]>

## Interprétations / Recommandations pour Agora
<synthèse clairement marquée comme interprétation>

## Points de divergence
<si des sources se contredisent, présenter les camps>

## Limites de cette recherche
<1-2 phrases sur ce qui n'a pas été couvert>
```

### `$DIR/_SOURCES.md`

```markdown
---
type: research-sources
subtype: web
status: active
created: <YYYY-MM-DD>
parent: _SUMMARY.md
sources_count: <N>
tags: [research, web, sources]
---

# Sources consultées

| # | URL | Titre | Date pub | Autorité (1-5) | Fraîcheur | Confiance | Méthode fetch |
|---|-----|-------|----------|----------------|-----------|-----------|---------------|
| 1 | ... | ... | ... | 1 | ok | haute | fetch-mcp |
| 2 | ... | ... | ... | 3 | daté | moyenne | playwright |
```

### `$DIR/_METHODOLOGY.md`

```markdown
---
type: research-methodology
subtype: web
status: active
created: <YYYY-MM-DD>
parent: _SUMMARY.md
level: <STANDARD|APPROFONDI>
tokens_estimated: <N>
tags: [research, web, methodology]
---

# Méthodologie de recherche

## Paramètres
- Niveau : <STANDARD|APPROFONDI>
- Type : <fact|opinion|comparison|exploration>
- HN activé : <oui|non>

## Contexte projet utilisé
<fichiers lus en Phase 1 et info extraite>

## Queries lancées (Phase 2-3)
1. `<query 1>` → WebSearch → N résultats dont M fetchés
2. `<query 2>` → WebSearch → ...
3. `<query contextuelle>` → Context7 / HN / etc.

## Sources écartées
| URL | Raison |
|-----|--------|
| ... | paywall / 404 / JS-only / hors-sujet / daté YYYY |

## Angles morts explorés (Phase 9)
<ce que l'avocat du diable a identifié et traité, ou non>

## Validations
- Phase 10 : <nombre URLs vérifiées / total citées>
- ⚠️ URLs citées non vérifiées : <liste ou "aucune">

## Tokens consommés (estimation)
- Phase 3 (sondage) : ~<N> tokens
- Phase 5 (fetch) : ~<N> tokens
- Phase 8 (synthèse) : ~<N> tokens
- Phase 9 (2e vague) : ~<N> tokens (ou 0 si pas déclenchée)
- **Total estimé** : ~<N> tokens

## Limites restantes
<ce que la recherche n'a pas pu couvrir>
```

## Phase 11.5 — Mise à jour du README dispatcher (NOUVEAU)

Maintenir un index de toutes les recherches web dans `.agora-brain/research/web/README.md`, conformément à `.claude/rules/brain.md` ("Mettre à jour le README dispatcher du dossier parent après création/déplacement").

### Si le fichier n'existe pas

Crée `.agora-brain/research/web/README.md` avec :

```markdown
---
type: research-index
subtype: web
status: active
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
tags: [research, web, index]
---

# Index des recherches web

Toutes les recherches lancées via `/research:web` sont listées ici par ordre chronologique inverse (plus récent en haut).

## Recherches

| Date | Question | Niveau | Type | Dossier |
|------|----------|--------|------|---------|
| <DATE> <TIME> | <question> | <level> | <research_type> | [[<DATE>_<TIME>_<SLUG>/_SUMMARY\|<slug>]] |
```

### Si le fichier existe déjà

1. Lis son contenu (Read).
2. Insère une nouvelle ligne dans le tableau `## Recherches` **juste après l'en-tête du tableau** (ordre chronologique inverse, plus récent en haut).
3. Mets à jour le champ `updated:` du frontmatter à la date courante (YYYY-MM-DD).
4. Conserve toutes les entrées existantes intactes.

### Garde-fous

- NE PAS écraser le README existant
- NE PAS supprimer des entrées existantes
- Si le parsing du tableau échoue (format cassé ou en-tête introuvable) → créer une section `## Entrées non parsées` en bas du fichier avec la nouvelle entrée, et signaler le problème dans le rapport final

## Rapport final dans le chat

```
✅ Recherche /research:web terminée
   Question : <question>
   Niveau : <STANDARD|APPROFONDI>
   Type : <fact|opinion|comparison|exploration>
   HN : <oui|non>

📊 Stats :
   Sources fetchées : <N> / <M demandées>
   Sources écartées : <X>
   Affirmations haute confiance : <Y>
   Affirmations moyenne confiance : <Z>
   Affirmations basse confiance : <W>
   2e vague déclenchée : <oui|non>
   ⚠️ URLs non vérifiées : <N ou 0>

💰 Estimation coût : ~<N> tokens

📁 Fichiers générés :
   .agora-brain/research/web/<DATE>_<TIME>_<SLUG>/_SUMMARY.md
   .agora-brain/research/web/<DATE>_<TIME>_<SLUG>/_SOURCES.md
   .agora-brain/research/web/<DATE>_<TIME>_<SLUG>/_METHODOLOGY.md
   .agora-brain/research/web/<DATE>_<TIME>_<SLUG>/raw/ (<N> fichiers)

📋 TL;DR : <3-5 lignes max, la réponse essentielle>

🚦 Prochaine action : ouvre _SUMMARY.md pour la synthèse complète.
```

## Garde-fous absolus (récapitulatif)

- JAMAIS utiliser WebFetch dans cette commande
- JAMAIS inventer une URL, une date, un niveau d'autorité
- JAMAIS affirmer une information avec `[haute]` confiance sans 3 sources indépendantes
- JAMAIS modifier le projet (hors création de fichiers dans `.agora-brain/research/web/`)
- JAMAIS commit ni push depuis cette commande
- TOUJOURS sauvegarder les fichiers même si recherche partielle
- TOUJOURS signaler les limites rencontrées dans `_METHODOLOGY.md`
- TOUJOURS inclure le frontmatter YAML conforme à `.claude/rules/brain.md` (`type`, `status`, `created` obligatoires) dans CHAQUE fichier généré sous `.agora-brain/**`. Aucune exception.
- TOUJOURS mettre à jour le README dispatcher `.agora-brain/research/web/README.md` en Phase 11.5
- TOUJOURS utiliser les wikilinks Obsidian `[[chemin|texte]]` pour tout lien interne au brain. JAMAIS de lien markdown `[text](path.md)` qui pointe vers `.agora-brain/**` (règle `.claude/rules/brain.md` ligne 8).
- Maximum 2 itérations d'avocat du diable (Phase 9), sinon signaler les limites
- Si le coût tokens dépasse 200% de la cible (300k pour APPROFONDI, 100k pour STANDARD) → STOP la recherche, produire les fichiers avec ce qu'on a, signaler le débordement dans `_METHODOLOGY.md`
