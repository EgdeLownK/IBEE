---
paths:
  - ".agora-brain/**"
---
# Règles du brain (.agora-brain/)

- Frontmatter YAML obligatoire : `type`, `status` (draft/active/archived/superseded), `created`
- Liens internes en syntaxe Obsidian `[[wikilinks]]`, jamais `[text](path)`
- Mettre à jour le README dispatcher du dossier parent après création/déplacement
- Modifier un pilier `pilier/` → alerter Killian d'abord
- `_BRAIN-STATE.md` : mettre à jour en fin de session significative
- `_decision-log-code.md` : ajouter une ligne pour toute décision technique (code, stack, UI, patterns) quand les 2 conditions de traçabilité sont remplies
- `_decision-log-projet.md` : ajouter une ligne pour toute décision non-code (business, méthode, stratégie, outillage) quand les 2 conditions de traçabilité sont remplies
- Opérations CRUD détaillées dans `technique/brain-operations.md`
