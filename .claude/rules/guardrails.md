# Garde-fous non-négociables

1. **Jamais de commit automatique.** Lister les fichiers modifiés pour revue Killian.
2. **Jamais de modification d'un pilier `pilier/`** sans accord explicite de Killian.
3. **L'auto-correction post-test ne dispense pas de la revue.** Les fix automatiques de bugs détectés par typecheck/build/tests sont autorisés, mais les fichiers modifiés sont toujours listés pour revue Killian avant commit.
4. **Toujours travailler sur une branche.** Ne jamais committer directement sur `main`. Créer une branche `feat/`, `fix/`, ou `chore/` pour chaque tâche, puis ouvrir une PR. Exception : fix d'urgence sur demande explicite de Killian.
