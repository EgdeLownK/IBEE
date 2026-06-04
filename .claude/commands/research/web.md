---
description: Recherche web structurée en 5 moments, indépendante du projet. Sources sauvegardées dans `$RESEARCH_DIR/sources/<slug>_<date>/`, summary dans `$RESEARCH_DIR/summary/<slug>_<date>.md`. `--depth` pilote ampleur et rigueur.
allowed-tools: WebSearch, Bash, Read, Write, Glob, Grep, mcp__fetch__*, mcp__playwright__*, mcp__hackernews__*, mcp__context7__*, mcp__datagouv__*
argument-hint: "<question> [--depth=light|medium|deep] [--with-hn] [--out=<dir>]"
---

# /research:web — Recherche web structurée (v3.1)

## Légende

▶ instruction à exécuter — ℹ️ note / rappel — 💡 exemple

## Règles absolues

▶ N'utilise **jamais** WebFetch. Toujours Fetch MCP, ou Playwright MCP en fallback.
▶ Si Fetch MCP et Playwright MCP sont tous deux indisponibles dans la session : signale-le au Moment 3 et dégrade en mode "WebSearch-only" (synthèse à partir des snippets, confiance plafonnée à `moyenne`, signalé en "Limites").
▶ Ne modifie **jamais** le projet hors du dossier de sortie (voir "Configuration" ci-dessous).
▶ Ne commit **jamais**, ne push **jamais** depuis cette commande.
▶ N'invente **jamais** une URL, une date, un auteur, un niveau d'autorité.
▶ Sauvegarde les sources brutes **avant** de synthétiser. Si la synthèse échoue, le dossier `sources/` reste exploitable.
▶ **Les sources entre elles ne se référencent jamais.** Chaque fichier source dans `sources/<slug>_<date>/` est isolé. Le seul fil rouge passe par le `summary.md` correspondant.

## Configuration (dossier de sortie)

La commande détermine le dossier racine `$RESEARCH_DIR` dans cet ordre :

1. Flag `--out=<dir>` s'il est présent dans `$ARGUMENTS`
2. Défaut : `./.ibee-brain/wiki/research`

Sortie produite par cette commande :
- **Summary** : `$RESEARCH_DIR/summary/<SLUG>_<DATE>.md`
- **Sources** : `$RESEARCH_DIR/sources/<SLUG>_<DATE>/<source-slug>.md` (un fichier par source)

ℹ️ Les anciennes recherches (avant la réorganisation) restent dans `$RESEARCH_DIR/web/<SLUG>_<DATE>_<TIME>/` — cohabitation assumée, ne pas migrer automatiquement.

## Parsing des arguments

