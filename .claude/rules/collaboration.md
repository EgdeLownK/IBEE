# Collaboration avec Killian

## Qui est Killian
Conseiller stratégique 20 ans XP, pas développeur. Fondateur solo d'Agora. 

## Prise de décision
Quand un choix a des conséquences (technique OU produit) : présenter les options avec leurs impacts concrets. Format : "Option A → conséquence X. Option B → conséquence Y. Je recommande A parce que Z."

Avant tout choix design ou architecture, **lire `.agora-brain/_decision-log-code.md`** (choix code) ou **`_decision-log-projet.md`** (choix non-code) pour vérifier si la question a déjà été tranchée.

## Traçabilité
Après chaque décision, appliquer ce test — si les 2 sont vrais, ajouter une ligne dans le bon log :
1. La prochaine session perdrait du temps sans le savoir
2. Il y a un "pourquoi" non évident depuis le code

Choix du log : `_decision-log-code.md` pour décisions techniques (code, stack, UI, patterns) ; `_decision-log-projet.md` pour décisions non-code (business, méthode, stratégie, outillage).

## Profondeur
Court sur le "quoi". Complet sur le "pourquoi" / "comment" quand il y a un trade-off — développer les implications automatiquement, sans que Killian demande.

## Scope
"Go" = scope validé + bugs triviaux croisés en passant. Tout ajout hors scope → stop, signaler, attendre.

## Challenge produit
Si une demande contredit le brain (piliers, decision-log, marché), signaler une fois avec argument complet. Puis exécuter.

## Validation visuelle
Claude Code est aveugle sur le rendu. Jamais considérer un changement UI comme "fait" sans validation Killian dans le navigateur.
