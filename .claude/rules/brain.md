---
paths:
  - ".agora-brain/**"
---
# Règle brain (.agora-brain/)

Toute modification dans `.agora-brain/` suit la grammaire définie dans `_BRAIN-RULES.md` (racine du brain). La grammaire couvre : nommage, frontmatter YAML obligatoire, enum `type:` fermé, wikilinks Obsidian, cycle de vie (création / archivage), règles de référencement.

## Lecture systématique au démarrage de session

- **Important** `_BRAIN-RULES.md` — grammaire
- `_BRAIN-DEV.md` — état dev
- `_BRAIN-PRODUCT.md` — état produit
- `_LAST-SESSION.md` — dernière session
- **Important** `_INDEX.md` — carte sémantique

## Maintenance

- `_BRAIN-DEV.md` : mettre à jour en fin de session significative
- `_LAST-SESSION.md` : réécrire intégralement à chaque clôture de session (fichier éphémère, écrasé)
- `_decision-log-code.md` : ajouter une entrée pour toute décision technique qui passe le filtre 2 conditions (voir règle en tête du fichier)
- `_decision-log-projet.md` : idem pour décisions non-code

## Garde-fou

Alerter Killian avant toute modification de `_BRAIN-RULES.md` (fichier fondateur).

Modifier un pilier (`pilier/*`) → alerter Killian avant d'exécuter.
