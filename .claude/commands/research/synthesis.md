---
description: Recherche web synthétisée en 5 moments, sans persistance des sources brutes. Sortie unique dans `$RESEARCH_DIR/summary/<slug>_<date>.md`. `--depth` pilote ampleur et rigueur.
allowed-tools: WebSearch, Bash, Read, Write, Glob, Grep, mcp__fetch__*, mcp__playwright__*, mcp__hackernews__*, mcp__context7__*, mcp__datagouv__*
argument-hint: "<question> [--depth=light|medium|deep] [--with-hn] [--out=<dir>]"
---

# /research:synthesis — Recherche web synthétisée sans persistance des sources (v1.0)

## Différence avec `/research:web`

Cette commande fait **les mêmes recherches web** que `/research:web` (mêmes outils, mêmes principes, même rigueur), mais ne **persiste pas les sources brutes**. Elle produit uniquement le fichier summary dans `$RESEARCH_DIR/summary/<slug>_<date>.md`. Aucun dossier `sources/` n'est créé pour cette recherche.

| | `/research:web` | `/research:synthesis` |
|---|---|---|
| Recherches web | ✅ | ✅ |
| Sauvegarde des sources brutes | ✅ (dossier `sources/<slug>_<date>/`) | ❌ |
| Citations `[src <slug>]` dans le summary | ✅ | ❌ (sources évoquées mais non référencées) |
| Tableau Sources final | ✅ | ❌ |
| Section "Sources liées" | ✅ | ❌ |
| Bibliographie complémentaire | ✅ | ❌ |
| Journal des queries | ✅ | ✅ (allégé) |
| Output | summary + dossier sources | summary seul |

**Quand utiliser `/research:synthesis` plutôt que `/research:web`** :
- Synthèse ponctuelle qu'on n'a pas besoin de revisiter au niveau source
- Sujet où la fidélité au verbatim n'est pas critique
- Quand on cherche une vue d'ensemble vite obtenue, pas une archive
- Quand le coût de stockage des sources brutes est jugé disproportionné par rapport à la valeur de la synthèse

**Quand utiliser `/research:web`** :
- Recherche structurante pour le projet (sera consultée plusieurs fois)
- Sujet où il faudra pouvoir vérifier les sources mot pour mot
- Sujet contesté où la traçabilité des claims est critique

## Légende

▶ instruction à exécuter — ℹ️ note / rappel — 💡 exemple

## Règles absolues

▶ N'utilise **jamais** WebFetch. Toujours Fetch MCP, ou Playwright MCP en fallback.
▶ Si Fetch MCP et Playwright MCP sont tous deux indisponibles dans la session : signale-le au Moment 3 et dégrade en mode "WebSearch-only" (synthèse à partir des snippets, confiance plafonnée à `moyenne`, signalé en "Limites").
▶ Ne modifie **jamais** le projet hors du dossier de sortie.
▶ Ne commit **jamais**, ne push **jamais** depuis cette commande.
▶ N'invente **jamais** une URL, une date, un auteur, un niveau d'autorité.
▶ **Ne sauvegarde jamais** les sources brutes. Le summary est l'unique livrable. Si la synthèse échoue, il faut relancer la recherche — pas de filet de sécurité côté `sources/`.

## Configuration (dossier de sortie)

La commande détermine le dossier racine `$RESEARCH_DIR` dans cet ordre :

1. Flag `--out=<dir>` s'il est présent dans `$ARGUMENTS`
2. Défaut : `./.ibee-brain/wiki/research`

Sortie produite par cette commande :
- **Summary uniquement** : `$RESEARCH_DIR/summary/<SLUG>_<DATE>.md`

Aucun dossier `sources/` n'est créé.

## Parsing des arguments

