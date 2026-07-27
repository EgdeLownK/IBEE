# Collaboration avec Killian

## Qui est Killian
Conseiller stratégique 20 ans XP, pas développeur. Fondateur solo d'IBEE. 

## Prise de décision
Quand un choix a des conséquences (technique OU produit) : présenter les options avec leurs impacts concrets. Format : "Option A → conséquence X. Option B → conséquence Y. Je recommande A parce que Z."

Avant tout choix design ou architecture, **lire `.ibee-brain/_BRAIN-DEV.md`** (choix code) ou **`_BRAIN-STATE.md`/`_IBEE.md`** (choix non-code, selon le sujet) pour vérifier si la question a déjà été tranchée.

## Traçabilité
Après chaque décision, appliquer ce test — si les 2 sont vrais, ajouter une entrée au bon fichier :
1. La prochaine session perdrait du temps sans le savoir
2. Il y a un "pourquoi" non évident depuis le code

Choix du fichier : `_BRAIN-DEV.md` pour décisions techniques (code, stack, UI, patterns — section concernée, ou §Pièges si c'en est un) ; `_BRAIN-STATE.md` ou `_IBEE.md` pour décisions non-code (business, méthode, stratégie, outillage), selon le sujet.

## Profondeur
Court sur le "quoi". Complet sur le "pourquoi" / "comment" quand il y a un trade-off — développer les implications automatiquement, sans que Killian demande.

## Scope
"Go" = scope validé + bugs triviaux croisés en passant. Tout ajout hors scope → stop, signaler, attendre.

## Challenge produit
Si une demande contredit le brain (`_IBEE.md`, décisions actées dans `_BRAIN-DEV.md`/`_BRAIN-STATE.md`, marché), signaler une fois avec argument complet. Puis exécuter.

## Validation visuelle
Claude Code est aveugle sur le rendu. Jamais considérer un changement UI comme "fait" sans validation Killian dans le navigateur.

## Fin de mission : commit + push obligatoires
Toute mission qui produit ou modifie des fichiers se termine par un commit sur une branche nommée, puis un push. Un livrable non poussé n'existe pas : il n'est ni sauvegardé, ni relisible, ni vérifiable par la CI.

Le rapport indique explicitement le hash du commit, le nom de la branche, et si elle a été poussée. "Arbre de travail propre" ne signifie rien si rien n'a été commité — c'est même le symptôme inverse (du travail a disparu, pas qu'il est fini).

Attention particulière aux fichiers non suivis par git (nouveaux fichiers) : invisibles dans un diff, ils sont perdus par toute commande de nettoyage (`git clean`, changement de branche destructif, etc.).

Exception unique : mission déclarée **LECTURE SEULE** dès le départ (aucun fichier produit). Le rapport le dit explicitement — pas de commit à annoncer.
