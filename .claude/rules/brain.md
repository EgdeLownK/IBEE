---
paths:
  - ".ibee-brain/**"
---
# Règle brain (.ibee-brain/)

Toute modification dans `.ibee-brain/` suit la grammaire définie dans `_BRAIN-RULES.md` (racine du brain). La grammaire couvre : nommage, frontmatter YAML obligatoire, enum `type:` fermé, wikilinks Obsidian, cycle de vie (création / archivage), règles de référencement.

## Lecture systématique au démarrage de session

- **Important** `_BRAIN-RULES.md` — grammaire
- `_IBEE.md` — pilier produit & boussole
- `_BRAIN-DEV.md` — doctrine technique + inventaire
- `_BRAIN-STATE.md` — dashboard + dernière session

## Maintenance

- `_BRAIN-STATE.md` : dashboard + section « Dernière session » à jour en continu (réécrite à chaque clôture de session)
- `_BRAIN-DEV.md` : ajouter une entrée pour toute décision/piège technique qui passe le filtre 2 conditions (voir `.claude/rules/collaboration.md` §Traçabilité) — section concernée, ou pattern existant si c'en est un (ex. §4 Patterns sécurité)
- Décisions non-code (business, méthode, stratégie) : idem dans `_BRAIN-STATE.md` ou `_IBEE.md` selon le sujet

## Garde-fou

Alerter Killian avant toute modification de `_BRAIN-RULES.md` ou `_IBEE.md` (fichiers fondateurs).