▶ Extrait la question depuis `$ARGUMENTS` (tout ce qui n'est pas un flag).
▶ Lis le flag `--depth` : `light` / `medium` / `deep` (défaut).
▶ Lis le flag `--with-hn` : si présent, active Hacker News MCP dans le Moment 2.
▶ Lis le flag `--out=<dir>` : override explicite du dossier de sortie.
▶ Si la question est vide → STOP, affiche : `❌ Aucun sujet. Usage : /research:synthesis "ma question" [--depth=light|medium|deep] [--with-hn] [--out=<dir>]`

## Les 6 principes qui traversent tous les moments

Identiques à `/research:web` (voir cette commande pour le détail) :

1. **Indépendance des sources** — 3 sources de même biais structurel = 1 voix.
2. **Fait vs interprétation** — séparation stricte dans la sortie.
3. **Adversarial réel** — `medium`/`deep` testent l'hypothèse dominante.
4. **Transposition signalée** — si X parle de Y ≠ sujet, c'est une interprétation.
5. **Décomposition avant recherche** — sous-questions atomiques avant queries.
6. **Pivot piloté** — termes émergents deviennent queries additionnelles.

ℹ️ **Différence d'application en synthesis** : comme aucune source n'est persistée, l'évaluation des principes 1, 2 et 4 se fait en mémoire pendant la synthèse. La rigueur de marquage de la confiance reste la même, sans que les claims puissent être tracés à un fichier source ouvert pour vérification ultérieure.

---

## Moment 1 — Cadrer & décomposer

**But** : comprendre quelle question on traite réellement, et la transformer en un arbre de sous-questions atomiques avant d'ouvrir le moindre navigateur.

| Depth | Ce qui change |
|-------|---------------|
| light | Reformuler en 1 phrase, décomposer en 2 sous-questions max, lire 1 fichier contexte si évident |
| medium | Reformuler, identifier hypothèses encodées, décomposer en 2-4 sous-questions, lire 2 fichiers contexte pertinents |
| deep | Reformuler, décomposer en 3-5 sous-questions hiérarchisées (descriptives avant normatives), identifier hypothèses, lire 3 fichiers, noter contraintes linguistiques/géographiques |

▶ Reformule la question en une phrase neutre. Si elle encode une hypothèse, isole-la explicitement.

▶ **Décompose en sous-questions atomiques.** Une sous-question est atomique si elle a une réponse unique : oui/non, un fait, une liste finie. Les sous-questions descriptives ("quoi ?", "combien ?") précèdent toujours les sous-questions normatives ("pourquoi ?", "comment ?").

▶ **Génère le slug de la recherche** (3-4 mots discriminants, kebab-case, ~30 caractères max) à partir de la question reformulée. Exemples :
- *"Comment les meilleurs définissent un positionnement produit"* → `frameworks-positionnement`
- *"Modèle économique pour SaaS solopreneur FR"* → `pricing-saas-solopreneur`
- *"Quelles métriques pour un MVP B2B"* → `metriques-mvp-b2b`

▶ **Lecture de contexte projet (optionnelle)** :
- Si `.claude/research-config.yml` déclare des `context_dirs` : Glob puis Read selon depth.
- Si `.ibee-brain/_IBEE` ou `.ibee-brain/marche/` existent 
- Si rien de pertinent : note "hors-projet" et passe au Moment 2.

▶ Produis un bloc "Cadrage" (8-12 lignes) contenant : question reformulée, hypothèses encodées, **arbre de sous-questions**, contexte projet extrait (citations courtes), contraintes (langue, géographie), **slug retenu**.

---

## Moment 2 — Chercher & classer

**But** : générer les queries **par sous-question**, lancer les recherches, classer les résultats par pertinence + autorité + diversité.

| Depth | Queries totales | dont adversariales |
|-------|----------------|---------------------|
| light | 2-3 | 0 (exception assumée) |
| medium | 4-6 | ≥ 1 |
| deep | 9-12 | ≥ 2 (couvrant ≥ 2 sous-questions différentes) |

▶ **Chaque query est enfant d'une sous-question identifiée au Moment 1.**

▶ Varie : vocabulaire (synonymes), langue (FR + EN si FR-first), angle (défenseurs / critiques / neutres).

▶ Pour `medium` et `deep` : formule au moins une query qui cherche à **infirmer** l'hypothèse encodée (principe 3).

▶ Lance toutes les queries WebSearch **dans un seul tour d'outils** (appels parallèles). Même règle pour les MCP ci-dessous.

▶ Si `--with-hn` actif : Hacker News MCP dans le même tour. Filtrage : `score ≥ 30 ET (publié < 24 mois OU sujet à dynamique stable)`.

▶ Si la question contient un identifiant de bibliothèque (`Next.js`, `Tailwind`, etc.) : appelle Context7 MCP dans le même tour.

▶ Si la question concerne des **données publiques françaises** : appelle les tools `mcp__datagouv__*` dans le même tour.

▶ Classe les résultats bruts selon trois axes :

- **Autorité** (pyramide) : 1 doc officielle / spec / RFC / **data.gouv.fr** · 2 blog vendor / paper / conf · 3 HN top comments / SO accepted / GH discussions · 4 blogs réputés / Medium / Reddit · 5 contenu SEO suspect / forums obscurs
- **Fraîcheur** : *Tech/pricing/politique/produit* — ok (< 12 mois) · daté (12-24 mois) · périmé (> 24 mois). *Concepts stables / théorie / histoire / droit établi* — `stable`, juger sur autorité seule.
- **Perspective** : qui parle et son biais probable.

▶ **Journal de queries allégé** : pour chaque query, note la query exacte et la sous-question parente. Le détail SERP/examinés/retenus n'est pas requis comme dans `/research:web` (puisque les sources ne sont pas persistées).

---

## Moment 3 — Extraire & pivoter (en mémoire)

**But** : lire fidèlement le contenu des sources retenues **sans les sauvegarder**, et **piloter les pivots** quand le contenu révèle un angle non anticipé.

### 3.1 — Préparation des chemins

▶ À partir du slug retenu au Moment 1 : construis `DATE=YYYY-MM-DD`.

▶ **Gestion des collisions** : si `$RESEARCH_DIR/summary/<SLUG>_<DATE>.md` existe déjà, ajoute un suffixe incrémental `_2`, `_3`, etc. avant l'extension.

▶ Crée le dossier summary si nécessaire :

```bash
mkdir -p "$RESEARCH_DIR/summary"
```

▶ Stocke le chemin dans une variable mentale `$SUMMARY_PATH = $RESEARCH_DIR/summary/<SLUG>_<DATE>.md`.

### 3.2 — Fetch en mémoire

▶ Fetch par batches de 3-5 avec Fetch MCP, appels parallèles dans un même tour.
▶ Si un fetch retourne vide ou uniquement du JS → retry avec Playwright MCP (un seul essai).
▶ Si Playwright échoue → marque "inaccessible" mentalement, continue.

▶ **Aucune source n'est sauvegardée sur disque.** Tu lis le contenu, tu en extrais la substance, tu mémorises mentalement les éléments clés (faits chiffrés, citations courtes, angles distinctifs, points de divergence, dates, auteurs) que tu vas utiliser dans la synthèse.

▶ **Limite cognitive** : ne lis que ce que tu peux mémoriser fidèlement pour la synthèse. Si une source est très dense, focalise sur les passages liés à tes sous-questions, pas sur l'intégralité.

ℹ️ Paywall, 404, hors-sujet : note mentalement pour "Sources évoquées" du Moment 4, passe à la suivante.

### 3.3 — Pilotage des pivots (principe 6)

Applicable en `medium` et `deep` (skip en `light`).

▶ Après le fetch initial mémoire, identifie les **termes émergents** : concepts, personnes, méthodes, entités cités récurremment par 2+ sources, **non présents** dans tes queries initiales.

▶ **Règles de pivot** :
- `medium` : max 2 queries de pivot, chacune donne droit à max 2 nouvelles sources lues.
- `deep` : max 4 queries de pivot sur 2 itérations max. Condition de sortie : pas de nouveau terme émergent depuis une itération complète.

▶ Les sources de pivot sont lues mentalement, pas persistées. Note dans la synthèse qu'elles sont issues de pivot.

---

## Moment 4 — Synthétiser

**But** : produire la réponse avec rigueur, lisibilité et neutralité — sans pouvoir s'appuyer sur des fichiers sources persistés.

| Depth | Forme | Triangulation | Longueur cible |
|-------|-------|---------------|----------------|
| light | Réponse courte, tableau ou liste si pertinent | 1 source fiable suffit pour un fait brut | ≤ 400 mots |
| medium | Synthèse structurée par sous-question, avec nuances | 2+ sources indépendantes pour les affirmations centrales | 600 – 1200 mots |
| deep | Synthèse narrative riche, verbatims courts, divergences | 3+ sources indépendantes pour les affirmations centrales | 1200 – 2500 mots |

▶ Construis mentalement un tableau "affirmation × sources × confiance" parcourant **toutes** les sources lues (initiales + pivot). Comme aucune source n'est persistée, tu cites les sources par **nom + URL inline** dans le summary, sans passer par un système `[src N]`.

▶ Applique le principe 1 : deux sources du même type éditorial comptent comme une. Dégrade la confiance.

▶ Applique le principe 2 : sépare **strictement** faits observés et interprétations. Faits : citation inline avec URL ou nom de source dans le texte, exemple : *"Selon April Dunford (Obviously Awesome, 2019), les 5 composantes du positionnement sont…"*. Interprétations : marquées "interprétation" ou en section dédiée.

▶ Applique le principe 4 : signale toute transposition avec drapeau "transposition" et confiance dégradée.

▶ Identifie les **points de divergence** entre sources : quand deux sources se contredisent, c'est un signal à traiter explicitement, pas à lisser.

▶ **Règle citation verbatim** : chaque citation directe ≤ 25 mots, entre guillemets, **une seule par source citée**. Au-delà, paraphrase obligatoire.

▶ Écris `$SUMMARY_PATH` avec ces sections (pas de Sources / Sources liées / Bibliographie / Journal des queries détaillé) :

- **Frontmatter YAML** :
  ```yaml
  ---
  type: research
  status: active
  created: <date>
  short_title: "Frameworks positionnement"
  depth: <light|medium|deep>
  question: "..."
  sub_questions: [...]
  tags: [research, synthesis, ...]
  ---
  ```
- **Titre + métadonnées** : question, date, depth, mode (normal / dégradé), nombre approximatif de sources lues
- **TL;DR** : 3-5 décisions ou réponses courtes (similaire à `_research-positionnement.md`)
- **Cadrage** : question reformulée + arbre des sous-questions + hypothèses encodées
- **Synthèse exécutive** : section narrative qui répond à la question principale, avec citations inline (auteur + ouvrage/site + année quand pertinent)
- **Réponse par sous-question** ou **sections numérotées thématiques** : selon ce qui sert mieux la lisibilité. Faits observés `[confiance: ...]` avec citations inline. Distinction faits/interprétations toujours visible.
- **Cartographie** (tableaux) si pertinent : frameworks comparés, écoles concurrentes, options techniques — un tableau qui synthétise les comparaisons
- **Synthèse transversale** : interprétations construites, cadres analytiques marqués comme tels
- **Points de divergence** : camps présents, sans arbitrer à la place du lecteur
- **Limites** : ce que la synthèse n'a pas pu couvrir (langue, accès payant, angle non exploré, transpositions non vérifiées, mode dégradé, **et le fait structurel que les sources ne sont pas tracées au verbatim**)

ℹ️ **Format de citation inline** : `*"Selon [auteur/source] ([année si pertinent](url))..."*`. La densité de citations dans le texte remplace le tableau Sources.

ℹ️ **Pas de section "Sources liées"** dans cette commande. Les sources sont tissées dans le texte de la synthèse, pas listées en fin de document.

---

## Moment 5 — Valider & livrer

**But** : vérifier la cohérence interne, produire la sortie finale, mettre à jour l'index.

▶ **Validation des citations inline** : chaque affirmation `[confiance: haute]` doit avoir au moins une source nommée (auteur + ouvrage/site, ou URL inline) dans le texte. Si tu ne peux plus retrouver la source d'une affirmation que tu as faite, dégrade sa confiance.

▶ **Validation sémantique (spot-check)** : compte les affirmations `[confiance: haute]` dans le summary = `H`. Tire au hasard `max(2, ceil(H / 5))` (plafond 6). Pour chacune, **ré-interroge mentalement** : est-ce que la source citée supporte vraiment cette affirmation ? Si tu doutes, relance une query de vérification ciblée (compte dans le budget queries) ou dégrade la confiance.

▶ **Validation frontmatter** : le summary commence par un frontmatter YAML valide avec `short_title:` non-vide.

▶ **Mise à jour de l'index** `$RESEARCH_DIR/README.md` :
- Si absent : crée-le avec frontmatter (`type: research-index`, `status: active`, `created: <date>`, `updated: <date>`) et section `## Recherches` contenant un tableau (Date, Short title, Question, Depth, Type, Summary, Sources) suivi immédiatement du marqueur `<!-- RESEARCH_ROW_ANCHOR -->`.
- S'il existe : insère la nouvelle ligne **juste avant** le marqueur, en mettant `synthesis` dans la colonne Type et `—` dans la colonne Sources (puisque pas de dossier sources).
- Marqueur absent ou tableau non-parsable : section `## Entrées non parsées`, signale dans le rapport final.

ℹ️ Format de la ligne : `| 2026-05-01 | Frameworks positionnement | Comment les meilleurs définissent... | deep | synthesis | [[summary/frameworks-positionnement_2026-05-01]] | — |`

▶ **Rapport final dans le chat** (format court) :

```
✅ Synthèse terminée
   Question : <question reformulée>
   Sous-questions : <N>
   Depth : <light|medium|deep> · HN : <oui|non>
   Sources lues : <N> (non persistées)
   Mode : <normal|dégradé WebSearch-only>

📁 Summary : $RESEARCH_DIR/summary/<SLUG>_<DATE>.md

📋 TL;DR : <3-5 lignes qui répondent à la question>

⚠️ À signaler : <limites marquantes, transpositions, ou "rien à signaler">
   ⚠️ Rappel : aucune source n'est persistée. Pour archive avec sources brutes, utiliser /research:web.
```

ℹ️ **Budget tokens dépassé** : si le coût dépasse largement ce qui était attendu pour le depth, stoppe proprement, produis la sortie avec ce que tu as, signale en "Limites".

---

## Garde-fou final

▶ Avant de conclure, relis ton summary. Pose-toi ces **six questions binaires** (5 communes à `/research:web` + 1 spécifique à `/research:synthesis`) :

1. *Ai-je confondu "3 sources" avec "3 sources indépendantes" quelque part ?* Si **oui** → dégrade la confiance.
2. *Une de mes interprétations fortes traîne-t-elle dans la section "Faits observés" ?* Si **oui** → déplace-la dans "Interprétations".
3. *(medium/deep)* *L'avocat du diable s'est-il contenté d'enrichir la thèse au lieu de la tester ?* Si **oui** → signale en "Limites" et, si possible, relance une query strictement adversariale.
4. *Ma synthèse reprend-elle l'ordre de lecture des sources (risque d'ancrage) ?* Si **oui** → réorganise par sous-question ou axe thématique, pas chronologiquement.
5. *Existe-t-il une catégorie de preuves qui, par nature, ne serait pas indexée ou publiée (biais de survivance) ?* Si **oui** → mentionne-la en "Limites" même sans donnée.
6. **(spécifique synthesis)** *Ai-je fait une affirmation forte que je serais incapable de retracer si on me la conteste demain ?* Si **oui** → soit dégrade la confiance, soit nomme explicitement la source dans le texte (auteur + ouvrage/site/année), soit retire l'affirmation. Sans dossier `sources/` pour vérifier, tout claim non explicitement attribué est fragile.

Si la réponse est **"non"** aux six, la synthèse est livrable.
