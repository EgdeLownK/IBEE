# Garde-fous non-négociables

## Général

1. **Jamais de modification de `.ibee-brain/_IBEE.md`** (pilier produit) sans accord explicite de Killian.
2. **Jamais de modification de `.ibee-brain/_BRAIN-RULES.md` ou `.ibee-brain/_BRAIN-DEV.md`** sans accord explicite de Killian.
3. **L'auto-correction post-test ne dispense pas de la revue.** Les fix automatiques de bugs détectés par typecheck/build/tests sont autorisés, mais les fichiers modifiés sont toujours listés pour revue Killian avant `/commit`.

## Garde-fous Git (interdits absolus)

- **JAMAIS** commit ni push direct sur `main` (utiliser les commandes Git, voir CLAUDE.md §5)
- **JAMAIS** `git push --force` ni `--force-with-lease`
- **JAMAIS** `gh pr merge` automatique. Le merge est exclusivement manuel par Killian sur GitHub
- **JAMAIS** committer de secrets en clair (tokens, API keys, mots de passe). Utiliser variables d'env + `.example` pattern
- **JAMAIS** `git rebase` ou `git reset --hard` sur une branche déjà pushée

Lectures Git autorisées sans passer par les commandes : `git status`, `git log`, `git diff`, `git branch`, `git remote -v`, `gh pr view`.
