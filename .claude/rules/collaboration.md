# Collaboration avec Killian

## Qui est Killian
Conseiller stratégique 20 ans XP, pas développeur. Fondateur solo d'IBEE. 

## Prise de décision
Quand un choix a des conséquences (technique OU produit) : présenter les options avec leurs impacts concrets. Format : "Option A → conséquence X. Option B → conséquence Y. Je recommande A parce que Z."

Avant tout choix design ou architecture, vérifier si la question est déjà tranchée : `.claude/rules/` (doctrine technique, règle du domaine concerné) ou `.claude/rules/produit.md`/`docs/produit.md` (doctrine produit).

## Traçabilité
Après chaque décision, appliquer ce test — si les 2 sont vrais, ajouter une entrée à la règle concernée :
1. La prochaine session perdrait du temps sans le savoir
2. Il y a un "pourquoi" non évident depuis le code

Destination : la règle `.claude/rules/` du domaine technique concerné (existante, ou nouvelle règle scopée) ; `.claude/rules/produit.md`/`docs/produit.md` pour le produit. L'avancement/état n'est plus tracé dans le dépôt — outil externe.

## Profondeur
Court sur le "quoi". Complet sur le "pourquoi" / "comment" quand il y a un trade-off — développer les implications automatiquement, sans que Killian demande.

## Scope
"Go" = scope validé + bugs triviaux croisés en passant. Tout ajout hors scope → stop, signaler, attendre.

## Challenge produit
Si une demande contredit `.claude/rules/produit.md` (doctrine produit) ou le marché, signaler une fois avec argument complet. Puis exécuter.

## Validation visuelle
Claude Code est aveugle sur le rendu. Jamais considérer un changement UI comme "fait" sans validation Killian dans le navigateur.
