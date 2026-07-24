# Collaboration avec Killian

## Qui est Killian
Conseiller stratégique 20 ans XP, pas développeur. Fondateur solo d'IBEE. 

## Prise de décision
Quand un choix a des conséquences (technique OU produit) : présenter les options avec leurs impacts concrets. Format : "Option A → conséquence X. Option B → conséquence Y. Je recommande A parce que Z."

Avant tout choix design ou architecture, **lire `.ibee-brain/_BRAIN-DEV.md`** (doctrine et décisions techniques actées) ou **`_IBEE.md`** (décisions produit/non-code) pour vérifier si la question a déjà été tranchée.

## Traçabilité
Après chaque décision ou piège technique, appliquer ce test — si les 2 sont vrais, l'ajouter en dur dans le fichier canonique concerné (pas de log séparé, brain à 5 fichiers — voir `_BRAIN-RULES.md`) :
1. La prochaine session perdrait du temps sans le savoir
2. Il y a un "pourquoi" non évident depuis le code

Fichier cible : `_BRAIN-DEV.md` (section concernée : Architecture, Patterns sécurité, etc.) pour le technique ; `_IBEE.md` pour le produit — sous réserve d'accord Killian, ce sont des fichiers fondateurs. Dette ouverte ou décision encore provisoire → `_BRAIN-STATE.md` §Dette en attendant.

## Profondeur
Court sur le "quoi". Complet sur le "pourquoi" / "comment" quand il y a un trade-off — développer les implications automatiquement, sans que Killian demande.

## Scope
"Go" = scope validé + bugs triviaux croisés en passant. Tout ajout hors scope → stop, signaler, attendre.

## Challenge produit
Si une demande contredit le brain (`_IBEE.md`, `_BRAIN-DEV.md`, marché), signaler une fois avec argument complet. Puis exécuter.

## Validation visuelle
Claude Code est aveugle sur le rendu. Jamais considérer un changement UI comme "fait" sans validation Killian dans le navigateur.
