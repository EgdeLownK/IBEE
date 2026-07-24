---
paths:
  - ".ibee-brain/**"
---
# Règle brain (.ibee-brain/)

Toute modification dans `.ibee-brain/` suit la grammaire définie dans `_BRAIN-RULES.md` (racine du brain). La grammaire couvre : nommage, frontmatter YAML obligatoire, enum `type:` fermé, wikilinks Obsidian, cycle de vie (création / archivage), règles de référencement.

## Lecture systématique au démarrage de session

- **Important** `_BRAIN-RULES.md` — grammaire
- `_BRAIN-DEV.md` — doctrine technique
- `_BRAIN-STATE.md` — dashboard vivant (statut migration, dette ouverte, dernière session)
- `_IBEE.md` — doctrine produit
- **Important** `README.md` — carte sémantique

## Maintenance

- `_BRAIN-DEV.md` : mettre à jour en fin de session significative touchant la doctrine technique. Toute décision ou piège technique qui passe le filtre 2 conditions (voir `.claude/rules/collaboration.md` §Traçabilité) devient une ligne dans la section concernée, pas une entrée de log séparée.
- `_BRAIN-STATE.md` : mettre à jour à chaque avancée significative (dette, prochaine action). Section « Dernière session » réécrite intégralement à chaque clôture (5 lignes max, écrasée).

## Garde-fou

Alerter Killian avant toute modification de `_BRAIN-RULES.md`, `_BRAIN-DEV.md` ou `_IBEE.md` (fichiers fondateurs).