▶ Extrait la question depuis `$ARGUMENTS` (tout ce qui n'est pas un flag).
▶ Lis le flag `--depth` : `light` / `medium` / `deep` (défaut).
▶ Lis le flag `--with-hn` : si présent, active Hacker News MCP dans le Moment 2.
▶ Lis le flag `--out=<dir>` : override explicite du dossier de sortie.
▶ Si la question est vide → STOP, affiche : `❌ Aucun sujet. Usage : /research:web "ma question" [--depth=light|medium|deep] [--with-hn] [--out=<dir>]`

## Les 6 principes qui traversent tous les moments

Ces principes sont **appliqués partout**, sans phase dédiée. Chaque moment y réfère.

**Principe 1 — Indépendance des sources.** Trois sources qui ont le même biais structurel (même type d'acteur, même intérêt économique à défendre une thèse) valent **une seule voix**. Pour qu'une affirmation soit corroborée, il faut trois sources qui diffèrent sur au moins un de ces axes : organisation productrice, modèle économique, angle éditorial.

ℹ️ **Exception `light`** : en depth `light`, une seule source fiable suffit pour un fait brut (pricing officiel, spec technique, date d'un événement). C'est un tradeoff assumé : les affirmations non triangulées sont alors marquées `[confiance: basse]` par défaut, sauf s'il s'agit d'une source de niveau 1 (doc officielle, spec) auquel cas elles restent `[confiance: moyenne]`.

**Principe 2 — Fait vs interprétation.** Un fait observé est une affirmation qu'une source publie explicitement et qu'on peut recopier (citation courte) ou paraphraser fidèlement. Une interprétation est une déduction, synthèse, ou cadre analytique **construit** à partir de plusieurs sources. Les deux sont utiles, mais ne vivent **jamais** dans la même section de la sortie.

**Principe 3 — Adversarial réel.** Chercher "des angles morts" conduit à enrichir la thèse. Chercher "ce qui infirme la thèse centrale" conduit à la tester. Toute recherche `medium` ou `deep` inclut au moins une query formulée contre l'hypothèse dominante.

**Principe 4 — Transposition signalée.** Si une source parle de X et la recherche porte sur Y ≠ X, l'extrapolation est une **interprétation**, pas un fait. La dégradation de confiance est systématique.

**Principe 5 — Décomposition avant recherche.** Une question complexe se recherche *après* avoir été décomposée en sous-questions atomiques (réponse unique : oui/non, un fait, une liste). Les queries du Moment 2 sont toujours enfants explicites de sous-questions, jamais enfants directs de la question originale si celle-ci n'est pas atomique.

**Principe 6 — Pivot piloté.** Si le fetch d'une source fait émerger un concept, une personne, ou un terme récurrent non identifié au Moment 2, ce terme devient une query additionnelle (pivot). La recherche initiale n'épuise jamais le terrain ; la plupart des trouvailles significatives émergent du 2ᵉ ou 3ᵉ pivot, pas de la requête initiale.

---

## Moment 1 — Cadrer & décomposer

**But** : comprendre quelle question on traite réellement, et la transformer en un arbre de sous-questions atomiques avant d'ouvrir le moindre navigateur.

| Depth | Ce qui change |
|-------|---------------|
| light | Reformuler en 1 phrase, décomposer en 2 sous-questions max, lire 1 fichier contexte si évident |
| medium | Reformuler, identifier hypothèses encodées, décomposer en 2-4 sous-questions, lire 2 fichiers contexte pertinents |
| deep | Reformuler, décomposer en 3-5 sous-questions hiérarchisées (descriptives avant normatives), identifier hypothèses, lire 3 fichiers, noter contraintes linguistiques/géographiques |

▶ Reformule la question en une phrase neutre. Si elle encode une hypothèse (ex : "pourquoi X est mieux que Y"), isole-la explicitement.

▶ **Décompose en sous-questions atomiques.** Une sous-question est atomique si elle a une réponse unique : oui/non, un fait, une liste finie. Les sous-questions descriptives ("quoi ?", "combien ?") précèdent toujours les sous-questions normatives ("pourquoi ?", "comment ?"). Chaque sous-question sera adressée par au moins une query au Moment 2.

▶ **Génère le slug de la recherche** (3-4 mots discriminants, kebab-case, ~30 caractères max) à partir de la question reformulée. Exemples :
- *"Comment les meilleurs définissent un positionnement produit"* → `frameworks-positionnement`
- *"Modèle économique pour SaaS solopreneur FR"* → `pricing-saas-solopreneur`
- *"Quelles métriques pour un MVP B2B"* → `metriques-mvp-b2b`

▶ **Lecture de contexte projet (optionnelle)** :
- Si `.claude/research-config.yml` déclare des `context_dirs` : Glob puis Read selon depth.
- Si `.ibee-brain/_IBEE` ou `.ibee-brain/marche/` existent.
- Si rien de pertinent : note "hors-projet" et passe au Moment 2.

▶ Produis un bloc "Cadrage" (8-12 lignes) contenant : question reformulée, hypothèses encodées, **arbre de sous-questions**, contexte projet extrait (citations courtes), contraintes (langue, géographie), **slug retenu**.

💡 Question : "pourquoi les solopreneurs créent un site vitrine ?"
Hypothèse encodée : "ils en créent un" (à tester).
Sous-questions :
- SQ1 (desc) : les solopreneurs créent-ils un site vitrine ? (taux, par secteur)
- SQ2 (desc) : quelles alternatives utilisent-ils (link-in-bio, profils plateformes) ?
- SQ3 (norm) : si oui, quelles motivations documentées ?
- SQ4 (adv) : quels cas documentés d'arrêt ou de non-création ?

Slug : `solopreneurs-site-vitrine`

---

## Moment 2 — Chercher & classer

**But** : générer les queries **par sous-question**, lancer les recherches, classer les résultats par pertinence + autorité + diversité.

| Depth | Queries totales | dont adversariales | Sources à classer pour fetch |
|-------|----------------|---------------------|------------------------------|
| light | 2-3 | 0 (exception assumée) | max 3 |
| medium | 4-6 | ≥ 1 | max 6 |
| deep | 9-12 | ≥ 2 (couvrant ≥ 2 sous-questions différentes) | max 20 |

▶ **Chaque query est enfant d'une sous-question identifiée au Moment 1.** Note le mapping query → sous-question pour le Moment 5.

▶ Varie : vocabulaire (synonymes), langue (FR + EN si FR-first), angle (défenseurs / critiques / neutres).

▶ Pour `medium` et `deep` : formule au moins une query qui cherche à **infirmer** l'hypothèse encodée (principe 3).

▶ Lance toutes les queries WebSearch **dans un seul tour d'outils** (appels parallèles). Même règle pour les MCP ci-dessous.

▶ Si `--with-hn` actif : Hacker News MCP dans le même tour. Filtrage : `score ≥ 30 ET (publié < 24 mois OU sujet à dynamique stable)`. Si rien ne passe, fallback "publié < 6 mois" avec signalement.

▶ Si la question contient un identifiant de bibliothèque (`Next.js`, `Tailwind`, `sqlx`, ou motif de version `v3`, `2.x`, `18+`) : appelle Context7 MCP (`resolve-library-id` puis `get-library-docs`) dans le même tour.

▶ Si la question concerne des **données publiques françaises** (statistiques INSEE, démographie, économie, territoires, entreprises SIRENE, secteurs réglementés, marchés publics) : appelle les tools `mcp__datagouv__*` dans le même tour. Workflow type : `search_datasets` pour trouver le bon dataset, puis `query_resource_data` pour interroger les valeurs.

▶ Classe les résultats bruts selon trois axes :

- **Autorité** (pyramide) : 1 doc officielle / spec / RFC / **data.gouv.fr** · 2 blog vendor / paper / conf · 3 HN top comments / SO accepted / GH discussions · 4 blogs réputés / Medium / Reddit · 5 contenu SEO suspect / forums obscurs
- **Fraîcheur** :
  - *Tech/pricing/politique/produit* : ok (< 12 mois ; < 6 mois pour pricing et politique) · daté (12-24 mois) · périmé (> 24 mois)
  - *Concepts stables / théorie / histoire / droit établi* : marquer `stable`, juger sur autorité seule.
  - Doute → trancher "tech" (plus exigeant).
- **Perspective** : qui parle et son biais probable.

▶ Priorise pour le fetch : autorité haute + fraîcheur ok/stable + **diversité de perspectives** (principe 1).

▶ **Journal de queries** : pour chaque query, note : query exacte, sous-question parente, nombre de résultats SERP obtenus, nombre examinés, nombre retenus pour fetch, raison d'écartement des autres. Ce journal alimentera le tableau Moment 5.

ℹ️ Opérateurs utiles : `site:`, `after:YYYY-MM-DD`, `"expression"`.

💡 Query adversariale pour "format compact gagne" : `"why landing pages still convert better than link-in-bio 2026"`.

---

## Moment 3 — Extraire & pivoter

**But** : récupérer fidèlement le contenu des sources retenues, et **piloter les pivots** quand le contenu révèle un angle non anticipé.

### 3.1 — Préparation des chemins

▶ À partir du slug retenu au Moment 1 : construis `DATE=YYYY-MM-DD`.

▶ **Gestion des collisions** : si `$RESEARCH_DIR/summary/<SLUG>_<DATE>.md` existe déjà, ajoute un suffixe incrémental `_2`, `_3`, etc. avant l'extension. Le dossier `sources/<SLUG>_<DATE>[_N]/` correspondant suit le même pattern.

▶ Crée le dossier sources (substitue toi-même le slug et la date — pas de littéral `<question>`) :

```bash
mkdir -p "$RESEARCH_DIR/sources/<SLUG>_<DATE>"
mkdir -p "$RESEARCH_DIR/summary"
```

▶ Stocke les chemins dans des variables mentales :
- `$SOURCES_DIR` = `$RESEARCH_DIR/sources/<SLUG>_<DATE>`
- `$SUMMARY_PATH` = `$RESEARCH_DIR/summary/<SLUG>_<DATE>.md`

### 3.2 — Fetch initial

▶ Fetch par batches de 3-5 avec Fetch MCP, appels parallèles dans un même tour.
▶ Si un fetch retourne vide ou uniquement du JS → retry avec Playwright MCP (un seul essai).
▶ Si Playwright échoue → marque "inaccessible", continue.

▶ **Pour chaque source fetchée**, génère un **slug court** (3-4 mots discriminants, kebab-case, ~30 caractères max) qui résume le contenu. Exemples :
- *"April Dunford — Obviously Awesome 5 components positioning"* → `dunford-5-composantes`
- *"Marty Neumeier — The Onlyness Test for radical brand differentiation"* → `onliness-test-neumeier`
- *"Plausible $1M ARR bootstrap zero paid ads"* → `plausible-bootstrap-arr`

▶ **Gestion des collisions de slug source** : si deux sources d'une même recherche produisent le même slug, ajoute un suffixe incrémental `_2`, `_3` au sein du dossier.

▶ Sauvegarde chaque source dans `$SOURCES_DIR/<source-slug>.md` avec frontmatter complet :

```yaml
---
short_title: "Dunford 5 composantes"
url: https://www.aprildunford.com/...
title: "Titre original long de la page web"
fetched_at: 2026-05-01T14:30:00Z
published_at: 2024-09-15
authority: 1
freshness: ok
perspective: "auteur de référence — biais pro-méthode"
fetch_method: fetch_mcp
sub_question: SQ3
pivot: false
---
```

ℹ️ Le `short_title` correspond au slug du fichier (transformé en titre lisible). Il sert à indexer rapidement les sources sans dépendre de l'URL ou du titre original.

▶ **Règle `published_at`** : **uniquement** une date explicite dans le contenu extrait (`<time>`, frontmatter, mention "Published on..."). Ne **jamais** deviner depuis l'URL ou la date de fetch. Introuvable : `published_at: inconnu`.

▶ Ne modifie **jamais** le contenu brut. Le fichier source reste fidèle (tu peux couper nav, pubs, commentaires non-substantiels — note-le dans `extraction_notes`).

▶ **Règle d'isolement** : le fichier source ne contient **aucun wikilink** vers d'autres fichiers du brain ni vers d'autres sources de la même recherche. Le contenu est strictement le contenu fetché + son frontmatter.

### 3.3 — Pilotage des pivots (principe 6)

Applicable en `medium` et `deep` (skip en `light`).

▶ Après le fetch initial, parcours les sources fetchées. Identifie les **termes émergents** : concepts, personnes, méthodes, entités cités récurremment par 2+ sources, **non présents** dans tes queries initiales.

▶ **Règles de pivot** :
- `medium` : max 2 queries de pivot, chacune donne droit à max 2 nouvelles sources fetchées.
- `deep` : max 4 queries de pivot sur 2 itérations max. Condition de sortie : pas de nouveau terme émergent depuis une itération complète.

▶ Les sources issues de pivot sont sauvegardées dans le même dossier `$SOURCES_DIR` (pas de sous-dossier séparé) et portent `pivot: true` dans leur frontmatter + la query de pivot qui les a fait surgir.

ℹ️ Paywall, 404, hors-sujet : note pour "Sources écartées" du Moment 5, passe à la suivante.

---

## Moment 4 — Synthétiser

**But** : produire la réponse avec rigueur, lisibilité et neutralité.

| Depth | Forme | Triangulation | Longueur cible |
|-------|-------|---------------|----------------|
| light | Réponse courte, tableau ou liste si pertinent | 1 source fiable suffit pour un fait brut (voir Principe 1) | ≤ 400 mots |
| medium | Synthèse structurée par sous-question, avec nuances | 2+ sources indépendantes pour les affirmations centrales | 600 – 1200 mots |
| deep | Synthèse narrative riche, verbatims, divergences | 3+ sources indépendantes pour les affirmations centrales | 1200 – 2500 mots |

▶ Construis mentalement un tableau "affirmation × sources × confiance" parcourant **toutes** les sources fetchées (initiales + pivot).

▶ Applique le principe 1 : deux sources du même type éditorial comptent comme une. Dégrade la confiance.

▶ Applique le principe 2 : sépare **strictement** faits observés et interprétations. Faits : citables avec `[src <source-slug>]`. Interprétations : marquées "interprétation" ou en section dédiée.

▶ Applique le principe 4 : signale toute transposition avec drapeau "transposition" et confiance dégradée.

▶ Identifie les **points de divergence** entre sources : quand deux sources se contredisent, c'est un signal à traiter explicitement, pas à lisser.

▶ **Règle citation verbatim** : chaque citation directe ≤ 25 mots, entre guillemets, **une seule par source**. Au-delà, paraphrase obligatoire. Le fichier source garde le texte intégral.

▶ Écris `$SUMMARY_PATH` avec ces sections :

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
  tags: [research, web, ...]
  ---
  ```
- **Titre + métadonnées** : question, date, depth, nombre de sources (initiales + pivot), HN actif o/n
- **Cadrage** : question reformulée + arbre des sous-questions (repris du Moment 1)
- **Réponse par sous-question** : une section par sous-question identifiée, avec faits observés `[confiance: ...]` `[src <source-slug>]`
- **Synthèse transversale** : interprétations, cadres analytiques (marqués construits), conséquences pour le projet
- **Points de divergence** : camps présents, sans arbitrer à la place du lecteur
- **Limites** : ce que la recherche n'a pas pu couvrir (langue, accès payant, angle non exploré, transpositions non vérifiées, mode dégradé, queries de pivot non épuisées)
- **Sources** : tableau avec `<source-slug>`, URL, titre, date pub, autorité, fraîcheur, confiance, méthode fetch, `pivot` o/n, sous-question rattachée
- **Sources liées** : liste à puces de chaque source avec **une description courte** (1 ligne) du contenu de chaque source. Format wikilink obsidian si `.obsidian/` à la racine, sinon markdown standard.
- **Journal des queries** : tableau `Query | Sous-question | Résultats SERP | Examinés | Retenus | Écartés (raison)` — **cette section est obligatoire en medium et deep**

▶ **Format de la section "Sources liées"** :

```markdown
## Sources liées

- [[../sources/frameworks-positionnement_2026-05-01/dunford-5-composantes|Dunford 5 composantes]] — méthode opérationnelle Dunford avec démonstration sur le cas WATCOM
- [[../sources/frameworks-positionnement_2026-05-01/onliness-test-neumeier|Onliness Test Neumeier]] — formulation du test de différenciation radicale
- [[../sources/frameworks-positionnement_2026-05-01/plausible-bootstrap-arr|Plausible bootstrap]] — cas SaaS solo $1M ARR sans marketing payant
```

ℹ️ Les **liens internes** vers des chemins du repo utilisent la syntaxe wikilink si le repo utilise Obsidian (`[[chemin/fichier|texte]]`), sinon markdown standard `[texte](chemin/fichier.md)`. Détecte via présence de `.obsidian/` à la racine.

ℹ️ **Règle d'or de la section "Sources liées"** : 1 ligne par source maximum. Si une description nécessite plus, elle vit dans la synthèse, pas ici.

💡 Interprétation inline : *"La matrice modèle-éco × maturité (interprétation — aucune source ne publie ce cadre, il émerge de la synthèse) permet de..."*

---

## Moment 5 — Valider & livrer

**But** : vérifier la cohérence interne, produire la sortie finale, mettre à jour l'index.

▶ **Validation structurale** : liste tous les `[src <source-slug>]` cités dans le summary. Vérifie qu'ils existent tous comme fichiers dans `$SOURCES_DIR/`. Slug cité absent → flag "Limites".

▶ **Validation Sources liées** : vérifie que **chaque** source du dossier `$SOURCES_DIR/` apparaît dans la section "Sources liées" du summary, et qu'elle a une description courte non-vide.

▶ **Validation sémantique (spot-check)** : compte les affirmations `[confiance: haute]` dans le summary = `H`. Tire au hasard `max(2, ceil(H / 5))` (plafond 6). Pour chacune, vérifie dans le fichier source que le contenu supporte vraiment l'affirmation. Si non, corrige confiance ou affirmation.

▶ **Validation du journal de queries** (medium/deep) : vérifie que le tableau contient autant de lignes que de queries lancées (initiales + pivot), et que chaque query a une sous-question parente identifiée.

▶ **Validation frontmatter** : `summary.md` et chaque fichier source commencent par un frontmatter YAML valide avec `short_title:` non-vide.

▶ **Mise à jour de l'index** `$RESEARCH_DIR/README.md` :
- Si absent : crée-le avec frontmatter (`type: research-index`, `status: active`, `created: <date>`, `updated: <date>`) et section `## Recherches` contenant un tableau (Date, Short title, Question, Depth, Type, Summary, Sources) suivi immédiatement du marqueur `<!-- RESEARCH_ROW_ANCHOR -->` sur sa propre ligne.
- S'il existe : insère la nouvelle ligne **juste avant** le marqueur `<!-- RESEARCH_ROW_ANCHOR -->` (ordre chronologique inverse). Mets à jour `updated:`. Ne supprime rien.
- Marqueur absent ou tableau non-parsable : crée section `## Entrées non parsées` en bas, avec la nouvelle entrée, et **signale-le dans le rapport final**.

ℹ️ Format de la ligne de tableau : `| 2026-05-01 | Frameworks positionnement | Comment les meilleurs définissent... | deep | web | [[summary/frameworks-positionnement_2026-05-01]] | [[sources/frameworks-positionnement_2026-05-01]] |`

▶ **Rapport final dans le chat** (format court) :

```
✅ Recherche terminée
   Question : <question reformulée>
   Sous-questions : <N>
   Depth : <light|medium|deep> · HN : <oui|non>
   Sources : <N> initiales + <M> pivot, <K> écartées
   Mode : <normal|dégradé WebSearch-only>

📁 Summary : $RESEARCH_DIR/summary/<SLUG>_<DATE>.md
📁 Sources : $RESEARCH_DIR/sources/<SLUG>_<DATE>/ (<total> fichiers)

📋 TL;DR : <3-5 lignes qui répondent à la question>

⚠️ À signaler : <limites marquantes, transpositions, indexation fallback, ou "rien à signaler">
```

ℹ️ **Budget tokens dépassé** : si le coût dépasse largement ce qui était attendu pour le depth (jugement, pas de compteur fiable), stoppe proprement, produis la sortie avec ce que tu as, signale le débordement en "Limites".

---

## Garde-fou final

▶ Avant de conclure, relis ton summary. Pose-toi ces **cinq questions binaires** :

1. *Ai-je confondu "3 sources" avec "3 sources indépendantes" quelque part ?* Si **oui** → dégrade la confiance.
2. *Une de mes interprétations fortes traîne-t-elle dans la section "Faits observés" ?* Si **oui** → déplace-la dans "Interprétations".
3. *(medium/deep)* *L'avocat du diable s'est-il contenté d'enrichir la thèse au lieu de la tester ?* Si **oui** → signale en "Limites" et, si possible, relance une query strictement adversariale.
4. *Ma synthèse reprend-elle l'ordre de lecture des sources (risque d'ancrage) ?* Si **oui** → réorganise par sous-question ou axe thématique, pas chronologiquement.
5. *Existe-t-il une catégorie de preuves qui, par nature, ne serait pas indexée ou publiée (biais de survivance) ?* (ex : échecs silencieux, décisions privées, cas non médiatisés). Si **oui** → mentionne-la en "Limites" même sans donnée.

Si la réponse est **"non"** aux cinq, la recherche est livrable.
